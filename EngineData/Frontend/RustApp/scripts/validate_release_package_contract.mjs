import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const tauriRoot = join(appRoot, "src-tauri");
const repoRoot = resolve(appRoot, "../../..");

const packageJson = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"));
const releaseConfig = JSON.parse(readFileSync(join(tauriRoot, "tauri.release.conf.json"), "utf8"));
const modelManifest = JSON.parse(
  readFileSync(resolve(appRoot, "../../Backend/LocalWorker/WorkerRuntime/model_manifest.json"), "utf8"),
);
const bridgePaths = readFileSync(join(tauriRoot, "src", "commands", "bridge_paths.rs"), "utf8");
const pathsOwner = readFileSync(join(tauriRoot, "src", "engine", "paths.rs"), "utf8");
const buildRelease = readFileSync(join(scriptDir, "build_release.ps1"), "utf8");
const gitignore = readFileSync(join(repoRoot, ".gitignore"), "utf8");

const errors = [];
const fail = (message) => errors.push(message);

const expectedResources = {
  "../../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py": "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
  "../../../Backend/LocalWorker/WorkerRuntime/voice_lab_build.py": "EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_build.py",
  "../../../Backend/LocalWorker/WorkerRuntime/voice_lab_gpt_sovits.py": "EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_gpt_sovits.py",
  "../../../Backend/LocalWorker/WorkerRuntime/voice_lab_upstream_stage.py": "EngineData/Backend/LocalWorker/WorkerRuntime/voice_lab_upstream_stage.py",
  "../../../Backend/LocalWorker/WorkerRuntime/model_manifest.json": "EngineData/Backend/LocalWorker/WorkerRuntime/model_manifest.json",
  "../../../Backend/LocalWorker/PythonRuntime/": "EngineData/Backend/LocalWorker/PythonRuntime/",
  "../../../Backend/RuntimeAssets/ASR/ModelData/": "EngineData/Backend/RuntimeAssets/ASR/ModelData/",
  "../../../Backend/RuntimeAssets/Translation/ModelData/": "EngineData/Backend/RuntimeAssets/Translation/ModelData/",
  "../../../Backend/RuntimeAssets/Voice/GPTSoVITS/": "EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS/",
};

const resources = releaseConfig.bundle?.resources;
if (!resources || Array.isArray(resources) || typeof resources !== "object") {
  fail("tauri.release.conf.json must use a source-to-target resource map.");
} else {
  const actual = Object.entries(resources).sort(([a], [b]) => a.localeCompare(b));
  const expected = Object.entries(expectedResources).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("Release resource map must contain only the approved WorkerRuntime files, private PythonRuntime, ASR/translation models, and GPT-SoVITS VoiceLab payload.");
  }
  for (const [source, target] of actual) {
    if (source.includes("UserData") || source.includes("DevelopingData") || source.includes(".venv") || source.includes("tests")) {
      fail(`Release source includes development/user-data baggage: ${source}`);
    }
    if (!target.startsWith("EngineData/Backend/")) {
      fail(`Release target escapes the canonical backend runtime layout: ${target}`);
    }
  }
}

const scripts = packageJson.scripts ?? {};
if (scripts["preflight:release-payload"] !== "node scripts/validate_release_payload.mjs") {
  fail("package.json must expose the exact release-payload preflight.");
}
if (!String(scripts["preflight:tauri-package"] ?? "").includes("validate_release_package_contract.mjs")) {
  fail("Normal packaging preflight must include the release package contract validator.");
}
if (!String(scripts["validate:source-contracts"] ?? "").includes("preflight:tauri-package")) {
  fail("Normal source validation must include packaging preflight.");
}
for (const marker of [
  "npm run preflight:release-payload",
  "npm exec -- tauri build --config src-tauri/tauri.release.conf.json",
]) {
  if (!buildRelease.includes(marker)) fail(`Controlled Windows release build marker is missing: ${marker}`);
}

for (const marker of [
  "paths.packaged_context_initialized",
  "paths.python_runtime_dir",
  '.join("python.exe")',
  'source: "packaged_python_runtime".to_string()',
  "if !paths.is_repository_development() {",
]) {
  if (!bridgePaths.includes(marker)) fail(`Packaged Python resolver marker is missing: ${marker}`);
}
for (const forbidden of [
  'source: "packaged_system_python"',
  'source: "packaged_python_launcher"',
]) {
  if (bridgePaths.includes(forbidden)) fail(`Packaged mode must not have a system-Python fallback: ${forbidden}`);
}

for (const marker of [
  '.join("EngineData")',
  '.join("Backend")',
  '.join("LocalWorker")',
  '.join("PythonRuntime")',
  '.join("RuntimeAssets")',
]) {
  if (!pathsOwner.includes(marker)) fail(`Installed layout owner marker is missing: ${marker}`);
}

if (modelManifest.schema !== "translateit.local_model_inventory.v2" || modelManifest.inventory_scope !== "full_product_release_assets") {
  fail("model_manifest.json must remain the canonical full-product release inventory.");
}
const requiredIds = new Set((modelManifest.models ?? []).filter((item) => item.required === true).map((item) => item.model_id));
for (const id of [
  "faster-whisper-large-v3-turbo",
  "marianmt-id-en",
  "marianmt-en-id",
  "gpt-sovits-v2proplus-voicelab",
]) {
  if (!requiredIds.has(id)) fail(`Required release model is missing from model_manifest.json: ${id}`);
}

for (const marker of [
  "/EngineData/Backend/LocalWorker/PythonRuntime/**",
  "/EngineData/Backend/RuntimeAssets/ASR/ModelData/**",
  "/EngineData/Backend/RuntimeAssets/Translation/ModelData/**",
  "/EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS/**",
]) {
  if (!gitignore.includes(marker)) fail(`Controlled release payload must stay out of Git: ${marker}`);
}

if (errors.length) {
  for (const error of errors) console.error(`[release-package-contract] ${error}`);
  process.exit(1);
}

console.log("[release-package-contract] P3 source contract is aligned: one controlled Windows release entry uses a Tauri resource-map overlay, only production WorkerRuntime files are declared, private PythonRuntime and required runtime assets map to ProjectPaths' installed layout, packaged mode has no system-Python fallback, staged runtime/model bytes remain controlled release inputs outside Git, and normal source validation exercises this contract. Installed/clean-machine execution remains separate proof.");
