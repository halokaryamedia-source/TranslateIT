from __future__ import annotations

import sys
from pathlib import Path


WORKER_ROOT = Path(__file__).resolve().parents[1]
WORKER_ROOT_TEXT = str(WORKER_ROOT)

if WORKER_ROOT_TEXT not in sys.path:
    sys.path.insert(0, WORKER_ROOT_TEXT)
