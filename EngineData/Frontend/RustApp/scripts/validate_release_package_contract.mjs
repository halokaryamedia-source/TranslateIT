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
const noticeGenerator = readFileSync(join(scriptDir, "generate_third_party_notices.mjs"), "utf8");
const releasePayloadValidator = readFileSync(join(scriptDir, "validate_release_payload.mjs"), "utf8");
const providerReadme = readFileSync(resolve(appRoot, "../../Backend/RuntimeAssets/AudioProvider/VBCABLE/README.md"), "utf8");
const localWorkerReadme = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/README.md"), "utf8");
const workerPyproject = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/WorkerRuntime/pyproject.toml"), "utf8");
const workerLock = readFileSync(resolve(appRoot, "../../Backend/LocalWorker/WorkerRuntime/uv.lock"), "utf8");
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
  "../../../Backend/RuntimeAssets/ThirdPartyNotices/THIRD_PARTY_NOTICES.txt": "EngineData/Backend/RuntimeAssets/ThirdPartyNotices/THIRD_PARTY_NOTICES.txt",
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
  "node scripts/generate_third_party_notices.mjs --write",
  "npm run preflight:release-payload",
  "node_modules\\.bin\\tauri.cmd",
  "dynamic CLI download is not allowed",
  "& $TauriCli build --config src-tauri/tauri.release.conf.json",
]) {
  if (!buildRelease.includes(marker)) fail(`Controlled Windows release build marker is missing: ${marker}`);
}
if (buildRelease.includes("npm exec") || buildRelease.includes("npx ")) {
  fail("Controlled Windows release build must use only the locally installed Tauri CLI; npm exec/npx download-capable execution is forbidden.");
}

for (const marker of [
  "collectPythonDistributions",
  "python_distribution_missing_license_material",
  "frozendict_lgpl_material_missing",
  "soxr_lgpl_material_missing",
  "excluded_distance_distribution_present",
  "buildThirdPartyNoticeBundle",
  "CMUDICT ATTRIBUTION",
  "VB-CABLE redistribution rights remain a separate external release gate",
]) {
  if (!noticeGenerator.includes(marker)) fail(`Third-party notice generator contract marker is missing: ${marker}`);
}
if (noticeGenerator.includes("fetch(") || noticeGenerator.includes("https.get(") || noticeGenerator.includes("Invoke-WebRequest")) {
  fail("Third-party notice generation must be offline and derive only from staged release inputs/source records.");
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
  '"g2p-en==2.1.0"',
  'required-version = ">=0.12.0"',
  '{ package = { name = "g2p-en", version = "2.1.0" }, dependencies = ["distance"] }',
]) {
  if (!workerPyproject.includes(marker)) fail(`WorkerRuntime g2p dependency-containment marker is missing: ${marker}`);
}
if (/\[\[package\]\]\s+name = "distance"(?:\s|$)/m.test(workerLock)) {
  fail("WorkerRuntime uv.lock must not contain the excluded Distance package.");
}
if (!/\[\[package\]\]\s+name = "g2p-en"\s+version = "2\.1\.0"/m.test(workerLock)) {
  fail("WorkerRuntime uv.lock must retain the source-reviewed g2p-en 2.1.0 release.");
}
for (const marker of [
  "Exceptional Frozen-Wheel License Material",
  "106 of the 116 frozen production distributions",
  "ctranslate2==4.8.1",
  "onnxruntime==1.28.0",
  "sentencepiece==0.2.2",
  "tensorboard-data-server==0.7.2",
  "TRANSLATEIT_SOURCE.txt",
]) {
  if (!localWorkerReadme.includes(marker)) fail(`Exceptional Python license-material policy marker is missing: ${marker}`);
}
for (const marker of [
  "const exceptionalPythonLicenseMaterials",
  "54aa79d9fe3c09e67a16dcd95b9e88676405a6ec174efda31036983cf7672ecb",
  "0e07b95f3a8d6230037707c5c4a2b554d12c4cb67369669ac255635528ffcee2",
  "c79a7fea0e3cac04cd43f20e7b648e5a0ff8fa5344e644b0ee09ca1162b62747",
  "81150b898a306b89cde90e949358c2eefe018eaa",
  "exceptional license source marker is missing",
]) {
  if (!releasePayloadValidator.includes(marker)) fail(`Exceptional Python release validator marker is missing: ${marker}`);
}

for (const marker of [
  "CPython 3.12.10 Windows embeddable package",
  "4acbed6dd1c744b0376e3b1cf57ce906f9dc9e95e68824584c8099a63025a3c3",
  "PythonRuntime/PYTHON_SOURCE.txt",
  "..\\WorkerRuntime",
  "`import site` must remain disabled",
  "version-scoped `exclude-dependencies`",
  "uv.lock` must not contain the `Distance` package",
  "uv>=0.12.0",
  "FFmpeg, VB-CABLE",
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
  "autobuild-2026-08-10-13-17",
  "ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip",
  "b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab",
  "ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d",
  "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768",
  "9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b",
  "LGPL-3.0-or-later",
  "FFMPEG_LICENSE.txt",
  "FFMPEG_SOURCE.txt",
  "CMU states research/commercial use is unrestricted",
  "550b6625bcef1f2abff2ff770a5a0d272c9c6b2a",
  "NLTK_DATA_SOURCE.txt",
  "d07cca47fd72ad32ea9d8ad1219f85301eeaf4568f8b6b73747506a71fb5afd6",
  "6025f530624335c67d6547d44757b357b4e79bae030a0383e9887a92c1718f0b",
]) {
  if (!voiceAssetsReadme.includes(marker)) fail(`Voice release provenance/license gate marker is missing: ${marker}`);
}
for (const marker of [
  'expectedFfmpegExeSha256 = "ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d"',
  'expectedFfmpegLicenseSha256 = "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768"',
  '"FFMPEG_LICENSE.txt"',
  '"FFMPEG_SOURCE.txt"',
  '"builder_release_tag=autobuild-2026-08-10-13-17"',
  '"ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b"',
  '"license_profile=LGPL-3.0-or-later"',
  '"ffplay.exe"',
  '"ffprobe.exe"',
]) {
  if (!releasePayloadValidator.includes(marker)) fail(`FFmpeg release-payload pin marker is missing: ${marker}`);
}

for (const marker of [
  "/EngineData/Backend/LocalWorker/PythonRuntime/**",
  "/EngineData/Backend/RuntimeAssets/ASR/ModelData/**",
  "/EngineData/Backend/RuntimeAssets/Translation/ModelData/**",
  "/EngineData/Backend/RuntimeAssets/ThirdPartyNotices/THIRD_PARTY_NOTICES.txt",
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
  "general end-user distribution only",
  "managed professional/company/institution deployment",
  "VBCABLE_Driver_Pack45.zip",
  "b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb",
  "734c35dfa6d98f48782a451633ceb471166ec70d60482fd89a1123d0ee3c4f41",
  "01ffc86b623ff3c75a883aa900c0215a89482988e1c8e55988fc0a9fb513dbed",
]) {
  if (!providerReadme.includes(marker)) fail(`VB-CABLE release policy marker is missing: ${marker}`);
}
const normalizedNotice = providerNotice.toLowerCase();
for (const marker of [
  "vb-audio",
  "vb-cable",
  "donationware",
  "https://vb-cable.com/",
  "https://shop.vb-audio.com/en/win-apps/11-vb-cable.html",
  "managed professional/company/institution",
]) {
  if (!normalizedNotice.includes(marker)) fail(`VB-CABLE user notice marker is missing: ${marker}`);
}

if (errors.length) {
  for (const error of errors) console.error(`[release-package-contract] ${error}`);
  process.exit(1);
}

console.log("[release-package-contract] Release source policy is aligned: private Python/model/provider inputs remain controlled, the Distance containment stays bounded, GPT-SoVITS provenance remains pinned, FFmpeg is pinned to the reviewed BtbN win64 LGPL static executable with exact license/source companions, VB-CABLE retains its separate distribution gate, and packaged mode has no system-Python fallback. This is dependency/provenance source-contract evidence, not whole-release legal or installed-runtime clearance.");
