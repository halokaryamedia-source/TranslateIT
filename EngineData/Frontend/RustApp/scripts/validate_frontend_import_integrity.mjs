import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");
const sourceRoot = join(appRoot, "src");

const ignoredDirectories = new Set(["node_modules", "dist", "target", ".vite"]);
const scannedExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const candidateExtensions = ["", ".ts", ".tsx", ".js", ".mjs", ".css", ".json"];

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else if (scannedExtensions.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

function importSpecifiers(source) {
  const specs = [];
  const staticImport = /import\s+(?:[^"']+\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImport = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = staticImport.exec(source))) specs.push(match[1]);
  while ((match = dynamicImport.exec(source))) specs.push(match[1]);
  return specs;
}

function resolves(baseFile, specifier) {
  if (!specifier.startsWith(".")) return true;
  const base = resolve(dirname(baseFile), specifier);
  for (const extension of candidateExtensions) {
    if (existsSync(`${base}${extension}`)) return true;
  }
  for (const indexFile of ["index.ts", "index.tsx", "index.js", "index.mjs"]) {
    if (existsSync(join(base, indexFile))) return true;
  }
  return false;
}

const failures = [];
for (const file of walk(sourceRoot)) {
  const source = readFileSync(file, "utf8");
  for (const specifier of importSpecifiers(source)) {
    if (!resolves(file, specifier)) {
      failures.push(`${file.replace(`${appRoot}/`, "")} -> ${specifier}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Frontend import integrity failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Frontend import integrity passed.");
