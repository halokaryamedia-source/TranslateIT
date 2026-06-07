from __future__ import annotations

from dataclasses import dataclass
import importlib.util
from pathlib import Path
from typing import Iterable

from EngineData.LauncherApp.app_config import PROJECT_ROOT, load_default_config
from EngineData.LauncherApp.app_logger import write_json_report, write_text_report
from EngineData.LauncherApp.cuda_validation import CUDA_CORE_PASS, validate_cuda


REQUIRED_IMPORTS = [
    "PySide6",
    "sounddevice",
    "numpy",
    "torch",
    "faster_whisper",
    "transformers",
    "sentencepiece",
    "sacremoses",
]


REQUIRED_FOLDERS = [
    "DevelopingData",
    "EngineData",
    "UserData",
    "EngineData/LauncherApp",
    "EngineData/TranscriptEngine",
    "EngineData/TranslateEngine",
    "EngineData/TranscriptEngine/ModelData",
    "EngineData/TranslateEngine/ModelData",
]


@dataclass(frozen=True, slots=True)
class ValidationItem:
    level: str
    name: str
    message: str

    def line(self) -> str:
        return f"{self.level}: {self.name} - {self.message}"


def _check_cuda() -> ValidationItem:
    cuda = validate_cuda(write_reports=True)
    if cuda.core_status == CUDA_CORE_PASS:
        return ValidationItem(
            "PASS",
            "CUDA Core App",
            f"{cuda.gpu_name}; torch {cuda.torch_version}; Active ASR target device: cuda; Preferred compute type: float16; CUDA tensor PASS",
        )
    message = cuda.blocker or "CUDA Core App readiness failed"
    if cuda.torch_imported and cuda.torch_cuda_build is None:
        message = (
            "PyTorch CPU-only build detected. Run TranslateIT.bat option 4 and type YES "
            "to reinstall CUDA-enabled PyTorch wheels."
        )
    return ValidationItem("FAIL", "CUDA Core App", message)


def build_validation_items() -> list[ValidationItem]:
    config = load_default_config()
    items: list[ValidationItem] = []
    runtime_python = PROJECT_ROOT / "DevelopingData" / "ToolKitData" / "rt" / "Scripts" / "python.exe"
    items.append(
        ValidationItem(
            "PASS" if runtime_python.exists() else "FAIL",
            "Runtime Python",
            str(runtime_python) if runtime_python.exists() else "missing; run TranslateIT.bat option 2 first",
        )
    )
    for folder in REQUIRED_FOLDERS:
        path = PROJECT_ROOT / folder
        items.append(ValidationItem("PASS" if path.exists() else "FAIL", folder, "found" if path.exists() else "missing"))
    for module_name in REQUIRED_IMPORTS:
        found = importlib.util.find_spec(module_name) is not None
        items.append(ValidationItem("PASS" if found else "FAIL", f"import {module_name}", "available" if found else "missing"))
    items.append(_check_cuda())
    cuda = validate_cuda(write_reports=False)
    items.extend(
        [
            ValidationItem(cuda.core_status, "CUDA classification", cuda.blocker or "CUDA Core ready"),
            ValidationItem(
                "PASS" if cuda.nvidia_smi_found else "FAIL",
                "nvidia-smi",
                f"{cuda.gpu_name}; driver {cuda.driver_version}; CUDA {cuda.nvidia_smi_cuda_version}",
            ),
            ValidationItem(
                "PASS" if cuda.torch_tensor_execution else "FAIL",
                "torch CUDA tensor execution",
                f"torch {cuda.torch_version}; torch.version.cuda={cuda.torch_cuda_build}; available={cuda.torch_cuda_available}",
            ),
            ValidationItem(
                "WARN" if cuda.cpu_degraded_available and cuda.core_status != CUDA_CORE_PASS else "PASS",
                "CPU degraded mode",
                "available but not target Core App performance"
                if cuda.core_status != CUDA_CORE_PASS
                else "not needed because CUDA Core passed",
            ),
        ]
    )
    primary_asr = config.asr_model_dir / "faster-whisper-large-v3-turbo" / "model.bin"
    backup_asr = config.asr_model_dir / "faster-whisper-medium" / "model.bin"
    primary_translation = config.translation_model_dir / "nllb-200-distilled-600M" / "config.json"
    backup_translation = config.translation_model_dir / "marianmt-id-en" / "config.json"
    items.append(ValidationItem("PASS" if primary_asr.exists() else "WARN", "ASR primary model", str(primary_asr)))
    items.append(ValidationItem("PASS" if backup_asr.exists() else "WARN", "ASR backup model", str(backup_asr)))
    items.append(
        ValidationItem("PASS" if primary_translation.exists() else "WARN", "Translation primary model", str(primary_translation))
    )
    items.append(
        ValidationItem("PASS" if backup_translation.exists() else "WARN", "Translation backup model", str(backup_translation))
    )
    try:
        from EngineData.LauncherApp.app_main import create_runtime

        runtime = create_runtime(config)
        items.append(ValidationItem("PASS", "Launcher import", f"session {runtime.session.session_id}"))
    except Exception as exc:
        items.append(ValidationItem("FAIL", "Launcher import", str(exc)))
    return items


def validation_exit_code(items: Iterable[ValidationItem]) -> int:
    return 1 if any(item.level in {"FAIL", "CUDA_CORE_FAIL"} for item in items) else 0


def run_validation() -> int:
    items = build_validation_items()
    lines = [item.line() for item in items]
    path = write_text_report("runtime_validation_latest.txt", lines)
    write_json_report(
        "runtime_validation_latest.json",
        {
            "items": [
                {"level": item.level, "name": item.name, "message": item.message}
                for item in items
            ],
            "exit_code": validation_exit_code(items),
        },
    )
    for line in lines:
        print(line)
    print(f"PASS: Validation report - {path}")
    return validation_exit_code(items)


if __name__ == "__main__":
    raise SystemExit(run_validation())
