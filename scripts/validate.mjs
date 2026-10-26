// Data check run locally and in GitHub Actions: node scripts/validate.mjs
// Fails when a link has no source, points to a missing entity, or uses an unknown kind.
import fs from "node:fs";
const read = (f) => JSON.parse(fs.readFileSync(new URL("../public/data/" + f, import.meta.url)));
const nodes = read("nodes.json"), edges = read("edges.json"), sources = read("sources.json"), sectors = read("sectors.json");
const NODE_TYPES = ["person", "family", "company", "institution", "brand", "party", "politician", "donor", "state", "lobbyist", "ministry", "committee", "regulator"];
const EDGE_KINDS = ["ownership", "institutional", "franchise", "donation", "guarantee", "public-funding", "affiliation", "political", "lobbying", "office", "conflict", "subsidy", "media-ownership"];
const CONF = ["official", "press", "estimate"];
const errs = [], warn = [];
const ids = new Set();
for (const n of nodes) {
  if (ids.has(n.id)) errs.push(`duplicate node id ${n.id}`);
  ids.add(n.id);
  if (!NODE_TYPES.includes(n.type)) errs.push(`node ${n.id}: unknown type ${n.type}`);
  if ((n.type === "company" || n.type === "brand") && !sectors[n.sector]) errs.push(`node ${n.id}: unknown sector ${n.sector}`);
}
const srcIds = new Set(sources.map((s) => s.id));
for (const s of sources) if (!s.url && !s.needsLink) errs.push(`source ${s.id}: no url and not marked needsLink`);
const eids = new Set();
for (const e of edges) {
  if (eids.has(e.id)) errs.push(`duplicate edge id ${e.id}`);
  eids.add(e.id);
  if (!ids.has(e.from) || !ids.has(e.to)) errs.push(`edge ${e.id}: missing node ${e.from} -> ${e.to}`);
  if (!EDGE_KINDS.includes(e.kind)) errs.push(`edge ${e.id}: unknown kind ${e.kind}`);
  if (!CONF.includes(e.confidence)) errs.push(`edge ${e.id}: unknown confidence ${e.confidence}`);
  if (!e.sources || !e.sources.length) errs.push(`edge ${e.id} (${e.from} -> ${e.to}): no source`);
  for (const s of e.sources || []) if (!srcIds.has(s)) errs.push(`edge ${e.id}: unknown source ${s}`);
  if (e.share != null && (e.share < 0 || e.share > 100)) errs.push(`edge ${e.id}: share out of range`);
  if ((e.sources || []).every((s) => sources.find((x) => x.id === s)?.needsLink)) warn.push(e.id);
}
let fins = {};
try { fins = read("financials.json"); } catch { /* optional */ }
for (const [id, f] of Object.entries(fins)) {
  if (!ids.has(id)) errs.push(`financials: unknown entity ${id}`);
  if (!f.sources?.length) errs.push(`financials ${id}: no source`);
  for (const s of f.sources || []) if (!srcIds.has(s)) errs.push(`financials ${id}: unknown source ${s}`);
}
console.log(`${Object.keys(fins).length} financial records`);
console.log(`${nodes.length} nodes, ${edges.length} edges, ${sources.length} sources`);
console.log(`${warn.length} edges still cite only sources without a direct link`);
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
console.log("OK");
