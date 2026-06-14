import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = resolve(new URL("../../../../", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1"));
const TOOLING = join(ROOT, "DevelopingData", "Tooling", "Scripts", "Execution");
const RUST_APP = join(ROOT, "EngineData", "LauncherApp", "RustApp");
const WORKER_ROOT = join(ROOT, "EngineData", "LauncherApp", "Workers");
const WORKER = join(WORKER_ROOT, "realtime_local_worker.py");
const RUNTIME_ASSETS = join(ROOT, "EngineData", "RuntimeAssets");
const EVIDENCE_ROOT = join(ROOT, "UserData", "LogData", "RustAppValidation");

function rel(path) {
  return relative(ROOT, path).split(sep).join("/");
}

function exists(path) {
  return existsSync(path);
}

function read(path) {
  return readFileSync(path, "utf8");
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

function requireFiles(paths) {
  return paths.filter((path) => !exists(path)).map((path) => `missing: ${rel(path)}`);
}

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
  const allowedRootFiles = new Set([".gitattributes", ".gitignore", "README.md", "TranslateIT.vbs"]);
  const allowedRootDirs = new Set([".git", ".github", "DevelopingData", "EngineData", "Launcher", "UserData"]);
  const forbiddenRootSuffixes = new Set([".py", ".bat", ".ps1", ".cmd", ".log", ".tmp", ".bak", ".old"]);
  const problems = [];
  for (const name of readdirSync(ROOT)) {
    const path = join(ROOT, name);
    const isDir = statSync(path).isDirectory();
    const suffix = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
    if (isDir && !allowedRootDirs.has(name)) problems.push(`unexpected root directory: ${name}`);
    if (!isDir && forbiddenRootSuffixes.has(suffix)) problems.push(`forbidden root file type: ${name}`);
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
    WORKER,
    join(RUNTIME_ASSETS, "README.md"),
    join(RUNTIME_ASSETS, "ASR", "README.md"),
    join(RUNTIME_ASSETS, "Translation", "README.md"),
    join(RUNTIME_ASSETS, "Voice", "README.md"),
  ];
  const retired = [
    "DeveloperData",
    "DevelopingData/DocumentationData",
    "DevelopingData/Reports",
    "DevelopingData/ToolKitData",
    "DevelopingData/Diagnostics",
    "DevelopingData/Docs",
    "DevelopingData/LauncherHelpers",
    "DevelopingData/SampleData",
    "DevelopingData/Tests",
    "EngineData/TranscriptEngine",
    "EngineData/TranslateEngine",
    "EngineData/VoiceEngine",
  ].map((path) => join(ROOT, ...path.split("/")));
  const problems = [...requireFiles(required)];
  for (const path of retired) if (exists(path)) problems.push(`retired path exists: ${rel(path)}`);
  for (const path of walk(join(ROOT, "DevelopingData"))) if (path.endsWith(".py")) problems.push(`unexpected DevelopingData Python file: ${rel(path)}`);
  for (const path of walk(join(ROOT, "EngineData"))) {
    if (path.endsWith(".py") && rel(path) !== "EngineData/LauncherApp/Workers/realtime_local_worker.py") {
      problems.push(`unexpected EngineData Python file: ${rel(path)}`);
    }
  }
  finish("STRUCTURE_INCOMPLETE", problems);
}

function validateLauncher() {
  const launcher = join(ROOT, "TranslateIT.vbs");
  const problems = requireFiles([launcher, join(RUST_APP, "package.json")]);
  if (exists(launcher)) {
    const text = read(launcher);
    for (const term of ["EngineData\\LauncherApp\\RustApp", "npm.cmd run dev", "translateit_rustapp.exe"]) {
      if (!text.includes(term)) problems.push(`launcher missing term: ${term}`);
    }
    for (const forbidden of ["ToolKitData", "LauncherHelpers", "app_main.py", "TranslateIt.bat"]) {
      if (text.includes(forbidden)) problems.push(`launcher contains retired route: ${forbidden}`);
    }
  }
  finish("LAUNCHER_CONTRACT_INCOMPLETE", problems);
}

function validateWorker() {
  const required = [
    WORKER,
    join(WORKER_ROOT, "requirements-realtime.txt"),
    join(WORKER_ROOT, "realtime_stack_manifest.json"),
    join(WORKER_ROOT, "setup_realtime_worker.ps1"),
    join(WORKER_ROOT, "run_realtime_worker_smoke.ps1"),
  ];
  const problems = [...requireFiles(required)];
  problems.push(...requireText(WORKER, [
    "RUNTIME_ASSETS",
    "faster-whisper-large-v3-turbo",
    "marianmt-id-en",
    "nllb-200-distilled-600M",
    "PIPER_ROOT",
    "ALLOWED_INPUT_ROOTS",
    "ALLOWED_OUTPUT_ROOTS",
    "transcribe",
    "translate",
    "synthesize",
  ]));
  problems.push(...requireText(join(WORKER_ROOT, "realtime_stack_manifest.json"), [
    "EngineData/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo",
    "EngineData/RuntimeAssets/Translation/ModelData/marianmt-id-en",
    "EngineData/RuntimeAssets/Voice/Piper",
    "local_only",
  ]));
  finish("LOCAL_WORKER_STACK_INCOMPLETE", problems);
}

function inspectModel(name, path, files = [], globSuffix = "") {
  const missing = [];
  for (const file of files) if (!exists(join(path, file))) missing.push(file);
  if (globSuffix) {
    const found = walk(path).some((item) => item.endsWith(globSuffix));
    if (!found) missing.push(`**/*${globSuffix}`);
  }
  return { name, path: rel(path), exists: exists(path), ready: exists(path) && missing.length === 0, missing };
}

function validateModels() {
  const targets = [
    inspectModel("asr_faster_whisper_large_v3_turbo", join(RUNTIME_ASSETS, "ASR", "ModelData", "faster-whisper-large-v3-turbo"), ["model.bin"]),
    inspectModel("translation_marianmt_id_en", join(RUNTIME_ASSETS, "Translation", "ModelData", "marianmt-id-en"), ["config.json"]),
    inspectModel("translation_nllb_200_distilled_600m", join(RUNTIME_ASSETS, "Translation", "ModelData", "nllb-200-distilled-600M"), ["config.json"]),
    inspectModel("voice_piper", join(RUNTIME_ASSETS, "Voice", "Piper"), ["piper.exe"], ".onnx"),
  ];
  const ready = targets.every((target) => target.ready);
  const payload = {
    schema: "translateit.local_runtime_model_readiness.v2",
    ok: ready,
    targets,
    blockers: targets.filter((target) => !target.ready).map((target) => `${target.name}:${target.missing.join(",")}`),
  };
  console.log(JSON.stringify(payload, null, 2));
  process.exit(ready ? 0 : 1);
}

function validateEvidence() {
  const problems = requireFiles([join(ROOT, "UserData", "README.md"), join(ROOT, "UserData", "LogData", "README.md")]);
  finish("EVIDENCE_BOUNDARY_INCOMPLETE", problems);
}

function validateCi() {
  const workflows = [
    join(ROOT, ".github", "workflows", "rustapp-validation.yml"),
    join(ROOT, ".github", "workflows", "translateit-rustapp-internal-validation.yml"),
  ];
  const problems = requireFiles(workflows);
  for (const workflow of workflows) {
    if (exists(workflow)) {
      const text = read(workflow);
      if (text.includes("ToolKitData")) problems.push(`workflow uses retired ToolKitData: ${rel(workflow)}`);
      if (!text.includes("DevelopingData\\Tooling\\Scripts\\Execution\\run_rustapp_final_validation.ps1")) problems.push(`workflow missing active runner: ${rel(workflow)}`);
    }
  }
  finish("CI_WORKFLOW_INCOMPLETE", problems);
}

function validateFrontend() {
  const problems = requireFiles([
    join(RUST_APP, "index.html"),
    join(RUST_APP, "src", "main.ts"),
    join(RUST_APP, "src", "styles.css"),
    join(RUST_APP, "src-tauri", "src", "main.rs"),
  ]);
  finish("FRONTEND_RUNTIME_CONTRACT_INCOMPLETE", problems);
}

function validateReleaseBundle() {
  const problems = requireFiles([join(RUST_APP, "package.json"), join(RUST_APP, "src-tauri", "tauri.conf.json"), join(ROOT, "TranslateIT.vbs")]);
  finish("LOCAL_RELEASE_BUNDLE_INCOMPLETE", problems);
}

function writeValidationEvidence() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const [rustCheck, typecheck, frontendBuild, tauriBuild, packaging, workerStack] = process.argv.slice(3).map((value) => value === "True" || value === "true");
  const payload = {
    schema: "translateit.rustapp.validation_evidence.v2",
    created_at: new Date().toISOString(),
    rust_check_passed: rustCheck,
    typecheck_passed: typecheck,
    frontend_build_passed: frontendBuild,
    tauri_build_passed: tauriBuild,
    packaging_passed: packaging,
    local_worker_stack_passed: workerStack,
    note: "Generated by Node tooling. This is not proof of runtime/client readiness without manual local smoke evidence.",
  };
  writeFileSync(join(EVIDENCE_ROOT, "latest_validation_evidence.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

function recordManualEvidence() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const payload = {
    schema: "translateit.manual_runtime_evidence.v2",
    created_at: new Date().toISOString(),
    microphone_asr_passed: false,
    realtime_translation_passed: false,
    quality_translation_passed: false,
    piper_tts_passed: false,
    end_to_end_latency_measured: false,
    note: "Placeholder only. Replace after real target-PC runtime smoke testing.",
  };
  writeFileSync(join(EVIDENCE_ROOT, "latest_manual_runtime_evidence.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

function summarizeReadiness() {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const validationPath = join(EVIDENCE_ROOT, "latest_validation_evidence.json");
  const manualPath = join(EVIDENCE_ROOT, "latest_manual_runtime_evidence.json");
  const validation = exists(validationPath) ? JSON.parse(read(validationPath)) : null;
  const manual = exists(manualPath) ? JSON.parse(read(manualPath)) : null;
  const blockers = [];
  if (!validation) blockers.push("missing:latest_validation_evidence.json");
  if (!manual) blockers.push("missing:latest_manual_runtime_evidence.json");
  if (validation) {
    for (const key of ["rust_check_passed", "typecheck_passed", "frontend_build_passed", "tauri_build_passed", "packaging_passed", "local_worker_stack_passed"]) {
      if (!validation[key]) blockers.push(`validation:${key}`);
    }
  }
  if (manual) {
    for (const key of ["microphone_asr_passed", "realtime_translation_passed", "quality_translation_passed", "piper_tts_passed", "end_to_end_latency_measured"]) {
      if (!manual[key]) blockers.push(`manual:${key}`);
    }
  }
  const payload = {
    schema: "translateit.readiness_summary.v2",
    created_at: new Date().toISOString(),
    client_ready: blockers.length === 0,
    blockers,
    note: "Client-ready remains false until all local build and manual runtime evidence passes.",
  };
  writeFileSync(join(EVIDENCE_ROOT, "latest_readiness_summary.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(blockers.length === 0 ? 0 : 1);
}

function smokeWorker() {
  const python = exists(join(WORKER_ROOT, ".venv", "Scripts", "python.exe")) ? join(WORKER_ROOT, ".venv", "Scripts", "python.exe") : "python";
  const status = spawnSync(python, [WORKER], { input: JSON.stringify({ command: "status" }) + "\n", encoding: "utf8" });
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const payload = {
    schema: "translateit.local_worker_smoke.v2",
    created_at: new Date().toISOString(),
    command: "status",
    exit_code: status.status,
    stdout: status.stdout,
    stderr: status.stderr,
    ok: status.status === 0 && status.stdout.includes("local_realtime_worker_preflight"),
    note: "This checks worker responsiveness only. Full microphone, translation, and TTS smoke tests still require local runtime assets.",
  };
  writeFileSync(join(EVIDENCE_ROOT, "latest_local_worker_smoke_evidence.json"), JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
  process.exit(payload.ok ? 0 : 1);
}

const command = process.argv[2] || "help";
const commands = {
  "validate-root": validateRoot,
  "validate-structure": validateStructure,
  "validate-launcher": validateLauncher,
  "validate-worker": validateWorker,
  "validate-models": validateModels,
  "validate-evidence": validateEvidence,
  "validate-ci": validateCi,
  "validate-frontend": validateFrontend,
  "validate-release": validateReleaseBundle,
  "write-validation-evidence": writeValidationEvidence,
  "record-manual-evidence": recordManualEvidence,
  "summarize-readiness": summarizeReadiness,
  "smoke-worker": smokeWorker,
};

if (!commands[command]) {
  console.log(`TranslateIT tooling commands: ${Object.keys(commands).join(", ")}`);
  process.exit(command === "help" ? 0 : 1);
}

commands[command]();
