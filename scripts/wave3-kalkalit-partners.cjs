// Data wave 3 (26 October 2026): the Economic Party (הכלכלית) of Yaron Zelekha, running in 2026 on the joint list
// "המילואימניקים והכלכלית" with Yoaz Hendel, updated guarantees for the joint list, and the partnerships story.
// Safe to re-run; run after wave 2. Run: node scripts/wave3-kalkalit-partners.cjs
const fs = require("fs");
const path = require("path");
const P = (f) => path.join(__dirname, "..", "public", "data", f);
const read = (f) => JSON.parse(fs.readFileSync(P(f), "utf8"));
const write = (f, d) => fs.writeFileSync(P(f), JSON.stringify(d, null, 1) + "\n");
const nodes = read("nodes.json"), edges = read("edges.json"), sources = read("sources.json"), stories = read("stories.json"), fins = read("financials.json");

const ACC = "2026-10-26";
const S = (id, type, title, publisher, url, published) => ({ id, type, title, publisher, url, published, accessed: ACC, needsLink: false });
const newSources = [
  S("kan-2026-09-08-lists", "press", "בחירות 2026: כל המפלגות הגישו את רשימותיהן. הרשימות המלאות", "כאן חדשות", "https://www.kan.org.il/content/kan-news/politic/1097401/", "2026-09-08"),
  S("idi-2026-miluim-kalkalit", "press", "המילואימניקים והכלכלית: רשימת המועמדים לכנסת ה-26", "המכון הישראלי לדמוקרטיה", "https://www.idi.org.il/media/32315/%D7%94%D7%9E%D7%99%D7%9C%D7%95%D7%90%D7%99%D7%9E%D7%A0%D7%99%D7%A7%D7%99%D7%9D-%D7%95%D7%94%D7%9B%D7%9C%D7%9B%D7%9C%D7%99%D7%AA.pdf", "2026-09-07"),
  S("inn-2026-09-06-hendel-zelekha", "press", "יועז הנדל וירון זליכה יתמודדו ברשימה משותפת", "ערוץ 7", "https://www.inn.co.il/news/705730", "2026-09-06"),
  S("calcalist-2026-09-23-guarantees", "press", "לקראת הבחירות: וינטר גייס עוד ערבויות ב-3 מיליון שקל, בנט ב-1.5 מיליון", "כלכליסט", "https://www.calcalist.co.il/local_news/article/hj6roybczx", "2026-09-23"),
  S("davar-2026-10-21-zelekha", "press", "\"מי מפחד מירון זליכה\": המפלגה הכלכלית מציעה ימין כלכלי עם כוכבית", "דבר", "https://www.davar1.co.il/702810/", "2026-10-21"),
  S("globes-2021-03-16-zelekha", "press", "דילמה יקרה: כמה יעלה לירון זליכה לפרוש מהמרוץ לכנסת?", "גלובס", "https://www.globes.co.il/news/article.aspx?did=1001364239", "2021-03-16"),
  S("walla-2021-03-26-zelekha", "press", "זליכה התעקש להתמודד בבחירות למרות הסקרים, ולא יזכה למימון מטעם המדינה", "וואלה", "https://elections.walla.co.il/item/3425859", "2021-03-26"),
];
const N = (id, type, name, summary, srcs, extra = {}) => ({ id, type, name, sector: null, geo: "ישראל", abroad: false, summary, sources: srcs, ...extra });
const newNodes = [
  N("kalkalit", "party", "המפלגה הכלכלית", "בראשות פרופ' ירון זליכה, החשב הכללי לשעבר. ב-2026 מתמודדת ברשימה משותפת עם המילואימניקים של יועז הנדל (זליכה במקום 2). בבחירות 2021 קיבלה 0.79% מהקולות ולא עברה את אחוז החסימה.", ["kan-2026-09-08-lists", "idi-2026-miluim-kalkalit", "walla-2021-03-26-zelekha"], { role: "מתמודדת בבחירות 2026 (ברשימה משותפת)", political_note: "זליכה מציג את עצמו כמתנגד לטייקונים ולמונופולים, וטוען שבניגוד ליריביו לא קיבל ערבויות מבעלי הון (דבר, 21.10.2026). לא פורסמו סכומים לגיוס של המפלגה ב-2026." }),
  N("zelekha", "politician", "ירון זליכה", "החשב הכללי במשרד האוצר בשנים 2003–2007, יו\"ר המפלגה הכלכלית. מקום 2 ברשימת המילואימניקים והכלכלית.", ["davar-2026-10-21-zelekha", "kan-2026-09-08-lists"], { role: "יו\"ר המפלגה הכלכלית" }),
  N("hendel", "politician", "יועז הנדל", "יו\"ר המילואימניקים ומקום 1 ברשימה המשותפת עם המפלגה הכלכלית. שר התקשורת לשעבר.", ["kan-2026-09-08-lists", "inn-2026-09-06-hendel-zelekha"], { role: "יו\"ר המילואימניקים" }),
  N("modirosen", "donor", "מודי רוזן", "איש הייטק והון סיכון. ערב למפלגה הכלכלית ב-1.1 מיליון ₪ בבחירות 2021.", ["globes-2021-03-16-zelekha"], { role: "ערב (2021)" }),
];
const E = (id, from, to, kind, label, o = {}) => ({ id, from, to, kind, share: null, label, former: false, confidence: "press", ...o });
const newEdges = [
  E("w3-001", "kalkalit", "miluimnikim", "affiliation", "רשימה משותפת", { note: "\"המילואימניקים והכלכלית\": הנדל, זליכה, עינת וילף, חביב ווליבוביץ, יואב שלמה אדומי", asOf: "2026-09-08", sources: ["kan-2026-09-08-lists", "idi-2026-miluim-kalkalit"] }),
  E("w3-002", "zelekha", "kalkalit", "office", "יו\"ר המפלגה", { asOf: "2026-09-08", sources: ["kan-2026-09-08-lists", "davar-2026-10-21-zelekha"] }),
  E("w3-003", "hendel", "miluimnikim", "office", "יו\"ר המפלגה", { asOf: "2026-09-08", sources: ["kan-2026-09-08-lists"] }),
  E("w3-004", "zelekha", "kalkalit", "guarantee", "ערבות עצמית (2021)", { amount: 1600000, currency: "ILS", former: true, asOf: "2021-03-16", note: "בבחירות 2021, בשתי פעימות: 1.1 מיליון ו-500 אלף ₪", sources: ["globes-2021-03-16-zelekha"] }),
  E("w3-005", "modirosen", "kalkalit", "guarantee", "ערבות (2021)", { amount: 1100000, currency: "ILS", former: true, asOf: "2021-03-16", sources: ["globes-2021-03-16-zelekha"] }),
];

const upsert = (arr, items) => items.forEach((x) => { const i = arr.findIndex((y) => y.id === x.id); i < 0 ? arr.push(x) : (arr[i] = x); });
upsert(sources, newSources);
upsert(nodes, newNodes);
upsert(edges, newEdges);

// the joint list: guarantees grew to 2M ₪ (11 guarantees) by 23.9.2026
const mil = nodes.find((n) => n.id === "miluimnikim");
mil.summary = "בראשות יועז הנדל. מתמודדת ברשימה משותפת עם המפלגה הכלכלית של ירון זליכה (\"המילואימניקים והכלכלית\"), עם עינת וילף במקום 3. סקר חדשות 12 (22.9.2026): 4 מנדטים.";
mil.sources = [...new Set([...(mil.sources || []), "kan-2026-09-08-lists"])];
const halef = edges.find((e) => e.id === "w2-015");
if (halef) halef.note = "סכום הערבות שלו לא פורסם; עד 23.9.2026 גייסה המפלגה 11 ערבויות בסך 2 מיליון ₪";
fins.miluimnikim = { kind: "party", unit: "₪", guarantees: 2000000, note: "11 ערבויות עד 23.9.2026. המפלגה הכלכלית גייסה בנפרד, והסכומים שלה לא פורסמו.", sources: ["calcalist-2026-09-23-guarantees", "calcalist-2026-08-29-funding"] };
fins.kalkalit = { kind: "party", unit: "₪", note: "לא פורסמו נתוני גיוס לבחירות 2026. בבחירות 2021: ערבויות של 3 מיליון ₪ (1.6 מיליון מזליכה עצמו, 1.1 מיליון ממודי רוזן) ותרומות של כ-240 אלף ₪; המפלגה קיבלה 0.79% מהקולות, מתחת לרף של 1% למימון ממלכתי.", sources: ["globes-2021-03-16-zelekha", "walla-2021-03-26-zelekha", "calcalist-2026-09-23-guarantees"] };

// election story: add a step for the joint list
const el = stories.find((s) => s.id === "funding");
if (el && !el.steps.some((s) => s.focus === "kalkalit")) {
  el.steps.splice(4, 0, { title: "המילואימניקים והכלכלית", text: "יועז הנדל וירון זליכה רצים ברשימה אחת. הרשימה גייסה 11 ערבויות בסך 2 מיליון ₪ עד 23.9. זליכה טוען שלא קיבל ערבויות מבעלי הון.", view: "radial", focus: "kalkalit" });
}

// partnerships story (the view computes co-holdings from the ownership links)
const partners = { id: "partners", title: "שותפויות", summary: "מי מחזיק יחד באותן חברות, ומי מחזיק בנפרד באותו ענף.", steps: [
  { title: "רשת השותפויות", text: "כל קו מחבר שני בעלי הון או גופים מוסדיים שמחזיקים באותה חברה, או בחברות שונות באותו ענף. עובי הקו לפי מספר החברות המשותפות. לחיצה על קו מציגה את הפירוט.", view: "partners" },
  { title: "בנקים, ביטוח ותקשורת", text: "רוב הבנקים בלי בעל שליטה, ולכן אותם גופים מוסדיים (הפניקס, הראל, מנורה, מיטב, כלל) מחזיקים יחד בכמה בנקים, וחלקם גם בחברות התקשורת.", view: "partners", sectors: ["bank", "fin", "media", "tech"], pol: true },
  { title: "מזרחי טפחות", text: "אייל עופר ומשפחת ורטהיים מחזיקים יחד בגרעין השליטה, וכל אחד מהם מחזיק בנפרד גם בחברות תקשורת ונדל\"ן.", view: "partners", focus: "eyal" },
] };
const pi = stories.findIndex((s) => s.id === "partners");
pi < 0 ? stories.splice(3, 0, partners) : (stories[pi] = partners);

write("nodes.json", nodes); write("edges.json", edges); write("sources.json", sources); write("stories.json", stories); write("financials.json", fins);
console.log(`wave3: ${nodes.length} nodes, ${edges.length} edges, ${sources.length} sources, ${Object.keys(fins).length} financial records`);
