import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const RUST_APP = join(ROOT, "EngineData", "LauncherApp", "RustApp");
const WORKER_ROOT = join(ROOT, "EngineData", "LauncherApp", "Workers");
const WORKER = join(WORKER_ROOT, "realtime_local_worker.py");
const RUNTIME_ASSETS = join(ROOT, "EngineData", "RuntimeAssets");
const ASR_MODEL_ROOT = join(ROOT, "EngineData", "TranscriptEngine", "ModelData");
const TRANSLATION_MODEL_ROOT = join(ROOT, "EngineData", "TranslateEngine", "ModelData");
const PIPER_ROOT = join(ROOT, "EngineData", "VoiceEngine", "Piper");
const MODEL_RUNTIME_MANIFEST = join(RUST_APP, "MODEL_RUNTIME_MANIFEST.json");
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
  const allowedRootFiles = new Set([".gitattributes", ".gitignore", "README.md"]);
  const allowedRootDirs = new Set([".git", ".github", "DevelopingData", "EngineData", "Launcher", "UserData"]);
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
    join(ROOT, "EngineData", "LauncherApp", "RustApp", "package.json"),
    join(ROOT, "EngineData", "LauncherApp", "RustApp", "src-tauri", "tauri.conf.json"),
    WORKER,
    join(RUNTIME_ASSETS, "README.md"),
    join(RUNTIME_ASSETS, "ASR", "README.md"),
    join(RUNTIME_ASSETS, "Translation", "README.md"),
    join(RUNTIME_ASSETS, "Voice", "README.md"),
    join(ROOT, "Launcher", "README.md"),
  ];
  const retired = [
    "DeveloperData", "DevelopingData/DocumentationData", "DevelopingData/Reports",
    "DevelopingData/Diagnostics", "DevelopingData/Docs", "DevelopingData/LauncherHelpers", "DevelopingData/SampleData",
    "DevelopingData/Tests",
    "TranslateIT.vbs", "TranslateIT.cmd", "Launcher/Preview",
  ].map((path) => join(ROOT, ...path.split("/")));
  const problems = [...requireFiles(required)];
  const allowedEnginePython = new Set([
    "EngineData/LauncherApp/Workers/realtime_local_worker.py",
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
  const tauriConf = join(RUST_APP, "src-tauri", "tauri.conf.json");
  const problems = requireFiles([join(RUST_APP, "package.json"), tauriConf, join(RUST_APP, "src", "main.ts"), join(RUST_APP, "src", "styles.css")]);
  if (exists(tauriConf)) {
    const text = read(tauriConf);
    for (const term of ["\"productName\": \"TranslateIT\"", "\"identifier\": \"com.halokaryamedia.translateit\"", "\"targets\": [\"nsis\"]"]) {
      if (!text.includes(term)) problems.push(`tauri bundle config missing term: ${term}`);
    }
  }
  for (const retired of ["TranslateIT.vbs", "TranslateIT.cmd"]) if (exists(join(ROOT, retired))) problems.push(`retired root launcher still exists: ${retired}`);
  finish("EXE_LAUNCHER_CONTRACT_INCOMPLETE", problems);
}

function validateWorker() {
  const required = [WORKER, join(WORKER_ROOT, "requirements-realtime.txt"), join(WORKER_ROOT, "realtime_stack_manifest.json"), join(WORKER_ROOT, "setup_realtime_worker.ps1"), join(WORKER_ROOT, "run_realtime_worker_smoke.ps1"), MODEL_RUNTIME_MANIFEST];
  const problems = [...requireFiles(required)];
  problems.push(...requireText(WORKER, ["ASR_MODEL_ROOT", "TRANSLATION_MODEL_ROOT", "faster-whisper-large-v3-turbo", "faster-whisper-medium", "marianmt-id-en", "nllb-200-distilled-600M", "PIPER_ROOT", "sapi_status", "ALLOWED_INPUT_ROOTS", "ALLOWED_OUTPUT_ROOTS", "transcribe", "translate", "synthesize"]));
  problems.push(...requireText(join(WORKER_ROOT, "realtime_stack_manifest.json"), ["EngineData/TranscriptEngine/ModelData/faster-whisper-large-v3-turbo", "EngineData/TranslateEngine/ModelData/marianmt-id-en", "EngineData/TranslateEngine/ModelData/nllb-200-distilled-600M", "EngineData/VoiceEngine/Piper", "windows-sapi", "local_only"]));
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
  const manifestModelReady = Boolean(
    manifest?.asr?.primary?.ready
    && manifest?.asr?.backup?.ready
    && manifest?.translation?.primary?.ready
    && manifest?.translation?.fallback?.ready
    && manifest?.tts?.default_sapi_ready
  );
  const ready = targets.every((target) => target.ready) && manifestModelReady;
  const blockers = targets.filter((target) => !target.ready).map((target) => `${target.name}:${target.missing.join(",")}`);
  if (!manifest) blockers.push("runtime_manifest:missing_or_invalid");
  else if (!manifestModelReady) blockers.push("runtime_manifest:validated_model_or_default_tts_not_ready");
  const warnings = [];
  if (!manifest?.tts?.voice_actor_ready) warnings.push("voice_actor_marcel_missing");
  if (!manifest?.cuda?.torch_cuda_available) warnings.push("torch_cuda_unavailable_for_translation");
  if (!manifest?.cuda?.ctranslate2_cuda_available) warnings.push("ctranslate2_cuda_unavailable_for_asr");
  console.log(JSON.stringify({ schema: "translateit.local_runtime_model_readiness.v3", ok: ready, manifest_path: rel(MODEL_RUNTIME_MANIFEST), targets, default_tts: manifest?.tts ?? null, cuda: manifest?.cuda ?? null, blockers, warnings }, null, 2));
  process.exit(ready ? 0 : 1);
}
function validateEvidence() { finish("EVIDENCE_BOUNDARY_INCOMPLETE", requireFiles([join(ROOT, "UserData", "README.md"), join(ROOT, "UserData", "LogData", "README.md")])); }
function validateCi() {
  const workflows = [join(ROOT, ".github", "workflows", "rustapp-validation.yml"), join(ROOT, ".github", "workflows", "translateit-rustapp-internal-validation.yml")];
  const problems = requireFiles(workflows);
  for (const workflow of workflows) if (exists(workflow)) {
    const text = read(workflow);
    if (text.includes("ToolKitData")) problems.push(`workflow uses retired ToolKitData: ${rel(workflow)}`);
    if (!text.includes("DevelopingData\\Tooling\\Scripts\\Execution\\run_rustapp_final_validation.ps1")) problems.push(`workflow missing active runner: ${rel(workflow)}`);
  }
  finish("CI_WORKFLOW_INCOMPLETE", problems);
}
function validateFrontend() { finish("FRONTEND_RUNTIME_CONTRACT_INCOMPLETE", requireFiles([join(RUST_APP, "index.html"), join(RUST_APP, "src", "main.ts"), join(RUST_APP, "src", "styles.css"), join(RUST_APP, "src-tauri", "src", "main.rs")])); }
function validateReleaseBundle() {
  const tauriConf = join(RUST_APP, "src-tauri", "tauri.conf.json");
  const problems = requireFiles([join(RUST_APP, "package.json"), tauriConf, join(RUST_APP, "src-tauri", "Cargo.toml")]);
  if (exists(tauriConf)) {
    const text = read(tauriConf);
    if (!text.includes("\"bundle\"")) problems.push("tauri bundle section is missing");
    if (!text.includes("\"active\": true")) problems.push("tauri bundle is not active");
    if (!text.includes("\"nsis\"")) problems.push("Windows NSIS package target is missing");
  }
  finish("LOCAL_RELEASE_BUNDLE_INCOMPLETE", problems);
}
function writeValidationEvidence() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const [rustCheck, typecheck, frontendBuild, tauriBuild, packaging, workerStack] = process.argv.slice(3).map((value) => value === "True" || value === "true");
  const payload = { schema: "translateit.rustapp.validation_evidence.v2", created_at: new Date().toISOString(), rust_check_passed: rustCheck, typecheck_passed: typecheck, frontend_build_passed: frontendBuild, tauri_build_passed: tauriBuild, packaging_passed: packaging, local_worker_stack_passed: workerStack, note: "Generated by Node tooling. This is not proof of runtime/client readiness without manual local smoke evidence." };
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
  const validationPath = join(EVIDENCE_ROOT, "latest_validation_evidence.json");
  const manualPath = join(EVIDENCE_ROOT, "latest_manual_runtime_evidence.json");
  const workerSmokePath = join(EVIDENCE_ROOT, "latest_local_worker_smoke_evidence.json");
  const powershellSmokePath = join(EVIDENCE_ROOT, "latest_worker_smoke_result.json");
  const validation = readJson(validationPath);
  const manual = readJson(manualPath);
  const workerSmoke = readJson(workerSmokePath);
  const powershellSmoke = readJson(powershellSmokePath);
  const blockers = [];
  if (!validation) blockers.push("missing:latest_validation_evidence.json");
  if (!manual) blockers.push("missing:latest_manual_runtime_evidence.json");
  if (!workerSmoke && !powershellSmoke) blockers.push("missing:worker_smoke_evidence");
  if (validation) for (const key of ["rust_check_passed", "typecheck_passed", "frontend_build_passed", "tauri_build_passed", "packaging_passed", "local_worker_stack_passed"]) if (!validation[key]) blockers.push(`validation:${key}`);
  if (manual) for (const key of ["microphone_asr_passed", "realtime_translation_passed", "quality_translation_passed", "piper_tts_passed", "end_to_end_latency_measured"]) if (!manual[key]) blockers.push(`manual:${key}`);
  if (workerSmoke && !workerSmoke.ok) blockers.push("worker_smoke:node_tooling_failed");
  if (powershellSmoke && !powershellSmoke.ok) blockers.push("worker_smoke:powershell_failed");
  const payload = { schema: "translateit.readiness_summary.v3", created_at: new Date().toISOString(), client_ready: blockers.length === 0, blockers, evidence: { validation: Boolean(validation), manual: Boolean(manual), worker_smoke: Boolean(workerSmoke || powershellSmoke) }, note: "Client-ready remains false until local build evidence, worker smoke evidence, and manual runtime evidence all pass." };
  writeFileSync(join(EVIDENCE_ROOT, "latest_readiness_summary.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(blockers.length === 0 ? 0 : 1);
}
function runWorkerCommand(python, payload) {
  const result = spawnSync(python, [WORKER], { input: JSON.stringify(payload) + "\n", encoding: "utf8", timeout: 180000 });
  const firstLine = (result.stdout || "").trim().split(/\r?\n/)[0] || "{}";
  let parsed = null;
  try { parsed = JSON.parse(firstLine); } catch { parsed = null; }
  return { exit_code: result.status, stdout: result.stdout, stderr: result.stderr, parsed, ok: result.status === 0 && Boolean(parsed?.ok) };
}
function smokeWorker() {
  const python = exists(join(WORKER_ROOT, ".venv", "Scripts", "python.exe")) ? join(WORKER_ROOT, ".venv", "Scripts", "python.exe") : "python";
  const audioPath = process.argv[3] || "";
  const status = runWorkerCommand(python, { command: "status" });
  const translation = runWorkerCommand(python, { command: "translate", text: "halo", source_language: "id", target_language: "en", mode: "Realtime", max_new_tokens: 48 });
  const ttsPreflight = runWorkerCommand(python, { command: "tts_preflight" });
  const synthesize = runWorkerCommand(python, { command: "synthesize", text: "Hello." });
  const asr = audioPath ? runWorkerCommand(python, { command: "transcribe", audio_path: audioPath, language: "id", beam_size: 1, vad_filter: true }) : null;
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const ok = status.ok && translation.ok && ttsPreflight.ok && synthesize.ok && (!asr || asr.ok);
  const payload = { schema: "translateit.local_worker_smoke.v3", created_at: new Date().toISOString(), python, audio_path: audioPath, ok, status, translation, tts_preflight: ttsPreflight, synthesize, asr, note: "This checks local worker command execution. ASR is checked only when an audio path argument is provided." };
  writeFileSync(join(EVIDENCE_ROOT, "latest_local_worker_smoke_evidence.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(ok ? 0 : 1);
}
const command = process.argv[2] || "help";
const commands = { "validate-root": validateRoot, "validate-structure": validateStructure, "validate-launcher": validateLauncher, "validate-worker": validateWorker, "validate-models": validateModels, "validate-evidence": validateEvidence, "validate-ci": validateCi, "validate-frontend": validateFrontend, "validate-release": validateReleaseBundle, "write-validation-evidence": writeValidationEvidence, "record-manual-evidence": recordManualEvidence, "summarize-readiness": summarizeReadiness, "smoke-worker": smokeWorker };
if (!commands[command]) {
  console.log(`TranslateIT tooling commands: ${Object.keys(commands).join(", ")}`);
  process.exit(command === "help" ? 0 : 1);
}
commands[command]();
