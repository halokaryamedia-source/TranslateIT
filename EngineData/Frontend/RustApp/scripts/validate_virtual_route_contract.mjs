import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  meeting: resolve(root, "src-tauri/src/commands/meeting_session.rs"),
  route: resolve(root, "src-tauri/src/commands/virtual_mic_route.rs"),
  routeRuntime: resolve(root, "src-tauri/src/commands/virtual_audio_route_runtime.rs"),
  commandsMod: resolve(root, "src-tauri/src/commands/mod.rs"),
  registry: resolve(root, "src-tauri/src/commands/registry.rs"),
  provider: resolve(root, "../../Backend/LocalWorker/WorkerRuntime/virtual_audio_route_provider.py"),
};

const source = {};
for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) throw new Error(`Missing ${name}: ${path}`);
  source[name] = readFileSync(path, "utf8");
}

function requireMarkers(body, label, markers) {
  for (const marker of markers) if (!body.includes(marker)) throw new Error(`${label} marker missing: ${marker}`);
}
function forbidMarkers(body, label, markers) {
  for (const marker of markers) if (body.includes(marker)) throw new Error(`${label} forbidden marker found: ${marker}`);
}

requireMarkers(source.commandsMod, "internal route modules", [
  "pub mod virtual_audio_route_runtime;",
  "pub mod virtual_mic_route;",
]);
requireMarkers(source.meeting, "Meeting route ownership", [
  "get_virtual_mic_route_contract_status",
  "meeting_route_execution_guard_status",
  "dispatch_meeting_virtual_audio_route_provider",
  "cancel_meeting_virtual_audio_route_provider",
]);
requireMarkers(source.route, "Meeting microphone contract", ["get_virtual_mic_route_contract_status"]);
requireMarkers(source.routeRuntime, "guarded Meeting output runtime", [
  "meeting_route_execution_guard_status",
  "dispatch_meeting_virtual_audio_route_provider",
  "cancel_meeting_virtual_audio_route_provider",
]);
requireMarkers(source.provider, "route provider", ["route_virtual_audio", "sounddevice"]);

// Route internals stay behind the Meeting owner. The frontend registry is not a manual
// route laboratory and professional-readiness orchestration is retired.
forbidMarkers(source.registry, "production route surface", [
  "get_virtual_mic_route_contract_status",
  "set_preferred_virtual_mic_route_devices",
  "prepare_virtual_mic_output_route_runtime_stub",
  "prepare_guarded_virtual_audio_route_runtime",
  "dispatch_guarded_virtual_audio_route_provider",
  "professional_readiness",
]);
forbidMarkers(source.commandsMod, "retired route orchestration", ["pub mod professional_readiness_gate;"]);

console.log("[virtual-route] Meeting Microphone route remains an internal Meeting dependency; retired manual/professional route commands are not exposed.");
