from __future__ import annotations

from pathlib import Path

IMPORT_LINE = "from EngineData.TranslateEngine.language_llm_session_patch_queue import LanguageLLMSessionPatchQueue\n"
IMPORT_ANCHOR = "from EngineData.TranslateEngine.tts_placeholder import TTSPlaceholder, TTSRequest\n"
FIELD_ANCHOR = "    replay: ReplayController = field(default_factory=ReplayController)\n"
FIELD_LINE = "    language_llm_session_patch_queue: LanguageLLMSessionPatchQueue = field(default_factory=LanguageLLMSessionPatchQueue)\n"


def apply_patch(app_main_path: Path) -> bool:
    text = app_main_path.read_text(encoding="utf-8")
    changed = False

    if IMPORT_LINE not in text:
        if IMPORT_ANCHOR not in text:
            raise RuntimeError("TTSPlaceholder import anchor not found")
        text = text.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORT_LINE, 1)
        changed = True

    if FIELD_LINE not in text:
        if FIELD_ANCHOR not in text:
            raise RuntimeError("PrototypeRuntime replay field anchor not found")
        text = text.replace(FIELD_ANCHOR, FIELD_ANCHOR + FIELD_LINE, 1)
        changed = True

    if changed:
        app_main_path.write_text(text, encoding="utf-8")
    return changed


if __name__ == "__main__":
    target = Path("EngineData/LauncherApp/app_main.py")
    changed = apply_patch(target)
    print("patched" if changed else "already patched")
