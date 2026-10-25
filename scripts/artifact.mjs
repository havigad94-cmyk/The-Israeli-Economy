// Packs the built site into one page (styles and code inline) plus the data files, for publishing as a Claude artifact.
import fs from "node:fs";
const dist = new URL("../dist/", import.meta.url), out = new URL("../artifact/", import.meta.url);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(new URL("data/", out), { recursive: true });
let html = fs.readFileSync(new URL("index.html", dist), "utf8");
const css = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/);
const js = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
const head = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>")).replace(css[0], "").replace(js[0], "").replace(/<meta charset="utf-8">\s*/, "").replace(/<meta name="viewport"[^>]*>\s*/, "");
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
const page = `<title>מפת המשק הישראלי</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${head.replace(/<title>[^<]*<\/title>\s*/, "")}<style>\n${fs.readFileSync(new URL(css[1], dist), "utf8")}\n</style>\n${body}\n<script type="module">\n${fs.readFileSync(new URL(js[1], dist), "utf8").replace(/<\/script/g, "<\\/script")}\n</script>\n`;
fs.writeFileSync(new URL("index.html", out), page);
for (const f of fs.readdirSync(new URL("data/", dist))) fs.copyFileSync(new URL("data/" + f, dist), new URL("data/" + f, out));
console.log("artifact/index.html", page.length, "bytes");
