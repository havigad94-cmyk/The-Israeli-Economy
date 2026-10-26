// Data wave 2 (25 October 2026): airlines, the parties running in the 26th Knesset election (27 Oct 2026)
// with their documented funding, and financial figures (financials.json). Safe to re-run.
// Run: node scripts/wave2-aviation-elections-finance.cjs
const fs = require("fs");
const path = require("path");
const P = (f) => path.join(__dirname, "..", "public", "data", f);
const read = (f, d) => (fs.existsSync(P(f)) ? JSON.parse(fs.readFileSync(P(f), "utf8")) : d);
const write = (f, d) => fs.writeFileSync(P(f), JSON.stringify(d, null, 1) + "\n");
const sectors = read("sectors.json"), nodes = read("nodes.json"), edges = read("edges.json"), sources = read("sources.json"), stories = read("stories.json");
const biz = require("./bizportal-2026-10-25.json");
sectors.aviation = "תעופה";

const ACC = "2026-10-25";
const S = (id, type, title, publisher, url, published) => ({ id, type, title, publisher, url, published, accessed: ACC, needsLink: false });
const newSources = [
  S("bizportal-elal-holders", "official", "אל על: מצבת החזקות בעלי עניין", "ביזפורטל (על פי דיווחי החברה)", "https://www.bizportal.co.il/capitalmarket/quote/stakeholders/1087824", "2025-03-16"),
  S("wiki-eli-rozenberg", "press", "אלי רוזנברג (איש עסקים)", "ויקיפדיה", "https://he.wikipedia.org/wiki/%D7%90%D7%9C%D7%99_%D7%A8%D7%95%D7%96%D7%A0%D7%91%D7%A8%D7%92_(%D7%90%D7%99%D7%A9_%D7%A2%D7%A1%D7%A7%D7%99%D7%9D)", null),
  S("calcalist-rozenberg-permit", "press", "קני רוזנברג קיבל היתר שליטה באל על ביחד עם בנו", "כלכליסט", "https://www.calcalist.co.il/local_news/article/S1Kw5wfFd", null),
  S("globes-israir-holders", "official", "ישראייר גרופ: בעלי עניין", "גלובס (על פי דיווחי החברה)", "https://www.globes.co.il/portal/instrument.aspx?instrumentid=402098&mode=company", null),
  S("calcalist-2023-11-30-israir-arkia", "press", "מגעים בין רמי לוי לאחים נקש למיזוג ישראייר וארקיע", "כלכליסט", "https://www.calcalist.co.il/local_news/article/bknz6x8rt", "2023-11-30"),
  S("israir-about", "official", "אודות ישראייר: נרכשה ב-2021 בידי רמי לוי ושלום חיים", "ישראייר", "https://www.israir.co.il/en-US/Passengers_Info/About_Israir", null),
  S("maariv-2026-08-18-dates", "press", "בחירות 2026: כל התאריכים החשובים בדרך לבחירות לכנסת ה-26", "מעריב", "https://www.maariv.co.il/news/politics/article-1357269", "2026-08-18"),
  S("davar-2026-09-08-lists", "press", "38 מפלגות יתמודדו: הסתיימה הגשת הרשימות לכנסת ה-26", "דבר", "https://www.davar1.co.il/696375/", "2026-09-08"),
  S("idi-2026-lists", "press", "בחירות 2026: הרשימות המתמודדות", "המכון הישראלי לדמוקרטיה", "https://www.idi.org.il/policy/parties-and-elections/elections/2026-1/", null),
  S("n12-2026-09-22-poll", "press", "סקר המנדטים של חדשות 12 (מדגם, 22.9.2026)", "חדשות 12", "https://www.mako.co.il/news-israel-elections/2026/Article-fad59e819c9c0a1027.htm", "2026-09-22"),
  S("calcalist-2026-08-29-funding", "press", "המפלגות יקבלו כ-210 מיליון ₪ מקדמות: ערבויות, תרומות והלוואות", "כלכליסט", "https://www.calcalist.co.il/article/bymoptxoze", "2026-08-29"),
  S("ice-2026-08-29-funding", "press", "מקדמות המימון לבחירות 2026 וערבויות המפלגות החדשות", "ice", "https://www.ice.co.il/local-news/news/article/1127614", "2026-08-29"),
  S("bizportal-delek-holders", "official", "קבוצת דלק: מצבת החזקות בעלי עניין", "ביזפורטל (על פי דיווחי החברה)", "https://www.bizportal.co.il/gazandoil/quote/stakeholders/1084128", "2026-07-19"),
  S("calcalist-2026-04-26-advances", "press", "המפלגות יקבלו מקדמות של 137 מיליון שקל לבחירות, והחובות רק ימשיכו להיערם", "כלכליסט", "https://www.calcalist.co.il/local_news/article/rkhomb96zx", "2026-04-26"),
];
Object.entries(biz).forEach(([id, v]) => newSources.push(S("bizportal-fin-" + id, "official", `${v.name}: מבט כללי ונתונים כספיים`, "ביזפורטל (על פי הדוחות הכספיים)", v.url, ACC)));

const N = (id, type, name, sector, summary, srcs, extra = {}) => ({ id, type, name, sector, geo: "ישראל", abroad: false, summary, sources: srcs, ...extra });
const newNodes = [
  // airlines
  N("elal", "company", "אל על", "aviation", "חברת התעופה הלאומית, ציבורית. בשליטת משפחת רוזנברג דרך כנפי נשרים תעופה.", ["bizportal-elal-holders", "wiki-eli-rozenberg"], { key: true }),
  N("kanfei", "company", "כנפי נשרים תעופה", "hold", "חברת האחזקות שהקים אלי רוזנברג ביולי 2020, ושדרכה נרכשה השליטה באל על.", ["wiki-eli-rozenberg"]),
  N("rozenbergfam", "family", "משפחת רוזנברג (קני ואלי)", null, "קני רוזנברג ובנו אלי, בעלי היתר השליטה באל על.", ["calcalist-rozenberg-permit", "wiki-eli-rozenberg"]),
  N("israir", "company", "ישראייר גרופ", "aviation", "חברת תעופה ותיירות ציבורית, נרכשה ב-2021 בידי רמי לוי ושלום חיים.", ["israir-about", "globes-israir-holders"], { key: true }),
  N("shaiodem", "company", "שי אודם", "hold", "חברת האחזקות של רמי לוי ושלום חיים בישראייר.", ["calcalist-2023-11-30-israir-arkia", "globes-israir-holders"]),
  N("shalomhaim", "person", "שלום חיים", null, "שותף של רמי לוי בשליטה בישראייר.", ["israir-about", "calcalist-2023-11-30-israir-arkia"]),
  N("arkia", "company", "ארקיע", "aviation", "חברת תעופה פרטית. ב-2023 דווח על מגעים למיזוג עם ישראייר, בכפוף לרשות התחרות.", ["calcalist-2023-11-30-israir-arkia"]),
  N("nakash", "family", "האחים נקש", null, "בעלי השליטה בארקיע (70%, 2023).", ["calcalist-2023-11-30-israir-arkia"]),
  N("arkiaworkers", "company", "תו\"ת תעופה ותיירות (עובדי ארקיע)", "hold", "החברה שבה מאוגדים עובדי ארקיע המחזיקים ביתרת המניות.", ["calcalist-2023-11-30-israir-arkia"]),
  // parties running on 27 Oct 2026 (seat projection: N12 / Midgam, 22.9.2026)
  N("democrats", "party", "הדמוקרטים", null, "בראשות יאיר גולן (העבודה ומרצ). סקר חדשות 12 (22.9.2026): 9 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll"], { role: "מתמודדת בבחירות 2026" }),
  N("yisraelbeytenu", "party", "ישראל ביתנו", null, "בראשות אביגדור ליברמן. סקר חדשות 12 (22.9.2026): 9 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll"], { role: "מתמודדת בבחירות 2026" }),
  N("shas", "party", "ש\"ס", null, "בראשות אריה דרעי. סקר חדשות 12 (22.9.2026): 7 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll", "davar-2026-09-08-lists"], { role: "מתמודדת בבחירות 2026" }),
  N("utj", "party", "יהדות התורה", null, "דגל התורה, אגודת ישראל וחומת תורת ישראל. סקר חדשות 12 (22.9.2026): 8 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll", "davar-2026-09-08-lists"], { role: "מתמודדת בבחירות 2026" }),
  N("otzma", "party", "עוצמה יהודית", null, "בראשות איתמר בן גביר. סקר חדשות 12 (22.9.2026): 6 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll"], { role: "מתמודדת בבחירות 2026" }),
  N("rz", "party", "הציונות הדתית וזהות", null, "בראשות בצלאל סמוטריץ', בריצה משותפת עם זהות של משה פייגלין. סקר חדשות 12 (22.9.2026): 5 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll", "davar-2026-09-08-lists"], { role: "מתמודדת בבחירות 2026" }),
  N("jointlist", "party", "הרשימה המשותפת", null, "חד\"ש, תע\"ל ובל\"ד, בראשות יוסף ג'בארין. סקר חדשות 12 (22.9.2026): 7 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll", "davar-2026-09-08-lists"], { role: "מתמודדת בבחירות 2026" }),
  N("raam", "party", "רע\"מ", null, "בראשות מנסור עבאס. סקר חדשות 12 (22.9.2026): 5 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll"], { role: "מתמודדת בבחירות 2026" }),
  N("amcha", "party", "עמך ישראל", null, "בראשות האלוף במיל' עופר וינטר (ברשם המפלגות: \"עמי חי לעולם\"). סקר חדשות 12 (22.9.2026): 4 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll", "calcalist-2026-08-29-funding"], { role: "מתמודדת בבחירות 2026" }),
  N("miluimnikim", "party", "המילואימניקים", null, "בראשות יועז הנדל, במיזוג עם כלכלית (ירון זליכה) ועוז (עינת וילף). סקר חדשות 12 (22.9.2026): 4 מנדטים.", ["idi-2026-lists", "n12-2026-09-22-poll", "davar-2026-09-08-lists"], { role: "מתמודדת בבחירות 2026" }),
  N("foreman", "donor", "ג'יי פורמן", null, "מנכ\"ל ונשיא Basic Fun. ערב לעמך ישראל ב-2.95 מיליון ₪.", ["calcalist-2026-08-29-funding"], { role: "ערב" }),
  N("rachamim", "donor", "אברהם רחמים", null, "בעלי לוטוס ירושלים. ערב לעמך ישראל ב-125 אלף ₪.", ["calcalist-2026-08-29-funding"], { role: "ערב" }),
  N("greenwald", "donor", "יונתן גרינוולד", null, "איש עסקים ממיאמי. הלווה לעמך ישראל 14 אלף ₪; בעבר נתן ערבויות של 4.1 מיליון ₪ לימינה ולתקווה חדשה.", ["calcalist-2026-08-29-funding"], { role: "מלווה" }),
  N("halef", "donor", "יונתן חלף", null, "מקרן הגידור ION. בין הערבים למילואימניקים (סך הערבויות למפלגה: 1.6 מיליון ₪).", ["calcalist-2026-08-29-funding"], { role: "ערב" }),
];

let ec = 0;
const E = (from, to, kind, share, label, srcs, conf, asOf, note = "", extra = {}) => ({ id: "w2-" + String(++ec).padStart(3, "0"), from, to, kind, share, label, note, former: false, asOf, confidence: conf, sources: srcs, ...extra });
const newEdges = [
  E("rozenbergfam", "kanfei", "ownership", null, "בעלות", ["wiki-eli-rozenberg", "calcalist-rozenberg-permit"], "press", null),
  E("kanfei", "elal", "ownership", 48.1, "48.1%", ["bizportal-elal-holders", "wiki-eli-rozenberg"], "official", "2025-03-16", "בדיווח בעלי העניין רשום אלי זכריה רוזנברג"),
  E("ramilevy", "shaiodem", "ownership", null, "שליטה משותפת", ["calcalist-2023-11-30-israir-arkia"], "press", "2023-11-30"),
  E("shalomhaim", "shaiodem", "ownership", null, "שליטה משותפת", ["calcalist-2023-11-30-israir-arkia"], "press", "2023-11-30"),
  E("shaiodem", "israir", "ownership", 36.51, "36.51%", ["globes-israir-holders", "calcalist-2023-11-30-israir-arkia"], "official", null),
  E("ramilevy", "israir", "ownership", 20.65, "20.65%", ["globes-israir-holders"], "official", null, "בנוסף לחלקו דרך שי אודם"),
  E("nakash", "arkia", "ownership", 70, "70%", ["calcalist-2023-11-30-israir-arkia"], "press", "2023-11-30"),
  E("arkiaworkers", "arkia", "ownership", 30, "יתרת המניות", ["calcalist-2023-11-30-israir-arkia"], "estimate", "2023-11-30", "לפי כלכליסט: עובדי החברה מחזיקים ביתרה דרך תו\"ת; השיעור המדויק לא צוין"),
  // party funding 2026
  E("knessetfund", "likud", "public-funding", null, "מקדמה 46.8M ₪", ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"], "press", "2026-08-29", "לפי 32 מנדטים בכנסת היוצאת", { amount: 46800000, currency: "ILS" }),
  E("knessetfund", "rz", "public-funding", null, "מקדמה 10.2M ₪", ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"], "press", "2026-08-29", "המקדמה המלאה לפי החוק", { amount: 10200000, currency: "ILS" }),
  E("foreman", "amcha", "guarantee", null, "ערבות 2.95M ₪", ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"], "press", "2026-08-29", "", { amount: 2950000, currency: "ILS" }),
  E("rachamim", "amcha", "guarantee", null, "ערבות 125K ₪", ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"], "press", "2026-08-29", "", { amount: 125000, currency: "ILS" }),
  E("greenwald", "amcha", "donation", null, "הלוואה 14K ₪", ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"], "press", "2026-08-29", "הלוואה", { amount: 14000, currency: "ILS" }),
  E("discount", "amcha", "political", null, "הלוואה 200K ₪", ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"], "press", "2026-08-29", "הלוואה בנקאית למפלגה", { amount: 200000, currency: "ILS" }),
  E("halef", "miluimnikim", "guarantee", null, "ערבות", ["calcalist-2026-08-29-funding"], "press", "2026-08-29", "סכום הערבות שלו לא פורסם; סך הערבויות למפלגה 1.6 מיליון ₪"),
];

// ---------- financials ----------
const pick = (v, label) => { const i = v.periods.indexOf("Y/2025"); const r = v.rows[label]; return r ? r[i] : null; };
const q = (v, label, per) => { const i = v.periods.indexOf(per); const r = v.rows[label]; return r && i >= 0 ? r[i] : null; };
const financials = {};
Object.entries(biz).forEach(([id, v]) => {
  const bank = !!v.rows["רווח מפעולות מימון"];
  const revLabel = bank ? "רווח מפעולות מימון" : "הכנסות";
  financials[id] = {
    kind: "listed", unit: "אלפי ₪", security: v.sec,
    marketCap: v.marketCap, marketCapAsOf: ACC,
    fy2025: { revenue: pick(v, revLabel), revenueLabel: bank ? "רווח מפעולות מימון" : v.rows["הכנסות"] ? "הכנסות" : null, netProfit: pick(v, "רווח נקי"), equity: pick(v, "הון עצמי"), assets: pick(v, "סך מאזן") },
    q2: { 2026: { revenue: q(v, revLabel, "Q2/2026"), netProfit: q(v, "רווח נקי", "Q2/2026") }, 2025: { revenue: q(v, revLabel, "Q2/2025"), netProfit: q(v, "רווח נקי", "Q2/2025") } },
    note: ["icl", "israelcorp", "elbit", "newmed", "isramco", "tamarpet", "ratio", "opc", "israir"].includes(id) ? "החברה מדווחת בדולרים; הנתונים בהמרה לשקלים כפי שמוצגים בביזפורטל." : id === "israelcorp" ? "" : "",
    sources: ["bizportal-fin-" + id],
  };
});
financials.israelcorp.note = "הכנסות מאוחדות, כולל ICL. החברה מדווחת בדולרים; הנתונים בהמרה לשקלים כפי שמוצגים בביזפורטל.";
// party money for the 2026 election (₪)
const party = (id, o, srcs) => (financials[id] = { kind: "party", unit: "₪", ...o, sources: srcs });
party("likud", { advance: 46800000, debtApr2026: 16800000 }, ["calcalist-2026-08-29-funding", "calcalist-2026-04-26-advances"]);
party("yeshatid", { advance: 35200000, debtApr2026: 5380000, note: "אם תקבל פחות מנדטים מהיום תצטרך הלוואה מהכנסת" }, ["calcalist-2026-08-29-funding", "calcalist-2026-04-26-advances"]);
party("beyachad", { guarantees: 33000000, guaranteesUsed: 10000000, note: "ערבויות שגייסה בנט 2026 לפני האיחוד עם יש עתיד" }, ["calcalist-2026-08-29-funding"]);
party("yashar", { advanceEligible: 18300000, guarantees: 16600000, donations: 2000000 }, ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"]);
party("bluewhite", { advance: 11700000, debtApr2026: 3300000, note: "גנץ הודיע ב-19.10.2026 על פרישה מהמרוץ" }, ["calcalist-2026-08-29-funding", "calcalist-2026-04-26-advances"]);
party("rz", { advance: 10200000 }, ["calcalist-2026-08-29-funding"]);
party("shas", { advanceEstApr: 12600000 }, ["calcalist-2026-04-26-advances"]);
party("yisraelbeytenu", { advanceEstApr: 6800000, debtApr2026: 2900000 }, ["calcalist-2026-04-26-advances"]);
party("otzma", { advanceEstApr: 5730000, debtApr2026: 738000 }, ["calcalist-2026-04-26-advances"]);
party("raam", { debtApr2026: 3000000 }, ["calcalist-2026-04-26-advances"]);
party("democrats", { debtApr2026: 2600000, note: "החוב הוא של מפלגת העבודה, החברה בדמוקרטים" }, ["calcalist-2026-04-26-advances"]);
party("utj", { debtApr2026: 4500000, note: "דגל התורה 2.4 מיליון ₪ ואגודת ישראל 2.1 מיליון ₪" }, ["calcalist-2026-04-26-advances"]);
party("amcha", { guarantees: 3225000, loans: 214000 }, ["calcalist-2026-08-29-funding", "ice-2026-08-29-funding"]);
party("miluimnikim", { guarantees: 1600000 }, ["calcalist-2026-08-29-funding"]);

// Tshuva's stake in Delek Group from the interested-parties filing
const tz = edges.find((e) => e.from === "tashluz" && e.to === "delek");
if (tz) Object.assign(tz, { share: 50.44, label: "50.44%", asOf: "2026-07-19", confidence: "official", sources: [...new Set(["bizportal-delek-holders", ...tz.sources])], note: "50.44% בהון ו-50.81% בהצבעה, לפי דיווח בעלי העניין" });
const upsert = (arr, items) => { const ids = new Set(items.map((x) => x.id)); return [...arr.filter((x) => !ids.has(x.id)), ...items]; };
const outNodes = upsert(nodes, newNodes);
["likud", "yeshatid", "yashar", "beyachad"].forEach((id) => { const n = outNodes.find((x) => x.id === id); if (n && !/סקר חדשות 12/.test(n.summary)) n.summary += ` סקר חדשות 12 (22.9.2026): ${{ likud: 20, yeshatid: "במסגרת ביחד", yashar: 23, beyachad: 13 }[id]}${id === "yeshatid" ? "" : " מנדטים"}.`; });
const bw = outNodes.find((x) => x.id === "bluewhite"); if (bw && !/מתחת לאחוז החסימה/.test(bw.summary)) bw.summary += " בסקר חדשות 12 (22.9.2026) הייתה מתחת לאחוז החסימה (0.7%).";

stories.splice(stories.findIndex((s) => s.id === "funding"), 1, {
  id: "funding", title: "בחירות 2026", summary: "הבחירות לכנסת ה-26 ב-27.10.2026: המפלגות, המימון והקשרים המתועדים לגורמים במשק.",
  steps: [
    { title: "38 רשימות", text: "38 רשימות הוגשו לבחירות של 27 באוקטובר 2026. במפה מופיעות הרשימות שעברו את אחוז החסימה בסקר חדשות 12 מ-22.9.2026, וכחול לבן שפרשה.", view: "cols", types: ["company", "institution", "gov"] },
    { title: "ישר!", text: "ערבויות בסך כ-16.6 מיליון ₪ ותרומות של כ-2 מיליון ₪. בין הערבים: משפחת אקירוב ושמואל חרל\"פ מכלמוביל.", view: "radial", focus: "yashar" },
    { title: "ביחד", text: "איחוד של בנט 2026 ויש עתיד. בנט 2026 גייסה ערבויות של 33 מיליון ₪ וניצלה 10 מיליון.", view: "radial", focus: "beyachad" },
    { title: "עמך ישראל", text: "ערבויות של 3.225 מיליון ₪, רובן (2.95 מיליון) מג'יי פורמן, והלוואה של 200 אלף ₪ מבנק דיסקונט.", view: "radial", focus: "amcha" },
    { title: "מימון ממלכתי", text: "הכנסת מעבירה כ-210 מיליון ₪ מקדמות. הליכוד מקבל את הגדולה: 46.8 מיליון ₪.", view: "radial", focus: "knessetfund" },
  ],
});
if (stories.some((s) => s.id === "aviation")) stories.splice(stories.findIndex((s) => s.id === "aviation"), 1);
stories.splice(stories.findIndex((s) => s.id === "ofer"), 0, {
  id: "aviation", title: "תעופה", summary: "מי שולט באל על, בישראייר ובארקיע.",
  steps: [
    { title: "שלוש חברות התעופה", text: "אל על בשליטת משפחת רוזנברג (48.1%), ישראייר בשליטת רמי לוי ושלום חיים, וארקיע בשליטת האחים נקש.", view: "free", only: ["elal", "kanfei", "rozenbergfam", "israir", "shaiodem", "shalomhaim", "ramilevy", "arkia", "nakash", "arkiaworkers"], expand: ["rozenbergfam", "kanfei", "shaiodem", "nakash", "ramilevy", "shalomhaim", "arkiaworkers"] },
    { title: "רמי לוי", text: "מלבד רשת השיווק, רמי לוי שולט בישראייר יחד עם שלום חיים: 36.51% דרך שי אודם ו-20.65% ישירות.", view: "tree", focus: "ramilevy", expand: ["ramilevy", "shaiodem"] },
  ],
});

write("sectors.json", sectors);
write("nodes.json", outNodes);
write("edges.json", upsert(edges, newEdges));
write("sources.json", upsert(sources, newSources));
write("stories.json", stories);
write("financials.json", financials);
console.log("nodes +", newNodes.length, "edges +", newEdges.length, "sources +", newSources.length, "financial records", Object.keys(financials).length);
