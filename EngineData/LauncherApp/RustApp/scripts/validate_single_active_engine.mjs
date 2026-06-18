import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const errors = [];

const requiredActivePaths = [
  "EngineData/LauncherApp/RustApp/package.json",
  "EngineData/LauncherApp/RustApp/src/main.ts",
  "EngineData/LauncherApp/RustApp/src-tauri/src/main.rs",
  "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
  "EngineData/Backend/RuntimeContracts/FINAL_ARCHITECTURE_CONTRACT.json",
  "DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md",
  "DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md",
];

const forbiddenPaths = [
  "EngineData/TranscriptEngine",
  "EngineData/TranslateEngine",
  "EngineData/VoiceEngine",
  "EngineData/RuntimeAssets",
  "EngineData/LauncherApp/Workers",
  "EngineData/LauncherApp/launcher.py",
  "EngineData/LauncherApp/app.py",
  "EngineData/LauncherApp/main.py",
  "EngineData/LauncherApp/latency_meter.py",
  "EngineData/LauncherApp/session_reporting.py",
  "DevelopingData/LauncherHelpers/run_translateit_legacy_tts.bat",
  "DevelopingData/Documentation/Reports/Engineering/LEGACY_REFERENCE_POLICY.md",
];

const scanRoots = [
  "EngineData/README.md",
  "EngineData/Backend/README.md",
  "EngineData/LauncherApp/RustApp/src",
  "EngineData/LauncherApp/RustApp/src-tauri/src",
  "EngineData/LauncherApp/RustApp/scripts",
  "EngineData/Backend/RuntimeContracts",
  "DevelopingData/Documentation/README.md",
  "DevelopingData/Documentation/Reports/Engineering/ACTIVE_DOCUMENTATION_INDEX.md",
  "DevelopingData/Documentation/Reports/Engineering/CURRENT_APP_STATUS.md",
  "DevelopingData/Documentation/Reports/Engineering/SINGLE_ACTIVE_ENGINE_POLICY.md",
  "DevelopingData/Documentation/Reports/Engineering/CAPTURE_HELPER_BRIDGE_MIGRATION_PLAN.md",
];

const allowedWordExceptions = new Set([
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_PLACEHOLDER.json",
]);

const textExtensions = new Set([".md", ".json", ".ts", ".tsx", ".js", ".mjs", ".rs", ".py", ".toml", ".html", ".css"]);

function repoPath(path) {
  return resolve(repoRoot, path);
}

function toRepoRelative(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function checkExists(path) {
  if (!existsSync(repoPath(path))) errors.push(`Missing active engine path: ${path}`);
}

function checkForbiddenMissing(path) {
  if (existsSync(repoPath(path))) errors.push(`Forbidden inactive engine path exists: ${path}`);
}

function shouldScan(path) {
  if (!textExtensions.has(extname(path))) return false;
  const rel = toRepoRelative(path);
  if (rel.includes("/node_modules/") || rel.includes("/target/") || rel.includes("/dist/")) return false;
  return true;
}

function scanFile(path) {
  const rel = toRepoRelative(path);
  if (allowedWordExceptions.has(rel)) return;
  const content = readFileSync(path, "utf8");
  if (/legacy/i.test(content)) errors.push(`Forbidden legacy wording in active engine surface: ${rel}`);
  if (/Python\/Qt/i.test(content)) errors.push(`Forbidden alternate shell wording in active engine surface: ${rel}`);
  if (/PyQt|PySide|tkinter/i.test(content)) errors.push(`Forbidden Python UI shell marker in active engine surface: ${rel}`);
}

function scanPath(path) {
  const full = repoPath(path);
  if (!existsSync(full)) return;
  const stat = statSync(full);
  if (stat.isFile()) {
    if (shouldScan(full)) scanFile(full);
    return;
  }
  for (const entry of readdirSync(full)) {
    scanPath(join(path, entry));
  }
}

requiredActivePaths.forEach(checkExists);
forbiddenPaths.forEach(checkForbiddenMissing);
scanRoots.forEach(scanPath);

if (errors.length > 0) {
  console.error("Single active engine validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Single active engine validation passed.");
