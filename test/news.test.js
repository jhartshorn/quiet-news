import test from "node:test";
import assert from "node:assert/strict";
import {
  clean,
  parseFeed,
  similar,
  groupArticles,
  balanced,
  articleURL,
  classifySections,
  sections,
} from "../src/news.js";
const feed = { publisher: "Example", section: "world", top: true };
test("RSS parsing filters premium and opinion, sanitises excerpts and classifies conflicts", () => {
  const xml = `<rss><channel><item><title>Ukraine ceasefire talks resume</title><link>https://example.com/story?utm_source=rss</link><description><![CDATA[<p>Diplomats &amp; ministers meet.</p>]]></description><pubDate>Tue, 06 Oct 2026 08:00:00 GMT</pubDate></item><item><title>Comment</title><link>https://example.com/commentisfree/test</link></item><item><title>Premium story</title><link>https://example.com/story2</link><category>Premium</category></item></channel></rss>`;
  const articles = parseFeed(xml, feed, Date.parse("2026-10-06T09:00:00Z"));
  assert.equal(articles.length, 1);
  assert.equal(articles[0].summary, "Diplomats & ministers meet.");
  assert.equal(articles[0].url, "https://example.com/story");
  assert.ok(articles[0].sections.includes("security"));
});
test("Atom supports alternate links and rejects executable URLs", () => {
  const articles = parseFeed(
    `<feed><entry><title>Technology update</title><link rel="self" href="https://example.com/api"/><link rel="alternate" href="https://example.com/article"/><summary>Details</summary></entry><entry><title>Unsafe</title><link href="javascript:alert(1)"/></entry></feed>`,
    feed,
  );
  assert.equal(articles.length, 1);
  assert.equal(articles[0].url, "https://example.com/article");
  assert.equal(articleURL("javascript:alert(1)"), null);
});
test("Conservative grouping keeps different stories apart and links other coverage", () => {
  const a = "Council approves major housing development in Bristol";
  assert.ok(similar(a, "Bristol council approves major housing development"));
  assert.ok(!similar(a, "Council rejects spending cuts after election"));
  const groups = groupArticles([
    {
      title: a,
      published: 10,
      sections: ["uk"],
      coverage: [],
      url: "https://a",
      publisher: "A",
    },
    {
      title: a,
      published: 12,
      sections: ["local"],
      url: "https://b",
      publisher: "B",
    },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].coverage.length, 1);
  assert.deepEqual(groups[0].sections, ["uk", "local"]);
});
test("Source limits prevent one publisher occupying every slot", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({
    publisher: i < 8 ? "A" : "B",
  }));
  const result = balanced(rows, 6);
  assert.equal(result.filter((a) => a.publisher === "A").length, 2);
});

test("Escaped HTML excerpts are stripped after entity decoding", () => {
  assert.equal(
    clean("&lt;p&gt;Hello &amp; goodbye&lt;/p&gt;"),
    "Hello & goodbye",
  );
  assert.equal(
    articleURL("https://example.com/?a=1&amp;b=2"),
    "https://example.com/?a=1&b=2",
  );
});

test("Specialist sections follow existing sections and classify focused topics", () => {
  assert.deepEqual(
    sections.slice(0, 7).map(([id]) => id),
    ["uk", "world", "politics", "us", "tech", "local", "security"],
  );
  const examples = {
    elections: "Electoral Commission publishes voter registration guidance",
    derby: "Derbyshire announces new transport funding",
    administration: "Cabinet Office updates public procurement guidance",
    selfhosted: "Docker release improves self-hosted applications",
    privacy: "Encryption protects users after data breach",
    economics: "Bank of England reviews inflation and interest rates",
    energy: "Renewable energy policy supports nuclear power",
    science: "Astronomy breakthrough reveals new exoplanets",
    books: "Literary criticism explores a new fantasy novel",
    history: "Historians uncover medieval manuscripts",
    music: "Orchestra premieres new chamber music",
    gaming: "Nintendo emulator supports game preservation",
    finance: "Index funds and tax allowances for retirement",
    health: "Clinical trials investigate cardiovascular health",
    libraries: "KOReader improves EPUB support on Kobo",
    home: "Heat pumps and home insulation cut household costs",
  };
  for (const [id, title] of Object.entries(examples)) {
    assert.ok(
      classifySections({
        title,
        url: "https://example.com/story",
        sections: ["world"],
      }).includes(id),
      id,
    );
  }
  assert.deepEqual(
    classifySections({
      title: "Party leader announces a new model for government",
      url: "https://example.com/story",
      sections: ["politics"],
    }),
    ["politics"],
  );
});
test("Relevant culture and lifestyle articles are admitted while sport and opinion remain excluded", () => {
  const xml = `<rss><channel>
   <item><title>Orchestra performs new symphony</title><link>https://example.com/culture/concert</link></item>
   <item><title>Heat pumps reduce household costs</title><link>https://example.com/lifeandstyle/home</link></item>
   <item><title>Celebrity party photographs</title><link>https://example.com/culture/celebrity</link></item>
   <item><title>Derby football match</title><link>https://example.com/sport/football</link></item>
   <item><title>Classical music debate</title><link>https://example.com/culture/opinion</link><category>Opinion</category></item>
   </channel></rss>`;
  const articles = parseFeed(xml, feed);
  assert.equal(articles.length, 2);
  assert.ok(articles[0].sections.includes("music"));
  assert.ok(articles[1].sections.includes("home"));
});
