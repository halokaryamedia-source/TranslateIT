import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { directoryStats, exists, readJson, repoRootFromCwd, sanitizePath } from "./model_paths.mjs";

const root = repoRootFromCwd();
const manifestPath = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "model_manifest.json");
  const previousModelRoots = [
  path.join(root, "EngineData", "Backend", "RuntimeAssets", "ASR", "ModelData"),
  path.join(root, "EngineData", "Backend", "RuntimeAssets", "Translation", "ModelData"),
  path.join(root, "EngineData", "Backend", "RuntimeAssets", "Voice", "Piper"),
];

function writeReport(report, fileName) {
  const outDir = path.join(root, "UserData", "CacheData", "validation");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(report, null, 2));
}

function candidatePaths(entry) {
  const candidates = [entry.expected_path, ...(entry.previous_paths ?? [])]
    .filter(Boolean)
    .map((value) => path.join(root, value));
  return [...new Set(candidates)];
}

function hasModelMarkers(modelId, targetPath) {
  if (!exists(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    return { found: false, marker_count: 0, marker_names: [] };
  }
  const markers = [];
  if (modelId.startsWith("faster-whisper")) {
    if (exists(path.join(targetPath, "model.bin"))) markers.push("model.bin");
    if (exists(path.join(targetPath, "config.json"))) markers.push("config.json");
    for (const name of ["tokenizer.json", "tokenizer.model", "vocabulary.json"]) {
      if (exists(path.join(targetPath, name))) markers.push(name);
    }
  } else if (modelId.startsWith("marianmt")) {
    if (exists(path.join(targetPath, "config.json"))) markers.push("config.json");
    for (const name of ["source.spm", "tokenizer.json", "spiece.model"]) {
      if (exists(path.join(targetPath, name))) markers.push(name);
    }
    for (const name of ["target.spm", "tokenizer.json", "spiece.model"]) {
      if (exists(path.join(targetPath, name))) markers.push(name);
    }
    for (const name of ["pytorch_model.bin", "model.safetensors"]) {
      if (exists(path.join(targetPath, name))) markers.push(name);
    }
  } else if (modelId.startsWith("nllb")) {
    if (exists(path.join(targetPath, "config.json"))) markers.push("config.json");
    if (exists(path.join(targetPath, "tokenizer_config.json"))) markers.push("tokenizer_config.json");
    for (const name of ["sentencepiece.bpe.model", "tokenizer.json", "spiece.model"]) {
      if (exists(path.join(targetPath, name))) markers.push(name);
    }
    for (const name of ["pytorch_model.bin", "model.safetensors"]) {
      if (exists(path.join(targetPath, name))) markers.push(name);
    }
  } else if (modelId === "piper") {
    if (exists(path.join(targetPath, "piper.exe"))) markers.push("piper.exe");
    for (const name of fs.readdirSync(targetPath, { withFileTypes: true }).filter((item) => item.isFile()).map((item) => item.name)) {
      if (name.endsWith(".onnx") || name.endsWith(".onnx.json")) markers.push(name);
    }
  }
  return { found: markers.length > 0, marker_count: markers.length, marker_names: [...new Set(markers)].sort() };
}

function classify(entry) {
  const candidates = candidatePaths(entry);
  const results = candidates.map((candidate) => {
    const stats = directoryStats(candidate);
    const marker = hasModelMarkers(entry.model_id, candidate);
    const previousPath = candidate !== path.join(root, entry.expected_path);
    const pathLabel = sanitizePath(root, candidate);
    return {
      candidate_path: pathLabel,
      previousPath,
      found: marker.found,
      marker_count: marker.marker_count,
      marker_names: marker.marker_names,
      size_bytes: stats.bytes,
      file_count: stats.files,
    };
  });
  const present = results.find((item) => item.found);
  const sourceDefined = Boolean(entry.repo_id || entry.download_url);
  let status = "BLOCKED";
  let blocker = `download_source_missing:${entry.model_id}`;
  let nextAction = `Define download URL or place ${entry.model_id} in ${entry.expected_path}`;
  if (present) {
    status = present.previousPath ? "PARTIAL" : "PASS";
    blocker = null;
    nextAction = present.previousPath
      ? `Create runtime mapping from ${present.candidate_path} to ${entry.expected_path}`
      : "Model present";
  } else if (sourceDefined) {
    status = entry.required ? "BLOCKED" : "PARTIAL";
    blocker = `missing_model:${entry.model_id}`;
    nextAction = `Download ${entry.model_id} using ${entry.repo_id ?? entry.download_url} and place it at ${entry.expected_path}`;
  }
  return {
    model_id: entry.model_id,
    required: Boolean(entry.required),
    stage: entry.stage ?? "",
    backend: entry.backend ?? "",
    expected_path: entry.expected_path,
    previous_paths: entry.previous_paths ?? [],
    source_type: entry.source_type ?? null,
    repo_id: entry.repo_id ?? null,
    download_url: entry.download_url ?? null,
    found: Boolean(present),
    file_count: present?.file_count ?? 0,
    size_bytes: present?.size_bytes ?? 0,
    gpu_capable: typeof entry.gpu_capable === "boolean" ? entry.gpu_capable : "unknown",
    cpu_fallback: Boolean(entry.cpu_fallback),
    status,
    blocker,
    next_action: nextAction,
    candidates: results,
  };
}

export function run() {
  if (!fs.existsSync(manifestPath)) {
    const report = {
      ok: false,
      status: "BLOCKED",
      created_at: new Date().toISOString(),
      items: [],
      blockers: ["model_manifest_missing"],
      note: "Model manifest is missing. Add WorkerRuntime/model_manifest.json first.",
    };
    writeReport(report, "latest_model_inventory.json");
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 2;
    return report;
  }

  const manifest = readJson(manifestPath);
  const args = process.argv.slice(2);
  const modelIndex = args.indexOf("--model");
  const requestedModelId = modelIndex >= 0 ? args[modelIndex + 1] : null;
  const models = requestedModelId ? (manifest.models ?? []).filter((entry) => entry.model_id === requestedModelId) : (manifest.models ?? []);
  const items = models.map(classify);
  const blockers = items.filter((item) => item.status === "BLOCKED" && item.required).map((item) => `missing_required_model:${item.model_id}`);
  const status = blockers.length ? "BLOCKED" : items.some((item) => item.status === "PARTIAL") ? "PARTIAL" : "PASS";
  const report = {
    ok: blockers.length === 0,
    status,
    created_at: new Date().toISOString(),
    items,
    blockers,
    previous_model_roots: previousModelRoots.map((value) => sanitizePath(root, value)),
    note: blockers.length
      ? "One or more required models are missing or have no verified source."
      : "Required model inventory is complete.",
  };
  writeReport(report, "latest_model_inventory.json");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = status === "PASS" ? 0 : status === "PARTIAL" ? 2 : 1;
  return report;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  run();
}
