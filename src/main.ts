import "./style.css";
import Fuse from "fuse.js";
import { loadDB, DB, TYPE_LABEL, ancestors } from "./data";
import { state, set, onChange, readHash, writeHash, TYPE_GROUPS, AMOUNT_LABELS, View } from "./state";
import { initGraph, render, highlight, fitHome, focusView, cy, currentModel, styles } from "./graph";
import { initPanel, renderNode, renderEdge, renderIntro, bindPanel } from "./panel";
import { renderMatrix, renderList } from "./tables";
import { typeGroup } from "./model";

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
let db: DB;

async function boot() {
  try {
    db = await loadDB(import.meta.env.BASE_URL + "data/");
  } catch (e) {
    $("#panel").innerHTML = `<p class="empty">לא הצלחנו לטעון את הנתונים. נסו לרענן את הדף.</p>`;
    throw e;
  }
  readHash();
  if (!new URLSearchParams(location.hash.slice(1)).get("v") && matchMedia("(max-width: 700px)").matches) state.view = "free";
  initPanel(db, $("#panel"));
  initGraph($("#cy"), db, { onSelect: (id) => select(id), onToggle: (id) => toggleGroup(id) });
  bindPanel((id) => go(id), panelAction);
  buildControls();
  buildStories();
  buildLegend();
  $("#dataStamp").textContent = `${db.nodes.length} גופים · ${db.edges.length} קשרים · ${db.sources.length} מקורות${db.meta.generated ? " · עודכן " + db.meta.generated : ""}`;
  onChange(update);
  if (state.selected && !db.byId[state.selected] && !state.selected.startsWith("e:")) state.selected = null;
  if (state.selected && db.byId[state.selected]) revealAncestors(state.selected);
  update("init");
  if (state.story) applyStep(false);
}

// ---------- state → screen ----------
function update(why: string) {
  syncControls();
  const table = state.view === "matrix" || state.view === "list";
  $("#cy").style.visibility = table ? "hidden" : "visible";
  $("#tableView").hidden = !table;
  $("#zoomCtl").hidden = table;
  $("#legend").hidden = table;
  $("#forceCtl").hidden = state.view !== "free";
  if (table) $("#storyCard").hidden = true; else if (state.story) $("#storyCard").hidden = false;
  $("#hint").textContent = hintText();
  if (table) {
    if (why !== "select") (state.view === "matrix" ? renderMatrix : renderList)(db, state, $("#tableView"));
  } else if (why === "select") {
    if (state.view === "radial" || state.view === "tree") render(state, "select-layout"); else highlight(state.selected);
  } else render(state, why);
  renderPanel();
}

function hintText() {
  switch (state.view) {
    case "cols": return "גררו להזזה · גלגלת להגדלה · לחיצה כפולה פותחת קבוצה";
    case "free": return "הסרגלים משנים את הדחייה ואת אורך הקשרים";
    case "radial": return state.selected ? "הגוף הנבחר במרכז; כל מעגל הוא דרגת קרבה נוספת (עד 3)" : "בחרו גוף כדי לשים אותו במרכז";
    case "tree": return state.selected ? "שרשרת השליטה של הגוף הנבחר, מלמעלה למטה" : "בחרו גוף כדי לראות רק את העץ שלו";
    default: return "";
  }
}

function renderPanel() {
  const s = state.selected;
  if (!s) return renderIntro();
  if (s.startsWith("e:")) {
    const ve = currentModel()?.edges.find((e) => e.id === s.slice(2));
    return ve ? renderEdge(ve.id, ve.edges) : renderIntro();
  }
  renderNode(s);
}

// ---------- actions ----------
function revealAncestors(id: string) {
  const anc = ancestors(db, id);
  if (anc.some((a) => !state.expanded.has(a))) { const x = new Set(state.expanded); anc.forEach((a) => x.add(a)); state.expanded = x; }
  const n = db.byId[id];
  const g = typeGroup(n);
  if (state.typesOff.has(g)) { const t = new Set(state.typesOff); t.delete(g); state.typesOff = t; }
  if (n.sector && state.sectorsOff.has(n.sector)) { const t = new Set(state.sectorsOff); t.delete(n.sector); state.sectorsOff = t; }
  if ((state.geo === "il" && n.abroad) || (state.geo === "world" && !n.abroad)) state.geo = "all";
}

function select(id: string | null) {
  set({ selected: id, story: id ? state.story : state.story }, "select");
}
function go(id: string) {
  revealAncestors(id);
  set({ selected: id }, "reveal");
  if (state.view !== "matrix" && state.view !== "list") setTimeout(() => focusView(id), 60);
  $("#panel").focus({ preventScroll: true });
}
function toggleGroup(id: string) {
  const x = new Set(state.expanded);
  x.has(id) ? x.delete(id) : x.add(id);
  set({ expanded: x, selected: id }, "expand");
}
function panelAction(a: string) {
  const id = state.selected;
  if (!id || id.startsWith("e:")) return;
  if (a === "radial" || a === "tree") set({ view: a as View }, "view");
  if (a === "toggle") toggleGroup(id);
  if (a === "copy") navigator.clipboard?.writeText(location.href).then(() => { const b = $("#panel [data-act='copy']"); if (b) b.textContent = "הקישור הועתק"; });
}

// ---------- controls ----------
function buildControls() {
  $("#viewSeg").addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button"); if (b) set({ view: b.dataset.v as View }, "view"); });
  $("#geoSeg").addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button"); if (b) set({ geo: b.dataset.g as any }, "filter"); });
  const ms = $<HTMLInputElement>("#minShare"), ma = $<HTMLInputElement>("#minAmount");
  ms.addEventListener("input", () => set({ minShare: Number(ms.value) }, "filter"));
  ma.addEventListener("input", () => set({ minAmount: Number(ma.value) }, "filter"));
  const rp = $<HTMLInputElement>("#repel"), el = $<HTMLInputElement>("#elen");
  let t: number | undefined;
  const force = () => { clearTimeout(t); t = window.setTimeout(() => set({ repel: Number(rp.value), elen: Number(el.value) }, "force-params"), 250); };
  rp.addEventListener("input", force); el.addEventListener("input", force);
  $("#expandAll").addEventListener("click", () => set({ expanded: new Set(Object.keys(db.children)) }, "expand"));
  $("#collapseAll").addEventListener("click", () => set({ expanded: new Set() }, "expand"));

  const count = (types: string[]) => db.nodes.filter((n) => types.includes(n.type)).length;
  $("#typeTags").innerHTML = TYPE_GROUPS.filter((g) => count(g.types)).map((g) => `<button type="button" class="tag" data-t="${g.key}" style="--c:${g.color}"><span class="tick" aria-hidden="true"></span>${g.label}<span class="cnt">${count(g.types)}</span></button>`).join("");
  $("#typeTags").addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button"); if (!b) return; const t = new Set(state.typesOff); const k = b.dataset.t!; t.has(k) ? t.delete(k) : t.add(k); set({ typesOff: t }, "filter"); });
  const secCount = (k: string) => db.nodes.filter((n) => n.sector === k && (n.type === "company" || n.type === "brand")).length;
  $("#sectorTags").innerHTML = Object.entries(db.sectors).filter(([k]) => secCount(k)).map(([k, v]) => `<button type="button" class="tag" data-s="${k}" style="--c:var(--s-${k})"><span class="tick" aria-hidden="true"></span>${v}<span class="cnt">${secCount(k)}</span></button>`).join("");
  $("#sectorTags").addEventListener("click", (e) => { const b = (e.target as HTMLElement).closest("button"); if (!b) return; const t = new Set(state.sectorsOff); const k = b.dataset.s!; t.has(k) ? t.delete(k) : t.add(k); set({ sectorsOff: t }, "filter"); });
  $("#secAll").addEventListener("click", () => set({ sectorsOff: new Set() }, "filter"));
  $("#secNone").addEventListener("click", () => set({ sectorsOff: new Set(Object.keys(db.sectors)) }, "filter"));

  $("#zin").addEventListener("click", () => zoom(1.25));
  $("#zout").addEventListener("click", () => zoom(0.8));
  $("#zfit").addEventListener("click", () => fitHome());
  $("#aboutBtn").addEventListener("click", () => ($("#aboutDlg") as HTMLDialogElement).showModal());
  $("#tableView").addEventListener("click", (e) => { const a = (e.target as HTMLElement).closest("[data-go]") as HTMLElement | null; if (a) { e.preventDefault(); go(a.dataset.go!); } });
  $("#tableView").addEventListener("keydown", (e) => { const a = (e.target as HTMLElement).closest("[data-go]") as HTMLElement | null; if (a && e.key === "Enter") go(a.dataset.go!); });
  window.addEventListener("hashchange", () => { readHash(); update("hash"); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => cy.style(styles()));
  buildSearch();
}
function zoom(f: number) { cy.zoom({ level: cy.zoom() * f, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); }

function syncControls() {
  const press = (sel: string, attr: string, val: string) => document.querySelectorAll(`${sel} button`).forEach((b) => b.setAttribute("aria-pressed", String((b as HTMLElement).dataset[attr] === val)));
  press("#viewSeg", "v", state.view);
  press("#geoSeg", "g", state.geo);
  document.querySelectorAll("#typeTags .tag").forEach((b) => b.setAttribute("aria-pressed", String(!state.typesOff.has((b as HTMLElement).dataset.t!))));
  document.querySelectorAll("#sectorTags .tag").forEach((b) => b.setAttribute("aria-pressed", String(!state.sectorsOff.has((b as HTMLElement).dataset.s!))));
  $<HTMLInputElement>("#minShare").value = String(state.minShare);
  $("#minShareVal").textContent = state.minShare ? `מ-${state.minShare}%` : "הכול";
  $<HTMLInputElement>("#minAmount").value = String(state.minAmount);
  $("#minAmountVal").textContent = AMOUNT_LABELS[state.minAmount];
  const off = state.typesOff.size + state.sectorsOff.size;
  $("#filterState").textContent = off ? `(${off} מוסתרים)` : "";
  document.querySelectorAll("#storyChips button").forEach((b) => b.setAttribute("aria-pressed", String((b as HTMLElement).dataset.s === state.story)));
}

// ---------- search ----------
function buildSearch() {
  const q = $<HTMLInputElement>("#q"), res = $("#qres");
  const fuse = new Fuse(db.nodes, { keys: [{ name: "name", weight: 3 }, { name: "nameEn", weight: 2 }, { name: "role", weight: 1 }, { name: "summary", weight: 0.4 }], threshold: 0.32, ignoreLocation: true, minMatchCharLength: 2 });
  let list: typeof db.nodes = [], idx = 0;
  const label = (n: (typeof db.nodes)[0]) => n.type === "company" || n.type === "brand" ? db.sectors[n.sector || ""] || TYPE_LABEL[n.type] : TYPE_LABEL[n.type];
  const draw = () => {
    res.hidden = !q.value.trim();
    q.setAttribute("aria-expanded", String(!res.hidden));
    res.innerHTML = list.length ? list.map((n, i) => `<li role="option" id="qo${i}" data-id="${n.id}" aria-selected="${i === idx}">${n.name}<span>${label(n)}</span></li>`).join("") : `<li class="empty" role="option" aria-disabled="true">לא נמצא. נסו שם אחר או חלק ממנו.</li>`;
    q.setAttribute("aria-activedescendant", list.length ? "qo" + idx : "");
  };
  const pick = (id: string) => { q.value = ""; res.hidden = true; q.setAttribute("aria-expanded", "false"); set({ story: null }, "story"); go(id); };
  q.addEventListener("input", () => { list = fuse.search(q.value.trim()).slice(0, 10).map((r) => r.item); idx = 0; draw(); });
  q.addEventListener("keydown", (e) => {
    if (res.hidden) return;
    if (e.key === "ArrowDown") { idx = Math.min(idx + 1, list.length - 1); draw(); e.preventDefault(); }
    if (e.key === "ArrowUp") { idx = Math.max(idx - 1, 0); draw(); e.preventDefault(); }
    if (e.key === "Enter" && list[idx]) { pick(list[idx].id); e.preventDefault(); }
    if (e.key === "Escape") { res.hidden = true; q.setAttribute("aria-expanded", "false"); }
  });
  res.addEventListener("mousedown", (e) => { const li = (e.target as HTMLElement).closest("li[data-id]") as HTMLElement | null; if (li) { e.preventDefault(); pick(li.dataset.id!); } });
  q.addEventListener("blur", () => setTimeout(() => { res.hidden = true; q.setAttribute("aria-expanded", "false"); }, 150));
}

// ---------- stories ----------
function buildStories() {
  $("#storyChips").innerHTML = db.stories.map((s) => `<button type="button" data-s="${s.id}" title="${s.summary}">${s.title}</button>`).join("");
  $("#storyChips").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button"); if (!b) return;
    if (state.story === b.dataset.s) { set({ story: null }, "story"); $("#storyCard").hidden = true; return; }
    state.story = b.dataset.s!; state.step = 0; applyStep(true);
  });
  $("#storyCard").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button"); if (!b) return;
    const st = db.stories.find((s) => s.id === state.story); if (!st) return;
    if (b.dataset.nav === "close") { set({ story: null }, "story"); $("#storyCard").hidden = true; return; }
    state.step = Math.max(0, Math.min(st.steps.length - 1, state.step + (b.dataset.nav === "next" ? 1 : -1)));
    applyStep(true);
  });
}
function applyStep(animate: boolean) {
  const st = db.stories.find((s) => s.id === state.story);
  if (!st) { $("#storyCard").hidden = true; return; }
  const step = st.steps[Math.min(state.step, st.steps.length - 1)];
  const patch: any = { view: step.view || "cols", geo: "all", minShare: 0, minAmount: 0, typesOff: new Set<string>(), sectorsOff: new Set<string>(), expanded: new Set<string>(step.expand || []), selected: step.focus || null };
  if (step.sectors) {
    patch.sectorsOff = new Set(Object.keys(db.sectors).filter((k) => !step.sectors!.includes(k)));
    if (!step.pol) patch.typesOff = new Set(["political", "donor", "gov", ...(step.sectors.some((k) => k === "bank" || k === "fin") ? [] : ["institution"])]);
  }
  if (step.types) patch.typesOff = new Set(step.types);
  Object.assign(state, patch);
  if (step.focus) revealAncestors(step.focus);
  set({}, "story");
  if (step.focus && animate) setTimeout(() => focusView(step.focus!), 700);
  const card = $("#storyCard");
  card.hidden = false;
  card.innerHTML = `<div class="eyebrow">${st.title}</div><h3>${step.title}</h3><p>${step.text}</p>
    <div class="nav"><button type="button" data-nav="prev" ${state.step === 0 ? "disabled" : ""}>→ הקודם</button><span class="count">${state.step + 1} / ${st.steps.length}</span>${state.step < st.steps.length - 1 ? `<button type="button" class="primary" data-nav="next">הבא ←</button>` : `<button type="button" data-nav="close">סיום</button>`}</div>`;
  writeHash();
}

function buildLegend() {
  $("#legend").innerHTML = [
    `<span><i style="background:var(--family)"></i>אדם / משפחה</span>`,
    `<span><i style="background:var(--s-hold);outline:3px double var(--accent);outline-offset:1px"></i>קבוצה מקובצת</span>`,
    `<span><i style="background:transparent;border:2px dashed var(--world)"></i>פעילות בעולם</span>`,
    `<span><i style="border-radius:2px;background:var(--surface);border:2px solid var(--inst)"></i>גוף מוסדי</span>`,
    `<span><i style="transform:rotate(45deg);border-radius:1px;background:var(--pol-soft);border:2px solid var(--pol)"></i>מפלגה</span>`,
    `<span><i class="ln"></i>בעלות (עובי לפי שיעור)</span>`,
    `<span><i class="ln" style="border-top:2px dotted var(--inst)"></i>גוף מוסדי</span>`,
    `<span><i class="ln" style="border-top:2px dashed var(--pol)"></i>קשר פוליטי</span>`,
    `<span><i class="ln" style="border-top:2px dashed var(--franchise)"></i>זיכיון / יבוא</span>`,
  ].join("");
}

boot();
