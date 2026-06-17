from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


MARKERS: dict[str, str] = {
    "queue_import": "from EngineData.TranslateEngine.language_llm_session_patch_queue import LanguageLLMSessionPatchQueue",
    "queue_field": "language_llm_session_patch_queue: LanguageLLMSessionPatchQueue = field(default_factory=LanguageLLMSessionPatchQueue)",
    "runtime_class": "class PrototypeRuntime:",
}


@dataclass(slots=True)
class LanguageLLMRuntimeQueueHookVerification:
    ready: bool
    present: dict[str, bool]
    missing: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def verify_hook(app_main_path: Path) -> LanguageLLMRuntimeQueueHookVerification:
    text = app_main_path.read_text(encoding="utf-8")
    present = {key: marker in text for key, marker in MARKERS.items()}
    missing = [key for key, value in present.items() if not value]
    return LanguageLLMRuntimeQueueHookVerification(
        ready=not missing,
        present=present,
        missing=missing,
    )


if __name__ == "__main__":
    result = verify_hook(Path("EngineData/LauncherApp/app_main.py"))
    print(result.to_dict())
