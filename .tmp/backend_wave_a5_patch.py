from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
BRIDGE = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
PATHS = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/bridge_paths.rs"
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
    runtime = read(RUNTIME)
    runtime = replace_once(
        runtime,
        '''use serde::{Deserialize, Serialize};\nuse serde_json::{json, Value};\nuse std::fs::{self, OpenOptions};\nuse std::io::{BufRead, BufReader, Write};\nuse std::path::PathBuf;\nuse std::process::{Child, ChildStderr, ChildStdin, ChildStdout};\nuse std::sync::mpsc::{self, RecvTimeoutError};\nuse std::sync::{Condvar, Mutex, OnceLock};\nuse std::thread;\nuse std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};\n''',
        '''use serde::{Deserialize, Serialize};\nuse serde_json::{json, Value};\nuse std::io::{BufRead, BufReader, Write};\nuse std::path::{Path, PathBuf};\nuse std::process::{Child, ChildStderr, ChildStdin, ChildStdout};\nuse std::sync::mpsc::{self, RecvTimeoutError};\nuse std::sync::{Condvar, Mutex, OnceLock};\nuse std::thread;\nuse std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};\n\nuse crate::engine::logging::{write_jsonl_event, RuntimeLogEvent};\n''',
        "runtime imports",
    )
    runtime = replace_once(
        runtime,
        '''    pub last_error: Option<String>,\n    pub stderr_log_path: Option<String>,\n    pub updated_unix_ms: u128,\n    pub child: Option<Child>,\n''',
        '''    pub last_error: Option<String>,\n    pub stderr_log_path: Option<String>,\n    pub stderr_logger: Option<thread::JoinHandle<()>>,\n    pub updated_unix_ms: u128,\n    pub child: Option<Child>,\n''',
        "stderr logger ownership field",
    )
    runtime = replace_once(
        runtime,
        '''            last_error: None,\n            stderr_log_path: None,\n            updated_unix_ms: unix_ms(),\n            child: None,\n''',
        '''            last_error: None,\n            stderr_log_path: None,\n            stderr_logger: None,\n            updated_unix_ms: unix_ms(),\n            child: None,\n''',
        "stderr logger default",
    )
    runtime = replace_once(
        runtime,
        '''pub fn spawn_stderr_logger(stderr: ChildStderr, log_path: PathBuf) {\n    thread::spawn(move || {\n        if let Some(parent) = log_path.parent() {\n            let _ = fs::create_dir_all(parent);\n        }\n        let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) else {\n            return;\n        };\n        let mut reader = BufReader::new(stderr);\n        let mut line = String::new();\n        loop {\n            line.clear();\n            match reader.read_line(&mut line) {\n                Ok(0) => break,\n                Ok(_) => {\n                    let _ = file.write_all(line.as_bytes());\n                    let _ = file.flush();\n                }\n                Err(_) => break,\n            }\n        }\n    });\n}\n''',
        '''fn write_helper_stderr_event(log_path: &Path, line: &str) -> std::io::Result<()> {\n    if line.trim().is_empty() {\n        return Ok(());\n    }\n    let log_dir = log_path.parent().ok_or_else(|| {\n        std::io::Error::new(\n            std::io::ErrorKind::InvalidInput,\n            "Helper stderr log path has no parent directory.",\n        )\n    })?;\n    let file_name = log_path\n        .file_name()\n        .and_then(|value| value.to_str())\n        .ok_or_else(|| {\n            std::io::Error::new(\n                std::io::ErrorKind::InvalidInput,\n                "Helper stderr log file name is not valid UTF-8.",\n            )\n        })?;\n    write_jsonl_event(\n        log_dir,\n        file_name,\n        &RuntimeLogEvent::warning("helper_worker_stderr", line),\n    )\n}\n\npub fn spawn_stderr_logger(stderr: ChildStderr, log_path: PathBuf) -> thread::JoinHandle<()> {\n    thread::spawn(move || {\n        let mut reader = BufReader::new(stderr);\n        let mut line = String::new();\n        loop {\n            line.clear();\n            match reader.read_line(&mut line) {\n                Ok(0) => break,\n                Ok(_) => {\n                    let _ = write_helper_stderr_event(&log_path, &line);\n                }\n                Err(error) => {\n                    let _ = write_helper_stderr_event(\n                        &log_path,\n                        &format!("Helper stderr reader failed: {error}"),\n                    );\n                    break;\n                }\n            }\n        }\n    })\n}\n''',
        "bounded redacted stderr logger",
    )
    runtime = replace_once(
        runtime,
        '''pub fn stop_child(runtime: &mut HelperBridgeRuntime) {\n    runtime.stdin.take();\n    runtime.stdout.take();\n    if let Some(mut child) = runtime.child.take() {\n        let _ = child.kill();\n        let _ = child.wait();\n    }\n}\n\n#[cfg(test)]\nmod scheduler_policy_tests {\n''',
        '''pub fn stop_child(runtime: &mut HelperBridgeRuntime) {\n    runtime.stdin.take();\n    runtime.stdout.take();\n    if let Some(mut child) = runtime.child.take() {\n        let _ = child.kill();\n        let _ = child.wait();\n    }\n    if let Some(logger) = runtime.stderr_logger.take() {\n        let _ = logger.join();\n    }\n}\n\n#[cfg(test)]\nmod stderr_lifecycle_tests {\n    use super::*;\n    use std::fs;\n    use std::sync::atomic::{AtomicBool, Ordering};\n    use std::sync::Arc;\n\n    fn test_log_path(label: &str) -> PathBuf {\n        std::env::temp_dir()\n            .join(format!(\n                "translateit-a5-{}-{}-{label}",\n                std::process::id(),\n                unix_ms()\n            ))\n            .join("helper_bridge_stderr.jsonl")\n    }\n\n    #[test]\n    fn helper_stderr_uses_redacted_rotating_jsonl_policy() {\n        let log_path = test_log_path("redaction");\n        let log_dir = log_path.parent().expect("stderr test log parent");\n        fs::create_dir_all(log_dir).expect("create stderr test log dir");\n\n        write_helper_stderr_event(\n            &log_path,\n            r"worker failed at C:\\Users\\Alice\\private-model.bin alice@example.com token=supersecret",\n        )\n        .expect("write redacted stderr event");\n        let content = fs::read_to_string(&log_path).expect("read redacted stderr log");\n        assert!(!content.contains(r"C:\\Users\\Alice\\private-model.bin"));\n        assert!(!content.contains("alice@example.com"));\n        assert!(!content.contains("supersecret"));\n        assert!(content.contains("[redacted-path]"));\n        assert!(content.contains("[redacted-email]"));\n        assert!(content.contains("[redacted-secret]"));\n        let event: Value = serde_json::from_str(\n            content\n                .lines()\n                .next()\n                .expect("one helper stderr JSONL event"),\n        )\n        .expect("valid helper stderr JSONL");\n        assert_eq!(\n            event.get("area").and_then(Value::as_str),\n            Some("helper_worker_stderr")\n        );\n\n        fs::write(&log_path, vec![b'x'; 1_100_000]).expect("seed oversized stderr log");\n        write_helper_stderr_event(&log_path, "worker stderr after rotation")\n            .expect("rotate helper stderr log");\n        assert!(log_dir.join("helper_bridge_stderr.previous.jsonl").is_file());\n        assert!(fs::metadata(&log_path).expect("current stderr metadata").len() < 10_000);\n\n        let _ = fs::remove_dir_all(log_dir);\n    }\n\n    #[test]\n    fn stop_child_joins_owned_stderr_logger() {\n        let finished = Arc::new(AtomicBool::new(false));\n        let finished_in_thread = Arc::clone(&finished);\n        let mut runtime = HelperBridgeRuntime::default();\n        runtime.stderr_logger = Some(thread::spawn(move || {\n            thread::sleep(Duration::from_millis(20));\n            finished_in_thread.store(true, Ordering::SeqCst);\n        }));\n\n        stop_child(&mut runtime);\n\n        assert!(finished.load(Ordering::SeqCst));\n        assert!(runtime.stderr_logger.is_none());\n    }\n}\n\n#[cfg(test)]\nmod scheduler_policy_tests {\n''',
        "stderr lifecycle ownership tests",
    )
    write(RUNTIME, runtime)

    paths = read(PATHS)
    paths = replace_once(
        paths,
        '''pub fn helper_stderr_log_path(generation_token: u64) -> PathBuf {\n    helper_bridge_log_dir().join(format!("helper_bridge_stderr_{generation_token}.log"))\n}\n''',
        '''pub fn helper_stderr_log_path() -> PathBuf {\n    helper_bridge_log_dir().join("helper_bridge_stderr.jsonl")\n}\n''',
        "canonical stderr jsonl path",
    )
    write(PATHS, paths)

    bridge = read(BRIDGE)
    bridge = replace_once(
        bridge,
        '''            if let Some(child) = runtime.child.as_mut() {\n                if child.try_wait().ok().flatten().is_some() {\n                    runtime.stdin.take();\n                    runtime.stdout.take();\n                    runtime.child.take();\n                    runtime.state = "stopped".to_string();\n                    runtime.message = "Helper worker process exited.".to_string();\n                    runtime.cuda_ready = false;\n                    runtime.provider_ready = false;\n                    runtime.active_task = None;\n                    runtime.active_request_id = None;\n                    runtime.active_meeting_generation = None;\n                    runtime.active_meeting_session_id = None;\n                    runtime.active_meeting_lane = None;\n                    runtime.updated_unix_ms = unix_ms();\n                }\n            }\n''',
        '''            let child_exited = runtime\n                .child\n                .as_mut()\n                .and_then(|child| child.try_wait().ok().flatten())\n                .is_some();\n            if child_exited {\n                stop_child(&mut runtime);\n                runtime.state = "stopped".to_string();\n                runtime.message = "Helper worker process exited.".to_string();\n                runtime.cuda_ready = false;\n                runtime.provider_ready = false;\n                runtime.active_task = None;\n                runtime.active_request_id = None;\n                runtime.active_meeting_generation = None;\n                runtime.active_meeting_session_id = None;\n                runtime.active_meeting_lane = None;\n                runtime.updated_unix_ms = unix_ms();\n            }\n''',
        "natural child exit logger ownership",
    )
    bridge = replace_once(
        bridge,
        '''            let stderr_log_path = helper_stderr_log_path(runtime.generation_token);\n            if let Some(stderr) = child.stderr.take() {\n                spawn_stderr_logger(stderr, stderr_log_path.clone());\n                runtime.stderr_log_path = Some(slash_path(&stderr_log_path));\n            }\n''',
        '''            let stderr_log_path = helper_stderr_log_path();\n            if let Some(stderr) = child.stderr.take() {\n                runtime.stderr_logger = Some(spawn_stderr_logger(stderr, stderr_log_path.clone()));\n                runtime.stderr_log_path = Some(slash_path(&stderr_log_path));\n            }\n''',
        "owned stderr logger start",
    )
    bridge = replace_once(
        bridge,
        '''                None => {\n                    let _ = child.kill();\n                    let _ = child.wait();\n                    return set_blocked(\n                        &mut runtime,\n                        "Python helper stdin was not available after spawn.",\n                        "helper_bridge:stdin_missing",\n                    );\n                }\n''',
        '''                None => {\n                    let _ = child.kill();\n                    let _ = child.wait();\n                    stop_child(&mut runtime);\n                    return set_blocked(\n                        &mut runtime,\n                        "Python helper stdin was not available after spawn.",\n                        "helper_bridge:stdin_missing",\n                    );\n                }\n''',
        "stdin failure joins stderr logger",
    )
    bridge = replace_once(
        bridge,
        '''                None => {\n                    let _ = child.kill();\n                    let _ = child.wait();\n                    return set_blocked(\n                        &mut runtime,\n                        "Python helper stdout was not available after spawn.",\n                        "helper_bridge:stdout_missing",\n                    );\n                }\n''',
        '''                None => {\n                    let _ = child.kill();\n                    let _ = child.wait();\n                    stop_child(&mut runtime);\n                    return set_blocked(\n                        &mut runtime,\n                        "Python helper stdout was not available after spawn.",\n                        "helper_bridge:stdout_missing",\n                    );\n                }\n''',
        "stdout failure joins stderr logger",
    )
    bridge = replace_once(
        bridge,
        '''            let stdout = BufReader::new(stdout);\n\n            let ping_deadline_ms = worker_response_deadline_ms("ping");\n''',
        '''            let stdout = BufReader::new(stdout);\n            runtime.child = Some(child);\n\n            let ping_deadline_ms = worker_response_deadline_ms("ping");\n''',
        "commit helper child ownership before handshake",
    )
    bridge = replace_once(
        bridge,
        '''            ) {\n                let _ = child.kill();\n                let _ = child.wait();\n                return set_blocked(\n                    &mut runtime,\n                    &format!("Failed to send ping to helper worker: {error}"),\n                    "helper_bridge:ping_write_failed",\n                );\n            }\n''',
        '''            ) {\n                stop_child(&mut runtime);\n                return set_blocked(\n                    &mut runtime,\n                    &format!("Failed to send ping to helper worker: {error}"),\n                    "helper_bridge:ping_write_failed",\n                );\n            }\n''',
        "ping write failure lifecycle",
    )
    bridge = replace_once(
        bridge,
        '''                Err(error) => {\n                    let _ = child.kill();\n                    let _ = child.wait();\n                    return set_blocked(\n                        &mut runtime,\n                        &format!(\n                            "Failed to read helper worker ping response before deadline: {error}"\n                        ),\n                        "helper_bridge:ping_read_failed",\n                    );\n                }\n''',
        '''                Err(error) => {\n                    stop_child(&mut runtime);\n                    return set_blocked(\n                        &mut runtime,\n                        &format!(\n                            "Failed to read helper worker ping response before deadline: {error}"\n                        ),\n                        "helper_bridge:ping_read_failed",\n                    );\n                }\n''',
        "ping read failure lifecycle",
    )
    bridge = replace_once(
        bridge,
        '''            if ping.get("ok").and_then(Value::as_bool) != Some(true) {\n                let _ = child.kill();\n                let _ = child.wait();\n                return set_blocked(\n                    &mut runtime,\n                    "Helper worker ping returned a non-ready response.",\n                    "helper_bridge:ping_not_ok",\n                );\n            }\n''',
        '''            if ping.get("ok").and_then(Value::as_bool) != Some(true) {\n                stop_child(&mut runtime);\n                return set_blocked(\n                    &mut runtime,\n                    "Helper worker ping returned a non-ready response.",\n                    "helper_bridge:ping_not_ok",\n                );\n            }\n''',
        "ping not ok lifecycle",
    )
    bridge = replace_once(
        bridge,
        '''                    Err(error) => {\n                        let _ = child.kill();\n                        let _ = child.wait();\n                        return set_blocked(\n                            &mut runtime,\n                            &format!("Failed to read helper worker status response before deadline: {error}"),\n                            "helper_bridge:status_read_failed",\n                        );\n                    }\n''',
        '''                    Err(error) => {\n                        stop_child(&mut runtime);\n                        return set_blocked(\n                            &mut runtime,\n                            &format!("Failed to read helper worker status response before deadline: {error}"),\n                            "helper_bridge:status_read_failed",\n                        );\n                    }\n''',
        "status read failure lifecycle",
    )
    bridge = replace_once(
        bridge,
        '''            runtime.child = Some(child);\n            runtime.stdin = Some(stdin);\n''',
        '''            runtime.stdin = Some(stdin);\n''',
        "avoid duplicate child ownership",
    )
    write(BRIDGE, bridge)


def closure() -> None:
    text = read(NEXT)
    old = '''## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A4 are source/proof closed. Continue one bounded hardening slice at a time before P2.3.\n\n## Next Step — Backend Hardening Wave A5: Bounded / Redacted Helper stderr Lifecycle\n\nReconcile helper stderr with the existing bounded/redacted logging policy: stop treating raw worker stderr as an unbounded append-only side channel, and make its logger lifecycle terminate with the owned helper process. Keep A5 limited to stderr privacy/disk/lifecycle ownership and targeted proof; do not mix readiness compatibility (A6), Python locking/assets (A7), model execution, scheduler redesign, or audio-route work.\n'''
    new = '''## Backend Hardening Wave A5 — CLOSED\n\nHelper worker stderr now uses the existing bounded/redacted Rust JSONL logging policy instead of a raw append-only side channel. All helper stderr lines pass through `RuntimeLogEvent` compaction/redaction, and the helper uses one canonical `helper_bridge_stderr.jsonl` file with the existing 1 MB rotation policy plus one `.previous.jsonl` file rather than creating an unbounded new raw log for every worker generation.\n\nThe stderr reader is also owned by the helper runtime lifecycle. Its `JoinHandle` is stored with the canonical helper runtime, `stop_child` joins it after the owned worker is terminated, startup-handshake failures release it, and natural child-exit status reconciliation uses the same stop owner. No second logger owner, background log service, process-tree framework, or new logging dependency was added.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nRust helper stderr redaction/rotation tests -> PASS\nRust stderr logger lifecycle ownership test -> PASS\ncargo check                               -> PASS\ncanonical npm ci                          -> PASS\nTauri release build --no-bundle           -> PASS\n```\n\nNo readiness compatibility cleanup, Python dependency locking/assets work, model execution, scheduler redesign, audio-route execution, or user-local-PC testing occurred in Wave A5.\n\n## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A5 are source/proof closed. Continue one bounded hardening slice at a time before P2.3.\n\n## Next Step — Backend Hardening Wave A6: Canonical Worker Readiness Fields\n\nReconcile the active Rust/Python worker-status contract around one canonical readiness vocabulary and remove stale Realtime/Quality compatibility fields from the active bridge. Keep A6 limited to readiness/status compatibility cleanup and targeted proof; do not mix Python dependency locking/assets (A7), model execution, stderr/scheduler redesign, or audio-route work.\n'''
    text = replace_once(text, old, new, "A5 closure and A6 next step")
    write(NEXT, text)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"source", "closure"}:
        raise SystemExit("usage: backend_wave_a5_patch.py source|closure")
    source() if sys.argv[1] == "source" else closure()
