import { XMLParser } from "fast-xml-parser";
export const sections = [
  ["uk", "UK headlines"],
  ["world", "World headlines"],
  ["politics", "UK politics"],
  ["us", "U.S. essentials"],
  ["tech", "Technology & AI"],
  ["local", "Local government"],
  ["security", "Conflicts & security"],
  ["elections", "Elections & Democracy"],
  ["derby", "Derby & Derbyshire"],
  ["administration", "Public Administration"],
  ["selfhosted", "Self-Hosted & Open Source"],
  ["privacy", "Digital Privacy & Security"],
  ["economics", "Economics & Public Finance"],
  ["energy", "Energy & Climate"],
  ["science", "Science & Discovery"],
  ["books", "Books & Literature"],
  ["history", "History & Ideas"],
  ["music", "Classical & World Music"],
  ["gaming", "Gaming & Emulation"],
  ["finance", "Personal Finance & Investing"],
  ["health", "Health & Longevity"],
  ["libraries", "Reading & Digital Libraries"],
  ["home", "Home & Sustainable Living"],
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
  ["localgov", "LocalGov", "https://www.localgov.co.uk/rss", "local"],
  [
    "propublica",
    "ProPublica",
    "https://www.propublica.org/feeds/propublica/main",
    "us",
  ],
  [
    "ars-technica",
    "Ars Technica",
    "https://feeds.arstechnica.com/arstechnica/index",
    "tech",
  ],
  [
    "bleepingcomputer",
    "BleepingComputer",
    "https://www.bleepingcomputer.com/feed/",
    "tech",
  ],
  [
    "politico-europe",
    "POLITICO Europe",
    "https://www.politico.eu/feed/",
    "world",
  ],
  ["city-am", "City A.M.", "https://www.cityam.com/feed/", "uk"],
  ["npr", "NPR", "https://feeds.npr.org/1001/rss.xml", "us"],
  [
    "al-jazeera",
    "Al Jazeera",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "world",
  ],
  [
    "bbc-derby",
    "BBC News",
    "https://feeds.bbci.co.uk/news/england/derbyshire/rss.xml",
    "derby",
  ],
  [
    "guardian-science",
    "The Guardian",
    "https://www.theguardian.com/science/rss",
    "science",
  ],
  [
    "guardian-books",
    "The Guardian",
    "https://www.theguardian.com/books/rss",
    "books",
  ],
  [
    "guardian-classical",
    "The Guardian",
    "https://www.theguardian.com/music/classicalmusicandopera/rss",
    "music",
  ],
  [
    "guardian-money",
    "The Guardian",
    "https://www.theguardian.com/money/rss",
    "finance",
  ],
  [
    "guardian-environment",
    "The Guardian",
    "https://www.theguardian.com/environment/rss",
    "energy",
  ],
  [
    "guardian-health",
    "The Guardian",
    "https://www.theguardian.com/society/health/rss",
    "health",
  ],
  [
    "ars-gaming",
    "Ars Technica",
    "https://feeds.arstechnica.com/arstechnica/gaming",
    "gaming",
  ],
  [
    "democracy-club",
    "Democracy Club",
    "https://democracyclub.org.uk/blog/feed/",
    "elections",
  ],
  [
    "ucl-constitution-unit",
    "UCL Constitution Unit",
    "https://blogs.ucl.ac.uk/constitution-unit/feed/",
    "elections",
  ],
  [
    "quanta",
    "Quanta Magazine",
    "https://www.quantamagazine.org/feed/",
    "science",
  ],
  [
    "carbon-brief",
    "Carbon Brief",
    "https://www.carbonbrief.org/feed/",
    "energy",
  ],
  [
    "nihr-evidence",
    "NIHR Evidence",
    "https://evidence.nihr.ac.uk/feed/",
    "health",
  ],
  ["eff", "EFF", "https://www.eff.org/rss/updates.xml", "privacy"],
  [
    "gamingonlinux",
    "GamingOnLinux",
    "https://www.gamingonlinux.com/article_rss.php",
    "gaming",
  ],
  [
    "public-domain-review",
    "Public Domain Review",
    "https://publicdomainreview.org/rss.xml",
    "history",
  ],
  [
    "public-books",
    "Public Books",
    "https://www.publicbooks.org/feed/",
    "books",
  ],
  ["literary-hub", "Literary Hub", "https://lithub.com/feed/", "books"],
  [
    "energy-saving-trust",
    "Energy Saving Trust",
    "https://energysavingtrust.org.uk/feed/",
    "home",
  ],
  [
    "violin-channel",
    "The Violin Channel",
    "https://theviolinchannel.com/feed/",
    "music",
  ],
  [
    "bank-of-england",
    "Bank of England",
    "https://www.bankofengland.co.uk/rss/news",
    "economics",
  ],
  ["monevator", "Monevator", "https://monevator.com/feed/", "finance"],
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
// Match specific subjects rather than broad words such as "model" or "party".
const specialistTopics = [
  [
    "elections",
    /\b(electoral|election administration|election management|voter registration|voter id|voting rights|voting system|polling stations?|returning officers?|democratic participation|electoral reform|democracy)\b/i,
  ],
  [
    "derby",
    /\b(derbyshire|derby city|derby council|derby county council|chesterfield|erewash|amber valley|derbyshire dales|high peak|bolsover)\b|\bDerby\b/i,
  ],
  [
    "administration",
    /\b(civil service|civil servants?|public administration|public procurement|government digital|government data|administrative law|cabinet office|public sector reform|government digital service)\b/i,
  ],
  [
    "selfhosted",
    /\b(self[- ]host(?:ed|ing)?|homelabs?|linux|freebsd|docker|tailscale|open[- ]source|nas systems?|network attached storage|proxmox|nextcloud)\b/i,
  ],
  [
    "privacy",
    /\b(cybersecurity|cyberattacks?|ransomware|malware|data breach(?:es)?|data protection|digital privacy|digital rights|surveillance|encryption|vulnerabilit(?:y|ies)|gdpr)\b/i,
  ],
  [
    "economics",
    /\b(inflation|interest rates?|economic policy|public finance|public spending|productivity|fiscal|taxation|gdp|bank of england|treasury|government budget|national debt)\b/i,
  ],
  [
    "energy",
    /\b(climate|renewable|renewables|nuclear power|energy policy|energy security|solar power|wind farms?|carbon emissions|global warming|net zero|fossil fuels?)\b/i,
  ],
  [
    "science",
    /\b(physics|mathematics|astronomy|cosmology|archaeology|archaeologists?|evolutionary biology|scientists?|scientific|quantum|exoplanets?|nasa|space telescope)\b/i,
  ],
  [
    "books",
    /\b(literary|literature|novelists?|book reviews?|fiction|fantasy novels?|author interviews?|publishing|novels?)\b/i,
  ],
  [
    "history",
    /\b(historical|historians?|philosophy|philosophers?|political thought|intellectual history|ancient|medieval)\b/i,
  ],
  [
    "music",
    /\b(classical music|world music|orchestra|orchestral|symphon(?:y|ies)|opera|composers?|chamber music|middle eastern music|oud|maqam)\b/i,
  ],
  [
    "gaming",
    /\b(gaming|video games?|retro gaming|retrogaming|emulators?|emulation|nintendo|steam deck|handheld consoles?|game preservation|indie games?)\b/i,
  ],
  [
    "finance",
    /\b(personal finance|index funds?|investing|investments?|pensions?|retirement|tax allowances?|isas?|savings accounts?|mortgages?)\b/i,
  ],
  [
    "health",
    /\b(medical research|clinical trials?|exercise|cardiovascular|nutrition|healthy ageing|healthy aging|longevity|health research|dementia|cancer research|vaccines?)\b/i,
  ],
  [
    "libraries",
    /\b(e[- ]readers?|e[- ]books?|calibre|koreader|readest|epub|digital libraries|digital preservation|library management|kindle|kobo)\b/i,
  ],
  [
    "home",
    /\b(home energy|energy efficiency|heat pumps?|home insulation|home repairs?|domestic heating|household costs|smart home|sustainable living)\b/i,
  ],
];
export function classifySections(article, categories = "") {
  const tags = new Set(article.sections || []);
  const text = `${article.title} ${article.summary || ""} ${categories}`;
  for (const [id, pattern] of specialistTopics)
    if (pattern.test(text)) tags.add(id);
  // Publisher paths also identify subjects when a headline contains no keywords.
  const path = new URL(article.url).pathname;
  for (const [id, pattern] of [
    ["science", /\/science\//i],
    ["books", /\/books\//i],
    ["gaming", /\/gaming\//i],
    ["finance", /\/money\//i],
    ["energy", /\/environment\//i],
    ["health", /\/health(?:care|andwellbeing)?\//i],
  ])
    if (pattern.test(path)) tags.add(id);
  return [...tags];
}
export function excludedArticle(article) {
  if (/\/(sport|sports|football|bootnotes|bofh)\//i.test(article.url))
    return true;
  if (/\/(culture|lifeandstyle)\//i.test(article.url))
    return (
      !classifySections({ ...article, sections: [] }).length &&
      !article.sections?.some((id) =>
        ["books", "music", "history", "gaming", "health", "home"].includes(id),
      )
    );
  return false;
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
      excludedArticle({
        url,
        title,
        summary: clean(e.description || e.summary || ""),
        sections: [feed.section],
      }) ||
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
        sections: classifySections(
          { url, title, summary, sections: [...tags] },
          categories,
        ),
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
        if (Math.abs(groups[i].published - a.published) < 18 * 3600000)
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
