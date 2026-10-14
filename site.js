// ---- Config: add or rename platforms here ----
const PLATFORMS = [
  { name: "Windows", repo: "wilfrombdn/JPROnt-releases" },
  { name: "Linux", repo: "wilfrombdn/JPROnt-Linux-releases", note: "Early version. Not all functionality works yet." },
];
// ----------------------------------------------

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const size = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const date = (d) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

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
    const rel = all.filter((r) => r.platform === p.name);
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
  const tpl = `<article class="release"><h3></h3><time></time><pre></pre></article>`;
  $("latest-release").innerHTML = tpl;
  $("releases").innerHTML = all.slice(1).map(() => tpl).join("");
  if (all.length < 2) $("updates").hidden = true;
  document.querySelectorAll("#latest-release .release, #releases .release").forEach((el, i) => {
    const r = all[i];
    const p = PLATFORMS.find((x) => x.name === r.platform);
    el.querySelector("h3").textContent = `${r.name || r.tag_name} · ${r.platform}${p.note ? " (early)" : ""}`;
    el.querySelector("time").textContent = date(r.published_at) + (r.prerelease ? " · pre-release" : "");
    el.querySelector("pre").textContent = r.body || "";
  });
});
