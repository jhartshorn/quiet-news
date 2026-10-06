import test from "node:test";
import assert from "node:assert/strict";
import { extractArticle } from "../src/reader.js";
const paragraphs = Array.from(
  { length: 8 },
  (_, i) =>
    `<p>The council discussed public transport and housing policy at its meeting. Residents will be consulted on the proposed changes before the final vote. This is paragraph ${i} with further reporting from the meeting.</p>`,
).join("");
test("Reader extracts text blocks and omits scripts and navigation", () => {
  const result = extractArticle(
    `<html><head><title>Council plans | Example</title></head><body><nav>Unwanted navigation</nav><article><h1>Council plans</h1>${paragraphs}<script>alert('unsafe')</script></article></body></html>`,
    "https://example.com/story",
  );
  assert.ok(result.blocks.length >= 8);
  assert.ok(result.minutes >= 1);
  assert.ok(!JSON.stringify(result.blocks).includes("Unwanted navigation"));
  assert.ok(!JSON.stringify(result.blocks).includes("unsafe"));
});
test("Restricted pages and short excerpts fail without claiming a full article", () => {
  assert.throws(
    () =>
      extractArticle(
        `<html><script type="application/ld+json">{"isAccessibleForFree":false}</script><article>${paragraphs}</article></html>`,
        "https://example.com",
      ),
    /restricted/,
  );
  assert.throws(() =>
    extractArticle(
      "<html><body><p>Subscribe to continue.</p></body></html>",
      "https://example.com",
    ),
  );
});
