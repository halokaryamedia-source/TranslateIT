from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


MARKERS: dict[str, str] = {
    "bridge_import": "from EngineData.TranscriptEngine.language_llm_session_persistence_bridge import LanguageLLMSessionPersistenceBridge",
    "queue_lookup": "language_llm_session_patch_queue",
    "bridge_call": "LanguageLLMSessionPersistenceBridge.apply_patches",
    "cache_call": "self.runtime.cache_current_session()",
}


@dataclass(slots=True)
class LanguageLLMSessionBridgeHookVerification:
    ready: bool
    present: dict[str, bool]
    missing: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def verify_hook(app_main_path: Path) -> LanguageLLMSessionBridgeHookVerification:
    text = app_main_path.read_text(encoding="utf-8")
    present = {key: marker in text for key, marker in MARKERS.items()}
    missing = [key for key, value in present.items() if not value]
    return LanguageLLMSessionBridgeHookVerification(
        ready=not missing,
        present=present,
        missing=missing,
    )


if __name__ == "__main__":
    result = verify_hook(Path("EngineData/LauncherApp/app_main.py"))
    print(result.to_dict())
