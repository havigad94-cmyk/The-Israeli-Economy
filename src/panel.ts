// Side panel: who the entity is, the full chain of control, holdings, owners, political ties,
// and every source behind what is shown, with its confidence level and link.
import { DB, DEdge, DNode, KIND_LABEL, TYPE_LABEL, CONF_LABEL, STRUCT_KINDS, POL_KINDS, chains, fmtAmount } from "./data";
import { state } from "./state";
import { financeTab } from "./finance";
import { factsBlock } from "./facts";
import { partnersOf, findPair, Pair, pairId } from "./partners";

let panelTab: "links" | "money" = "links";
export const setPanelTab = (t: "links" | "money") => (panelTab = t);

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
let db: DB;
let el: HTMLElement;
let refs: string[] = [];

export function initPanel(data: DB, node: HTMLElement) { db = data; el = node; }

const ref = (ids: string[]) => ids.map((id) => { let i = refs.indexOf(id); if (i < 0) { refs.push(id); i = refs.length - 1; } return `<a href="#src-${i + 1}" class="refn" data-ref="${i + 1}">[${i + 1}]</a>`; }).join("");
const conf = (c: string) => `<span class="conf ${c}">${CONF_LABEL[c] || c}</span>`;
const secBadge = (n: DNode) => (n.sector && db.sectors[n.sector] ? `<span class="badge sec" style="background:var(--s-${n.sector})">${esc(db.sectors[n.sector])}</span>` : "");
const value = (e: DEdge) => (e.amount ? fmtAmount(e) : e.share != null ? `${e.share}%` : e.label);
const dateTxt = (d?: string | null) => (d ? new Date(d).toLocaleDateString("he-IL", { year: "numeric", month: "short" }) : "");

function row(e: DEdge, other: DNode) {
  const meta = [KIND_LABEL[e.kind] || e.kind, e.former ? "קשר עבר" : "", e.asOf ? "נכון ל-" + dateTxt(e.asOf) : ""].filter(Boolean).map(esc).join(" · ");
  return `<div class="r" data-go="${other.id}" role="button" tabindex="0"><span class="n">${esc(other.name)} ${other.sector && other.type !== "institution" ? secBadge(other) : ""}</span><span class="v">${esc(value(e))}</span><span class="m">${meta} ${conf(e.confidence)} ${ref(e.sources)}${e.note ? `<span>${esc(e.note)}</span>` : ""}</span></div>`;
}

function sourcesBlock() {
  if (!refs.length) return "";
  const items = refs.map((id, i) => {
    const s = db.srcById[id];
    if (!s) return "";
    const meta = [s.publisher, s.published ? dateTxt(s.published) : ""].filter(Boolean).map(esc).join(", ");
    const t = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title);
    return `<li id="src-${i + 1}">${t}${meta ? ` <span class="empty">(${meta})</span>` : ""} ${s.needsLink ? `<span class="nolink">חסר קישור ישיר</span>` : ""}</li>`;
  });
  return `<h3>מקורות</h3><ol class="srclist">${items.join("")}</ol>`;
}

function actions(n: DNode) {
  const g = db.desc[n.id] || 0;
  const open = state.expanded.has(n.id);
  return `<div class="actions">
    <button type="button" data-act="radial">מעגלי השפעה</button>
    <button type="button" data-act="tree">עץ שליטה</button>
    ${g ? `<button type="button" data-act="toggle" class="${open ? "" : "primary"}">${open ? "קיבוץ הקבוצה" : `פתיחת הקבוצה (${g})`}</button>` : ""}
    <button type="button" data-act="copy">העתקת קישור</button>
    <button type="button" data-act="report">דיווח על טעות או מידע חסר</button>
  </div>`;
}

function chainBlock(n: DNode) {
  const cs = chains(db, n.id);
  if (!cs.length) return "";
  return `<h3>שרשרת השליטה</h3>${cs.map((c) => `<div class="chain">${c.path.map((id) => `<a href="#" data-go="${id}">${esc(db.byId[id].name)}</a>`).join('<span class="arr">←</span>')}${c.eff != null && c.path.length > 2 ? `<span class="eff">החזקה עקיפה: ${c.eff.toFixed(1)}%</span>` : ""}</div>`).join("")}`;
}

const names = (ids: string[], max = 4) => ids.slice(0, max).map((c) => `<a href="#" data-go="${c}">${esc(db.byId[c].name)}</a>`).join("، ") + (ids.length > max ? ` ועוד ${ids.length - max}` : "");
function partnersBlock(id: string) {
  const ps = partnersOf(db, state, id).slice(0, 12);
  if (!ps.length) return "";
  return `<h3>שותפים עסקיים (${partnersOf(db, state, id).length})</h3><div class="rows">${ps.map((p) => {
    const o = p.a === id ? p.b : p.a;
    const secs = Object.keys(p.sectors).map((k) => esc(db.sectors[k])).join(", ");
    return `<div class="r" data-go="e:${pairId(p.a, p.b)}" role="button" tabindex="0"><span class="n">${esc(db.byId[o].name)}</span><span class="v">${p.shared.length ? `${p.shared.length} חברות משותפות` : "באותם ענפים"}</span><span class="m">${p.shared.length ? `ביחד: ${p.shared.slice(0, 3).map((c) => esc(db.byId[c].name)).join(", ")}${p.shared.length > 3 ? "…" : ""}` : ""}${secs ? `<span>בנפרד באותו ענף: ${secs}</span>` : ""}</span></div>`;
  }).join("")}</div>`;
}

export function renderPair(id: string) {
  refs = [];
  const p: Pair | null = findPair(db, state, id);
  if (!p) return renderIntro();
  const A = db.byId[p.a], B = db.byId[p.b];
  const own = (who: string, c: string) => { const e = (db.inn[c] || []).find((x) => x.from === who); return e ? `${esc(e.share != null ? e.share + "%" : e.label)} ${conf(e.confidence)} ${ref(e.sources)}` : `<span class="empty">דרך חברה בשרשרת</span>`; };
  const sec = Object.entries(p.sectors);
  el.innerHTML = `<div class="eyebrow">שותפות עסקית · מחושבת מקשרי הבעלות</div>
    <h2><a href="#" data-go="${A.id}" style="color:inherit">${esc(A.name)}</a> ו<a href="#" data-go="${B.id}" style="color:inherit">${esc(B.name)}</a></h2>
    <div class="stats"><div class="stat"><b>${p.shared.length}</b><span>חברות שמחזיקים ביחד</span></div><div class="stat"><b>${sec.length}</b><span>ענפים שבהם מחזיקים בנפרד</span></div><div class="stat"><b>${p.score}</b><span>ציון קרבה</span></div></div>
    ${p.shared.length ? `<h3>מחזיקים ביחד</h3><div class="tablewrap"><table class="dt fin"><thead><tr><th scope="col">חברה</th><th scope="col">${esc(A.name)}</th><th scope="col">${esc(B.name)}</th></tr></thead><tbody>${p.shared.map((c) => `<tr><td><a data-go="${c}" tabindex="0">${esc(db.byId[c].name)}</a></td><td>${own(A.id, c)}</td><td>${own(B.id, c)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${sec.length ? `<h3>מחזיקים בנפרד באותו ענף</h3><div class="rows">${sec.map(([k, [a, b]]) => `<div class="r"><span class="n"><span class="badge sec" style="background:var(--s-${k})">${esc(db.sectors[k])}</span></span><span class="v"></span><span class="m"><span>${esc(A.name)}: ${names(a)}</span><span>${esc(B.name)}: ${names(b)}</span></span></div>`).join("")}</div>` : ""}
    <p class="note">השותפות מחושבת אוטומטית מקשרי הבעלות שבמפה, ולכל קשר יש מקור. החזקה משותפת אינה בהכרח הסכם בין הצדדים: גופים מוסדיים, למשל, מחזיקים בחברות בנפרד בשביל החוסכים.</p>
    ${sourcesBlock()}`;
}

export function renderNode(id: string) {
  refs = [];
  const n = db.byId[id];
  if (!n) return renderIntro();
  const out = db.out[id] || [], inn = db.inn[id] || [];
  const holds = out.filter((e) => STRUCT_KINDS.has(e.kind));
  const instHolds = out.filter((e) => e.kind === "institutional");
  const owners = inn.filter((e) => STRUCT_KINDS.has(e.kind) || e.kind === "institutional");
  const pol = [...out, ...inn].filter((e) => POL_KINDS.has(e.kind));
  const g = db.desc[id] || 0;
  const members = g && !state.expanded.has(id) ? (db.children[id] || []) : [];
  const head = `<div class="eyebrow">${esc(TYPE_LABEL[n.type] || n.type)}${n.role ? " · " + esc(n.role) : ""}</div>
    <h2>${esc(n.name)}</h2>
    <div class="badges">${secBadge(n)}${n.abroad ? `<span class="badge world">פעילות ב${esc(n.geo)}</span>` : n.geo && n.type === "company" ? `<span class="badge">${esc(n.geo)}</span>` : ""}${g ? `<span class="badge">קבוצה: ${g} גופים</span>` : ""}${n.wealth ? `<span class="badge">${esc(n.wealth)}</span>` : ""}</div>
    ${n.summary ? `<p>${esc(n.summary)}</p>` : ""}${n.sources?.length ? `<p class="empty">מקור לתיאור: ${ref(n.sources)}</p>` : ""}`;
  const stats = `<div class="stats"><div class="stat"><b>${g}</b><span>גופים בקבוצה</span></div><div class="stat"><b>${owners.length}</b><span>בעלים ומחזיקים</span></div><div class="stat"><b>${pol.length}</b><span>קשרים פוליטיים</span></div></div>`;
  const other = (e: DEdge) => db.byId[e.from === id ? e.to : e.from];
  const hasMoney = !!db.fins[id] || !!n.wealth || ["person", "family", "company", "party"].includes(n.type);
  const tabs = hasMoney ? `<div class="ptabs" role="tablist" aria-label="תצוגת הפאנל"><button type="button" role="tab" data-ptab="links" aria-selected="${panelTab === "links"}">קשרים ובעלות</button><button type="button" role="tab" data-ptab="money" aria-selected="${panelTab === "money"}">כספים${db.fins[id] ? " ●" : ""}</button></div>` : "";
  if (hasMoney && panelTab === "money") { el.innerHTML = `${head}${tabs}<div role="tabpanel">${financeTab(db, db.fins, n, ref)}</div>${sourcesBlock()}`; return; }
  el.innerHTML = `${head}${tabs}${actions(n)}${chainBlock(n)}${stats}
    ${members.length ? `<h3>בתוך הקבוצה</h3><div class="rows">${members.map((c) => { const e = (db.inn[c] || []).find((x) => x.from === id)!; return row(e, db.byId[c]); }).join("")}</div>` : ""}
    ${owners.length ? `<h3>מי מחזיק בו</h3><div class="rows">${owners.sort((a, b) => (b.share ?? 0) - (a.share ?? 0)).map((e) => row(e, db.byId[e.from])).join("")}</div>` : ""}
    ${holds.length && !members.length ? `<h3>אחזקות וחברות בנות</h3><div class="rows">${holds.sort((a, b) => (b.share ?? 0) - (a.share ?? 0)).map((e) => row(e, db.byId[e.to])).join("")}</div>` : ""}
    ${instHolds.length ? `<h3>אחזקות דרך קופות גמל וקרנות</h3><div class="rows">${instHolds.map((e) => row(e, db.byId[e.to])).join("")}</div>` : ""}
    ${partnersBlock(id)}
    ${pol.length ? `<h3>קשרים פוליטיים מתועדים</h3><div class="rows">${pol.map((e) => row(e, other(e))).join("")}</div>` : ""}
    ${n.political_note ? `<p class="note">${esc(n.political_note)}</p>` : ""}
    ${sourcesBlock()}`;
}

export function renderEdge(vid: string, edges: DEdge[]) {
  refs = [];
  if (!edges.length) return renderIntro();
  const a = db.byId[edges[0].from], b = db.byId[edges[0].to];
  el.innerHTML = `<div class="eyebrow">${edges.length > 1 ? `${edges.length} קשרים מאוחדים` : esc(KIND_LABEL[edges[0].kind] || "קשר")}</div>
    <h2><a href="#" data-go="${a.id}" style="color:inherit">${esc(a.name)}</a> ← <a href="#" data-go="${b.id}" style="color:inherit">${esc(b.name)}</a></h2>
    <div class="rows">${edges.map((e) => `<div class="r" data-go="${e.to}" role="button" tabindex="0"><span class="n">${esc(db.byId[e.from].name)} ← ${esc(db.byId[e.to].name)}</span><span class="v">${esc(value(e))}</span><span class="m">${esc(KIND_LABEL[e.kind] || e.kind)} ${conf(e.confidence)} ${e.asOf ? "· נכון ל-" + esc(dateTxt(e.asOf)) : ""} ${ref(e.sources)}${e.note ? `<span>${esc(e.note)}</span>` : ""}</span></div>`).join("")}</div>
    ${sourcesBlock()}`;
  void vid;
}

export function renderIntro() {
  refs = [];
  const t = (k: string[]) => db.nodes.filter((n) => k.includes(n.type)).length;
  const direct = db.edges.filter((e) => e.sources.some((s) => !db.srcById[s]?.needsLink)).length;
  const groups = Object.keys(db.children).filter((id) => ["person", "family"].includes(db.byId[id].type)).sort((a, b) => db.desc[b] - db.desc[a]).slice(0, 8);
  el.innerHTML = `<div class="eyebrow">מבט על</div><h2>${t(["person", "family"])} בעלי הון, ${t(["company", "brand"])} חברות ומותגים</h2>
    <p>המפה נפתחת במצב מקובץ: כל קבוצה מוצגת כצומת אחד עם מספר הגופים שבתוכה. לחיצה כפולה על קבוצה פותחת אותה, ולחיצה רגילה מציגה כאן את כל הפרטים והמקורות.</p>
    <div class="stats"><div class="stat"><b>${db.edges.length}</b><span>קשרים</span></div><div class="stat"><b>${db.sources.length}</b><span>מקורות</span></div><div class="stat"><b>${Math.round((direct / db.edges.length) * 100)}%</b><span>קשרים עם קישור ישיר</span></div></div>
    <h3>הקבוצות הגדולות</h3><div class="rows">${groups.map((id) => `<div class="r" data-go="${id}" role="button" tabindex="0"><span class="n">${esc(db.byId[id].name)}</span><span class="v">${db.desc[id]} גופים</span></div>`).join("")}</div>
    ${factsBlock(db)}
    <h3>איך משתמשים</h3>
    <ul class="srclist"><li>בחרו סיפור מוכן בשורת הסיפורים, או חפשו אדם, חברה או מפלגה.</li><li>החליפו תצוגה: לפי תחומים, מרחב חופשי, מעגלי השפעה סביב גוף אחד, עץ שליטה, מטריצה או רשימה נגישה.</li><li>הסרגלים מסננים אחזקות קטנות וסכומי מימון נמוכים.</li></ul>`;
}

export function bindPanel(go: (id: string) => void, act: (a: string) => void) {
  el.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement;
    const r = t.closest("[data-go]") as HTMLElement | null;
    const b = t.closest("[data-act]") as HTMLElement | null;
    const pt = t.closest("[data-ptab]") as HTMLElement | null;
    if (pt) { ev.preventDefault(); act("ptab:" + pt.dataset.ptab); return; }
    const rf = t.closest(".refn") as HTMLElement | null;
    if (rf) { ev.preventDefault(); el.querySelector("#src-" + rf.dataset.ref)?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (b) { ev.preventDefault(); act(b.dataset.act!); return; }
    if (r && !(t.closest("a[href^='http']"))) { ev.preventDefault(); go(r.dataset.go!); }
  });
  el.addEventListener("keydown", (ev) => { const r = (ev.target as HTMLElement).closest("[data-go]") as HTMLElement | null; if (r && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); go(r.dataset.go!); } });
}
