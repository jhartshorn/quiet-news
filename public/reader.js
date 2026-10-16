const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const id = params.get("id");
// Only return to this app's dashboard, even for manually edited reader URLs.
let home = "/";
try {
  const destination = new URL(params.get("return") || "/", location.origin);
  if (destination.origin === location.origin && destination.pathname === "/")
    home = destination.pathname + destination.search + destination.hash;
} catch {}
$("#reader-home").href = home;
$("#reader-home-bottom").href = home;
$(".reader-brand").href = home;
let article;
async function api(url, method = "GET", body) {
  const response = await fetch(url, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "Content-Type": "application/json", "X-Quiet-News": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || "Request failed");
  return data;
}
async function load() {
  $("#fallback").hidden = true;
  $("#reader-status").textContent = "Fetching a clean reading view.";
  try {
    if (!/^[a-zA-Z0-9-]{1,64}$/.test(id || ""))
      throw Error("No valid article was selected.");
    article = await api("/api/reader/" + id);
    document.body.dataset.theme = article.settings.theme;
    $("#original").href = article.url;
    $("#original").hidden = false;
    $("#reader-title").textContent = article.title;
    document.title = article.title + " · Quiet News";
    $("#reader-meta").textContent = [
      article.publisher,
      article.byline,
      new Date(article.published).toLocaleDateString("en-GB"),
      article.minutes ? article.minutes + " min read" : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (article.direct) {
      location.replace(article.url);
      return;
    }
    if (article.error) {
      $("#reader-status").textContent = article.error;
      $("#fallback").hidden = false;
      $("#retry").hidden = !article.retryable;
      return;
    }
    $("#reader-status").textContent = "";
    const content = $("#reader-content");
    content.replaceChildren();
    for (const block of article.blocks) {
      const tag = ["h1", "h2", "h3", "h4"].includes(block.type)
        ? "h2"
        : block.type === "blockquote"
          ? "blockquote"
          : block.type === "pre"
            ? "pre"
            : "p";
      const el = document.createElement(tag);
      el.textContent = (block.type === "li" ? "• " : "") + block.text;
      content.append(el);
    }
    await api("/api/state/" + id, "PUT", { read: true });
  } catch (error) {
    $("#reader-status").textContent = error.message;
    if (article?.url) $("#fallback").hidden = false;
  }
}
async function openFallback() {
  const button = $("#fallback-open");
  button.disabled = true;
  try {
    if ($("#always-direct").checked) {
      // Read current settings to preserve exclusions saved in other tabs.
      const current = await api("/api/news");
      await api("/api/settings", "PUT", {
        directSources: [
          ...new Set([...current.settings.directSources, article.publisher]),
        ],
      });
    }
    location.assign(article.url);
  } catch (error) {
    $("#reader-status").textContent =
      "Could not save your source preference: " +
      error.message +
      ". Uncheck the option to open without saving.";
    button.disabled = false;
  }
}
$("#fallback-open").onclick = openFallback;
$("#original").onclick = (e) => {
  if (!$("#fallback").hidden && $("#always-direct").checked) {
    e.preventDefault();
    void openFallback();
  }
};
$("#retry").onclick = load;
load();
