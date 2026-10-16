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
