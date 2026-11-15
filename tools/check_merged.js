// Check index.html against the two part trainers it was built from.
//
// usage: node tools/check_merged.js tools/parts/units-1-3-trainer.html tools/parts/units-4-6-trainer.html index.html [--plant]
//
//  1. the page script parses;
//  2. each part's data in NE_PARTS equals the data of its source file (questions, categories, labels,
//     tags, flashcards, deck names, storage keys) and its menus are the source menus;
//  3. the engine of index.html, with one part's values put back, is character for character the
//     engine of that part's source file;
//  4. every question's answer is among its options; ids are unique.
// --plant changes one answer and one engine character in memory; the run must then fail on both.
"use strict";
const fs = require("fs");
const vm = require("vm");

const args = process.argv.slice(2).filter(a => a !== "--plant");
const plant = process.argv.includes("--plant");
const [file13, file46, indexFile] = args;
const problems = [];

function between(text, start, end) {
  const i = text.indexOf(start);
  const j = text.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error("not found: " + start.slice(0, 50));
  return text.slice(i, j);
}

// ---------- index.html ----------
let page = fs.readFileSync(indexFile, "utf8");
let script = page.slice(page.indexOf("<script>\n") + 9, page.lastIndexOf("</script>"));
if (plant) {
  script = script.replace('"a":"', '"a":"PLANTED');                       // one answer changed
  script = script.replace("var cat=CATS[0],", "var cat=CATS[1],");      // one engine change
  console.log("PLANT: one answer changed, one engine line changed");
}
try {
  new vm.Script(script, { filename: "index-script.js" });
} catch (e) {
  problems.push("index.html script does not parse: " + e.message);
}
const partsJs = between(script, "var NE_PARTS = {};", "/* ==================== PART CHOOSER");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(partsJs, ctx);
const NE = ctx.NE_PARTS;
const mergedEngine = script.slice(script.indexOf("var D = PART.D;"));

// ---------- one source part ----------
function readSource(file) {
  const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const s = src.slice(src.indexOf("<script>\n") + 9, src.lastIndexOf("</script>"));
  const body = between(src, "<body>\n", "<script>\n");
  const c = {};
  vm.createContext(c);
  const dBlock = between(s, "var D = {", "\n};") + "\n};";
  const fcBlock = between(s, "var FC = {", "\n};") + "\n};";
  const tagEnd = s.indexOf("};", s.indexOf("var TAG = {")) + 2;
  const catsBlock = s.slice(s.indexOf("var CATS = "), tagEnd);
  vm.runInContext(dBlock + "\n" + catsBlock + "\n" + fcBlock, c);
  const fcRest = s.slice(s.indexOf(fcBlock) + fcBlock.length);
  return {
    s, body, dBlock, fcBlock, catsBlock, tagEnd, fcRest,
    data: {
      D: c.D, CATS: c.CATS, LABELS: c.LABELS, TAG: c.TAG, FC: c.FC,
      FC_LABELS: JSON.parse(fcRest.match(/^var FC_LABELS=(\{[^\n]*\});$/m)[1]),
      FC_CAT_CLASS: JSON.parse(fcRest.match(/^var FC_CAT_CLASS=(\{[^\n]*\});$/m)[1]),
      FC_TAGS: JSON.parse(fcRest.match(/^ {2}var catLabel=(\{[^\n]*\})\[catCls\];$/m)[1]),
      keys: {
        s: s.match(/getItem\("(ne\d\dv1)"\)/)[1],
        sn: s.match(/getItem\("(ne\d\dsnv1)"\)/)[1],
        audio: s.match(/getItem\("(ne\d\d_audio)"\)/)[1],
      },
    },
    menus: {
      navSide: body.match(/<nav class="sidebar">\n([\s\S]*?)\n<\/nav>/)[1],
      navDrawer: body.match(/<div style="padding:0 8px">\n([\s\S]*?)\n {2}<\/div>\n<\/div>\n<div class="layout">/)[1],
      bars: body.match(/<div class="cbars">\n([\s\S]*?)\n {4}<\/div>/)[1],
    },
  };
}

for (const [id, file] of [["13", file13], ["46", file46]]) {
  const src = readSource(file);
  const part = NE[id];
  if (!part) {
    problems.push(`NE_PARTS["${id}"] missing`);
    continue;
  }
  // ---------- 2. data and menus ----------
  for (const key of Object.keys(src.data)) {
    if (JSON.stringify(part[key]) !== JSON.stringify(src.data[key])) problems.push(`part ${id}: ${key} differs from ${file}`);
  }
  for (const key of Object.keys(src.menus)) {
    if (part[key].join("\n") !== src.menus[key]) problems.push(`part ${id}: menu ${key} differs from ${file}`);
  }
  // ---------- 3. engine, with this part's values put back ----------
  const firstCat = src.data.CATS[0];
  const firstDeck = Object.keys(src.data.FC_LABELS)[0];
  let e = mergedEngine;
  const back = [
    ["var D = PART.D;\n\nvar CATS = PART.CATS;\nvar LABELS = PART.LABELS;\nvar TAG = PART.TAG;\n", ""],
    ["var FC = PART.FC;\n\n", ""],
    ["PART.keys.sn", JSON.stringify(src.data.keys.sn)],
    ["PART.keys.s", JSON.stringify(src.data.keys.s)],
    ["PART.keys.audio", JSON.stringify(src.data.keys.audio)],
    ["var cat=CATS[0],", `var cat="${firstCat}",`],
    ['"Outstanding! You really know "+PART.name+"."', `"Outstanding! You really know ${part.name}."`],
    ['CATS.concat(["all"]).forEach', JSON.stringify(src.data.CATS.concat(["all"])).replace(/","/g, '", "') + ".forEach"],
    ["var FC_LABELS=PART.FC_LABELS;", "var FC_LABELS=" + JSON.stringify(src.data.FC_LABELS).replace(/","/g, '", "').replace(/":"/g, '": "') + ";"],
    ["var FC_CAT_CLASS=PART.FC_CAT_CLASS;", "var FC_CAT_CLASS=" + JSON.stringify(src.data.FC_CAT_CLASS).replace(/","/g, '", "').replace(/":"/g, '": "') + ";"],
    ["var catLabel=PART.FC_TAGS[catCls];", "var catLabel=" + JSON.stringify(src.data.FC_TAGS).replace(/","/g, '", "').replace(/":"/g, '": "') + "[catCls];"],
    ["var fcCat=Object.keys(FC_LABELS)[0],", `var fcCat="${firstDeck}",`],
  ];
  for (const [a, b] of back) e = e.split(a).join(b);
  const srcEngine = src.s.slice(src.tagEnd).split(src.fcBlock).join("");
  if (e !== srcEngine) {
    const x = e.split("\n"), y = srcEngine.split("\n");
    const k = x.findIndex((l, i) => l !== y[i]);
    problems.push(`part ${id}: engine differs from ${file} at line ${k + 1}: ${JSON.stringify(x[k]).slice(0, 90)} / ${JSON.stringify(y[k]).slice(0, 90)}`);
  }
  // ---------- 4. answers among options, unique ids ----------
  const ids = new Set();
  for (const c of part.CATS) {
    for (const q of part.D[c]) {
      if (ids.has(q.id)) problems.push(`part ${id}: duplicate id ${q.id}`);
      ids.add(q.id);
      if (!q.o.includes(q.a)) problems.push(`part ${id}: ${q.id} answer not among options`);
    }
  }
  console.log(`part ${id} (${part.name}): ${ids.size} questions, ${Object.values(part.FC).reduce((n, d) => n + d.length, 0)} flashcards`);
}
for (const p of problems) console.log("PROBLEM:", p);
if (plant) {
  const ok = problems.some(p => /D differs|answer not among/.test(p)) && problems.some(p => /engine differs/.test(p));
  console.log(ok ? "planted errors caught (check fails as it should)" : "PLANTED ERRORS NOT CAUGHT");
  process.exit(ok ? 0 : 1);
}
console.log(problems.length ? "FAILED" : "OK");
process.exit(problems.length ? 1 : 0);
