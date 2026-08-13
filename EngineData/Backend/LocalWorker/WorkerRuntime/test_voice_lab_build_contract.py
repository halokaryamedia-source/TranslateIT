from __future__ import annotations

import tempfile
import unittest
import wave
from pathlib import Path

from voice_lab_gpt_sovits import VoiceLabProviderError, select_reference, training_takes


class VoiceLabBuildContractTests(unittest.TestCase):
    @staticmethod
    def write_canonical_wav(path: Path, duration_ms: int) -> None:
        frames = 32_000 * duration_ms // 1_000
        with wave.open(str(path), "wb") as writer:
            writer.setnchannels(1)
            writer.setsampwidth(2)
            writer.setframerate(32_000)
            writer.writeframes(b"\x00\x00" * frames)

    def test_reference_selection_prefers_take_closest_to_five_seconds(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            durations = [(1, 3_200), (2, 5_050), (3, 7_400)]
            takes = []
            for line_id, duration_ms in durations:
                name = f"take_{line_id:04}.wav"
                self.write_canonical_wav(root / name, duration_ms)
                takes.append({"line_id": line_id, "exact_text": f"line {line_id}", "wav_file": name})
            manifest = {
                "takes": takes,
                "held_out_lines": [{"line_id": 1001, "exact_text": "held out sentence"}],
            }
            normalized = training_takes(root, manifest)
            selected = select_reference(normalized)
            self.assertEqual(selected["line_id"], 2)
            self.assertEqual(selected["duration_ms"], 5_050)

    def test_held_out_text_cannot_overlap_training_text(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            self.write_canonical_wav(root / "take_0001.wav", 4_000)
            manifest = {
                "takes": [{"line_id": 1, "exact_text": "same sentence", "wav_file": "take_0001.wav"}],
                "held_out_lines": [{"line_id": 1001, "exact_text": "same sentence"}],
            }
            with self.assertRaisesRegex(VoiceLabProviderError, "invalid_held_out_line"):
                training_takes(root, manifest)

    def test_noncanonical_take_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            path = root / "take_0001.wav"
            with wave.open(str(path), "wb") as writer:
                writer.setnchannels(2)
                writer.setsampwidth(2)
                writer.setframerate(48_000)
                writer.writeframes(b"\x00\x00" * 48_000 * 2)
            manifest = {
                "takes": [{"line_id": 1, "exact_text": "training sentence", "wav_file": path.name}],
                "held_out_lines": [{"line_id": 1001, "exact_text": "held out sentence"}],
            }
            with self.assertRaisesRegex(VoiceLabProviderError, "noncanonical_take"):
                training_takes(root, manifest)


if __name__ == "__main__":
    unittest.main()
