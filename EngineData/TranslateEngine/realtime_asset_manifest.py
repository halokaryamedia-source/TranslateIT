from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class RealtimeAssetRequirement:
    key: str
    folder: str
    required_files: tuple[str, ...]
    purpose: str

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["required_files"] = list(self.required_files)
        return payload


REALTIME_ASSET_REQUIREMENTS: tuple[RealtimeAssetRequirement, ...] = (
    RealtimeAssetRequirement(
        key="fast_mt_id_en",
        folder="ctranslate2-marianmt-id-en",
        required_files=("model.bin", "config.json"),
        purpose="Indonesian to English fast local translation",
    ),
    RealtimeAssetRequirement(
        key="fast_mt_en_id",
        folder="ctranslate2-marianmt-en-id",
        required_files=("model.bin", "config.json"),
        purpose="English to Indonesian fast local translation",
    ),
    RealtimeAssetRequirement(
        key="local_voice",
        folder="piper",
        required_files=("*.onnx",),
        purpose="Local target-language voice model",
    ),
)


def realtime_asset_manifest() -> list[dict[str, Any]]:
    return [item.to_dict() for item in REALTIME_ASSET_REQUIREMENTS]
