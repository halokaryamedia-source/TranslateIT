from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from typing import Any

from EngineData.LauncherApp.app_config import PROJECT_ROOT


try:  # pragma: no cover - Windows-only runtime detail
    import msvcrt
except Exception:  # pragma: no cover - non-Windows fallback
    msvcrt = None  # type: ignore[assignment]


LOCK_DIR = PROJECT_ROOT / "UserData" / "CacheData"
LOCK_PATH = LOCK_DIR / "translateit.lock"
LOCK_META_PATH = LOCK_DIR / "translateit.lock.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _write_metadata(payload: dict[str, Any]) -> None:
    LOCK_DIR.mkdir(parents=True, exist_ok=True)
    LOCK_META_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def read_lock_metadata() -> dict[str, Any]:
    try:
        return json.loads(LOCK_META_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


@dataclass(slots=True)
class SingleInstanceLock:
    lock_path: Path = LOCK_PATH
    metadata_path: Path = LOCK_META_PATH
    acquired: bool = False
    _handle: Any = None

    def acquire(self) -> bool:
        if self.acquired:
            return True
        self.lock_path.parent.mkdir(parents=True, exist_ok=True)
        handle = open(self.lock_path, "a+b")
        try:
            if msvcrt is None:
                raise RuntimeError("Windows file locking is unavailable")
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            handle.seek(0)
            handle.truncate(0)
            handle.write(json.dumps({"pid": os.getpid(), "started_at": _utc_now()}, ensure_ascii=False).encode("utf-8"))
            handle.flush()
            os.fsync(handle.fileno())
            self._handle = handle
            self.acquired = True
            _write_metadata({"pid": os.getpid(), "started_at": _utc_now(), "project_root": str(PROJECT_ROOT)})
            return True
        except Exception:
            try:
                handle.close()
            except Exception:
                pass
            return False

    def release(self) -> None:
        if not self.acquired or self._handle is None:
            return
        try:
            self._handle.seek(0)
            if msvcrt is not None:
                msvcrt.locking(self._handle.fileno(), msvcrt.LK_UNLCK, 1)
        except Exception:
            pass
        try:
            self._handle.close()
        finally:
            self.acquired = False
            self._handle = None

    def __enter__(self) -> "SingleInstanceLock":
        self.acquire()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.release()


def show_already_running_message() -> None:
    try:
        import ctypes

        metadata = read_lock_metadata()
        details = []
        if metadata.get("pid"):
            details.append(f"PID {metadata['pid']}")
        if metadata.get("started_at"):
            details.append(str(metadata["started_at"]))
        suffix = f"\n{', '.join(details)}" if details else ""
        ctypes.windll.user32.MessageBoxW(  # type: ignore[attr-defined]
            None,
            f"TranslateIT is already running.{suffix}",
            "TranslateIT",
            0x10 | 0x40000,
        )
    except Exception:
        pass
