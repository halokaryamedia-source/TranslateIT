from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_final_transcript_adapter import LanguageLLMFinalTranscriptAdapter


class LanguageLLMFinalTranscriptAdapterTests(unittest.TestCase):
    def test_final_transcript_update_does_not_allow_audio_replay(self) -> None:
        update = LanguageLLMFinalTranscriptAdapter.build_update(
            "Please spread this building.",
            {
                "corrected_translation": "Please deploy this build.",
                "glossary_notes": ["deploy/build are software terms"],
                "confidence": "high",
            },
        ).to_dict()
        self.assertTrue(update["changed"])
        self.assertEqual(update["final_translation"], "Please deploy this build.")
        self.assertFalse(update["audio_replay_allowed"])


if __name__ == "__main__":
    unittest.main()
