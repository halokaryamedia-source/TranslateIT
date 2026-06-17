from __future__ import annotations

from pathlib import Path

IMPORT_LINE = "from EngineData.TranscriptEngine.language_llm_session_persistence_bridge import LanguageLLMSessionPersistenceBridge\n"
IMPORT_ANCHOR = "from EngineData.TranscriptEngine.transcript_session import TranscriptSession\n"
CALL_ANCHOR = "                self.runtime.cache_current_session()\n"
CALL_BLOCK = """                language_llm_queue = getattr(self.runtime, \"language_llm_session_patch_queue\", None)\n                if language_llm_queue is not None and callable(getattr(language_llm_queue, \"drain\", None)):\n                    language_llm_patches = language_llm_queue.drain()\n                    if language_llm_patches:\n                        LanguageLLMSessionPersistenceBridge.apply_patches(self.runtime.session, language_llm_patches)\n                self.runtime.cache_current_session()\n"""


def apply_patch(app_main_path: Path) -> bool:
    text = app_main_path.read_text(encoding="utf-8")
    changed = False

    if IMPORT_LINE not in text:
        if IMPORT_ANCHOR not in text:
            raise RuntimeError("TranscriptSession import anchor not found")
        text = text.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + IMPORT_LINE, 1)
        changed = True

    if "LanguageLLMSessionPersistenceBridge.apply_patches" not in text:
        if CALL_ANCHOR not in text:
            raise RuntimeError("session cache anchor not found")
        text = text.replace(CALL_ANCHOR, CALL_BLOCK, 1)
        changed = True

    if changed:
        app_main_path.write_text(text, encoding="utf-8")
    return changed


if __name__ == "__main__":
    target = Path("EngineData/LauncherApp/app_main.py")
    changed = apply_patch(target)
    print("patched" if changed else "already patched")
