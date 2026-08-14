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
const providerReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/AudioProvider/VBCABLE/README.md"), "utf8");
const providerNotice = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/AudioProvider/VBCABLE/NOTICE.txt"), "utf8");
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
  "../../../Backend/RuntimeAssets/AudioProvider/VBCABLE/NOTICE.txt": "EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/NOTICE.txt",
  "../../../Backend/RuntimeAssets/AudioProvider/VBCABLE/Package/": "EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package/",
};

const resources = releaseConfig.bundle?.resources;
if (!resources || Array.isArray(resources) || typeof resources !== "object") {
  fail("tauri.release.conf.json must use a source-to-target resource map.");
} else {
  const actual = Object.entries(resources).sort(([a], [b]) => a.localeCompare(b));
  const expected = Object.entries(expectedResources).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("Release resource map must contain only the approved WorkerRuntime files, private PythonRuntime, ASR/translation models, GPT-SoVITS VoiceLab payload, and standard VB-CABLE provider payload.");
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
  "/EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package/**",
]) {
  if (!gitignore.includes(marker)) fail(`Controlled release payload must stay out of Git: ${marker}`);
}
if (gitignore.includes("/EngineData/Backend/RuntimeAssets/Voice/Piper/**")) {
  fail("Retired Piper release payload ignore must not remain as active packaging policy.");
}

for (const marker of [
  "standard VB-Audio VB-CABLE",
  "Do not substitute or additionally bundle",
  "A+B or C+D",
  "Voicemeeter",
  "custom TranslateIT audio driver",
  "particular release has the required redistribution/license rights",
]) {
  if (!providerReadme.includes(marker)) fail(`VB-CABLE release policy marker is missing: ${marker}`);
}
const normalizedNotice = providerNotice.toLowerCase();
for (const marker of ["vb-audio", "vb-cable", "donationware"]) {
  if (!normalizedNotice.includes(marker)) fail(`VB-CABLE user notice marker is missing: ${marker}`);
}

if (errors.length) {
  for (const error of errors) console.error(`[release-package-contract] ${error}`);
  process.exit(1);
}

console.log("[release-package-contract] P4 provider policy is source-aligned: the controlled Windows release remains one Tauri/NSIS path, standard VB-CABLE is the only staged Meeting audio provider candidate, the donationware/origin notice is bundled, alternate VB-CABLE/Voicemeeter/custom-driver expansion is excluded, private runtime/model/provider bytes remain controlled release inputs outside Git, and packaged mode has no system-Python fallback. Redistribution rights, driver installation, restart behavior, installed endpoint use, and clean-machine execution remain separate release evidence.");
