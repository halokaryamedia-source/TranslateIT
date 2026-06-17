from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.language_llm_session_patch_adapter import LanguageLLMSessionPatchAdapter
from EngineData.TranslateEngine.language_llm_session_patch_queue import LanguageLLMSessionPatchQueue
from EngineData.TranslateEngine.language_llm_transcript_persistence_patch import LanguageLLMTranscriptPersistencePatchBuilder


class LanguageLLMSessionPatchQueueTests(unittest.TestCase):
    def test_queue_can_peek_and_drain(self) -> None:
        transcript_patch = LanguageLLMTranscriptPersistencePatchBuilder.build(
            "SEG-001",
            "old text",
            {"corrected_translation": "new text", "confidence": "medium"},
        )
        patch = LanguageLLMSessionPatchAdapter.from_transcript_patch(
            session_id="SESSION-001",
            transcript_patch=transcript_patch,
        )
        queue = LanguageLLMSessionPatchQueue()
        queue.add(patch)
        self.assertEqual(queue.count(), 1)
        self.assertEqual(len(queue.peek()), 1)
        drained = queue.drain()
        self.assertEqual(len(drained), 1)
        self.assertEqual(queue.count(), 0)


if __name__ == "__main__":
    unittest.main()
