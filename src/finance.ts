// Money: financial figures of listed companies (2025 annual, latest quarter, market value), party funding for the
// 2026 election, and the stock-market value of what each owner holds. Used by the panel's "כספים" tab and the finance view.
import { DB, DNode, STRUCT_KINDS } from "./data";
import { nodePasses } from "./model";
import { State } from "./state";

export interface Fin {
  kind: "listed" | "party"; unit: string; security?: string; marketCap?: number; marketCapAsOf?: string;
  fy2025?: { revenue: number | null; revenueLabel: string | null; netProfit: number | null; equity: number | null; assets: number | null };
  q2?: Record<string, { revenue: number | null; netProfit: number | null }>;
  advance?: number; advanceEligible?: number; advanceEstApr?: number; guarantees?: number; guaranteesUsed?: number; donations?: number; loans?: number; debtApr2026?: number;
  ttm?: { period: string | null; pe: number | null; pb: number | null; ps: number | null; roe: number | null; roa: number | null; margin: number | null; equityRatio: number | null; netProfit: number | null; equity: number | null; revenue: number | null };
  note?: string; sources: string[];
}
export type Fins = Record<string, Fin>;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
// values from Bizportal are in thousands of ₪
export const fmtK = (k: number | null | undefined) => {
  if (k == null) return "—";
  const v = k * 1000, a = Math.abs(v), s = v < 0 ? "−" : "";
  return a >= 1e9 ? `${s}${(a / 1e9).toLocaleString("he-IL", { maximumFractionDigits: 1 })} מיליארד ₪` : a >= 1e6 ? `${s}${(a / 1e6).toLocaleString("he-IL", { maximumFractionDigits: a < 1e8 ? 1 : 0 })} מיליון ₪` : `${s}${Math.round(a).toLocaleString("he-IL")} ₪`;
};
export const fmtILS = (v: number | null | undefined) => (v == null ? "—" : fmtK(v / 1000));
const pct = (a: number | null | undefined, b: number | null | undefined) => (a != null && b ? `${((a / b) * 100).toFixed(1)}%` : "—");
const change = (a: number | null | undefined, b: number | null | undefined) => {
  if (a == null || b == null || b === 0) return "";
  const c = ((a - b) / Math.abs(b)) * 100;
  return `<span class="chg ${c >= 0 ? "up" : "down"}">${c >= 0 ? "▲" : "▼"} ${Math.abs(c).toFixed(0)}%</span>`;
};

// labels that mean the whole company is owned
const FULL = /^(בעלות|בעלות מלאה|בעלות יחיד|בעלות משפחתית|חברה בת)$/;
// Listed companies reachable from an owner through ownership links, with the effective stake where every step is a number.
export function listedHoldings(db: DB, fins: Fins, id: string) {
  const best = new Map<string, { eff: number | null; via: string[] }>();
  const walk = (cur: string, eff: number | null, path: string[]) => {
    for (const e of db.out[cur] || []) {
      if (!STRUCT_KINDS.has(e.kind) || e.former || path.includes(e.to)) continue;
      const sh = e.share ?? (FULL.test(e.label) ? 100 : null);
      const next = eff != null && sh != null ? (eff * sh) / 100 : null;
      if (fins[e.to]?.kind === "listed") {
        const prev = best.get(e.to);
        if (!prev || (next ?? -1) > (prev.eff ?? -1)) best.set(e.to, { eff: next, via: path.slice(1) });
      }
      if (path.length < 6) walk(e.to, next, [...path, e.to]);
    }
  };
  walk(id, 100, [id]);
  return [...best.entries()].map(([cid, b]) => ({ id: cid, eff: b.eff, via: b.via, value: b.eff != null ? ((fins[cid].marketCap || 0) * b.eff) / 100 : null })).sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
}

export function financeTab(db: DB, fins: Fins, n: DNode, ref: (ids: string[]) => string) {
  const f = fins[n.id];
  if (f?.kind === "listed") {
    const y = f.fy2025, q26 = f.q2?.["2026"], q25 = f.q2?.["2025"], t = f.ttm;
    const revLbl = y?.revenueLabel || "הכנסות";
    const np = y?.netProfit ?? t?.netProfit ?? null, eq = y?.equity ?? t?.equity ?? null;
    const pctTxt = (v: number | null | undefined) => (v == null ? "—" : `${v.toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`);
    const x = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("he-IL", { maximumFractionDigits: 2 }));
    return `<div class="stats"><div class="stat"><b>${fmtK(f.marketCap)}</b><span>שווי שוק</span></div><div class="stat"><b class="${(np ?? 0) < 0 ? "neg" : ""}">${fmtK(np)}</b><span>${y ? "רווח נקי 2025" : "רווח נקי, 12 חודשים"}</span></div><div class="stat"><b>${fmtK(eq)}</b><span>הון עצמי</span></div></div>
      ${y ? `<h3>דוח שנתי 2025</h3>
      <table class="dt fin"><tbody>
        ${y.revenue != null ? `<tr><th scope="row">${esc(revLbl)}</th><td>${fmtK(y.revenue)}</td></tr>` : ""}
        <tr><th scope="row">רווח נקי</th><td>${fmtK(y.netProfit)}</td></tr>
        ${y.revenue != null && !y.revenueLabel?.includes("מימון") ? `<tr><th scope="row">שיעור רווח נקי</th><td>${pct(y.netProfit, y.revenue)}</td></tr>` : ""}
        <tr><th scope="row">הון עצמי</th><td>${fmtK(y.equity)}</td></tr>
        <tr><th scope="row">סך מאזן</th><td>${fmtK(y.assets)}</td></tr>
        <tr><th scope="row">תשואה על ההון</th><td>${pct(y.netProfit, y.equity)}</td></tr>
        <tr><th scope="row">שווי שוק / הון עצמי</th><td>${f.marketCap && y.equity ? (f.marketCap / y.equity).toFixed(2) : "—"}</td></tr>
      </tbody></table>` : ""}
      ${q26 ? `<h3>רבעון 2 של 2026 מול רבעון 2 של 2025</h3>
      <table class="dt fin"><thead><tr><th></th><th scope="col">Q2/2026</th><th scope="col">Q2/2025</th></tr></thead><tbody>
        ${q26.revenue != null ? `<tr><th scope="row">${esc(revLbl)}</th><td>${fmtK(q26.revenue)} ${change(q26.revenue, q25?.revenue)}</td><td>${fmtK(q25?.revenue)}</td></tr>` : ""}
        <tr><th scope="row">רווח נקי</th><td>${fmtK(q26.netProfit)} ${change(q26.netProfit, q25?.netProfit)}</td><td>${fmtK(q25?.netProfit)}</td></tr>
      </tbody></table>` : ""}
      ${t ? `<h3>12 החודשים שעד ${esc(t.period || "")}</h3>
      <table class="dt fin"><tbody>
        ${!y ? `<tr><th scope="row">הכנסות (מחושב)</th><td>${fmtK(t.revenue)}</td></tr><tr><th scope="row">רווח נקי (מחושב)</th><td class="${(t.netProfit ?? 0) < 0 ? "neg" : ""}">${fmtK(t.netProfit)}</td></tr><tr><th scope="row">הון עצמי (מחושב)</th><td>${fmtK(t.equity)}</td></tr>` : ""}
        <tr><th scope="row">תשואה על ההון</th><td class="${(t.roe ?? 0) < 0 ? "neg" : ""}">${pctTxt(t.roe)}</td></tr>
        <tr><th scope="row">תשואה על הנכסים</th><td>${pctTxt(t.roa)}</td></tr>
        ${t.margin != null ? `<tr><th scope="row">שיעור רווח נקי</th><td>${pctTxt(t.margin)}</td></tr>` : ""}
        <tr><th scope="row">הון עצמי למאזן</th><td>${pctTxt(t.equityRatio)}</td></tr>
        <tr><th scope="row">מכפיל רווח</th><td>${t.pe != null && t.pe < 0 ? "הפסד" : x(t.pe)}</td></tr>
        <tr><th scope="row">מכפיל הון</th><td>${x(t.pb)}</td></tr>
      </tbody></table>` : ""}
      <p class="empty">מספר נייר בבורסה: ${esc(f.security)} · שווי שוק נכון ל-${esc(f.marketCapAsOf)} · מקור: ${ref(f.sources)}</p>
      ${!y && t ? `<p class="note">הסכומים המסומנים "מחושב" נגזרו משווי השוק ומהמכפילים שמפרסם ביזפורטל לפי הדוחות הכספיים (רווח = שווי שוק ÷ מכפיל רווח; הון = שווי שוק ÷ מכפיל הון), ולכן הם קירוב.</p>` : ""}
      ${f.note ? `<p class="note">${esc(f.note)}</p>` : ""}`;
  }
  if (f?.kind === "party") {
    const rows: [string, number | undefined][] = [["מקדמת מימון בחירות", f.advance], ["זכאות למקדמה (מפלגה חדשה)", f.advanceEligible], ["הערכת מקדמה (אפריל 2026, לפני העלאת יחידת המימון)", f.advanceEstApr], ["ערבויות שגויסו", f.guarantees], ["מתוכן נוצלו", f.guaranteesUsed], ["תרומות", f.donations], ["הלוואות", f.loans], ["חוב לכנסת (אפריל 2026)", f.debtApr2026]];
    return `<h3>כספי הבחירות 2026</h3><table class="dt fin"><tbody>${rows.filter(([, v]) => v != null).map(([k, v]) => `<tr><th scope="row">${k}</th><td>${fmtILS(v)}</td></tr>`).join("")}</tbody></table>
      <p class="empty">מקור: ${ref(f.sources)}</p>${f.note ? `<p class="note">${esc(f.note)}</p>` : ""}
      <p class="note">לפי חוק מימון מפלגות, מקדמה ניתנת לפי מספר המנדטים בכנסת היוצאת, ומפלגה חדשה מקבלת אותה רק כנגד ערבות בנקאית. אחרי הבחירות המימון מחושב מחדש לפי התוצאות.</p>`;
  }
  const hold = listedHoldings(db, fins, n.id);
  const wealth = n.wealth ? `<div class="stats"><div class="stat" style="grid-column:1/-1"><b>${esc(n.wealth.replace(/^הון מוערך:\s*/, ""))}</b><span>הון מוערך${n.wealth.includes("הון מוערך") ? " (דירוג עשירי ישראל, ice, יולי 2026)" : ""}</span></div></div>` : "";
  if (hold.length) {
    const total = hold.reduce((s, h) => s + (h.value || 0), 0);
    return `${wealth}<h3>אחזקות בחברות ציבוריות</h3>
      <table class="dt fin"><thead><tr><th scope="col">חברה</th><th scope="col">שיעור</th><th scope="col">שווי החלק</th></tr></thead><tbody>
      ${hold.map((h) => `<tr><td><a data-go="${h.id}" tabindex="0">${esc(db.byId[h.id].name)}</a>${h.via.length ? `<div class="empty">דרך ${h.via.map((v) => esc(db.byId[v].name)).join(" ← ")}</div>` : ""}</td><td>${h.eff != null ? h.eff.toFixed(1) + "%" : "שליטה"}</td><td>${h.value != null ? fmtK(h.value) : "—"}</td></tr>`).join("")}
      </tbody></table>
      ${total ? `<p><b>סך שווי האחזקות המחושב: ${fmtK(total)}</b></p>` : ""}
      <p class="note">החישוב: שווי השוק של החברה כפול שיעור ההחזקה האפקטיבי בשרשרת. קשר שמסומן "בעלות" בלי אחוז נחשב 100%. כשאחד השלבים מסומן "שליטה" בלי אחוז, השווי לא מחושב. החישוב לא כולל חובות של חברות האחזקה ואחזקות פרטיות.</p>`;
  }
  if (wealth) return wealth + `<p class="empty">אין למפה נתוני שוק על האחזקות של ${esc(n.name)}.</p>`;
  if (n.type === "company" || n.type === "brand") return `<p class="empty">${n.abroad ? "חברה זרה או פרטית" : "חברה פרטית או שאינה נסחרת בבורסה בתל אביב"}: אין במפה דוחות כספיים פומביים עליה.</p>`;
  return `<p class="empty">אין נתונים כספיים לגוף הזה.</p>`;
}

let tab: "listed" | "parties" | "owners" = "listed", sortKey = "marketCap", sortDir = -1;
export function renderFinanceView(db: DB, fins: Fins, s: State, el: HTMLElement) {
  const draw = () => {
    let head = "", body = "", note = "";
    if (tab === "listed") {
      const rows = Object.entries(fins).filter(([id, f]) => f.kind === "listed" && db.byId[id] && nodePasses(db, s, db.byId[id])).map(([id, f]) => ({ id, n: db.byId[id], f, est: !f.fy2025, marketCap: f.marketCap || 0, revenue: f.fy2025?.revenue ?? f.ttm?.revenue ?? null, netProfit: f.fy2025?.netProfit ?? f.ttm?.netProfit ?? null, equity: f.fy2025?.equity ?? f.ttm?.equity ?? null, roe: f.fy2025?.netProfit != null && f.fy2025?.equity ? (f.fy2025.netProfit / f.fy2025.equity) * 100 : f.ttm?.roe ?? null }));
      const key = sortKey as keyof (typeof rows)[0];
      rows.sort((a, b) => (((a[key] as number) ?? -1e15) - ((b[key] as number) ?? -1e15)) * sortDir);
      const max = Math.max(...rows.map((r) => r.marketCap), 1);
      const th = (k: string, t: string) => `<th scope="col"><button type="button" data-k="${k}" aria-sort="${sortKey === k ? (sortDir > 0 ? "ascending" : "descending") : "none"}">${t}</button></th>`;
      head = `<tr><th scope="col">חברה</th><th scope="col">ענף</th>${th("marketCap", "שווי שוק")}${th("revenue", "הכנסות")}${th("netProfit", "רווח נקי")}${th("equity", "הון עצמי")}${th("roe", "תשואה על ההון")}</tr>`;
      body = rows.map((r) => `<tr><td><a data-go="${r.id}" tabindex="0">${esc(r.n.name)}</a>${r.est ? ` <span class="empty" title="12 חודשים, מחושב ממכפילים">†</span>` : ""}</td><td>${esc(db.sectors[r.n.sector || ""] || "")}</td><td><div class="barcell"><span class="bar" style="width:${(r.marketCap / max) * 100}%;--c:var(--s-${r.n.sector})"></span><span>${fmtK(r.marketCap)}</span></div></td><td>${r.f.fy2025?.revenueLabel?.includes("מימון") ? `<span title="רווח מפעולות מימון">${fmtK(r.revenue)}*</span>` : fmtK(r.revenue)}</td><td class="${(r.netProfit ?? 0) < 0 ? "neg" : ""}">${fmtK(r.netProfit)}</td><td>${fmtK(r.equity)}</td><td>${r.roe != null ? r.roe.toFixed(1) + "%" : "—"}</td></tr>`).join("");
      note = `${rows.length} חברות ציבוריות במפה. נתוני 2025 מהדוחות השנתיים ושווי שוק נכון ל-23.10.2026, לפי ביזפורטל. † 12 החודשים עד Q2/2026, מחושב משווי השוק ומהמכפילים. * בבנקים: רווח מפעולות מימון.`;
    } else if (tab === "parties") {
      const rows = Object.entries(fins).filter(([, f]) => f.kind === "party").map(([id, f]) => ({ id, n: db.byId[id], f, total: (f.advance || f.advanceEligible || 0) + (f.guarantees || 0) + (f.donations || 0) + (f.loans || 0) })).sort((a, b) => b.total - a.total);
      head = `<tr><th scope="col">מפלגה</th><th scope="col">מקדמה</th><th scope="col">ערבויות</th><th scope="col">תרומות והלוואות</th><th scope="col">חוב לכנסת (אפריל)</th></tr>`;
      body = rows.map((r) => `<tr><td><a data-go="${r.id}" tabindex="0">${esc(r.n.name)}</a>${r.f.note ? `<div class="empty">${esc(r.f.note)}</div>` : ""}</td><td>${r.f.advance ? fmtILS(r.f.advance) : r.f.advanceEligible ? `עד ${fmtILS(r.f.advanceEligible)}` : r.f.advanceEstApr ? `<span title="הערכה מאפריל 2026, לפני העלאת יחידת המימון">~${fmtILS(r.f.advanceEstApr)}</span>` : "—"}</td><td>${fmtILS(r.f.guarantees)}</td><td>${r.f.donations || r.f.loans ? fmtILS((r.f.donations || 0) + (r.f.loans || 0)) : "—"}</td><td>${fmtILS(r.f.debtApr2026)}</td></tr>`).join("");
      note = "הבחירות לכנסת ה-26 ב-27.10.2026. מקדמות לפי כלכליסט ו-ice (29.8.2026); חובות לפי כלכליסט (26.4.2026). ~ = הערכה מאפריל, לפני שחוק מיולי 2026 העלה את יחידת המימון.";
    } else {
      const owners = db.nodes.filter((n) => (n.type === "person" || n.type === "family") && nodePasses(db, s, n));
      const rows = owners.map((n) => { const h = listedHoldings(db, fins, n.id); return { n, h, total: h.reduce((a, x) => a + (x.value || 0), 0) }; }).filter((r) => r.h.length || r.n.wealth).sort((a, b) => b.total - a.total);
      head = `<tr><th scope="col">בעל הון</th><th scope="col">הון מוערך</th><th scope="col">חברות ציבוריות בשרשרת</th><th scope="col">שווי האחזקות המחושב</th></tr>`;
      body = rows.map((r) => `<tr><td><a data-go="${r.n.id}" tabindex="0">${esc(r.n.name)}</a></td><td>${esc((r.n.wealth || "—").replace(/^הון מוערך:\s*/, ""))}</td><td>${r.h.map((x) => esc(db.byId[x.id].name)).join(", ") || "—"}</td><td>${r.total ? fmtK(r.total) : "—"}</td></tr>`).join("");
      note = "שווי האחזקות המחושב = שווי שוק × שיעור ההחזקה האפקטיבי, רק כשכל שלבי השרשרת מספריים. ההון המוערך מדירוג עשירי ישראל (ice, יולי 2026) כולל גם נכסים פרטיים.";
    }
    el.innerHTML = `<div class="tabletools"><strong>כספים ודוחות</strong>
      <div class="seg small" role="group" aria-label="סוג נתונים"><button type="button" data-ft="listed" aria-pressed="${tab === "listed"}">חברות ציבוריות</button><button type="button" data-ft="parties" aria-pressed="${tab === "parties"}">מימון מפלגות 2026</button><button type="button" data-ft="owners" aria-pressed="${tab === "owners"}">בעלי הון</button></div></div>
      <div class="tablewrap"><table class="dt"><thead>${head}</thead><tbody>${body}</tbody></table></div><p class="empty" style="margin-top:8px">${note}</p>`;
    el.querySelectorAll("[data-ft]").forEach((b) => b.addEventListener("click", () => { tab = (b as HTMLElement).dataset.ft as any; draw(); }));
    el.querySelectorAll("th button[data-k]").forEach((b) => b.addEventListener("click", () => { const k = (b as HTMLElement).dataset.k!; sortDir = k === sortKey ? -sortDir : -1; sortKey = k; draw(); }));
  };
  draw();
}
