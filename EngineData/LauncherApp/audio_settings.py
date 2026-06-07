from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
import json

from EngineData.LauncherApp.app_config import PROJECT_ROOT


SETTINGS_PATH = PROJECT_ROOT / "UserData" / "CacheData" / "audio_settings.json"
DEFAULT_VOICE_ACTOR_PROFILES_ROOT = r"D:\Work\AI Stuff\TranslateIT-ISSUED\DevelopingPack\UserData\SavedData\profiles\default\voices"


@dataclass(slots=True)
class AudioSettings:
    input_device_id: int | None = None
    output_device_id: int | None = None
    input_sensitivity: str = "Headset"
    show_advanced_devices: bool = False
    allow_low_but_usable_input: bool = True
    auto_play_out_voice: bool = True
    use_custom_voice_actor: bool = True
    voice_actor_profile_id: str = "marcel"
    voice_actor_profiles_root: str = DEFAULT_VOICE_ACTOR_PROFILES_ROOT

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


def load_audio_settings(path: Path = SETTINGS_PATH) -> AudioSettings:
    if not path.exists():
        return AudioSettings()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return AudioSettings()
    def _sanitize_root(value: object) -> str:
        text = str(value or "").strip()
        if not text or text.startswith("<member ") or "AudioSettings' objects>" in text:
            return DEFAULT_VOICE_ACTOR_PROFILES_ROOT
        return text

    raw_use_custom_voice_actor = data.get("use_custom_voice_actor", None)
    settings = AudioSettings(
        input_device_id=data.get("input_device_id") if isinstance(data.get("input_device_id"), int) else None,
        output_device_id=data.get("output_device_id") if isinstance(data.get("output_device_id"), int) else None,
        input_sensitivity="Headset",
        show_advanced_devices=False,
        allow_low_but_usable_input=True,
        auto_play_out_voice=True,
        use_custom_voice_actor=bool(raw_use_custom_voice_actor) if isinstance(raw_use_custom_voice_actor, bool) else True,
        voice_actor_profile_id=str(data.get("voice_actor_profile_id", "") or ""),
        voice_actor_profiles_root=_sanitize_root(data.get("voice_actor_profiles_root", DEFAULT_VOICE_ACTOR_PROFILES_ROOT)),
    )
    root = Path(settings.voice_actor_profiles_root)
    if not settings.voice_actor_profile_id and root.exists():
        marcel_manifest = root / "marcel" / "voice_actor.json"
        marcel_pack = root / "marcel" / "speaker_pack.json"
        if marcel_manifest.exists() or marcel_pack.exists():
            settings.use_custom_voice_actor = True
            settings.voice_actor_profile_id = "marcel"
    settings.use_custom_voice_actor = bool(settings.voice_actor_profile_id.strip())
    return settings


def save_audio_settings(settings: AudioSettings, path: Path = SETTINGS_PATH) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(settings.to_dict(), indent=2), encoding="utf-8")
    return path
