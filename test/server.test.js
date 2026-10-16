import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { once } from "node:events";
test("API persists preferences and validates mutation, backup and private feeds", async () => {
  const dir = mkdtempSync(join(tmpdir(), "quiet-news-test-"));
  const legacy = new DatabaseSync(join(dir, "news.sqlite"));
  legacy.exec(
    "CREATE TABLE articles(id TEXT PRIMARY KEY,url TEXT UNIQUE,title TEXT,summary TEXT,publisher TEXT,published INTEGER,sections TEXT,top INTEGER,kind TEXT); CREATE TABLE states(id TEXT PRIMARY KEY,saved INTEGER DEFAULT 0,read INTEGER DEFAULT 0);",
  );
  legacy
    .prepare("INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?)")
    .run(
      "legacy",
      "https://example.com/story?a=1&amp;b=2",
      "Cached story",
      "Excerpt",
      "Test Publisher",
      Date.now(),
      JSON.stringify(["uk"]),
      0,
      "News",
    );
  legacy.prepare("INSERT INTO states VALUES (?,?,?)").run("legacy", 1, 1);
  legacy.close();
  const port = 19000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["src/server.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dir,
      DISABLE_COLLECTOR: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    await Promise.race([
      once(child.stdout, "data"),
      once(child, "exit").then(() => {
        throw Error("Server exited");
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(Error("Startup timeout")), 5000).unref(),
      ),
    ]);
    const news = await fetch(base + "/api/news").then((r) => r.json());
    assert.equal(news.count, 1);
    assert.equal(news.top[0].url, "https://example.com/story?a=1&b=2");
    assert.equal(news.top[0].saved, true);
    assert.equal(news.top[0].read, true);
    assert.notEqual(news.top[0].id, "legacy");
    assert.deepEqual(news.sections.uk, []);
    assert.ok(news.feeds.length > 10);
    const fresh = await fetch(base + "/api/news");
    const etag = fresh.headers.get("etag");
    assert.ok(etag);
    const unchanged = await fetch(base + "/api/news", {
      headers: { "If-None-Match": etag },
    });
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), "");
    const seed = new DatabaseSync(join(dir, "news.sqlite"));
    seed
      .prepare("INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?)")
      .run(
        "fixture",
        "https://example.com/council",
        "Council approves new housing policy",
        "Local council planning news and electoral registration guidance",
        "Test Publisher",
        Date.now(),
        JSON.stringify(["local", "tech"]),
        0,
        "News",
      );
    seed.prepare("INSERT INTO reader_cache VALUES (?,?,?)").run(
      "fixture",
      JSON.stringify({
        title: "Council approves new housing policy",
        blocks: [{ type: "p", text: "Cached article text" }],
        minutes: 1,
      }),
      Date.now(),
    );
    seed.close();
    const changed = await fetch(base + "/api/news", {
      headers: { "If-None-Match": etag },
    });
    assert.equal(changed.status, 200);
    assert.notEqual(changed.headers.get("etag"), etag);
    const reader = await fetch(base + "/api/reader/fixture").then((r) =>
      r.json(),
    );
    assert.equal(reader.blocks[0].text, "Cached article text");
    assert.equal(reader.direct, false);

    const rejected = await fetch(base + "/api/settings", {
      method: "PUT",
      body: "{}",
    });
    assert.equal(rejected.status, 403);
    const headers = { "Content-Type": "application/json", "X-Quiet-News": "1" };
    const snapshot = () => fetch(base + "/api/news").then((r) => r.json());
    const initial = await snapshot();
    assert.ok(initial.sections.tech.some((a) => a.id === "fixture"));
    assert.deepEqual(initial.sections.local, []);
    assert.ok(initial.sectionNames.some(([id]) => id === "elections"));
    assert.ok(initial.results.length === 0);
    const housing = await fetch(base + "/api/news?q=housing").then((r) =>
      r.json(),
    );
    assert.ok(housing.results[0].sections.includes("local"));
    assert.ok(housing.results[0].sections.includes("elections"));
    assert.deepEqual(housing.sections, {});
    assert.deepEqual(housing.top, []);
    assert.deepEqual(
      initial.sectionNames.slice(7).map(([id]) => id),
      [
        "elections",
        "derby",
        "administration",
        "selfhosted",
        "privacy",
        "economics",
        "energy",
        "science",
        "books",
        "history",
        "music",
        "gaming",
        "finance",
        "health",
        "libraries",
        "home",
      ],
    );
    await fetch(base + "/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ order: ["local", "tech"] }),
    });
    const reordered = await snapshot();
    assert.ok(reordered.sections.local.some((a) => a.id === "fixture"));
    assert.deepEqual(reordered.sections.tech, []);
    const displayed = [
      reordered.top,
      ...Object.values(reordered.sections),
    ].flat();
    assert.equal(new Set(displayed.map((a) => a.id)).size, displayed.length);
    await fetch(base + "/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ hidden: ["local"] }),
    });
    const hidden = await snapshot();
    assert.ok(hidden.sections.tech.some((a) => a.id === "fixture"));
    assert.deepEqual(hidden.sections.local, []);
    await fetch(base + "/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ theme: "dark", muted: "sport", compact: true }),
    });
    const updated = await fetch(base + "/api/news").then((r) => r.json());
    assert.equal(updated.settings.theme, "dark");
    assert.equal(updated.settings.compact, true);
    await fetch(base + "/api/state/fixture", {
      method: "PUT",
      headers,
      body: JSON.stringify({ saved: true, read: true }),
    });
    const saved = await fetch(base + "/api/news?view=saved&q=housing").then(
      (r) => r.json(),
    );
    assert.equal(saved.results.length, 1);
    assert.equal(saved.results[0].read, true);
    assert.equal(saved.results[0].saved, true);
    await fetch(base + "/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ directSources: ["Test Publisher"] }),
    });
    const excluded = await fetch(base + "/api/reader/fixture").then((r) =>
      r.json(),
    );
    assert.equal(excluded.direct, true);
    assert.equal(excluded.blocks, undefined);
    const persisted = await fetch(base + "/api/news").then((r) => r.json());
    assert.deepEqual(persisted.settings.directSources, ["Test Publisher"]);
    const history = new DatabaseSync(join(dir, "news.sqlite"));
    const insert = history.prepare(
      "INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?)",
    );
    history.exec("BEGIN");
    for (let i = 0; i < 3001; i++)
      insert.run(
        `history-${i}`,
        `https://example.com/history-${i}`,
        `Archived bulletin ${i}`,
        "Older reporting",
        "History Source",
        Date.now() - 7 * 86400000 - i,
        '["world"]',
        0,
        "News",
      );
    insert.run(
      "old-saved",
      "https://example.com/old-saved",
      "Zürich archive discovery",
      "An older saved story",
      "Rare Source",
      Date.UTC(2010, 0, 1, 12),
      '["world"]',
      0,
      "News",
    );
    history.prepare("INSERT INTO states VALUES (?,?,?)").run("old-saved", 1, 0);
    history.exec("COMMIT");
    history.close();
    for (const query of [
      "view=saved",
      "source=Rare+Source",
      "date=2010-01-01",
      "q=ZÜRICH",
      "since=1&source=Rare+Source",
    ]) {
      const response = await fetch(base + "/api/news?" + query).then((r) =>
        r.json(),
      );
      assert.ok(
        response.results.some((a) => a.id === "old-saved"),
        query,
      );
    }
    const invalidDate = await fetch(base + "/api/news?date=2010-02-31").then(
      (r) => r.json(),
    );
    assert.equal(invalidDate.results.length, 0);
    await fetch(base + "/api/state/old-saved", {
      method: "PUT",
      headers,
      body: JSON.stringify({ read: true }),
    });
    await fetch(base + "/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ hideRead: true }),
    });
    const unreadSaved = await fetch(base + "/api/news?view=saved").then((r) =>
      r.json(),
    );
    assert.ok(!unreadSaved.results.some((a) => a.id === "old-saved"));
    const privateFeed = await fetch(base + "/api/feeds", {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: "https://127.0.0.1/feed",
        publisher: "Test",
        section: "uk",
      }),
    });
    assert.equal(privateFeed.status, 400);
    const backup = await fetch(base + "/api/backup");
    assert.ok(backup.ok);
    assert.equal(
      Buffer.from(await backup.arrayBuffer())
        .subarray(0, 15)
        .toString(),
      "SQLite format 3",
    );
    const html = await fetch(base + "/");
    assert.ok(html.ok);
    assert.ok(
      html.headers.get("content-security-policy").includes("script-src 'self'"),
    );
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
