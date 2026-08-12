from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
BRIDGE = ROOT / "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
WORKER = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"
TESTS = ROOT / "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py"
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


def function_block(text: str, name: str) -> tuple[re.Match[str], str]:
    pattern = re.compile(rf"^def {re.escape(name)}\b[\s\S]*?(?=^def |\Z)", re.MULTILINE)
    match = pattern.search(text)
    if match is None:
        raise RuntimeError(f"function not found: {name}")
    return match, match.group(0)


def edit_function(text: str, name: str, replacements: list[tuple[str, str, str]]) -> str:
    match, block = function_block(text, name)
    updated = block
    for old, new, label in replacements:
        updated = replace_once(updated, old, new, f"{name}:{label}")
    return text[: match.start()] + updated + text[match.end() :]


def source() -> None:
    runtime = read(RUNTIME)
    runtime = replace_once(
        runtime,
        "pub const DEFAULT_WORKER_RESPONSE_DEADLINE_MS: u128 = 30_000;\n",
        '''pub const WORKER_CONTROL_RESPONSE_DEADLINE_MS: u128 = 5_000;\npub const WORKER_STATUS_RESPONSE_DEADLINE_MS: u128 = 30_000;\npub const WORKER_PRELOAD_RESPONSE_DEADLINE_MS: u128 = 120_000;\npub const WORKER_INFERENCE_RESPONSE_DEADLINE_MS: u128 = 90_000;\npub const WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS: u128 = 45_000;\npub const WORKER_FALLBACK_RESPONSE_DEADLINE_MS: u128 = WORKER_STATUS_RESPONSE_DEADLINE_MS;\n\npub fn worker_response_deadline_ms(task: &str) -> u128 {\n    match task {\n        "ping" => WORKER_CONTROL_RESPONSE_DEADLINE_MS,\n        "status" | "tts_preflight" => WORKER_STATUS_RESPONSE_DEADLINE_MS,\n        "asr_preload" | "translation_preload" => WORKER_PRELOAD_RESPONSE_DEADLINE_MS,\n        "transcribe" | "translate" => WORKER_INFERENCE_RESPONSE_DEADLINE_MS,\n        "synthesize" => WORKER_SYNTHESIS_RESPONSE_DEADLINE_MS,\n        _ => WORKER_FALLBACK_RESPONSE_DEADLINE_MS,\n    }\n}\n''',
        "deadline constants",
    )

    old_request = '''pub fn request_deadline_payload(payload: &Value) -> Value {\n    let started = unix_ms();\n    let deadline = started.saturating_add(DEFAULT_WORKER_RESPONSE_DEADLINE_MS);\n    let mut payload = payload.clone();\n    if let Some(object) = payload.as_object_mut() {\n        object.entry("request_unix_ms".to_string()).or_insert(json!(started));\n        object\n            .entry("deadline_unix_ms".to_string())\n            .or_insert(json!(deadline));\n        object\n            .entry("deadline_ms".to_string())\n            .or_insert(json!(DEFAULT_WORKER_RESPONSE_DEADLINE_MS));\n    }\n    payload\n}\n\npub fn write_worker_request(stdin: &mut ChildStdin, payload: &Value) -> Result<(), String> {\n    let payload = request_deadline_payload(payload);\n    let body = serde_json::to_string(&payload).map_err(|error| error.to_string())?;\n    stdin\n        .write_all(body.as_bytes())\n        .map_err(|error| error.to_string())?;\n    stdin.write_all(b"\\n").map_err(|error| error.to_string())?;\n    stdin.flush().map_err(|error| error.to_string())\n}\n'''
    new_request = '''pub fn request_deadline_payload(payload: &Value, deadline_ms: u128) -> Value {\n    let started = unix_ms();\n    let deadline = started.saturating_add(deadline_ms);\n    let mut payload = payload.clone();\n    if let Some(object) = payload.as_object_mut() {\n        object.entry("request_unix_ms".to_string()).or_insert(json!(started));\n        object\n            .entry("deadline_unix_ms".to_string())\n            .or_insert(json!(deadline));\n        object\n            .entry("deadline_ms".to_string())\n            .or_insert(json!(deadline_ms));\n    }\n    payload\n}\n\npub fn write_worker_request_with_deadline(\n    stdin: &mut ChildStdin,\n    payload: &Value,\n    deadline_ms: u128,\n) -> Result<(), String> {\n    let payload = request_deadline_payload(payload, deadline_ms);\n    let body = serde_json::to_string(&payload).map_err(|error| error.to_string())?;\n    stdin\n        .write_all(body.as_bytes())\n        .map_err(|error| error.to_string())?;\n    stdin.write_all(b"\\n").map_err(|error| error.to_string())?;\n    stdin.flush().map_err(|error| error.to_string())\n}\n\npub fn write_worker_request(stdin: &mut ChildStdin, payload: &Value) -> Result<(), String> {\n    let task = payload\n        .get("command")\n        .and_then(Value::as_str)\n        .unwrap_or_default();\n    write_worker_request_with_deadline(stdin, payload, worker_response_deadline_ms(task))\n}\n'''
    runtime = replace_once(runtime, old_request, new_request, "request deadline payload")
    runtime = runtime.replace(
        "read_worker_response_direct_with_deadline(stdout, DEFAULT_WORKER_RESPONSE_DEADLINE_MS)",
        "read_worker_response_direct_with_deadline(stdout, WORKER_FALLBACK_RESPONSE_DEADLINE_MS)",
    )

    if "mod deadline_policy_tests" not in runtime:
        runtime += '''\n#[cfg(test)]\nmod deadline_policy_tests {\n    use super::*;\n\n    #[test]\n    fn worker_deadlines_follow_bounded_task_cost_classes() {\n        assert_eq!(worker_response_deadline_ms("ping"), 5_000);\n        assert_eq!(worker_response_deadline_ms("status"), 30_000);\n        assert_eq!(worker_response_deadline_ms("tts_preflight"), 30_000);\n        assert_eq!(worker_response_deadline_ms("asr_preload"), 120_000);\n        assert_eq!(worker_response_deadline_ms("translation_preload"), 120_000);\n        assert_eq!(worker_response_deadline_ms("transcribe"), 90_000);\n        assert_eq!(worker_response_deadline_ms("translate"), 90_000);\n        assert_eq!(worker_response_deadline_ms("synthesize"), 45_000);\n        assert_eq!(worker_response_deadline_ms("unknown"), 30_000);\n    }\n\n    #[test]\n    fn request_metadata_uses_selected_deadline_without_overwriting_caller_metadata() {\n        let deadline_ms = worker_response_deadline_ms("synthesize");\n        let payload = request_deadline_payload(&json!({"command": "synthesize"}), deadline_ms);\n        let started = payload.get("request_unix_ms").and_then(Value::as_u64).unwrap() as u128;\n        let deadline = payload.get("deadline_unix_ms").and_then(Value::as_u64).unwrap() as u128;\n        assert_eq!(payload.get("deadline_ms").and_then(Value::as_u64), Some(45_000));\n        assert_eq!(deadline.saturating_sub(started), deadline_ms);\n\n        let preserved = request_deadline_payload(\n            &json!({\n                "command": "ping",\n                "request_unix_ms": 10_u64,\n                "deadline_unix_ms": 20_u64,\n                "deadline_ms": 10_u64\n            }),\n            worker_response_deadline_ms("ping"),\n        );\n        assert_eq!(preserved.get("request_unix_ms").and_then(Value::as_u64), Some(10));\n        assert_eq!(preserved.get("deadline_unix_ms").and_then(Value::as_u64), Some(20));\n        assert_eq!(preserved.get("deadline_ms").and_then(Value::as_u64), Some(10));\n    }\n}\n'''
    write(RUNTIME, runtime)

    bridge = read(BRIDGE)
    bridge = replace_once(
        bridge,
        '''    clear_active_request, read_worker_response_direct_with_deadline, runtime, set_blocked,\n    spawn_stderr_logger, status_from_runtime, stop_child, unix_ms, write_worker_request,\n    HelperBridgeActionResult, HelperBridgeRequest, HelperBridgeStatus, HelperTaskPriority,\n    DEFAULT_WORKER_RESPONSE_DEADLINE_MS,\n''',
        '''    clear_active_request, read_worker_response_direct_with_deadline, runtime, set_blocked,\n    spawn_stderr_logger, status_from_runtime, stop_child, unix_ms, worker_response_deadline_ms,\n    write_worker_request_with_deadline, HelperBridgeActionResult, HelperBridgeRequest,\n    HelperBridgeStatus, HelperTaskPriority,\n''',
        "helper runtime imports",
    )
    bridge = replace_once(
        bridge,
        "    let request_id = permit.request_id().to_string();\n",
        "    let request_id = permit.request_id().to_string();\n    let response_deadline_ms = worker_response_deadline_ms(task);\n",
        "task deadline selection",
    )
    bridge = replace_once(
        bridge,
        "    if let Err(error) = write_worker_request(&mut stdin, &payload) {\n",
        "    if let Err(error) = write_worker_request_with_deadline(&mut stdin, &payload, response_deadline_ms) {\n",
        "task write deadline",
    )
    bridge = replace_once(
        bridge,
        "        match read_worker_response_direct_with_deadline(stdout, DEFAULT_WORKER_RESPONSE_DEADLINE_MS) {\n",
        "        match read_worker_response_direct_with_deadline(stdout, response_deadline_ms) {\n",
        "task read deadline",
    )

    old_start = '''            if let Err(error) = write_worker_request(&mut stdin, &json!({ "command": "ping" })) {\n                let _ = child.kill();\n                let _ = child.wait();\n                return set_blocked(\n                    &mut runtime,\n                    &format!("Failed to send ping to helper worker: {error}"),\n                    "helper_bridge:ping_write_failed",\n                );\n            }\n            let (ping, mut stdout) = match read_worker_response_direct_with_deadline(\n                stdout,\n                DEFAULT_WORKER_RESPONSE_DEADLINE_MS,\n            ) {\n                Ok((value, stdout)) => (value, stdout),\n                Err(error) => {\n                    let _ = child.kill();\n                    let _ = child.wait();\n                    return set_blocked(\n                        &mut runtime,\n                        &format!("Failed to read helper worker ping response before deadline: {error}"),\n                        "helper_bridge:ping_read_failed",\n                    );\n                }\n            };\n'''
    new_start = '''            let ping_deadline_ms = worker_response_deadline_ms("ping");\n            if let Err(error) = write_worker_request_with_deadline(\n                &mut stdin,\n                &json!({ "command": "ping" }),\n                ping_deadline_ms,\n            ) {\n                let _ = child.kill();\n                let _ = child.wait();\n                return set_blocked(\n                    &mut runtime,\n                    &format!("Failed to send ping to helper worker: {error}"),\n                    "helper_bridge:ping_write_failed",\n                );\n            }\n            let (ping, mut stdout) =\n                match read_worker_response_direct_with_deadline(stdout, ping_deadline_ms) {\n                    Ok((value, stdout)) => (value, stdout),\n                    Err(error) => {\n                        let _ = child.kill();\n                        let _ = child.wait();\n                        return set_blocked(\n                            &mut runtime,\n                            &format!("Failed to read helper worker ping response before deadline: {error}"),\n                            "helper_bridge:ping_read_failed",\n                        );\n                    }\n                };\n'''
    bridge = replace_once(bridge, old_start, new_start, "startup ping deadline")

    old_status = '''            let status = if write_worker_request(&mut stdin, &json!({ "command": "status" })).is_ok() {\n                match read_worker_response_direct_with_deadline(\n                    stdout,\n                    DEFAULT_WORKER_RESPONSE_DEADLINE_MS,\n                ) {\n                    Ok((value, next_stdout)) => {\n                        stdout = next_stdout;\n                        Some(value)\n                    }\n                    Err(error) => {\n                        let _ = child.kill();\n                        let _ = child.wait();\n                        return set_blocked(\n                            &mut runtime,\n                            &format!("Failed to read helper worker status response before deadline: {error}"),\n                            "helper_bridge:status_read_failed",\n                        );\n                    }\n                }\n            } else {\n                None\n            };\n'''
    new_status = '''            let status_deadline_ms = worker_response_deadline_ms("status");\n            let status = if write_worker_request_with_deadline(\n                &mut stdin,\n                &json!({ "command": "status" }),\n                status_deadline_ms,\n            )\n            .is_ok()\n            {\n                match read_worker_response_direct_with_deadline(stdout, status_deadline_ms) {\n                    Ok((value, next_stdout)) => {\n                        stdout = next_stdout;\n                        Some(value)\n                    }\n                    Err(error) => {\n                        let _ = child.kill();\n                        let _ = child.wait();\n                        return set_blocked(\n                            &mut runtime,\n                            &format!("Failed to read helper worker status response before deadline: {error}"),\n                            "helper_bridge:status_read_failed",\n                        );\n                    }\n                }\n            } else {\n                None\n            };\n'''
    bridge = replace_once(bridge, old_status, new_status, "startup status deadline")
    write(BRIDGE, bridge)

    worker = read(WORKER)
    worker = replace_once(
        worker,
        "MAX_REASONABLE_MODEL_TOKEN_LIMIT = 1_000_000\n",
        '''MAX_REASONABLE_MODEL_TOKEN_LIMIT = 1_000_000\nGPU_PROBE_TIMEOUT_SECONDS = 3.0\nSAPI_PROBE_TIMEOUT_SECONDS = 8.0\nPIPER_SYNTHESIS_TIMEOUT_SECONDS = 10.0\nSAPI_SYNTHESIS_TIMEOUT_SECONDS = 30.0\nREQUEST_SUBPROCESS_RESERVE_MS = 500\n''',
        "worker probe ceilings",
    )
    worker = replace_once(
        worker,
        '''def now_ms() -> int:\n    return int(time.time() * 1000)\n\n\n''',
        '''def now_ms() -> int:\n    return int(time.time() * 1000)\n\n\ndef request_deadline_remaining_ms(payload: dict[str, Any] | None) -> int | None:\n    if not isinstance(payload, dict):\n        return None\n    try:\n        deadline = int(payload.get("deadline_unix_ms", 0))\n    except (TypeError, ValueError):\n        return None\n    if deadline <= 0:\n        return None\n    return max(0, deadline - now_ms())\n\n\ndef request_deadline_expired(payload: dict[str, Any] | None) -> bool:\n    remaining = request_deadline_remaining_ms(payload)\n    return remaining is not None and remaining <= 0\n\n\ndef bounded_subprocess_timeout_seconds(\n    payload: dict[str, Any] | None,\n    ceiling_seconds: float,\n    reserve_ms: int = REQUEST_SUBPROCESS_RESERVE_MS,\n) -> float:\n    remaining = request_deadline_remaining_ms(payload)\n    if remaining is None:\n        return ceiling_seconds\n    usable_ms = max(100, remaining - max(0, reserve_ms))\n    return min(ceiling_seconds, usable_ms / 1000.0)\n\n\n''',
        "request budget helpers",
    )

    match, _ = function_block(worker, "nvidia_smi_available")
    new_nvidia = '''def nvidia_smi_available(payload: dict[str, Any] | None = None) -> bool:\n    try:\n        completed = subprocess.run(\n            ["nvidia-smi", "-L"],\n            text=True,\n            capture_output=True,\n            timeout=bounded_subprocess_timeout_seconds(\n                payload, GPU_PROBE_TIMEOUT_SECONDS\n            ),\n            check=False,\n        )\n        return completed.returncode == 0 and bool(completed.stdout.strip())\n    except Exception:\n        return False\n\n\n'''
    worker = worker[: match.start()] + new_nvidia + worker[match.end() :]

    worker = edit_function(
        worker,
        "probe_gpu_runtime",
        [
            (
                "def probe_gpu_runtime() -> dict[str, Any]:",
                "def probe_gpu_runtime(payload: dict[str, Any] | None = None) -> dict[str, Any]:",
                "signature",
            ),
            ("\"nvidia_smi_available\": nvidia_smi_available(),", "\"nvidia_smi_available\": nvidia_smi_available(payload),", "nvidia budget"),
        ],
    )

    match, _ = function_block(worker, "sapi_status")
    new_sapi = '''def sapi_status(\n    payload: dict[str, Any] | None = None,\n) -> tuple[bool, list[dict[str, str]], str]:\n    global SAPI_STATUS\n    if SAPI_STATUS is not None:\n        return SAPI_STATUS\n    if sys.platform != "win32":\n        SAPI_STATUS = (False, [], "tts:windows_sapi_unavailable")\n        return SAPI_STATUS\n\n    command = (\n        "Add-Type -AssemblyName System.Speech; "\n        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "\n        "$voices = @($s.GetInstalledVoices() | ForEach-Object { "\n        "@{name=$_.VoiceInfo.Name; culture=$_.VoiceInfo.Culture.Name} }); "\n        "$s.Dispose(); "\n        "@{voices=$voices} | ConvertTo-Json -Compress -Depth 4"\n    )\n    try:\n        completed = subprocess.run(\n            ["powershell", "-NoProfile", "-NonInteractive", "-Command", command],\n            text=True,\n            capture_output=True,\n            timeout=bounded_subprocess_timeout_seconds(\n                payload, SAPI_PROBE_TIMEOUT_SECONDS\n            ),\n            check=False,\n        )\n        if completed.returncode != 0:\n            SAPI_STATUS = (\n                False,\n                [],\n                completed.stderr.strip() or "tts:sapi_probe_failed",\n            )\n        else:\n            payload_json = json.loads(completed.stdout.strip())\n            voices = normalize_sapi_voices(payload_json.get("voices", []))\n            SAPI_STATUS = (bool(voices), voices, "")\n    except subprocess.TimeoutExpired:\n        # A request-budget timeout is transient. Do not poison the process-wide\n        # capability cache; a later explicit TTS preflight may have more budget.\n        return False, [], "tts:sapi_probe_timeout"\n    except Exception as exc:\n        SAPI_STATUS = (False, [], f"{type(exc).__name__}:{exc}")\n    return SAPI_STATUS\n\n\n'''
    match, _ = function_block(worker, "sapi_status")
    worker = worker[: match.start()] + new_sapi + worker[match.end() :]

    worker = edit_function(
        worker,
        "select_english_tts_voice",
        [
            (
                "def select_english_tts_voice() -> dict[str, Any]:",
                "def select_english_tts_voice(payload: dict[str, Any] | None = None) -> dict[str, Any]:",
                "signature",
            ),
            ("sapi_probe_ready, sapi_voices, sapi_error = sapi_status()", "sapi_probe_ready, sapi_voices, sapi_error = sapi_status(payload)", "sapi budget"),
        ],
    )

    worker = edit_function(
        worker,
        "build_status_payload",
        [
            (
                "def build_status_payload() -> dict[str, Any]:",
                "def build_status_payload(payload: dict[str, Any] | None = None) -> dict[str, Any]:",
                "signature",
            ),
            ("gpu_runtime = probe_gpu_runtime()", "gpu_runtime = probe_gpu_runtime(payload)", "gpu budget"),
            ("tts_selection = select_english_tts_voice()", "tts_selection = select_english_tts_voice(payload)", "tts budget"),
        ],
    )
    worker = edit_function(
        worker,
        "handle_status",
        [("return build_status_payload()", "return build_status_payload(_)", "status payload")],
    )
    worker = edit_function(
        worker,
        "asr_runtime_config",
        [
            (
                "def asr_runtime_config() -> tuple[str, str, str]:",
                "def asr_runtime_config(payload: dict[str, Any] | None = None) -> tuple[str, str, str]:",
                "signature",
            ),
            ("gpu_runtime = probe_gpu_runtime()", "gpu_runtime = probe_gpu_runtime(payload)", "gpu budget"),
        ],
    )
    worker = edit_function(
        worker,
        "get_asr_runtime",
        [
            ("def get_asr_runtime() -> Any:", "def get_asr_runtime(payload: dict[str, Any] | None = None) -> Any:", "signature"),
            ("device, compute_type, _fallback_reason = asr_runtime_config()", "device, compute_type, _fallback_reason = asr_runtime_config(payload)", "runtime config budget"),
        ],
    )
    worker = edit_function(
        worker,
        "handle_asr_preload",
        [
            ("def handle_asr_preload(_: dict[str, Any]) -> dict[str, Any]:", "def handle_asr_preload(payload: dict[str, Any]) -> dict[str, Any]:", "signature"),
            ("status = build_status_payload()", "status = build_status_payload(payload)", "status budget"),
            ("get_asr_runtime()", "get_asr_runtime(payload)", "model config budget"),
        ],
    )
    worker = edit_function(
        worker,
        "handle_transcribe",
        [("model = get_asr_runtime()", "model = get_asr_runtime(payload)", "ASR runtime budget")],
    )
    worker = edit_function(
        worker,
        "handle_translation_preload",
        [("status = build_status_payload()", "status = build_status_payload(payload)", "status budget")],
    )
    worker = edit_function(
        worker,
        "handle_tts_preflight",
        [
            ("def handle_tts_preflight(_: dict[str, Any]) -> dict[str, Any]:", "def handle_tts_preflight(payload: dict[str, Any]) -> dict[str, Any]:", "signature"),
            ("selection = select_english_tts_voice()", "selection = select_english_tts_voice(payload)", "TTS probe budget"),
        ],
    )
    worker = edit_function(
        worker,
        "handle_synthesize",
        [
            ("selection = select_english_tts_voice()", "selection = select_english_tts_voice(payload)", "TTS selection budget"),
            ("timeout=10,", "timeout=bounded_subprocess_timeout_seconds(\n                    payload, PIPER_SYNTHESIS_TIMEOUT_SECONDS\n                ),", "Piper timeout"),
            ("timeout=30,", "timeout=bounded_subprocess_timeout_seconds(\n                payload, SAPI_SYNTHESIS_TIMEOUT_SECONDS\n            ),", "SAPI timeout"),
        ],
    )

    main_match, main_block = function_block(worker, "main")
    main_block = replace_once(
        main_block,
        '''            command = safe_command_name(request.get("command", "status"))\n            handler = HANDLERS.get(command)\n''',
        '''            command = safe_command_name(request.get("command", "status"))\n            if request_deadline_expired(request):\n                respond(\n                    {\n                        "ok": False,\n                        "stage": command or "worker_request",\n                        "blocker": "worker:request_deadline_expired",\n                        "note": "The request reached the worker after its host deadline and was not executed.",\n                    }\n                )\n                continue\n            handler = HANDLERS.get(command)\n''',
        "main request expiry guard",
    )
    worker = worker[: main_match.start()] + main_block + worker[main_match.end() :]
    write(WORKER, worker)

    tests = read(TESTS)
    if "test_worker_request_deadline_budget_bounds_nested_subprocess" not in tests:
        tests += '''\n\ndef test_worker_request_deadline_budget_bounds_nested_subprocess(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(worker, "now_ms", lambda: 10_000)\n    payload = {"deadline_unix_ms": 12_000}\n\n    assert worker.request_deadline_remaining_ms(payload) == 2_000\n    assert worker.request_deadline_expired(payload) is False\n    assert worker.bounded_subprocess_timeout_seconds(payload, 8.0) == 1.5\n\n    expired = {"deadline_unix_ms": 9_999}\n    assert worker.request_deadline_expired(expired) is True\n    assert worker.bounded_subprocess_timeout_seconds(expired, 8.0) == 0.1\n\n\ndef test_sapi_probe_timeout_does_not_poison_process_cache(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(worker.sys, "platform", "win32")\n    monkeypatch.setattr(worker, "SAPI_STATUS", None)\n\n    def timed_out(*_args, **_kwargs):\n        raise subprocess.TimeoutExpired(cmd="powershell", timeout=1)\n\n    monkeypatch.setattr(worker.subprocess, "run", timed_out)\n    ready, voices, blocker = worker.sapi_status({"deadline_unix_ms": worker.now_ms() + 2_000})\n\n    assert ready is False\n    assert voices == []\n    assert blocker == "tts:sapi_probe_timeout"\n    assert worker.SAPI_STATUS is None\n\n\ndef test_newline_protocol_rejects_already_expired_request() -> None:\n    completed = subprocess.run(\n        [sys.executable, str(WORKER_PATH)],\n        input='{"command":"ping","deadline_unix_ms":1,"deadline_ms":5000}\\n',\n        text=True,\n        capture_output=True,\n        timeout=5,\n        check=False,\n    )\n\n    assert completed.returncode == 0\n    payload = json.loads(completed.stdout.strip())\n    assert payload["ok"] is False\n    assert payload["stage"] == "ping"\n    assert payload["blocker"] == "worker:request_deadline_expired"\n'''
    write(TESTS, tests)


def closure() -> None:
    next_action = read(NEXT)
    marker = "## Current Mode\n"
    if marker not in next_action:
        raise RuntimeError("next-action Current Mode marker missing")
    if "## Backend Hardening Wave A3 — CLOSED" not in next_action:
        closure_text = '''## Backend Hardening Wave A3 — CLOSED\n\nThe helper bridge no longer uses one 30-second response deadline for every worker command. The canonical Rust bridge selects a bounded task-cost class and writes that exact deadline into request metadata before waiting with the same host ceiling: ping/control 5s, status/TTS preflight 30s, model preload 120s, inference 90s, and synthesis 45s. Unknown commands fail back to the bounded status ceiling rather than receiving an unbounded wait.\n\nThe Python worker now consumes the host deadline as a real request budget. Already-expired requests are rejected before handler execution. Nested `nvidia-smi`, Windows SAPI capability probing, Piper synthesis, and SAPI synthesis use a timeout capped by the request's remaining budget. GPU probe is capped at 3s and SAPI capability probe at 8s, so ordinary status cannot spend its whole host envelope inside nested subprocesses. A SAPI probe timeout is treated as transient and is not cached process-wide. Model loading/inference still remains under the outer task deadline; no watchdog/thread framework or second worker was added.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nRust task-deadline policy tests       -> PASS\nPython worker contract/deadline tests -> PASS\nPython compileall                     -> PASS\ncargo check                           -> PASS\nTauri release build --no-bundle       -> PASS\n```\n\nNo real model inference, scheduler admission change, stderr/logging change, readiness compatibility cleanup, Python dependency locking, audio-device execution, or user-local-PC testing occurred in Wave A3.\n\n'''
        next_action = next_action.replace(marker, closure_text + marker, 1)
    next_action = re.sub(
        r"## Current Mode\n[\s\S]*?## Next Step — Backend Hardening Wave A3: Task-Aware Helper Deadlines \+ Bounded Status Probing\n[\s\S]*?\Z",
        '''## Current Mode\n\n**Maintenance / Backend Hardening Wave A** — Waves A1-A3 are source/proof closed. Continue one bounded hardening slice at a time before P2.3.\n\n## Next Step — Backend Hardening Wave A4: Bounded Scheduler Admission / Wait\n\nBound the existing single-worker priority scheduler so waiting callers cannot accumulate indefinitely: add a small total admission cap and priority-aware wait deadline while preserving `Meeting outbound > Meeting incoming > Text > diagnostics`. Requests that cannot be admitted in time must return a truthful scheduler blocker without spawning another worker or retry loop. Keep A4 limited to scheduler admission/wait and targeted tests; do not mix stderr lifecycle (A5), readiness compatibility (A6), Python locking/assets (A7), model execution, or audio-route work.\n''',
        next_action,
        count=1,
    )
    write(NEXT, next_action)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"source", "closure"}:
        raise SystemExit("usage: backend_wave_a3_patch.py source|closure")
    source() if sys.argv[1] == "source" else closure()
