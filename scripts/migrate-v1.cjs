// One-time migration: turns the data arrays of version 1 (single HTML page) into
// data/nodes.json, data/edges.json and data/sources.json in the version 2 schema.
// Run: node scripts/migrate-v1.cjs
const fs = require("fs");
const path = require("path");
const { SECTORS, F, C, E: E0, P, PE, POLNOTE } = require("./legacy-data.js");
const E = [...E0, ...PE.map(([a, b, c, d]) => [a, b, c, d, "p"])];
const legacyLis = require("./legacy-sources.json");

const IL = "ישראל";
const out = (f, d) => fs.writeFileSync(path.join(__dirname, "..", "public", "data", f), JSON.stringify(d, null, 1) + "\n");
const strip = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// ---------- sources ----------
const sources = [];
const official = /20-F|מצבת|דוח שנתי|דוח כספי|מצגת|בנק ישראל|אתר החברה|אתר קבוצת|הודעת החברה|מחזיקים מהותיים|בעלי עניין/;
legacyLis.forEach((li, i) => {
  const t = strip(li);
  sources.push({
    id: "v1-" + String(i + 1).padStart(2, "0"),
    type: official.test(t) ? "official" : "press",
    title: t,
    publisher: null,
    url: null,
    published: null,
    accessed: "2026-10-25",
    needsLink: true,
  });
});
sources.push({ id: "v1-general", type: "press", title: "רשימת המקורות של גרסה 1 (הקשר לא שויך למקור מסוים)", publisher: null, url: null, published: null, accessed: "2026-10-25", needsLink: true });

// Direct links gathered while adding Tnuva, Tshuva and Arison (October 2026)
const direct = [
  ["ice-2026-03-19-tshuva", "press", "יצחק תשובה: ממעברת עולים לאימפריית הנדל\"ן והגז של ישראל", "ice", "https://www.ice.co.il/business-dictionary/news/article/1106685", "2026-03-19"],
  ["ice-2026-03-25-delek-fy25", "press", "קבוצת דלק: תוצאות 2025, איבוד השליטה באיתקה והשלמת רכישת ישראכרט", "ice", "https://www.ice.co.il/finance/news/article/1107399", "2026-03-25"],
  ["delek-site", "official", "אודות קבוצת דלק", "קבוצת דלק", "https://delek-group.com/אודות-קבוצת-דלק/", null],
  ["inplay-2025-08-07", "official", "InPlay Oil Corp. Announces Closing of Delek Group Ltd.'s Acquisition of InPlay Common Shares", "InPlay Oil", "https://dashboard.channelchek.com/release-inplay-oil-corp-announces-closing-of-delek-group-ltd-s-acquisition-of-inplay-common-shares/", "2025-08-07"],
  ["globes-2020-08-05-elad-canada", "press", "Yitzhak Tshuva agrees partial sale of Elad Canada Realty", "Globes", "https://en.globes.co.il/en/article-yitzhak-tshuva-sells-elad-canada-assets-1001338317", "2020-08-05"],
  ["globes-2021-11-01-elad-residence", "press", "Yitzhak Tshuva sells remaining Elad Residence stake", "Globes", "https://en.globes.co.il/en/article-yitzhak-tshuva-sells-remaining-elad-residence-stake-1001389290", "2021-11-01"],
  ["calcalist-2021-08-26-tnuva", "press", "בעלי המניות בתנובה: ברייט פוד והקיבוצים", "כלכליסט", "https://www.calcalist.co.il/market/article/hjhh11ze11y", "2021-08-26"],
  ["calcalist-2019-09-16-tnuva", "press", "גרנות והקיבוצים בתנובה", "כלכליסט", "https://www.calcalist.co.il/articles/0,7340,L-3770424,00.html", "2019-09-16"],
  ["ice-2026-05-21-tnuva", "press", "תנובה: חברות הבת והמותגים, לקראת הנפקה", "ice", "https://www.ice.co.il/finance/news/article/1113711", "2026-05-21"],
  ["boi-2018-09-04-hapoalim", "official", "שינוי מבנה השליטה בבנק הפועלים", "בנק ישראל", "https://boi.org.il/publications/pressreleases/שינוי-מבנה-השליטה-בבנק-הפועלים/", "2018-09-04"],
  ["walla-2015-07-19-arison", "press", "אריסון שוקלת להכניס שותף לגרעין השליטה בפועלים (20.2%)", "גלובס / וואלה", "https://finance.walla.co.il/item/2874129", "2015-07-19"],
];
direct.forEach(([id, type, title, publisher, url, published]) => sources.push({ id, type, title, publisher, url, published, accessed: "2026-10-25", needsLink: false }));

// ---------- nodes ----------
const nodes = [];
F.forEach((f) =>
  nodes.push({
    id: f.id,
    type: f.name.startsWith("משפחת") ? "family" : "person",
    name: f.name,
    sector: null,
    geo: null,
    wealth: f.w || null,
    summary: f.d || "",
    minor: !!f.minor,
    political_note: POLNOTE[f.id] || null,
    sources: [],
  })
);
C.forEach((c) =>
  nodes.push({
    id: c.id,
    type: c.inst ? "institution" : "company",
    name: c.name,
    sector: c.s,
    geo: c.geo || IL,
    abroad: !!(c.geo && c.geo !== IL),
    summary: c.v || "",
    key: !!c.star,
    political_note: POLNOTE[c.id] || null,
    sources: [],
  })
);
const partyIds = new Set(["likud", "kulanu", "dash", "jlm", "gop"]);
P.forEach((p) =>
  nodes.push({
    id: p.id,
    type: p.party || partyIds.has(p.id) ? "party" : p.donor ? "donor" : p.id === "knessetfund" ? "state" : "politician",
    name: p.name,
    sector: null,
    geo: p.us ? "ארה\"ב" : IL,
    role: p.kind || null,
    summary: p.d || "",
    sources: [],
  })
);
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

// ---------- edges ----------
const parseAmount = (label) => {
  const m = String(label).match(/([\d.,]+)\s*(K|M|מיליון|אלף)?\s*(₪|\$)/);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, ""));
  const mult = m[2] === "K" || m[2] === "אלף" ? 1e3 : m[2] === "M" || m[2] === "מיליון" ? 1e6 : 1;
  return { amount: Math.round(v * mult), currency: m[3] === "$" ? "USD" : "ILS" };
};
const polKind = (label) => {
  if (/ערבו/.test(label)) return "guarantee";
  if (/תרומ|\$/.test(label)) return "donation";
  if (/מקדמה|זכאות/.test(label)) return "public-funding";
  if (/יו"ר|רכיב|חבר|ח"כ|לשעבר|אז ב/.test(label)) return "affiliation";
  if (/ניגוד|הסדר/.test(label)) return "conflict";
  return "political";
};
const names = (n) => {
  const base = n.name.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const v = [base];
  if (base.startsWith("משפחת ")) v.push(base.slice(6));
  const generic = new Set(["בנק", "קבוצת", "חברת", "משפחת", "מאגר", "רשת", "מלונות", "קרן", "הבנק", "החברה", "מגדלי", "בית"]);
  const tok = base.split(/\s+/);
  if (tok.length > 1 && !generic.has(tok[0])) v.push(tok[0]);
  if (tok.length > 2) v.push(tok.slice(0, 2).join(" "));
  if (tok.length > 1 && generic.has(tok[0])) v.push(tok[1]);
  return v.filter((x) => x.length >= 3);
};
const matchSources = (from, to) => {
  const hits = [];
  legacyLis.forEach((li, i) => {
    const t = strip(li);
    if (names(to).some((x) => t.includes(x)) || (names(from).some((x) => t.includes(x)) && to.type !== "company")) hits.push("v1-" + String(i + 1).padStart(2, "0"));
  });
  return hits.length ? hits.slice(0, 3) : ["v1-general"];
};

const edges = [];
E.forEach(([s, t, p, v, k], i) => {
  if (!byId[s] || !byId[t]) throw new Error("bad edge " + s + " " + t);
  const label = p || "";
  const share = /\d/.test(label) && /%/.test(label) ? parseFloat(label.match(/[\d.]+/)[0]) : null;
  const kind = k === "i" ? "institutional" : k === "p" ? polKind(label) : /זיכיון/.test(label) ? "franchise" : "ownership";
  const e = {
    id: "e" + String(i + 1).padStart(3, "0"),
    from: s,
    to: t,
    kind,
    share,
    label,
    note: v || "",
    former: /לשעבר/.test(label),
    asOf: null,
    confidence: "press",
    sources: matchSources(byId[s], byId[t]),
  };
  if (k === "p") { Object.assign(e, parseAmount(label) || {}); if (e.amount && e.kind === "political") e.kind = "donation"; }
  const srcType = e.sources.map((id) => sources.find((x) => x.id === id).type);
  if (srcType.includes("official")) e.confidence = "official";
  edges.push(e);
});

// precise sources for the October 2026 additions
const setSrc = (from, to, ids, conf, asOf) => {
  const e = edges.find((x) => x.from === from && x.to === to);
  if (!e) throw new Error("missing " + from + ">" + to);
  e.sources = ids; e.confidence = conf; if (asOf) e.asOf = asOf;
};
setSrc("tshuva", "tashluz", ["delek-site"], "official");
setSrc("tashluz", "delek", ["delek-site", "ice-2026-03-19-tshuva"], "official");
setSrc("delek", "inplay", ["inplay-2025-08-07"], "official", "2025-08-07");
setSrc("delek", "ithaca", ["ice-2026-03-25-delek-fy25"], "press", "2026-03-25");
setSrc("delek", "isracard", ["ice-2026-03-25-delek-fy25"], "press", "2026-03-25");
setSrc("tshuva", "elad", ["ice-2026-03-19-tshuva"], "press", "2026-03-19");
setSrc("elad", "eladca", ["globes-2020-08-05-elad-canada"], "press", "2020-08-05");
setSrc("brightfood", "tnuva", ["calcalist-2021-08-26-tnuva"], "press", "2021-08-26");
setSrc("kibbutzorg", "tnuva", ["calcalist-2021-08-26-tnuva", "calcalist-2019-09-16-tnuva"], "press", "2021-08-26");
["maadanot", "tiratzvi", "sanfrost"].forEach((c) => setSrc("tnuva", c, ["ice-2026-05-21-tnuva"], "press", "2026-05-21"));
setSrc("arison", "hapoalim", ["boi-2018-09-04-hapoalim", "walla-2015-07-19-arison"], "official", "2018-09-04");
byId.tshuva.sources = ["ice-2026-03-19-tshuva", "globes-2021-11-01-elad-residence"];
byId.arison.sources = ["boi-2018-09-04-hapoalim"];
byId.tnuva.sources = ["ice-2026-05-21-tnuva"];

out("sectors.json", SECTORS);
out("nodes.json", nodes);
out("edges.json", edges);
out("sources.json", sources);
console.log("nodes", nodes.length, "edges", edges.length, "sources", sources.length);
console.log("edges on general source", edges.filter((e) => e.sources[0] === "v1-general").length);
const kinds = {}; edges.forEach((e) => (kinds[e.kind] = (kinds[e.kind] || 0) + 1)); console.log(kinds);
const types = {}; nodes.forEach((n) => (types[n.type] = (types[n.type] || 0) + 1)); console.log(types);
