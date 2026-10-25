// Single app state, mirrored into the page address so any view can be shared as a link.

export type View = "cols" | "free" | "radial" | "tree" | "matrix" | "list";
export const VIEWS: View[] = ["cols", "free", "radial", "tree", "matrix", "list"];
export const TYPE_GROUPS: { key: string; label: string; types: string[]; color: string }[] = [
  { key: "owners", label: "משפחות ואנשים", types: ["person", "family"], color: "var(--family)" },
  { key: "company", label: "חברות ומותגים", types: ["company", "brand"], color: "var(--accent)" },
  { key: "institution", label: "גופים מוסדיים", types: ["institution"], color: "var(--inst)" },
  { key: "political", label: "מפלגות ופוליטיקאים", types: ["party", "politician", "state"], color: "var(--pol)" },
  { key: "gov", label: "משרדים, ועדות ורגולטורים", types: ["ministry", "committee", "regulator"], color: "var(--world)" },
  { key: "donor", label: "תורמים, ערבים ושדלנים", types: ["donor", "lobbyist"], color: "var(--warn)" },
];
export const AMOUNT_STEPS = [0, 100_000, 1_000_000, 5_000_000, 20_000_000];
export const AMOUNT_LABELS = ["הכול", "מ-100 אלף ₪", "ממיליון ₪", "מ-5 מיליון ₪", "מ-20 מיליון ₪"];

export interface State {
  view: View; geo: "all" | "il" | "world"; minShare: number; minAmount: number;
  typesOff: Set<string>; sectorsOff: Set<string>; expanded: Set<string>;
  selected: string | null; story: string | null; step: number; repel: number; elen: number;
}

export const state: State = {
  view: "cols", geo: "all", minShare: 0, minAmount: 0, typesOff: new Set(), sectorsOff: new Set(), expanded: new Set(),
  selected: null, story: null, step: 0, repel: 6000, elen: 70,
};

type L = (why: string) => void;
const listeners: L[] = [];
export const onChange = (f: L) => listeners.push(f);
export function set(patch: Partial<State>, why = "update") {
  Object.assign(state, patch);
  writeHash();
  listeners.forEach((f) => f(why));
}

const list = (s: Set<string>) => [...s].sort().join(",");
export function writeHash() {
  const p = new URLSearchParams();
  if (state.view !== "cols") p.set("v", state.view);
  if (state.selected) p.set("n", state.selected);
  if (state.geo !== "all") p.set("g", state.geo);
  if (state.minShare) p.set("ms", String(state.minShare));
  if (state.minAmount) p.set("ma", String(state.minAmount));
  if (state.typesOff.size) p.set("to", list(state.typesOff));
  if (state.sectorsOff.size) p.set("so", list(state.sectorsOff));
  if (state.expanded.size) p.set("x", list(state.expanded));
  if (state.story) p.set("s", `${state.story}.${state.step}`);
  const h = p.toString();
  try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch { /* sandboxed frame */ }
}

export function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const v = p.get("v") as View;
  if (v && VIEWS.includes(v)) state.view = v;
  state.selected = p.get("n");
  const g = p.get("g"); if (g === "il" || g === "world") state.geo = g;
  state.minShare = Number(p.get("ms")) || 0;
  state.minAmount = Math.min(4, Number(p.get("ma")) || 0);
  const s = (k: string) => new Set((p.get(k) || "").split(",").filter(Boolean));
  state.typesOff = s("to"); state.sectorsOff = s("so"); state.expanded = s("x");
  const st = p.get("s"); if (st) { const [a, b] = st.split("."); state.story = a; state.step = Number(b) || 0; }
}
