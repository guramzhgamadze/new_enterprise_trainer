// Build index.html: the Units 1–3 and Units 4–6 trainers in one page with a part chooser.
//
// usage: node tools/build_merged.js tools/parts/units-1-3-trainer.html tools/parts/units-4-6-trainer.html index.html
//
// The two part files share one engine (CSS + JS); they differ only in their data, their menus and a few
// per-part values (storage keys, first category, flashcard deck names). The script
//   1. reads both parts and checks that their engines are identical once those values are set aside;
//   2. keeps the engine once, with the per-part values read from PART (the chosen part);
//   3. writes both parts' data as NE_PARTS, one record per line.
// Every text replacement checks its number of matches; any surprise stops the build.
"use strict";
const fs = require("fs");
const vm = require("vm");

const [file13, file46, outFile] = process.argv.slice(2);
if (!outFile) {
  console.error("usage: node tools/build_merged.js <units-1-3.html> <units-4-6.html> <index.html>");
  process.exit(2);
}

function fail(msg) {
  console.error("BUILD STOPPED: " + msg);
  process.exit(1);
}

function cut(text, start, end) {
  const i = text.indexOf(start);
  if (i < 0) fail("not found: " + start.slice(0, 60));
  const j = text.indexOf(end, i);
  if (j < 0) fail("not found after " + start.slice(0, 30) + ": " + end.slice(0, 60));
  return text.slice(i, j);
}

function replaceCounted(text, oldText, newText, count) {
  const n = text.split(oldText).length - 1;
  if (n !== count) fail(`expected ${count} match(es), found ${n}: ${oldText.slice(0, 80)}`);
  return text.split(oldText).join(newText);
}

function grab(text, regex, what) {
  const m = text.match(regex);
  if (!m) fail("not found: " + what);
  return m;
}

// ---------- read one part ----------
function readPart(file, id, slug) {
  const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const css = cut(src, "<style>\n", "</style>").slice("<style>\n".length);
  const body = cut(src, "<body>\n", "<script>\n").slice("<body>\n".length);
  const script = cut(src, "<script>\n", "</script>").slice("<script>\n".length);

  const dBlock = cut(script, "var D = {", "\n};") + "\n};";
  const catsStart = script.indexOf("var CATS = ");
  const tagEnd = script.indexOf("};", script.indexOf("var TAG = {")) + 2;
  const catsBlock = script.slice(catsStart, tagEnd);
  const fcBlock = cut(script, "var FC = {", "\n};") + "\n};";
  const engine = script.slice(tagEnd, script.indexOf("/* ==================== FLASHCARD ENGINE"));
  const fcEngine = script.slice(script.indexOf(fcBlock) + fcBlock.length);

  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(dBlock + "\n" + catsBlock + "\n" + fcBlock, ctx);
  const fcLabelsLine = grab(fcEngine, /^var FC_LABELS=(\{[^\n]*\});$/m, "FC_LABELS")[0];
  const fcClassLine = grab(fcEngine, /^var FC_CAT_CLASS=(\{[^\n]*\});$/m, "FC_CAT_CLASS")[0];
  const catLabelLine = grab(fcEngine, /^ {2}var catLabel=(\{[^\n]*\})\[catCls\];$/m, "catLabel")[0];
  const fcCatLine = grab(fcEngine, /^var fcCat="(fc-[a-z0-9]+)",/m, "fcCat")[0];
  const catLine = grab(engine, /^var cat="([a-z0-9]+)",/m, "first category")[0];
  const forEachLine = grab(engine, /^ {2}(\[[^\]]*"all"\])\.forEach/m, "statistics category list")[1];
  const name = grab(src, /<title>(Units \d–\d) Trainer - New Enterprise C1<\/title>/, "title")[1];
  const outstanding = `"Outstanding! You really know ${name}."`;
  const keyS = grab(engine, /localStorage\.getItem\("(ne\d\dv1)"\)/, "stats key")[1];
  const keySn = grab(engine, /localStorage\.getItem\("(ne\d\dsnv1)"\)/, "snapshot key")[1];
  const keyAudio = grab(fcEngine, /localStorage\.getItem\("(ne\d\d_audio)"\)/, "audio key")[1];

  // engine with the per-part values set aside, for the comparison of the two parts
  let norm = engine + "\n/*FC*/\n" + fcEngine;
  for (const [oldText, ph] of [[`"${keyS}"`, "@KEY_S"], [`"${keySn}"`, "@KEY_SN"], [`"${keyAudio}"`, "@KEY_AUDIO"],
    [catLine, "@CAT_LINE"], [outstanding, "@OUTSTANDING"], [forEachLine, "@FOREACH"],
    [fcLabelsLine, "@FC_LABELS"], [fcClassLine, "@FC_CLASS"], [catLabelLine, "@CATLABEL"], [fcCatLine, "@FCCAT"]]) {
    if (!norm.includes(oldText)) fail(`${name}: ${oldText.slice(0, 60)} not found in the engine`);
    norm = norm.split(oldText).join(ph);
  }

  const navDrawer = grab(body, /<div style="padding:0 8px">\n([\s\S]*?)\n {2}<\/div>\n<\/div>\n<div class="layout">/, "drawer menu")[1];
  const navSide = grab(body, /<nav class="sidebar">\n([\s\S]*?)\n<\/nav>/, "sidebar menu")[1];
  const bars = grab(body, /<div class="cbars">\n([\s\S]*?)\n {4}<\/div>/, "statistics bars")[1];
  const qt = grab(body, /<span class="q-title" id="qt">([^<]*)<\/span>/, "first title")[1];

  const fcLabels = JSON.parse(fcLabelsLine.slice("var FC_LABELS=".length, -1));
  const fcClass = JSON.parse(fcClassLine.slice("var FC_CAT_CLASS=".length, -1));
  const fcTags = JSON.parse(catLabelLine.trim().slice("var catLabel=".length, -"[catCls];".length));
  const units = ctx.CATS.filter(c => /^v\d$/.test(c)).map(c => ctx.LABELS[c].replace(/^Unit \d vocabulary: /, ""));
  const total = ctx.CATS.reduce((n, c) => n + ctx.D[c].length, 0);
  const cards = Object.values(ctx.FC).reduce((n, d) => n + d.length, 0);
  return {
    css, body, engine, fcEngine, norm,
    data: {
      id, slug, name, units, total, cards, qt,
      keys: { s: keyS, sn: keySn, audio: keyAudio },
      CATS: ctx.CATS, LABELS: ctx.LABELS, TAG: ctx.TAG,
      FC_LABELS: fcLabels, FC_CAT_CLASS: fcClass, FC_TAGS: fcTags,
      navSide: navSide.split("\n"), navDrawer: navDrawer.split("\n"), bars: bars.split("\n"),
      D: ctx.D, FC: ctx.FC,
    },
    vals: { keyS, keySn, keyAudio, catLine, outstanding, forEachLine, fcLabelsLine, fcClassLine, catLabelLine, fcCatLine },
  };
}

const p13 = readPart(file13, "13", "units-1-3");
const p46 = readPart(file46, "46", "units-4-6");

// ---------- 1. the engines must be the same ----------
if (p13.norm !== p46.norm) {
  const a = p13.norm.split("\n"), b = p46.norm.split("\n");
  const i = a.findIndex((line, k) => line !== b[k]);
  fail(`the two engines differ at line ${i + 1}:\n  1–3: ${a[i]}\n  4–6: ${b[i]}`);
}

// ---------- CSS: both parts' colour classes, plus the chooser and the part switch ----------
const css46 = p46.css.split("\n");
const css13 = p13.css.split("\n");
const set46 = new Set(css46), set13 = new Set(css13);
const only13 = css13.filter(l => !set46.has(l));
const only46 = css46.filter(l => !set13.has(l));
for (const l of only13.concat(only46)) {
  if (!/^\.(d-[a-z0-9]+\{background|qtag\.[a-z0-9]+\{color|fc-cat-tag\.[a-z0-9]+\{color)/.test(l)) {
    fail("the CSS differs in more than the category colours: " + l);
  }
}
const extraCss = fs.readFileSync(__dirname + "/merged.css", "utf8").replace(/\r\n/g, "\n");
const css = p46.css.replace(/\n$/, "") + "\n/* Units 1–3 category colours */\n" + only13.join("\n") + "\n" + extraCss;

// ---------- body: empty containers that the setup script fills for the chosen part ----------
let body = p46.body;
body = replaceCounted(body, '  <div class="logo">Units 4–6 Trainer <span>- New Enterprise C1</span></div>\n',
  '  <div class="head-left">\n' +
  '    <div class="logo"><b id="logo-part">Trainer</b> <span>· New Enterprise C1</span></div>\n' +
  '    <div class="part-switch" role="group" aria-label="Part">\n' +
  '      <button class="ps-btn" data-part="13" onclick="choosePart(this.dataset.part)">Units 1–3</button>\n' +
  '      <button class="ps-btn" data-part="46" onclick="choosePart(this.dataset.part)">Units 4–6</button>\n' +
  '    </div>\n' +
  '  </div>\n', 1);
body = replaceCounted(body, '    <span class="drawer-title">New Enterprise · Units 4–6</span>',
  '    <span class="drawer-title">New Enterprise C1</span>', 1);
body = replaceCounted(body, '  <div style="padding:0 8px">\n',
  '  <div class="part-switch drawer-switch" role="group" aria-label="Part">\n' +
  '    <button class="ps-btn" data-part="13" onclick="choosePart(this.dataset.part)">Units 1–3</button>\n' +
  '    <button class="ps-btn" data-part="46" onclick="choosePart(this.dataset.part)">Units 4–6</button>\n' +
  '  </div>\n' +
  '  <div style="padding:0 8px" id="drawer-nav">\n', 1);
body = replaceCounted(body, p46.data.navDrawer.join("\n") + "\n", "", 1);
body = replaceCounted(body, '<nav class="sidebar">\n' + p46.data.navSide.join("\n") + "\n</nav>",
  '<nav class="sidebar" id="side-nav">\n</nav>', 1);
body = replaceCounted(body, '<div class="cbars">\n' + p46.data.bars.join("\n") + "\n",
  '<div class="cbars" id="cbars">\n', 1);
body = replaceCounted(body, `<span class="q-title" id="qt">${p46.data.qt}</span>`, '<span class="q-title" id="qt"></span>', 1);
const chooser = fs.readFileSync(__dirname + "/chooser.html", "utf8").replace(/\r\n/g, "\n");
body = chooser + body;

// ---------- engine: per-part values from PART ----------
const v = p46.vals;
let engine = p46.engine;
engine = replaceCounted(engine, `"${v.keyS}"`, "PART.keys.s", 2);
engine = replaceCounted(engine, `"${v.keySn}"`, "PART.keys.sn", 2);
engine = replaceCounted(engine, v.catLine, "var cat=CATS[0],", 1);
engine = replaceCounted(engine, v.outstanding, '"Outstanding! You really know "+PART.name+"."', 1);
engine = replaceCounted(engine, v.forEachLine + ".forEach", "CATS.concat([\"all\"]).forEach", 1);
let fcEngine = p46.fcEngine;
fcEngine = replaceCounted(fcEngine, v.fcLabelsLine, "var FC_LABELS=PART.FC_LABELS;", 1);
fcEngine = replaceCounted(fcEngine, v.fcClassLine, "var FC_CAT_CLASS=PART.FC_CAT_CLASS;", 1);
fcEngine = replaceCounted(fcEngine, v.catLabelLine, "  var catLabel=PART.FC_TAGS[catCls];", 1);
fcEngine = replaceCounted(fcEngine, v.fcCatLine, "var fcCat=Object.keys(FC_LABELS)[0],", 1);
fcEngine = replaceCounted(fcEngine, `"${v.keyAudio}"`, "PART.keys.audio", 2);
if (/ne\d\d|"v[1-6]"|fc-u[1-6]/.test(engine + fcEngine)) fail("a part-specific value is left in the engine");

// ---------- data: one record per line ----------
function isPrim(x) {
  return x === null || typeof x !== "object";
}

function inline(x) {
  if (isPrim(x)) return true;
  const vals = Array.isArray(x) ? x : Object.values(x);
  const flat = vals.every(y => isPrim(y) || (Array.isArray(y) && y.every(isPrim)));
  if (!Array.isArray(x) && "id" in x && flat) return true;          // a question or a flashcard
  return vals.every(isPrim) && JSON.stringify(x).length <= 160;
}

function fmt(x, ind) {
  if (inline(x)) return JSON.stringify(x);
  const pad = "  ".repeat(ind + 1), end = "  ".repeat(ind);
  if (Array.isArray(x)) return "[\n" + x.map(y => pad + fmt(y, ind + 1)).join(",\n") + "\n" + end + "]";
  return "{\n" + Object.entries(x).map(([k, y]) => pad + JSON.stringify(k) + ": " + fmt(y, ind + 1)).join(",\n") + "\n" + end + "}";
}

const partsJs = "var NE_PARTS = {};\n" +
  'NE_PARTS["13"] = ' + fmt(p13.data, 0) + ";\n" +
  'NE_PARTS["46"] = ' + fmt(p46.data, 0) + ";\n";
const setup = fs.readFileSync(__dirname + "/setup.js", "utf8").replace(/\r\n/g, "\n");
const engineJs =
  "var D = PART.D;\n\n" +
  "var CATS = PART.CATS;\nvar LABELS = PART.LABELS;\nvar TAG = PART.TAG;\n" +
  engine +
  "/* ==================== FLASHCARD ENGINE ==================== */\n" +
  "var FC = PART.FC;\n\n" +
  fcEngine;
// "</" inside the data strings (e.g. "</button>") is written as "<\/" so it cannot close the script tag;
// the engine and the setup code are left as they are (the engine has a regex /</g)
const script = partsJs.replace(/<\//g, "<\\/") + "\n" + setup + "\n" + engineJs;
if (/<\/script/i.test(setup + engineJs)) fail("'</script' inside the code");

const head = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
  "<title>New Enterprise C1 Trainer</title>\n" +
  '<meta name="description" content="New Enterprise C1 – Units 1–3 and Units 4–6: vocabulary, grammar and Word List practice">\n';
const page = head + "<style>\n" + css + "</style>\n</head>\n<body>\n" + body + "<script>\n" + script + "</script>\n</body>\n</html>\n";
new vm.Script(page.slice(page.indexOf("<script>\n") + 9, page.lastIndexOf("</script>")), { filename: "index-script.js" });
fs.writeFileSync(outFile, page, "utf8");
console.log(`written ${outFile} (${page.length.toLocaleString("en")} chars)`);
for (const p of [p13, p46]) {
  console.log(`  ${p.data.name}: ${p.data.total} questions in ${p.data.CATS.length} categories, ${p.data.cards} flashcards`);
}
