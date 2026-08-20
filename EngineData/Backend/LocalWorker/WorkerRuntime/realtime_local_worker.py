from __future__ import annotations

from pathlib import Path

_entry_name = __name__
_core_path = Path(__file__).with_name("realtime_local_worker_core.py")
globals()["__name__"] = "_translateit_realtime_local_worker_core"
exec(
    compile(_core_path.read_text(encoding="utf-8"), str(_core_path), "exec"),
    globals(),
    globals(),
)
globals()["__name__"] = _entry_name

import milmmt_translation_provider

milmmt_translation_provider.install(globals())

if _entry_name == "__main__":
    raise SystemExit(main())
