import test from "node:test";
import assert from "node:assert/strict";
import { SnapshotCache } from "../src/snapshot-cache.js";

test("Snapshots expire, stay isolated by query and invalidate on database changes", () => {
  const cache = new SnapshotCache({ maxAge: 60 });
  let builds = 0;
  const build = () => ({ count: ++builds });
  const first = cache.get("", "revision-1", build, 0);
  assert.equal(cache.get("", "revision-1", build, 59), first);
  assert.equal(cache.get("saved", "revision-1", build, 59).value.count, 2);
  assert.equal(cache.get("", "revision-1", build, 60).value.count, 3);
  assert.equal(cache.get("", "revision-2", build, 61).value.count, 4);
  assert.equal(cache.entries.size, 1);
});

test("Snapshot caching evicts least recently used entries and enforces byte limits", () => {
  const cache = new SnapshotCache({ maxEntries: 2, maxBytes: 300 });
  const build = () => ({ text: "small" });
  cache.get("a", 1, build, 0);
  cache.get("b", 1, build, 0);
  cache.get("a", 1, build, 0);
  cache.get("c", 1, build, 0);
  assert.deepEqual([...cache.entries.keys()], ["a", "c"]);
  cache.get("oversized", 1, () => ({ text: "x".repeat(500) }), 0);
  assert.equal(cache.entries.has("oversized"), false);
  cache.get("d", 1, () => ({ text: "x".repeat(50) }), 0);
  assert.ok(cache.bytes <= cache.maxBytes);
});
