from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Iterable, List


@dataclass(slots=True)
class TranslationContext:
    window_size: int = 3
    accepted_segments: Deque[str] = field(default_factory=deque)

    def push(self, text: str) -> None:
        if self.window_size <= 0:
            return
        text = text.strip()
        if not text:
            return
        self.accepted_segments.append(text)
        while len(self.accepted_segments) > self.window_size:
            self.accepted_segments.popleft()

    def extend(self, texts: Iterable[str]) -> None:
        for text in texts:
            self.push(text)

    def clear(self) -> None:
        self.accepted_segments.clear()

    def get_window(self) -> List[str]:
        return list(self.accepted_segments)

