from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from EngineData.TranslateEngine.language_llm_session_patch_adapter import LanguageLLMSessionPatch


@dataclass(slots=True)
class LanguageLLMSessionPatchQueue:
    _items: list[LanguageLLMSessionPatch] = field(default_factory=list)

    def add(self, patch: LanguageLLMSessionPatch) -> None:
        self._items.append(patch)

    def drain(self) -> list[dict[str, Any]]:
        items = [item.to_dict() for item in self._items]
        self._items.clear()
        return items

    def peek(self) -> list[dict[str, Any]]:
        return [item.to_dict() for item in self._items]

    def count(self) -> int:
        return len(self._items)
