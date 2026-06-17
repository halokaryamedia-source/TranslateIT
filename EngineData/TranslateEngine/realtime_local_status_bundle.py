from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from DevelopingData.Patches.realtime_hook_status import get_realtime_hook_status
from EngineData.TranslateEngine.language_llm_readiness import LanguageLLMReadinessChecker
from EngineData.TranslateEngine.realtime_asset_readiness import RealtimeAssetReadinessChecker
from EngineData.TranslateEngine.realtime_latency_sample_gate import RealtimeLatencySample
from EngineData.TranslateEngine.realtime_release_gate import RealtimeReleaseGate
from EngineData.TranslateEngine.realtime_validation_runner import RealtimeValidationRunner


@dataclass(slots=True)
class RealtimeLocalStatusBundle:
    ready: bool
    hook: dict[str, Any]
    assets: dict[str, Any]
    language_llm: dict[str, Any]
    validation: dict[str, Any]
    release: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RealtimeLocalStatusBundleBuilder:
    def __init__(self, model_root: Path | str | None = None, *, target_pc_validated: bool = False, latency_samples: list[RealtimeLatencySample] | None = None) -> None:
        self.model_root = model_root
        self.target_pc_validated = target_pc_validated
        self.latency_samples = list(latency_samples or [])

    def build(self) -> RealtimeLocalStatusBundle:
        hook_status = get_realtime_hook_status().to_dict()
        asset_status = RealtimeAssetReadinessChecker(model_root=self.model_root).check().to_dict()
        language_llm_status = LanguageLLMReadinessChecker(model_root=self.model_root).check().to_dict()
        validation_status = RealtimeValidationRunner(model_root=self.model_root).run().payload
        release_status = RealtimeReleaseGate(model_root=self.model_root, target_pc_validated=self.target_pc_validated, latency_samples=self.latency_samples).evaluate().to_dict()
        return RealtimeLocalStatusBundle(
            ready=bool(release_status.get("ready", False)),
            hook=hook_status,
            assets=asset_status,
            language_llm=language_llm_status,
            validation=validation_status,
            release=release_status,
        )
