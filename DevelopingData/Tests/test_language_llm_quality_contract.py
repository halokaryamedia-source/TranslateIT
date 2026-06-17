from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_quality_contract import (
    LanguageLLMQualityContractBuilder,
    LanguageLLMQualityRequest,
)


class LanguageLLMQualityContractTests(unittest.TestCase):
    def test_quality_contract_never_allows_hot_path(self) -> None:
        request = LanguageLLMQualityRequest(
            source_language="id",
            target_language="en",
            source_text="tolong deploy build ini",
            translated_text="please spread this building",
            task="glossary_correction",
            domain="software",
        )
        contract = LanguageLLMQualityContractBuilder.build(request).to_dict()
        self.assertFalse(contract["hot_path_allowed"])
        self.assertIn("glossary_correction", contract["allowed_tasks"])

    def test_unknown_task_falls_back_to_quality_note(self) -> None:
        request = LanguageLLMQualityRequest(
            source_language="en",
            target_language="id",
            source_text="ship the build",
            translated_text="kirim bangunan",
            task="unknown_task",
        )
        contract = LanguageLLMQualityContractBuilder.build(request).to_dict()
        self.assertEqual(contract["request"]["task"], "bilingual_quality_note")


if __name__ == "__main__":
    unittest.main()
