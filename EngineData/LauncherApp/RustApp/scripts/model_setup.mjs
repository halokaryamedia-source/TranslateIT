import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { ensureDir, exists, repoRootFromCwd, sanitizePath } from "./model_paths.mjs";

const root = repoRootFromCwd();
const workerRoot = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime");
const manifestPath = path.join(workerRoot, "model_manifest.json");
const reportPath = path.join(root, "UserData", "CacheData", "validation", "latest_model_setup.json");
const forbiddenRuntimePrefixes = [
  "EngineData/TranscriptEngine",
  "EngineData/TranslateEngine",
  "EngineData/VoiceEngine",
  "EngineData/RuntimeAssets",
  "DevelopingData/ToolKitData",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeReport(report) {
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

function runtimeTarget(entry) {
  return path.join(root, entry.expected_path);
}

function hasForbiddenExpectedPath(entry) {
  return forbiddenRuntimePrefixes.some((prefix) => String(entry.expected_path ?? "").startsWith(prefix));
}

function markerSummary(target) {
  if (!exists(target) || !fs.statSync(target).isDirectory()) return { exists: false, file_count: 0 };
  let fileCount = 0;
  for (const item of fs.readdirSync(target, { withFileTypes: true })) if (item.isFile()) fileCount += 1;
  return { exists: true, file_count: fileCount };
}

function main() {
  const createdAt = new Date().toISOString();
  if (!exists(manifestPath)) {
    writeReport({
      ok: false,
      status: "BLOCKED",
      created_at: createdAt,
      note: "Worker model manifest is missing.",
      blockers: ["manifest_missing"],
      runtime_checks: [],
    });
    process.exit(2);
    return;
  }

  const manifest = readJson(manifestPath);
  const args = process.argv.slice(2);
  const modelIndex = args.indexOf("--model");
  const requestedModelId = modelIndex >= 0 ? args[modelIndex + 1] : null;
  const selectedModels = (manifest.models ?? []).filter((entry) => {
    if (requestedModelId) return entry.model_id === requestedModelId || entry.stage === requestedModelId;
    return Boolean(entry.expected_path);
  });

  const blockers = [];
  const runtimeChecks = [];
  for (const entry of selectedModels) {
    if (hasForbiddenExpectedPath(entry)) blockers.push(`forbidden_expected_path:${entry.model_id}`);
    const runtime = runtimeTarget(entry);
    const summary = markerSummary(runtime);
    runtimeChecks.push({
      model_id: entry.model_id,
      expected_path: sanitizePath(root, runtime),
      required: Boolean(entry.required),
      exists: summary.exists,
      file_count: summary.file_count,
      source_type: entry.source_type ?? null,
      repo_id: entry.repo_id ?? null,
    });
    if (entry.required && !summary.exists) blockers.push(`missing_required_runtime_model:${entry.model_id}`);
  }

  if (selectedModels.length === 0) blockers.push("no_models_selected");
  const uniqueBlockers = [...new Set(blockers)];
  const ok = uniqueBlockers.length === 0;
  const report = {
    ok,
    status: ok ? "PASS" : "BLOCKED",
    created_at: createdAt,
    model_manifest: sanitizePath(root, manifestPath),
    model_root_strategy: "EngineData/Backend/RuntimeAssets only",
    runtime_checks: runtimeChecks,
    blockers: uniqueBlockers,
    note: ok
      ? "Required model folders exist under approved RuntimeAssets. Run worker smoke before claiming runtime readiness."
      : "Model setup is intentionally conservative: this command does not use retired paths and does not claim readiness until RuntimeAssets exist locally.",
  };
  writeReport(report);
  process.exit(ok ? 0 : 2);
}

main();
