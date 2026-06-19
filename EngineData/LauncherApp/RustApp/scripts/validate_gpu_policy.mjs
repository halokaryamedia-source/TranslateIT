import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "..", "..", "..");
const runtimePath = path.join(root, "EngineData", "LauncherApp", "RustApp", "src-tauri", "src", "commands", "runtime.rs");
const backendValidationPath = path.join(root, "EngineData", "LauncherApp", "RustApp", "src-tauri", "src", "engine", "inference", "backend_validation.rs");
const manifestPath = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime", "model_manifest.json");

const runtime = fs.readFileSync(runtimePath, "utf8");
const backendValidation = fs.readFileSync(backendValidationPath, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const ok = runtime.includes("get_gpu_policy") &&
  runtime.includes("NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate()") &&
  backendValidation.includes("CPU_DEGRADED_AVAILABLE") &&
  manifest.backend_policy?.gpu_primary === true &&
  manifest.backend_policy?.cpu_fallback_allowed === true;

const report = {
  ok,
  status: ok ? "PASS" : "FAIL",
  gpu_primary: manifest.backend_policy?.gpu_primary === true,
  cpu_fallback_allowed: manifest.backend_policy?.cpu_fallback_allowed === true,
  note: ok ? "GPU primary and CPU fallback policy markers are present." : "GPU policy markers are incomplete.",
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = ok ? 0 : 1;
