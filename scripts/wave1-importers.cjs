// Data wave 1 (October 2026): car importers and consumer-goods importers, with their brand franchises.
// Every link carries at least one source. Safe to re-run: existing ids are replaced, not duplicated.
// Run: node scripts/wave1-importers.cjs
const fs = require("fs");
const path = require("path");
const P = (f) => path.join(__dirname, "..", "public", "data", f);
const read = (f) => JSON.parse(fs.readFileSync(P(f), "utf8"));
const write = (f, d) => fs.writeFileSync(P(f), JSON.stringify(d, null, 1) + "\n");

const sectors = read("sectors.json"), nodes = read("nodes.json"), edges = read("edges.json"), sources = read("sources.json"), stories = read("stories.json");
sectors.auto = "רכב ותחבורה";
sectors.import = "יבוא מוצרי צריכה";

const ACC = "2026-10-25";
const S = (id, type, title, publisher, url, published) => ({ id, type, title, publisher, url, published, accessed: ACC, needsLink: false });
const newSources = [
  S("cartube-2025-importers", "press", "הרכבים הנמכרים ביותר בישראל, ינואר–ספטמבר 2025: מסירות ונתח שוק לפי יבואן", "cartube", "https://www.cartube.co.il/%D7%94%D7%9E%D7%92%D7%96%D7%99%D7%9F/%D7%94%D7%A8%D7%9B%D7%91%D7%99%D7%9D-%D7%94%D7%A0%D7%9E%D7%9B%D7%A8%D7%99%D7%9D-%D7%91%D7%99%D7%95%D7%AA%D7%A8-%D7%91%D7%99%D7%A9%D7%A8%D7%90%D7%9C-%D7%99%D7%A0%D7%95%D7%90%D7%A8-%D7%A1%D7%A4%D7%98%D7%9E%D7%91%D7%A8-2025", "2025-10-01"),
  S("wiki-colmobil", "press", "קבוצת כלמוביל", "ויקיפדיה", "https://he.wikipedia.org/wiki/%D7%A7%D7%91%D7%95%D7%A6%D7%AA_%D7%9B%D7%9C%D7%9E%D7%95%D7%91%D7%99%D7%9C", "2026-10-19"),
  S("colmobil-about", "official", "הסיפור שלנו: כלמוביל (כולל רכישת 70% מאפקו ואנרפוינט)", "כלמוביל", "https://www.colmobil.co.il/about-us/", null),
  S("colmobil-org", "official", "מבנה ארגוני: המותגים שכלמוביל מייצגת", "כלמוביל", "https://www.colmobil.co.il/organization/", null),
  S("wiki-horesh", "press", "ג'ורג' חורש", "ויקיפדיה", "https://he.wikipedia.org/wiki/%D7%92%27%D7%95%D7%A8%D7%92%27_%D7%97%D7%95%D7%A8%D7%A9", null),
  S("toyota-il-about", "official", "אודות טויוטה בישראל: יוניון מוטורס", "טויוטה ישראל", "https://www.toyota.co.il/discover-toyota/toyota-in-israel/about-toyota", null),
  S("calcalist-2023-12-05-carasso", "press", "בני משפחת קרסו הגישו הצעת רכש ל-5% ממניות קרסו מוטורס", "כלכליסט", "https://www.calcalist.co.il/market/article/sj9eaihha", "2023-12-05"),
  S("bizportal-carasso-chery", "press", "קרסו מוטורס: צ'רי תומכת בתוצאות", "ביזפורטל", "https://www.bizportal.co.il/capitalmarket/news/article/20024229", null),
  S("calcalist-2024-03-03-delek-auto", "press", "הצעת הרכש נענתה: גיל אגמון יחזיק יותר מ-50% מדלק רכב", "כלכליסט", "https://www.calcalist.co.il/market/article/sy5d5nzpp", "2024-03-03"),
  S("delek-motors-site", "official", "דלק מוטורס: הזיכיונות והשליטה", "דלק מוטורס", "https://www.delek-motors.co.il/", null),
  S("champion-site", "official", "צ'מפיון מוטורס: חלק מקבוצת אלייד, מייצגת את מותגי קבוצת פולקסווגן", "צ'מפיון מוטורס", "https://www.championmotors.co.il/", null),
  S("allied-site", "official", "קבוצת אלייד: מבנה הבעלות והאחזקות", "צ'מפיון מוטורס", "https://www.championmotors.co.il/about/allied-group/", null),
  S("champion-about", "official", "קבוצת צ'מפיון מוטורס: הקבוצה מנוהלת על ידי חבר נאמנים דרך קרן אהרון גוטווירט", "צ'מפיון מוטורס", "https://www.championmotors.co.il/about/", null),
  S("kia-il-about", "official", "אודות היבואן: טלקאר, בבעלות משפחת אונגר", "קיה ישראל", "https://kia-israel.co.il/%D7%90%D7%95%D7%93%D7%95%D7%AA-%D7%94%D7%99%D7%91%D7%95%D7%90%D7%9F", null),
  S("savey-2023-importers", "press", "יבואני רכב בישראל: סקירה 2023", "Savey (אתר השוואה)", "https://savey.co.il/%D7%A8%D7%9B%D7%91/%D7%99%D7%91%D7%95%D7%90%D7%A0%D7%99-%D7%A8%D7%9B%D7%91/", "2023-01-01"),
  S("bizportal-diplomat-holders", "official", "דיפלומט אחזקות: מצבת החזקות בעלי עניין", "ביזפורטל (על פי דיווחי החברה)", "https://www.bizportal.co.il/capitalmarket/quote/stakeholders/1173491", "2026-09-30"),
  S("ynet-2022-02-02-importers", "press", "רחוקים מאור הזרקורים: מיהם היבואנים שמשפיעים על הכיס של כולנו?", "ynet", "https://www.ynet.co.il/economy/article/rjcmlxdat", "2022-02-02"),
  S("davar-2022-08-03-importers", "press", "ארבע החברות שקובעות את המחירים בסופר, ורוב הישראלים לא מכירים", "דבר", "https://www.davar1.co.il/393058/", "2022-08-03"),
  S("calcalist-2022-02-09-suppliers", "press", "שבויים של הספקים: כשל שוק מתמשך בשוק המזון (נתוני נתח שוק לפי קטגוריה)", "כלכליסט", "https://www.calcalist.co.il/shopping/article/r1u5gqgy9", "2022-02-09"),
  S("ls-site", "official", "ליימן שליסל: המותגים שהחברה מייבאת ומפיצה", "ליימן שליסל", "https://www.l-s.co.il/", null),
  S("globes-importers-plan", "press", "האוצר מחייה תוכנית להגבלת יבואני המזון הבלעדיים", "גלובס", "https://www.globes.co.il/news/article.aspx?did=1001436157", null),
];

const N = (id, type, name, sector, summary, srcs, extra = {}) => ({ id, type, name, sector, geo: "ישראל", abroad: false, summary, sources: srcs, ...extra });
const newNodes = [
  // car importers
  N("colmobil", "company", "כלמוביל", "auto", "יבואנית הרכב הגדולה בישראל: 20.3% מהמסירות בינואר–ספטמבר 2025. חברה פרטית בבעלות משפחת חרל\"פ מאז 2003.", ["wiki-colmobil", "cartube-2025-importers"], { key: true }),
  N("harlapfam", "family", "משפחת חרל\"פ", null, "בעלת כלמוביל. לפי ויקיפדיה, שמואל חרל\"פ כיהן כיו\"ר הקבוצה עד פטירתו באוגוסט 2026, ובנו אסף חרל\"פ מונה ליו\"ר.", ["wiki-colmobil"]),
  N("colmobilfin", "company", "כלמוביל פתרונות מימון", "auto", "לשעבר דביס ישראל, שותפות עם דיימלר. כלמוביל רכשה את חלקה של דיימלר ב-2011.", ["wiki-colmobil"]),
  N("enerpoint", "company", "אנרפוינט", "energy", "מערכות סולאריות. נרכשה בידי כלמוביל באפריל 2022.", ["wiki-colmobil", "colmobil-about"]),
  N("apco", "company", "אפקו", "auto", "יבואנית ציוד מכני הנדסי (צמ\"ה).", ["colmobil-about"]),
  N("unionmotors", "company", "יוניון מוטורס", "auto", "יבואנית טויוטה בישראל מאז 1991: 14.4% מהמסירות בינואר–ספטמבר 2025.", ["toyota-il-about", "cartube-2025-importers"], { key: true }),
  N("horesh", "person", "ג'ורג' חורש", null, "בעל השליטה בקבוצת יוניון: יבוא טויוטה, לקסוס ומשאיות הינו, נדל\"ן בישראל, באירופה ובצפון אמריקה, ואחזקות בסופר-פארם ובחברות נוספות.", ["wiki-horesh"]),
  N("lexmotors", "company", "לקס מוטורס", "auto", "יבואנית לקסוס בישראל.", ["wiki-horesh"]),
  N("orionmotors", "company", "אוריון מוטורס", "auto", "יבוא ושיווק כלי רכב חשמליים של GAC הסינית.", ["wiki-horesh"]),
  N("superpharm", "company", "סופר-פארם", "food", "רשת הפארם הגדולה בישראל.", ["wiki-horesh"]),
  N("matchretail", "company", "מאצ' ריטייל (H&M ו-COS)", "food", "זיכיון לייבוא מוצרי האופנה של H&M ו-COS מאז 2010.", ["wiki-horesh"]),
  N("carasso", "company", "קרסו מוטורס", "auto", "יבואנית רנו, ניסאן, דאצ'יה וצ'רי. חברה ציבורית: 15.1% מהמסירות בינואר–ספטמבר 2025.", ["calcalist-2023-12-05-carasso", "cartube-2025-importers"], { key: true }),
  N("carassofam", "family", "משפחת קרסו", null, "בעלת השליטה בקרסו מוטורס.", ["calcalist-2023-12-05-carasso"]),
  N("delekauto", "company", "דלק רכב (דלק מערכות רכב)", "auto", "חברה ציבורית, בעלת דלק מוטורס: יבואנית מאזדה, פורד, BMW, MINI, NIO ודונגפנג. 5.9% מהמסירות בינואר–ספטמבר 2025.", ["delek-motors-site", "cartube-2025-importers"], { key: true }),
  N("agmon", "person", "גיל אגמון", null, "יו\"ר ובעל השליטה בדלק רכב.", ["delek-motors-site", "calcalist-2024-03-03-delek-auto"]),
  N("allied", "company", "קבוצת אלייד", "hold", "חברת אחזקות שהקים אהרון גוטווירט ב-1965, המנוהלת היום בידי חבר נאמנים דרך קרן אהרון גוטווירט. פועלת בנדל\"ן, אלקטרוניקה, תשתיות ורכב.", ["allied-site", "champion-about"]),
  N("champion", "company", "צ'מפיון מוטורס", "auto", "יבואנית מותגי קבוצת פולקסווגן: 11.9% מהמסירות בינואר–ספטמבר 2025.", ["champion-site", "cartube-2025-importers"], { key: true }),
  N("ashtrom", "company", "אשטרום", "re", "קבוצת בנייה ונדל\"ן. מופיעה ברשימת האחזקות של קבוצת אלייד (שיעור ההחזקה לא צוין).", ["allied-site"]),
  N("carmeltunnels", "company", "מנהרות הכרמל", "energy", "כביש אגרה בחיפה. מופיע ברשימת האחזקות של קבוצת אלייד.", ["allied-site"]),
  N("telcar", "company", "טלקאר", "auto", "היבואנית הרשמית של קיה, בבעלות משפחת אונגר מאז 1973: 9.7% מהמסירות בינואר–ספטמבר 2025.", ["kia-il-about", "cartube-2025-importers"]),
  N("ungerfam", "family", "משפחת אונגר", null, "בעלת טלקאר.", ["kia-il-about"]),
  // consumer-goods importers
  N("diplomat", "company", "דיפלומט אחזקות", "import", "יבואנית ומפיצה ציבורית: כל מוצרי פרוקטר אנד גמבל בישראל, לצד היינץ, סטארקיסט, קלוגס וקיקומן. לפי כלכליסט (2022): 90.8% מסכיני הגילוח, 55.4% ממוצרי ההיגיינה הנשית, 42.2% משוק הטונה ו-35.3% ממוצרי הכביסה.", ["ynet-2022-02-02-importers", "calcalist-2022-02-09-suppliers"], { key: true }),
  N("weiman", "person", "נעם וימן", null, "יו\"ר ומבעלי השליטה בדיפלומט, יחד עם משפחת מנדל.", ["bizportal-diplomat-holders", "davar-2022-08-03-importers"]),
  N("mandelfam", "family", "משפחת מנדל", null, "מייסדי דיפלומט (רוברט מנדל, 1963) ושותפים בגרעין השליטה. מחזיקים יחד כ-25% (ג'פרי מנדל 9.18%, ולור, אנדרו וקלודין מנדל 5.33% כל אחד).", ["bizportal-diplomat-holders", "ynet-2022-02-02-importers"], { abroad: true, geo: "ארה\"ב" }),
  N("schestowitz", "company", "שסטוביץ", "import", "יבואנית פרטית של קולגייט, ג'ונסון אנד ג'ונסון ופסטה ברילה. לפי כלכליסט (2022): 54.4% ממשחות השיניים וכ-26% מהפסטה (ברילה).", ["ynet-2022-02-02-importers", "calcalist-2022-02-09-suppliers", "davar-2022-08-03-importers"], { key: true }),
  N("yonischestowitz", "person", "יוני שסטוביץ", null, "הבעלים היחיד של שסטוביץ.", ["ynet-2022-02-02-importers", "davar-2022-08-03-importers"]),
  N("liemanschlissel", "company", "ליימן שליסל", "import", "יבואנית פרטית של לואקר, מנטוס, הרשי'ס, טופיפי, מרסי, ליפטון ופילסברי. לפי כלכליסט (2022): כ-37% מקטגוריית הוופלים (לואקר).", ["ynet-2022-02-02-importers", "calcalist-2022-02-09-suppliers", "ls-site"], { key: true }),
  N("liemanfam", "family", "ליימן ושליסל", null, "בני הדודים מוני ליימן וראובן שליסל, בעלי ליימן שליסל.", ["ynet-2022-02-02-importers", "davar-2022-08-03-importers"]),
  N("kimberly", "company", "קימברלי-קלארק ישראל", "import", "החברה הישראלית של קימברלי-קלארק העולמית: האגיס, קלינקס וקוטקס.", ["davar-2022-08-03-importers"]),
  N("kimberlyglobal", "company", "Kimberly-Clark", "import", "תאגיד מוצרי צריכה אמריקאי.", ["davar-2022-08-03-importers"], { abroad: true, geo: "ארה\"ב" }),
];
// brands: importer -> brand (franchise)
const B = (id, name, sector) => ({ id, type: "brand", name, sector, geo: "ישראל", abroad: false, summary: "", sources: [] });
const brandList = [
  ["b-mercedes", "מרצדס-בנץ ו-smart", "auto"], ["b-hyundai", "יונדאי וג'נסיס", "auto"], ["b-mitsubishi", "מיצובישי", "auto"], ["b-chinese-colmobil", "ORA, ג'אקו ואומודה", "auto"],
  ["b-toyota", "טויוטה", "auto"], ["b-lexus", "לקסוס", "auto"], ["b-gac", "GAC", "auto"],
  ["b-renault", "רנו ודאצ'יה", "auto"], ["b-nissan", "ניסאן", "auto"], ["b-chery", "צ'רי", "auto"],
  ["b-mazda", "מאזדה", "auto"], ["b-ford", "פורד", "auto"], ["b-bmw", "BMW ו-MINI", "auto"], ["b-nio", "NIO ודונגפנג", "auto"],
  ["b-vw", "פולקסווגן, אאודי, סקודה, סיאט וקופרה", "auto"], ["b-kia", "קיה", "auto"],
  ["b-pg", "פרוקטר אנד גמבל (פמפרס, אריאל, ג'ילט, טמפקס)", "import"], ["b-heinz", "היינץ", "import"], ["b-starkist", "סטארקיסט", "import"], ["b-kelloggs", "קלוגס", "import"], ["b-kikkoman", "קיקומן", "import"],
  ["b-colgate", "קולגייט", "import"], ["b-jnj", "ג'ונסון אנד ג'ונסון", "import"], ["b-barilla", "ברילה", "import"],
  ["b-loacker", "לואקר", "import"], ["b-mentos", "מנטוס", "import"], ["b-hersheys", "הרשי'ס", "import"], ["b-toffifee", "טופיפי ומרסי", "import"], ["b-lipton", "ליפטון", "import"], ["b-pillsbury", "פילסברי", "import"],
  ["b-huggies", "האגיס, קלינקס וקוטקס", "import"],
];
brandList.forEach(([id, name, sec]) => newNodes.push(B(id, name, sec)));

let ec = 0;
const E = (from, to, kind, share, label, srcs, conf, asOf, note = "") => ({ id: "w1-" + String(++ec).padStart(3, "0"), from, to, kind, share, label, note, former: false, asOf, confidence: conf, sources: srcs });
const newEdges = [
  // Colmobil
  E("harlapfam", "colmobil", "ownership", 100, "בעלות מלאה", ["wiki-colmobil"], "press", "2026-10-19", "חברה פרטית בבעלות משפחת חרל\"פ מאז 2003; תמרה חרל\"פ שותפה לבעלות"),
  E("harlap", "harlapfam", "ownership", null, "בן המשפחה", ["wiki-colmobil"], "press", "2026-10-19", "יו\"ר כלמוביל עד פטירתו באוגוסט 2026, לפי ויקיפדיה"),
  E("colmobil", "colmobilfin", "ownership", null, "חברה בת", ["wiki-colmobil", "colmobil-about"], "official", null),
  E("colmobil", "enerpoint", "ownership", null, "רכישה (2022)", ["wiki-colmobil", "colmobil-about"], "official", "2022-04-01"),
  E("colmobil", "apco", "ownership", 70, "70%", ["colmobil-about"], "official", null),
  E("colmobil", "b-mercedes", "franchise", null, "זיכיון יבוא", ["colmobil-org", "wiki-colmobil"], "official", null),
  E("colmobil", "b-hyundai", "franchise", null, "זיכיון יבוא", ["colmobil-org", "wiki-colmobil"], "official", null),
  E("colmobil", "b-mitsubishi", "franchise", null, "זיכיון יבוא", ["colmobil-org", "wiki-colmobil"], "official", null),
  E("colmobil", "b-chinese-colmobil", "franchise", null, "זיכיון יבוא", ["colmobil-org", "wiki-colmobil"], "official", null),
  // Union / Horesh
  E("horesh", "unionmotors", "ownership", null, "שליטה", ["wiki-horesh", "toyota-il-about"], "press", null),
  E("horesh", "lexmotors", "ownership", null, "שליטה", ["wiki-horesh"], "press", null),
  E("horesh", "orionmotors", "ownership", null, "שליטה", ["wiki-horesh"], "press", null),
  E("horesh", "superpharm", "ownership", 33, "33%", ["wiki-horesh"], "press", null),
  E("horesh", "matchretail", "ownership", null, "שליטה", ["wiki-horesh"], "press", null),
  E("unionmotors", "b-toyota", "franchise", null, "זיכיון יבוא", ["toyota-il-about"], "official", null),
  E("lexmotors", "b-lexus", "franchise", null, "זיכיון יבוא", ["wiki-horesh"], "press", null),
  E("orionmotors", "b-gac", "franchise", null, "זיכיון יבוא", ["wiki-horesh"], "press", null),
  // Carasso
  E("carassofam", "carasso", "ownership", 52, "52%", ["calcalist-2023-12-05-carasso"], "press", "2023-12-05", "בדצמבר 2023 הגישה המשפחה הצעת רכש ל-5% נוספים; אם תיענה במלואה, האחזקה תגיע ל-72%"),
  E("carasso", "b-renault", "franchise", null, "זיכיון יבוא", ["calcalist-2023-12-05-carasso"], "press", "2023-12-05"),
  E("carasso", "b-nissan", "franchise", null, "זיכיון יבוא", ["calcalist-2023-12-05-carasso"], "press", "2023-12-05"),
  E("carasso", "b-chery", "franchise", null, "זיכיון יבוא", ["calcalist-2023-12-05-carasso", "bizportal-carasso-chery"], "press", "2023-12-05"),
  // Delek Automotive
  E("agmon", "delekauto", "ownership", 50.1, "50.1%", ["calcalist-2024-03-03-delek-auto", "delek-motors-site"], "press", "2024-03-03"),
  E("delekauto", "b-mazda", "franchise", null, "זיכיון יבוא (דלק מוטורס)", ["delek-motors-site"], "official", null),
  E("delekauto", "b-ford", "franchise", null, "זיכיון יבוא (דלק מוטורס)", ["delek-motors-site"], "official", null),
  E("delekauto", "b-bmw", "franchise", null, "זיכיון יבוא (דלק מוטורס)", ["delek-motors-site"], "official", null),
  E("delekauto", "b-nio", "franchise", null, "זיכיון יבוא (דלק מוטורס)", ["delek-motors-site"], "official", null),
  // Allied / Champion
  E("allied", "champion", "ownership", null, "שליטה", ["champion-site", "allied-site"], "official", null),
  E("allied", "ashtrom", "ownership", null, "אחזקה", ["allied-site"], "official", null, "שיעור ההחזקה לא מצוין באתר"),
  E("allied", "carmeltunnels", "ownership", null, "אחזקה", ["allied-site"], "official", null, "שיעור ההחזקה לא מצוין באתר"),
  E("champion", "b-vw", "franchise", null, "זיכיון יבוא", ["champion-site"], "official", null),
  // Telcar
  E("ungerfam", "telcar", "ownership", null, "בעלות", ["kia-il-about"], "official", null),
  E("telcar", "b-kia", "franchise", null, "זיכיון יבוא", ["kia-il-about"], "official", null),
  // Diplomat
  E("weiman", "diplomat", "ownership", 14.19, "14.19%", ["bizportal-diplomat-holders"], "official", "2025-07-08", "בגרעין השליטה גם חברת עין מור (7.41%) ובני משפחה"),
  E("mandelfam", "diplomat", "ownership", 25.17, "כ-25.2%", ["bizportal-diplomat-holders"], "official", "2025-05-05", "ג'פרי מנדל 9.18%; לור, אנדרו וקלודין מנדל 5.33% כל אחד"),
  E("diplomat", "b-pg", "franchise", null, "הפצה", ["ynet-2022-02-02-importers", "calcalist-2022-02-09-suppliers"], "press", "2022-02-09"),
  E("diplomat", "b-heinz", "franchise", null, "יבוא והפצה", ["calcalist-2022-02-09-suppliers", "davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("diplomat", "b-starkist", "franchise", null, "יבוא והפצה", ["calcalist-2022-02-09-suppliers", "davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("diplomat", "b-kelloggs", "franchise", null, "יבוא והפצה", ["davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("diplomat", "b-kikkoman", "franchise", null, "יבוא והפצה", ["ynet-2022-02-02-importers"], "press", "2022-02-02"),
  // Schestowitz
  E("yonischestowitz", "schestowitz", "ownership", 100, "בעלות יחיד", ["ynet-2022-02-02-importers", "davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("schestowitz", "b-colgate", "franchise", null, "יבוא והפצה", ["calcalist-2022-02-09-suppliers", "davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("schestowitz", "b-jnj", "franchise", null, "יבוא והפצה", ["davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("schestowitz", "b-barilla", "franchise", null, "זיכיון בלעדי", ["ynet-2022-02-02-importers", "calcalist-2022-02-09-suppliers"], "press", "2022-02-09"),
  // Lieman Schlissel
  E("liemanfam", "liemanschlissel", "ownership", 100, "בעלות משפחתית", ["ynet-2022-02-02-importers", "davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("liemanschlissel", "b-loacker", "franchise", null, "זיכיון בלעדי", ["ynet-2022-02-02-importers", "calcalist-2022-02-09-suppliers"], "press", "2022-02-09"),
  E("liemanschlissel", "b-mentos", "franchise", null, "יבוא בלעדי", ["ynet-2022-02-02-importers", "davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("liemanschlissel", "b-hersheys", "franchise", null, "יבוא בלעדי", ["ynet-2022-02-02-importers"], "press", "2022-02-02"),
  E("liemanschlissel", "b-toffifee", "franchise", null, "יבוא בלעדי", ["ynet-2022-02-02-importers", "ls-site"], "press", "2022-02-02"),
  E("liemanschlissel", "b-lipton", "franchise", null, "יבוא והפצה", ["ls-site"], "official", null),
  E("liemanschlissel", "b-pillsbury", "franchise", null, "יבוא והפצה", ["ls-site"], "official", null),
  // Kimberly-Clark
  E("kimberlyglobal", "kimberly", "ownership", null, "חברה בת", ["davar-2022-08-03-importers"], "press", "2022-08-03"),
  E("kimberly", "b-huggies", "franchise", null, "מותגי הקבוצה", ["davar-2022-08-03-importers"], "press", "2022-08-03"),
];

// brand node sources = the sources of the link that leads to it
newEdges.forEach((e) => { const b = newNodes.find((n) => n.id === e.to && n.type === "brand"); if (b) b.sources = [...new Set([...b.sources, ...e.sources])]; });

const upsert = (arr, items) => { const ids = new Set(items.map((x) => x.id)); return [...arr.filter((x) => !ids.has(x.id)), ...items]; };
const outNodes = upsert(nodes, newNodes);
const harlap = outNodes.find((n) => n.id === "harlap");
if (harlap) { harlap.role = "ערב; ממשפחת חרל\"פ, בעלי כלמוביל"; harlap.summary = "יו\"ר כלמוביל. לפי ויקיפדיה כיהן עד פטירתו באוגוסט 2026. נתן ערבות של 986 אלף ₪ לישר!."; }

if (stories.some((s) => s.id === "imports")) stories.splice(stories.findIndex((s) => s.id === "imports"), 1);
stories.splice(stories.findIndex((s) => s.id === "ofer"), 0,
  {
    id: "imports", title: "יבוא ורכב", summary: "מי מחזיק בזיכיונות היבוא של מותגי הרכב ומוצרי הצריכה.",
    steps: [
      { title: "שוק הרכב", text: "שלושה יבואנים, כלמוביל, קרסו ויוניון, מסרו כמחצית מכלי הרכב בינואר–ספטמבר 2025. כל יבואן מחזיק בזיכיון הבלעדי של מותגיו.", view: "free", sectors: ["auto"], expand: ["colmobil", "carasso", "unionmotors", "delekauto", "champion", "telcar", "horesh", "harlapfam", "carassofam", "agmon", "allied", "ungerfam"] },
      { title: "כלמוביל", text: "בבעלות מלאה של משפחת חרל\"פ: מרצדס, יונדאי, מיצובישי ומותגים סיניים, לצד חברת מימון, אנרגיה סולארית וצמ\"ה.", view: "tree", focus: "colmobil", expand: ["harlapfam", "colmobil"] },
      { title: "קבוצת יוניון", text: "ג'ורג' חורש מחזיק ביבוא טויוטה ולקסוס, וגם ב-33% מסופר-פארם ובזיכיון של H&M.", view: "tree", focus: "horesh", expand: ["horesh"] },
      { title: "יבואני מוצרי הצריכה", text: "דיפלומט, שסטוביץ, ליימן שליסל וקימברלי-קלארק מחזיקות בזיכיונות של רוב המותגים הבינלאומיים בסופר. לפי כלכליסט (2022), לדיפלומט 90.8% ממכירות סכיני הגילוח.", view: "free", sectors: ["import"], expand: ["diplomat", "schestowitz", "liemanschlissel", "kimberly", "weiman", "yonischestowitz", "liemanfam", "kimberlyglobal", "mandelfam"] },
    ],
  });

write("sectors.json", sectors);
write("nodes.json", outNodes);
write("edges.json", upsert(edges, newEdges));
write("sources.json", upsert(sources, newSources));
write("stories.json", stories);
console.log("added", newNodes.length, "nodes,", newEdges.length, "edges,", newSources.length, "sources");
