from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
NEXT = ROOT / "docs/knowledge/next-action.md"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="\n")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def source() -> None:
    text = read(RUNTIME)
    text = replace_once(
        text,
        '''    if let Some(object) = payload.as_object_mut() {\n        object\n            .entry("request_unix_ms".to_string())\n            .or_insert(json!(started));\n        object\n            .entry("deadline_unix_ms".to_string())\n            .or_insert(json!(deadline));\n        object\n            .entry("deadline_ms".to_string())\n            .or_insert(json!(deadline_ms));\n    }\n''',
        '''    if let Some(object) = payload.as_object_mut() {\n        object.insert("request_unix_ms".to_string(), json!(started));\n        object.insert("deadline_unix_ms".to_string(), json!(deadline));\n        object.insert("deadline_ms".to_string(), json!(deadline_ms));\n    }\n''',
        "host deadline authority",
    )
    text = replace_once(
        text,
        "fn request_metadata_uses_selected_deadline_without_overwriting_caller_metadata() {",
        "fn request_metadata_uses_host_selected_deadline_as_authority() {",
        "test name",
    )
    old_assert = '''        let preserved = request_deadline_payload(\n            &json!({\n                "command": "ping",\n                "request_unix_ms": 10_u64,\n                "deadline_unix_ms": 20_u64,\n                "deadline_ms": 10_u64\n            }),\n            worker_response_deadline_ms("ping"),\n        );\n        assert_eq!(\n            preserved.get("request_unix_ms").and_then(Value::as_u64),\n            Some(10)\n        );\n        assert_eq!(\n            preserved.get("deadline_unix_ms").and_then(Value::as_u64),\n            Some(20)\n        );\n        assert_eq!(\n            preserved.get("deadline_ms").and_then(Value::as_u64),\n            Some(10)\n        );\n'''
    new_assert = '''        let overridden = request_deadline_payload(\n            &json!({\n                "command": "ping",\n                "request_unix_ms": 10_u64,\n                "deadline_unix_ms": 20_u64,\n                "deadline_ms": 10_u64\n            }),\n            worker_response_deadline_ms("ping"),\n        );\n        let overridden_started = overridden\n            .get("request_unix_ms")\n            .and_then(Value::as_u64)\n            .unwrap() as u128;\n        let overridden_deadline = overridden\n            .get("deadline_unix_ms")\n            .and_then(Value::as_u64)\n            .unwrap() as u128;\n        assert_ne!(overridden_started, 10);\n        assert_eq!(\n            overridden_deadline.saturating_sub(overridden_started),\n            worker_response_deadline_ms("ping")\n        );\n        assert_eq!(\n            overridden.get("deadline_ms").and_then(Value::as_u64),\n            Some(5_000)\n        );\n'''
    text = replace_once(text, old_assert, new_assert, "deadline authority assertions")
    write(RUNTIME, text)


def closure() -> None:
    text = read(NEXT)
    old = "The helper bridge no longer uses one 30-second response deadline for every worker command. The canonical Rust bridge selects a bounded task-cost class and writes that exact deadline into request metadata before waiting with the same host ceiling: ping/control 5s, status/TTS preflight 30s, model preload 120s, inference 90s, and synthesis 45s. Unknown commands fail back to the bounded status ceiling rather than receiving an unbounded wait."
    new = "The helper bridge no longer uses one 30-second response deadline for every worker command. The canonical Rust bridge selects a bounded task-cost class and **overwrites request deadline metadata from the host authority** before waiting with the same ceiling: ping/control 5s, status/TTS preflight 30s, model preload 120s, inference 90s, and synthesis 45s. Caller payload cannot extend or shorten that host-selected deadline. Unknown commands fail back to the bounded status ceiling rather than receiving an unbounded wait."
    text = replace_once(text, old, new, "A3 closure deadline authority")
    write(NEXT, text)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"source", "closure"}:
        raise SystemExit("usage: backend_wave_a3_followup.py source|closure")
    source() if sys.argv[1] == "source" else closure()
