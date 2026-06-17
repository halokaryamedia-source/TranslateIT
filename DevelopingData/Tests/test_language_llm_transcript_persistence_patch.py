from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_transcript_persistence_patch import LanguageLLMTranscriptPersistencePatchBuilder


class LanguageLLMTranscriptPersistencePatchTests(unittest.TestCase):
    def test_patch_preserves_no_audio_replay_policy(self) -> None:
        patch = LanguageLLMTranscriptPersistencePatchBuilder.build(
            "SEG-001",
            "Please spread this building.",
            {
                "corrected_translation": "Please deploy this build.",
                "glossary_notes": ["deploy and build are software terms"],
                "confidence": "high",
            },
        ).to_dict()
        self.assertEqual(patch["segment_id"], "SEG-001")
        self.assertTrue(patch["changed"])
        self.assertFalse(patch["audio_replay_allowed"])
        self.assertEqual(patch["patch_type"], "language_llm_final_transcript")


if __name__ == "__main__":
    unittest.main()
