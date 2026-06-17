from __future__ import annotations

import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from DevelopingData.Patches.realtime_hook_status import get_realtime_hook_status


class IntegrationStatusPayloadTests(unittest.TestCase):
    def test_payload_is_dictionary(self) -> None:
        payload = get_realtime_hook_status().to_dict()
        self.assertIsInstance(payload, dict)
        self.assertGreaterEqual(len(payload), 1)


if __name__ == "__main__":
    unittest.main()
