import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ensureDir, exists, repoRootFromCwd } from "./model_paths.mjs";

const root = repoRootFromCwd();
const reportPath = path.join(root, "UserData", "CacheData", "validation", "latest_gpu_runtime_check.json");
const workerRoot = path.join(root, "EngineData", "Backend", "LocalWorker", "WorkerRuntime");
const workerPython = path.join(workerRoot, ".venv", "Scripts", "python.exe");

function writeReport(report) {
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

function runPython(code) {
  if (!exists(workerPython)) {
    return {
      exit_code: 2,
      stdout: "",
      stderr: "worker_venv_missing",
    };
  }
  const completed = spawnSync(workerPython, ["-c", code], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  return {
    exit_code: completed.status ?? 1,
    stdout: (completed.stdout || "").trim(),
    stderr: (completed.stderr || "").trim(),
  };
}

function main() {
  const py = runPython(`
import json, platform, shutil
result = {
  "python_version": platform.python_version(),
  "python_executable": __import__("sys").executable,
  "is_worker_venv": "WorkerRuntime\\\\.venv" in __import__("sys").executable.replace("/", "\\\\"),
  "torch_import_ready": False,
  "torch_version": None,
  "torch_cuda_available": False,
  "torch_cuda_version": None,
  "torch_cuda_device_count": 0,
  "torch_cuda_device_name": None,
  "ctranslate2_import_ready": False,
  "ctranslate2_cuda_available": False,
  "nvidia_smi_available": bool(shutil.which("nvidia-smi")),
  "selected_asr_device": "cpu",
  "selected_translation_device": "cpu",
  "selected_compute_type": "int8",
  "fallback_reason": "cuda_unavailable",
  "translation_gpu_ready": False,
}
try:
  import torch
  result["torch_import_ready"] = True
  result["torch_version"] = torch.__version__
  result["torch_cuda_available"] = bool(torch.cuda.is_available())
  result["torch_cuda_version"] = getattr(torch.version, "cuda", None)
  result["torch_cuda_device_count"] = int(torch.cuda.device_count()) if result["torch_cuda_available"] else 0
  if result["torch_cuda_available"]:
    try:
      result["torch_cuda_device_name"] = torch.cuda.get_device_name(0)
    except Exception as exc:
      result["torch_cuda_device_name"] = f"{type(exc).__name__}:{exc}"
except Exception as exc:
  result["torch_import_error"] = f"{type(exc).__name__}:{exc}"
try:
  import ctranslate2
  result["ctranslate2_import_ready"] = True
  probe = getattr(ctranslate2, "get_cuda_device_count", None)
  if callable(probe):
    result["ctranslate2_cuda_available"] = bool(probe() > 0)
except Exception as exc:
  result["ctranslate2_import_error"] = f"{type(exc).__name__}:{exc}"
if result["ctranslate2_cuda_available"]:
  result["selected_asr_device"] = "cuda"
  result["selected_compute_type"] = "int8_float16"
  result["fallback_reason"] = ""
if result["torch_cuda_available"]:
  result["selected_translation_device"] = "cuda"
  result["translation_gpu_ready"] = True
print(json.dumps(result))
`);
  const payload = py.stdout ? JSON.parse(py.stdout) : {};
  const ok = Boolean(payload.torch_import_ready && payload.ctranslate2_import_ready && payload.is_worker_venv);
  const report = {
    ok,
    stage: "gpu_runtime_check",
    worker_root: path.relative(root, workerRoot).replaceAll("\\", "/"),
    python: payload,
    note: !payload.is_worker_venv
      ? "gpu_check:not_using_worker_venv"
      : payload.selected_asr_device === "cuda"
        ? "CUDA is available and preferred for primary runtime."
        : "CPU fallback is active because CUDA is unavailable on this machine.",
  };
  writeReport(report);
  process.exit(!payload.is_worker_venv ? 1 : ok ? 0 : 2);
}

main();
