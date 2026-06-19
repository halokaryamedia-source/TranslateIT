import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { exists, directoryStats, readJson, repoRootFromCwd, sanitizePath } from "./model_paths.mjs";

const root = repoRootFromCwd();
const outDir = path.join(root, "UserData", "CacheData", "validation");
const outPath = path.join(outDir, "latest_model_duplicate_audit.json");
const manifestPath = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "model_manifest.json");

const roots = [
  path.join(root, "EngineData", "Backend", "RuntimeAssets"),
  path.join(root, "EngineData", "TranscriptEngine", "ModelData"),
  path.join(root, "EngineData", "TranslateEngine", "ModelData"),
  path.join(root, "DevelopingData", "ToolKitData", "ModelCache"),
  path.join(root, "UserData", "CacheData", "model_downloads"),
];

const skipSegments = new Set(["node_modules", "target", "dist", ".git", ".venv", "logs"]);

function ensureOutDir() {
  fs.mkdirSync(outDir, { recursive: true });
}

function isSkipped(fullPath) {
  return fullPath.split(path.sep).some((segment) => skipSegments.has(segment));
}

function walkDirectories(start) {
  const found = [];
  if (!exists(start) || isSkipped(start)) return found;
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    if (!exists(current) || isSkipped(current)) continue;
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory()) continue;
    found.push(current);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(current, entry.name);
      if (!isSkipped(child)) stack.push(child);
    }
  }
  return found;
}

function markerSignature(dir) {
  if (!exists(dir) || !fs.lstatSync(dir).isDirectory()) return null;
  const markers = [];
  const names = fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
  for (const name of names) {
    if (name === "model.bin" || name === "config.json" || name === "tokenizer.json" || name === "tokenizer.model" || name === "vocabulary.json" || name === "tokenizer_config.json" || name === "sentencepiece.bpe.model" || name === "spiece.model" || name === "source.spm" || name === "target.spm" || name === "pytorch_model.bin" || name === "model.safetensors" || name.endsWith(".onnx") || name.endsWith(".onnx.json") || name.endsWith(".gguf") || name === "piper.exe") {
      markers.push(name);
    }
  }
  if (markers.length === 0) return null;
  return markers.sort().join("|");
}

function markerDetails(dir) {
  const stats = directoryStats(dir);
  return {
    path: sanitizePath(root, dir),
    size_bytes: stats.bytes,
    file_count: stats.files,
    is_junction: Boolean(fs.lstatSync(dir).isSymbolicLink?.() || fs.lstatSync(dir).isDirectory?.() && fs.lstatSync(dir).isDirectory() && fs.lstatSync(dir).isSymbolicLink),
  };
}

function activeRuntimeTargets(manifest) {
  const targets = new Set();
  for (const model of manifest.models ?? []) {
    if (model.expected_path) targets.add(path.join(root, model.expected_path));
    for (const legacy of model.legacy_paths ?? []) targets.add(path.join(root, legacy));
  }
  return targets;
}

function main() {
  ensureOutDir();
  const manifest = exists(manifestPath) ? readJson(manifestPath) : { models: [] };
  const activeTargets = activeRuntimeTargets(manifest);
  const directories = [];
  for (const base of roots) directories.push(...walkDirectories(base));

  const bySignature = new Map();
  for (const dir of directories) {
    const sig = markerSignature(dir);
    if (!sig) continue;
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig).push(dir);
  }

  const groups = [];
  let duplicateCount = 0;
  for (const [signature, dirs] of bySignature.entries()) {
    const stats = dirs.map((dir) => {
      let stat;
      try {
        stat = fs.lstatSync(dir);
      } catch {
        stat = null;
      }
      return {
        ...markerDetails(dir),
        active_path: activeTargets.has(dir),
        is_junction: stat ? stat.isSymbolicLink() || stat.isDirectory() && stat.isSymbolicLink?.() : false,
        safe_to_delete: false,
        reason: activeTargets.has(dir) ? "active_runtime_path" : "candidate_duplicate",
      };
    });
    if (dirs.length > 1) duplicateCount += dirs.length - 1;
    const active = stats.filter((item) => item.active_path);
    const safeDelete = stats.map((item) => ({
      ...item,
      safe_to_delete: !item.active_path && item.path.includes("/UserData/CacheData/model_downloads/"),
      reason: item.active_path ? "active_runtime_path" : item.path.includes("/UserData/CacheData/model_downloads/") ? "download_cache_candidate" : "legacy_model_source_keep_if_in_use",
    }));
    groups.push({
      signature,
      duplicate_count: Math.max(0, dirs.length - 1),
      items: safeDelete,
      active_count: active.length,
      status: dirs.length > 1 ? "DUPLICATE" : "SINGLE",
    });
  }

  const deletable = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (item.safe_to_delete) {
        deletable.push(item.path);
      }
    }
  }

  const report = {
    ok: true,
    status: duplicateCount > 0 ? "PARTIAL" : "PASS",
    created_at: new Date().toISOString(),
    roots: roots.map((dir) => sanitizePath(root, dir)),
    duplicate_count: duplicateCount,
    groups,
    deletable_candidates: deletable,
    note: duplicateCount > 0
      ? "Duplicate signatures were found. No files were deleted because apply mode is conservative."
      : "No duplicate model signatures were found in the scanned trees.",
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 0;
}

main();
