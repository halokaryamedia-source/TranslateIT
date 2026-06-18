import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const APP_PACKAGE = join(ROOT, "EngineData", "LauncherApp", "RustApp");
const TARGET_APP_PACKAGE = join(ROOT, "EngineData", "LauncherApp", "App");
const WORKER_ROOT = join(ROOT, "EngineData", "Backend", "LocalWorker", "WorkerRuntime");
const WORKER = join(WORKER_ROOT, "realtime_local_worker.py");
const RUNTIME_ASSETS = join(ROOT, "EngineData", "Backend", "RuntimeAssets");
const ASR_MODEL_ROOT = join(RUNTIME_ASSETS, "ASR", "ModelData");
const TRANSLATION_MODEL_ROOT = join(RUNTIME_ASSETS, "Translation", "ModelData");
const PIPER_ROOT = join(RUNTIME_ASSETS, "Voice", "Piper");
const MODEL_RUNTIME_MANIFEST = join(ROOT, "EngineData", "Backend", "RuntimeContracts", "MODEL_RUNTIME_MANIFEST.json");
const EVIDENCE_ROOT = join(ROOT, "UserData", "LogData", "RustAppValidation");

function rel(path) { return relative(ROOT, path).split(sep).join("/"); }
function exists(path) { return existsSync(path); }
function read(path) { return readFileSync(path, "utf8"); }
function readJson(path) {
  if (!exists(path)) return null;
  try { return JSON.parse(read(path)); } catch { return null; }
}
function walk(dir) {
  if (!exists(dir)) return [];
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === ".venv" || name === "node_modules" || name === "target" || name === "dist" || name === "__pycache__") {
      continue;
    }
    const path = join(dir, name);
    entries.push(path);
    if (statSync(path).isDirectory()) entries.push(...walk(path));
  }
  return entries;
}
function requireFiles(paths) { return paths.filter((path) => !exists(path)).map((path) => `missing: ${rel(path)}`); }
function requireText(path, terms) {
  if (!exists(path)) return [`missing: ${rel(path)}`];
  const text = read(path);
  return terms.filter((term) => !text.includes(term)).map((term) => `missing term in ${rel(path)}: ${term}`);
}
function finish(label, problems) {
  if (problems.length > 0) {
    console.log(label);
    for (const problem of problems) console.log(`- ${problem}`);
    process.exit(1);
  }
  console.log(`PASS: ${label.replace(/_INCOMPLETE$/, "").toLowerCase().replaceAll("_", " ")}`);
}

function validateRoot() {
  const allowedRootFiles = new Set([".gitattributes", ".gitignore", "README.md", "TranslateIT.lnk"]);
  const allowedRootDirs = new Set([".git", ".github", "DevelopingData", "docs", "EngineData", "UserData"]);
  const forbiddenRootSuffixes = new Set([".py", ".bat", ".cmd", ".ps1", ".vbs", ".log", ".tmp", ".bak", ".old"]);
  const problems = [];
  for (const name of readdirSync(ROOT)) {
    const path = join(ROOT, name);
    const isDir = statSync(path).isDirectory();
    const suffix = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
    if (isDir && !allowedRootDirs.has(name)) problems.push(`unexpected root directory: ${name}`);
    if (!isDir && forbiddenRootSuffixes.has(suffix)) problems.push(`forbidden root helper file: ${name}`);
    if (!isDir && !allowedRootFiles.has(name)) problems.push(`unexpected root file: ${name}`);
  }
  finish("ROOT_CLEANLINESS_INCOMPLETE", problems);
}

function validateStructure() {
  const required = [
    join(ROOT, "DevelopingData", "README.md"),
    join(ROOT, "DevelopingData", "Documentation", "README.md"),
    join(ROOT, "DevelopingData", "Documentation", "Source", "ProjectDocumentation.md"),
    join(ROOT, "DevelopingData", "Documentation", "Source", "SystemArchitecture.md"),
    join(ROOT, "DevelopingData", "Documentation", "Source", "ManualTestGuide.md"),
    join(ROOT, "DevelopingData", "Documentation", "Reports", "Engineering", "StructureCleanupReport.md"),
    join(ROOT, "DevelopingData", "Documentation", "Templates", "Repository", "gitignore_template.txt"),
    join(ROOT, "DevelopingData", "Quality", "Diagnostics", "README.md"),
    join(ROOT, "DevelopingData", "Quality", "Tests", "README.md"),
    join(ROOT, "DevelopingData", "Samples", "README.md"),
    join(ROOT, "EngineData", "README.md"),
    join(ROOT, "EngineData", "Frontend", "README.md"),
    join(ROOT, "EngineData", "Backend", "README.md"),
    join(APP_PACKAGE, "package.json"),
    join(APP_PACKAGE, "src-tauri", "tauri.conf.json"),
    WORKER,
    join(WORKER_ROOT, "requirements-realtime.txt"),
    join(WORKER_ROOT, "realtime_stack_manifest.json"),
    join(RUNTIME_ASSETS, "README.md"),
    join(RUNTIME_ASSETS, "ASR", "README.md"),
    join(RUNTIME_ASSETS, "Translation", "README.md"),
    join(RUNTIME_ASSETS, "Voice", "README.md"),
    MODEL_RUNTIME_MANIFEST,
  ];
  const retired = [
    "DeveloperData", "DevelopingData/DocumentationData", "DevelopingData/Reports",
    "DevelopingData/Diagnostics", "DevelopingData/Docs", "DevelopingData/LauncherHelpers", "DevelopingData/SampleData",
    "DevelopingData/Tests", "DevelopingData/ToolKitData",
    "TranslateIT.vbs", "TranslateIT.cmd", "Launcher", "EngineData/RuntimeAssets", "EngineData/LauncherApp/Workers",
    "EngineData/TranscriptEngine", "EngineData/TranslateEngine", "EngineData/VoiceEngine",
  ].map((path) => join(ROOT, ...path.split("/")));
  const problems = [...requireFiles(required)];
  const allowedEnginePython = new Set([
    "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
    "EngineData/LauncherApp/RustApp/scripts/prepare_local_models.py",
    "EngineData/LauncherApp/RustApp/scripts/validate_local_models.py",
  ]);
  for (const path of retired) if (exists(path)) problems.push(`retired path exists: ${rel(path)}`);
  for (const path of walk(join(ROOT, "DevelopingData"))) if (path.endsWith(".py")) problems.push(`unexpected DevelopingData Python file: ${rel(path)}`);
  for (const path of walk(join(ROOT, "EngineData"))) {
    if (path.endsWith(".py") && !allowedEnginePython.has(rel(path))) problems.push(`unexpected EngineData Python file: ${rel(path)}`);
  }
  finish("STRUCTURE_INCOMPLETE", problems);
}

function validateLauncher() {
  const tauriConf = join(APP_PACKAGE, "src-tauri", "tauri.conf.json");
  const problems = requireFiles([join(APP_PACKAGE, "package.json"), tauriConf, join(APP_PACKAGE, "src", "main.ts"), join(APP_PACKAGE, "src", "styles.css")]);
  if (exists(tauriConf)) {
    const text = read(tauriConf);
    for (const term of ["\"productName\": \"TranslateIT\"", "\"identifier\": \"com.halokaryamedia.translateit\"", "\"targets\": [\"nsis\"]"]) {
      if (!text.includes(term)) problems.push(`tauri bundle config missing term: ${term}`);
    }
  }
  finish("EXE_LAUNCHER_CONTRACT_INCOMPLETE", problems);
}

function validateWorker() {
  const problems = [
    ...requireFiles([WORKER, join(WORKER_ROOT, "requirements-realtime.txt"), join(WORKER_ROOT, "realtime_stack_manifest.json"), join(WORKER_ROOT, "setup_realtime_worker.ps1"), join(WORKER_ROOT, "run_realtime_worker_smoke.ps1"), MODEL_RUNTIME_MANIFEST]),
    ...requireText(WORKER, ["RUNTIME_ASSETS_ROOT", "ASR_MODEL_ROOT", "TRANSLATION_MODEL_ROOT", "PIPER_ROOT", "RUNTIME_MANIFEST", "ALLOWED_INPUT_ROOTS", "ALLOWED_OUTPUT_ROOTS"]),
    ...requireText(join(WORKER_ROOT, "realtime_stack_manifest.json"), ["EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo", "EngineData/Backend/RuntimeAssets/Translation/ModelData/marianmt-id-en", "EngineData/Backend/RuntimeAssets/Voice/Piper", "local_only"]),
  ];
  finish("LOCAL_WORKER_STACK_INCOMPLETE", problems);
}

function inspectModel(name, path, files = []) {
  const missing = [];
  for (const file of files) if (!exists(join(path, file))) missing.push(file);
  return { name, path: rel(path), exists: exists(path), ready: exists(path) && missing.length === 0, missing };
}
function validateModels() {
  const manifest = readJson(MODEL_RUNTIME_MANIFEST);
  const targets = [
    inspectModel("asr_faster_whisper_large_v3_turbo", join(ASR_MODEL_ROOT, "faster-whisper-large-v3-turbo"), ["model.bin", "config.json", "tokenizer.json"]),
    inspectModel("asr_faster_whisper_medium", join(ASR_MODEL_ROOT, "faster-whisper-medium"), ["model.bin", "config.json", "tokenizer.json"]),
    inspectModel("translation_marianmt_id_en", join(TRANSLATION_MODEL_ROOT, "marianmt-id-en"), ["config.json", "source.spm", "target.spm", "pytorch_model.bin"]),
    inspectModel("translation_nllb_200_distilled_600m", join(TRANSLATION_MODEL_ROOT, "nllb-200-distilled-600M"), ["config.json", "tokenizer_config.json", "sentencepiece.bpe.model", "pytorch_model.bin"]),
  ];
  const manifestModelReady = Boolean(manifest?.asr?.primary?.ready && manifest?.asr?.backup?.ready && manifest?.translation?.primary?.ready && manifest?.translation?.fallback?.ready && manifest?.tts?.default_sapi_ready);
  const ready = targets.every((target) => target.ready) && manifestModelReady;
  const blockers = targets.filter((target) => !target.ready).map((target) => `${target.name}:${target.missing.join(",")}`);
  if (!manifest) blockers.push("runtime_manifest:missing_or_invalid");
  else if (!manifestModelReady) blockers.push("runtime_manifest:validated_model_or_default_tts_not_ready");
  console.log(JSON.stringify({ schema: "translateit.local_runtime_model_readiness.v4", ok: ready, manifest_path: rel(MODEL_RUNTIME_MANIFEST), targets, blockers }, null, 2));
  process.exit(ready ? 0 : 1);
}
function validateEvidence() { finish("EVIDENCE_BOUNDARY_INCOMPLETE", requireFiles([join(ROOT, "UserData", "README.md"), join(ROOT, "UserData", "LogData", "README.md")])); }
function validateCi() { finish("CI_WORKFLOW_INCOMPLETE", []); }
function validateFrontend() { finish("FRONTEND_RUNTIME_CONTRACT_INCOMPLETE", requireFiles([join(APP_PACKAGE, "index.html"), join(APP_PACKAGE, "src", "main.ts"), join(APP_PACKAGE, "src", "styles.css"), join(APP_PACKAGE, "src-tauri", "src", "main.rs")])); }
function validateReleaseBundle() { finish("LOCAL_RELEASE_BUNDLE_INCOMPLETE", requireFiles([join(APP_PACKAGE, "package.json"), join(APP_PACKAGE, "src-tauri", "tauri.conf.json"), join(APP_PACKAGE, "src-tauri", "Cargo.toml")])); }
function writeValidationEvidence() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const [rustCheck, typecheck, frontendBuild, tauriBuild, packaging, workerStack] = process.argv.slice(3).map((value) => value === "True" || value === "true");
  const payload = { schema: "translateit.rustapp.validation_evidence.v2", created_at: new Date().toISOString(), rust_check_passed: rustCheck, typecheck_passed: typecheck, frontend_build_passed: frontendBuild, tauri_build_passed: tauriBuild, packaging_passed: packaging, local_worker_stack_passed: workerStack, note: "Generated by development-only tooling." };
  writeFileSync(join(EVIDENCE_ROOT, "latest_validation_evidence.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}
function recordManualEvidence() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const payload = { schema: "translateit.manual_runtime_evidence.v2", created_at: new Date().toISOString(), microphone_asr_passed: false, realtime_translation_passed: false, quality_translation_passed: false, piper_tts_passed: false, end_to_end_latency_measured: false, note: "Placeholder only. Replace after real target-PC runtime smoke testing." };
  writeFileSync(join(EVIDENCE_ROOT, "latest_manual_runtime_evidence.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}
function summarizeReadiness() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const validation = readJson(join(EVIDENCE_ROOT, "latest_validation_evidence.json"));
  const manual = readJson(join(EVIDENCE_ROOT, "latest_manual_runtime_evidence.json"));
  const workerSmoke = readJson(join(EVIDENCE_ROOT, "latest_local_worker_smoke_evidence.json")) || readJson(join(EVIDENCE_ROOT, "latest_worker_smoke_result.json"));
  const blockers = [];
  if (!validation) blockers.push("missing:latest_validation_evidence.json");
  if (!manual) blockers.push("missing:latest_manual_runtime_evidence.json");
  if (!workerSmoke) blockers.push("missing:worker_smoke_evidence");
  const payload = { schema: "translateit.readiness_summary.v4", created_at: new Date().toISOString(), client_ready: blockers.length === 0, blockers, note: "Client-ready requires real local validation evidence." };
  writeFileSync(join(EVIDENCE_ROOT, "latest_readiness_summary.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(blockers.length === 0 ? 0 : 1);
}
function smokeWorker() {
  console.log(JSON.stringify({ schema: "translateit.local_worker_smoke.v4", ok: false, blocker: "manual_smoke_required", worker_path: rel(WORKER), note: "Use Backend/LocalWorker/WorkerRuntime/run_realtime_worker_smoke.ps1 for the executable smoke path." }, null, 2));
  process.exit(1);
}
const command = process.argv[2] || "help";
const commands = { "validate-root": validateRoot, "validate-structure": validateStructure, "validate-launcher": validateLauncher, "validate-worker": validateWorker, "validate-models": validateModels, "validate-evidence": validateEvidence, "validate-ci": validateCi, "validate-frontend": validateFrontend, "validate-release": validateReleaseBundle, "write-validation-evidence": writeValidationEvidence, "record-manual-evidence": recordManualEvidence, "summarize-readiness": summarizeReadiness, "smoke-worker": smokeWorker };
if (!commands[command]) {
  console.log(`TranslateIT tooling commands: ${Object.keys(commands).join(", ")}`);
  process.exit(command === "help" ? 0 : 1);
}
commands[command]();
