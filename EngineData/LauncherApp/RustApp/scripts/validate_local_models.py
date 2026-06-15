from __future__ import annotations

import gc
import importlib.metadata
import json
import os
import platform
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def find_repository_root() -> Path:
    start = Path(__file__).resolve()
    for candidate in [start.parent, *start.parents]:
        if all((candidate / name).is_dir() for name in ("EngineData", "DevelopingData", "UserData")):
            return candidate
    raise RuntimeError("repository_root_not_found")


ROOT = find_repository_root()
APP_ROOT = ROOT / "EngineData" / "LauncherApp" / "RustApp"
HF_HOME = ROOT / "DevelopingData" / "ToolKitData" / "ModelCache" / "HuggingFaceHome"
MANIFEST_PATH = APP_ROOT / "MODEL_RUNTIME_MANIFEST.json"
VALIDATION_PATH = APP_ROOT / "MODEL_VALIDATION_REPORT.json"

ASR_PRIMARY = ROOT / "EngineData" / "TranscriptEngine" / "ModelData" / "faster-whisper-large-v3-turbo"
ASR_BACKUP = ROOT / "EngineData" / "TranscriptEngine" / "ModelData" / "faster-whisper-medium"
TRANSLATION_PRIMARY = ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "nllb-200-distilled-600M"
TRANSLATION_FALLBACK = ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "marianmt-id-en"

os.environ["HF_HOME"] = str(HF_HOME)
os.environ["TRANSFORMERS_CACHE"] = str(HF_HOME)
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def relative(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def package_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def matches(path: Path, patterns: tuple[str, ...]) -> list[str]:
    found: list[str] = []
    if not path.is_dir():
        return found
    for pattern in patterns:
        found.extend(item.relative_to(path).as_posix() for item in path.glob(pattern) if item.is_file())
    return sorted(set(found))


def marker_check(path: Path, groups: tuple[tuple[str, ...], ...]) -> dict[str, Any]:
    details = []
    complete = path.is_dir()
    for alternatives in groups:
        found = matches(path, alternatives)
        ok = bool(found)
        complete = complete and ok
        details.append({"alternatives": list(alternatives), "found": found, "ok": ok})
    return {"path_exists": path.is_dir(), "complete": complete, "groups": details}


ASR_GROUPS = (("model.bin",), ("config.json",), ("tokenizer.json", "tokenizer.model", "vocabulary.json"))
NLLB_GROUPS = (
    ("config.json",),
    ("tokenizer_config.json",),
    ("sentencepiece.bpe.model", "tokenizer.json", "spiece.model"),
    ("*.safetensors", "pytorch_model*.bin"),
)
MARIAN_GROUPS = (
    ("config.json",),
    ("source.spm", "tokenizer.json", "spiece.model"),
    ("target.spm", "tokenizer.json", "spiece.model"),
    ("*.safetensors", "pytorch_model*.bin"),
)


def load_asr(path: Path, device: str, compute_type: str) -> dict[str, Any]:
    started = utc_now()
    result: dict[str, Any] = {
        "path": relative(path),
        "device": device,
        "compute_type": compute_type,
        "started_at": started,
    }
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(str(path), device=device, compute_type=compute_type)
        result.update({"ready": True, "result": "PASS", "notes": "WhisperModel loaded successfully."})
        del model
        gc.collect()
    except Exception as exc:
        result.update(
            {
                "ready": False,
                "result": "FAIL",
                "error_type": type(exc).__name__,
                "error": str(exc),
            }
        )
    result["finished_at"] = utc_now()
    return result


def load_translation(path: Path, kind: str) -> dict[str, Any]:
    result: dict[str, Any] = {"path": relative(path), "input": "halo coba berbicara", "started_at": utc_now()}
    tokenizer: Any = None
    model: Any = None
    try:
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

        tokenizer_kwargs: dict[str, Any] = {"local_files_only": True}
        if kind == "nllb":
            tokenizer_kwargs["src_lang"] = "ind_Latn"
        tokenizer = AutoTokenizer.from_pretrained(str(path), **tokenizer_kwargs)
        model = AutoModelForSeq2SeqLM.from_pretrained(str(path), local_files_only=True)
        model.eval()
        encoded = tokenizer(result["input"], return_tensors="pt", truncation=True, max_length=128)
        generate_kwargs: dict[str, Any] = {"max_new_tokens": 32, "num_beams": 1}
        if kind == "nllb":
            target_id = tokenizer.convert_tokens_to_ids("eng_Latn")
            if isinstance(target_id, int) and target_id >= 0:
                generate_kwargs["forced_bos_token_id"] = target_id
        with torch.inference_mode():
            output = model.generate(**encoded, **generate_kwargs)
        translated = tokenizer.batch_decode(output, skip_special_tokens=True)[0].strip()
        ready = bool(translated)
        result.update(
            {
                "ready": ready,
                "result": "PASS" if ready else "FAIL",
                "output": translated,
                "device": "cpu",
                "notes": "Local tokenizer/model load and one short generation completed." if ready else "Model returned empty output.",
            }
        )
    except Exception as exc:
        result.update(
            {
                "ready": False,
                "result": "FAIL",
                "error_type": type(exc).__name__,
                "error": str(exc),
            }
        )
    finally:
        del model
        del tokenizer
        gc.collect()
    result["finished_at"] = utc_now()
    return result


def powershell_json(command: str) -> Any:
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or f"powershell_exit_{completed.returncode}")
    output = completed.stdout.strip()
    return json.loads(output) if output else None


def validate_sapi() -> dict[str, Any]:
    if platform.system().lower() != "windows":
        return {"ready": False, "result": "FAIL", "voices": [], "error": "windows_sapi_not_available"}
    command = (
        "$voice = New-Object -ComObject SAPI.SpVoice; "
        "$names = @($voice.GetVoices() | ForEach-Object { $_.GetDescription() }); "
        "@{ready=($names.Count -gt 0); voices=$names} | ConvertTo-Json -Compress"
    )
    try:
        data = powershell_json(command)
        return {
            "ready": bool(data.get("ready")),
            "result": "PASS" if data.get("ready") else "FAIL",
            "voices": data.get("voices", []),
            "provider": "Windows SAPI",
        }
    except Exception as exc:
        return {
            "ready": False,
            "result": "FAIL",
            "voices": [],
            "error_type": type(exc).__name__,
            "error": str(exc),
        }


def scan_marcel_assets() -> dict[str, Any]:
    matches_found: list[str] = []
    onnx_candidates: list[Path] = []
    scan_roots = [ROOT / "UserData", ROOT / "EngineData"]
    ignored_names = {"node_modules", "target", "dist", ".git", ".cache"}

    for scan_root in scan_roots:
        if not scan_root.is_dir():
            continue
        for current, dirs, files in os.walk(scan_root):
            dirs[:] = [name for name in dirs if name not in ignored_names]
            current_path = Path(current)
            current_has_marcel = "marcel" in current_path.name.lower()
            if current_has_marcel:
                matches_found.append(relative(current_path))
            for filename in files:
                file_path = current_path / filename
                filename_lower = filename.lower()
                if "marcel" in filename_lower or current_has_marcel:
                    matches_found.append(relative(file_path))
                    if file_path.suffix.lower() == ".onnx":
                        onnx_candidates.append(file_path)

    unique_matches = sorted(set(matches_found))
    result: dict[str, Any] = {
        "ready": False,
        "result": "MISSING",
        "matches": unique_matches,
        "voice_actor_path": None,
        "providers_available": [],
        "blockers": ["voice_actor_marcel_missing"],
    }
    if not onnx_candidates:
        return result

    candidate = onnx_candidates[0]
    result["voice_actor_path"] = relative(candidate)
    try:
        import onnxruntime as ort

        providers = ort.get_available_providers()
        session = ort.InferenceSession(str(candidate), providers=providers)
        result.update(
            {
                "ready": True,
                "result": "PASS",
                "providers_available": providers,
                "inputs": [item.name for item in session.get_inputs()],
                "outputs": [item.name for item in session.get_outputs()],
                "blockers": [],
            }
        )
    except Exception as exc:
        result.update(
            {
                "result": "FAIL",
                "error_type": type(exc).__name__,
                "error": str(exc),
                "blockers": ["voice_actor_marcel_model_invalid"],
            }
        )
    return result


def nvidia_smi_summary() -> dict[str, Any]:
    try:
        completed = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,driver_version,memory.total",
                "--format=csv,noheader,nounits",
            ],
            text=True,
            capture_output=True,
            timeout=15,
            check=False,
        )
        if completed.returncode == 0 and completed.stdout.strip():
            return {"available": True, "summary": completed.stdout.strip().splitlines()}
        return {"available": False, "error": completed.stderr.strip()}
    except Exception as exc:
        return {"available": False, "error": str(exc)}


def main() -> int:
    generated_at = utc_now()
    markers = {
        "asr_primary": marker_check(ASR_PRIMARY, ASR_GROUPS),
        "asr_backup": marker_check(ASR_BACKUP, ASR_GROUPS),
        "translation_primary": marker_check(TRANSLATION_PRIMARY, NLLB_GROUPS),
        "translation_fallback": marker_check(TRANSLATION_FALLBACK, MARIAN_GROUPS),
    }

    imports = {
        name: package_version(name)
        for name in (
            "faster-whisper",
            "ctranslate2",
            "transformers",
            "torch",
            "onnxruntime",
            "sentencepiece",
            "sacremoses",
            "safetensors",
        )
    }
    try:
        import torch

        torch_cuda_available = bool(torch.cuda.is_available())
        torch_version = str(torch.__version__)
    except Exception:
        torch_cuda_available = False
        torch_version = None

    asr_cuda = (
        load_asr(ASR_PRIMARY, "cuda", "int8_float16")
        if markers["asr_primary"]["complete"]
        else {"ready": False, "result": "FAIL", "error": "asr_primary_markers_incomplete"}
    )
    asr_primary = (
        load_asr(ASR_PRIMARY, "cpu", "int8")
        if markers["asr_primary"]["complete"]
        else {"ready": False, "result": "FAIL", "error": "asr_primary_markers_incomplete"}
    )
    asr_backup = (
        load_asr(ASR_BACKUP, "cpu", "int8")
        if markers["asr_backup"]["complete"]
        else {"ready": False, "result": "FAIL", "error": "asr_backup_markers_incomplete"}
    )
    translation_primary = (
        load_translation(TRANSLATION_PRIMARY, "nllb")
        if markers["translation_primary"]["complete"]
        else {"ready": False, "result": "FAIL", "error": "translation_primary_markers_incomplete"}
    )
    translation_fallback = (
        load_translation(TRANSLATION_FALLBACK, "marian")
        if markers["translation_fallback"]["complete"]
        else {"ready": False, "result": "FAIL", "error": "translation_fallback_markers_incomplete"}
    )
    sapi = validate_sapi()
    marcel = scan_marcel_assets()

    blockers: list[str] = []
    if not asr_primary.get("ready"):
        blockers.append("asr_primary_load_failed")
    if not asr_backup.get("ready"):
        blockers.append("asr_backup_load_failed")
    if not asr_cuda.get("ready"):
        blockers.append("asr_cuda_unavailable")
    if not torch_cuda_available:
        blockers.append("torch_cuda_unavailable_for_translation")
    if not translation_primary.get("ready"):
        blockers.append("translation_primary_load_failed")
    if not translation_fallback.get("ready"):
        blockers.append("translation_fallback_load_failed")
    if not sapi.get("ready"):
        blockers.append("tts_default_sapi_unavailable")
    blockers.extend(marcel.get("blockers", []))
    blockers = list(dict.fromkeys(blockers))

    ready_for_internal_test = all(
        (
            asr_primary.get("ready"),
            asr_backup.get("ready"),
            translation_primary.get("ready"),
            translation_fallback.get("ready"),
            sapi.get("ready"),
        )
    )
    ready_for_full_runtime = bool(
        ready_for_internal_test
        and asr_cuda.get("ready")
        and torch_cuda_available
        and marcel.get("ready")
    )

    manifest = {
        "schema_version": 1,
        "generated_at": generated_at,
        "model_root_strategy": "project-local",
        "asr": {
            "primary": {
                "id": "large-v3-turbo",
                "repo": "dropbox-dash/faster-whisper-large-v3-turbo",
                "preferred_repo": "Systran/faster-whisper-large-v3-turbo",
                "path": relative(ASR_PRIMARY),
                "ready": bool(asr_primary.get("ready")),
                "backend": "faster-whisper",
                "device_preference": "cuda",
                "required_markers": ["model.bin", "config.json", "tokenizer files"],
            },
            "backup": {
                "id": "medium",
                "repo": "Systran/faster-whisper-medium",
                "path": relative(ASR_BACKUP),
                "ready": bool(asr_backup.get("ready")),
                "backend": "faster-whisper",
                "device_preference": "cpu",
                "required_markers": ["model.bin", "config.json", "tokenizer files"],
            },
        },
        "translation": {
            "primary": {
                "id": "local-nllb-distilled",
                "repo": "facebook/nllb-200-distilled-600M",
                "path": relative(TRANSLATION_PRIMARY),
                "ready": bool(translation_primary.get("ready")),
            },
            "fallback": {
                "id": "marianmt-id-en",
                "repo": "Helsinki-NLP/opus-mt-id-en",
                "path": relative(TRANSLATION_FALLBACK),
                "ready": bool(translation_fallback.get("ready")),
            },
        },
        "tts": {
            "default_sapi_ready": bool(sapi.get("ready")),
            "default_sapi_voices": sapi.get("voices", []),
            "voice_actor_profile_id": "marcel",
            "voice_actor_ready": bool(marcel.get("ready")),
            "voice_actor_path": marcel.get("voice_actor_path"),
            "providers_available": marcel.get("providers_available", []),
            "blockers": marcel.get("blockers", []),
        },
        "cuda": {
            "torch_cuda_available": torch_cuda_available,
            "ctranslate2_cuda_available": bool(asr_cuda.get("ready")),
            "notes": [
                f"torch_version={torch_version}",
                (
                    "CTranslate2 CUDA model load passed."
                    if asr_cuda.get("ready")
                    else f"CTranslate2 CUDA model load failed: {asr_cuda.get('error', 'unknown error')}"
                ),
            ],
        },
        "overall": {
            "ready_for_internal_test": ready_for_internal_test,
            "ready_for_full_runtime": ready_for_full_runtime,
            "blockers": blockers,
        },
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    validation = {
        "schema_version": 1,
        "generated_at": generated_at,
        "environment": {
            "os": platform.platform(),
            "python": sys.version,
            "python_executable": sys.executable,
            "packages": imports,
            "gpu": nvidia_smi_summary(),
            "torch_cuda_available": torch_cuda_available,
        },
        "markers": markers,
        "asr": {
            "primary_cpu_load": asr_primary,
            "backup_cpu_load": asr_backup,
            "primary_cuda_load": asr_cuda,
        },
        "translation": {
            "primary": translation_primary,
            "fallback": translation_fallback,
        },
        "tts": {"sapi": sapi, "marcel": marcel},
        "overall": manifest["overall"],
        "runtime_manifest_path": relative(MANIFEST_PATH),
    }
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2), encoding="utf-8")
    print(json.dumps(manifest["overall"], indent=2))
    print(f"[manifest] {MANIFEST_PATH}")
    print(f"[validation] {VALIDATION_PATH}")
    return 0 if ready_for_internal_test else 1


if __name__ == "__main__":
    raise SystemExit(main())
