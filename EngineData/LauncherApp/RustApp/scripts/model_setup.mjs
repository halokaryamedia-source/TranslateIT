import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { ensureDir, exists, repoRootFromCwd, sanitizePath } from "./model_paths.mjs";

const root = repoRootFromCwd();
const workerRoot = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime");
const prepScript = path.join(root, "EngineData", "LauncherApp", "RustApp", "scripts", "prepare_local_models.py");
const manifestPath = path.join(workerRoot, "model_manifest.json");
const reportPath = path.join(root, "UserData", "CacheData", "validation", "latest_model_setup.json");
const workerPython = path.join(workerRoot, ".venv", "Scripts", "python.exe");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeReport(report) {
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

function legacyTarget(entry) {
  const legacy = entry.legacy_paths?.[0];
  if (legacy) return path.join(root, legacy);
  if (entry.model_id === "piper") return path.join(root, "EngineData", "TranslateEngine", "ModelData", "piper");
  return null;
}

function runtimeTarget(entry) {
  return path.join(root, entry.expected_path);
}

function mklinkJunction(target, source) {
  if (exists(target)) {
    const stat = fs.lstatSync(target);
    if (stat.isSymbolicLink() || stat.isDirectory()) return { ok: true, skipped: true, note: "target_exists" };
    return { ok: false, skipped: false, note: "target_is_file" };
  }
  ensureDir(path.dirname(target));
  const psCommand = `New-Item -ItemType Junction -Path '${target.replace(/'/g, "''")}' -Value '${source.replace(/'/g, "''")}' -Force | Out-Null`;
  const completed = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psCommand], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  const success = completed.status === 0;
  return {
    ok: success,
    skipped: false,
    note: success ? "junction_created" : completed.stderr.trim() || completed.stdout.trim() || "junction_failed",
  };
}

function main() {
  if (!exists(manifestPath)) {
    writeReport({
      ok: false,
      status: "BLOCKED",
      created_at: new Date().toISOString(),
      note: "Manifest missing.",
      blockers: ["manifest_missing"],
      steps: [],
    });
    process.exit(2);
    return;
  }

  const manifest = readJson(manifestPath);
  const args = process.argv.slice(2);
  const modelIndex = args.indexOf("--model");
  const requestedModelId = modelIndex >= 0 ? args[modelIndex + 1] : null;
  const setupModels = (manifest.models ?? []).filter((entry) => {
    if (entry.source_type !== "huggingface" || !entry.repo_id) return false;
    if (!requestedModelId) return true;
    return entry.model_id === requestedModelId || (requestedModelId === "faster-whisper-large-v3-turbo" && entry.model_id === "asr_primary");
  });
  const piperOptional = (manifest.models ?? []).find((entry) => entry.model_id === "piper");
  const steps = [];
  let downloadExit = 0;

  if (setupModels.length > 0 && exists(prepScript)) {
    const onlyArgs = setupModels.flatMap((entry) => ["--only", entry.model_id === "faster-whisper-large-v3-turbo" ? "asr_primary" : entry.model_id === "faster-whisper-medium" ? "asr_backup" : entry.model_id === "marianmt-id-en" ? "translation_fallback" : entry.model_id === "nllb-200-distilled-600M" ? "translation_primary" : ""]);
    const filteredOnly = onlyArgs.filter(Boolean);
    const args = ["-u", prepScript, ...filteredOnly];
    const pythonExe = exists(workerPython) ? workerPython : "python";
    const py = spawnSync(pythonExe, args, { cwd: root, encoding: "utf8" });
    downloadExit = py.status ?? 1;
    steps.push({
      step: "prepare_local_models.py",
      exit_code: downloadExit,
      stdout: py.stdout.slice(-2000),
      stderr: py.stderr.slice(-2000),
    });
  } else {
    steps.push({ step: "prepare_local_models.py", exit_code: 2, note: "prep_script_missing_or_no_models" });
    downloadExit = 2;
  }

  const mappings = [];
  for (const entry of manifest.models ?? []) {
    const legacy = legacyTarget(entry);
    const runtime = runtimeTarget(entry);
    if (legacy && exists(legacy) && !exists(runtime)) {
      mappings.push({ model_id: entry.model_id, source: sanitizePath(root, legacy), target: sanitizePath(root, runtime), ...mklinkJunction(runtime, legacy) });
    } else if (legacy && exists(legacy) && exists(runtime)) {
      mappings.push({ model_id: entry.model_id, source: sanitizePath(root, legacy), target: sanitizePath(root, runtime), ok: true, skipped: true, note: "runtime_mapping_exists" });
    } else if (entry.model_id === "piper") {
      mappings.push({
        model_id: entry.model_id,
        source: null,
        target: sanitizePath(root, runtime),
        ok: exists(runtime),
        skipped: true,
        note: exists(runtime) ? "piper_present" : "piper_manual_install_or_sapi_fallback",
      });
    }
  }

  const blockers = [];
  for (const entry of manifest.models ?? []) {
    const runtime = runtimeTarget(entry);
    if (entry.required && !exists(runtime)) blockers.push(`missing_required_runtime_model:${entry.model_id}`);
  }
  if (downloadExit !== 0 && blockers.length > 0) blockers.push("download_or_mapping_failed");
  if (!piperOptional?.required && !exists(runtimeTarget(piperOptional ?? { expected_path: "" }))) {
    steps.push({ step: "piper", ok: false, note: "optional_tts_provider_not_installed_use_sapi_fallback" });
  }

  const ok = blockers.length === 0;
  const report = {
    ok,
    status: ok ? "PASS" : "BLOCKED",
    created_at: new Date().toISOString(),
    model_manifest: sanitizePath(root, manifestPath),
    download_exit_code: downloadExit,
    steps,
    mappings,
    blockers,
    note: ok
      ? "Models are available and runtime mappings were prepared."
      : "One or more required models remain missing or unmapped.",
  };
  writeReport(report);
  process.exit(ok ? 0 : 2);
}

main();
