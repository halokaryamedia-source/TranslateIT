from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import json
import shutil
from typing import Any, Iterable

from EngineData.TranscriptEngine.benchmark_metrics import (
    LatencyBenchmarkSummary,
    build_latency_benchmark_summary,
)
from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment


def _ensure_within_root(path: Path, root: Path) -> Path:
    resolved_path = path.resolve()
    resolved_root = root.resolve()
    if resolved_root not in resolved_path.parents and resolved_path != resolved_root:
        raise ValueError(f"Path {resolved_path} is outside allowed root {resolved_root}")
    return resolved_path


@dataclass(slots=True)
class TranscriptSession:
    session_id: str
    input_language: str = "id"
    output_language: str = "en"
    asr_model: str = "large-v3-turbo"
    translation_engine: str = "local-nllb-distilled"
    created_at_iso: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    segments: list[TranscriptSegment] = field(default_factory=list)
    cache_root: Path | None = None
    saved_root: Path | None = None

    def add_segment(self, segment: TranscriptSegment) -> None:
        self.segments.append(segment)

    @property
    def segment_count(self) -> int:
        return len(self.segments)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "input_language": self.input_language,
            "output_language": self.output_language,
            "asr_model": self.asr_model,
            "translation_engine": self.translation_engine,
            "created_at_iso": self.created_at_iso,
            "segments": [segment.to_dict() for segment in self.segments],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TranscriptSession":
        session = cls(
            session_id=str(data.get("session_id", "")),
            input_language=str(data.get("input_language", data.get("source_language", "id"))),
            output_language=str(data.get("output_language", data.get("target_language", "en"))),
            asr_model=str(data.get("asr_model", "large-v3-turbo")),
            translation_engine=str(data.get("translation_engine", "local-nllb-distilled")),
            created_at_iso=str(data.get("created_at_iso", datetime.now(timezone.utc).isoformat())),
        )
        segments = data.get("segments", [])
        if isinstance(segments, list):
            session.segments = [
                TranscriptSegment.from_dict(segment_data)
                for segment_data in segments
                if isinstance(segment_data, dict)
            ]
        return session

    def to_json(self, *, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    @classmethod
    def from_json(cls, text: str) -> "TranscriptSession":
        return cls.from_dict(json.loads(text))

    def save_json(self, path: Path, root: Path | None = None) -> Path:
        guard_root = root or self.saved_root
        if guard_root is None:
            raise ValueError("saved_root is required to save a transcript session")
        target = _ensure_within_root(path, guard_root)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(self.to_json(), encoding="utf-8")
        return target

    @classmethod
    def load_json(cls, path: Path) -> "TranscriptSession":
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls.from_dict(data)

    def cache_session_dir(self, cache_root: Path) -> Path:
        return _ensure_within_root(cache_root / "session_cache" / self.session_id, cache_root)

    def cache_audio_dir(self, cache_root: Path) -> Path:
        return _ensure_within_root(cache_root / "audio_segments", cache_root)

    def cache_session_json_path(self, cache_root: Path) -> Path:
        return self.cache_session_dir(cache_root) / f"{self.session_id}.json"

    def saved_session_dir(self, saved_root: Path) -> Path:
        return _ensure_within_root(saved_root / "SavedTranscript" / self.session_id, saved_root)

    def session_json_path(self, saved_root: Path) -> Path:
        return self.saved_session_dir(saved_root) / f"{self.session_id}.json"

    def save_to_cache_root(self, cache_root: Path | None = None) -> Path:
        root = cache_root or self.cache_root
        if root is None:
            raise ValueError("cache_root is required to cache a transcript session")
        return self.save_json(self.cache_session_json_path(root), root=root)

    def save_to_saved_root(self, saved_root: Path | None = None) -> Path:
        root = saved_root or self.saved_root
        if root is None:
            raise ValueError("saved_root is required to save a transcript session")
        return self.save_json(self.session_json_path(root), root=root)

    def save_bundle_to_saved_root(self, saved_root: Path | None = None, *, copy_audio: bool = True) -> Path:
        root = saved_root or self.saved_root
        if root is None:
            raise ValueError("saved_root is required to save a transcript session")
        saved_json = self.save_to_saved_root(root)
        if copy_audio:
            self.copy_replay_audio_to_saved(root)
        return saved_json

    def segment_audio_path(self, cache_root: Path, segment_id: str, suffix: str = ".wav") -> Path:
        return self.cache_audio_dir(cache_root) / f"{segment_id}{suffix}"

    def planned_cache_items(self, cache_root: Path) -> list[Path]:
        planned = [self.cache_session_json_path(cache_root)]
        for segment in self.segments:
            planned.append(self.segment_audio_path(cache_root, segment.segment_id))
        return planned

    def planned_clear_cache_items(self, cache_root: Path) -> list[Path]:
        cache_root = _ensure_within_root(cache_root, cache_root)
        if not cache_root.exists():
            return []
        return [path for path in cache_root.rglob("*") if path.is_file()]

    def planned_save_items(self, saved_root: Path) -> list[Path]:
        planned = [self.session_json_path(saved_root)]
        for segment in self.segments:
            if segment.source_audio_path:
                planned.append(self.saved_session_dir(saved_root) / "audio" / self._saved_audio_filename(segment.segment_id, segment.source_audio_path, "source"))
            if segment.translated_audio_path:
                planned.append(self.saved_session_dir(saved_root) / "audio" / self._saved_audio_filename(segment.segment_id, segment.translated_audio_path, "translated"))
        return planned

    def copy_replay_audio_to_saved(self, saved_root: Path) -> list[Path]:
        audio_dir = _ensure_within_root(self.saved_session_dir(saved_root) / "audio", saved_root)
        copied: list[Path] = []
        for segment in self.segments:
            for role, source_path in (("source", segment.source_audio_path), ("translated", segment.translated_audio_path)):
                if source_path is None:
                    continue
                resolved_source = Path(source_path)
                if not resolved_source.exists() or not resolved_source.is_file():
                    continue
                audio_dir.mkdir(parents=True, exist_ok=True)
                target = _ensure_within_root(audio_dir / self._saved_audio_filename(segment.segment_id, resolved_source, role), saved_root)
                shutil.copy2(resolved_source, target)
                copied.append(target)
        return copied

    @staticmethod
    def _saved_audio_filename(segment_id: str, source_path: Path, role: str) -> str:
        suffix = source_path.suffix or ".wav"
        return f"{segment_id}-{role}{suffix}"

    def benchmark_summary(self) -> LatencyBenchmarkSummary:
        return build_latency_benchmark_summary(self.segments)

    def benchmark_summary_dict(self) -> dict[str, object]:
        return self.benchmark_summary().to_dict()
