import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { NewsClient } from "../public/news-client.js";
import { reconcileSections } from "../public/news-view.js";

test("Default fetch keeps its browser receiver for initial and conditional requests", async (t) => {
  const replies = [
    new Response('{"count":1}', { headers: { ETag: 'W/"one"' } }),
    new Response(null, { status: 304 }),
  ];
  const fetch = t.mock.method(globalThis, "fetch", function () {
    assert.equal(this, globalThis, "Window.fetch requires its Window receiver");
    return Promise.resolve(replies.shift());
  });
  const client = new NewsClient();
  assert.equal((await client.load("/api/news?")).data.count, 1);
  assert.equal((await client.load("/api/news?")).changed, false);
  assert.equal(fetch.mock.callCount(), 2);
});

test("Conditional polling reuses unchanged news and keeps query changes isolated", async () => {
  const calls = [];
  const replies = [
    new Response('{"count":1}', { headers: { ETag: 'W/"one"' } }),
    new Response(null, { status: 304 }),
    new Response('{"count":2}', { headers: { ETag: 'W/"two"' } }),
    new Response('{"count":2}', { headers: { ETag: 'W/"two"' } }),
    new Response('{"error":"Temporarily unavailable"}', { status: 503 }),
  ];
  const client = new NewsClient(async (url, options) => {
    calls.push({ url, options });
    return replies.shift();
  });
  const first = await client.load("/api/news?");
  const unchanged = await client.load("/api/news?");
  assert.equal(unchanged.changed, false);
  assert.equal(unchanged.data, first.data);
  assert.equal(calls[1].options.headers["If-None-Match"], 'W/"one"');
  assert.equal((await client.load("/api/news?")).data.count, 2);
  assert.equal((await client.load("/api/news?view=saved")).changed, true);
  assert.deepEqual(calls[3].options.headers, {});
  await assert.rejects(
    client.load("/api/news?view=saved"),
    /Temporarily unavailable/,
  );
  assert.equal(client.last.data.count, 2);
});

test("Incremental rendering preserves unchanged cards and expanded coverage", () => {
  const { document } = parseHTML(
    '<html><body><main id="news"></main></body></html>',
  );
  const container = document.getElementById("news");
  const article = (id, saved = false) => ({ id, saved });
  const render = (id, title, articles) =>
    `<section id="${id}"><h2>${title}</h2>${articles.map((a) => `<article class="card" data-article-id="${a.id}"><button data-state="saved" data-id="${a.id}">${a.saved}</button><details><summary>Coverage</summary><p>Other reporting</p></details></article>`).join("")}</section>`;
  const context = () => [true, [], "/#top"];
  let entries = [
    ["top", "Top stories", [article("a"), article("b")]],
    ["uk", "UK", []],
  ];
  reconcileSections(container, entries, render, context);
  const firstSection = container.firstElementChild;
  const first = container.querySelector('[data-article-id="a"]');
  const second = container.querySelector('[data-article-id="b"]');
  first.querySelector("details").open = true;
  reconcileSections(container, entries, render, context);
  assert.equal(container.firstElementChild, firstSection);
  entries = [
    ["top", "Top stories", [article("a"), article("b", true)]],
    ["uk", "UK", []],
  ];
  reconcileSections(container, entries, render, context);
  assert.equal(container.querySelector('[data-article-id="a"]'), first);
  assert.equal(first.querySelector("details").open, true);
  assert.notEqual(container.querySelector('[data-article-id="b"]'), second);
  entries = [
    ["top", "Top stories", [article("a", true), article("b", true)]],
    ["uk", "UK", []],
  ];
  reconcileSections(container, entries, render, context);
  assert.equal(
    container.querySelector('[data-article-id="a"] details').open,
    true,
  );
  reconcileSections(container, entries.toReversed(), render, context);
  assert.deepEqual(
    [...container.children].map((n) => n.id),
    ["uk", "top"],
  );
  reconcileSections(container, [["results", "Saved", []]], render, context);
  assert.deepEqual(
    [...container.children].map((n) => n.id),
    ["results"],
  );
});
