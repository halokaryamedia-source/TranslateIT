from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PATCH_PATH = PROJECT_ROOT / "DevelopingData" / "Patches" / "apply_language_llm_runtime_queue_hook.py"
VERIFY_PATH = PROJECT_ROOT / "DevelopingData" / "Patches" / "verify_language_llm_runtime_queue_hook.py"


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LanguageLLMRuntimeQueueHookPatchTests(unittest.TestCase):
    def test_patch_adds_runtime_queue_markers(self) -> None:
        patcher = _load_module(PATCH_PATH, "language_llm_runtime_queue_patcher")
        verifier = _load_module(VERIFY_PATH, "language_llm_runtime_queue_verifier")
        sample = (
            "from EngineData.TranslateEngine.tts_placeholder import TTSPlaceholder, TTSRequest\n"
            "\n"
            "@dataclass(slots=True)\n"
            "class PrototypeRuntime:\n"
            "    replay: ReplayController = field(default_factory=ReplayController)\n"
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
