import { Worker } from "node:worker_threads";
import http from "node:http";
import { timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SnapshotCache } from "./snapshot-cache.js";
import { sendSnapshot } from "./http-response.js";
import { download, ARTICLE_MAX_BYTES } from "./download.js";
import {
  defaultFeeds,
  sections,
  parseFeed,
  groupArticles,
  balanced,
  clean,
  articleURL,
  classifySections,
  excludedArticle,
} from "./news.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const data = resolve(process.env.DATA_DIR || "data");
mkdirSync(data, { recursive: true });
const db = new DatabaseSync(resolve(data, "news.sqlite"));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS articles(id TEXT PRIMARY KEY,url TEXT UNIQUE,title TEXT,summary TEXT,publisher TEXT,published INTEGER,sections TEXT,top INTEGER,kind TEXT);
 CREATE INDEX IF NOT EXISTS articles_date ON articles(published);
 CREATE INDEX IF NOT EXISTS articles_publisher_date ON articles(publisher,published DESC);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY,json TEXT);
 CREATE TABLE IF NOT EXISTS feeds(id TEXT PRIMARY KEY,json TEXT);
 CREATE TABLE IF NOT EXISTS states(id TEXT PRIMARY KEY,saved INTEGER DEFAULT 0,read INTEGER DEFAULT 0);
 CREATE INDEX IF NOT EXISTS states_saved ON states(id) WHERE saved=1;
 CREATE TABLE IF NOT EXISTS reader_cache(id TEXT PRIMARY KEY,json TEXT,fetched INTEGER);
 CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);`);
// Canonicalise cached URLs on upgrade, preserving bookmarks and section assignments.
if (!db.prepare("SELECT value FROM meta WHERE key='canonicalUrls'").get()) {
  db.exec("BEGIN");
  try {
    for (const a of db.prepare("SELECT * FROM articles").all()) {
      const url = articleURL(a.url);
      if (!url || url === a.url) continue;
      const duplicate = db
        .prepare("SELECT * FROM articles WHERE url=?")
        .get(url);
      if (duplicate) {
        const old = db.prepare("SELECT * FROM states WHERE id=?").get(a.id);
        const target = db
          .prepare("SELECT * FROM states WHERE id=?")
          .get(duplicate.id);
        db.prepare("INSERT OR REPLACE INTO states VALUES (?,?,?)").run(
          duplicate.id,
          Math.max(old?.saved || 0, target?.saved || 0),
          Math.max(old?.read || 0, target?.read || 0),
        );
        db.prepare("UPDATE articles SET sections=?,top=? WHERE id=?").run(
          JSON.stringify([
            ...new Set([
              ...JSON.parse(a.sections),
              ...JSON.parse(duplicate.sections),
            ]),
          ]),
          Math.max(a.top, duplicate.top),
          duplicate.id,
        );
        db.prepare("DELETE FROM states WHERE id=?").run(a.id);
        db.prepare("DELETE FROM articles WHERE id=?").run(a.id);
      } else {
        const id = createHash("sha256").update(url).digest("hex").slice(0, 24);
        db.prepare("UPDATE articles SET url=?,id=? WHERE id=?").run(
          url,
          id,
          a.id,
        );
        db.prepare("UPDATE states SET id=? WHERE id=?").run(id, a.id);
      }
    }
    db.prepare("INSERT INTO meta VALUES (?,?)").run("canonicalUrls", "1");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
for (const f of defaultFeeds)
  db.prepare("INSERT OR IGNORE INTO feeds VALUES (?,?)").run(
    f.id,
    JSON.stringify(f),
  );
const defaults = {
  readerMode: true,
  directSources: [],
  theme: "system",
  compact: false,
  hideRead: false,
  muted: "",
  followed: "",
  region: "",
  hidden: [],
  disabledPublishers: [],
  order: sections.map((s) => s[0]),
};
const getSettings = () => ({
  ...defaults,
  ...JSON.parse(
    db.prepare("SELECT json FROM settings WHERE id=1").get()?.json || "{}",
  ),
});
const feeds = () =>
  db
    .prepare("SELECT json FROM feeds")
    .all()
    .map((r) => JSON.parse(r.json));
const saveFeed = (f) =>
  db
    .prepare("INSERT OR REPLACE INTO feeds VALUES (?,?)")
    .run(f.id, JSON.stringify(f));
const parserVersion = "3";
if (
  db.prepare("SELECT value FROM meta WHERE key='parserVersion'").get()
    ?.value !== parserVersion
) {
  for (const f of feeds()) {
    delete f.etag;
    delete f.modified;
    saveFeed(f);
  }
  db.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)").run(
    "parserVersion",
    parserVersion,
  );
}
let updating = false;
const minutes = Math.max(
  15,
  Math.min(1440, Number(process.env.UPDATE_MINUTES) || 30),
);
const retention = Math.max(
  2,
  Math.min(365, Number(process.env.RETENTION_DAYS) || 30),
);
async function refresh() {
  if (updating) return;
  updating = true;
  let success = 0;
  try {
    for (const f of feeds().filter((f) => f.enabled)) {
      try {
        const h = {};
        if (f.etag) h["If-None-Match"] = f.etag;
        if (f.modified) h["If-Modified-Since"] = f.modified;
        const result = await download(f.url, h);
        if (result.status !== 304) {
          const articles = parseFeed(result.text, f);
          if (!articles.length)
            throw Error("No eligible articles found in feed");
          db.exec("BEGIN");
          try {
            for (const a of articles) {
              if (a.published < Date.now() - retention * 86400000) continue;
              const id = createHash("sha256")
                .update(a.url)
                .digest("hex")
                .slice(0, 24);
              const existing = db
                .prepare("SELECT sections,top FROM articles WHERE id=?")
                .get(id);
              a.sections = [
                ...new Set([
                  ...a.sections,
                  ...JSON.parse(existing?.sections || "[]"),
                ]),
              ];
              db.prepare(
                "INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,sections=excluded.sections,top=MAX(articles.top,excluded.top),kind=excluded.kind",
              ).run(
                id,
                a.url,
                a.title,
                a.summary,
                a.publisher,
                a.published,
                JSON.stringify(a.sections),
                Number(a.top),
                a.kind,
              );
            }
            db.exec("COMMIT");
          } catch (e) {
            db.exec("ROLLBACK");
            throw e;
          }
          f.etag = result.etag;
          f.modified = result.modified;
        }
        f.lastSuccess = Date.now();
        f.error = null;
        success++;
      } catch (e) {
        f.error = e.message;
      }
      f.lastAttempt = Date.now();
      saveFeed(f);
    }
    db.prepare(
      "DELETE FROM articles WHERE published < ? AND id NOT IN (SELECT id FROM states WHERE saved=1)",
    ).run(Date.now() - retention * 86400000);
    db.exec(
      "DELETE FROM states WHERE id NOT IN (SELECT id FROM articles); DELETE FROM reader_cache WHERE id NOT IN (SELECT id FROM articles)",
    );
    if (success)
      db.prepare("INSERT OR REPLACE INTO meta VALUES (?,?)").run(
        "updated",
        String(Date.now()),
      );
  } finally {
    updating = false;
  }
}
let extracting = false;
async function readArticle(a) {
  const cached = db.prepare("SELECT * FROM reader_cache WHERE id=?").get(a.id);
  const saved = !!db.prepare("SELECT saved FROM states WHERE id=?").get(a.id)
    ?.saved;
  if (cached) {
    const content = JSON.parse(cached.json);
    if (
      Date.now() - cached.fetched < (content.error ? 300000 : 86400000) ||
      (saved && !content.error)
    )
      return content;
  }
  if (extracting)
    return {
      error: "Another article is being prepared. Please try again shortly.",
      retryable: true,
    };
  extracting = true;
  try {
    const result = await download(
      a.url,
      { Accept: "text/html" },
      { maxBytes: ARTICLE_MAX_BYTES, label: "Page" },
    );
    const content = await new Promise((resolve, reject) => {
      const worker = new Worker(new URL("./reader.js", import.meta.url), {
        workerData: { html: result.text, url: a.url },
        resourceLimits: { maxOldGenerationSizeMb: 64 },
      });
      const timer = setTimeout(() => {
        void worker.terminate();
        reject(Error("Article extraction timed out."));
      }, 10000);
      worker.once("message", (message) => {
        clearTimeout(timer);
        void worker.terminate();
        message.error ? reject(Error(message.error)) : resolve(message.article);
      });
      worker.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      worker.once("exit", (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(Error("Article extraction could not finish."));
      });
    });
    db.prepare("INSERT OR REPLACE INTO reader_cache VALUES (?,?,?)").run(
      a.id,
      JSON.stringify(content),
      Date.now(),
    );
    // At most 200 text-only articles, favouring saved ones when pruning.
    db.exec(
      "DELETE FROM reader_cache WHERE id NOT IN (SELECT c.id FROM reader_cache c LEFT JOIN states s ON c.id=s.id ORDER BY COALESCE(s.saved,0) DESC,c.fetched DESC LIMIT 200)",
    );
    return content;
  } catch (error) {
    const message =
      error.message === "HTTP 403"
        ? "The publisher blocked reader-mode access."
        : error.message === "HTTP 401"
          ? "The publisher requires authentication."
          : error.code === "ERR_RESPONSE_TOO_LARGE"
            ? "This page is too large for reader mode."
            : error.message;
    const content = { error: message };
    db.prepare("INSERT OR REPLACE INTO reader_cache VALUES (?,?,?)").run(
      a.id,
      JSON.stringify(content),
      Date.now(),
    );
    db.exec(
      "DELETE FROM reader_cache WHERE id NOT IN (SELECT c.id FROM reader_cache c LEFT JOIN states s ON c.id=s.id ORDER BY COALESCE(s.saved,0) DESC,c.fetched DESC LIMIT 200)",
    );
    return content;
  } finally {
    extracting = false;
  }
}
function rows({ source, day, since, view, archive, hideRead }) {
  const where = [],
    values = [];
  if (!archive) {
    // Include the 18-hour grouping overlap at the edge of the 48-hour homepage.
    where.push("a.published > ?");
    values.push(Date.now() - 66 * 3600000);
  }
  if (source) {
    where.push("a.publisher = ?");
    values.push(source);
  }
  if (day) {
    const start = Date.parse(day + "T00:00:00Z");
    if (
      !Number.isFinite(start) ||
      new Date(start).toISOString().slice(0, 10) !== day
    )
      return [];
    where.push("a.published >= ? AND a.published < ?");
    values.push(start, start + 86400000);
  }
  if (since) {
    where.push("a.published > ?");
    values.push(since);
  }
  if (view === "saved") where.push("s.saved = 1");
  if (hideRead) where.push("COALESCE(s.read,0) = 0");
  return db
    .prepare(
      `SELECT a.*,COALESCE(s.saved,0) saved,COALESCE(s.read,0) read
       FROM articles a LEFT JOIN states s ON a.id=s.id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY a.published DESC`,
    )
    .all(...values)
    .map((a) => ({
      ...a,
      summary: clean(a.summary),
      url: a.url.replaceAll("&amp;", "&"),
      sections: classifySections({ ...a, sections: JSON.parse(a.sections) }),
      top: !!a.top,
      saved: !!a.saved,
      read: !!a.read,
    }));
}
function snapshot(params) {
  const settings = getSettings();
  const q = (params.get("q") || "").toLowerCase().slice(0, 200);
  const view = params.get("view");
  const source = params.get("source");
  const day = params.get("date");
  const since = Number(params.get("since")) || 0;
  const topic = params.get("topic") || "";
  const archive = !!(q || view || source || day || since || topic);
  const muted = settings.muted
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const followed = settings.followed
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const all = rows({
    source,
    day,
    since,
    view,
    archive,
    hideRead: settings.hideRead,
  }).filter((a) => {
    const t = `${a.title} ${a.summary}`.toLowerCase();
    return (
      !excludedArticle(a) &&
      !(/\b(obituary|bork)\b/i.test(a.title) && view !== "saved") &&
      (!q || t.includes(q)) &&
      (!topic || t.includes(topic.toLowerCase())) &&
      !settings.disabledPublishers.includes(a.publisher) &&
      !muted.some((w) => t.includes(w)) &&
      (view !== "followed" || followed.some((w) => t.includes(w)))
    );
  });
  const grouped = groupArticles(all);
  const recent = grouped.filter((a) => a.published > Date.now() - 48 * 3600000);
  const pool = archive ? grouped : recent;
  const top = archive
    ? []
    : balanced(
        pool
          .filter(
            (a) =>
              a.top ||
              a.sections.includes("uk") ||
              a.sections.includes("world"),
          )
          .sort(
            (a, b) =>
              Number(b.top) - Number(a.top) || b.published - a.published,
          ),
        6,
      );
  const seen = new Set(top.map((a) => a.id));
  const output = {};
  const ordered = [
    ...new Set([...settings.order, ...sections.map(([id]) => id)]),
  ];
  for (const id of archive ? [] : ordered) {
    if (settings.hidden.includes(id)) {
      output[id] = [];
      continue;
    }
    let list = pool.filter((a) => a.sections.includes(id) && !seen.has(a.id));
    if (id === "local" && settings.region) {
      const preferred = list.filter((a) =>
        (a.title + " " + a.summary)
          .toLowerCase()
          .includes(settings.region.toLowerCase()),
      );
      list = [...preferred, ...list.filter((a) => !preferred.includes(a))];
    }
    output[id] = balanced(list, id === "us" ? 3 : 6);
    for (const a of output[id]) seen.add(a.id);
  }
  return {
    sections: output,
    top,
    results: archive ? grouped.slice(0, 100) : [],
    count: grouped.length,
    settings,
    feeds: feeds(),
    updating,
    updated:
      Number(
        db.prepare("SELECT value FROM meta WHERE key='updated'").get()?.value,
      ) || null,
    retention,
    minutes,
    publishers: [...new Set(feeds().map((f) => f.publisher))],
    sectionNames: sections,
  };
}
const snapshotCache = new SnapshotCache();
const localChanges = db.prepare("SELECT total_changes() AS revision");
const externalChanges = db.prepare("PRAGMA data_version");
function cachedSnapshot(params) {
  const key = new URLSearchParams();
  for (const name of ["q", "view", "source", "date", "since", "topic"])
    if (params.get(name)) key.set(name, params.get(name));
  // Also observe writes from another SQLite connection (restores/tools/tests).
  const revision = `${localChanges.get().revision}:${externalChanges.get().data_version}:${updating}`;
  return snapshotCache.get(key.toString(), revision, () => snapshot(key));
}
function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let str = "";
  for await (const c of req) {
    str += c;
    if (str.length > 65536) throw Error("Request too large");
  }
  return JSON.parse(str || "{}");
}
function auth(req) {
  if (!process.env.AUTH_USER && !process.env.AUTH_PASSWORD) return true;
  const expected =
    "Basic " +
    Buffer.from(
      `${process.env.AUTH_USER}:${process.env.AUTH_PASSWORD}`,
    ).toString("base64");
  const received = req.headers.authorization || "";
  return (
    received.length === expected.length &&
    timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  );
}
if (!!process.env.AUTH_USER !== !!process.env.AUTH_PASSWORD)
  throw Error("Set both AUTH_USER and AUTH_PASSWORD");
const server = http.createServer(async (req, res) => {
  try {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    const u = new URL(req.url, "http://localhost");
    if (u.pathname === "/api/health" && req.method === "GET")
      return json(res, 200, { ok: true });
    if (!auth(req)) {
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="Quiet News"' });
      res.end("Authentication required");
      return;
    }
    if (
      req.method !== "GET" &&
      (req.headers["x-quiet-news"] !== "1" ||
        (req.headers.origin &&
          new URL(req.headers.origin).host !== req.headers.host))
    )
      return json(res, 403, { error: "Invalid request origin" });
    if (req.method === "GET" && u.pathname === "/api/news")
      return await sendSnapshot(req, res, cachedSnapshot(u.searchParams));
    if (req.method === "GET" && u.pathname.startsWith("/api/reader/")) {
      const a = db
        .prepare("SELECT * FROM articles WHERE id=?")
        .get(u.pathname.split("/").pop());
      if (!a)
        return json(res, 404, {
          error: "This article is no longer in your history.",
        });
      const settings = getSettings();
      const direct =
        !settings.readerMode || settings.directSources.includes(a.publisher);
      const content = direct ? {} : await readArticle(a);
      return json(res, 200, {
        ...content,
        id: a.id,
        publisher: a.publisher,
        published: a.published,
        title: content.title || a.title,
        url: a.url,
        direct,
        settings,
      });
    }
    if (req.method === "POST" && u.pathname === "/api/refresh") {
      void refresh();
      return json(res, 202, { updating: true });
    }
    if (req.method === "PUT" && u.pathname === "/api/settings") {
      const b = await body(req);
      const s = { ...getSettings() };
      for (const k of ["muted", "followed", "region"])
        if (typeof b[k] === "string") s[k] = b[k].slice(0, 500);
      for (const k of ["compact", "hideRead", "readerMode"])
        if (typeof b[k] === "boolean") s[k] = b[k];
      if (["system", "light", "dark"].includes(b.theme)) s.theme = b.theme;
      for (const k of ["hidden", "order"])
        if (Array.isArray(b[k]))
          s[k] = [
            ...new Set(b[k].filter((x) => sections.some((a) => a[0] === x))),
          ];
      if (Array.isArray(b.directSources))
        s.directSources = [
          ...new Set(
            b.directSources.filter(
              (x) => typeof x === "string" && x.length <= 60,
            ),
          ),
        ].slice(0, 50);
      if (Array.isArray(b.disabledPublishers))
        s.disabledPublishers = b.disabledPublishers
          .filter((x) => typeof x === "string")
          .slice(0, 50);
      db.prepare("INSERT OR REPLACE INTO settings VALUES (1,?)").run(
        JSON.stringify(s),
      );
      return json(res, 200, s);
    }
    if (req.method === "PUT" && u.pathname.startsWith("/api/state/")) {
      const id = u.pathname.split("/").pop();
      if (!db.prepare("SELECT id FROM articles WHERE id=?").get(id))
        return json(res, 404, { error: "Article not found" });
      const b = await body(req);
      const old = db.prepare("SELECT * FROM states WHERE id=?").get(id) || {
        saved: 0,
        read: 0,
      };
      db.prepare("INSERT OR REPLACE INTO states VALUES (?,?,?)").run(
        id,
        typeof b.saved === "boolean" ? Number(b.saved) : old.saved,
        typeof b.read === "boolean" ? Number(b.read) : old.read,
      );
      return json(res, 200, { ok: true });
    }
    if (req.method === "PUT" && u.pathname.startsWith("/api/feeds/")) {
      const id = u.pathname.split("/").pop();
      const f = feeds().find((f) => f.id === id);
      if (!f) return json(res, 404, { error: "Feed not found" });
      const b = await body(req);
      if (typeof b.enabled === "boolean") f.enabled = b.enabled;
      saveFeed(f);
      return json(res, 200, f);
    }
    if (req.method === "POST" && u.pathname === "/api/feeds") {
      const b = await body(req);
      if (feeds().length >= 64) throw Error("Maximum 64 feeds");
      if (!b.publisher?.trim() || !sections.some((s) => s[0] === b.section))
        throw Error("Publisher and section are required");
      if (feeds().some((f) => f.url === b.url))
        throw Error("Feed already exists");
      const result = await download(b.url);
      const f = {
        id: randomUUID(),
        url: b.url,
        publisher: b.publisher.trim().slice(0, 60),
        section: b.section,
        enabled: true,
        custom: true,
      };
      if (!parseFeed(result.text, f).length)
        throw Error("Feed contains no eligible articles");
      saveFeed(f);
      void refresh();
      return json(res, 201, f);
    }
    if (req.method === "DELETE" && u.pathname.startsWith("/api/feeds/")) {
      const id = u.pathname.split("/").pop();
      const f = feeds().find((f) => f.id === id);
      if (!f?.custom)
        throw Error("Built-in feeds can be disabled, not deleted");
      db.prepare("DELETE FROM feeds WHERE id=?").run(id);
      return json(res, 200, { ok: true });
    }
    if (req.method === "GET" && u.pathname === "/api/backup") {
      db.exec("PRAGMA wal_checkpoint(FULL)");
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": 'attachment; filename="quiet-news.sqlite"',
        "Cache-Control": "no-store",
      });
      res.end(readFileSync(resolve(data, "news.sqlite")));
      return;
    }
    const files = {
      "/": "index.html",
      "/reader": "reader.html",
      "/reader.js": "reader.js",
      "/app.js": "app.js",
      "/news-client.js": "news-client.js",
      "/news-view.js": "news-view.js",
      "/style.css": "style.css",
      "/favicon.svg": "favicon.svg",
    };
    if (req.method === "GET" && files[u.pathname]) {
      res.writeHead(200, {
        "Content-Type": u.pathname.endsWith(".js")
          ? "text/javascript"
          : u.pathname.endsWith(".css")
            ? "text/css"
            : u.pathname.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html",
        "Cache-Control": "no-cache",
      });
      res.end(readFileSync(resolve(root, files[u.pathname])));
      return;
    }
    json(res, 404, { error: "Not found" });
  } catch (e) {
    json(res, 400, { error: e.message });
  }
});
server.listen(Number(process.env.PORT) || 2468, "0.0.0.0", () => {
  console.log("Quiet News listening on port " + (process.env.PORT || 2468));
  if (process.env.DISABLE_COLLECTOR !== "1") void refresh();
});
const timer = setInterval(() => {
  if (process.env.DISABLE_COLLECTOR !== "1") void refresh();
}, minutes * 60000);
timer.unref();
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  });
