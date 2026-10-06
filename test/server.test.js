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
    assert.ok(news.feeds.length > 10);
    const seed = new DatabaseSync(join(dir, "news.sqlite"));
    seed
      .prepare("INSERT INTO articles VALUES (?,?,?,?,?,?,?,?,?)")
      .run(
        "fixture",
        "https://example.com/council",
        "Council approves new housing policy",
        "Local council planning news",
        "Test Publisher",
        Date.now(),
        JSON.stringify(["local"]),
        0,
        "News",
      );
    seed
      .prepare("INSERT INTO reader_cache VALUES (?,?,?)")
      .run(
        "fixture",
        JSON.stringify({
          title: "Council approves new housing policy",
          blocks: [{ type: "p", text: "Cached article text" }],
          minutes: 1,
        }),
        Date.now(),
      );
    seed.close();
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
