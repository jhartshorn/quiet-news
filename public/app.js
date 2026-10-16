import { NewsClient } from "./news-client.js";
import { reconcileSections } from "./news-view.js";
const newsClient = new NewsClient();
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let data,
  order = [],
  hiddenSections = [],
  lastVisit = Number(localStorage.getItem("lastVisit")) || Date.now(),
  busy = false,
  loadPending = false;
localStorage.setItem("lastVisit", String(Date.now()));
const relative = (t) => {
  if (!t) return "Never";
  const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
  return mins < 1
    ? "Just now"
    : mins < 60
      ? `${mins}m ago`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ago`
        : `${Math.floor(mins / 1440)}d ago`;
};
async function api(path, method = "GET", body) {
  const r = await fetch(path, {
    method,
    headers:
      method === "GET"
        ? {}
        : { "Content-Type": "application/json", "X-Quiet-News": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const v = await r.json();
  if (!r.ok) throw Error(v.error || "Request failed");
  return v;
}
function notice(message) {
  $("#notice").textContent = message;
}
async function load() {
  if (busy) {
    loadPending = true;
    return;
  }
  busy = true;
  try {
    const p = new URLSearchParams();
    for (const [key, id] of [
      ["q", "search"],
      ["source", "publisher"],
      ["date", "filter-date"],
    ])
      if ($("#" + id).value) p.set(key, $("#" + id).value);
    const v = $("#view").value;
    if (v === "since") p.set("since", lastVisit);
    else if (v) p.set("view", v);
    const result = await newsClient.load("/api/news?" + p);
    data = result.data;
    if (result.changed) render();
    renderStatus();
  } catch (e) {
    notice(
      "Could not load news: " + e.message + ". Your server may be restarting.",
    );
  } finally {
    busy = false;
    if (loadPending) {
      loadPending = false;
      void load();
    }
  }
}
function dashboardURL(sectionId) {
  const params = new URLSearchParams();
  for (const [key, selector] of [
    ["q", "#search"],
    ["source", "#publisher"],
    ["date", "#filter-date"],
    ["view", "#view"],
  ])
    if ($(selector).value) params.set(key, $(selector).value);
  if ($("#view").value === "since") params.set("since", lastVisit);
  const query = params.toString();
  return `/${query ? "?" + query : ""}#${sectionId}`;
}
function card(a, sectionId) {
  const reader =
    data.settings.readerMode &&
    !data.settings.directSources.includes(a.publisher);
  const destination = reader
    ? `/reader?id=${a.id}&return=${encodeURIComponent(dashboardURL(sectionId))}`
    : a.url;
  return `<article data-article-id="${a.id}" class="card ${a.read ? "read" : ""}"><div class="meta"><span class="source">${esc(a.publisher)}</span><span>${a.kind === "Analysis" ? "Analysis · " : ""}<time datetime="${new Date(a.published).toISOString()}" title="${esc(new Date(a.published).toLocaleString())}">${relative(a.published)}</time></span></div><h3><a class="article-link" data-open="${a.id}" href="${esc(destination)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ""}<div class="card-bottom"><a class="open" data-open="${a.id}" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">Read at source ↗</a><div><button data-state="saved" data-id="${a.id}" data-value="${!a.saved}" aria-pressed="${a.saved}">${a.saved ? "Saved ✓" : "Save"}</button> <button data-state="read" data-id="${a.id}" data-value="${!a.read}" aria-pressed="${a.read}">${a.read ? "Unread" : "Mark read"}</button></div></div>${a.coverage.length ? `<details><summary>Other coverage · ${a.coverage.length}</summary>${a.coverage.map((c) => `<a target="_blank" rel="noopener noreferrer" href="${esc(c.url)}">${esc(c.publisher)} — ${esc(c.title)} ↗</a>`).join("")}</details>` : ""}</article>`;
}
function section(id, title, articles, top = false) {
  return `<section id="${id}"><div class="section-head"><h2>${esc(title)}</h2><span>${top ? "THE BIG PICTURE" : id === "us" ? "MAJOR DEVELOPMENTS ONLY" : "LATEST REPORTING"}</span></div>${id === "security" ? '<div class="topic-tabs"><button data-topic="iran">Iran & Middle East</button><button data-topic="ukraine">Ukraine & Russia</button><button data-topic="taiwan">China & Taiwan</button></div>' : ""}${articles.length ? `<div class="grid ${top ? "top-grid" : ""}">${articles.map((a) => card(a, id)).join("")}</div>` : `<div class="empty">No recent matching stories${id === "local" ? ". Add a regional or council feed in Sources for more local coverage" : ". Check back after the next update, or explore All history"}.</div>`}</section>`;
}
function render() {
  const s = data.settings;
  document.body.dataset.theme = s.theme;
  document.body.classList.toggle("compact", s.compact);
  const names = Object.fromEntries(data.sectionNames);
  const ordered = [
    ...new Set([...s.order, ...data.sectionNames.map((x) => x[0])]),
  ];
  const navHTML =
    '<a href="#top">Top stories</a>' +
    ordered
      .filter((id) => !s.hidden.includes(id))
      .map((id) => `<a href="#${id}">${esc(names[id])}</a>`)
      .join("");
  if ($("#nav")._newsHTML !== navHTML) {
    $("#nav").innerHTML = navHTML;
    $("#nav")._newsHTML = navHTML;
  }
  const filtering =
    $("#view").value ||
    $("#search").value ||
    $("#publisher").value ||
    $("#filter-date").value;
  const entries = filtering
    ? [
        [
          "results",
          `${data.count} matching stories${data.count > 100 ? " · showing newest 100" : ""}`,
          data.results,
        ],
      ]
    : [
        ["top", "Top stories", data.top, true],
        ...ordered
          .filter((id) => !s.hidden.includes(id))
          .map((id) => [id, names[id], data.sections[id]]),
      ];
  reconcileSections($("#news"), entries, section, (id) => [
    s.readerMode,
    s.directSources,
    dashboardURL(id),
  ]);
  const current = $("#publisher").value;
  $("#publisher").innerHTML =
    '<option value="">All sources</option>' +
    data.publishers
      .map(
        (p) => `<option ${p === current ? "selected" : ""}>${esc(p)}</option>`,
      )
      .join("");
}
function renderStatus() {
  $("#date").textContent = new Date()
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
    })
    .toUpperCase();
  $("#freshness").textContent = data.updating
    ? "Collecting fresh stories…"
    : data.updated
      ? "Updated " + relative(data.updated)
      : "Waiting for the first collection";
  $("#refresh").disabled = data.updating;
  $("#footer-info").textContent =
    `Refreshes every ${data.minutes} minutes · ${data.retention}-day history · Saved stories retained.`;
  for (const time of $("#news").querySelectorAll("time"))
    time.textContent = relative(Date.parse(time.dateTime));
  const failed = data.feeds.filter((f) => f.enabled && f.error);
  notice(
    failed.length
      ? `${failed.length} feed${failed.length === 1 ? " is" : "s are"} currently unavailable. Cached stories remain available; details in Sources.`
      : data.count
        ? ""
        : data.updating
          ? "First collection is running. Stories will appear shortly."
          : "No stories yet. Open Sources to check feeds or request an update.",
  );
}
function closeMenu() {
  $("#header-menu").hidden = true;
  $("#menu-toggle").setAttribute("aria-expanded", "false");
}
function toggleSearch(open = $("#search-panel").hidden) {
  $("#search-panel").hidden = !open;
  $("#search-toggle").setAttribute("aria-expanded", String(open));
  if (open) $("#search").focus();
}
$("#search-toggle").onclick = () => {
  closeMenu();
  toggleSearch();
};
$("#menu-toggle").onclick = () => {
  const open = $("#header-menu").hidden;
  $("#header-menu").hidden = !open;
  $("#menu-toggle").setAttribute("aria-expanded", String(open));
  if (open) $("#settings-open").focus();
};
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap")) closeMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
  if (!$("#header-menu").hidden) {
    closeMenu();
    $("#menu-toggle").focus();
  } else if (!$("#search-panel").hidden) {
    toggleSearch(false);
    $("#search-toggle").focus();
  }
});
$("#search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  load();
});
$("#clear").onclick = () => {
  $("#search-form").reset();
  load();
};
$("#view").onchange = load;
$("#refresh").onclick = async () => {
  try {
    await api("/api/refresh", "POST", {});
    notice("Checking your sources…");
    await load();
  } catch (e) {
    notice(e.message);
  }
};
$("#news").addEventListener("click", async (e) => {
  if (
    !e.target.closest("a,button,details") &&
    e.target.closest(".card") &&
    !window.getSelection()?.toString()
  ) {
    e.target.closest(".card").querySelector(".article-link").click();
    return;
  }
  const state = e.target.closest("[data-state]");
  const open = e.target.closest("[data-open]");
  const topic = e.target.closest("[data-topic]");
  try {
    if (state) {
      await api("/api/state/" + state.dataset.id, "PUT", {
        [state.dataset.state]: state.dataset.value === "true",
      });
      await load();
    }
    if (open) {
      await api("/api/state/" + open.dataset.open, "PUT", { read: true });
      if (data.settings.hideRead) await load();
      else open.closest(".card")?.classList.add("read");
    }
    if (topic) {
      toggleSearch(true);
      $("#search").value = topic.dataset.topic;
      await load();
    }
  } catch (err) {
    notice(err.message);
  }
});
for (const dialog of document.querySelectorAll("dialog"))
  dialog.querySelector(".close").onclick = () => dialog.close();
function showSectionSettings() {
  const names = Object.fromEntries(data.sectionNames);
  $("#section-settings").innerHTML = order
    .map(
      (id, i) =>
        `<div class="setting-row"><label class="check"><input type="checkbox" data-section="${id}" ${!hiddenSections.includes(id) ? "checked" : ""}>${esc(names[id])}</label><div><button type="button" data-move="${id}" data-direction="-1" ${i === 0 ? "disabled" : ""} aria-label="Move ${esc(names[id])} up">↑</button> <button type="button" data-move="${id}" data-direction="1" ${i === order.length - 1 ? "disabled" : ""} aria-label="Move ${esc(names[id])} down">↓</button></div></div>`,
    )
    .join("");
}
$("#settings-open").onclick = () => {
  closeMenu();
  if (!data) return;
  const f = $("#settings-form"),
    s = data.settings;
  for (const k of ["theme", "region", "followed", "muted"])
    f.elements[k].value = s[k];
  for (const k of ["compact", "hideRead", "readerMode"])
    f.elements[k].checked = s[k];
  order = [...new Set([...s.order, ...data.sectionNames.map((x) => x[0])])];
  hiddenSections = [...s.hidden];
  showSectionSettings();
  $("#publisher-settings").innerHTML = data.publishers
    .map(
      (p) =>
        `<label class="check"><input type="checkbox" data-publisher="${esc(p)}" ${s.disabledPublishers.includes(p) ? "" : "checked"}>${esc(p)}</label>`,
    )
    .join("");
  $("#preferences").showModal();
};
$("#section-settings").onclick = (e) => {
  const b = e.target.closest("[data-move]");
  if (!b) return;
  hiddenSections = [
    ...document.querySelectorAll("[data-section]:not(:checked)"),
  ].map((x) => x.dataset.section);
  const i = order.indexOf(b.dataset.move),
    j = i + Number(b.dataset.direction);
  [order[i], order[j]] = [order[j], order[i]];
  showSectionSettings();
};
$("#settings-form").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    await api("/api/settings", "PUT", {
      theme: f.elements.theme.value,
      region: f.elements.region.value,
      followed: f.elements.followed.value,
      muted: f.elements.muted.value,
      readerMode: f.elements.readerMode.checked,
      compact: f.elements.compact.checked,
      hideRead: f.elements.hideRead.checked,
      order,
      hidden: [
        ...document.querySelectorAll("[data-section]:not(:checked)"),
      ].map((x) => x.dataset.section),
      disabledPublishers: [
        ...document.querySelectorAll("[data-publisher]:not(:checked)"),
      ].map((x) => x.dataset.publisher),
    });
    $("#preferences").close();
    await load();
  } catch (err) {
    alert(err.message);
  }
};
$("#export-settings").onclick = () => {
  const blob = new Blob([JSON.stringify(data.settings, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "quiet-news-preferences.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#import-settings").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 65536) throw Error("Preferences file is too large");
    await api("/api/settings", "PUT", JSON.parse(await file.text()));
    $("#preferences").close();
    await load();
  } catch (err) {
    alert("Could not import preferences: " + err.message);
  }
};
function renderFeeds() {
  $("#reader-sources").innerHTML = data.publishers
    .map(
      (p) =>
        `<label class="check"><input type="checkbox" data-direct-source="${esc(p)}" ${data.settings.directSources.includes(p) ? "checked" : ""}>${esc(p)} — open original directly</label>`,
    )
    .join("");
  $("#feed-list").innerHTML = data.feeds
    .map(
      (f) =>
        `<div class="feed-row"><label class="check"><input type="checkbox" data-feed="${esc(f.id)}" ${f.enabled ? "checked" : ""} aria-label="Enable ${esc(f.publisher)} ${esc(f.section)}"></label><div><strong>${esc(f.publisher)}</strong> · ${esc(Object.fromEntries(data.sectionNames)[f.section])}<small><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.url)}</a></small><small class="${f.error ? "error" : ""}">${f.error ? esc(f.error) : f.lastSuccess ? "Last successful check " + relative(f.lastSuccess) : "Not checked yet"}</small></div>${f.custom ? `<button data-delete="${esc(f.id)}">Remove</button>` : ""}</div>`,
    )
    .join("");
}
$("#sources-open").onclick = () => {
  closeMenu();
  if (!data) return;
  renderFeeds();
  $("#feed-section").innerHTML = data.sectionNames
    .map(([id, name]) => `<option value="${id}">${esc(name)}</option>`)
    .join("");
  $("#sources").showModal();
};
$("#reader-sources").onchange = async (e) => {
  if (!e.target.dataset.directSource) return;
  try {
    await api("/api/settings", "PUT", {
      directSources: [
        ...document.querySelectorAll("[data-direct-source]:checked"),
      ].map((x) => x.dataset.directSource),
    });
    await load();
    renderFeeds();
  } catch (error) {
    alert(error.message);
  }
};
$("#feed-list").onchange = async (e) => {
  if (!e.target.dataset.feed) return;
  try {
    await api("/api/feeds/" + e.target.dataset.feed, "PUT", {
      enabled: e.target.checked,
    });
    await load();
    renderFeeds();
  } catch (err) {
    alert(err.message);
  }
};
$("#feed-list").onclick = async (e) => {
  if (!e.target.dataset.delete) return;
  try {
    await api("/api/feeds/" + e.target.dataset.delete, "DELETE");
    await load();
    renderFeeds();
  } catch (err) {
    alert(err.message);
  }
};
$("#add-feed").onsubmit = async (e) => {
  e.preventDefault();
  const b = e.target.querySelector("button");
  b.disabled = true;
  b.textContent = "Validating…";
  try {
    await api("/api/feeds", "POST", Object.fromEntries(new FormData(e.target)));
    e.target.reset();
    await load();
    renderFeeds();
  } catch (err) {
    alert("Could not add feed: " + err.message);
  } finally {
    b.disabled = false;
    b.textContent = "Validate and add";
  }
};
// Restore the dashboard view when returning from the reader.
const initialParams = new URLSearchParams(location.search);
for (const [key, selector] of [
  ["q", "#search"],
  ["source", "#publisher"],
  ["date", "#filter-date"],
  ["view", "#view"],
]) {
  const value = initialParams.get(key);
  if (value === null) continue;
  if (key === "source" && value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    $(selector).append(option);
  }
  $(selector).value = value;
}
if ($("#view").value === "since" && Number(initialParams.get("since")) > 0)
  lastVisit = Number(initialParams.get("since"));
if (["q", "source", "date", "view"].some((key) => initialParams.get(key)))
  toggleSearch(true);
await load();
// Sections are inserted asynchronously, after the browser's initial anchor scroll.
if (location.hash)
  document.getElementById(location.hash.slice(1))?.scrollIntoView();
setInterval(() => {
  if (!document.hidden && !document.querySelector("dialog[open]")) load();
}, 60000);
