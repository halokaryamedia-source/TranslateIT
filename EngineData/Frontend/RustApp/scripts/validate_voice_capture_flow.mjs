import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");
const errors = [];

function readText(path) {
  const absolute = resolve(repoRoot, path);
  if (!existsSync(absolute)) {
    errors.push(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(absolute, "utf8");
}

function expectIncludes(content, marker, label) {
  if (!content.includes(marker)) errors.push(`${label}: missing ${marker}`);
}

const runtimeApi = readText("EngineData/Frontend/RustApp/src/app/bridge/runtime/runtimeApi.ts");
expectIncludes(runtimeApi, "prepareVoiceCapture", "runtime API");
expectIncludes(runtimeApi, "startHelperBridge", "runtime API");
expectIncludes(runtimeApi, "getInputStatus", "runtime API");
expectIncludes(runtimeApi, "getHelperBridgeStatus", "runtime API");
expectIncludes(runtimeApi, "startCapture", "runtime API");
expectIncludes(runtimeApi, "stopCapture", "runtime API");

const launcher = readText("EngineData/Frontend/RustApp/src/app/active-launcher/launcherController.ts");
expectIncludes(launcher, "prepareAndStartVoiceCapture", "launcher controller");
expectIncludes(launcher, "Checking microphone device...", "launcher controller");
expectIncludes(launcher, "Starting local helper...", "launcher controller");
expectIncludes(launcher, "Open Developer Diagnostics", "launcher controller");
expectIncludes(launcher, "Start Helper", "launcher controller");
expectIncludes(launcher, "Check Worker Status", "launcher controller");
expectIncludes(launcher, "Check Microphone", "launcher controller");
expectIncludes(launcher, "voiceCapturePrepPending", "launcher controller");

const shell = readText("EngineData/Frontend/RustApp/src/app/active-launcher/shell.ts");
expectIncludes(shell, "voiceCaptureActions", "shell UI");
expectIncludes(shell, "checkMicButton", "shell UI");
expectIncludes(shell, "startHelperButton", "shell UI");
expectIncludes(shell, "checkWorkerStatusButton", "shell UI");
expectIncludes(shell, "openDeveloperDiagnosticsButton", "shell UI");

const events = readText("EngineData/Frontend/RustApp/src/app/active-launcher/launcherEventBindings.ts");
expectIncludes(events, "prepareAndStartVoiceCapture", "event bindings");
expectIncludes(events, "startHelperBridge", "event bindings");
expectIncludes(events, "checkWorkerStatus", "event bindings");
expectIncludes(events, "openDeveloperDiagnostics", "event bindings");

const runtime = readText("EngineData/Frontend/RustApp/src-tauri/src/commands/runtime.rs");
expectIncludes(runtime, "prepare_voice_capture", "runtime command");
expectIncludes(runtime, "VoiceCapturePreparationReport", "runtime command");
expectIncludes(runtime, "auto_start", "runtime command");
expectIncludes(runtime, "Start Helper", "runtime command");
expectIncludes(runtime, "Check microphone device", "runtime command");
expectIncludes(runtime, "Open Developer Diagnostics", "runtime command");

const main = readText("EngineData/Frontend/RustApp/src-tauri/src/main.rs");
expectIncludes(main, "prepare_voice_capture", "Tauri invoke bridge");

const packageJson = readText("EngineData/Frontend/RustApp/package.json");
expectIncludes(packageJson, "\"validate:voice-capture\"", "package.json scripts");
expectIncludes(packageJson, "validate:auto", "package.json scripts");

if (errors.length > 0) {
  console.error("Voice capture validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Voice capture validation passed.");



