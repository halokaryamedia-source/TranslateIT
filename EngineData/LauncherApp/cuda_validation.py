from __future__ import annotations

from dataclasses import dataclass, field
import json
import re
import shutil
import subprocess
import os
from typing import Any

from EngineData.LauncherApp.app_logger import write_json_report, write_text_report


CUDA_CORE_PASS = "CUDA_CORE_PASS"
CUDA_CORE_FAIL = "CUDA_CORE_FAIL"
CUDA_CORE_WARN = "CUDA_CORE_WARN"
CPU_DEGRADED_AVAILABLE = "CPU_DEGRADED_AVAILABLE"


@dataclass(slots=True)
class CudaValidationResult:
    core_status: str = CUDA_CORE_FAIL
    nvidia_smi_found: bool = False
    nvidia_smi_path: str = ""
    nvidia_smi_raw: str = ""
    driver_version: str = ""
    nvidia_smi_cuda_version: str = ""
    gpu_name: str = ""
    gpu_memory_total_mb: str = ""
    nvcc_found: bool = False
    nvcc_version: str = ""
    torch_imported: bool = False
    torch_version: str = ""
    torch_cuda_build: str | None = None
    torch_cuda_available: bool = False
    torch_cuda_device_count: int = 0
    torch_cuda_device_name: str = ""
    torch_tensor_execution: bool = False
    torch_tensor_error: str = ""
    faster_whisper_imported: bool = False
    ctranslate2_imported: bool = False
    ctranslate2_cuda_device_count: int | None = None
    ctranslate2_supported_compute_types_cuda: list[str] = field(default_factory=list)
    ctranslate2_message: str = ""
    cpu_degraded_available: bool = False
    preferred_device: str = "cuda"
    preferred_compute_type: str = "float16"
    blocker: str = ""
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "core_status": self.core_status,
            "nvidia_smi_found": self.nvidia_smi_found,
            "nvidia_smi_path": self.nvidia_smi_path,
            "driver_version": self.driver_version,
            "nvidia_smi_cuda_version": self.nvidia_smi_cuda_version,
            "gpu_name": self.gpu_name,
            "gpu_memory_total_mb": self.gpu_memory_total_mb,
            "nvcc_found": self.nvcc_found,
            "nvcc_version": self.nvcc_version,
            "torch_imported": self.torch_imported,
            "torch_version": self.torch_version,
            "torch_cuda_build": self.torch_cuda_build,
            "torch_cuda_available": self.torch_cuda_available,
            "torch_cuda_device_count": self.torch_cuda_device_count,
            "torch_cuda_device_name": self.torch_cuda_device_name,
            "torch_tensor_execution": self.torch_tensor_execution,
            "torch_tensor_error": self.torch_tensor_error,
            "faster_whisper_imported": self.faster_whisper_imported,
            "ctranslate2_imported": self.ctranslate2_imported,
            "ctranslate2_cuda_device_count": self.ctranslate2_cuda_device_count,
            "ctranslate2_supported_compute_types_cuda": self.ctranslate2_supported_compute_types_cuda,
            "ctranslate2_message": self.ctranslate2_message,
            "cpu_degraded_available": self.cpu_degraded_available,
            "preferred_device": self.preferred_device,
            "preferred_compute_type": self.preferred_compute_type,
            "blocker": self.blocker,
            "notes": self.notes,
        }

    def to_lines(self) -> list[str]:
        lines = [
            f"{self.core_status}: CUDA Core App readiness",
            f"nvidia-smi: {'found' if self.nvidia_smi_found else 'missing'} {self.nvidia_smi_path}",
            f"GPU: {self.gpu_name or 'not detected'}",
            f"Driver version: {self.driver_version or 'not detected'}",
            f"nvidia-smi CUDA version: {self.nvidia_smi_cuda_version or 'not detected'}",
            f"GPU memory: {self.gpu_memory_total_mb or 'not detected'} MB",
            f"nvcc: {'found' if self.nvcc_found else 'missing'} {self.nvcc_version}",
            f"torch version: {self.torch_version or 'not importable'}",
            f"torch CUDA build: {self.torch_cuda_build}",
            f"torch.cuda.is_available: {self.torch_cuda_available}",
            f"torch CUDA device count: {self.torch_cuda_device_count}",
            f"torch CUDA device name: {self.torch_cuda_device_name or 'not available'}",
            f"CUDA tensor execution: {self.torch_tensor_execution}",
            f"Faster-Whisper import: {self.faster_whisper_imported}",
            f"CTranslate2 import: {self.ctranslate2_imported}",
            f"CTranslate2 CUDA devices: {self.ctranslate2_cuda_device_count}",
            f"CTranslate2 CUDA compute types: {', '.join(self.ctranslate2_supported_compute_types_cuda)}",
            f"CPU degraded available: {self.cpu_degraded_available}",
            f"Preferred ASR policy: {self.preferred_device}/{self.preferred_compute_type}",
        ]
        if self.blocker:
            lines.append(f"BLOCKER: {self.blocker}")
        lines.extend(f"NOTE: {note}" for note in self.notes)
        if self.torch_tensor_error:
            lines.append(f"CUDA tensor error: {self.torch_tensor_error}")
        return lines


def _run_command(command: list[str], timeout: int = 20) -> tuple[bool, str]:
    try:
        startupinfo = None
        creationflags = 0
        if os.name == "nt":
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE
            creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            startupinfo=startupinfo,
            creationflags=creationflags,
        )
        output = (completed.stdout or "") + (completed.stderr or "")
        return completed.returncode == 0, output.strip()
    except Exception as exc:
        return False, str(exc)


def _parse_nvidia_smi(raw: str, result: CudaValidationResult) -> None:
    driver_match = re.search(r"Driver Version:\s*([0-9.]+)", raw)
    cuda_match = re.search(r"CUDA Version:\s*([0-9.]+)", raw)
    if driver_match:
        result.driver_version = driver_match.group(1)
    if cuda_match:
        result.nvidia_smi_cuda_version = cuda_match.group(1)


def _query_gpu_details(result: CudaValidationResult) -> None:
    ok, output = _run_command(
        [
            "nvidia-smi",
            "--query-gpu=name,driver_version,memory.total",
            "--format=csv,noheader,nounits",
        ]
    )
    if ok and output:
        first_line = output.splitlines()[0]
        parts = [part.strip() for part in first_line.split(",")]
        if len(parts) >= 3:
            result.gpu_name = parts[0]
            result.driver_version = result.driver_version or parts[1]
            result.gpu_memory_total_mb = parts[2]


def _check_torch(result: CudaValidationResult) -> None:
    try:
        import torch

        result.torch_imported = True
        result.torch_version = str(torch.__version__)
        result.torch_cuda_build = torch.version.cuda
        result.torch_cuda_available = bool(torch.cuda.is_available())
        result.torch_cuda_device_count = int(torch.cuda.device_count())
        if result.torch_cuda_available and result.torch_cuda_device_count > 0:
            result.torch_cuda_device_name = str(torch.cuda.get_device_name(0))
            try:
                x = torch.rand((128, 128), device="cuda")
                y = x @ x
                _ = float(y[0, 0].detach().cpu())
                torch.cuda.synchronize()
                result.torch_tensor_execution = True
            except Exception as exc:
                result.torch_tensor_execution = False
                result.torch_tensor_error = str(exc)
    except Exception as exc:
        result.torch_imported = False
        result.torch_tensor_error = str(exc)


def _check_ctranslate2(result: CudaValidationResult) -> None:
    try:
        import faster_whisper  # noqa: F401

        result.faster_whisper_imported = True
    except Exception:
        result.faster_whisper_imported = False
    try:
        import ctranslate2

        result.ctranslate2_imported = True
        if hasattr(ctranslate2, "get_cuda_device_count"):
            result.ctranslate2_cuda_device_count = int(ctranslate2.get_cuda_device_count())
        if hasattr(ctranslate2, "get_supported_compute_types"):
            try:
                result.ctranslate2_supported_compute_types_cuda = list(
                    ctranslate2.get_supported_compute_types("cuda")
                )
            except Exception as exc:
                result.ctranslate2_message = f"CUDA compute type query failed: {exc}"
        if not result.ctranslate2_message:
            result.ctranslate2_message = "CTranslate2 capability query completed."
    except Exception as exc:
        result.ctranslate2_imported = False
        result.ctranslate2_message = str(exc)


def validate_cuda(write_reports: bool = True) -> CudaValidationResult:
    result = CudaValidationResult()
    smi_path = shutil.which("nvidia-smi")
    result.nvidia_smi_found = smi_path is not None
    result.nvidia_smi_path = smi_path or ""
    if result.nvidia_smi_found:
        ok, output = _run_command(["nvidia-smi"])
        result.nvidia_smi_raw = output
        if ok:
            _parse_nvidia_smi(output, result)
            _query_gpu_details(result)
        else:
            result.notes.append(f"nvidia-smi execution failed: {output}")
    nvcc_path = shutil.which("nvcc")
    result.nvcc_found = nvcc_path is not None
    if result.nvcc_found:
        _ok, output = _run_command(["nvcc", "--version"])
        result.nvcc_version = output
    else:
        result.notes.append("PyTorch CUDA runtime can work without system CUDA Toolkit unless compiling CUDA code.")
    _check_torch(result)
    _check_ctranslate2(result)
    result.cpu_degraded_available = result.torch_imported
    if not result.nvidia_smi_found:
        result.core_status = CUDA_CORE_FAIL
        result.blocker = "NVIDIA driver or nvidia-smi not detected. Install or update NVIDIA driver first."
    elif not result.torch_imported:
        result.core_status = CUDA_CORE_FAIL
        result.blocker = "PyTorch is not importable in the project runtime."
    elif result.torch_cuda_build is None:
        result.core_status = CUDA_CORE_FAIL
        result.blocker = "PyTorch is CPU-only. Install a CUDA-enabled PyTorch wheel."
    elif not result.torch_cuda_available:
        result.core_status = CUDA_CORE_FAIL
        result.blocker = "torch.cuda.is_available() is false."
    elif result.torch_cuda_device_count <= 0:
        result.core_status = CUDA_CORE_FAIL
        result.blocker = "PyTorch reports zero CUDA devices."
    elif not result.torch_tensor_execution:
        result.core_status = CUDA_CORE_FAIL
        result.blocker = "CUDA tensor execution failed."
    else:
        result.core_status = CUDA_CORE_PASS
        result.preferred_device = "cuda"
        result.preferred_compute_type = "float16"
        result.notes.append("CUDA tensor execution succeeded. Core App CUDA readiness passed.")
    if result.core_status != CUDA_CORE_PASS:
        result.preferred_device = "cpu"
        result.preferred_compute_type = "int8"
        if result.cpu_degraded_available:
            result.notes.append("CPU_DEGRADED_AVAILABLE: real ASR can run only with explicit degraded-mode approval.")
    if write_reports:
        write_json_report("cuda_validation_latest.json", result.to_dict())
        write_text_report("cuda_validation_latest.txt", result.to_lines())
    return result


def run_cuda_validation() -> int:
    result = validate_cuda(write_reports=True)
    for line in result.to_lines():
        print(line)
    return 0 if result.core_status == CUDA_CORE_PASS else 1


if __name__ == "__main__":
    raise SystemExit(run_cuda_validation())
