// Data wave 4 (26 October 2026): fashion and malls (Fox, Castro, Delta Galil, Golf, Big, G City), real estate,
// motorcycle importers, energy and fuel, health (Teva, Kamada, Maccabi/Assuta), credit cards, national infrastructure
// (ports, government companies), the Dead Sea concession, refreshed holdings in banks and insurers,
// and "הידעת?" facts. Holdings of listed companies come from the interested-party lists on Bizportal
// (TASE filings); everything else cites the press article it comes from. Safe to re-run; run after wave 3.
const fs = require("fs");
const path = require("path");
const P = (f) => path.join(__dirname, "..", "public", "data", f);
const read = (f, d) => (fs.existsSync(P(f)) ? JSON.parse(fs.readFileSync(P(f), "utf8")) : d);
const write = (f, d) => fs.writeFileSync(P(f), JSON.stringify(d, null, 1) + "\n");
const sectors = read("sectors.json"), nodes = read("nodes.json"), edges = read("edges.json"), sources = read("sources.json"), stories = read("stories.json"), fins = read("financials.json"), facts = read("facts.json", []);
const biz = require("./bizportal-2026-10-26.json");
const ACC = "2026-10-26";
Object.assign(sectors, { fashion: "אופנה והלבשה", health: "בריאות ופארמה", infra: "תשתיות לאומיות ונמלים" });

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
const upsert = (arr, items) => items.forEach((x) => { const i = arr.findIndex((y) => y.id === x.id); i < 0 ? arr.push(x) : (arr[i] = { ...arr[i], ...x }); });
const S = (id, type, title, publisher, url, published) => ({ id, type, title, publisher, url, published, accessed: ACC, needsLink: false });
const N = (id, type, name, sector, summary, srcs, extra = {}) => ({ id, type, name, sector, geo: "ישראל", abroad: false, summary, sources: srcs, ...extra });
const E = (id, from, to, kind, share, label, srcs, o = {}) => ({ id, from, to, kind, share, label, former: false, confidence: "press", sources: srcs, ...o });

// ---------- sources ----------
const src = [
  S("ice-2026-08-24-fox", "press", "טרמינל X ופוקס-ויזל: תוצאות הרבעון השני ורכישת מותגים", "ice", "https://www.ice.co.il/finance/news/article/1126809", "2026-08-24"),
  S("calcalist-2025-02-24-metro", "press", "הרגולטור אישר: קבוצת קרסו תרכוש את יבואנית האופנועים מטרו", "כלכליסט", "https://www.calcalist.co.il/local_news/car/article/sjdi00ycc1e", "2025-02-24"),
  S("ice-2025-02-25-metro", "press", "מהפך בתחום הרכב: היבואנית הוותיקה נכנסת לתחום הדו-גלגלי", "ice", "https://www.ice.co.il/auto/news/article/1052860", "2025-02-25"),
  S("moto-2026-01-25-sales", "press", "מכירות אופנועים וקטנועים: סיכום שנת 2025", "מוטו", "https://motomagazine.co.il/news/%D7%9E%D7%9B%D7%99%D7%A8%D7%95%D7%AA-%D7%90%D7%95%D7%A4%D7%A0%D7%95%D7%A2%D7%99%D7%9D-%D7%95%D7%A7%D7%98%D7%A0%D7%95%D7%A2%D7%99%D7%9D-%D7%A1%D7%99%D7%9B%D7%95%D7%9D-%D7%A9%D7%A0%D7%AA-2025/", "2026-01-25"),
  S("range-moto-importers", "press", "יבואני אופנועים בישראל: מי מייבא איזה מותג", "Range", "https://www.range.co.il/%D7%99%D7%91%D7%95%D7%90%D7%A0%D7%99-%D7%90%D7%95%D7%A4%D7%A0%D7%95%D7%A2%D7%99-%D7%91%D7%99%D7%A9%D7%A8%D7%90%D7%9C/", null),
  S("delekmotors-bmw-motorrad", "official", "BMW Motorrad: הזיכיון בישראל מאז 2011", "דלק מוטורס", "https://www.delek-motors.co.il/?p=743", null),
  S("calcalist-2022-10-30-meir", "press", "כלל במגעים לרכישת 8%–10% מקבוצת מאיר; הפניקס רכשה 14%", "כלכליסט", "https://www.calcalist.co.il/market/article/rjq86j5vo", "2022-10-30"),
  S("ice-2026-06-04-honda", "press", "מאיר, יבואנית הונדה: דגמי האופנועים החדשים", "ice", "https://www.ice.co.il/auto/news/article/1115656", "2026-06-04"),
  S("walla-2023-02-08-haifaport", "press", "המעבר להודו: כך הופרט נמל חיפה", "וואלה כסף", "https://finance.walla.co.il/item/3557270", "2023-02-08"),
  S("globes-2023-01-10-haifaport", "press", "נמל חיפה עבר ידיים: הושלמה העברת הבעלות לקבוצת אדאני-גדות", "גלובס", "https://www.globes.co.il/news/article.aspx?did=1001435035", "2023-01-10"),
  S("globes-2012-11-06-eilatport", "press", "Papo Maritime acquires Eilat Port for NIS 120m", "Globes", "https://en.globes.co.il/en/article-1000796104", "2012-11-06"),
  S("maccabi-assuta", "official", "אסותא מרכזים רפואיים: חברה בבעלות קבוצת מכבי שירותי בריאות", "מכבי שירותי בריאות", "https://www.maccabi4u.co.il/en/46562/main_english/our-healthcare-system/hospitals/", null),
  S("calcalist-2023-03-27-max", "press", "אחרי שמונה חודשים מהחתימה: מקס עברה לבעלות קבוצת כלל", "כלכליסט", "https://www.calcalist.co.il/investing/article/hyckffyw3", "2023-03-27"),
  S("ice-2025-05-18-cal", "press", "מכירת כאל: מי בתמונה, ומה מעמדו של הבינלאומי", "ice", "https://www.ice.co.il/finance/news/article/1065206", "2025-05-18"),
  S("gca-2025-report", "official", "רשות החברות הממשלתיות: הדוח השנתי 2025", "רשות החברות הממשלתיות, משרד האוצר", "https://www.gov.il/BlobFolder/dynamiccollectorresultitem/gca-annual-report-2025/he/gca_reports_gca-annual-report-2025-accessible-version.pdf", "2026-01-01"),
  S("calcalist-2024-03-10-deadsea", "press", "זיכיון ים המלח: המכרז, זכות הסירוב של כי\"ל וסוף הזיכיון ב-2030", "כלכליסט", "https://www.calcalist.co.il/market/article/sj11vrx9pt", "2024-03-10"),
  S("ice-2023-08-20-fuel", "press", "פז, דלק או סונול? רשתות תחנות הדלק בישראל", "ice", "https://www.ice.co.il/top-5/news/article/969035", "2023-08-20"),
];
for (const [id, b] of Object.entries(biz)) {
  src.push(S("bizportal-holders-" + id, "official", `${b.name}: מצבת החזקות בעלי עניין`, "ביזפורטל (על פי דיווחי בעלי עניין לבורסה)", b.shurl, ACC));
  src.push(S("bizportal-ratios-" + id, "official", `${b.name}: דוחות ויחסים פיננסיים`, "ביזפורטל (על פי הדוחות הכספיים)", b.rurl, ACC));
}
upsert(sources, src);

// ---------- entities ----------
const H = (id) => ["bizportal-holders-" + id];
const nn = [
  // fashion and malls
  N("fox", "company", "פוקס-ויזל", "fashion", "קבוצת האופנה והקמעונאות הגדולה בישראל, ציבורית. גרעין השליטה: אברהם פוקס והאחים ויזל. שולטת בטרמינל X מאז 2017.", [...H("fox"), "ice-2026-08-24-fox"], { key: true }),
  N("avfox", "person", "אברהם פוקס", null, "מייסד פוקס ובעל המניות הגדול בחברה (22.14%).", H("fox")),
  N("wiesel", "family", "האחים ויזל (הראל, אסף ויפתח)", null, "שותפים בגרעין השליטה בפוקס-ויזל. הראל ויזל הוא יו\"ר החברה.", [...H("fox"), "ice-2026-08-24-fox"]),
  N("terminalx", "company", "טרמינל X", "fashion", "חנות האופנה המקוונת הגדולה בישראל, בשליטת פוקס-ויזל מאז 2017.", ["ice-2026-08-24-fox"]),
  N("castro", "company", "קסטרו", "fashion", "רשת אופנה ציבורית. בעלי המניות הגדולים: משפחת רוטר, אלי גבאי ויוסף שאול גביזון.", H("castro")),
  N("rotterfam", "family", "משפחת רוטר (אסתר וגבריאל)", null, "בעלי מניות בקסטרו (18.04% יחד).", H("castro")),
  N("eligabbay", "person", "אלי גבאי", null, "בעל מניות בקסטרו (9.45%).", H("castro")),
  N("gabizon", "person", "יוסף שאול גביזון", null, "בעל מניות בקסטרו (8.78%).", H("castro")),
  N("delta", "company", "דלתא גליל", "fashion", "יצרנית ומשווקת הלבשה תחתונה וביגוד, פעילה בעיקר בחו\"ל. בשליטת אייזק דבח.", H("delta")),
  N("dabah", "person", "אייזק דבח", null, "בעל השליטה בדלתא גליל (44.26%, ועוד 5.24% דרך חברה משפחתית).", H("delta")),
  N("lautman", "person", "נועם לאוטמן", null, "בתו של מייסד דלתא, דב לאוטמן; מחזיקה 9.91% מהחברה.", H("delta")),
  N("golf", "company", "גולף", "fashion", "רשת אופנה ובית. בעלת המניות הגדולה: כלל תעשיות (52.65%).", H("golf")),
  N("clalind", "company", "כלל תעשיות", "hold", "בעלת השליטה בגולף.", H("golf")),
  N("steimatzky", "company", "סטימצקי", "hold", "מחזיקה 15.51% מגולף.", H("golf")),
  N("big", "company", "ביג מרכזי קניות", "re", "מהגדולות בבעלי מרכזי הקניות בישראל, ציבורית. בעלי המניות הגדולים: יהודה ורוני נפתלי. מחזיקה 79.9% מאפי נכסים.", H("big"), { key: true }),
  N("naftalifam", "family", "משפחת נפתלי (יהודה ורוני)", null, "בעלי המניות הגדולים בביג (35.76% יחד).", H("big")),
  N("megaor", "company", "מגה אור", "re", "חברת נדל\"ן מניב ומרכזי מסחר, ציבורית. מחזיקה 4.96% מביג.", ["bizportal-holders-big", "bizportal-ratios-megaor"]),
  N("gcity", "company", "ג'י סיטי (גזית גלוב)", "re", "חברת מרכזים מסחריים בישראל ובעולם, בשליטת נורסטאר (50.01%).", H("gcity")),
  N("norstar", "company", "נורסטאר", "hold", "בעלת השליטה בג'י סיטי.", H("gcity"), { abroad: false }),
  // real estate
  N("africaprop", "company", "אפי נכסים", "re", "חברת נדל\"ן מניב (לשעבר אפריקה ישראל נכסים), בשליטת ביג (79.9%).", H("africaprop")),
  N("alonyhetz", "company", "אלוני חץ", "re", "חברת השקעות בנדל\"ן ובאנרגיה מתחדשת. שולטת באמות ובאנרג'יקס. בעל המניות הגדול: אהרון פרנקל.", H("alonyhetz"), { key: true }),
  N("nathanhetz", "person", "נתן חץ", null, "מייסד אלוני חץ ובעל מניות בה (12.24%).", H("alonyhetz")),
  N("amot", "company", "אמות השקעות", "re", "מהגדולות בחברות הנדל\"ן המניב בישראל, בשליטת אלוני חץ (51.17%).", H("amot")),
  N("gavyam", "company", "גב-ים", "re", "חברת פארקי הייטק ומשרדים, בשליטת נכסים ובנין (64.04%).", H("gavyam")),
  N("propbuild", "company", "נכסים ובנין", "hold", "בעלת השליטה בגב-ים.", H("gavyam")),
  N("reit1", "company", "ריט 1", "re", "קרן ריט בלי בעל שליטה; המחזיקים הגדולים הם גופים מוסדיים.", H("reit1")),
  N("mivne", "company", "מבנה", "re", "חברת נדל\"ן מניב. בעל המניות הגדול: דוד פורר (23.77%).", H("mivne")),
  N("forer", "person", "דוד פורר", null, "בעל המניות הגדול במבנה.", H("mivne")),
  N("airportcity", "company", "איירפורט סיטי", "re", "חברת נדל\"ן מניב, בשליטת אקויטל (47.69%).", H("airportcity")),
  N("equital", "company", "אקויטל", "hold", "בעלת השליטה באיירפורט סיטי.", H("airportcity")),
  N("shikunbinui", "company", "שיכון ובינוי", "re", "מחברות הבנייה והתשתיות הגדולות. בעלת המניות הגדולה: או.אס ישראל (30.78%).", H("shikunbinui")),
  N("osisrael", "company", "או.אס ישראל", "hold", "בעלת המניות הגדולה בשיכון ובינוי, לפי מצבת בעלי העניין.", H("shikunbinui")),
  N("israelcanada", "company", "ישראל קנדה", "re", "חברת ייזום ונדל\"ן. בעלי המניות הגדולים: ברק רוזן ואסף טוכמאייר.", H("israelcanada")),
  N("barakrosen", "person", "ברק רוזן", null, "בעל מניות בישראל קנדה (16.32%).", H("israelcanada")),
  N("touchmair", "person", "אסף טוכמאייר", null, "בעל מניות בישראל קנדה (15.9%).", H("israelcanada")),
  N("sella", "company", "סלע נדל\"ן", "re", "קרן ריט בלי בעל שליטה; המחזיקים הגדולים הם גופים מוסדיים.", H("sella")),
  N("prashkovsky", "company", "פרשקובסקי", "re", "חברת ייזום ובנייה משפחתית ציבורית.", H("prashkovsky")),
  N("prashfam", "family", "משפחת פרשקובסקי", null, "בעלת השליטה בפרשקובסקי (64.82% יחד: ארנון, יוסי, שרון ומאיה קרדי).", H("prashkovsky")),
  N("isras", "company", "ישרס", "re", "חברת נדל\"ן מניב, בשליטת ישרס אחזקות (68.3%).", H("isras")),
  N("isrhold", "company", "ישרס אחזקות", "hold", "בעלת השליטה בישרס.", H("isras")),
  N("eisenberg", "person", "שלמה איזנברג", null, "בעל מניות בישרס (10.54%).", H("isras")),
  N("summit", "company", "סאמיט", "re", "חברת נדל\"ן מניב בישראל ובגרמניה, בשליטת זוהר לוי (47.99%).", H("summit")),
  N("zoharlevy", "person", "זוהר לוי", null, "בעל השליטה בסאמיט.", H("summit")),
  N("azorim", "company", "אזורים", "re", "חברת ייזום ובנייה למגורים.", H("azorim")),
  N("hfriedman", "person", "חיים פרידמן", null, "בעל השליטה באזורים (64.11%), לפי מצבת בעלי העניין.", H("azorim")),
  // energy and fuel
  N("bazan", "company", "בזן (בתי זיקוק חיפה)", "energy", "בית הזיקוק הגדול בישראל, במפרץ חיפה. בעלת המניות הגדולה: מפעלים פטרוכימיים (24.76%).", H("bazan"), { key: true }),
  N("petrochem", "company", "מפעלים פטרוכימיים בישראל", "hold", "בעלת המניות הגדולה בבזן.", H("bazan")),
  N("jblank", "person", "ג'רמי בלנק", null, "בעל מניות בבזן (5.27%).", H("bazan")),
  N("paz", "company", "פז אנרגיה", "energy", "חברת הדלק הגדולה (268 תחנות לפי משרד האנרגיה, 2021), בלי בעל שליטה. המחזיקים הגדולים הם גופים מוסדיים.", [...H("paz"), "ice-2023-08-20-fuel"], { key: true }),
  N("enlight", "company", "אנלייט אנרגיה", "energy", "יזמית אנרגיה מתחדשת בישראל, באירופה ובארה\"ב, בלי בעל שליטה.", H("enlight")),
  N("energix", "company", "אנרג'יקס", "energy", "יזמית אנרגיה מתחדשת, בשליטת אלוני חץ (50.05%).", H("energix")),
  N("ormat", "company", "אורמת טכנולוגיות", "energy", "יצרנית חשמל גאותרמי, נסחרת בתל אביב ובניו יורק, בלי בעל שליטה.", H("ormat")),
  // health
  N("teva", "company", "טבע", "health", "יצרנית התרופות הגנריות מהגדולות בעולם, בלי בעל שליטה. בין המחזיקים הגדולים: הראל, מגדל, מנורה והפניקס.", H("teva"), { key: true }),
  N("kamada", "company", "קמהדע", "health", "יצרנית תרופות ביולוגיות מפלזמה, בשליטת קרנות פימי (43.11%).", H("kamada")),
  N("fimi", "institution", "קרנות פימי", null, "קרן השקעות פרטיות ישראלית. מחזיקה 43.11% מקמהדע (פימי 6 ופימי 7).", H("kamada")),
  N("recanati", "person", "ליאון רקנאטי", null, "בעל מניות בקמהדע (5.95%).", H("kamada")),
  N("maccabi", "company", "מכבי שירותי בריאות", "health", "קופת החולים השנייה בגודלה בישראל, תאגיד ללא כוונת רווח. בעלת אסותא מרכזים רפואיים.", ["maccabi-assuta"], { key: true }),
  N("assuta", "company", "אסותא מרכזים רפואיים", "health", "רשת בתי החולים הפרטית הגדולה בישראל, בבעלות קבוצת מכבי.", ["maccabi-assuta"]),
  // credit cards and finance
  N("max", "company", "מקס", "fin", "חברת כרטיסי האשראי (לשעבר לאומי קארד), בבעלות קבוצת כלל מאז מרץ 2023, לפי שווי של 2.47 מיליארד ₪.", ["calcalist-2023-03-27-max"]),
  N("cal", "company", "כאל", "fin", "חברת כרטיסי האשראי של דיסקונט (72%) והבינלאומי (28%). דיסקונט נדרשת למכור את השליטה בה.", ["ice-2025-05-18-cal"]),
  N("ayalon", "company", "איילון אחזקות", "fin", "קבוצת ביטוח, בשליטת ווישור (61.58%).", H("ayalon")),
  N("wishor", "company", "ווישור", "hold", "בעלת השליטה באיילון.", H("ayalon")),
  N("meitavinv", "company", "מיטב בית השקעות", "fin", "בית השקעות ציבורי, האם של קופות הגמל והקרנות של מיטב. גרעין השליטה: ברמ פיננסים ומאיה החזקות.", H("meitav")),
  N("bram", "company", "ברמ פיננסים", "hold", "שותפה בגרעין השליטה במיטב (25.88%).", H("meitav")),
  N("mayahold", "company", "מאיה החזקות", "hold", "שותפה בגרעין השליטה במיטב (25.43%).", H("meitav")),
  N("bezeq", "company", "בזק", "media", "חברת התקשורת הגדולה בישראל, בלי בעל שליטה; המחזיקים הגדולים הם גופים מוסדיים.", H("bezeq"), { key: true }),
  // motorcycles
  N("metro", "company", "מטרו מוטור", "auto", "יבואנית האופנועים הגדולה: ימאהה, קוואסאקי ו-SYM. 41.8% מהמסירות ב-2025. בבעלות מלאה של קרסו מאז 2025.", ["calcalist-2025-02-24-metro", "ice-2025-02-25-metro", "moto-2026-01-25-sales"]),
  N("meir", "company", "קבוצת מאיר", "auto", "יבואנית הונדה (רכב ואופנועים), וולוו ולינק אנד קו. 20.5% ממסירות הדו-גלגלי ב-2025.", ["calcalist-2022-10-30-meir", "ice-2026-06-04-honda", "moto-2026-01-25-sales"]),
  N("shaharkatz", "family", "משפחות שחר וכץ", null, "בעלות השליטה בקבוצת מאיר (כ-86% יחד, 2022): משפחת יעקב שחר ומשפחת כץ.", ["calcalist-2022-10-30-meir"]),
  N("oferavnir", "company", "עופר אבניר", "auto", "יבואנית קימקו, פיאג'ו, וספה, אפריליה, סוזוקי ו-CFMOTO. 17% ממסירות הדו-גלגלי ב-2025.", ["range-moto-importers", "moto-2026-01-25-sales"]),
  N("dlb", "company", "DLB מוטוספורט", "auto", "יבואנית KTM, רויאל אנפילד ופיג'ו (דו-גלגלי). 3.6% מהמסירות ב-2025.", ["range-moto-importers", "moto-2026-01-25-sales"]),
  // national infrastructure
  N("haifaport", "company", "נמל חיפה", "infra", "הופרט בינואר 2023 תמורת 4.1 מיליארד ₪ לאדאני ההודית (70%) ולגדות (30%).", ["walla-2023-02-08-haifaport", "globes-2023-01-10-haifaport"], { key: true }),
  N("adani", "company", "Adani Ports", "infra", "קבוצת הנמלים ההודית של גאוטם אדאני; מחזיקה 70% מנמל חיפה.", ["walla-2023-02-08-haifaport"], { geo: "הודו", abroad: true }),
  N("gadot", "company", "קבוצת גדות", "infra", "קבוצת לוגיסטיקה וכימיקלים ישראלית; מחזיקה 30% מנמל חיפה.", ["walla-2023-02-08-haifaport"]),
  N("eilatport", "company", "נמל אילת", "infra", "הופרט ב-2012 תמורת 120 מיליון ₪ לפאפו ימית של האחים נקש.", ["globes-2012-11-06-eilatport"]),
  N("gca", "ministry", "המדינה (רשות החברות הממשלתיות)", null, "מפקחת על החברות הממשלתיות. ב-2025 היו להן הכנסות של כ-113 מיליארד ₪, נכסים של כ-307 מיליארד ₪ וכ-58 אלף עובדים.", ["gca-2025-report"]),
  N("iec", "company", "חברת החשמל", "infra", "חברה ממשלתית; ספקית החשמל ומפעילת רשת ההולכה.", ["gca-2025-report"], { key: true }),
  N("mekorot", "company", "מקורות", "infra", "חברת המים הלאומית, חברה ממשלתית.", ["gca-2025-report"]),
  N("rafael", "company", "רפאל", "ind", "מערכות לחימה, חברה ממשלתית.", ["gca-2025-report"]),
  N("iai", "company", "התעשייה האווירית", "ind", "חברה ממשלתית, יצרנית מטוסים, טילים ולוויינים.", ["gca-2025-report"]),
  N("railways", "company", "רכבת ישראל", "infra", "חברה ממשלתית.", ["gca-2025-report"]),
  N("ashdodport", "company", "נמל אשדוד", "infra", "חברה ממשלתית; הנמל הגדול שעדיין בבעלות המדינה.", ["gca-2025-report"]),
  N("ingl", "company", "נתיבי הגז הטבעי", "infra", "חברה ממשלתית; מערכת ההולכה של הגז הטבעי.", ["gca-2025-report"]),
];
const brand = (id, name, sector, summary, srcs) => N(id, "brand", name, sector, summary, srcs);
nn.push(
  brand("b-yamaha", "ימאהה (אופנועים)", "auto", "3,851 מסירות ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-kawasaki", "קוואסאקי", "auto", "672 מסירות ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-sym", "SYM", "auto", "המותג הנמכר ביותר ב-2025: 4,813 מסירות.", ["moto-2026-01-25-sales"]),
  brand("b-honda-moto", "הונדה (אופנועים)", "auto", "4,336 מסירות ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-volvo", "וולוו", "auto", "", ["ice-2026-06-04-honda"]),
  brand("b-kymco", "קימקו", "auto", "2,198 מסירות ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-piaggio", "פיאג'ו ווספה", "auto", "548 מסירות של פיאג'ו ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-cfmoto", "CFMOTO", "auto", "515 מסירות ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-ktm", "KTM", "auto", "462 מסירות ב-2025.", ["moto-2026-01-25-sales"]),
  brand("b-bmw-moto", "BMW Motorrad", "auto", "559 מסירות ב-2025; בזיכיון דלק מוטורס מאז 2011.", ["moto-2026-01-25-sales", "delekmotors-bmw-motorrad"]),
);
upsert(nodes, nn);
nn.forEach((n) => (byId[n.id] = n));

// ---------- links from the press ----------
const ne = [
  E("w4-fox-tx", "fox", "terminalx", "ownership", null, "שליטה", ["ice-2026-08-24-fox"], { asOf: "2026-08-24" }),
  E("w4-big-afi", "big", "africaprop", "ownership", 79.9, "79.9%", H("africaprop"), { confidence: "official", asOf: "2026-09-30" }),
  E("w4-carasso-metro", "carasso", "metro", "ownership", 100, "בעלות מלאה", ["calcalist-2025-02-24-metro", "ice-2025-02-25-metro"], { asOf: "2025-02-25", note: "קרסו החזיקה שליש מאז 2011 ורכשה את 67% הנותרים מגדי אבירם וחן למדן תמורת כ-210 מיליון ₪" }),
  E("w4-metro-yam", "metro", "b-yamaha", "franchise", null, "יבוא", ["range-moto-importers", "calcalist-2025-02-24-metro"]),
  E("w4-metro-kaw", "metro", "b-kawasaki", "franchise", null, "יבוא", ["range-moto-importers"]),
  E("w4-metro-sym", "metro", "b-sym", "franchise", null, "יבוא", ["range-moto-importers"]),
  E("w4-sk-meir", "shaharkatz", "meir", "ownership", 86, "כ-86%", ["calcalist-2022-10-30-meir"], { asOf: "2022-10-30", note: "שתי המשפחות מחזיקות בחלקים שווים" }),
  E("w4-phx-meir", "phoenix", "meir", "ownership", 14, "14%", ["calcalist-2022-10-30-meir"], { asOf: "2022-10-30", note: "נרכשו תמורת 574 מיליון ₪, עם אופציה ל-6% נוספים" }),
  E("w4-meir-honda", "meir", "b-honda-moto", "franchise", null, "יבוא", ["ice-2026-06-04-honda", "range-moto-importers"]),
  E("w4-meir-volvo", "meir", "b-volvo", "franchise", null, "יבוא", ["ice-2026-06-04-honda"]),
  E("w4-oa-kymco", "oferavnir", "b-kymco", "franchise", null, "יבוא", ["range-moto-importers"]),
  E("w4-oa-piaggio", "oferavnir", "b-piaggio", "franchise", null, "יבוא", ["range-moto-importers"]),
  E("w4-oa-cfmoto", "oferavnir", "b-cfmoto", "franchise", null, "יבוא", ["range-moto-importers"]),
  E("w4-dlb-ktm", "dlb", "b-ktm", "franchise", null, "יבוא", ["range-moto-importers"]),
  E("w4-delek-bmwm", "delekauto", "b-bmw-moto", "franchise", null, "זיכיון מאז 2011", ["delekmotors-bmw-motorrad"], { confidence: "official" }),
  E("w4-adani-haifa", "adani", "haifaport", "ownership", 70, "70%", ["walla-2023-02-08-haifaport", "globes-2023-01-10-haifaport"], { asOf: "2023-01-10" }),
  E("w4-gadot-haifa", "gadot", "haifaport", "ownership", 30, "30%", ["walla-2023-02-08-haifaport", "globes-2023-01-10-haifaport"], { asOf: "2023-01-10" }),
  E("w4-nakash-eilat", "nakash", "eilatport", "ownership", null, "בעלות (דרך פאפו ימית)", ["globes-2012-11-06-eilatport"], { asOf: "2012-11-06", note: "120 מיליון ₪: 105 מיליון על החברה ו-15 מיליון אופציה על ההכנסות" }),
  E("w4-maccabi-assuta", "maccabi", "assuta", "ownership", null, "בעלות", ["maccabi-assuta"], { confidence: "official" }),
  E("w4-clal-max", "clal", "max", "ownership", null, "שליטה", ["calcalist-2023-03-27-max"], { asOf: "2023-03-27", note: "75% נרכשו מוורבורג פינקוס; משקיעים שותפים של כלל מחזיקים 10%" }),
  E("w4-disc-cal", "discount", "cal", "ownership", 72, "72%", ["ice-2025-05-18-cal"], { asOf: "2025-05-18" }),
  E("w4-fibi-cal", "fibi", "cal", "ownership", 28, "28%", ["ice-2025-05-18-cal"], { asOf: "2025-05-18" }),
];
for (const [id, label] of [["iec", "חברת החשמל"], ["mekorot", "מקורות"], ["rafael", "רפאל"], ["iai", "התעשייה האווירית"], ["railways", "רכבת ישראל"], ["ashdodport", "נמל אשדוד"], ["ingl", "נתיבי הגז הטבעי"]])
  ne.push(E("w4-gca-" + id, "gca", id, "ownership", null, "חברה ממשלתית", ["gca-2025-report"], { confidence: "official", note: `${label}: המדינה מחזיקה ביותר ממחצית כוח ההצבעה או בזכות למנות את רוב הדירקטורים` }));
// the Dead Sea concession is recorded on the existing ICL → DSW holding as a note on DSW
upsert(edges, ne);
if (byId.dsw) byId.dsw.summary = (byId.dsw.summary || "").replace(/ ?הזיכיון[^.]*\.$/, "") + " הזיכיון של כי\"ל לניצול ים המלח מסתיים בסוף מרץ 2030, והמדינה מכינה מכרז.";
if (byId.dsw) byId.dsw.sources = [...new Set([...(byId.dsw.sources || []), "calcalist-2024-03-10-deadsea"])];

// ---------- holdings from the interested-party lists (official) ----------
const INST = [["הראל", "harel"], ["מגדל", "migdal"], ["מנורה", "menora"], ["הפניקס", "phoenix"], ["כלל ביטוח", "clal"], ["מיטב", "meitav"], ["אלטשלר", "altshuler"], ["אלטשולר", "altshuler"], ["מור ", "mor"], ["ילין", "yelin"]];
const PRIVATE = { // holder name prefix on Bizportal → entity in the map
  fox: [["פוקס אברהם", "avfox"], ["ויזל", "wiesel"]], bazan: [["פטרוכימיים", "petrochem"], ["בלאנק", "jblank"]],
  alonyhetz: [["פרנקל", "frenkel"], ["חץ נתן", "nathanhetz"]], amot: [["אלוני חץ", "alonyhetz"]], energix: [["אלוני חץ", "alonyhetz"]],
  gavyam: [["נכסים ובנין", "propbuild"]], mivne: [["פורר", "forer"]], airportcity: [["אקויטל", "equital"]], shikunbinui: [["או.אס ישראל", "osisrael"]],
  israelcanada: [["רוזן ברק", "barakrosen"], ["טוכמאייר", "touchmair"]], big: [["נפתלי", "naftalifam"], ["מגה אור", "megaor"]],
  prashkovsky: [["פרשקובסקי", "prashfam"], ["קרדי", "prashfam"]], isras: [["ישרס אחזקות", "isrhold"], ["איזנברג", "eisenberg"]],
  summit: [["לוי זוהר", "zoharlevy"]], gcity: [["נורסטא", "norstar"]], azorim: [["פרידמן", "hfriedman"]],
  castro: [["רוטר", "rotterfam"], ["גבי אלי", "eligabbay"], ["גביזון", "gabizon"]], delta: [["דבח אייזק", "dabah"], ["לאוטמן", "lautman"]],
  golf: [["כלל תעשיות", "clalind"], ["סטימצקי", "steimatzky"]], kamada: [["פימי", "fimi"], ["רקנאטי", "recanati"]],
  ayalon: [["ווישור", "wishor"]], meitav: [["ברמ פיננסים", "bram"], ["מאיה החזקות", "mayahold"]],
  harel: [["גין יעוץ", "hamburger"]], migdal: [["אליהו שלמה", "eliahu"]], clal: [["אלרוב", "alrov"]], menora: [["ניידן", "gurovich"], ["פלמס", "gurovich"]],
  mizrahi: [["לין אחזקות", "eyal"], ["אף & דבליו", "wertheim"], ["אמ.דבליו.זד", "wertheim"]], fibi: [["פיבי", "bino"]], icl: [["חברה לישראל", "israelcorp"]],
};
const TARGET = { meitav: "meitavinv" }; // the listed parent of the Meitav funds
const day = (d) => { const [dd, mm, yy] = d.split("/"); return `${yy}-${mm}-${dd}`; };
let added = 0, updated = 0;
for (const [cid, b] of Object.entries(biz)) {
  const to = TARGET[cid] || cid;
  if (!byId[to]) continue;
  const groups = {};
  for (const [name, , date, pct] of b.holders || []) {
    const inst = INST.find(([p]) => name.startsWith(p));
    const priv = (PRIVATE[cid] || []).find(([p]) => name.startsWith(p));
    const who = priv ? priv[1] : inst ? inst[1] : null;
    if (!who || who === to) continue;
    const g = (groups[who] ??= { pct: 0, date: "", kind: priv ? "ownership" : "institutional" });
    g.pct += pct; if (day(date) > g.date) g.date = day(date);
  }
  for (const [who, g] of Object.entries(groups)) {
    if (!byId[who]) continue;
    const share = Math.round(g.pct * 100) / 100;
    const kind = g.kind === "ownership" && byId[who].type === "institution" ? "institutional" : g.kind;
    if (kind === "institutional" && share < 1) { const k = edges.findIndex((e) => e.id === `w4-h-${who}-${to}`); if (k >= 0) edges.splice(k, 1); continue; }
    const ex = edges.find((e) => e.from === who && e.to === to && (e.kind === kind || (kind === "ownership" && ["ownership", "media-ownership"].includes(e.kind))) && !e.former);
    const s = "bizportal-holders-" + cid;
    if (ex) { ex.share = share; ex.label = share + "%"; ex.asOf = g.date; ex.confidence = "official"; ex.sources = [...new Set([s, ...ex.sources])]; updated++; }
    else { edges.push(E(`w4-h-${who}-${to}`, who, to, kind, share, share + "%", [s], { confidence: "official", asOf: g.date, note: kind === "institutional" ? "סך ההחזקה של קופות הגמל, הקרנות והנוסטרו של הקבוצה" : "" })); added++; }
  }
}
// the Meitav funds node already holds other companies; the listed Meitav house is its parent
upsert(edges, [E("w4-meitavinv-funds", "meitavinv", "meitav", "ownership", null, "חברת האם של הקופות והקרנות", H("meitav"), { confidence: "official" })]);
// the old Fox-less "frenkel" summary mentions no Alony Hetz; add it
if (byId.frenkel && !/אלוני חץ/.test(byId.frenkel.summary || "")) byId.frenkel.summary = (byId.frenkel.summary || "") + " בעל המניות הגדול באלוני חץ (18.15%).";

// ---------- financial figures from the reported ratios ----------
const R = (b, k) => (b.ratios || {})[k] ?? null;
for (const [cid, b] of Object.entries(biz)) {
  const id = TARGET[cid] || cid;
  if (!byId[id] || !b.marketCap) continue;
  const pe = R(b, "מכפיל רווח"), pb = R(b, "מכפיל הון"), ps = R(b, "מכפיל מכירות");
  const ttm = { period: R(b, "period"), pe, pb, ps, roe: R(b, "תשואה על ההון"), roa: R(b, "תשואה על הנכסים"), margin: R(b, "שיעור רווח נקי"), equityRatio: R(b, "הון עצמי למאזן"),
    netProfit: pe ? Math.round(b.marketCap / pe) : null, equity: pb ? Math.round(b.marketCap / pb) : null, revenue: ps ? Math.round(b.marketCap / ps) : null };
  const prev = fins[id] && fins[id].kind === "listed" ? fins[id] : null;
  fins[id] = { ...(prev || { kind: "listed", unit: "אלפי ₪", security: b.sec, note: "", sources: [] }), marketCap: b.marketCap, marketCapAsOf: "2026-10-23", ttm, sources: [...new Set([...(prev?.sources || []), "bizportal-ratios-" + cid])] };
}

// ---------- stories ----------
const story = (s) => { const i = stories.findIndex((x) => x.id === s.id); i < 0 ? stories.push(s) : (stories[i] = s); };
story({ id: "realestate", title: "נדל\"ן וקניונים", summary: "מי מחזיק בקניונים, במגדלי המשרדים ובחברות הבנייה.", steps: [
  { title: "בעלי הקניונים והמשרדים", text: "עזריאלי, מליסרון (עופר), ביג (משפחת נפתלי), ג'י סיטי, אמות (אלוני חץ) וגב-ים מחזיקות ברוב מרכזי המסחר והמשרדים הגדולים.", view: "cols", sectors: ["re", "hold"] },
  { title: "ביג ואפי נכסים", text: "ביג מחזיקה 79.9% מאפי נכסים, לשעבר אפריקה ישראל נכסים. מגה אור מחזיקה 4.96% מביג.", view: "tree", focus: "big", expand: ["naftalifam", "big"] },
  { title: "אלוני חץ", text: "אלוני חץ שולטת באמות (51.17%) ובאנרג'יקס (50.05%). בעל המניות הגדול בה הוא אהרון פרנקל (18.15%).", view: "tree", focus: "alonyhetz", expand: ["alonyhetz"] },
] });
story({ id: "infra", title: "תשתיות ונמלים", summary: "מי שולט בנמלים, בחשמל, במים ובזיקוק.", steps: [
  { title: "הנמלים", text: "נמל חיפה של אדאני ההודית (70%) וגדות (30%), נמל אילת של האחים נקש, ונמל אשדוד שעדיין בבעלות המדינה.", view: "free", only: ["haifaport", "adani", "gadot", "eilatport", "nakash", "arkia", "ashdodport", "gca"] },
  { title: "החברות הממשלתיות", text: "חברת החשמל, מקורות, רכבת ישראל, נמל אשדוד, נתיבי הגז, רפאל והתעשייה האווירית הן חברות ממשלתיות. ב-2025 היו לכל החברות הממשלתיות הכנסות של כ-113 מיליארד ₪.", view: "radial", focus: "gca" },
  { title: "זיקוק ודלק", text: "בזן מזקקת את רוב הדלק בישראל. פז היא רשת התחנות הגדולה, בלי בעל שליטה.", view: "radial", focus: "bazan" },
] });
story({ id: "health", title: "בריאות ופארמה", summary: "טבע, קמהדע, מכבי ואסותא.", steps: [
  { title: "טבע", text: "יצרנית התרופות הגדולה בישראל, בלי בעל שליטה. הראל, מגדל, מנורה והפניקס הם בין המחזיקים הגדולים.", view: "radial", focus: "teva" },
  { title: "מכבי ואסותא", text: "רשת בתי החולים הפרטית הגדולה, אסותא, בבעלות קופת החולים מכבי.", view: "radial", focus: "maccabi" },
] });
story({ id: "fashion", title: "אופנה", summary: "פוקס, קסטרו, דלתא גליל וגולף: מי מחזיק ברשתות האופנה.", steps: [
  { title: "רשתות האופנה", text: "פוקס-ויזל (אברהם פוקס והאחים ויזל), קסטרו, דלתא גליל (אייזק דבח) וגולף (כלל תעשיות).", view: "free", sectors: ["fashion", "hold"], expand: ["fox", "avfox", "wiesel"] },
] });
const imp = stories.find((s) => s.id === "imports");
if (imp && !imp.steps.some((s) => s.focus === "metro")) imp.steps.splice(1, 0, { title: "אופנועים", text: "מטרו מוטור (ימאהה, קוואסאקי, SYM) של קרסו מסרה 41.8% מהאופנועים והקטנועים ב-2025. אחריה: מאיר, יבואנית הונדה (20.5%), ועופר אבניר (17%).", view: "tree", focus: "carasso", expand: ["carassofam", "carasso", "metro"] });
const banks = stories.find((s) => s.id === "banks");
if (banks && !banks.steps.some((s) => s.focus === "cal")) banks.steps.push(
  { title: "כרטיסי האשראי", text: "ישראכרט בשליטת דלק, מקס בשליטת כלל מאז 2023, וכאל של דיסקונט (72%) והבינלאומי (28%).", view: "free", only: ["isracard", "delek", "max", "clal", "cal", "discount", "fibi", "alrov", "akirov", "tshuva", "tashluz"] },
  { title: "בעלי השליטה בביטוח", text: "מגדל (שלמה אליהו, 45.5%), הראל (משפחת המבורגר, 42.25%), מנורה (משפחת גורביץ', 62.4%), איילון (ווישור, 61.6%). הפניקס וכלל בלי בעל שליטה, וכלל עם אלרוב (14.5%) כבעלת המניות הגדולה.", view: "cols", sectors: ["fin"], types: ["political", "donor", "gov"] },
);

// ---------- "הידעת?" ----------
const F = (id, text, srcs, focus) => ({ id, text, sources: srcs, focus });
const newFacts = [
  F("f-metro", "מטרו מוטור, יבואנית ימאהה, קוואסאקי ו-SYM, מסרה 41.8% מהאופנועים והקטנועים החדשים ב-2025. מאז פברואר 2025 היא בבעלות מלאה של קרסו.", ["moto-2026-01-25-sales", "calcalist-2025-02-24-metro"], "metro"),
  F("f-haifa", "נמל חיפה הופרט ב-2023 תמורת 4.1 מיליארד ₪: 70% לאדאני ההודית ו-30% לגדות.", ["walla-2023-02-08-haifaport"], "haifaport"),
  F("f-eilat", "האחים נקש, בעלי ארקיע, הם גם בעלי נמל אילת. הם רכשו אותו ב-2012 תמורת 120 מיליון ₪.", ["globes-2012-11-06-eilatport"], "nakash"),
  F("f-deadsea", "הזיכיון של כי\"ל לניצול ים המלח, מכוח חוק מ-1961, מסתיים בסוף מרץ 2030. לכי\"ל יש זכות להשוות הצעה של מתחרה במכרז.", ["calcalist-2024-03-10-deadsea"], "dsw"),
  F("f-big", "ביג מחזיקה 79.9% מאפי נכסים, לשעבר אפריקה ישראל נכסים של לב לבייב.", ["bizportal-holders-africaprop"], "big"),
  F("f-alony", "אהרון פרנקל הוא בעל המניות הגדול באלוני חץ (18.15%), ששולטת באמות ובאנרג'יקס.", ["bizportal-holders-alonyhetz", "bizportal-holders-amot"], "alonyhetz"),
  F("f-max", "כלל השתלטה ב-2023 על חברת כרטיסי האשראי מקס, לפי שווי של 2.47 מיליארד ₪.", ["calcalist-2023-03-27-max"], "max"),
  F("f-cal", "כאל שייכת לדיסקונט (72%) ולבינלאומי (28%), ודיסקונט נדרשת למכור את השליטה בה.", ["ice-2025-05-18-cal"], "cal"),
  F("f-assuta", "אסותא, רשת בתי החולים הפרטית הגדולה בישראל, שייכת לקופת החולים מכבי.", ["maccabi-assuta"], "assuta"),
  F("f-meir", "הפניקס רכשה ב-2022 14% מקבוצת מאיר, יבואנית הונדה ווולוו, תמורת 574 מיליון ₪.", ["calcalist-2022-10-30-meir"], "meir"),
  F("f-fuel", "ארבע רשתות הדלק הגדולות, פז, דלק, סונול ודור אלון, מפעילות כמעט 80% מתחנות הדלק בישראל.", ["ice-2023-08-20-fuel"], "paz"),
  F("f-delta", "אייזק דבח מחזיק 44.26% מדלתא גליל, החברה שהקים דב לאוטמן.", ["bizportal-holders-delta"], "delta"),
  F("f-gca", "לחברות הממשלתיות היו ב-2025 הכנסות של כ-113 מיליארד ₪ וכ-58 אלף עובדים.", ["gca-2025-report"], "gca"),
  F("f-clal-alrov", "אלרוב נדל\"ן של אלפרד אקירוב היא בעלת המניות הגדולה בכלל ביטוח (14.51%).", ["bizportal-holders-clal"], "clal"),
  F("f-fox", "אברהם פוקס מחזיק 22.14% מפוקס-ויזל, והאחים ויזל עוד 19.4% יחד.", ["bizportal-holders-fox"], "fox"),
  F("f-kamada", "קרנות פימי מחזיקות 43% מקמהדע, יצרנית התרופות הביולוגיות.", ["bizportal-holders-kamada"], "kamada"),
  F("f-mizrahi", "אייל עופר (20.99%) ומשפחת ורטהיים (20.51%) מחזיקים יחד יותר מ-41% מבנק מזרחי טפחות.", ["bizportal-holders-mizrahi"], "mizrahi"),
  F("f-elal", "משפחת רוזנברג שולטת באל על עם 48.1% מהמניות, דרך כנפי נשרים.", ["bizportal-elal-holders"], "elal"),
];
upsert(facts, newFacts);

write("sectors.json", sectors); write("nodes.json", nodes); write("edges.json", edges); write("sources.json", sources); write("stories.json", stories); write("financials.json", fins); write("facts.json", facts);
console.log(`wave4: ${nodes.length} nodes, ${edges.length} edges (${added} holdings added, ${updated} refreshed), ${sources.length} sources, ${Object.keys(fins).length} financial records, ${facts.length} facts`);
