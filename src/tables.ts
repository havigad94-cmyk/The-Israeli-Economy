// Matrix (who holds what, by sector) and the accessible list of every link. Both follow the active filters.
import { DB, DEdge, KIND_LABEL, CONF_LABEL, STRUCT_KINDS, fmtAmount, amountILS } from "./data";
import { edgePasses, nodePasses } from "./model";
import { State } from "./state";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
let sortKey = "value", sortDir = -1, filterText = "";

export function renderMatrix(db: DB, s: State, el: HTMLElement) {
  const sectors = Object.keys(db.sectors).filter((k) => !s.sectorsOff.has(k));
  const owners = db.nodes.filter((n) => (n.type === "person" || n.type === "family" || n.type === "institution") && nodePasses(db, s, n));
  const rows = owners.map((o) => {
    const cells: Record<string, { id: string; txt: string }[]> = {};
    const seen = new Set<string>();
    const walk = (id: string, direct: DEdge | null, depth: number) => {
      for (const e of db.out[id] || []) {
        if (!(STRUCT_KINDS.has(e.kind) || (e.kind === "institutional" && depth === 0)) || e.former || !edgePasses(db, s, e)) continue;
        const t = db.byId[e.to];
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        if (t.sector && sectors.includes(t.sector)) (cells[t.sector] ??= []).push({ id: t.id, txt: depth === 0 ? `${t.name}${e.share != null ? ` ${e.share}%` : ""}` : `${t.name} (עקיף)` });
        if (e.kind !== "institutional") walk(t.id, direct || e, depth + 1);
      }
    };
    walk(o.id, null, 0);
    return { o, cells, total: Object.values(cells).reduce((a, c) => a + c.length, 0) };
  }).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  el.innerHTML = `<div class="tabletools"><strong>מי מחזיק במה, לפי ענף</strong><span class="count">${rows.length} מחזיקים · אחזקות ישירות ועקיפות · לחיצה על שם פותחת את הפרטים</span></div>
  <table class="dt matrix"><caption class="vh">מטריצת אחזקות: מחזיקים בשורות, ענפים בעמודות</caption>
  <thead><tr><th scope="col" class="rowh">מחזיק</th>${sectors.map((k) => `<th scope="col">${esc(db.sectors[k])}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr><th scope="row" class="rowh"><a data-go="${r.o.id}" tabindex="0">${esc(r.o.name)}</a></th>${sectors.map((k) => `<td>${(r.cells[k] || []).map((c) => `<a class="cellchip" style="--c:var(--s-${k})" data-go="${c.id}" tabindex="0">${esc(c.txt)}</a>`).join("")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export function renderList(db: DB, s: State, el: HTMLElement) {
  const val = (e: DEdge) => (e.amount ? amountILS(e) : e.share ?? -1);
  const cols: { k: string; t: string; v: (e: DEdge) => string | number }[] = [
    { k: "from", t: "מחזיק / מקור", v: (e) => db.byId[e.from].name },
    { k: "to", t: "מוחזק / יעד", v: (e) => db.byId[e.to].name },
    { k: "kind", t: "סוג הקשר", v: (e) => KIND_LABEL[e.kind] || e.kind },
    { k: "value", t: "שיעור / סכום", v: val },
    { k: "sector", t: "ענף", v: (e) => db.sectors[db.byId[e.to].sector || ""] || "" },
    { k: "conf", t: "ודאות", v: (e) => CONF_LABEL[e.confidence] },
    { k: "asOf", t: "נכון ל", v: (e) => e.asOf || "" },
  ];
  const draw = () => {
    const q = filterText.trim();
    let list = db.edges.filter((e) => edgePasses(db, s, e));
    if (q) list = list.filter((e) => [db.byId[e.from].name, db.byId[e.to].name, e.label, e.note, KIND_LABEL[e.kind]].join(" ").includes(q));
    const c = cols.find((x) => x.k === sortKey)!;
    list.sort((a, b) => { const x = c.v(a), y = c.v(b); return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "he")) * sortDir; });
    const tbody = list.map((e) => {
      const srcs = e.sources.map((id) => db.srcById[id]).filter(Boolean).map((x) => (x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.publisher || "קישור")}</a>` : `<span title="${esc(x.title)}">חסר קישור</span>`)).join(", ");
      return `<tr><td><a data-go="${e.from}" tabindex="0">${esc(db.byId[e.from].name)}</a></td><td><a data-go="${e.to}" tabindex="0">${esc(db.byId[e.to].name)}</a></td><td>${esc(KIND_LABEL[e.kind] || e.kind)}${e.former ? " (עבר)" : ""}</td><td>${esc(e.amount ? fmtAmount(e) : e.share != null ? e.share + "%" : e.label)}</td><td>${esc(db.sectors[db.byId[e.to].sector || ""] || "")}</td><td><span class="conf ${e.confidence}">${CONF_LABEL[e.confidence]}</span></td><td>${esc(e.asOf || "")}</td><td>${srcs}</td></tr>`;
    }).join("");
    el.querySelector("tbody")!.innerHTML = tbody;
    el.querySelector(".count")!.textContent = `${list.length} קשרים`;
    el.querySelectorAll("th button").forEach((b) => { const k = (b as HTMLElement).dataset.k; b.closest("th")!.setAttribute("aria-sort", k === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none"); });
  };
  el.innerHTML = `<div class="tabletools"><strong>כל הקשרים</strong><label class="vh" for="lf">סינון הטבלה</label><input id="lf" type="search" placeholder="סינון לפי שם או סוג…" value="${esc(filterText)}"><span class="count"></span></div>
  <table class="dt"><caption class="vh">רשימת כל הקשרים במפה, עם סוג, שיעור או סכום, רמת ודאות ומקורות</caption>
  <thead><tr>${cols.map((c) => `<th scope="col"><button type="button" data-k="${c.k}" aria-sort>${c.t}</button></th>`).join("")}<th scope="col">מקורות</th></tr></thead><tbody></tbody></table>`;
  el.querySelectorAll("th button").forEach((b) => b.addEventListener("click", () => { const k = (b as HTMLElement).dataset.k!; sortDir = k === sortKey ? -sortDir : k === "value" ? -1 : 1; sortKey = k; draw(); }));
  const inp = el.querySelector("#lf") as HTMLInputElement;
  inp.addEventListener("input", () => { filterText = inp.value; draw(); });
  draw();
}
