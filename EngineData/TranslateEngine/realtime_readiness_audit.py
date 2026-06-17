from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from EngineData.TranscriptEngine.asr_model_loader import ASRModelLoader
from EngineData.TranslateEngine.ctranslate2_mt_backend import CTranslate2MTBackend
from EngineData.TranslateEngine.piper_tts_backend import PiperTTSBackend
from EngineData.TranslateEngine.realtime_latency_budget import RealtimeLatencyBudgetMonitor


@dataclass(slots=True)
class RealtimeReadinessItem:
    name: str
    status: str
    required_for_realtime: bool
    message: str


@dataclass(slots=True)
class RealtimeReadinessAudit:
    status: str
    percent_ready: int
    items: tuple[RealtimeReadinessItem, ...]
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "percent_ready": self.percent_ready,
            "items": [asdict(item) for item in self.items],
            "notes": self.notes,
        }


class RealtimeReadinessAuditor:
    """Audit realtime readiness without starting capture or playback."""

    def __init__(self, model_root: Path | None = None) -> None:
        self.model_root = model_root
        self.asr_loader = ASRModelLoader(model_root=model_root)
        self.fast_mt = CTranslate2MTBackend(model_root=model_root)
        self.tts = PiperTTSBackend(model_root=model_root)
        self.latency = RealtimeLatencyBudgetMonitor()

    def audit(self, *, source_language: str = "id", target_language: str = "en") -> RealtimeReadinessAudit:
        items: list[RealtimeReadinessItem] = []
        asr_dependency = self.asr_loader.dependency_status()
        items.append(RealtimeReadinessItem("Streaming STT dependency", "PASS" if asr_dependency == "available" else "BLOCKED", True, "faster_whisper dependency is available." if asr_dependency == "available" else f"ASR dependency status: {asr_dependency}"))
        fast_engine = "fast-mt-id-en" if source_language.lower().startswith("id") else "fast-mt-en-id"
        fast_mt_status = self.fast_mt.dependency_status(fast_engine)
        items.append(RealtimeReadinessItem("Fast MT backend", "PASS" if fast_mt_status.available else "BLOCKED", True, fast_mt_status.message))
        tts_status = self.tts.dependency_status(language=target_language)
        items.append(RealtimeReadinessItem("Local TTS readiness", "PASS" if tts_status.available else "BLOCKED", True, tts_status.message))
        budget = self.latency.empty_report()
        items.append(RealtimeReadinessItem("Latency budget contract", "PASS" if budget.target_total_ms <= 1250 else "WARNING", True, f"Target budget is {budget.target_total_ms} ms."))
        required_items = [item for item in items if item.required_for_realtime]
        passed_required = [item for item in required_items if item.status == "PASS"]
        percent_ready = int(round((len(passed_required) / max(1, len(required_items))) * 100))
        if percent_ready == 100:
            status = "READY_FOR_REAL_DEVICE_VALIDATION"
            notes = "All required readiness checks passed. Real microphone/GPU/audio validation is still required."
        elif percent_ready >= 50:
            status = "PARTIAL_READY"
            notes = "Some required realtime checks are blocked. Do not claim realtime mode is fully ready."
        else:
            status = "BLOCKED"
            notes = "Core realtime dependencies are missing. Use fallback mode only."
        return RealtimeReadinessAudit(status=status, percent_ready=percent_ready, items=tuple(items), notes=notes)
