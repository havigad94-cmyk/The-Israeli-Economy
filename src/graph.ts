// The network map: Cytoscape instance, styles drawn from the CSS tokens, the four graph layouts and highlighting.
import cytoscape, { Core, ElementDefinition, NodeSingular } from "cytoscape";
import fcose from "cytoscape-fcose";
import dagre from "cytoscape-dagre";
import { DB, POL_TYPES } from "./data";
import { Model, VNode, buildModel } from "./model";
import { state, set, State } from "./state";

cytoscape.use(fcose);
cytoscape.use(dagre);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888";
const short = (t: string, n = 26) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

export let cy: Core;
let db: DB;
let model: Model;
let lastKey = "";

const ZONES: { key: string; title: string; test: (v: VNode) => boolean }[] = [
  { key: "pol", title: "מפלגות ופוליטיקאים", test: (v) => ["party", "politician", "state"].includes(v.n.type) },
  { key: "donor", title: "תורמים, ערבים ושדלנים", test: (v) => ["donor", "lobbyist"].includes(v.n.type) },
  { key: "gov", title: "משרדים, ועדות ורגולטורים", test: (v) => ["ministry", "committee", "regulator"].includes(v.n.type) },
  { key: "owners", title: "משפחות ובעלי הון", test: (v) => ["person", "family"].includes(v.n.type) },
  { key: "inst", title: "גופים מוסדיים", test: (v) => v.n.type === "institution" },
];

function nodeData(v: VNode) {
  const n = v.n;
  const base = n.type === "family" || n.type === "person" ? (n.minor ? 18 : 26) : n.type === "party" ? 24 : n.type === "politician" ? 16 : n.type === "donor" || n.type === "lobbyist" ? 9 : n.type === "institution" ? 16 : n.type === "brand" ? 9 : n.key ? 16 : 12;
  const size = v.group && !v.open ? Math.min(base + 6 + Math.sqrt(v.hidden) * 3, 46) : base;
  const label = short(n.name) + (v.group && !v.open && v.hidden ? `  ·  ${v.hidden}` : "");
  return { id: v.id, label, size, type: n.type, sector: n.sector || "", abroad: n.abroad ? 1 : 0, closed: v.group && !v.open ? 1 : 0, opened: v.group && v.open ? 1 : 0 };
}

export function styles(): any[] {
  const sec = (k: string) => css("--s-" + k);
  const font = "Heebo, Arial Hebrew, Arial, sans-serif";
  const s: any[] = [
    { selector: "node", style: { label: "data(label)", "font-family": font, "font-size": 11, "font-weight": 500, color: css("--fg"), "text-valign": "bottom", "text-margin-y": 4, "text-outline-color": css("--surface"), "text-outline-width": 2.5, "text-outline-opacity": 0.95, width: "data(size)", height: "data(size)", "background-color": css("--s-hold"), "min-zoomed-font-size": 7, "transition-property": "opacity", "transition-duration": reduced ? 0 : 250, "overlay-opacity": 0 } },
    { selector: "node[type='family'], node[type='person']", style: { "background-color": css("--family"), "font-size": 13, "font-weight": 700 } },
    { selector: "node[type='institution']", style: { shape: "round-rectangle", "background-color": css("--surface"), "border-width": 2.5, "border-color": css("--inst") } },
    { selector: "node[type='brand']", style: { shape: "round-rectangle", "font-size": 10 } },
    { selector: "node[type='party'], node[type='politician']", style: { shape: "diamond", "background-color": css("--pol-soft"), "border-width": 2, "border-color": css("--pol"), color: css("--pol"), "font-weight": 600 } },
    { selector: "node[type='state']", style: { shape: "hexagon", "background-color": css("--pol-soft"), "border-width": 2, "border-color": css("--pol"), width: 20, height: 20 } },
    { selector: "node[type='donor'], node[type='lobbyist']", style: { "background-color": css("--surface"), "border-width": 2, "border-color": css("--warn"), "font-size": 10 } },
    { selector: "node[type='ministry'], node[type='committee'], node[type='regulator']", style: { shape: "rectangle", "background-color": css("--surface"), "border-width": 2, "border-color": css("--world"), width: 18, height: 18 } },
    { selector: "node[abroad=1]", style: { "border-width": 2, "border-style": "dashed", "border-color": css("--world") } },
    { selector: "node[closed=1]", style: { "border-width": 3.5, "border-style": "double", "border-color": css("--accent"), "font-weight": 700 } },
    { selector: "node[opened=1]", style: { "border-width": 2, "border-style": "dotted", "border-color": css("--accent") } },
    { selector: "node.zh", style: { shape: "rectangle", width: 1, height: 1, "background-opacity": 0, label: "data(label)", "font-size": 14, "font-weight": 700, color: css("--fg"), "text-valign": "center", "text-outline-width": 0, events: "no", "min-zoomed-font-size": 4 } },
    { selector: "node:selected", style: { "border-width": 4, "border-color": css("--accent"), "border-style": "solid" } },
    { selector: "edge", style: { width: "mapData(share, 0, 100, 1, 5)", "line-color": css("--edge"), "curve-style": "bezier", "target-arrow-shape": "triangle", "target-arrow-color": css("--edge"), "arrow-scale": 0.7, opacity: 0.75, label: "data(elabel)", "font-family": font, "font-size": 10, "font-weight": 600, color: css("--accent"), "text-outline-color": css("--surface"), "text-outline-width": 2.5, "text-opacity": 0, "text-rotation": "autorotate", "min-zoomed-font-size": 6, "transition-property": "opacity, line-color", "transition-duration": reduced ? 0 : 250 } },
    { selector: "edge[!share]", style: { width: 1.4 } },
    { selector: "edge[amt >= 1000000][cat='pol']", style: { width: 2.2 } },
    { selector: "edge[amt >= 10000000][cat='pol']", style: { width: 3.2 } },
    { selector: "edge[cat='inst']", style: { "line-style": "dotted", "line-color": css("--inst"), "target-arrow-color": css("--inst"), opacity: 0.55, color: css("--inst") } },
    { selector: "edge[cat='pol']", style: { "line-style": "dashed", "line-dash-pattern": [7, 4], "line-color": css("--pol"), "target-arrow-color": css("--pol"), width: 1.4, "arrow-scale": 0.6, color: css("--pol") } },
    { selector: "edge[kind='franchise']", style: { "line-style": "dashed", "line-color": css("--franchise"), "target-arrow-color": css("--franchise"), color: css("--franchise") } },
    { selector: "edge[former=1]", style: { "line-style": "dotted", opacity: 0.35 } },
    { selector: ".lbl", style: { "text-opacity": 1 } },
    { selector: ".dim", style: { opacity: 0.07 } },
    { selector: "edge.hl", style: { opacity: 1, "z-index": 10 } },
    { selector: ".far", style: { display: "none" } },
    { selector: "node.tw", style: { "text-wrap": "wrap", "text-max-width": "110px", "text-valign": "bottom" } },
  ];
  Object.keys(db?.sectors || {}).forEach((k) => s.splice(2, 0, { selector: `node[type='company'][sector='${k}'], node[type='brand'][sector='${k}']`, style: { "background-color": sec(k) } }));
  return s;
}

export function initGraph(container: HTMLElement, data: DB, handlers: { onSelect: (id: string | null) => void; onToggle: (id: string) => void }) {
  db = data;
  cy = cytoscape({ container, style: styles(), minZoom: 0.12, maxZoom: 3.5, wheelSensitivity: 0.25, boxSelectionEnabled: false, autoungrabify: true });
  cy.on("tap", "node", (e) => { const n = e.target as NodeSingular; if (!n.hasClass("zh")) handlers.onSelect(n.id()); });
  cy.on("tap", "edge", (e) => handlers.onSelect("e:" + e.target.id()));
  cy.on("tap", (e) => { if (e.target === cy) handlers.onSelect(null); });
  cy.on("dbltap", "node", (e) => { const id = e.target.id(); if ((db.desc[id] || 0) > 0) handlers.onToggle(id); });
  cy.on("mouseover", "edge", (e) => e.target.addClass("lbl"));
  cy.on("mouseout", "edge", (e) => { if (!e.target.hasClass("hl")) e.target.removeClass("lbl"); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => cy.style(styles()));
}

const zoneOf = (v: VNode) => { const z = ZONES.find((z) => z.test(v)); return z ? z.key : "sec:" + (v.n.sector || "hold"); };

function columnPositions(m: Model): { pos: Record<string, { x: number; y: number }>; headers: ElementDefinition[] } {
  const COLW = 215, GAP = 36, TOP = 70;
  const secKeys = Object.keys(db.sectors);
  const order = [...ZONES.map((z) => z.key), ...secKeys.map((k) => "sec:" + k)];
  const cols: Record<string, VNode[]> = {};
  m.nodes.forEach((v) => (cols[zoneOf(v)] ??= []).push(v));
  const used = order.filter((k) => cols[k]?.length);
  const nb: Record<string, string[]> = {};
  m.edges.forEach((e) => { (nb[e.from] ??= []).push(e.to); (nb[e.to] ??= []).push(e.from); });
  const y: Record<string, number> = {};
  used.forEach((k) => { cols[k].sort((a, b) => (b.hidden - a.hidden) || (nb[b.id]?.length || 0) - (nb[a.id]?.length || 0)); cols[k].forEach((v, i) => (y[v.id] = i)); });
  for (let it = 0; it < 6; it++) {
    used.forEach((k) => {
      const bary = (v: VNode) => { const ns = (nb[v.id] || []).filter((o) => y[o] != null); return ns.length ? ns.reduce((s, o) => s + y[o], 0) / ns.length : y[v.id]; };
      const b = new Map(cols[k].map((v) => [v.id, bary(v)]));
      cols[k].sort((p, q) => b.get(p.id)! - b.get(q.id)!);
      cols[k].forEach((v, i) => (y[v.id] = i));
    });
  }
  const pos: Record<string, { x: number; y: number }> = {};
  const headers: ElementDefinition[] = [];
  const W = used.length * COLW;
  used.forEach((k, i) => {
    const x = W - i * COLW;
    const title = ZONES.find((z) => z.key === k)?.title || db.sectors[k.slice(4)];
    headers.push({ group: "nodes", data: { id: "zh:" + k, label: `${title} (${cols[k].length})` }, position: { x, y: TOP - 50 }, classes: "zh", selectable: false });
    let yy = TOP;
    cols[k].forEach((v) => { const sz = nodeData(v).size; yy += Math.max(0, sz / 2 - 10); pos[v.id] = { x, y: yy }; yy += Math.max(GAP, sz / 2 + 24); });
  });
  return { pos, headers };
}

function elementsFor(m: Model): ElementDefinition[] {
  const els: ElementDefinition[] = m.nodes.map((v) => ({ group: "nodes", data: nodeData(v) }));
  m.edges.forEach((e) => els.push({ group: "edges", data: { id: e.id, source: e.from, target: e.to, cat: e.cat, kind: e.kind, share: e.share ?? undefined, amt: e.amount || undefined, former: e.former ? 1 : 0, elabel: e.edges.length > 1 ? e.label : e.share != null ? `${e.share}%` : short(e.label, 22) } }));
  return els;
}

// Upstream owners and downstream holdings through ownership links, plus direct political ties.
export function focusSet(id: string) {
  const n = cy.getElementById(id);
  if (!n.length) return cy.collection();
  const struct = (e: any) => e.data("cat") === "struct";
  let set = n.union(n.connectedEdges());
  const down = n.successors().filter((el: any) => el.isEdge() ? struct(el) : true);
  const up = n.predecessors().filter((el: any) => el.isEdge() ? struct(el) : true);
  // keep only nodes reached through ownership links
  const reach = (start: any, dir: "out" | "in") => {
    const seen = new Set([id]); const q = [id]; let col = cy.collection();
    while (q.length) {
      const cur = cy.getElementById(q.shift()!);
      const es = (dir === "out" ? cur.outgoers("edge") : cur.incomers("edge")).filter(struct);
      es.forEach((e: any) => { const o = dir === "out" ? e.target() : e.source(); col = col.union(e); if (!seen.has(o.id())) { seen.add(o.id()); col = col.union(o); q.push(o.id()); } });
    }
    return col;
  };
  void down; void up;
  set = set.union(reach(n, "out")).union(reach(n, "in"));
  set = set.union(set.nodes().connectedEdges().filter((e: any) => e.data("cat") !== "struct" && set.nodes().contains(e.source()) && set.nodes().contains(e.target())));
  set = set.union(n.neighborhood());
  return set;
}

export function highlight(selected: string | null) {
  cy.batch(() => {
    cy.elements().removeClass("dim hl lbl");
    if (!selected) return;
    if (selected.startsWith("e:")) {
      const e = cy.getElementById(selected.slice(2));
      if (!e.length) return;
      cy.elements().not(".zh").addClass("dim");
      e.union(e.connectedNodes()).removeClass("dim");
      e.addClass("hl lbl");
      return;
    }
    const n = cy.getElementById(selected);
    if (!n.length) return;
    if (state.view === "radial") { n.connectedEdges().addClass("hl lbl"); n.select(); return; }
    const f = focusSet(selected);
    cy.elements().not(".zh").addClass("dim");
    f.removeClass("dim");
    f.edges().addClass("hl lbl");
    n.select();
  });
}

function home(animate = false) {
  const els = cy.elements(":visible");
  if (!els.length) return;
  const bb = els.boundingBox();
  const w = cy.width(), h = cy.height();
  if (state.view === "cols") {
    const z = Math.max(cy.minZoom(), Math.min(1.05, (h - 30) / bb.h));
    const pan = bb.w * z > w ? { x: w - 24 - bb.x2 * z, y: 20 - bb.y1 * z } : { x: (w - bb.w * z) / 2 - bb.x1 * z, y: 20 - bb.y1 * z };
    animate && !reduced ? cy.animate({ zoom: z, pan }, { duration: 400 }) : (cy.zoom(z), cy.pan(pan));
  } else {
    animate && !reduced ? cy.animate({ fit: { eles: els, padding: 40 } }, { duration: 400 }) : cy.fit(els, 40);
  }
}
export const fitHome = () => home(true);

export function focusView(id: string) {
  const n = cy.getElementById(id);
  if (!n.length) return;
  const f = (state.view === "cols" ? n.closedNeighborhood() : focusSet(id)).filter(":visible");
  const bb = f.boundingBox();
  const w = cy.width(), h = cy.height();
  let z = Math.min(1.6, Math.min(w / (bb.w + 80), h / (bb.h + 80)));
  z = Math.max(z, 0.45);
  const p = n.position();
  // when the focus area is wider than the view, keep the selected node in view and lean toward its holdings
  const cx = bb.w * z > w ? p.x - (w * 0.25) / z : (bb.x1 + bb.x2) / 2;
  const cyy = bb.h * z > h ? p.y : (bb.y1 + bb.y2) / 2;
  const pan = { x: w / 2 - cx * z, y: h / 2 - cyy * z };
  reduced ? (cy.zoom(z), cy.pan(pan)) : cy.animate({ zoom: z, pan }, { duration: 450 });
}

function bfsLevels(center: string, m: Model) {
  const adj: Record<string, string[]> = {};
  m.edges.forEach((e) => { (adj[e.from] ??= []).push(e.to); (adj[e.to] ??= []).push(e.from); });
  const d: Record<string, number> = { [center]: 0 }; const q = [center];
  while (q.length) { const c = q.shift()!; for (const o of adj[c] || []) if (d[o] == null) { d[o] = d[c] + 1; q.push(o); } }
  return d;
}

export function render(s: State, why: string) {
  const key = JSON.stringify([s.view, s.geo, s.minShare, s.minAmount, [...s.typesOff], [...s.sectorsOff], [...s.expanded], s.view === "radial" || s.view === "tree" ? s.selected : "", s.view === "free" ? [s.repel, s.elen] : ""]);
  const selNode = s.selected && !s.selected.startsWith("e:") ? s.selected : null;
  if (key === lastKey && why !== "force") { highlight(s.selected); return; }
  const prevPos: Record<string, { x: number; y: number }> = {};
  cy.nodes().forEach((n) => { prevPos[n.id()] = { ...n.position() }; });
  lastKey = key;
  model = buildModel(db, s, selNode);
  const els = elementsFor(model);
  cy.batch(() => { cy.elements().remove(); cy.add(els); });
  cy.style(styles());
  const view = s.view;
  const done = () => { highlight(s.selected); if (selNode && cy.getElementById(selNode).length && why !== "filter") focusView(selNode); else home(false); };

  if (view === "cols") {
    const { pos, headers } = columnPositions(model);
    cy.add(headers);
    cy.nodes().not(".zh").forEach((n) => { const p = pos[n.id()]; if (p) n.position(p); });
    done();
  } else if (view === "free") {
    // new nodes start where their group was
    cy.nodes().forEach((n) => { const p = prevPos[n.id()] || prevPos[model.rep(n.id()) || ""] || prevPos[db.parent[n.id()] || ""]; if (p) n.position({ x: p.x + Math.random() * 30 - 15, y: p.y + Math.random() * 30 - 15 }); });
    const known = cy.nodes().filter((n) => !!prevPos[n.id()]).length;
    const fresh = known < cy.nodes().length * 0.7 || why === "view" || why === "story";
    cy.layout({ name: "fcose", quality: "default", randomize: fresh, animate: !reduced && !fresh, animationDuration: 500, nodeRepulsion: () => s.repel, idealEdgeLength: () => s.elen, edgeElasticity: () => 0.3, gravity: 0.25, numIter: 2500, nodeSeparation: 60, fit: false } as any).one("layoutstop", done).run();
  } else if (view === "radial") {
    const center = selNode && cy.getElementById(selNode).length ? selNode : pickDefaultCenter();
    const lv = bfsLevels(center, model);
    cy.nodes().forEach((n) => { if (lv[n.id()] == null || lv[n.id()] > 3) n.addClass("far"); });
    const eles = cy.elements().not(".far");
    eles.layout({ name: "concentric", concentric: (n: any) => 10 - (lv[n.id()] ?? 9), levelWidth: () => 1, minNodeSpacing: 26, spacingFactor: 1.05, startAngle: (3 / 2) * Math.PI, animate: !reduced, animationDuration: 500, fit: false } as any).one("layoutstop", () => { highlight(s.selected); home(true); }).run();
  } else if (view === "tree") {
    let eles = cy.elements();
    const root = selNode && cy.getElementById(selNode).length ? selNode : pickDefaultCenter();
    if (root) {
      const n = cy.getElementById(root);
      const struct = (e: any) => e.data("cat") !== "pol";
      const down = n.successors().filter((el: any) => (el.isEdge() ? struct(el) : true));
      const up = n.predecessors().filter((el: any) => (el.isEdge() ? struct(el) : true));
      eles = n.union(down).union(up);
      eles = eles.union(eles.nodes().edgesWith(eles.nodes()).filter(struct));
    }
    cy.elements().not(eles).addClass("far");
    eles.nodes().addClass("tw");
    eles.layout({ name: "dagre", rankDir: "TB", nodeSep: 70, rankSep: 90, edgeSep: 8, animate: !reduced, animationDuration: 450, fit: false } as any).one("layoutstop", () => { highlight(s.selected); home(true); }).run();
  }
}

function pickDefaultCenter() {
  const best = model.nodes.filter((v) => v.n.type === "family" || v.n.type === "person").sort((a, b) => b.hidden - a.hidden)[0];
  return best ? best.id : model.nodes[0]?.id;
}

export const currentModel = () => model;
export function zoomBy(f: number) { const z = cy.zoom() * f; cy.animate({ zoom: { level: z, position: { x: cy.width() / 2, y: cy.height() / 2 } as any } as any }, { duration: reduced ? 0 : 200 }); }
export const selectState = (id: string | null) => set({ selected: id }, "select");
