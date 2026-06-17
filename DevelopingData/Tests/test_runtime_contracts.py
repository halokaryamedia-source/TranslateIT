from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from EngineData.TranslateEngine.piper_runtime_contract import PiperRuntimeContract
from EngineData.TranslateEngine.piper_tts_backend import PiperTTSBackend


class RuntimeContractsTests(unittest.TestCase):
    def test_runtime_contract_returns_dict(self) -> None:
        result = PiperRuntimeContract(PiperTTSBackend(model_root=None)).plan(text="hello", language="en")
        payload = result.to_dict()
        self.assertIn("status", payload)
        self.assertIn("ready", payload)


if __name__ == "__main__":
    unittest.main()
