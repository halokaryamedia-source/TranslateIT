from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranscriptEngine.language_llm_session_persistence_bridge import LanguageLLMSessionPersistenceBridge
from EngineData.TranscriptEngine.transcript_segment import TranscriptSegment
from EngineData.TranscriptEngine.transcript_session import TranscriptSession
from EngineData.TranslateEngine.language_llm_session_patch_adapter import LanguageLLMSessionPatchAdapter
from EngineData.TranslateEngine.language_llm_transcript_persistence_patch import LanguageLLMTranscriptPersistencePatchBuilder


class LanguageLLMSessionPersistenceBridgeTests(unittest.TestCase):
    def test_bridge_applies_language_llm_patch_to_session_segment(self) -> None:
        session = TranscriptSession(session_id="SESSION-001")
        session.add_segment(
            TranscriptSegment(
                segment_id="SEG-001",
                session_id="SESSION-001",
                input_language="id",
                output_language="en",
                start_time_ms=0,
                end_time_ms=1000,
                input_text="tolong deploy build ini",
                translated_text="Please spread this building.",
            )
        )
        transcript_patch = LanguageLLMTranscriptPersistencePatchBuilder.build(
            "SEG-001",
            "Please spread this building.",
            {
                "corrected_translation": "Please deploy this build.",
                "glossary_notes": ["deploy/build are software terms"],
                "confidence": "high",
            },
        )
        session_patch = LanguageLLMSessionPatchAdapter.from_transcript_patch(
            session_id="SESSION-001",
            transcript_patch=transcript_patch,
        )
        result = LanguageLLMSessionPersistenceBridge.apply_patches(session, [session_patch.to_dict()]).to_dict()
        self.assertEqual(result["applied_count"], 1)
        self.assertEqual(session.segments[0].translated_text, "Please deploy this build.")
        patch_meta = session.segments[0].latency.to_dict()["language_llm_patch"]
        self.assertFalse(patch_meta["audio_replay_allowed"])
        self.assertEqual(patch_meta["confidence"], "high")


if __name__ == "__main__":
    unittest.main()
