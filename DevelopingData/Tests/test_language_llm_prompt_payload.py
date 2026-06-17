from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_prompt_payload import LanguageLLMPromptPayloadBuilder
from EngineData.TranslateEngine.language_llm_quality_contract import LanguageLLMQualityContractBuilder, LanguageLLMQualityRequest


class LanguageLLMPromptPayloadTests(unittest.TestCase):
    def test_payload_contains_schema_and_runtime_flag(self) -> None:
        contract = LanguageLLMQualityContractBuilder.build(
            LanguageLLMQualityRequest(
                source_language="id",
                target_language="en",
                source_text="tolong deploy build ini",
                translated_text="please deploy this build",
            )
        )
        payload = LanguageLLMPromptPayloadBuilder.build(contract).to_dict()
        self.assertFalse(payload["user_payload"]["hot_path_allowed"])
        self.assertIn("corrected_translation", payload["output_schema"])


if __name__ == "__main__":
    unittest.main()
