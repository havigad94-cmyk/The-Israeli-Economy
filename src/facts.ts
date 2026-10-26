// "הידעת?": short sourced facts that surface over the map now and then, and a few in the intro panel.
// Facts live in data/facts.json; each one names its sources and, optionally, the entity it points at.
import { DB, Fact } from "./data";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let db: DB, el: HTMLElement, order: Fact[] = [], i = 0, timer: number | undefined, muted = false, go: (id: string) => void;

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let k = b.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [b[k], b[j]] = [b[j], b[k]]; } return b; };
const srcLine = (f: Fact) => f.sources.map((s) => db.srcById[s]).filter(Boolean).slice(0, 2).map((s) => (s!.url ? `<a href="${esc(s!.url)}" target="_blank" rel="noopener">${esc(s!.publisher || s!.title)}</a>` : esc(s!.publisher || s!.title))).join(" · ");

export function initFacts(data: DB, host: HTMLElement, onGo: (id: string) => void) {
  db = data; go = onGo;
  if (!db.facts.length) return;
  try { muted = sessionStorage.getItem("iem-dyk-off") === "1"; } catch { /* storage blocked */ }
  order = shuffle(db.facts);
  el = document.createElement("aside");
  el.className = "dyk out"; el.setAttribute("aria-live", "polite"); el.setAttribute("aria-label", "הידעת?");
  host.appendChild(el);
  el.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button"); if (!b) return;
    if (b.dataset.a === "close") { hide(); muted = true; try { sessionStorage.setItem("iem-dyk-off", "1"); } catch { /* */ } clearTimeout(timer); }
    if (b.dataset.a === "next") { i++; show(); }
    if (b.dataset.a === "go" && b.dataset.id) { go(b.dataset.id); schedule(); }
  });
  el.addEventListener("mouseenter", () => clearTimeout(timer));
  el.addEventListener("mouseleave", () => schedule());
  // start once the map is on screen
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting && !muted) { io.disconnect(); timer = window.setTimeout(show, 9000); } }, { threshold: 0.25 });
  io.observe(host);
}

function show() {
  if (muted || !order.length) return;
  const f = order[i % order.length];
  el.innerHTML = `<span class="bulb" aria-hidden="true">?</span>
    <span class="t">הידעת? <button type="button" class="x" data-a="close" aria-label="הסתרת העובדות">×</button></span>
    <p>${esc(f.text)}</p>
    <div class="ft">${f.focus ? `<button type="button" data-a="go" data-id="${esc(f.focus)}">הצגה במפה</button>` : ""}<button type="button" data-a="next">עובדה נוספת</button><span>מקור: ${srcLine(f)}</span></div>`;
  el.classList.remove("out");
  schedule();
}
function hide() { el.classList.add("out"); }
function schedule() {
  clearTimeout(timer);
  if (muted) return;
  // stay up for a while, rest, then the next one
  timer = window.setTimeout(() => { hide(); timer = window.setTimeout(() => { i++; show(); }, reduced ? 2000 : 26000); }, 14000);
}

export function factsBlock(data: DB, n = 3) {
  const fs = shuffle(data.facts).slice(0, n);
  if (!fs.length) return "";
  return `<h3>הידעת?</h3><div class="dyklist">${fs.map((f) => `<div class="it" ${f.focus ? `data-go="${esc(f.focus)}" role="button" tabindex="0"` : ""}><b>הידעת?</b>${esc(f.text)}</div>`).join("")}</div>`;
}
