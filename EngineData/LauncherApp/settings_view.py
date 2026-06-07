from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field

from EngineData.LauncherApp.app_config import EngineConfig, default_voice_actor_profiles_root


@dataclass(slots=True)
class SettingsViewModel:
    language_focus_mode: str = "ID/EN Focus"
    use_custom_voice_actor: bool = True
    voice_actor_profile_id: str = "marcel"
    voice_actor_profiles_root: str = field(default_factory=default_voice_actor_profiles_root)
    microphone_device_name: str = ""
    source_language: str = "id"
    target_language: str = "en"
    asr_model_name: str = "large-v3-turbo"
    backup_model_name: str = "medium"
    vad_preset: str = "Headset"
    privacy_mode: str = "Local-only"
    cache_enabled: bool = True
    developer_mode: bool = False
    tts_enabled: bool = False
    beam_size: int = 3
    compute_type: str = "float16"
    raw_vad_threshold: float = 0.0
    log_probability: float = 0.0
    compression_ratio: float = 0.0
    model_path_internals: str = ""

    @classmethod
    def from_config(cls, config: EngineConfig) -> "SettingsViewModel":
        return cls(
            language_focus_mode=config.language_focus_mode,
            use_custom_voice_actor=config.use_custom_voice_actor,
            voice_actor_profile_id=config.voice_actor_profile_id,
            voice_actor_profiles_root=config.voice_actor_profiles_root,
            source_language=config.source_language,
            target_language=config.target_language,
            asr_model_name=config.primary_asr_model,
            backup_model_name=config.backup_asr_model,
            vad_preset=config.vad_preset,
            privacy_mode="Local-only" if config.local_only_mode else "Cloud-ready",
            cache_enabled=True,
            developer_mode=False,
            tts_enabled=config.tts_enabled,
            beam_size=config.beam_size,
            compute_type=config.compute_type,
        )
