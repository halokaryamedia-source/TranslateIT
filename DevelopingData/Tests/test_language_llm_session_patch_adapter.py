from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_session_patch_adapter import LanguageLLMSessionPatchAdapter
from EngineData.TranslateEngine.language_llm_transcript_persistence_patch import LanguageLLMTranscriptPersistencePatchBuilder


class LanguageLLMSessionPatchAdapterTests(unittest.TestCase):
    def test_session_patch_contains_safe_metadata(self) -> None:
        transcript_patch = LanguageLLMTranscriptPersistencePatchBuilder.build(
            "SEG-001",
            "Please spread this building.",
            {
                "corrected_translation": "Please deploy this build.",
                "glossary_notes": ["deploy/build are software terms"],
                "confidence": "high",
            },
        )
        patch = LanguageLLMSessionPatchAdapter.from_transcript_patch(
            session_id="SESSION-001",
            transcript_patch=transcript_patch,
        ).to_dict()
        self.assertEqual(patch["session_id"], "SESSION-001")
        self.assertEqual(patch["segment_id"], "SEG-001")
        self.assertFalse(patch["metadata"]["audio_replay_allowed"])
        self.assertEqual(patch["final_translation"], "Please deploy this build.")


if __name__ == "__main__":
    unittest.main()
