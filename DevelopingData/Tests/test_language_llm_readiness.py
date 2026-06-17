from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_readiness import LanguageLLMReadinessChecker


class LanguageLLMReadinessTests(unittest.TestCase):
    def test_readiness_reports_runtime_status(self) -> None:
        payload = LanguageLLMReadinessChecker(model_root=None).check().to_dict()
        self.assertFalse(payload["ready"])
        self.assertIn("checks", payload)
        self.assertIn("runtime", payload["checks"][0])


if __name__ == "__main__":
    unittest.main()
