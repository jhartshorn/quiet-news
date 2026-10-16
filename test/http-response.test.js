import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { acceptsGzip, sendSnapshot } from "../src/http-response.js";

test("Compression negotiation respects explicit exclusions and quality values", () => {
  assert.equal(acceptsGzip("br, gzip;q=0.5"), true);
  assert.equal(acceptsGzip("gzip;q=0, *;q=1"), false);
  assert.equal(acceptsGzip("*;q=0.2"), true);
  assert.equal(acceptsGzip("identity"), false);
});

test("Snapshots reuse asynchronous compression and preserve uncompressed JSON", async () => {
  const entry = {
    json: JSON.stringify({ text: "A longer article summary. ".repeat(200) }),
  };
  const send = async (encoding) => {
    const result = {};
    await sendSnapshot(
      { headers: { "accept-encoding": encoding } },
      {
        writeHead(status, headers) {
          Object.assign(result, { status, headers });
        },
        end(body) {
          result.body = body;
        },
      },
      entry,
    );
    return result;
  };
  const zipped = await send("gzip");
  assert.equal(gunzipSync(zipped.body).toString(), entry.json);
  assert.ok(zipped.body.length < entry.json.length / 2);
  const compression = entry.gzip;
  await send("gzip");
  assert.equal(entry.gzip, compression);
  const plain = await send("gzip;q=0");
  assert.equal(plain.body, entry.json);
  assert.equal(plain.headers["Content-Encoding"], undefined);
});

test("Unchanged snapshots return 304 without a body and observe weak validators", async () => {
  const entry = { json: '{"count":1}' };
  const send = async (tag) => {
    const result = {};
    await sendSnapshot(
      { headers: { "if-none-match": tag } },
      {
        writeHead(status, headers) {
          Object.assign(result, { status, headers });
        },
        end(body) {
          result.body = body;
        },
      },
      entry,
    );
    return result;
  };
  const initial = await send();
  for (const tag of [
    initial.headers.ETag,
    initial.headers.ETag.replace(/^W\//, ""),
    `"other", ${initial.headers.ETag}`,
    "*",
  ]) {
    const unchanged = await send(tag);
    assert.equal(unchanged.status, 304);
    assert.equal(unchanged.body, undefined);
  }
  entry.json = '{"count":2}';
  delete entry.etag;
  assert.equal((await send(initial.headers.ETag)).status, 200);
});
