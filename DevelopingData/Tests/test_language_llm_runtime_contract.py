from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_runtime_contract import LanguageLLMRuntimeContract


class LanguageLLMRuntimeContractTests(unittest.TestCase):
    def test_runtime_status_is_not_ready_without_model_path(self) -> None:
        status = LanguageLLMRuntimeContract(model_path=None).status().to_dict()
        self.assertFalse(status["ready"])
        self.assertIn("backend_name", status)
        self.assertIn("message", status)


if __name__ == "__main__":
    unittest.main()
