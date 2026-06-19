import fs from "node:fs";
import path from "node:path";

export function repoRootFromCwd(cwd = process.cwd()) {
  return path.resolve(cwd, "..", "..", "..");
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function listFiles(root, patterns) {
  if (!exists(root) || !fs.statSync(root).isDirectory()) return [];
  const files = [];
  for (const pattern of patterns) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (pattern instanceof RegExp ? pattern.test(entry.name) : entry.name === pattern) {
        files.push(entry.name);
      }
    }
  }
  return [...new Set(files)].sort();
}

export function hasAnyFile(root, patterns) {
  if (!exists(root) || !fs.statSync(root).isDirectory()) return false;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return patterns.some((pattern) =>
    entries.some((entry) => entry.isFile() && (pattern instanceof RegExp ? pattern.test(entry.name) : entry.name === pattern)),
  );
}

export function directoryStats(root) {
  let files = 0;
  let bytes = 0;
  if (!exists(root)) return { files, bytes };
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        files += 1;
        try {
          bytes += fs.statSync(full).size;
        } catch {}
      }
    }
  };
  if (fs.statSync(root).isDirectory()) walk(root);
  return { files, bytes };
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function relative(root, target) {
  return path.relative(root, target).replaceAll("\\", "/");
}

export function sanitizePath(root, target) {
  return relative(root, target) || ".";
}
