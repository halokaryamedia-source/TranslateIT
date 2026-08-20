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
const requireMarkers = (body, label, markers) => {
  for (const marker of markers) if (!body.includes(marker)) fail(`${label} marker is missing: ${marker}`);
};
const forbidMarkers = (body, label, markers) => {
  for (const marker of markers) if (body.includes(marker)) fail(`${label} forbidden marker is present: ${marker}`);
};

const packagePath = join(appRoot, "package.json");
const releaseConfigPath = join(tauriRoot, "tauri.release.conf.json");
const manifestPath = join(workerRoot, "model_manifest.json");
const entrypointPath = join(workerRoot, "realtime_local_worker.py");
const basePath = join(workerRoot, "realtime_local_worker_base.py");
const providerPath = join(workerRoot, "milmmt_translation_provider.py");
const stagePath = join(scriptDir, "stage_release_inputs.ps1");
const buildPath = join(scriptDir, "build_release.ps1");
const payloadBuilderPath = join(scriptDir, "build_r3_external_payload.py");
const revisionValidatorPath = join(scriptDir, "validate_release_model_revisions.mjs");
const hookTemplatePath = join(tauriRoot, "windows", "r3_payload_hooks.template.nsh");
const installerHelperPath = join(tauriRoot, "windows", "r3_payload_installer.ps1");
const generatedHookPath = join(tauriRoot, "target", "translateit-r3-payload-hooks.generated.nsh");

for (const path of [
  packagePath,
  releaseConfigPath,
  manifestPath,
  entrypointPath,
  basePath,
  providerPath,
  stagePath,
  buildPath,
  payloadBuilderPath,
  revisionValidatorPath,
  hookTemplatePath,
  installerHelperPath,
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
const payloadBuilder = readText(payloadBuilderPath);
const hookTemplate = readText(hookTemplatePath);
const installerHelper = readText(installerHelperPath);
const revisionValidator = readText(revisionValidatorPath);

const expectedSetupResources = {
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
  "../../../Backend/RuntimeAssets/ThirdPartyNotices/THIRD_PARTY_NOTICES.txt": "EngineData/Backend/RuntimeAssets/ThirdPartyNotices/THIRD_PARTY_NOTICES.txt",
  "../../../Backend/RuntimeAssets/AudioProvider/VBCABLE/NOTICE.txt": "EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/NOTICE.txt",
};
const resources = releaseConfig.bundle?.resources;
if (!resources || Array.isArray(resources) || typeof resources !== "object") {
  fail("tauri.release.conf.json must use a source-to-target setup resource map.");
} else {
  const actual = Object.entries(resources).sort(([a], [b]) => a.localeCompare(b));
  const expected = Object.entries(expectedSetupResources).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("Setup resource map must contain only the canonical small runtime/control closure.");
  }
  for (const [source, target] of actual) {
    if (/UserData|DevelopingData|\.venv|tests/i.test(source)) fail(`Development/user baggage in setup source: ${source}`);
    if (!target.startsWith("EngineData/Backend/")) fail(`Setup target escapes canonical backend layout: ${target}`);
  }
}

const forbiddenEmbeddedPayloadSources = [
  "../../../Backend/LocalWorker/PythonRuntime/",
  "../../../Backend/RuntimeAssets/ASR/ModelData/",
  "../../../Backend/RuntimeAssets/Translation/ModelData/",
  "../../../Backend/RuntimeAssets/Voice/GPTSoVITS/",
  "../../../Backend/RuntimeAssets/AudioProvider/VBCABLE/Package/",
];
for (const source of forbiddenEmbeddedPayloadSources) {
  if (resources && Object.prototype.hasOwnProperty.call(resources, source)) {
    fail(`Large R3 payload must not be embedded in Tauri/NSIS resources: ${source}`);
  }
}

if (releaseConfig.bundle?.windows?.nsis?.installerHooks !== "./target/translateit-r3-payload-hooks.generated.nsh") {
  fail("Release NSIS config must use the build-generated R3 payload hook.");
}
if (existsSync(generatedHookPath)) {
  fail("Generated R3 NSIS hook is build evidence and must not be committed as source.");
}

requireMarkers(payloadBuilder, "R3 payload builder", [
  'SCHEMA = "translateit.r3.external_payload.v1"',
  'PAYLOAD_FILENAME = "TranslateIT-Payload.7z"',
  '"EngineData/Backend/LocalWorker/PythonRuntime"',
  '"EngineData/Backend/RuntimeAssets/ASR/ModelData"',
  '"EngineData/Backend/RuntimeAssets/Translation/ModelData"',
  '"EngineData/Backend/RuntimeAssets/Voice/GPTSoVITS"',
  '"EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/Package"',
  '"--format=7zip"',
  '"7zip:compression=lzma2,7zip:compression-level=9"',
  "sha256_file",
  "render_hook",
  "network_download\": False",
  "manual_extraction\": False",
  "second_installer\": False",
]);
forbidMarkers(payloadBuilder.toLowerCase(), "R3 payload builder network/bootstrap behavior", [
  "urllib",
  "requests.get",
  "invoke-webrequest",
  "start-bitstransfer",
  "http://",
  "https://",
]);

requireMarkers(hookTemplate, "R3 NSIS hook template", [
  "@@PAYLOAD_SCHEMA@@",
  "@@PAYLOAD_FILENAME@@",
  "@@PAYLOAD_SHA256@@",
  "@@INSTALLER_HELPER_SOURCE@@",
  "!macro NSIS_HOOK_PREINSTALL",
  "!macro NSIS_HOOK_POSTINSTALL",
  "$EXEDIR\\${TRANSLATEIT_R3_PAYLOAD_FILENAME}",
  "-Mode Verify",
  "-Mode Extract",
  "-InstallRoot \"$INSTDIR\"",
  "Abort",
]);
forbidMarkers(hookTemplate.toLowerCase(), "R3 NSIS hook network/manual installer behavior", [
  "inetc::",
  "nsisdl::",
  "http://",
  "https://",
  "execshell",
]);

requireMarkers(installerHelper, "R3 installer helper", [
  "Get-FileHash -Algorithm SHA256",
  "Get-Command tar.exe",
  "& $tar -tf $PayloadPath",
  "& $tar -xf $PayloadPath -C $InstallRoot",
  "LocalWorker\\PythonRuntime\\python.exe",
  "faster-whisper-large-v3-turbo\\.translateit_model_revision",
  "xiaomi-research--MiLMMT-46-1B-v1.0\\.translateit_model_revision",
  "TRANSLATEIT_GPTSOVITS_REVISION.txt",
  "VBCABLE_Setup_x64.exe",
]);
forbidMarkers(installerHelper.toLowerCase(), "R3 installer helper network/bootstrap behavior", [
  "invoke-webrequest",
  "start-bitstransfer",
  "webclient",
  "http://",
  "https://",
]);

requireMarkers(build, "R3 release build", [
  "build_r3_external_payload.py",
  "TranslateIT-Payload.7z",
  "TranslateIT-Setup.exe",
  "src-tauri\\target\\translateit-release",
  "translateit-r3-payload-hooks.generated.nsh",
  "npm run preflight:tauri-package",
  "--config src-tauri/tauri.release.conf.json",
  "R3 release directory must contain exactly Setup + Payload",
  "Remove-Item -LiteralPath $GeneratedHook",
]);

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

if (!entrypoint.includes('with_name("realtime_local_worker_base.py")')) fail("Worker entrypoint does not load canonical base.");
if (!entrypoint.includes("milmmt_translation_provider.install(globals())")) fail("Worker entrypoint does not install MiLMMT provider.");
if (base.includes("AutoModelForSeq2SeqLM") || base.toLowerCase().includes("m2m100")) fail("Worker base still contains legacy translation implementation.");
for (const marker of ["AutoModelForCausalLM", "milmmt-46-1b-v1.0", "4fc480b6c58dec29c159dcdf9fde0f6d5c354995", "do_sample=False"]) {
  if (!provider.includes(marker)) fail(`MiLMMT provider marker missing: ${marker}`);
}

const activeRelease = `${stage}\n${build}\n${payloadBuilder}\n${hookTemplate}\n${installerHelper}`.toLowerCase();
for (const marker of ["helsinki-nlp", "opus-mt-id-en", "opus-mt-en-id", "marianmt-id-en", "marianmt-en-id", "m2m100-418m"]) {
  if (activeRelease.includes(marker)) fail(`Legacy translation marker remains active in release path: ${marker}`);
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
console.log("[release-package] R3 source contract PASS: Setup carries only the small canonical control/runtime closure, the large offline runtime is a hashed colocated 7z/LZMA2 payload, and NSIS owns automatic validation/extraction without network or manual bootstrap.");
