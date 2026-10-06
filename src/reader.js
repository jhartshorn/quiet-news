import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { parentPort, workerData } from "node:worker_threads";
export function extractArticle(html, url) {
  if (/"isAccessibleForFree"\s*:\s*(?:false|"false")/i.test(html))
    throw Error("The publisher marks this article as restricted.");
  const { document } = parseHTML(html);
  // No scripts or remote resources are executed by this parser.
  document
    .querySelectorAll("script,style,noscript,iframe,form,nav,footer,aside")
    .forEach((n) => n.remove());
  if (
    document
      .querySelector('[class*="paywall"], [id*="paywall"]')
      ?.textContent?.match(/subscribe|subscription|sign in|register/i)
  )
    throw Error("This page appears to require a subscription or account.");
  const article = new Readability(document, {
    charThreshold: 500,
    maxElemsToParse: 25000,
  }).parse();
  if (!article?.content) throw Error("Could not identify the article text.");
  const parsed = parseHTML(
    `<html><body>${article.content}</body></html>`,
  ).document;
  const blocks = [];
  for (const el of parsed.querySelectorAll("h1,h2,h3,h4,p,li,blockquote,pre")) {
    if (el.parentElement?.closest("li,blockquote,pre")) continue;
    const text = el.textContent.replace(/\s+/g, " ").trim();
    if (text) blocks.push({ type: el.localName, text });
  }
  const text = blocks.map((b) => b.text).join(" ");
  if (text.length < 600 || blocks.length < 2)
    throw Error("Only a short excerpt could be extracted.");
  if (text.length > 180000)
    throw Error("This article is too large for reader mode.");
  return {
    title: article.title,
    byline: article.byline,
    blocks,
    minutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 220)),
    url,
  };
}
if (parentPort) {
  try {
    parentPort.postMessage({
      article: extractArticle(workerData.html, workerData.url),
    });
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
}
