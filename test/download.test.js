import test from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import dns from "node:dns/promises";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import {
  download,
  FEED_MAX_BYTES,
  ARTICLE_MAX_BYTES,
} from "../src/download.js";

function mockResponses(t, responses) {
  t.mock.method(dns, "lookup", async () => [
    { address: "93.184.216.34", family: 4 },
  ]);
  return t.mock.method(https, "get", (_url, _options, callback) => {
    const request = new EventEmitter();
    request.setTimeout = () => {};
    request.destroy = (error) => {
      request.emit("error", error);
      request.emit("close");
    };
    queueMicrotask(() => {
      const fixture = responses.shift();
      assert.ok(fixture, "Unexpected network request");
      const response = new PassThrough();
      response.statusCode = fixture.status || 200;
      response.headers = fixture.headers || {};
      response.once("close", () => request.emit("close"));
      callback(response);
      response.end(fixture.body || "");
    });
    return request;
  });
}

test("Feed downloads accept content above the old limit, up to exactly 10 MiB", async (t) => {
  const body = Buffer.alloc(FEED_MAX_BYTES, "x");
  mockResponses(t, [{ body }]);
  const result = await download("https://example.com/feed");
  assert.equal(result.status, 200);
  assert.equal(Buffer.byteLength(result.text), FEED_MAX_BYTES);
});

test("Feed downloads reject content beyond 10 MiB", async (t) => {
  mockResponses(t, [{ body: Buffer.alloc(FEED_MAX_BYTES + 1) }]);
  await assert.rejects(download("https://example.com/feed"), {
    code: "ERR_RESPONSE_TOO_LARGE",
    message: "Feed exceeds 10 MiB",
  });
});

test("Reader pages retain the 2 MiB limit through redirects", async (t) => {
  const network = mockResponses(t, [
    { status: 302, headers: { location: "/article" } },
    { body: Buffer.alloc(ARTICLE_MAX_BYTES + 1) },
  ]);
  await assert.rejects(
    download(
      "https://example.com/redirect",
      { Accept: "text/html" },
      {
        maxBytes: ARTICLE_MAX_BYTES,
        label: "Page",
      },
    ),
    { code: "ERR_RESPONSE_TOO_LARGE", message: "Page exceeds 2 MiB" },
  );
  assert.equal(network.mock.callCount(), 2);
});

test("Redirects still validate addresses and reject private destinations", async (t) => {
  mockResponses(t, [
    { status: 302, headers: { location: "https://internal.example/feed" } },
  ]);
  t.mock.method(dns, "lookup", async (hostname) => [
    {
      address: hostname === "internal.example" ? "127.0.0.1" : "93.184.216.34",
      family: 4,
    },
  ]);
  await assert.rejects(download("https://example.com/feed"), /Private network/);
});
