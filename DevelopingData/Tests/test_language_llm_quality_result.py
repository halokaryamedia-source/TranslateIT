from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_quality_result import LanguageLLMQualityResultParser


class LanguageLLMQualityResultTests(unittest.TestCase):
    def test_quality_result_parser_is_safe(self) -> None:
        result = LanguageLLMQualityResultParser.parse(
            {
                "corrected_translation": "Please deploy this build.",
                "glossary_notes": ["deploy should stay deploy", "build should stay build"],
                "tone_note": "clear technical tone",
                "confidence": "high",
            }
        ).to_dict()
        self.assertEqual(result["confidence"], "high")
        self.assertFalse(result["hot_path_allowed"])
        self.assertGreaterEqual(len(result["glossary_notes"]), 1)

    def test_unknown_confidence_falls_back_to_low(self) -> None:
        result = LanguageLLMQualityResultParser.parse({"confidence": "certain"}).to_dict()
        self.assertEqual(result["confidence"], "low")


if __name__ == "__main__":
    unittest.main()
