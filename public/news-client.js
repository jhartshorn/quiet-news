export class NewsClient {
  constructor(fetcher = globalThis.fetch) {
    this.fetcher = fetcher;
  }
  async load(url) {
    const previous = this.last?.url === url ? this.last : undefined;
    const response = await this.fetcher(url, {
      cache: "no-store",
      headers: previous?.etag ? { "If-None-Match": previous.etag } : {},
    });
    if (response.status === 304) {
      if (!previous) throw Error("No cached news is available. Please retry.");
      return { data: previous.data, changed: false };
    }
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "Request failed");
    const etag = response.headers.get("ETag");
    this.last = { url, data, etag };
    return { data, changed: !etag || etag !== previous?.etag };
  }
}
