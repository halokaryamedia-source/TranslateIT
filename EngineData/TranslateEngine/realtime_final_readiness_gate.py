from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from DevelopingData.Patches.realtime_hook_status import get_realtime_hook_status
from EngineData.TranslateEngine.realtime_validation_runner import RealtimeValidationRunner


@dataclass(slots=True)
class RealtimeFinalGateResult:
    ready: bool
    hook_ready: bool
    assets_ready: bool
    validation_status: str
    percent_ready: int
    target_pc_validated: bool
    blockers: list[str]
    payload: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimeFinalReadinessGate:
    """Final gate before TranslateIT realtime mode is presented as ready."""

    def __init__(self, model_root: Path | str | None = None, *, target_pc_validated: bool = False) -> None:
        self.model_root = Path(model_root) if model_root is not None else None
        self.target_pc_validated = target_pc_validated

    def evaluate(self) -> RealtimeFinalGateResult:
        hook_status = get_realtime_hook_status()
        validation = RealtimeValidationRunner(model_root=self.model_root).run()
        asset_payload = validation.payload.get("asset_readiness", {})
        assets_ready = bool(asset_payload.get("ready", False)) if isinstance(asset_payload, dict) else False
        blockers: list[str] = []
        if not hook_status.already_applied:
            blockers.append("app hook not applied")
        if not assets_ready:
            blockers.append("local assets not ready")
        if not self.target_pc_validated:
            blockers.append("target PC validation not complete")
        ready = not blockers and validation.percent_ready >= 100
        return RealtimeFinalGateResult(
            ready=ready,
            hook_ready=hook_status.already_applied,
            assets_ready=assets_ready,
            validation_status=validation.status,
            percent_ready=validation.percent_ready,
            target_pc_validated=self.target_pc_validated,
            blockers=blockers,
            payload={"hook_status": hook_status.to_dict(), "validation": validation.payload},
        )
