import fs from "node:fs";
import path from "node:path";
import { ensureDir, exists, repoRootFromCwd, sanitizePath } from "./model_paths.mjs";

const root = repoRootFromCwd();
const outDir = path.join(root, "UserData", "CacheData", "validation");
const outPath = path.join(outDir, "latest_existing_model_scan.json");

const scanRoots = [
  path.join(root, "EngineData", "TranscriptEngine", "ModelData"),
  path.join(root, "EngineData", "TranslateEngine", "ModelData"),
  path.join(root, "EngineData", "Backend", "RuntimeAssets"),
];

function scoreCandidate(candidate) {
  const files = new Set();
  const walk = (current, depth = 0) => {
    if (depth > 2 || !exists(current) || !fs.statSync(current).isDirectory()) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile()) {
        files.add(entry.name);
      }
    }
  };
  walk(candidate);
  const names = [...files];
  const markerCount =
    names.filter((name) => ["model.bin", "config.json", "tokenizer.json", "tokenizer.model", "vocabulary.json", "source.spm", "target.spm", "spiece.model", "sentencepiece.bpe.model", "pytorch_model.bin", "piper.exe"].includes(name) || name.endsWith(".onnx") || name.endsWith(".onnx.json") || name.endsWith(".safetensors")).length;
  return { names, markerCount };
}

function classify(candidate) {
  const { names, markerCount } = scoreCandidate(candidate);
  const rel = sanitizePath(root, candidate);
  const hasCache = names.some((name) => name.includes(".metadata")) || names.includes(".gitignore");
  const hasMarkers = markerCount > 0;
  let type = "unknown";
  if (rel.includes("faster-whisper")) type = "asr";
  else if (rel.includes("marianmt") || rel.includes("nllb")) type = "translation";
  else if (rel.toLowerCase().includes("piper")) type = "tts";
  const confidence = hasMarkers ? "high" : hasCache ? "low" : "none";
  const suggestedModel =
    rel.includes("faster-whisper-large-v3-turbo")
      ? "faster-whisper-large-v3-turbo"
      : rel.includes("faster-whisper-medium")
        ? "faster-whisper-medium"
        : rel.includes("marianmt-id-en")
          ? "marianmt-id-en"
          : rel.includes("nllb-200-distilled-600M")
            ? "nllb-200-distilled-600M"
              : rel.toLowerCase().includes("piper")
                ? "piper"
                : null;
  return {
    candidate_path: rel,
    detected_type: type,
    model_like_files: names.slice(0, 20),
    marker_count: markerCount,
    confidence,
    suggested_model: suggestedModel,
    recommended_action: hasMarkers
      ? "Potential model candidate; reconcile with expected runtime path."
      : hasCache
        ? "Only cache metadata found; run models:setup or re-download the model."
        : "No recognizable model markers found.",
  };
}

function walk(rootDir, results) {
  if (!exists(rootDir) || !fs.statSync(rootDir).isDirectory()) return;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(rootDir, entry.name);
    results.push(classify(candidate));
    walk(candidate, results);
  }
}

const results = [];
for (const rootDir of scanRoots) {
  walk(rootDir, results);
}

const report = {
  schema: "translateit.existing_model_scan.v1",
  created_at: new Date().toISOString(),
  candidate_count: results.length,
  candidates: results,
};

ensureDir(outDir);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
