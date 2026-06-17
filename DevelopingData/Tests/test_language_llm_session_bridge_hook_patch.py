from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PATCH_PATH = PROJECT_ROOT / "DevelopingData" / "Patches" / "apply_language_llm_session_bridge_hook.py"
VERIFY_PATH = PROJECT_ROOT / "DevelopingData" / "Patches" / "verify_language_llm_session_bridge_hook.py"


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LanguageLLMSessionBridgeHookPatchTests(unittest.TestCase):
    def test_patch_adds_bridge_markers(self) -> None:
        patcher = _load_module(PATCH_PATH, "language_llm_session_bridge_patcher")
        verifier = _load_module(VERIFY_PATH, "language_llm_session_bridge_verifier")
        sample = (
            "from EngineData.TranscriptEngine.transcript_session import TranscriptSession\n"
            "\n"
            "def runner(self):\n"
            "    self.runtime.cache_current_session()\n"
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            sample_path = Path(temp_dir) / "app_main.py"
            sample_path.write_text(sample, encoding="utf-8")
            changed = patcher.apply_patch(sample_path)
            result = verifier.verify_hook(sample_path).to_dict()
        self.assertTrue(changed)
        self.assertTrue(result["ready"])


if __name__ == "__main__":
    unittest.main()
