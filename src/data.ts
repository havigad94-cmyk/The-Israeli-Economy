// Loads the JSON data files and builds the indexes every view uses:
// adjacency, groups (which entity a company folds into), and ownership chains.

export type NodeType = "person" | "family" | "company" | "institution" | "brand" | "party" | "politician" | "donor" | "state" | "lobbyist" | "ministry" | "committee" | "regulator";
export interface DNode {
  id: string; type: NodeType; name: string; nameEn?: string; sector?: string | null; geo?: string | null; abroad?: boolean;
  summary?: string; wealth?: string | null; role?: string | null; minor?: boolean; key?: boolean; political_note?: string | null;
  sources?: string[]; ids?: Record<string, string>;
}
export interface DEdge {
  id: string; from: string; to: string; kind: string; share: number | null; label: string; note?: string; former?: boolean;
  asOf?: string | null; confidence: "official" | "press" | "estimate"; sources: string[]; amount?: number; currency?: string;
}
export interface DSource { id: string; type: string; title: string; publisher?: string | null; url?: string | null; published?: string | null; accessed?: string; needsLink?: boolean }
export interface Story { id: string; title: string; summary: string; steps: StoryStep[] }
export interface StoryStep { title: string; text: string; view?: string; focus?: string; expand?: string[]; sectors?: string[]; types?: string[]; pol?: boolean }

export const OWNER_TYPES: NodeType[] = ["person", "family"];
export const POL_TYPES: NodeType[] = ["party", "politician", "donor", "state", "lobbyist", "ministry", "committee", "regulator"];
export const STRUCT_KINDS = new Set(["ownership", "franchise", "media-ownership"]);
export const POL_KINDS = new Set(["donation", "guarantee", "public-funding", "affiliation", "political", "lobbying", "office", "conflict", "subsidy"]);

export const KIND_LABEL: Record<string, string> = {
  ownership: "בעלות", institutional: "אחזקת גוף מוסדי", franchise: "זיכיון / יבוא", "media-ownership": "בעלות על כלי תקשורת",
  donation: "תרומה", guarantee: "ערבות", "public-funding": "מימון ממלכתי", affiliation: "שיוך / כהונה", political: "קשר פוליטי",
  lobbying: "שדלנות", office: "כהונה", conflict: "הסדר ניגוד עניינים", subsidy: "תמיכה ממשלתית",
};
export const TYPE_LABEL: Record<string, string> = {
  person: "אדם", family: "משפחה", company: "חברה", institution: "גוף מוסדי", brand: "מותג", party: "מפלגה", politician: "פוליטיקאי",
  donor: "תורם / ערב", state: "מקור מימון ממלכתי", lobbyist: "שדלן", ministry: "משרד ממשלתי", committee: "ועדת כנסת", regulator: "רגולטור",
};
export const CONF_LABEL: Record<string, string> = { official: "רשמי", press: "עיתונות", estimate: "הערכה" };

export interface DB {
  nodes: DNode[]; edges: DEdge[]; sources: DSource[]; sectors: Record<string, string>; stories: Story[];
  byId: Record<string, DNode>; srcById: Record<string, DSource>;
  out: Record<string, DEdge[]>; inn: Record<string, DEdge[]>;
  parent: Record<string, string | undefined>; children: Record<string, string[]>; desc: Record<string, number>;
  meta: { generated: string };
}

const weight = (e: DEdge) => (e.kind === "franchise" ? 60 : e.share != null ? e.share : /שליטה|בעלות|חברה בת|חברות בנות|זיכיון|רכישה/.test(e.label) ? 60 : 30);

export async function loadDB(base = "data/"): Promise<DB> {
  const get = (f: string) => fetch(base + f, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(f + " " + r.status); return r.json(); });
  const [nodes, edges, sources, sectors, stories, meta] = await Promise.all([
    get("nodes.json"), get("edges.json"), get("sources.json"), get("sectors.json"), get("stories.json"), get("meta.json").catch(() => ({ generated: "" })),
  ]);
  return index({ nodes, edges, sources, sectors, stories, meta } as any);
}

export function index(raw: { nodes: DNode[]; edges: DEdge[]; sources: DSource[]; sectors: Record<string, string>; stories: Story[]; meta: any }): DB {
  const byId: Record<string, DNode> = Object.fromEntries(raw.nodes.map((n) => [n.id, n]));
  const srcById: Record<string, DSource> = Object.fromEntries(raw.sources.map((s) => [s.id, s]));
  const out: Record<string, DEdge[]> = {}, inn: Record<string, DEdge[]> = {};
  for (const e of raw.edges) { (out[e.from] ??= []).push(e); (inn[e.to] ??= []).push(e); }

  // Group membership: a company or brand folds into its strongest structural owner (a person, family or company).
  const parent: Record<string, string | undefined> = {};
  for (const n of raw.nodes) {
    if (!(n.type === "company" || n.type === "brand")) continue;
    const cands = (inn[n.id] || []).filter((e) => STRUCT_KINDS.has(e.kind) && !e.former && ["person", "family", "company"].includes(byId[e.from].type));
    if (!cands.length) continue;
    cands.sort((a, b) => weight(b) - weight(a));
    // fold into a group only when one owner controls it: 50% or more, or a stated control/subsidiary link
    if (weight(cands[0]) < 50) continue;
    if (cands.length > 1 && weight(cands[1]) >= 50) continue;
    parent[n.id] = cands[0].from;
  }
  // break cycles
  for (const id of Object.keys(parent)) {
    const seen = new Set([id]); let p = parent[id];
    while (p) { if (seen.has(p)) { delete parent[id]; break; } seen.add(p); p = parent[p]; }
  }
  const children: Record<string, string[]> = {};
  for (const [c, p] of Object.entries(parent)) if (p) (children[p] ??= []).push(c);
  const desc: Record<string, number> = {};
  const countDesc = (id: string): number => (desc[id] ??= (children[id] || []).reduce((s, c) => s + 1 + countDesc(c), 0));
  raw.nodes.forEach((n) => countDesc(n.id));

  return { ...raw, byId, srcById, out, inn, parent, children, desc, meta: raw.meta || { generated: "" } };
}

// Every ownership path from the entity up to a root owner, with the effective share when all steps are numeric.
export function chains(db: DB, id: string, limit = 4): { path: string[]; eff: number | null }[] {
  const res: { path: string[]; eff: number | null }[] = [];
  const walk = (cur: string, path: string[], eff: number | null) => {
    if (res.length >= limit * 3) return;
    const ups = (db.inn[cur] || []).filter((e) => STRUCT_KINDS.has(e.kind) && !e.former && !path.includes(e.from));
    if (!ups.length) { if (path.length > 1) res.push({ path: [...path].reverse(), eff }); return; }
    for (const e of ups) walk(e.from, [...path, e.from], eff != null && e.share != null ? (eff * e.share) / 100 : null);
  };
  walk(id, [id], 100);
  res.sort((a, b) => (b.eff ?? -1) - (a.eff ?? -1) || a.path.length - b.path.length);
  return res.slice(0, limit);
}

export const ancestors = (db: DB, id: string) => { const a: string[] = []; let p = db.parent[id]; while (p) { a.push(p); p = db.parent[p]; } return a; };
export const isAbroad = (n: DNode) => !!n.abroad;
export const fmtAmount = (e: DEdge) => {
  if (!e.amount) return "";
  const v = e.amount, cur = e.currency === "USD" ? "$" : "₪";
  return v >= 1e6 ? `${(v / 1e6).toLocaleString("he-IL", { maximumFractionDigits: 1 })} מיליון ${cur}` : v >= 1e3 ? `${(v / 1e3).toLocaleString("he-IL", { maximumFractionDigits: 0 })} אלף ${cur}` : `${v} ${cur}`;
};
export const amountILS = (e: DEdge) => (e.amount ? e.amount * (e.currency === "USD" ? 3.7 : 1) : 0);
