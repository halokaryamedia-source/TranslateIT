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
const localWorkerReadme = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/README.md"), "utf8");
const runtimeAssetsReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/README.md"), "utf8");
const voiceAssetsReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/Voice/README.md"), "utf8");
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

const gptSoVitsInventory = (modelManifest.models ?? []).find((item) => item.model_id === "gpt-sovits-v2proplus-voicelab");
if (gptSoVitsInventory?.asset_repo_id !== "lj1995/GPT-SoVITS" || gptSoVitsInventory?.asset_revision !== "336b2ec4e8d4ac74740798dd40af44e74659ecaf") {
  fail("GPT-SoVITS pretrained release provenance must stay pinned to the reviewed lj1995/GPT-SoVITS snapshot.");
}
const expectedVoiceHashes = {
  "s1v3.ckpt": "87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a",
  "sv/pretrained_eres2netv2w24s4ep4.ckpt": "4f5a0bf73c61eb41b174e1bb54e7ee3c83233892be8e0af1f187024e8e581a35",
  "v2Pro/s2Dv2ProPlus.pth": "635cd84bf6f7f9b8d41c88c7106f81d782c794c61f931845214ea037b0c5bef2",
  "v2Pro/s2Gv2ProPlus.pth": "d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b",
};
for (const [path, hash] of Object.entries(expectedVoiceHashes)) {
  if (gptSoVitsInventory?.asset_hashes?.[path] !== hash) fail(`GPT-SoVITS pretrained hash contract drifted: ${path}`);
}

for (const marker of [
  "CPython 3.12.10 Windows embeddable package",
  "g2p-en==2.1.0",
  "distance==0.1.3",
  "license-review blocker",
]) {
  if (!localWorkerReadme.includes(marker)) fail(`Python release provenance/license gate marker is missing: ${marker}`);
}
for (const marker of [
  "Release Provenance / License Gate",
  "not license clearance",
  "Concrete release redistribution rights are **not** proven by source",
]) {
  if (!runtimeAssetsReadme.includes(marker)) fail(`Runtime asset release gate marker is missing: ${marker}`);
}
for (const marker of [
  "336b2ec4e8d4ac74740798dd40af44e74659ecaf",
  "87133414860ea14ff6620c483a3db5ed07b44be42e2c3fcdad65523a729a745a",
  "d42a22bbbf65fb2bbdd45ad6a66841156977db45c7aabe0a6992ff378d9c7d3b",
  "not license-cleared by the current source contract",
  "CMU states research/commercial use is unrestricted",
]) {
  if (!voiceAssetsReadme.includes(marker)) fail(`Voice release provenance/license gate marker is missing: ${marker}`);
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

console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled and pinned where currently reviewable, GPT-SoVITS source/pretrained provenance is recorded, Python/FFmpeg/VB-CABLE licensing gates remain explicit rather than fabricated as cleared, and packaged mode has no system-Python fallback. Actual redistribution clearance, staged-byte verification, driver installation, installed runtime, and clean-machine execution remain separate evidence.");
