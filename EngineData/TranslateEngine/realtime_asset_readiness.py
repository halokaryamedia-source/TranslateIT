from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class RealtimeAssetCheck:
    name: str
    path: str
    ready: bool
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class RealtimeAssetReadiness:
    ready: bool
    checks: list[RealtimeAssetCheck]

    def to_dict(self) -> dict[str, Any]:
        return {
            "ready": self.ready,
            "checks": [item.to_dict() for item in self.checks],
        }


class RealtimeAssetReadinessChecker:
    """Validate local model asset layout before target PC validation."""

    def __init__(self, model_root: Path | str | None) -> None:
        self.model_root = Path(model_root) if model_root is not None else None

    def check(self) -> RealtimeAssetReadiness:
        checks = [
            self._check_dir("model_root", self.model_root),
            self._check_fast_mt("fast_mt_id_en", "ctranslate2-marianmt-id-en"),
            self._check_fast_mt("fast_mt_en_id", "ctranslate2-marianmt-en-id"),
            self._check_piper_dir(),
        ]
        return RealtimeAssetReadiness(
            ready=all(item.ready for item in checks),
            checks=checks,
        )

    def _check_dir(self, name: str, path: Path | None) -> RealtimeAssetCheck:
        if path is None:
            return RealtimeAssetCheck(name, "", False, "path not configured")
        return RealtimeAssetCheck(name, str(path), path.exists() and path.is_dir(), "ready" if path.exists() and path.is_dir() else "directory missing")

    def _check_fast_mt(self, name: str, folder: str) -> RealtimeAssetCheck:
        if self.model_root is None:
            return RealtimeAssetCheck(name, "", False, "model root not configured")
        path = self.model_root / folder
        ready = (path / "model.bin").exists() and (path / "config.json").exists()
        return RealtimeAssetCheck(name, str(path), ready, "ready" if ready else "model.bin or config.json missing")

    def _check_piper_dir(self) -> RealtimeAssetCheck:
        if self.model_root is None:
            return RealtimeAssetCheck("piper", "", False, "model root not configured")
        path = self.model_root / "piper"
        ready = path.exists() and any(path.glob("*.onnx"))
        return RealtimeAssetCheck("piper", str(path), ready, "ready" if ready else "voice model missing")
