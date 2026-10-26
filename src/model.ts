// Turns the full data plus the current filters and open groups into what is drawn:
// visible entities (a closed group stands in for everything under it) and merged links.
import { DB, DEdge, DNode, STRUCT_KINDS, POL_KINDS, amountILS, ancestors } from "./data";
import { State, TYPE_GROUPS, AMOUNT_STEPS } from "./state";

export interface VNode { id: string; n: DNode; hidden: number; group: boolean; open: boolean }
export interface VEdge { id: string; from: string; to: string; cat: "struct" | "inst" | "pol"; kind: string; share: number | null; label: string; edges: DEdge[]; former: boolean; amount: number }
export interface Model { nodes: VNode[]; edges: VEdge[]; nodeIds: Set<string>; rep: (id: string) => string | null }

const groupOf: Record<string, string> = {};
TYPE_GROUPS.forEach((g) => g.types.forEach((t) => (groupOf[t] = g.key)));
export const typeGroup = (n: DNode) => groupOf[n.type];
export const catOf = (e: DEdge): VEdge["cat"] => (e.kind === "institutional" ? "inst" : POL_KINDS.has(e.kind) ? "pol" : "struct");

let worldCache: { db: DB; set: Set<string> } | null = null;
function worldChain(db: DB) {
  if (worldCache?.db === db) return worldCache.set;
  const set = new Set<string>();
  const up = (id: string) => { if (set.has(id)) return; set.add(id); (db.inn[id] || []).filter((e) => STRUCT_KINDS.has(e.kind)).forEach((e) => up(e.from)); };
  db.nodes.filter((n) => n.abroad).forEach((n) => up(n.id));
  worldCache = { db, set };
  return set;
}

export function nodePasses(db: DB, s: State, n: DNode): boolean {
  if (s.only && !s.only.has(n.id)) return false;
  if (s.typesOff.has(typeGroup(n))) return false;
  if ((n.type === "company" || n.type === "brand") && n.sector && s.sectorsOff.has(n.sector)) return false;
  if (s.geo !== "all" && ["company", "brand", "institution", "person", "family"].includes(n.type)) {
    const wc = worldChain(db);
    if (s.geo === "world" && !n.abroad && !wc.has(n.id)) return false;
    if (s.geo === "il" && n.abroad) return false;
  }
  return true;
}

export function edgePasses(db: DB, s: State, e: DEdge): boolean {
  const c = catOf(e);
  if (c !== "pol" && e.share != null && e.share < s.minShare) return false;
  const min = AMOUNT_STEPS[s.minAmount];
  if (c === "pol" && min > 0 && e.amount != null && amountILS(e) < min) return false;
  if (c === "pol" && min > 0 && e.amount == null && !["affiliation", "office"].includes(e.kind)) return false;
  return nodePasses(db, s, db.byId[e.from]) && nodePasses(db, s, db.byId[e.to]);
}

export function buildModel(db: DB, s: State, keep?: string | null): Model {
  const passes = new Map<string, boolean>();
  const np = (id: string) => { let v = passes.get(id); if (v === undefined) { v = nodePasses(db, s, db.byId[id]); passes.set(id, v); } return v; };
  const rep = (id: string): string | null => {
    if (!np(id)) return null;
    const anc = ancestors(db, id).filter(np).reverse(); // root first
    for (const a of anc) if (!s.expanded.has(a)) return a;
    return id;
  };
  const vnodes = new Map<string, VNode>();
  const ensure = (id: string) => {
    let v = vnodes.get(id);
    if (!v) { const n = db.byId[id]; v = { id, n, hidden: 0, group: (db.desc[id] || 0) > 0, open: s.expanded.has(id) }; vnodes.set(id, v); }
    return v;
  };
  // count what each closed group hides
  for (const n of db.nodes) {
    const r = rep(n.id);
    if (!r) continue;
    ensure(r);
    if (r !== n.id) ensure(r).hidden++;
  }
  const vedges = new Map<string, VEdge>();
  for (const e of db.edges) {
    if (!edgePasses(db, s, e)) continue;
    const a = rep(e.from), b = rep(e.to);
    if (!a || !b || a === b) continue;
    const cat = catOf(e);
    const key = `${a}|${b}|${cat}`;
    let v = vedges.get(key);
    if (!v) { v = { id: key, from: a, to: b, cat, kind: e.kind, share: e.share, label: e.label, edges: [], former: !!e.former, amount: 0 }; vedges.set(key, v); }
    v.edges.push(e);
    v.amount += amountILS(e);
    if (v.edges.length > 1) {
      v.share = Math.max(...v.edges.map((x) => x.share ?? 0)) || null;
      v.label = `${v.edges.length} קשרים`;
      v.former = v.edges.every((x) => x.former);
    }
  }
  // drop companies and institutions left with no visible link (owners and parties stay as anchors)
  const deg = new Map<string, number>();
  vedges.forEach((e) => { deg.set(e.from, (deg.get(e.from) || 0) + 1); deg.set(e.to, (deg.get(e.to) || 0) + 1); });
  const filtered = s.minShare > 0 || s.minAmount > 0 || s.geo !== "all" || s.typesOff.size > 0 || s.sectorsOff.size > 0;
  for (const [id, v] of vnodes) {
    if (deg.get(id) || id === keep) continue;
    const t = v.n.type;
    if (["company", "brand", "institution", "donor", "lobbyist"].includes(t) || (filtered && t !== "party")) vnodes.delete(id);
  }
  const nodes = [...vnodes.values()];
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = [...vedges.values()].filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));
  return { nodes, edges, nodeIds, rep };
}
