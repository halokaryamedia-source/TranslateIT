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
const expectedRevision = "d523079fc05d9a8028d6085bffe4a2757c32abb6";

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
requireFile(join(voiceSourceRoot, "ffmpeg.exe"), "GPT-SoVITS/Source/ffmpeg.exe");
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
];
for (const relative of forbiddenVoicePayload) {
  const target = join(voiceSourceRoot, ...relative.split("/"));
  if (existsSync(target)) fail(`Unapproved GPT-SoVITS WebUI/server/auxiliary payload must not be bundled: ${relative}`);
}

if (errors.length) {
  for (const error of errors) console.error(`[release-payload] ${error}`);
  console.error("[release-payload] Release payload is incomplete or contains unapproved baggage. Prepare the controlled runtime assets before building the installer.");
  process.exit(1);
}

console.log("[release-payload] Required private Python runtime, release model inventory, and pruned GPT-SoVITS VoiceLab payload are present for Tauri/NSIS staging. This is payload-input proof only, not installed-runtime or clean-machine proof.");
