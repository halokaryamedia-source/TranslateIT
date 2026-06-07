from __future__ import annotations

from datetime import datetime, timezone
import faulthandler
import os
from pathlib import Path
import json
import queue
import sys
import threading
import traceback
from typing import Any, Callable

from EngineData.LauncherApp.app_config import PROJECT_ROOT


LOG_ROOT = PROJECT_ROOT / "UserData" / "LogData"
PIPELINE_TRACE_LOG = "runtime_pipeline_latest.log"
_LOG_QUEUE: "queue.Queue[tuple[str, str]]" = queue.Queue(maxsize=1024)
_LOG_WORKER_STARTED = False
_LOG_WORKER_LOCK = threading.Lock()
_LOG_CACHE_LOCK = threading.Lock()
_LOG_LAST_ENQUEUED: dict[str, str] = {}
_LOG_LAST_WRITTEN: dict[str, str] = {}
_LOG_PENDING_LATEST: dict[str, list[str]] = {}
_REPORT_QUEUE: "queue.Queue[tuple[str, str]]" = queue.Queue(maxsize=256)
_REPORT_WORKER_STARTED = False
_REPORT_WORKER_LOCK = threading.Lock()
_REPORT_CACHE_LOCK = threading.Lock()
_REPORT_LAST_WRITTEN: dict[str, str] = {}
_REPORT_LAST_ENQUEUED: dict[str, str] = {}
_REPORT_PENDING_LATEST: dict[str, str] = {}
_CRASH_RECORDERS_LOCK = threading.Lock()
_CRASH_RECORDERS_INSTALLED = False
_CRASH_FATAL_HANDLE: Any | None = None


def _report_target_path(file_name: str) -> Path:
    log_root = ensure_log_root()
    return log_root / file_name


def _write_report_content(file_name: str, text: str) -> Path:
    target = _report_target_path(file_name)
    cache_key = str(target)
    with _REPORT_CACHE_LOCK:
        if _REPORT_LAST_WRITTEN.get(cache_key) == text:
            return target
    try:
        if target.exists() and target.read_text(encoding="utf-8") == text:
            with _REPORT_CACHE_LOCK:
                _REPORT_LAST_WRITTEN[cache_key] = text
            return target
    except OSError:
        pass
    target.write_text(text, encoding="utf-8")
    with _REPORT_CACHE_LOCK:
        _REPORT_LAST_WRITTEN[cache_key] = text
        _REPORT_LAST_ENQUEUED[cache_key] = text
    return target


def _json_safe_value(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_safe_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe_value(item) for item in value]
    if isinstance(value, set):
        return sorted(_json_safe_value(item) for item in value)
    try:
        return str(value)
    except Exception:
        return repr(value)


def _report_already_queued(file_name: str, text: str) -> bool:
    cache_key = str(_report_target_path(file_name))
    with _REPORT_CACHE_LOCK:
        if _REPORT_LAST_ENQUEUED.get(cache_key) == text or _REPORT_LAST_WRITTEN.get(cache_key) == text:
            return True
        _REPORT_LAST_ENQUEUED[cache_key] = text
        return False


def _queue_pending_latest(file_name: str, text: str) -> None:
    cache_key = str(_report_target_path(file_name))
    with _REPORT_CACHE_LOCK:
        _REPORT_PENDING_LATEST[cache_key] = text


def _pop_pending_latest() -> tuple[str, str] | None:
    with _REPORT_CACHE_LOCK:
        if not _REPORT_PENDING_LATEST:
            return None
        cache_key, text = _REPORT_PENDING_LATEST.popitem()
    return cache_key, text


def ensure_log_root() -> Path:
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    return LOG_ROOT


def utc_stamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _safe_str(value: object) -> str:
    try:
        return str(value)
    except Exception:
        return "<unprintable>"


def append_log(file_name: str, level: str, message: str, details: Any | None = None) -> Path:
    log_root = ensure_log_root()
    target = log_root / file_name
    line = f"[{utc_stamp()}] {level}: {message}"
    if details is not None:
        line += f" | {details}"
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with target.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
        return target
    except OSError as exc:
        fallback = log_root / "launcher_log_write_failure.log"
        fallback_line = (
            f"[{utc_stamp()}] ERROR: Could not write {target}: {exc!r} | "
            f"original={line}"
        )
        with fallback.open("a", encoding="utf-8") as handle:
            handle.write(fallback_line + "\n")
        return fallback


def _log_target_path(file_name: str) -> Path:
    log_root = ensure_log_root()
    return log_root / file_name


def _log_already_queued(file_name: str, line: str) -> bool:
    cache_key = str(_log_target_path(file_name))
    with _LOG_CACHE_LOCK:
        if _LOG_LAST_ENQUEUED.get(cache_key) == line or _LOG_LAST_WRITTEN.get(cache_key) == line:
            return True
        _LOG_LAST_ENQUEUED[cache_key] = line
        return False


def _queue_pending_log(file_name: str, line: str) -> None:
    cache_key = str(_log_target_path(file_name))
    with _LOG_CACHE_LOCK:
        pending = _LOG_PENDING_LATEST.setdefault(cache_key, [])
        pending.append(line)
        if len(pending) > 256:
            del pending[: len(pending) - 256]


def _pop_pending_log() -> tuple[str, str] | None:
    with _LOG_CACHE_LOCK:
        for cache_key, pending in list(_LOG_PENDING_LATEST.items()):
            if pending:
                line = pending.pop(0)
                if not pending:
                    _LOG_PENDING_LATEST.pop(cache_key, None)
                return cache_key, line
    return None


def _write_log_content(file_name: str, line: str) -> Path:
    target = _log_target_path(file_name)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        with target.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except OSError as exc:
        fallback = target.parent / "launcher_log_write_failure.log"
        fallback_line = (
            f"[{utc_stamp()}] ERROR: Could not write {target}: {exc!r} | "
            f"original={line}"
        )
        with fallback.open("a", encoding="utf-8") as handle:
            handle.write(fallback_line + "\n")
        return fallback
    with _LOG_CACHE_LOCK:
        _LOG_LAST_WRITTEN[str(target)] = line
    return target


def _ensure_log_worker() -> None:
    global _LOG_WORKER_STARTED
    if _LOG_WORKER_STARTED:
        return
    with _LOG_WORKER_LOCK:
        if _LOG_WORKER_STARTED:
            return

        def worker() -> None:
            while True:
                item: tuple[str, str] | None = None
                queued = False
                try:
                    item = _LOG_QUEUE.get(timeout=0.1)
                    queued = True
                except queue.Empty:
                    item = _pop_pending_log()
                if item is None:
                    continue
                cache_key, line = item
                file_name = Path(cache_key).name
                try:
                    _write_log_content(file_name, line)
                except Exception:
                    pass
                finally:
                    if queued:
                        _LOG_QUEUE.task_done()

        threading.Thread(target=worker, daemon=True, name="TranslateIT-Log-Writer").start()
        _LOG_WORKER_STARTED = True


def append_log_async(file_name: str, level: str, message: str, details: Any | None = None) -> None:
    _ensure_log_worker()
    line = f"[{utc_stamp()}] {level}: {message}"
    if details is not None:
        line += f" | {details}"
    if _log_already_queued(file_name, line):
        return
    try:
        _LOG_QUEUE.put_nowait((file_name, line))
        return
    except queue.Full:
        _queue_pending_log(file_name, line)
        return


def append_runtime_pipeline_log(
    trace_id: str,
    event: str,
    *,
    stage: str = "",
    segment_id: str = "",
    status: str = "",
    details: Any | None = None,
) -> Path:
    payload = {
        "trace_id": trace_id or "unavailable",
        "event": event or "unavailable",
        "stage": stage or "unavailable",
        "segment_id": segment_id or "unavailable",
        "status": status or "unavailable",
        "details": details if details is not None else "unavailable",
    }
    append_log_async(PIPELINE_TRACE_LOG, "TRACE", event or "unavailable", payload)
    return _log_target_path(PIPELINE_TRACE_LOG)


def write_text_report(file_name: str, lines: list[str]) -> Path:
    text = "\n".join(lines) + "\n"
    return _write_report_content(file_name, text)


def write_text_report_async(file_name: str, lines: list[str]) -> None:
    _ensure_report_worker()
    text = "\n".join(lines) + "\n"
    if _report_already_queued(file_name, text):
        return
    try:
        _REPORT_QUEUE.put_nowait((file_name, text))
        return
    except queue.Full:
        _queue_pending_latest(file_name, text)
        return


def write_json_report(file_name: str, payload: dict[str, Any]) -> Path:
    text = json.dumps(_json_safe_value(payload), ensure_ascii=False, indent=2)
    return _write_report_content(file_name, text)


def _ensure_report_worker() -> None:
    global _REPORT_WORKER_STARTED
    if _REPORT_WORKER_STARTED:
        return
    with _REPORT_WORKER_LOCK:
        if _REPORT_WORKER_STARTED:
            return

        def worker() -> None:
            while True:
                item: tuple[str, str] | None = None
                queued = False
                try:
                    item = _REPORT_QUEUE.get(timeout=0.1)
                    queued = True
                except queue.Empty:
                    item = _pop_pending_latest()
                if item is None:
                    continue
                cache_key, text = item
                file_name = Path(cache_key).name
                try:
                    _write_report_content(file_name, text)
                except Exception:
                    pass
                finally:
                    if queued:
                        _REPORT_QUEUE.task_done()

        threading.Thread(target=worker, daemon=True, name="TranslateIT-Report-Writer").start()
        _REPORT_WORKER_STARTED = True


def write_json_report_async(file_name: str, payload: dict[str, Any]) -> None:
    _ensure_report_worker()
    text = json.dumps(_json_safe_value(payload), ensure_ascii=False, indent=2)
    if _report_already_queued(file_name, text):
        return
    try:
        _REPORT_QUEUE.put_nowait((file_name, text))
        return
    except queue.Full:
        _queue_pending_latest(file_name, text)
        return


def _build_crash_text_lines(payload: dict[str, Any]) -> list[str]:
    lines = [f"Crash event: {payload.get('event', 'unavailable')}"]
    lines.extend(
        [
            f"Timestamp UTC: {payload.get('timestamp_utc', 'unavailable')}",
            f"File Prefix: {payload.get('file_prefix', 'unavailable')}",
            f"Process ID: {payload.get('process_id', 'unavailable')}",
            f"Thread Name: {payload.get('thread_name', 'unavailable')}",
            f"Thread Ident: {payload.get('thread_ident', 'unavailable')}",
            f"Exception Type: {payload.get('exception_type', 'unavailable')}",
            f"Exception Message: {payload.get('exception_message', 'unavailable')}",
        ]
    )
    details = payload.get("details")
    if details not in (None, "", "unavailable"):
        lines.append("Details:")
        lines.extend(json.dumps(_json_safe_value(details), ensure_ascii=False, indent=2).splitlines())
    context = payload.get("context")
    if context not in (None, "", {}):
        lines.append("Context:")
        lines.extend(json.dumps(_json_safe_value(context), ensure_ascii=False, indent=2).splitlines())
    traceback_text = payload.get("traceback")
    if traceback_text not in (None, "", "unavailable"):
        lines.append("Traceback:")
        lines.extend(str(traceback_text).splitlines())
    return lines


def write_crash_record(
    file_prefix: str,
    event: str,
    exc: BaseException | None = None,
    *,
    details: Any | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    safe_prefix = file_prefix or "app_crash"
    payload: dict[str, Any] = {
        "timestamp_utc": utc_stamp(),
        "file_prefix": safe_prefix,
        "event": event or "unavailable",
        "process_id": os.getpid(),
        "thread_name": threading.current_thread().name,
        "thread_ident": threading.current_thread().ident,
        "details": _json_safe_value(details if details is not None else "unavailable"),
        "context": _json_safe_value(context if context is not None else {}),
        "exception_type": type(exc).__name__ if exc is not None else "unavailable",
        "exception_message": str(exc) if exc is not None else "unavailable",
        "traceback": format_exception(exc) if exc is not None else "unavailable",
    }
    write_json_report(f"{safe_prefix}_latest.json", payload)
    write_text_report(f"{safe_prefix}_latest.log", _build_crash_text_lines(payload))
    return payload


def install_global_crash_recorders(
    *,
    file_prefix: str = "app_crash",
    startup_context: Callable[[], dict[str, Any]] | None = None,
) -> None:
    global _CRASH_RECORDERS_INSTALLED, _CRASH_FATAL_HANDLE
    if _CRASH_RECORDERS_INSTALLED:
        return
    with _CRASH_RECORDERS_LOCK:
        if _CRASH_RECORDERS_INSTALLED:
            return

        crash_prefix = file_prefix or "app_crash"
        fatal_path = _report_target_path(f"{crash_prefix}_fatal.log")
        fatal_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            _CRASH_FATAL_HANDLE = fatal_path.open("ab", buffering=0)
            faulthandler.enable(file=_CRASH_FATAL_HANDLE, all_threads=True)
        except Exception:
            _CRASH_FATAL_HANDLE = None

        original_sys_excepthook = sys.excepthook
        original_threading_excepthook = getattr(threading, "excepthook", None)
        original_unraisablehook = getattr(sys, "unraisablehook", None)

        def _build_context(extra: dict[str, Any] | None = None) -> dict[str, Any]:
            context: dict[str, Any] = {}
            if startup_context is not None:
                try:
                    context.update(_json_safe_value(startup_context()))
                except Exception as startup_exc:
                    context["startup_context_error"] = format_exception(startup_exc)
            if extra:
                context.update(_json_safe_value(extra))
            return context

        def _record_exception(event_name: str, exc: BaseException, context: dict[str, Any] | None = None) -> None:
            try:
                write_crash_record(
                    crash_prefix,
                    event_name,
                    exc,
                    context=_build_context(context),
                )
            except Exception:
                append_log(
                    "launcher_latest.log",
                    "ERROR",
                    "crash_record_failed",
                    format_exception(exc),
                )

        def _sys_excepthook(exc_type, exc_value, exc_traceback) -> None:  # type: ignore[no-untyped-def]
            exc = exc_value if isinstance(exc_value, BaseException) else RuntimeError(_safe_str(exc_value))
            _record_exception(
                "unhandled_exception",
                exc,
                {
                    "hook": "sys.excepthook",
                    "exc_type": getattr(exc_type, "__name__", str(exc_type)),
                },
            )
            if original_sys_excepthook is not None:
                try:
                    original_sys_excepthook(exc_type, exc_value, exc_traceback)
                except Exception:
                    pass

        def _threading_excepthook(args) -> None:  # type: ignore[no-untyped-def]
            exc = getattr(args, "exc_value", None)
            if not isinstance(exc, BaseException):
                exc = RuntimeError(_safe_str(exc))
            _record_exception(
                "thread_exception",
                exc,
                {
                    "hook": "threading.excepthook",
                    "thread_name": getattr(getattr(args, "thread", None), "name", "unavailable"),
                    "thread_ident": getattr(getattr(args, "thread", None), "ident", None),
                    "exc_type": getattr(getattr(args, "exc_type", None), "__name__", str(getattr(args, "exc_type", None))),
                },
            )
            if original_threading_excepthook is not None:
                try:
                    original_threading_excepthook(args)
                except Exception:
                    pass

        def _unraisablehook(args) -> None:  # type: ignore[no-untyped-def]
            exc = getattr(args, "exc_value", None)
            if not isinstance(exc, BaseException):
                exc = RuntimeError(_safe_str(exc))
            _record_exception(
                "unraisable_exception",
                exc,
                {
                    "hook": "sys.unraisablehook",
                    "object": _safe_str(getattr(args, "object", "unavailable")),
                    "err_msg": _safe_str(getattr(args, "err_msg", "unavailable")),
                },
            )
            if original_unraisablehook is not None:
                try:
                    original_unraisablehook(args)
                except Exception:
                    pass

        sys.excepthook = _sys_excepthook
        if hasattr(threading, "excepthook"):
            threading.excepthook = _threading_excepthook  # type: ignore[assignment]
        if hasattr(sys, "unraisablehook"):
            sys.unraisablehook = _unraisablehook  # type: ignore[assignment]
        _CRASH_RECORDERS_INSTALLED = True


def format_exception(exc: BaseException) -> str:
    return "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)).strip()
