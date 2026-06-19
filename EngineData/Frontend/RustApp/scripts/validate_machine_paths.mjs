import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const errors = [];

const textExtensions = new Set([
  ".js", ".mjs", ".ts", ".tsx", ".rs", ".json", ".md", ".toml", ".ps1", ".py", ".css", ".html"
]);

const skippedDirs = new Set([
  ".git", "node_modules", "target", "dist", ".venv", "__pycache__", "UserData"
]);

const allowedMentions = [
  "C:\\...",
  "D:\\...",
  "Historical reference only",
  "machine-specific absolute paths",
  "absolute path"
];

const absolutePathPattern = /\b[A-Za-z]:\\[^\s"'`<>]+/g;

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skippedDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    if (entry.isFile() && textExtensions.has(extname(entry.name))) files.push(fullPath);
  }
  return files;
}

for (const fullPath of walk(repoRoot)) {
  const content = readFileSync(fullPath, "utf8");
  const matches = content.match(absolutePathPattern) ?? [];
  const actionable = matches.filter((match) => !allowedMentions.some((allowed) => match.includes(allowed)));
  if (actionable.length > 0) {
    errors.push(`${relative(repoRoot, fullPath)} contains machine-specific absolute path(s): ${actionable.slice(0, 3).join(", ")}`);
  }
}

if (errors.length > 0) {
  console.error("Machine-specific path validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Machine-specific path validation passed.");
