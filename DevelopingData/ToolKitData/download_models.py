from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import os
from typing import Iterable

from huggingface_hub import snapshot_download


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_CACHE_ROOT = PROJECT_ROOT / "DevelopingData" / "ToolKitData" / "ModelCache"
TRANSCRIPT_MODEL_ROOT = PROJECT_ROOT / "EngineData" / "TranscriptEngine" / "ModelData"
TRANSLATE_MODEL_ROOT = PROJECT_ROOT / "EngineData" / "TranslateEngine" / "ModelData"
HF_HOME = MODEL_CACHE_ROOT / "HuggingFaceHome"


@dataclass(frozen=True, slots=True)
class ModelDownloadTarget:
    label: str
    repo_id: str
    root: Path
    local_folder: str


TARGETS: tuple[ModelDownloadTarget, ...] = (
    ModelDownloadTarget(
        label="Default ASR Faster-Whisper Large V3 Turbo",
        repo_id="deepdml/faster-whisper-large-v3-turbo-ct2",
        root=TRANSCRIPT_MODEL_ROOT,
        local_folder="faster-whisper-large-v3-turbo",
    ),
    ModelDownloadTarget(
        label="Backup ASR Faster-Whisper Medium",
        repo_id="Systran/faster-whisper-medium",
        root=TRANSCRIPT_MODEL_ROOT,
        local_folder="faster-whisper-medium",
    ),
    ModelDownloadTarget(
        label="Fallback Translation MarianMT Indonesian-English",
        repo_id="Helsinki-NLP/opus-mt-id-en",
        root=TRANSLATE_MODEL_ROOT,
        local_folder="marianmt-id-en",
    ),
    ModelDownloadTarget(
        label="Default Translation NLLB Distilled",
        repo_id="facebook/nllb-200-distilled-600M",
        root=TRANSLATE_MODEL_ROOT,
        local_folder="nllb-200-distilled-600M",
    ),
)


IGNORE_PATTERNS = (
    "*.h5",
    "*.msgpack",
    "*.onnx",
    "*.tflite",
    "rust_model.ot",
)


def download_target(target: ModelDownloadTarget) -> dict[str, str]:
    destination = target.root / target.local_folder
    destination.mkdir(parents=True, exist_ok=True)
    local_path = snapshot_download(
        repo_id=target.repo_id,
        local_dir=str(destination),
        cache_dir=str(HF_HOME / "hub"),
        ignore_patterns=IGNORE_PATTERNS,
    )
    return {
        "label": target.label,
        "repo_id": target.repo_id,
        "local_path": str(Path(local_path).resolve()),
        "status": "Downloaded",
    }


def main(targets: Iterable[ModelDownloadTarget] = TARGETS) -> int:
    os.environ.setdefault("HF_HOME", str(HF_HOME))
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    MODEL_CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, str]] = []
    for target in targets:
        try:
            results.append(download_target(target))
        except Exception as exc:
            results.append(
                {
                    "label": target.label,
                    "repo_id": target.repo_id,
                    "local_path": str((MODEL_CACHE_ROOT / target.local_folder).resolve()),
                    "status": "Failed",
                    "message": str(exc),
                }
            )
    manifest_path = MODEL_CACHE_ROOT / "MODEL_DOWNLOAD_MANIFEST.json"
    manifest_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    return 0 if all(result["status"] == "Downloaded" for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
