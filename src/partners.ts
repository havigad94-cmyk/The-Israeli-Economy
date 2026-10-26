// Business partnerships, computed from the ownership links: two owners (people, families, institutional investors or
// top-level companies) are partners when they hold the same company, directly or down a chain, or hold separate
// companies in the same sector. Nothing here is typed in by hand, so every partnership traces back to sourced links.
import { DB, STRUCT_KINDS } from "./data";
import { nodePasses } from "./model";
import { State } from "./state";

export interface Holding { id: string; eff: number | null; direct: boolean; inst: boolean }
export interface Pair { a: string; b: string; shared: string[]; sectors: Record<string, [string[], string[]]>; score: number }

const FULL = /^(בעלות|בעלות מלאה|בעלות יחיד|בעלות משפחתית|חברה בת)$/;
const isActor = (db: DB, id: string) => {
  const n = db.byId[id];
  if (["person", "family", "institution"].includes(n.type)) return true;
  if (n.type !== "company") return false;
  const owned = (db.inn[id] || []).some((e) => STRUCT_KINDS.has(e.kind) && !e.former);
  const owns = (db.out[id] || []).some((e) => (STRUCT_KINDS.has(e.kind) || e.kind === "institutional") && !e.former);
  return !owned && owns;
};

export function holdingsOf(db: DB, id: string, s?: State): Map<string, Holding> {
  const res = new Map<string, Holding>();
  const walk = (cur: string, eff: number | null, depth: number) => {
    for (const e of db.out[cur] || []) {
      const inst = e.kind === "institutional";
      if (e.former || !(STRUCT_KINDS.has(e.kind) || (inst && depth === 0))) continue;
      const t = db.byId[e.to];
      if (!t || !(t.type === "company" || t.type === "brand")) continue;
      if (s && e.share != null && e.share < s.minShare) continue;
      const sh = e.share ?? (FULL.test(e.label) ? 100 : null);
      const next = eff != null && sh != null ? (eff * sh) / 100 : null;
      const prev = res.get(t.id);
      if (prev && (prev.eff ?? -1) >= (next ?? -1)) continue;
      res.set(t.id, { id: t.id, eff: next, direct: depth === 0, inst });
      if (depth < 6) walk(t.id, next, depth + 1);
    }
  };
  walk(id, 100, 0);
  return res;
}

let cache: { key: string; pairs: Pair[]; hold: Map<string, Map<string, Holding>> } | null = null;

export function partnerships(db: DB, s: State): { pairs: Pair[]; hold: Map<string, Map<string, Holding>> } {
  const key = JSON.stringify([s.geo, s.minShare, [...s.typesOff], [...s.sectorsOff], s.only ? [...s.only] : null]);
  if (cache?.key === key) return cache;
  const hold = new Map<string, Map<string, Holding>>();
  for (const n of db.nodes) {
    if (!isActor(db, n.id) || !nodePasses(db, s, n)) continue;
    const h = holdingsOf(db, n.id, s);
    for (const [cid] of h) if (!nodePasses(db, s, db.byId[cid])) h.delete(cid);
    if (h.size) hold.set(n.id, h);
  }
  const actors = [...hold.keys()];
  const pairs: Pair[] = [];
  for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) {
    const a = actors[i], b = actors[j], ha = hold.get(a)!, hb = hold.get(b)!;
    if (ha.has(b) || hb.has(a)) continue; // one owns the other: a chain, not a partnership
    const shared = [...ha.keys()].filter((c) => hb.has(c));
    const sharedSet = new Set(shared);
    const bySec = (h: Map<string, Holding>) => { const m: Record<string, string[]> = {}; for (const c of h.keys()) { const sec = db.byId[c].sector; if (sec && sec !== "hold" && !sharedSet.has(c)) (m[sec] ??= []).push(c); } return m; };
    const sa = bySec(ha), sb = bySec(hb);
    const sectors: Pair["sectors"] = {};
    for (const k of Object.keys(sa)) if (sb[k]) sectors[k] = [sa[k], sb[k]];
    const nsec = Object.keys(sectors).length;
    // a partnership is a shared company, or separate holdings in at least two common sectors
    if (!shared.length && nsec < 2) continue;
    pairs.push({ a, b, shared, sectors, score: shared.length * 3 + nsec });
  }
  pairs.sort((x, y) => y.score - x.score);
  cache = { key, pairs, hold };
  return cache;
}

export const pairId = (a: string, b: string) => "pp:" + [a, b].sort().join("|");
export function findPair(db: DB, s: State, id: string) {
  const [a, b] = id.slice(3).split("|");
  return partnerships(db, s).pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a)) || null;
}
export const partnersOf = (db: DB, s: State, id: string) => partnerships(db, s).pairs.filter((p) => p.a === id || p.b === id);
