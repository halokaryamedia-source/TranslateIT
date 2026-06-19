import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "..", "..", "..");
const controllerPath = path.join(root, "EngineData", "Frontend", "RustApp", "src", "app", "launcher", "launcherController.ts");
const tracePath = path.join(root, "EngineData", "Frontend", "RustApp", "src", "app", "launcher", "userFlowTrace.ts");

const controller = fs.readFileSync(controllerPath, "utf8");
const trace = fs.readFileSync(tracePath, "utf8");
const bindings = fs.readFileSync(path.join(root, "EngineData", "Frontend", "RustApp", "src", "app", "launcher", "launcherEventBindings.ts"), "utf8");

const requiredEvents = [
  "app.boot",
  "startup.complete",
  "home.visible",
  "settings.click",
  "settings.opened",
  "settings.tab.general",
  "settings.tab.audio",
  "settings.tab.translate",
  "settings.tab.developer",
  "settings.back",
  "text.input.focus",
  "text.submit",
  "text.translation.result",
  "mic.click",
  "mic.device_check.start",
  "mic.device_check.result",
  "helper.status.check",
  "helper.start.request",
  "helper.start.result",
  "worker.status.result",
  "model.inventory.result",
  "voice.capture.prepare",
  "voice.capture.blocked",
  "voice.capture.started",
  "voice.capture.stopped",
  "asr.result",
  "translation.voice.result",
  "tts.result",
  "error.user_visible",
];

const missing = requiredEvents.filter((event) => {
  if (event === "text.input.focus") return !bindings.includes('traceUserFlow("text.input.focus"');
  return !controller.includes(event) && !trace.includes(event);
});
const ok = missing.length === 0 && trace.includes("export function traceUserFlow") && trace.includes("clearUserFlowTrace");
const report = {
  ok,
  status: ok ? "PASS" : "FAIL",
  missing,
  note: ok ? "User-flow trace markers found in launcher controller and trace module." : "Missing trace events.",
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = ok ? 0 : 1;
