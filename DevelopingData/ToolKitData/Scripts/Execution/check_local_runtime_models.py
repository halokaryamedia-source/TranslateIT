from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
MODEL_TARGETS = {
    "asr_faster_whisper_large_v3_turbo": {
        "path": ROOT / "EngineData" / "TranscriptEngine" / "ModelData" / "faster-whisper-large-v3-turbo",
        "required_files": ["model.bin"],
    },
    "translation_marianmt_id_en": {
        "path": ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "marianmt-id-en",
        "required_files": ["config.json"],
    },
    "translation_nllb_200_distilled_600m": {
        "path": ROOT / "EngineData" / "TranslateEngine" / "ModelData" / "nllb-200-distilled-600M",
        "required_files": ["config.json"],
    },
    "voice_piper": {
        "path": ROOT / "EngineData" / "VoiceEngine" / "Piper",
        "required_files": ["piper.exe"],
        "requires_glob": "**/*.onnx",
    },
}


def inspect_target(name: str, spec: dict) -> dict:
    path: Path = spec["path"]
    missing: list[str] = []
    for required in spec.get("required_files", []):
        if not (path / required).exists():
            missing.append(required)
    glob_pattern = spec.get("requires_glob")
    glob_ok = True
    if glob_pattern:
        glob_ok = path.exists() and any(path.glob(glob_pattern))
        if not glob_ok:
            missing.append(glob_pattern)
    return {
        "name": name,
        "path": str(path.relative_to(ROOT)).replace("\\", "/"),
        "exists": path.exists(),
        "ready": path.exists() and not missing,
        "missing": missing,
    }


def main() -> int:
    targets = [inspect_target(name, spec) for name, spec in MODEL_TARGETS.items()]
    ready = all(target["ready"] for target in targets)
    payload = {
        "schema": "translateit.local_runtime_model_readiness.v1",
        "ok": ready,
        "targets": targets,
        "blockers": [f"{target['name']}:{','.join(target['missing'])}" for target in targets if not target["ready"]],
        "note": "Local realtime translation can run only when all local model and Piper voice targets are ready.",
    }
    print(json.dumps(payload, indent=2))
    return 0 if ready else 1


if __name__ == "__main__":
    raise SystemExit(main())
