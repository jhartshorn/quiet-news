import { XMLParser } from "fast-xml-parser";
export const sections = [
  ["uk", "UK headlines"],
  ["world", "World headlines"],
  ["politics", "UK politics"],
  ["us", "U.S. essentials"],
  ["tech", "Technology & AI"],
  ["local", "Local government"],
  ["security", "Conflicts & security"],
];
export const defaultFeeds = [
  ["bbc-top", "BBC News", "https://feeds.bbci.co.uk/news/rss.xml", "uk", true],
  ["bbc-uk", "BBC News", "https://feeds.bbci.co.uk/news/uk/rss.xml", "uk"],
  [
    "bbc-world",
    "BBC News",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "world",
  ],
  [
    "bbc-politics",
    "BBC News",
    "https://feeds.bbci.co.uk/news/politics/rss.xml",
    "politics",
  ],
  [
    "bbc-tech",
    "BBC News",
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "tech",
  ],
  ["sky-uk", "Sky News", "https://feeds.skynews.com/feeds/rss/uk.xml", "uk"],
  [
    "sky-world",
    "Sky News",
    "https://feeds.skynews.com/feeds/rss/world.xml",
    "world",
  ],
  [
    "sky-politics",
    "Sky News",
    "https://feeds.skynews.com/feeds/rss/politics.xml",
    "politics",
  ],
  [
    "sky-tech",
    "Sky News",
    "https://feeds.skynews.com/feeds/rss/technology.xml",
    "tech",
  ],
  [
    "guardian-uk",
    "The Guardian",
    "https://www.theguardian.com/uk-news/rss",
    "uk",
  ],
  [
    "guardian-world",
    "The Guardian",
    "https://www.theguardian.com/world/rss",
    "world",
  ],
  [
    "guardian-politics",
    "The Guardian",
    "https://www.theguardian.com/politics/rss",
    "politics",
  ],
  [
    "guardian-tech",
    "The Guardian",
    "https://www.theguardian.com/technology/rss",
    "tech",
  ],
  [
    "guardian-local",
    "The Guardian",
    "https://www.theguardian.com/society/localgovernment/rss",
    "local",
  ],
  ["dw-world", "DW", "https://rss.dw.com/rdf/rss-en-world", "world"],
  ["france24", "France 24", "https://www.france24.com/en/rss", "world"],
  [
    "register",
    "The Register",
    "https://www.theregister.com/headlines.atom",
    "tech",
  ],
].map(([id, publisher, url, section, top = false]) => ({
  id,
  publisher,
  url,
  section,
  top,
  enabled: true,
}));
export function clean(value) {
  if (typeof value === "object") value = value?.["#text"] || "";
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCodePoint(Math.min(+n, 0x10ffff)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function articleURL(value) {
  try {
    const u = new URL(clean(value));
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()])
      if (k.startsWith("utm_") || ["CMP", "ocid"].includes(k))
        u.searchParams.delete(k);
    return u.href;
  } catch {
    return null;
  }
}
const array = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
export function parseFeed(xml, feed, now = Date.now()) {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(xml);
  const entries = array(
    parsed.rss?.channel?.item || parsed.feed?.entry || parsed["rdf:RDF"]?.item,
  );
  return entries.slice(0, 60).flatMap((e, index) => {
    const links = array(e.link);
    const link = links.find(
      (l) =>
        typeof l === "object" && (!l["@_rel"] || l["@_rel"] === "alternate"),
    );
    const url = articleURL(
      typeof links[0] === "string" ? links[0] : link?.["@_href"],
    );
    const title = clean(e.title);
    const categories = array(e.category)
      .map((c) => clean(c?.["@_term"] || c))
      .join(" ");
    if (
      !url ||
      !title ||
      /\/commentisfree\/|\/cartoon\/|\/premium\//i.test(url) ||
      /opinion|sponsored|paid content|premium/i.test(categories)
    )
      return [];
    if (
      /\b(opinion|editorial|sponsored)\b/i.test(title) ||
      /\/(sport|sports|football|culture|lifeandstyle|bootnotes|bofh)\//i.test(
        url,
      ) ||
      /\b(sports|obituary|bootnotes|bofh|bork|obituary)\b/i.test(
        categories + " " + title,
      )
    )
      return [];
    const rawDate = Date.parse(
      e.pubDate || e.published || e.updated || e["dc:date"],
    );
    const published = Number.isFinite(rawDate) ? Math.min(rawDate, now) : now;
    const excerpt = clean(e.description || e.summary || "")
      .replace(/Continue reading.*$/, "")
      .trim();
    const summary =
      excerpt.length > 320
        ? excerpt.slice(0, 317).replace(/\s+\S*$/, "") + "…"
        : excerpt;
    const text = `${title} ${summary}`;
    const tags = new Set([feed.section]);
    if (
      /\b(councils?|local government|local authorities|councillors?|council tax|town hall)\b/i.test(
        text,
      )
    )
      tags.add("local");
    if (
      /\b(ukraine|russia|iran|taiwan|nato|missile|ceasefire|warfare|military|gaza|israel|defence)\b/i.test(
        text,
      )
    )
      tags.add("security");
    if (
      /\b(trump|white house|u\.s\.|us congress|pentagon|american president|us election|supreme court)\b/i.test(
        text,
      ) &&
      /\b(election|law|court|war|military|tariff|policy|congress|president|sanction|budget)\b/i.test(
        text,
      )
    )
      tags.add("us");
    return [
      {
        url,
        title,
        summary,
        publisher: feed.publisher,
        published,
        sections: [...tags],
        top: feed.top && index < 8,
        kind: /\banalysis\b/i.test(categories + " " + title)
          ? "Analysis"
          : "News",
      },
    ];
  });
}
const stop = new Set(
  "the a an and or to of in on for as is at with from by has after over amid says said".split(
    " ",
  ),
);
export function tokens(title) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stop.has(w)),
  );
}
export function similar(a, b) {
  const x = tokens(a),
    y = tokens(b);
  const overlap = [...x].filter((w) => y.has(w)).length;
  return overlap >= 4 && overlap / Math.max(x.size, y.size) >= 0.72;
}
export function groupArticles(rows) {
  const groups = [],
    index = new Map(),
    keys = [];
  for (const a of rows) {
    const words = tokens(a.title),
      candidates = new Map();
    for (const word of words)
      for (const i of index.get(word) || [])
        candidates.set(i, (candidates.get(i) || 0) + 1);
    const match = [...candidates].find(
      ([i, n]) =>
        n >= 4 &&
        n / Math.max(words.size, keys[i].size) >= 0.72 &&
        Math.abs(groups[i].published - a.published) < 18 * 3600000,
    );
    if (match) {
      const g = groups[match[0]];
      if (a.url !== g.url && !g.coverage.some((c) => c.url === a.url))
        g.coverage.push({ url: a.url, publisher: a.publisher, title: a.title });
      g.sections = [...new Set([...g.sections, ...a.sections])];
      g.top ||= a.top;
      g.saved ||= a.saved;
      g.read ||= a.read;
    } else {
      const i = groups.length;
      groups.push({ ...a, coverage: [] });
      keys.push(words);
      for (const word of words) {
        if (!index.has(word)) index.set(word, []);
        index.get(word).push(i);
      }
    }
  }
  return groups;
}
export function balanced(rows, limit) {
  const count = {};
  const chosen = [];
  for (const a of rows) {
    if ((count[a.publisher] || 0) < Math.max(2, Math.ceil(limit / 3))) {
      chosen.push(a);
      count[a.publisher] = (count[a.publisher] || 0) + 1;
      if (chosen.length === limit) break;
    }
  }
  return chosen;
}
