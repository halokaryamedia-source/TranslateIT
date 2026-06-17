from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from EngineData.TranslateEngine.realtime_asset_manifest import realtime_asset_manifest


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
    manifest: list[dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "ready": self.ready,
            "checks": [item.to_dict() for item in self.checks],
            "manifest": list(self.manifest or []),
        }


class RealtimeAssetReadinessChecker:
    def __init__(self, model_root: Path | str | None) -> None:
        self.model_root = Path(model_root) if model_root is not None else None

    def check(self) -> RealtimeAssetReadiness:
        checks = [
            self._check_dir("model_root", self.model_root),
            self._check_pair("fast_mt_id_en", "ctranslate2-marianmt-id-en"),
            self._check_pair("fast_mt_en_id", "ctranslate2-marianmt-en-id"),
            self._check_pattern("piper", "piper", "*.onnx"),
        ]
        return RealtimeAssetReadiness(
            ready=all(item.ready for item in checks),
            checks=checks,
            manifest=realtime_asset_manifest(),
        )

    def _check_dir(self, name: str, path: Path | None) -> RealtimeAssetCheck:
        if path is None:
            return RealtimeAssetCheck(name, "", False, "path not configured")
        ready = path.exists() and path.is_dir()
        return RealtimeAssetCheck(name, str(path), ready, "ready" if ready else "directory not found")

    def _check_pair(self, name: str, folder: str) -> RealtimeAssetCheck:
        if self.model_root is None:
            return RealtimeAssetCheck(name, "", False, "model root not configured")
        path = self.model_root / folder
        ready = (path / "model.bin").exists() and (path / "config.json").exists()
        return RealtimeAssetCheck(name, str(path), ready, "ready" if ready else "required files not found")

    def _check_pattern(self, name: str, folder: str, pattern: str) -> RealtimeAssetCheck:
        if self.model_root is None:
            return RealtimeAssetCheck(name, "", False, "model root not configured")
        path = self.model_root / folder
        ready = path.exists() and any(path.glob(pattern))
        return RealtimeAssetCheck(name, str(path), ready, "ready" if ready else "required file pattern not found")
