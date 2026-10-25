// Import rows from a spreadsheet (saved as CSV, UTF-8) into the data files, then run the same checks as the build.
// Usage:
//   node scripts/import-csv.mjs nodes my-nodes.csv
//   node scripts/import-csv.mjs edges my-edges.csv
//   node scripts/import-csv.mjs sources my-sources.csv
// Columns follow the JSON fields. Lists (sources) are separated by "|". A row whose id already exists replaces it.
//   nodes:   id,type,name,nameEn,sector,geo,abroad,summary,sources
//   edges:   id,from,to,kind,share,label,note,former,asOf,confidence,sources,amount,currency
//   sources: id,type,title,publisher,url,published,accessed
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const [kind, file] = process.argv.slice(2);
if (!["nodes", "edges", "sources"].includes(kind) || !file) { console.error("usage: node scripts/import-csv.mjs nodes|edges|sources file.csv"); process.exit(1); }

function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const text = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
const [head, ...rows] = parseCSV(text);
const cols = head.map((h) => h.trim());
const num = new Set(["share", "amount"]), bool = new Set(["abroad", "former"]), list = new Set(["sources"]);
const items = rows.map((r) => {
  const o = {};
  cols.forEach((c, i) => {
    let v = (r[i] ?? "").trim();
    if (v === "") { if (list.has(c)) o[c] = []; else if (num.has(c)) o[c] = null; return; }
    if (num.has(c)) o[c] = Number(v);
    else if (bool.has(c)) o[c] = /^(1|true|כן|yes)$/i.test(v);
    else if (list.has(c)) o[c] = v.split("|").map((x) => x.trim()).filter(Boolean);
    else o[c] = v;
  });
  if (kind === "sources") { o.accessed ??= new Date().toISOString().slice(0, 10); o.needsLink = !o.url; }
  if (kind === "edges") { o.confidence ??= "press"; o.former ??= false; o.label ??= o.share != null ? `${o.share}%` : ""; }
  return o;
});

const path = new URL(`../public/data/${kind}.json`, import.meta.url);
const current = JSON.parse(fs.readFileSync(path, "utf8"));
const ids = new Set(items.map((x) => x.id));
const merged = [...current.filter((x) => !ids.has(x.id)), ...items];
fs.writeFileSync(path, JSON.stringify(merged, null, 1) + "\n");
console.log(`${items.length} ${kind} imported (${merged.length} total)`);
try { execFileSync("node", [new URL("./validate.mjs", import.meta.url).pathname], { stdio: "inherit" }); }
catch { console.error("The data check failed. Fix the rows above, or restore the previous file from git."); process.exit(1); }
