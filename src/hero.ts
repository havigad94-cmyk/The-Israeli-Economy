// The opening: "Converging Currents" generative canvas (see docs/hero-art-philosophy.md), the headline figures,
// and the scroll-driven motion (GSAP ScrollTrigger) that carries the reader from the opening into the map.
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DB } from "./data";
import { partnerships } from "./partners";
import { state } from "./state";
import { fmtK } from "./finance";

gsap.registerPlugin(ScrollTrigger);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- seeded randomness and smooth noise ----------
const SEED = 2026;
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(SEED);
const perm = Array.from({ length: 512 }, () => rnd());
const hash = (x: number, y: number) => perm[((x * 73856093) ^ (y * 19349663)) & 511];
const smooth = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ---------- the cities (true lat/lon, economic weight, regional core) ----------
type City = { n: string; lat: number; lon: number; w: number; core?: string; label?: boolean };
const CITIES: City[] = [
  { n: "תל אביב", lat: 32.08, lon: 34.78, w: 10, label: true },
  { n: "ירושלים", lat: 31.77, lon: 35.21, w: 7, core: "תל אביב", label: true },
  { n: "חיפה", lat: 32.79, lon: 34.99, w: 6, core: "תל אביב", label: true },
  { n: "באר שבע", lat: 31.25, lon: 34.79, w: 5, core: "תל אביב", label: true },
  { n: "אילת", lat: 29.56, lon: 34.95, w: 2.4, core: "באר שבע", label: true },
  { n: "הרצליה", lat: 32.16, lon: 34.84, w: 3.4, core: "תל אביב" }, { n: "פתח תקווה", lat: 32.09, lon: 34.88, w: 3, core: "תל אביב" },
  { n: "ראשון לציון", lat: 31.97, lon: 34.8, w: 3, core: "תל אביב" }, { n: "נתניה", lat: 32.32, lon: 34.86, w: 3, core: "תל אביב" },
  { n: "אשדוד", lat: 31.8, lon: 34.65, w: 3, core: "תל אביב" }, { n: "רעננה", lat: 32.18, lon: 34.87, w: 2, core: "תל אביב" },
  { n: "רחובות", lat: 31.89, lon: 34.81, w: 2, core: "תל אביב" }, { n: "מודיעין", lat: 31.9, lon: 35.01, w: 2, core: "ירושלים" },
  { n: "אשקלון", lat: 31.67, lon: 34.57, w: 2, core: "באר שבע" }, { n: "חדרה", lat: 32.44, lon: 34.92, w: 2, core: "חיפה" },
  { n: "קיסריה", lat: 32.5, lon: 34.9, w: 1.4, core: "חיפה" }, { n: "יקנעם", lat: 32.66, lon: 35.11, w: 1.8, core: "חיפה" },
  { n: "נצרת", lat: 32.7, lon: 35.3, w: 2, core: "חיפה" }, { n: "עפולה", lat: 32.61, lon: 35.29, w: 1.5, core: "חיפה" },
  { n: "טבריה", lat: 32.79, lon: 35.53, w: 1.5, core: "חיפה" }, { n: "כרמיאל", lat: 32.92, lon: 35.3, w: 1.5, core: "חיפה" },
  { n: "נהריה", lat: 33.01, lon: 35.09, w: 1.5, core: "חיפה" }, { n: "קריית שמונה", lat: 33.21, lon: 35.57, w: 1.5, core: "חיפה" },
  { n: "קריית גת", lat: 31.61, lon: 34.76, w: 1.2, core: "באר שבע" }, { n: "שדרות", lat: 31.52, lon: 34.6, w: 1, core: "באר שבע" },
  { n: "אופקים", lat: 31.31, lon: 34.62, w: 1, core: "באר שבע" }, { n: "ערד", lat: 31.26, lon: 35.21, w: 1, core: "באר שבע" },
  { n: "דימונה", lat: 31.07, lon: 35.03, w: 1.4, core: "באר שבע" }, { n: "ירוחם", lat: 30.99, lon: 34.93, w: 1, core: "באר שבע" },
  { n: "מצפה רמון", lat: 30.61, lon: 34.8, w: 1, core: "באר שבע" },
];

interface Arc { a: number; b: number; cx: number; cy: number; back: boolean }
interface Particle { arc: number; t: number; v: number; size: number }

function startArt(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0, dpr = 1, running = true, visible = true, prog = 0;
  const pts: { x: number; y: number; w: number }[] = [];
  const arcs: Arc[] = [];
  const parts: Particle[] = [];
  const dust = Array.from({ length: 420 }, () => ({ x: rnd(), y: rnd(), s: 0.4 + rnd() * 1.1, a: 0.08 + rnd() * 0.28 }));
  const coreIdx = (n: string) => CITIES.findIndex((c) => c.n === n);
  const gold = getComputedStyle(document.documentElement).getPropertyValue("--gold").trim() || "#F5B94A";

  function layout() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // project lat/lon; the land is narrow, so on wide screens it sits on the left third (the text reads from the right)
    const wide = W > 820;
    const h = H * (wide ? 0.8 : 0.74), w = h * 0.36 * 1.25;
    const ox = wide ? W * 0.3 - w / 2 : W * 0.5 - w / 2, oy = wide ? H * 0.06 : (H - h) / 2;
    pts.length = 0;
    CITIES.forEach((c) => pts.push({ x: ox + ((c.lon - 34.2) / 1.7) * w, y: oy + ((33.4 - c.lat) / 4) * h, w: c.w }));
    arcs.length = 0;
    const r2 = mulberry32(SEED + 1);
    CITIES.forEach((c, i) => {
      if (!c.core) return;
      const j = coreIdx(c.core), A = pts[i], B = pts[j];
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      // bow perpendicular, mostly westward (toward the sea), so the currents fan out like filaments
      const bow = (0.18 + r2() * 0.32) * len * (r2() < 0.78 ? 1 : -1);
      arcs.push({ a: i, b: j, cx: mx + (-dy / len) * bow - len * 0.12, cy: my + (dx / len) * bow, back: false });
      if (c.w >= 3 || r2() < 0.18) arcs.push({ a: j, b: i, cx: mx + (dy / len) * bow * 0.6, cy: my - (dx / len) * bow * 0.6, back: true });
    });
    if (!parts.length) {
      const fwd = arcs.map((a, i) => (a.back ? -1 : i)).filter((i) => i >= 0), back = arcs.map((a, i) => (a.back ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < 120; k++) parts.push({ arc: k % 7 === 0 && back.length ? back[k % back.length] : fwd[Math.floor(rnd() * fwd.length)], t: rnd(), v: 0.0016 + rnd() * 0.0032, size: 0.8 + rnd() * 1.6 });
    }
    ctx.fillStyle = "#050A13"; ctx.fillRect(0, 0, W, H);
  }
  const at = (a: Arc, t: number) => { const A = pts[a.a], B = pts[a.b], u = 1 - t; return { x: u * u * A.x + 2 * u * t * a.cx + t * t * B.x, y: u * u * A.y + 2 * u * t * a.cy + t * t * B.y }; };

  let time = 0;
  function frame() {
    time += 1;
    // translucent wash keeps soft trails
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5,10,19,0.22)"; ctx.fillRect(0, 0, W, H);
    // dust drifting on noise
    for (const d of dust) {
      const n = noise(d.x * 3 + time * 0.002, d.y * 3);
      d.x += Math.cos(n * 6.28) * 0.00018; d.y += Math.sin(n * 6.28) * 0.00018 - 0.00004;
      if (d.x < 0) d.x += 1; if (d.x > 1) d.x -= 1; if (d.y < 0) d.y += 1; if (d.y > 1) d.y -= 1;
      ctx.fillStyle = `rgba(148,180,220,${d.a})`; ctx.fillRect(d.x * W, d.y * H, d.s, d.s);
    }
    // currents
    ctx.lineWidth = 1;
    for (const a of arcs) {
      const A = pts[a.a], B = pts[a.b];
      ctx.strokeStyle = a.back ? "rgba(79,157,255,0.16)" : "rgba(245,185,74,0.17)";
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(a.cx, a.cy, B.x, B.y); ctx.stroke();
    }
    // rings of influence around the core
    const C = pts[0], R = Math.min(W, H) * (0.07 + prog * 0.06);
    for (let k = 1; k <= 4; k++) {
      const rr = R * k * 0.62, rot = time * 0.0016 * (k % 2 ? 1 : -1) * (1 + prog * 2);
      ctx.strokeStyle = `rgba(125,170,230,${0.16 - k * 0.025})`;
      ctx.setLineDash(k % 2 ? [2, 7] : [14, 10]); ctx.lineDashOffset = rot * 60;
      ctx.beginPath(); ctx.arc(C.x, C.y, rr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    // particles
    ctx.globalCompositeOperation = "lighter";
    for (const p of parts) {
      const a = arcs[p.arc];
      p.t += p.v * (0.6 + p.t * 0.9) * (1 + prog * 1.6);
      if (p.t >= 1) { p.t = 0; }
      const q = at(a, p.t);
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, p.size * 3.6);
      g.addColorStop(0, a.back ? "rgba(120,190,255,0.9)" : "rgba(255,206,110,0.95)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, p.size * 3.6, 0, Math.PI * 2); ctx.fill();
    }
    // hubs, breathing
    pts.forEach((p, i) => {
      const br = 1 + 0.18 * Math.sin(time * 0.03 + i * 1.7);
      const r = (1.3 + Math.sqrt(p.w) * 1.5) * br;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4.5);
      g.addColorStop(0, i === 0 ? "rgba(255,214,130,0.95)" : "rgba(170,205,255,0.8)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 4.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";
    ctx.font = "500 11px Heebo, Arial, sans-serif"; ctx.textAlign = "left"; ctx.fillStyle = "rgba(200,215,235,0.55)";
    CITIES.forEach((c, i) => { if (c.label) ctx.fillText(c.n, pts[i].x + 9, pts[i].y + 4); });
    ctx.fillStyle = gold;
    if (running && visible && !reduced) requestAnimationFrame(frame);
  }
  layout();
  if (reduced) { for (let i = 0; i < 140; i++) frame(); } else requestAnimationFrame(frame);
  let rt: number | undefined;
  addEventListener("resize", () => { clearTimeout(rt); rt = window.setTimeout(layout, 150); });
  new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was && !reduced) requestAnimationFrame(frame); }).observe(canvas);
  document.addEventListener("visibilitychange", () => { const was = running; running = !document.hidden; if (running && !was && visible && !reduced) requestAnimationFrame(frame); });
  return { setProgress: (p: number) => (prog = p) };
}

// ---------- headline figures ----------
function figures(db: DB) {
  const listed = Object.values(db.fins).filter((f: any) => f.kind === "listed");
  const cap = listed.reduce((s: number, f: any) => s + (f.marketCap || 0), 0);
  const owners = db.nodes.filter((n) => n.type === "person" || n.type === "family").length;
  const parties = db.nodes.filter((n) => n.type === "party" && /2026/.test(n.role || "")).length;
  const pairs = partnerships(db, { ...state, typesOff: new Set(), sectorsOff: new Set(), only: null, minShare: 0, geo: "all" }).pairs.filter((p) => p.shared.length).length;
  return { cap, capTxt: fmtK(cap), listed: listed.length, owners, nodes: db.nodes.length, edges: db.edges.length, sources: db.sources.length, parties, pairs };
}

export function initHero(db: DB, actions: { story: (id: string) => void }) {
  const f = figures(db);
  const set = (id: string, v: number, txt?: string) => { const el = document.getElementById(id); if (!el) return; el.dataset.to = String(v); el.textContent = txt ?? v.toLocaleString("he-IL"); };
  set("kNodes", f.nodes); set("kEdges", f.edges); set("kSources", f.sources); set("kParties", f.parties); set("kPairs", f.pairs); set("kOwners", f.owners);
  const capB = Math.round(f.cap / 1e6); // thousands of ₪ → billions
  set("kCap", capB, capB.toLocaleString("he-IL"));
  const capNote = document.getElementById("kCapNote"); if (capNote) capNote.textContent = `${f.listed} חברות, כולל חברות בנות שנסחרות בנפרד · נכון ל-25.10.2026`;

  const canvas = document.getElementById("heroArt") as HTMLCanvasElement | null;
  const art = canvas ? startArt(canvas) : null;

  document.querySelectorAll<HTMLElement>("[data-hero-story]").forEach((b) => b.addEventListener("click", () => actions.story(b.dataset.heroStory!)));

  if (reduced) return;
  // entrance
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from(".hero .eyebrow", { y: 14, opacity: 0, duration: 0.6 })
    .from(".hero h1 .ln", { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.12 }, "-=0.3")
    .from(".hero .lede", { y: 16, opacity: 0, duration: 0.7 }, "-=0.5")
    .from(".hero .ctas > *", { y: 12, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.45")
    .from(".kpi", { y: 26, opacity: 0, duration: 0.7, stagger: 0.07 }, "-=0.35");
  // count up
  document.querySelectorAll<HTMLElement>(".kpi b[data-to]").forEach((el) => {
    const to = Number(el.dataset.to), o = { v: 0 };
    gsap.to(o, { v: to, duration: 1.8, delay: 0.7, ease: "power2.out", onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString("he-IL"); } });
  });
  // scroll: the opening recedes while the art accelerates
  gsap.to(".hero .copy", { yPercent: -18, opacity: 0.15, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 } });
  gsap.to("#heroArt", { scale: 1.08, opacity: 0.35, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6, onUpdate: (st) => art?.setProgress(st.progress) } });
  ScrollTrigger.create({ trigger: ".hero", start: "bottom 72px", onEnter: () => document.body.classList.add("scrolled"), onLeaveBack: () => document.body.classList.remove("scrolled") });
  // sections rise in as they arrive
  gsap.set(".reveal", { y: 28, opacity: 0 });
  ScrollTrigger.batch(".reveal", { start: "top 88%", once: true, onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power3.out", overwrite: true, clearProps: "transform" }) });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
