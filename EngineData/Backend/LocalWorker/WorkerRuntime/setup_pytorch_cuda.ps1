param(
    [switch]$Apply,
    [ValidateSet("cu121", "cu124", "cu126")]
    [string]$CudaIndex = "cu124"
)

$ErrorActionPreference = "Stop"

$WorkerRoot = $PSScriptRoot
$Venv = Join-Path $WorkerRoot ".venv"
$PythonExe = Join-Path $Venv "Scripts\python.exe"
$Pip = @($PythonExe, "-m", "pip")

function Fail([string]$Message, [int]$Code = 1) {
    Write-Host $Message
    exit $Code
}

if (-not (Test-Path $PythonExe)) {
    Fail "Worker venv missing. Run npm.cmd run setup:worker first." 2
}

function Get-TorchStatus {
    $code = @'
import json, shutil, sys
result = {
  "python_executable": sys.executable,
  "is_worker_venv": "WorkerRuntime\\.venv" in sys.executable.replace("/", "\\"),
  "torch_import_ready": False,
  "torch_version": None,
  "torch_cuda_available": False,
  "torch_cuda_version": None,
  "torch_cuda_device_count": 0,
  "torch_cuda_device_name": None,
  "nvidia_smi_available": bool(shutil.which("nvidia-smi")),
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
print(json.dumps(result))
'@
    $json = $code | & $PythonExe -
    return $json | ConvertFrom-Json
}

Write-Host "Checking worker Python and CUDA status"
$before = Get-TorchStatus
Write-Host ("Python: {0}" -f $before.python_executable)
Write-Host ("Worker venv: {0}" -f $before.is_worker_venv)
Write-Host ("Torch version: {0}" -f $before.torch_version)
Write-Host ("Torch CUDA available: {0}" -f $before.torch_cuda_available)
Write-Host ("Torch CUDA version: {0}" -f $before.torch_cuda_version)
Write-Host ("Torch CUDA device count: {0}" -f $before.torch_cuda_device_count)
Write-Host ("Torch CUDA device name: {0}" -f $before.torch_cuda_device_name)
Write-Host ("nvidia-smi available: {0}" -f $before.nvidia_smi_available)

if (-not $Apply) {
    if ($before.torch_cuda_available) {
        Write-Host "Torch CUDA is already enabled."
        exit 0
    }
    Write-Host "Dry run only. Use -Apply to reinstall PyTorch with CUDA wheels from the official PyTorch index."
    Write-Host ("Suggested index: https://download.pytorch.org/whl/{0}" -f $CudaIndex)
    exit 2
}

if ($before.torch_cuda_available) {
    Write-Host "Torch CUDA is already enabled; no reinstall needed."
    exit 0
}

Write-Host "Reinstalling PyTorch CUDA wheels from the official PyTorch index"
& $PythonExe -m pip uninstall -y torch torchvision torchaudio
if ($LASTEXITCODE -ne 0) {
    Fail "PyTorch uninstall failed." 1
}

$indexUrl = "https://download.pytorch.org/whl/$CudaIndex"
& $PythonExe -m pip install torch torchvision torchaudio --index-url $indexUrl
if ($LASTEXITCODE -ne 0) {
    Fail "PyTorch CUDA install failed from $indexUrl." 1
}

$after = Get-TorchStatus
Write-Host ("After install torch version: {0}" -f $after.torch_version)
Write-Host ("After install torch cuda available: {0}" -f $after.torch_cuda_available)
Write-Host ("After install torch cuda version: {0}" -f $after.torch_cuda_version)
Write-Host ("After install torch cuda device count: {0}" -f $after.torch_cuda_device_count)
Write-Host ("After install torch cuda device name: {0}" -f $after.torch_cuda_device_name)

if ($after.torch_cuda_available) {
    exit 0
}

Write-Host "PyTorch is installed, but CUDA is still unavailable. CPU fallback remains active."
exit 2
