from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


_ALLOWED_CONFIDENCE = {"low", "medium", "high"}


@dataclass(slots=True)
class LanguageLLMQualityResult:
    corrected_translation: str
    glossary_notes: list[str] = field(default_factory=list)
    tone_note: str = ""
    confidence: str = "low"
    hot_path_allowed: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class LanguageLLMQualityResultParser:
    @staticmethod
    def parse(payload: dict[str, Any] | None) -> LanguageLLMQualityResult:
        data = payload or {}
        corrected_translation = str(data.get("corrected_translation", "") or "").strip()
        raw_glossary = data.get("glossary_notes", [])
        if isinstance(raw_glossary, list):
            glossary_notes = [str(item).strip() for item in raw_glossary if str(item).strip()]
        elif raw_glossary:
            glossary_notes = [str(raw_glossary).strip()]
        else:
            glossary_notes = []
        confidence = str(data.get("confidence", "low") or "low").strip().lower()
        if confidence not in _ALLOWED_CONFIDENCE:
            confidence = "low"
        return LanguageLLMQualityResult(
            corrected_translation=corrected_translation,
            glossary_notes=glossary_notes,
            tone_note=str(data.get("tone_note", "") or "").strip(),
            confidence=confidence,
            hot_path_allowed=False,
        )
