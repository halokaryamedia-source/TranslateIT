import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const backendRoot = resolve(appRoot, "../../Backend");
const workerRoot = join(backendRoot, "LocalWorker", "WorkerRuntime");
const pythonRoot = join(backendRoot, "LocalWorker", "PythonRuntime");
const runtimeAssetsRoot = join(backendRoot, "RuntimeAssets");
const voiceSourceRoot = join(runtimeAssetsRoot, "Voice", "GPTSoVITS", "Source");
const vbCableRoot = join(runtimeAssetsRoot, "AudioProvider", "VBCABLE");
const vbCablePackageRoot = join(vbCableRoot, "Package");
const expectedRevision = "d523079fc05d9a8028d6085bffe4a2757c32abb6";
const expectedFfmpegExeSha256 = "ad62137371b2111d52d29c9bc82d5aecf7065c8f937e95dfed087b2bc63ea88d";
const expectedFfmpegLicenseSha256 = "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768";

const errors = [];
const fail = (message) => errors.push(message);
const requireFile = (path, label = path) => {
  if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size <= 0) {
    fail(`Missing required release file: ${label}`);
  }
};
const requireDir = (path, label = path) => {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    fail(`Missing required release directory: ${label}`);
  }
};
const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const hasAnyFile = (root) => {
  if (!existsSync(root) || !statSync(root).isDirectory()) return false;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isFile() && statSync(path).size > 0) return true;
      if (entry.isDirectory()) stack.push(path);
    }
  }
  return false;
};

for (const file of [
  "realtime_local_worker.py",
  "voice_lab_build.py",
  "voice_lab_gpt_sovits.py",
  "voice_lab_upstream_stage.py",
  "model_manifest.json",
]) {
  requireFile(join(workerRoot, file), `WorkerRuntime/${file}`);
}

requireFile(join(pythonRoot, "python.exe"), "LocalWorker/PythonRuntime/python.exe");

const manifestPath = join(workerRoot, "model_manifest.json");
if (existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    fail("WorkerRuntime/model_manifest.json is not valid JSON.");
  }
  if (manifest) {
    if (manifest.schema !== "translateit.local_model_inventory.v2" || manifest.inventory_scope !== "full_product_release_assets") {
      fail("WorkerRuntime/model_manifest.json is not the canonical full-product release inventory.");
    }
    for (const model of manifest.models ?? []) {
      if (model.required !== true) continue;
      const expectedPath = String(model.expected_path ?? "").trim();
      if (!expectedPath.startsWith("EngineData/Backend/RuntimeAssets/")) {
        fail(`Required model ${model.model_id ?? "<unknown>"} has an invalid release path.`);
        continue;
      }
      const relative = expectedPath.slice("EngineData/Backend/RuntimeAssets/".length);
      const target = join(runtimeAssetsRoot, ...relative.split("/"));
      if (!existsSync(target) || (!statSync(target).isFile() && !hasAnyFile(target))) {
        fail(`Required release asset is missing or empty: ${model.model_id} -> ${expectedPath}`);
      }
    }
  }
}

requireFile(join(voiceSourceRoot, "TRANSLATEIT_GPTSOVITS_REVISION.txt"), "GPT-SoVITS revision marker");
if (existsSync(join(voiceSourceRoot, "TRANSLATEIT_GPTSOVITS_REVISION.txt"))) {
  const revision = readFileSync(join(voiceSourceRoot, "TRANSLATEIT_GPTSOVITS_REVISION.txt"), "utf8").trim();
  if (revision !== expectedRevision) fail("GPT-SoVITS release payload revision does not match the approved V2ProPlus pin.");
}
const ffmpegPath = join(voiceSourceRoot, "ffmpeg.exe");
const ffmpegLicensePath = join(voiceSourceRoot, "FFMPEG_LICENSE.txt");
const ffmpegSourcePath = join(voiceSourceRoot, "FFMPEG_SOURCE.txt");
requireFile(ffmpegPath, "GPT-SoVITS/Source/ffmpeg.exe");
requireFile(ffmpegLicensePath, "GPT-SoVITS/Source/FFMPEG_LICENSE.txt");
requireFile(ffmpegSourcePath, "GPT-SoVITS/Source/FFMPEG_SOURCE.txt");
if (existsSync(ffmpegPath) && sha256File(ffmpegPath) !== expectedFfmpegExeSha256) {
  fail("GPT-SoVITS/Source/ffmpeg.exe does not match the pinned BtbN LGPL static executable.");
}
if (existsSync(ffmpegLicensePath)) {
  if (sha256File(ffmpegLicensePath) !== expectedFfmpegLicenseSha256) {
    fail("GPT-SoVITS/Source/FFMPEG_LICENSE.txt must be the exact LICENSE.txt from the pinned BtbN archive.");
  }
  const ffmpegLicense = readFileSync(ffmpegLicensePath, "utf8");
  if (!ffmpegLicense.includes("GNU LESSER GENERAL PUBLIC LICENSE") || !ffmpegLicense.includes("Version 3, 29 June 2007")) {
    fail("FFMPEG_LICENSE.txt does not contain the expected LGPL v3 license text.");
  }
}
if (existsSync(ffmpegSourcePath)) {
  const sourceRecord = readFileSync(ffmpegSourcePath, "utf8");
  for (const marker of [
    "source_kind=ffmpeg",
    "binary_builder=BtbN/FFmpeg-Builds",
    "builder_release_tag=autobuild-2026-08-10-13-17",
    "builder_commit=2437e7b868da3c11872367b15f3c613b87c24819",
    "archive=ffmpeg-n8.1.2-34-g9b6c8969e0-win64-lgpl-8.1.zip",
    "archive_sha256=b0531e470d73bf2e0d3e22a3a35f6e890781e0791c496950664da9be9ea8c0ab",
    "ffmpeg_version=n8.1.2-34-g9b6c8969e0-20260810",
    "ffmpeg_source_commit=9b6c8969e05b4f0b29f0f85cd501be6b3e582e6b",
    `ffmpeg_exe_sha256=${expectedFfmpegExeSha256}`,
    "license_profile=LGPL-3.0-or-later",
    "build_profile=win64-lgpl-static",
  ]) {
    if (!sourceRecord.includes(marker)) fail(`FFMPEG_SOURCE.txt provenance marker is missing: ${marker}`);
  }
}
for (const dir of [
  ["GPT_SoVITS", "GPT-SoVITS core source"],
  ["nltk_data/corpora/cmudict", "NLTK cmudict"],
  ["nltk_data/taggers/averaged_perceptron_tagger", "NLTK perceptron tagger"],
  ["nltk_data/taggers/averaged_perceptron_tagger_eng", "NLTK English perceptron tagger"],
]) {
  requireDir(join(voiceSourceRoot, ...dir[0].split("/")), dir[1]);
}

const forbiddenVoicePayload = [
  "webui.py",
  "api.py",
  "api_v2.py",
  "GPT_SoVITS/inference_webui.py",
  "tools/asr",
  "tools/uvr5",
  "tools/subfix_webui.py",
  "ffplay.exe",
  "ffprobe.exe",
];
for (const relative of forbiddenVoicePayload) {
  const target = join(voiceSourceRoot, ...relative.split("/"));
  if (existsSync(target)) fail(`Unapproved GPT-SoVITS WebUI/server/auxiliary payload must not be bundled: ${relative}`);
}

requireFile(join(vbCableRoot, "NOTICE.txt"), "AudioProvider/VBCABLE/NOTICE.txt");
if (existsSync(join(vbCableRoot, "NOTICE.txt"))) {
  const notice = readFileSync(join(vbCableRoot, "NOTICE.txt"), "utf8").toLowerCase();
  if (!notice.includes("vb-audio") || !notice.includes("donationware") || !notice.includes("vb-cable")) {
    fail("VB-CABLE distribution notice must identify VB-Audio, VB-CABLE, and its donationware model.");
  }
}
requireDir(vbCablePackageRoot, "AudioProvider/VBCABLE/Package");
requireFile(join(vbCablePackageRoot, "VBCABLE_Setup_x64.exe"), "AudioProvider/VBCABLE/Package/VBCABLE_Setup_x64.exe");
requireFile(join(vbCablePackageRoot, "VBCABLE_Setup.exe"), "AudioProvider/VBCABLE/Package/VBCABLE_Setup.exe");
for (const forbiddenProviderName of [
  "VBCable_AB_PackSetup.exe",
  "VBCable_CD_PackSetup.exe",
  "VoicemeeterSetup.exe",
  "VoicemeeterProSetup.exe",
  "VoicemeeterPotatoSetup.exe",
]) {
  if (existsSync(join(vbCablePackageRoot, forbiddenProviderName))) {
    fail(`Unapproved alternate audio-provider payload must not be bundled: ${forbiddenProviderName}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`[release-payload] ${error}`);
  console.error("[release-payload] Release payload is incomplete or contains unapproved baggage. Prepare the controlled runtime assets before building the installer.");
  process.exit(1);
}

console.log("[release-payload] Required private Python runtime, release model inventory, pruned GPT-SoVITS VoiceLab payload, pinned FFmpeg LGPL executable/license/source record, and standard VB-CABLE provider package are present for Tauri/NSIS staging. This is controlled payload-input proof only, not whole-release legal, driver-install, installed-runtime, or clean-machine proof.");
