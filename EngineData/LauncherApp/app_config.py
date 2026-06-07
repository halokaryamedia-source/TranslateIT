from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from EngineData.TranscriptEngine.audio_noise_filter import NoiseThresholds


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def default_voice_actor_profiles_root() -> str:
    return str(PROJECT_ROOT / "UserData" / "SavedData" / "CustomVoice")


@dataclass(frozen=True, slots=True)
class EngineConfig:
    app_name: str = "TranslateIT"
    language_focus_mode: str = "ID/EN Focus"
    use_custom_voice_actor: bool = True
    voice_actor_profile_id: str = "marcel"
    voice_actor_profiles_root: str = field(default_factory=default_voice_actor_profiles_root)
    primary_asr_model: str = "large-v3-turbo"
    backup_asr_model: str = "medium"
    device: str = "cuda"
    compute_type: str = "float16"
    source_language: str = "id"
    target_language: str = "en"
    asr_task: str = "transcribe"
    asr_initial_prompt: str = (
        "Live bilingual speech in Indonesian and English. "
        "Indonesian is the primary spoken language. "
        "Transcribe exactly what was spoken, not a paraphrase or translation. "
        "Preserve short Indonesian phrases, filler words, names of people and places. "
        "Keep natural code-switching, numbers, and simple conversational words. "
        "For very short Indonesian utterances, preserve the exact Indonesian words and do not rewrite them in English. "
        "Example: spoken 'halo coba berbicara' should be transcribed as 'halo coba berbicara'; spoken 'lagi' should be transcribed as 'lagi'; spoken 'terima kasih' should be transcribed as 'terima kasih'; spoken 'silakan' should be transcribed as 'silakan'. "
        "Common Indonesian phrases such as 'halo coba berbicara', 'coba bicara', 'lagi', 'terima kasih', and 'silakan' should stay Indonesian when spoken in Indonesian. "
        "Do not invent random words, extra context, or an English rewrite of Indonesian speech."
    )
    vad_preset: str = "Headset"
    noise_thresholds: NoiseThresholds = field(default_factory=NoiseThresholds)
    translation_engine_name: str = "local-nllb-distilled"
    translation_fallback_engine_name: str = "marianmt-id-en"
    tts_enabled: bool = False
    local_only_mode: bool = True
    cache_dir: Path = PROJECT_ROOT / "UserData" / "CacheData"
    saved_data_dir: Path = PROJECT_ROOT / "UserData" / "SavedData"
    asr_model_dir: Path = PROJECT_ROOT / "EngineData" / "TranscriptEngine" / "ModelData"
    translation_model_dir: Path = PROJECT_ROOT / "EngineData" / "TranslateEngine" / "ModelData"
    temperature: int = 0
    beam_size: int = 1
    condition_on_previous_text: bool = False
    vad_filter: bool = False
    word_timestamps: bool = False

    def cache_paths(self) -> dict[str, Path]:
        return {
            "cache_dir": self.cache_dir,
            "session_cache_dir": self.cache_dir / "session_cache",
            "audio_segments_dir": self.cache_dir / "audio_segments",
            "saved_data_dir": self.saved_data_dir,
            "saved_transcript_dir": self.saved_data_dir / "SavedTranscript",
            "asr_model_dir": self.asr_model_dir,
            "translation_model_dir": self.translation_model_dir,
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "app_name": self.app_name,
            "language_focus_mode": self.language_focus_mode,
            "use_custom_voice_actor": self.use_custom_voice_actor,
            "voice_actor_profile_id": self.voice_actor_profile_id,
            "voice_actor_profiles_root": self.voice_actor_profiles_root,
            "primary_asr_model": self.primary_asr_model,
            "backup_asr_model": self.backup_asr_model,
            "device": self.device,
            "compute_type": self.compute_type,
            "source_language": self.source_language,
            "target_language": self.target_language,
            "asr_task": self.asr_task,
            "asr_initial_prompt": self.asr_initial_prompt,
            "vad_preset": self.vad_preset,
            "noise_thresholds": asdict(self.noise_thresholds),
            "translation_engine_name": self.translation_engine_name,
            "translation_fallback_engine_name": self.translation_fallback_engine_name,
            "tts_enabled": self.tts_enabled,
            "local_only_mode": self.local_only_mode,
            "cache_dir": str(self.cache_dir),
            "saved_data_dir": str(self.saved_data_dir),
            "asr_model_dir": str(self.asr_model_dir),
            "translation_model_dir": str(self.translation_model_dir),
            "temperature": self.temperature,
            "beam_size": self.beam_size,
            "condition_on_previous_text": self.condition_on_previous_text,
            "vad_filter": self.vad_filter,
            "word_timestamps": self.word_timestamps,
        }


def load_default_config() -> EngineConfig:
    return EngineConfig()
