from __future__ import annotations

import importlib
from pathlib import Path

_entry_name = __name__
_base_path = Path(__file__).with_name("realtime_local_worker_base.py")
globals()["__name__"] = "_translateit_realtime_local_worker_base"
exec(
    compile(_base_path.read_text(encoding="utf-8"), str(_base_path), "exec"),
    globals(),
    globals(),
)
globals()["__name__"] = _entry_name

milmmt_translation_provider = importlib.import_module("milmmt_translation_provider")
milmmt_translation_provider.install(globals())

if _entry_name == "__main__":
    raise SystemExit(globals()["main"]())
