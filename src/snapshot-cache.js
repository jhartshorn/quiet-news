// Keep both the parsed response and its serialisation, within a small budget.
export class SnapshotCache {
  constructor({
    maxBytes = 4 * 1024 * 1024,
    maxEntries = 16,
    maxAge = 60000,
  } = {}) {
    Object.assign(this, { maxBytes, maxEntries, maxAge });
    this.entries = new Map();
    this.bytes = 0;
  }
  get(key, revision, build, now = Date.now()) {
    if (revision !== this.revision) {
      this.entries.clear();
      this.bytes = 0;
      this.revision = revision;
    }
    for (const [key, entry] of this.entries)
      if (now >= entry.expires) this.remove(key);
    const existing = this.entries.get(key);
    if (existing) {
      this.entries.delete(key);
      this.entries.set(key, existing);
      return existing;
    }
    const value = build();
    const json = JSON.stringify(value);
    // Reserve space for objects, strings and a compressed representation.
    const bytes = Buffer.byteLength(json) * 3;
    const entry = { value, json, bytes, expires: now + this.maxAge };
    if (bytes <= this.maxBytes) {
      while (
        this.entries.size &&
        (this.bytes + bytes > this.maxBytes ||
          this.entries.size >= this.maxEntries)
      )
        this.remove(this.entries.keys().next().value);
      this.entries.set(key, entry);
      this.bytes += bytes;
    }
    return entry;
  }
  remove(key) {
    this.bytes -= this.entries.get(key).bytes;
    this.entries.delete(key);
  }
}
