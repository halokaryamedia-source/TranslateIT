import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const files = [
  "src/styles.css",
  "src/settingsLayout.css",
  "src/professionalUi.css",
  "src/referenceLayout.css",
];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

const report = files.map((path) => {
  const content = read(path);
  return {
    path,
    important: countMatches(content, /!important/g),
    hexColors: countMatches(content, /#[0-9a-fA-F]{3,8}\b/g),
    fixedPx: countMatches(content, /\b\d+px\b/g),
    mediaQueries: countMatches(content, /@media/g),
  };
});

const totals = report.reduce((acc, item) => ({
  important: acc.important + item.important,
  hexColors: acc.hexColors + item.hexColors,
  fixedPx: acc.fixedPx + item.fixedPx,
  mediaQueries: acc.mediaQueries + item.mediaQueries,
}), { important: 0, hexColors: 0, fixedPx: 0, mediaQueries: 0 });

console.log("TranslateIT UI Design System Audit");
for (const item of report) {
  console.log(`- ${item.path}: !important=${item.important}, hex=${item.hexColors}, fixedPx=${item.fixedPx}, media=${item.mediaQueries}`);
}
console.log(`TOTAL: !important=${totals.important}, hex=${totals.hexColors}, fixedPx=${totals.fixedPx}, media=${totals.mediaQueries}`);

if (totals.mediaQueries < 2) {
  console.warn("WARN: Responsive coverage is still limited. Add desktop-sm and desktop-md breakpoints before marking UI production-final.");
}
if (totals.important > 120) {
  console.warn("WARN: CSS still depends heavily on !important. Plan a staged cleanup into canonical design-system CSS.");
}
