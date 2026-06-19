import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(currentDir, "..");

const files = {
  directVoice: resolve(appRoot, "src", "app", "active-launcher", "directVoiceCaptureBinding.ts"),
  realtimeStatus: resolve(appRoot, "src", "app", "active-launcher", "realtimeStatusPayloadRefresh.ts"),
  settingsViews: resolve(appRoot, "src", "app", "active-launcher", "settingsViews.ts"),
};

const missing = Object.entries(files).filter(([, path]) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing runtime UX file(s): ${missing.map(([name]) => name).join(", ")}`);
  process.exit(1);
}

const directVoice = readFileSync(files.directVoice, "utf8");
for (const marker of ["push-to-talk", "Ctrl+Space", "VOICE_CAPTURE_MODE_KEY", "MutationObserver", "startCapture", "stopCapture"]) {
  if (!directVoice.includes(marker)) {
    console.error(`Direct voice capture binding is missing marker: ${marker}`);
    process.exit(1);
  }
}

const realtimeStatus = readFileSync(files.realtimeStatus, "utf8");
for (const marker of ["latencyLabel", "gpuLabel", "getGpuPolicy", "qualityStatus", "gpuStatus"]) {
  if (!realtimeStatus.includes(marker)) {
    console.error(`Realtime status refresh is missing marker: ${marker}`);
    process.exit(1);
  }
}

const settingsViews = readFileSync(files.settingsViews, "utf8");
for (const marker of ["data-voice-capture-mode", "Push to Talk", "Click Toggle", "No placeholder buttons", "GPU policy", "Latency"]) {
  if (!settingsViews.includes(marker)) {
    console.error(`Settings view is missing runtime-backed UX marker: ${marker}`);
    process.exit(1);
  }
}

console.log("Runtime UX depth integrity passed.");
