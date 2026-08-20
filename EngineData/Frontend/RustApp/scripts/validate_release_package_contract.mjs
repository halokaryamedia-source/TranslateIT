import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const tauriRoot = join(appRoot, "src-tauri");
const backendRoot = resolve(appRoot, "../../Backend");
const workerRoot = join(backendRoot, "LocalWorker", "WorkerRuntime");

const errors = [];
const fail = (message) => errors.push(message);
const readText = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(readText(path));
const requireFile = (path, label = path) => {
  if (!existsSync(path) || !statSync(path).isFile()) fail(`Missing required file: ${label}`);
};

const packagePath = join(appRoot, "package.json");
const releaseConfigPath = join(tauriRoot, "tauri.release.conf.json");
const manifestPath = join(workerRoot, "model_manifest.json");
const entrypointPath = join(workerRoot, "realtime_local_worker.py");
const basePath = join(workerRoot, "realtime_local_worker_base.py");
const providerPath = join(workerRoot, "milmmt_translation_provider.py");
const commonPath = join(workerRoot, "worker_runtime_common.py");
const ioPath = join(workerRoot, "worker_io_runtime.py");
const stagePath = join(scriptDir, "stage_release_inputs.ps1");
const buildPath = join(scriptDir, "build_release.ps1");
const revisionValidatorPath = join(scriptDir, "validate_release_model_revisions.mjs");

for (const path of [
  packagePath,
  releaseConfigPath,
  manifestPath,
  entrypointPath,
  basePath,
  providerPath,
  commonPath,
  ioPath,
  stagePath,
  buildPath,
  revisionValidatorPath,
]) requireFile(path);
if (errors.length) {
  for (const error of errors) console.error(`[release-package] ${error}`);
  process.exit(1);
}

const packageJson = readJson(packagePath);
const releaseConfig = readJson(releaseConfigPath);
const manifest = readJson(manifestPath);
const entrypoint = readText(entrypointPath);
const base = readText(basePath);
const provider = readText(providerPath);
const stage = readText(stagePath);
const build = readText(buildPath);
const revisionValidator = readText(revisionValidatorPath);

const expectedResources = {
  "../../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py": "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py",
  "../../../Backend/LocalWorker/WorkerRuntime/realtime_local_worker_base.py": "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker_base.py",
  "../../../Backend/LocalWorker/WorkerRuntime/milmmt_translation_provider.py": "EngineData/Backend/LocalWorker/WorkerRuntime/milmmt_translation_provider.py",
  "../../../Backend/LocalWorker/WorkerRuntime/worker_runtime_common.py": "EngineData/Backend/LocalWorker/WorkerRuntime/worker_runtime_common.py",
  "../../../Backend/LocalWorker/WorkerRuntime/worker_io_runtime.py": "EngineData/Backend/LocalWorker/WorkerRuntime/worker_io_runtime.py",
  "../../../Backend/LocalWorker/WorkerRuntime/translation_envelope.py": "EngineData/Backend/LocalWorker/WorkerRuntime/translation_envelope.py",
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
    fail("Release resource map does not match the canonical packaged runtime closure.");
  }
  for (const [source, target] of actual) {
    if (/UserData|DevelopingData|\.venv|tests/i.test(source)) fail(`Development/user baggage in release source: ${source}`);
    if (!target.startsWith("EngineData/Backend/")) fail(`Release target escapes canonical backend layout: ${target}`);
  }
}

if (manifest.schema !== "translateit.local_model_inventory.v2" || manifest.inventory_scope !== "full_product_release_assets") {
  fail("model_manifest.json must remain the canonical full-product release inventory.");
}
const requiredIds = new Set((manifest.models ?? []).filter((item) => item.required === true).map((item) => item.model_id));
for (const id of ["faster-whisper-large-v3-turbo", "milmmt-46-1b-v1.0", "gpt-sovits-v2proplus-voicelab"]) {
  if (!requiredIds.has(id)) fail(`Required release model missing from manifest: ${id}`);
}
for (const legacy of ["marianmt-id-en", "marianmt-en-id", "m2m100-418m"]) {
  if (requiredIds.has(legacy)) fail(`Legacy translation model remains release-required: ${legacy}`);
}
const milmmt = (manifest.models ?? []).find((item) => item.model_id === "milmmt-46-1b-v1.0");
if (milmmt?.repo_id !== "xiaomi-research/MiLMMT-46-1B-v1.0") fail("MiLMMT repo identity drifted.");
if (milmmt?.revision !== "4fc480b6c58dec29c159dcdf9fde0f6d5c354995") fail("MiLMMT revision drifted.");
if (milmmt?.license !== "gemma") fail("MiLMMT license metadata drifted.");

if (!entrypoint.includes('with_name("realtime_local_worker_base.py")')) fail("Worker entrypoint does not load canonical base.");
if (!entrypoint.includes("milmmt_translation_provider.install(globals())")) fail("Worker entrypoint does not install MiLMMT provider.");
if (base.includes("AutoModelForSeq2SeqLM") || base.toLowerCase().includes("m2m100")) fail("Worker base still contains legacy translation implementation.");
for (const marker of ["AutoModelForCausalLM", "milmmt-46-1b-v1.0", "4fc480b6c58dec29c159dcdf9fde0f6d5c354995", "do_sample=False"]) {
  if (!provider.includes(marker)) fail(`MiLMMT provider marker missing: ${marker}`);
}

const activeRelease = `${stage}\n${build}`.toLowerCase();
for (const marker of ["helsinki-nlp", "opus-mt-id-en", "opus-mt-en-id", "marianmt-id-en", "marianmt-en-id", "m2m100-418m"]) {
  if (activeRelease.includes(marker)) fail(`Legacy translation marker remains active in release scripts: ${marker}`);
}
for (const marker of ["prepare_model_assets.py", "milmmt-46-1b-v1.0", "validate_release_model_revisions.mjs"]) {
  if (!`${stage}\n${build}\n${revisionValidator}`.includes(marker)) fail(`Release authority marker missing: ${marker}`);
}

const scripts = packageJson.scripts ?? {};
if (!String(scripts["preflight:release-payload"] ?? "").includes("validate_release_model_revisions.mjs")) fail("Release payload preflight must validate model revisions.");
if (!String(scripts["preflight:tauri-package"] ?? "").includes("validate_release_package_contract.mjs")) fail("Tauri package preflight must include release package contract.");
if (!String(scripts["validate:source-contracts"] ?? "").includes("preflight:tauri-package")) fail("Source validation must include Tauri package preflight.");

if (errors.length) {
  for (const error of errors) console.error(`[release-package] ${error}`);
  process.exit(1);
}
console.log("[release-package] Canonical MiLMMT worker, model inventory, release resource map, and staging authority are aligned.");
