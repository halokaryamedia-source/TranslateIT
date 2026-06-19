import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "..", "..", "..");
const appRoot = path.join(root, "EngineData", "LauncherApp", "RustApp");
const sourceRoots = [
  path.join(appRoot, "src"),
  path.join(appRoot, "src-tauri", "src"),
];
const forbiddenRuntimeTerms = [
  "DeveloperData",
  "DevelopingData/DocumentationData",
  "DevelopingData/Reports",
  "DevelopingData/Tests",
  "DevelopingData/ToolKitData",
  "EngineData/TranscriptEngine",
  "EngineData/TranslateEngine",
  "EngineData/VoiceEngine",
  "EngineData/RuntimeAssets",
  "EngineData/LauncherApp/Workers",
  "Launcher/Preview",
  "TranslateIT.vbs",
  "TranslateIT.cmd",
];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".rs", ".css", ".html"]);

function rel(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (["node_modules", "target", "dist", "__pycache__"].includes(name)) continue;
    const itemPath = path.join(dir, name);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) out.push(...walk(itemPath));
    else if (sourceExtensions.has(path.extname(name))) out.push(itemPath);
  }
  return out;
}

const blockers = [];
const warnings = [];
const inspected = [];
for (const rootDir of sourceRoots) {
  for (const filePath of walk(rootDir)) {
    const text = fs.readFileSync(filePath, "utf8");
    const relativePath = rel(filePath);
    inspected.push(relativePath);
    for (const term of forbiddenRuntimeTerms) {
      if (text.includes(term)) blockers.push(`${relativePath}: references retired path ${term}`);
    }
    const lineCount = text.split(/\r?\n/).length;
    if (lineCount > 650) warnings.push(`${relativePath}: large module (${lineCount} lines); split during next modularization pass`);
  }
}

const report = {
  schema: "translateit.modular_boundaries.v1",
  ok: blockers.length === 0,
  status: blockers.length === 0 ? "PASS" : "FAIL",
  inspected_count: inspected.length,
  blockers,
  warnings,
  note: "This validates active runtime source boundaries only. Large-module warnings are non-blocking until the next controlled refactor pass.",
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = blockers.length === 0 ? 0 : 1;
