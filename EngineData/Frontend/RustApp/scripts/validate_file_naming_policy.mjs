import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");
const repoRoot = resolve(appRoot, "..", "..", "..");

const requiredPaths = [
  "EngineData/Frontend/RustApp/src",
  "EngineData/Frontend/RustApp/src-tauri",
  "EngineData/Frontend/RustApp/src-tauri/src/app_bootstrap.rs",
  "EngineData/Frontend/RustApp/src-tauri/src/commands/registry.rs",
  "EngineData/Frontend/RustApp/src-tauri/src/engine/services/mod.rs",
  "EngineData/Frontend/RustApp/src-tauri/src/engine/domain/mod.rs",
  "EngineData/Backend/LocalWorker/WorkerRuntime",
  "EngineData/Backend/RuntimeContracts",
  "EngineData/Backend/RuntimeAssets",
  "UserData",
];

const retiredRootEntries = [
  "Launcher",
  "DeveloperData",
  "TranslateIT.vbs",
  "TranslateIT.cmd",
];

const missingRequired = requiredPaths.filter((path) => !existsSync(join(repoRoot, path)));
const restoredRetired = retiredRootEntries.filter((path) => existsSync(join(repoRoot, path)));

if (missingRequired.length > 0) {
  console.error(`Missing required active path(s): ${missingRequired.join(", ")}`);
  process.exit(1);
}

if (restoredRetired.length > 0) {
  console.error(`Retired root entry present: ${restoredRetired.join(", ")}`);
  process.exit(1);
}

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "target",
  "dist",
  ".vite",
  ".venv",
  "CacheData",
  "LogData",
]);

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

const sourceFiles = walk(join(appRoot, "src")).concat(walk(join(appRoot, "src-tauri", "src")));
const runtimePreviewImports = [];

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  if (text.includes("/Preview/") || text.includes("../Preview") || text.includes("Preview/")) {
    runtimePreviewImports.push(relative(repoRoot, file).replaceAll("\\\\", "/"));
  }
}

if (runtimePreviewImports.length > 0) {
  console.error(`Runtime source must not import preview-only files: ${runtimePreviewImports.join(", ")}`);
  process.exit(1);
}

console.log("File naming and active route policy passed.");
