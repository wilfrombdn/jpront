// ---- Config: add or rename platforms here ----
const PLATFORMS = [
  { name: "Windows", repo: "wilfrombdn/JPROnt-releases" },
  { name: "Linux", repo: "wilfrombdn/JPROnt-Linux-releases", note: "Early version. Not yet tested on a real vehicle." },
];
// ----------------------------------------------

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const size = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const date = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

// Turn a release body into a scannable list: bullets as-is, prose split into sentences,
// "Lead: a; b; c" expanded into sub-bullets. First SHOW items visible, rest collapsed.
const SHOW = 2;
function notes(body) {
  let items;
  if (/^\s*[-*] /m.test(body)) {
    items = body.split(/\r?\n/).map((l) => l.replace(/^\s*[-*] /, "").trim()).filter(Boolean);
  } else {
    items = body.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);
    if (/^JPROn't [\d.]+ for /.test(items[0] || "")) items.shift(); // title already says this
  }
  const li = (t) => {
    t = t.replace(/\.$/, "");
    const parts = t.split(/;\s*/);
    const m = parts.length > 2 && parts[0].match(/^([^:]+):\s*(.+)$/);
    if (!m) return `<li>${esc(t)}</li>`;
    return `<li>${esc(m[1])}<ul>${[m[2], ...parts.slice(1)].map((x) => `<li>${esc(x)}</li>`).join("")}</ul></li>`;
  };
  const head = items.slice(0, SHOW).map(li).join("");
  const rest = items.slice(SHOW).map(li).join("");
  return `<ul>${head}</ul>` + (rest ? `<details><summary>More details</summary><ul>${rest}</ul></details>` : "");
}

$("year").textContent = new Date().getFullYear();

Promise.all(PLATFORMS.filter((p) => p.available !== false).map((p) =>
  fetch(`https://api.github.com/repos/${p.repo}/releases`)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((all) => all.filter((r) => !r.draft).map((r) => ({ ...r, platform: p.name, repo: p.repo })))
    .catch(() => [])
)).then((lists) => {
  const all = lists.flat();
  if (!all.length) {
    $("downloads").innerHTML = `<p class="muted">Couldn't load releases right now.</p>`;
    $("latest-release").innerHTML = "";
    $("updates").hidden = true;
    return;
  }

  // Downloads: newest stable release per platform
  $("downloads").innerHTML = PLATFORMS.map((p) => {
    if (p.available === false) {
      return `<div class="platform"><h3>${esc(p.name)} <span class="muted">in progress, not working yet</span></h3></div>`;
    }
    // Newest by publish date, not by GitHub's order: versions restarted below 1.0, so 0.9.0 is newer than 1.8.0.
    const rel = all.filter((r) => r.platform === p.name).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    const latest = rel.find((r) => !r.prerelease) || rel[0];
    if (!latest) return "";
    const files = latest.assets.map((a) =>
      `<li><a href="${esc(a.browser_download_url)}"><span>${esc(a.name)}</span><span class="muted">${size(a.size)}</span></a></li>`
    ).join("");
    return `<div class="platform">
      <h3>${esc(p.name)} <span class="muted">${esc(latest.tag_name)} · ${date(latest.published_at)}</span></h3>
      ${p.note ? `<p class="note">${esc(p.note)}</p>` : ""}
      <ul class="files">${files}</ul>
    </div>`;
  }).join("");

  // Updates: every release, newest first
  all.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  $("latest-release").innerHTML = $("releases").innerHTML = "";
  const tpl = `<article class="release"><h3></h3><time></time><div class="notes"></div></article>`;
  $("latest-release").innerHTML = tpl;
  $("releases").innerHTML = all.slice(1).map(() => tpl).join("");
  if (all.length < 2) $("updates").hidden = true;
  document.querySelectorAll("#latest-release .release, #releases .release").forEach((el, i) => {
    const r = all[i];
    const p = PLATFORMS.find((x) => x.name === r.platform);
    el.querySelector("h3").textContent = `${r.name || r.tag_name} · ${r.platform}${p.note ? " (early)" : ""}`;
    el.querySelector("time").textContent = date(r.published_at) + (r.prerelease ? " · pre-release" : "");
    el.querySelector(".notes").innerHTML = notes(r.body || "");
  });
});
