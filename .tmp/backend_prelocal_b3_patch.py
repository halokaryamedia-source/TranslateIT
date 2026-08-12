from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, body: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(body, encoding="utf-8", newline="\n")


def replace_once(body: str, old: str, new: str, label: str) -> str:
    count = body.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return body.replace(old, new, 1)


def regex_once(body: str, pattern: str, new: str, label: str) -> str:
    updated, count = re.subn(pattern, new, body, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


# ---------------------------------------------------------------------------
# Python WorkerRuntime: routine status must not spawn nvidia-smi.
# ---------------------------------------------------------------------------
worker_path = "EngineData/Backend/LocalWorker/WorkerRuntime/realtime_local_worker.py"
worker = read(worker_path)
worker = replace_once(worker, "GPU_PROBE_TIMEOUT_SECONDS = 3.0\n", "", "remove nvidia-smi timeout")
worker = regex_once(
    worker,
    r"\ndef nvidia_smi_available\(payload: dict\[str, Any\] \| None = None\) -> bool:\n.*?\n\ndef probe_gpu_runtime",
    "\n\ndef probe_gpu_runtime",
    "remove nvidia-smi routine probe",
)
worker = replace_once(
    worker,
    '        "nvidia_smi_available": nvidia_smi_available(payload),\n',
    "",
    "remove nested nvidia-smi status field",
)
worker = replace_once(
    worker,
    '        "nvidia_smi_available": bool(gpu_runtime["nvidia_smi_available"]),\n',
    "",
    "remove top-level nvidia-smi status field",
)
if "nvidia-smi" in worker or "nvidia_smi_available" in worker:
    raise RuntimeError("worker still contains routine nvidia-smi ownership")
write(worker_path, worker)


tests_path = "EngineData/Backend/LocalWorker/WorkerRuntime/tests/test_worker_contract.py"
tests = read(tests_path)
tests = replace_once(
    tests,
    '            "nvidia_smi_available": True,\n',
    "",
    "remove mocked nvidia-smi field",
)
monkeypatch_line = '    monkeypatch.setattr(worker, "nvidia_smi_available", lambda _payload=None: False)\n\n'
if tests.count(monkeypatch_line) != 2:
    raise RuntimeError(f"expected two nvidia-smi monkeypatches, found {tests.count(monkeypatch_line)}")
tests = tests.replace(monkeypatch_line, "")
insert_before = "def test_gpu_probe_uses_cpu_only_for_known_unavailable_capability(monkeypatch) -> None:\n"
new_test = '''def test_routine_gpu_probe_does_not_spawn_external_nvidia_smi(monkeypatch) -> None:\n    worker = load_worker_module()\n    monkeypatch.setattr(\n        worker,\n        "torch_status",\n        lambda: {\n            "import_ready": True,\n            "cuda_probe_ok": True,\n            "cuda_available": False,\n            "blocker": "",\n        },\n    )\n    monkeypatch.setattr(\n        worker,\n        "ctranslate2_status",\n        lambda: {\n            "import_ready": True,\n            "cuda_probe_ok": True,\n            "cuda_available": False,\n            "blocker": "",\n        },\n    )\n\n    def unexpected_subprocess(*_args, **_kwargs):\n        raise AssertionError("routine GPU capability status must not spawn subprocesses")\n\n    monkeypatch.setattr(worker.subprocess, "run", unexpected_subprocess)\n    gpu = worker.probe_gpu_runtime({})\n\n    assert gpu["cuda_capability_known"] is True\n    assert gpu["cpu_fallback_active"] is True\n    assert gpu["fallback_reason"] == "cuda_unavailable"\n    assert "nvidia_smi_available" not in gpu\n\n\n'''
tests = replace_once(tests, insert_before, new_test + insert_before, "add subprocess-free GPU probe test")
write(tests_path, tests)


# ---------------------------------------------------------------------------
# Virtual route: internal reads are side-effect-free; explicit Tauri status writes evidence.
# Also expose the generation-bound output name without hardware enumeration.
# ---------------------------------------------------------------------------
route_path = "EngineData/Frontend/RustApp/src-tauri/src/commands/virtual_mic_route.rs"
route = read(route_path)
route = replace_once(
    route,
    '''    status.route_output_contract_json = route_output_contract_json(&status);\n    status.evidence_path = write_route_evidence(&status);\n    status\n}\n''',
    '''    status.route_output_contract_json = route_output_contract_json(&status);\n    status\n}\n\nfn with_route_evidence(mut status: VirtualMicRouteContractStatus) -> VirtualMicRouteContractStatus {\n    status.evidence_path = write_route_evidence(&status);\n    status\n}\n''',
    "make internal route status side-effect free",
)
getter_anchor = "pub fn get_virtual_mic_route_selection() -> VirtualMicRouteContractStatus {\n"
getter = '''pub fn get_bound_virtual_mic_output_device(generation: u64) -> Result<String, String> {\n    if active_application_meeting_generation() != Some(generation) {\n        return Err("virtual_mic:meeting_route_generation_not_active".to_string());\n    }\n    let mut selection = selection_runtime()\n        .lock()\n        .map_err(|_| "virtual_mic:meeting_route_selection_lock_failed".to_string())?;\n    let Some(prepared) = selection.as_mut() else {\n        return Err("virtual_mic:prepared_route_pair_missing".to_string());\n    };\n    match prepared.generation {\n        Some(existing) if existing != generation => {\n            Err("virtual_mic:prepared_route_pair_bound_to_other_generation".to_string())\n        }\n        _ => {\n            prepared.generation = Some(generation);\n            Ok(prepared.output_device.clone())\n        }\n    }\n}\n\n'''
route = replace_once(route, getter_anchor, getter + getter_anchor, "add cheap generation-bound route getter")
route = replace_once(
    route,
    '''#[tauri::command]\npub fn get_virtual_mic_route_contract_status() -> VirtualMicRouteContractStatus {\n    get_virtual_mic_route_selection()\n}\n''',
    '''#[tauri::command]\npub fn get_virtual_mic_route_contract_status() -> VirtualMicRouteContractStatus {\n    with_route_evidence(get_virtual_mic_route_selection())\n}\n\n#[cfg(test)]\nmod b3_route_hot_path_tests {\n    use super::{status_from_selection, RouteSelection};\n\n    #[test]\n    fn internal_route_status_does_not_write_evidence() {\n        let status = status_from_selection(\n            Vec::new(),\n            Vec::new(),\n            RouteSelection {\n                route_pair_id: None,\n                selected_output_device: None,\n                selected_input_device: None,\n                output_device_found: false,\n                input_device_found: false,\n                blocker: "virtual_mic:matched_route_pair_missing".to_string(),\n            },\n            "b3_internal_route_status",\n        );\n\n        assert!(status.evidence_path.is_none());\n        assert!(!status.route_ready);\n    }\n}\n''',
    "make public route evidence explicit and add test",
)
write(route_path, route)


# ---------------------------------------------------------------------------
# Native Meeting output: reuse the prepared CPAL Device instead of enumerating
# the Windows output list again for every synthesized utterance.
# ---------------------------------------------------------------------------
output_path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/meeting_output.rs"
output = read(output_path)
output = replace_once(
    output,
    '''#[derive(Clone)]\nstruct MeetingOutputCancelControl {\n    generation: u64,\n    cancel_requested: Arc<AtomicBool>,\n}\n\nstatic MEETING_OUTPUT_CANCEL_CONTROL: OnceLock<Mutex<Option<MeetingOutputCancelControl>>> =\n    OnceLock::new();\n''',
    '''#[derive(Clone)]\nstruct MeetingOutputCancelControl {\n    generation: u64,\n    cancel_requested: Arc<AtomicBool>,\n}\n\n#[derive(Clone)]\nstruct PreparedMeetingOutputDevice {\n    name: String,\n    device: cpal::Device,\n}\n\nstatic MEETING_OUTPUT_CANCEL_CONTROL: OnceLock<Mutex<Option<MeetingOutputCancelControl>>> =\n    OnceLock::new();\nstatic PREPARED_MEETING_OUTPUT_DEVICE: OnceLock<Mutex<Option<PreparedMeetingOutputDevice>>> =\n    OnceLock::new();\n''',
    "add prepared CPAL output owner",
)
output = replace_once(
    output,
    '''fn cancel_control() -> &'static Mutex<Option<MeetingOutputCancelControl>> {\n    MEETING_OUTPUT_CANCEL_CONTROL.get_or_init(|| Mutex::new(None))\n}\n''',
    '''fn cancel_control() -> &'static Mutex<Option<MeetingOutputCancelControl>> {\n    MEETING_OUTPUT_CANCEL_CONTROL.get_or_init(|| Mutex::new(None))\n}\n\nfn prepared_output_device_store() -> &'static Mutex<Option<PreparedMeetingOutputDevice>> {\n    PREPARED_MEETING_OUTPUT_DEVICE.get_or_init(|| Mutex::new(None))\n}\n''',
    "add prepared CPAL output store",
)
output = replace_once(
    output,
    '''pub fn prepare_meeting_output_device(requested_name: &str) -> Result<(), String> {\n    let device = find_output_device(requested_name)?;\n    let config = device\n        .default_output_config()\n        .map_err(|_| "meeting_output:default_output_config_unavailable".to_string())?;\n    let channels = config.channels();\n    let sample_rate = config.sample_rate().0;\n    if channels == 0 || channels > MAX_OUTPUT_CHANNELS {\n        return Err("meeting_output:unsupported_output_channel_count".to_string());\n    }\n    if !(MIN_OUTPUT_SAMPLE_RATE_HZ..=MAX_OUTPUT_SAMPLE_RATE_HZ).contains(&sample_rate) {\n        return Err("meeting_output:unsupported_output_sample_rate".to_string());\n    }\n    match config.sample_format() {\n        cpal::SampleFormat::F32 | cpal::SampleFormat::I16 | cpal::SampleFormat::U16 => Ok(()),\n        other => Err(format!(\n            "meeting_output:unsupported_output_sample_format:{other:?}"\n        )),\n    }\n}\n''',
    '''pub fn prepare_meeting_output_device(requested_name: &str) -> Result<(), String> {\n    let requested_name = requested_name.trim();\n    let device = find_output_device(requested_name)?;\n    let config = device\n        .default_output_config()\n        .map_err(|_| "meeting_output:default_output_config_unavailable".to_string())?;\n    let channels = config.channels();\n    let sample_rate = config.sample_rate().0;\n    if channels == 0 || channels > MAX_OUTPUT_CHANNELS {\n        return Err("meeting_output:unsupported_output_channel_count".to_string());\n    }\n    if !(MIN_OUTPUT_SAMPLE_RATE_HZ..=MAX_OUTPUT_SAMPLE_RATE_HZ).contains(&sample_rate) {\n        return Err("meeting_output:unsupported_output_sample_rate".to_string());\n    }\n    match config.sample_format() {\n        cpal::SampleFormat::F32 | cpal::SampleFormat::I16 | cpal::SampleFormat::U16 => {}\n        other => {\n            return Err(format!(\n                "meeting_output:unsupported_output_sample_format:{other:?}"\n            ))\n        }\n    }\n\n    let mut prepared = prepared_output_device_store()\n        .lock()\n        .map_err(|_| "meeting_output:prepared_device_state_lock_failed".to_string())?;\n    *prepared = Some(PreparedMeetingOutputDevice {\n        name: requested_name.to_string(),\n        device,\n    });\n    Ok(())\n}\n\nfn prepared_output_device(requested_name: &str) -> Result<cpal::Device, String> {\n    let requested_name = requested_name.trim();\n    let prepared = prepared_output_device_store()\n        .lock()\n        .map_err(|_| "meeting_output:prepared_device_state_lock_failed".to_string())?;\n    let Some(prepared) = prepared.as_ref() else {\n        return Err("meeting_output:prepared_output_device_missing".to_string());\n    };\n    if prepared.name != requested_name {\n        return Err("meeting_output:prepared_output_device_mismatch".to_string());\n    }\n    Ok(prepared.device.clone())\n}\n\npub fn clear_prepared_meeting_output_device() {\n    if let Ok(mut prepared) = prepared_output_device_store().lock() {\n        *prepared = None;\n    }\n}\n''',
    "persist prepared CPAL output device",
)
output = replace_once(
    output,
    "    let device = match find_output_device(output_name) {\n",
    "    let device = match prepared_output_device(output_name) {\n",
    "reuse prepared device during utterance delivery",
)
write(output_path, output)


# ---------------------------------------------------------------------------
# Meeting orchestration: generation-bound preflight snapshot makes recurring
# status cheap; optional incoming activation no longer blocks required Start.
# ---------------------------------------------------------------------------
meeting_path = "EngineData/Frontend/RustApp/src-tauri/src/commands/meeting_session.rs"
meeting = read(meeting_path)
meeting = replace_once(
    meeting,
    '''use crate::engine::audio::meeting_output::{\n    cancel_meeting_output_for_generation, deliver_meeting_output_wav, prepare_meeting_output_device,\n};\n''',
    '''use crate::engine::audio::meeting_output::{\n    cancel_meeting_output_for_generation, clear_prepared_meeting_output_device,\n    deliver_meeting_output_wav, prepare_meeting_output_device,\n};\n''',
    "import prepared output cleanup",
)
meeting = replace_once(
    meeting,
    '''use super::virtual_mic_route::{\n    get_virtual_mic_route_contract_status, get_virtual_mic_route_selection,\n};\n''',
    '''use super::virtual_mic_route::{\n    get_bound_virtual_mic_output_device, get_virtual_mic_route_selection,\n};\n''',
    "use cheap bound route getter",
)
meeting = replace_once(
    meeting,
    '''struct MeetingSelfOutputSuppression {\n    session_id: String,\n    active: Arc<AtomicBool>,\n}\n''',
    '''struct MeetingSelfOutputSuppression {\n    session_id: String,\n    active: Arc<AtomicBool>,\n}\n\nstruct MeetingStartPreflightRuntime {\n    generation: u64,\n    status: MeetingSessionPreflightStatus,\n}\n''',
    "add generation-bound preflight runtime",
)
meeting = replace_once(
    meeting,
    '''static MEETING_SELF_OUTPUT_SUPPRESSION: OnceLock<Mutex<Option<MeetingSelfOutputSuppression>>> =\n    OnceLock::new();\n''',
    '''static MEETING_SELF_OUTPUT_SUPPRESSION: OnceLock<Mutex<Option<MeetingSelfOutputSuppression>>> =\n    OnceLock::new();\nstatic MEETING_START_PREFLIGHT: OnceLock<Mutex<Option<MeetingStartPreflightRuntime>>> =\n    OnceLock::new();\n''',
    "add preflight snapshot store",
)
meeting = replace_once(
    meeting,
    '''fn suppression_store() -> &'static Mutex<Option<MeetingSelfOutputSuppression>> {\n    MEETING_SELF_OUTPUT_SUPPRESSION.get_or_init(|| Mutex::new(None))\n}\n''',
    '''fn suppression_store() -> &'static Mutex<Option<MeetingSelfOutputSuppression>> {\n    MEETING_SELF_OUTPUT_SUPPRESSION.get_or_init(|| Mutex::new(None))\n}\n\nfn start_preflight_store() -> &'static Mutex<Option<MeetingStartPreflightRuntime>> {\n    MEETING_START_PREFLIGHT.get_or_init(|| Mutex::new(None))\n}\n\nfn remember_start_preflight(generation: u64, status: MeetingSessionPreflightStatus) {\n    if let Ok(mut guard) = start_preflight_store().lock() {\n        *guard = Some(MeetingStartPreflightRuntime { generation, status });\n    }\n}\n\nfn current_start_preflight(generation: u64) -> Option<MeetingSessionPreflightStatus> {\n    start_preflight_store()\n        .lock()\n        .ok()\n        .and_then(|guard| {\n            guard\n                .as_ref()\n                .filter(|snapshot| snapshot.generation == generation)\n                .map(|snapshot| snapshot.status.clone())\n        })\n}\n\nfn clear_start_preflight_for_generation(generation: u64) {\n    if let Ok(mut guard) = start_preflight_store().lock() {\n        if guard.as_ref().map(|snapshot| snapshot.generation) == Some(generation) {\n            *guard = None;\n        }\n    }\n}\n\nfn clear_all_start_preflight() {\n    if let Ok(mut guard) = start_preflight_store().lock() {\n        *guard = None;\n    }\n}\n''',
    "add preflight snapshot lifecycle",
)
meeting = replace_once(
    meeting,
    "    let route = get_virtual_mic_route_contract_status();\n",
    "    let route = get_virtual_mic_route_selection();\n",
    "internal preflight must not write route evidence",
)
meeting = replace_once(
    meeting,
    '''fn current_status() -> MeetingSessionStatus {\n    status_from_report(latest_runtime_session_state(), build_preflight())\n}\n''',
    '''fn preflight_for_report(report: &RuntimeSessionStateReport) -> MeetingSessionPreflightStatus {\n    if let Some(snapshot) = report.snapshot.as_ref() {\n        if snapshot.owner_id == APPLICATION_MEETING_OWNER_ID {\n            if let Some(cached) = current_start_preflight(snapshot.generation) {\n                return cached;\n            }\n        }\n    }\n    build_preflight()\n}\n\nfn current_status() -> MeetingSessionStatus {\n    let report = latest_runtime_session_state();\n    let preflight = preflight_for_report(&report);\n    status_from_report(report, preflight)\n}\n''',
    "use generation-bound preflight during active polling",
)
meeting = replace_once(
    meeting,
    '''    let route_selection = get_virtual_mic_route_selection();\n    let route = deliver_meeting_output_wav(\n        &tts_path,\n        route_selection.selected_output_device.as_deref(),\n        generation,\n    );\n''',
    '''    let bound_output_device = get_bound_virtual_mic_output_device(generation);\n    let bound_route_blocker = bound_output_device.as_ref().err().cloned();\n    let route = deliver_meeting_output_wav(\n        &tts_path,\n        bound_output_device.as_deref().ok(),\n        generation,\n    );\n''',
    "remove per-utterance route discovery",
)
meeting = replace_once(
    meeting,
    '''        let blocker = if route.blocker.is_empty() {\n            "meeting_outbound:meeting_route_delivery_failed".to_string()\n        } else {\n            route.blocker\n        };\n''',
    '''        let blocker = bound_route_blocker.unwrap_or_else(|| {\n            if route.blocker.is_empty() {\n                "meeting_outbound:meeting_route_delivery_failed".to_string()\n            } else {\n                route.blocker\n            }\n        });\n''',
    "preserve bound route blocker",
)
meeting = regex_once(
    meeting,
    r"fn start_optional_incoming_lane\(session_id: &str\) -> String \{.*?\n\}\n\n#\[tauri::command\]\npub fn get_meeting_session_status",
    '''fn start_optional_incoming_lane(session_id: &str) -> String {\n    if !incoming_session_is_eligible(session_id) {\n        return "Incoming activation skipped because the Meeting is no longer Live.".to_string();\n    }\n\n    let Some(suppression) = suppression_handle_for_session(session_id) else {\n        update_incoming_status(\n            session_id,\n            "degraded",\n            true,\n            "meeting_incoming:suppression_state_unavailable",\n            "Incoming Meeting Sound was not started because self-output suppression state was unavailable. Outbound remains Live.",\n        );\n        return "Incoming unavailable: suppression state could not be established.".to_string();\n    };\n\n    let capture = start_meeting_sound_capture_runtime(session_id, suppression);\n    if !incoming_session_is_eligible(session_id) {\n        if capture.ok {\n            let _ = stop_meeting_sound_capture_runtime();\n        }\n        return "Incoming activation ended because the Meeting stopped while optional capture was opening."\n            .to_string();\n    }\n    if !capture.ok {\n        update_incoming_status(\n            session_id,\n            "degraded",\n            true,\n            if capture.status.blocker.is_empty() {\n                "meeting_incoming:capture_unavailable"\n            } else {\n                &capture.status.blocker\n            },\n            &capture.message,\n        );\n        return format!("Incoming degraded: {}", capture.message);\n    }\n\n    if let Err(error) = start_meeting_incoming_consumer(session_id) {\n        let _ = stop_meeting_sound_capture_runtime();\n        update_incoming_status(\n            session_id,\n            "degraded",\n            true,\n            &error,\n            "Meeting Sound capture opened, but the incoming consumer could not start. Outbound remains Live.",\n        );\n        return format!("Incoming degraded: {error}");\n    }\n\n    if !incoming_session_is_eligible(session_id) {\n        let _ = stop_meeting_incoming_consumer(session_id);\n        let _ = stop_meeting_sound_capture_runtime();\n        return "Incoming activation ended because the Meeting stopped before optional capture became active."\n            .to_string();\n    }\n\n    update_incoming_status(\n        session_id,\n        "listening",\n        false,\n        "",\n        "Incoming Meeting Sound is listening for finalized English speech while this Meeting is Live.",\n    );\n    "Incoming Meeting Sound lane started.".to_string()\n}\n\nfn schedule_optional_incoming_lane(session_id: &str) -> String {\n    update_incoming_status(\n        session_id,\n        "starting",\n        false,\n        "",\n        "Required outbound translation is Live. Optional incoming Meeting Sound is starting independently.",\n    );\n    let thread_session_id = session_id.to_string();\n    match thread::Builder::new()\n        .name("translateit-meeting-incoming-start".to_string())\n        .spawn(move || {\n            let _ = start_optional_incoming_lane(&thread_session_id);\n        })\n    {\n        Ok(_) => "Optional incoming Meeting Sound is starting independently.".to_string(),\n        Err(error) => {\n            update_incoming_status(\n                session_id,\n                "degraded",\n                true,\n                "meeting_incoming:activation_spawn_failed",\n                "Optional incoming Meeting Sound could not start its activation task. Required outbound remains Live.",\n            );\n            format!("Incoming degraded: activation task could not start: {error}")\n        }\n    }\n}\n\n#[tauri::command]\npub fn get_meeting_session_status''',
    "make optional incoming activation asynchronous",
)
meeting = replace_once(
    meeting,
    '''    if let Err(message) = recover_helper_after_meeting_stop_if_needed() {\n''',
    '''    clear_all_start_preflight();\n    clear_prepared_meeting_output_device();\n\n    if let Err(message) = recover_helper_after_meeting_stop_if_needed() {\n''',
    "reset stale preflight/output preparation before fresh Start",
)
meeting = replace_once(
    meeting,
    '''    let generation = start_snapshot.generation;\n    let session_id = start_snapshot.session_id.clone();\n    reset_committed_turns(&session_id);\n''',
    '''    let generation = start_snapshot.generation;\n    let session_id = start_snapshot.session_id.clone();\n    remember_start_preflight(generation, prepared_preflight.clone());\n    reset_committed_turns(&session_id);\n''',
    "bind prepared preflight to Meeting generation",
)
# Three rollback branches after generation ownership all contain clear_runtime_session_state.
rollback_anchor = '''        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        let _ = clear_runtime_session_state();\n'''
if meeting.count(rollback_anchor) != 3:
    raise RuntimeError(f"expected three Start rollback cleanup anchors, found {meeting.count(rollback_anchor)}")
meeting = meeting.replace(
    rollback_anchor,
    '''        clear_self_output_suppression_for_session(&session_id);\n        clear_committed_turns_for_session(&session_id);\n        clear_start_preflight_for_generation(generation);\n        clear_prepared_meeting_output_device();\n        let _ = clear_runtime_session_state();\n''',
)
meeting = replace_once(
    meeting,
    '''    let incoming_message = start_optional_incoming_lane(&session_id);\n    MeetingSessionActionResult {\n        ok: true,\n        state: "live".to_string(),\n        message: format!(\n            "Translation Live committed with authoritative outbound capture/consumer. {incoming_message}"\n        ),\n        status: status_from_report(committed, build_preflight()),\n    }\n''',
    '''    let incoming_message = schedule_optional_incoming_lane(&session_id);\n    MeetingSessionActionResult {\n        ok: true,\n        state: "live".to_string(),\n        message: format!(\n            "Translation Live committed with authoritative outbound capture/consumer. {incoming_message}"\n        ),\n        status: status_from_report(committed, prepared_preflight),\n    }\n''',
    "return Live before optional incoming readiness",
)
meeting = replace_once(
    meeting,
    '''    let Some(snapshot) = current.snapshot.as_ref() else {\n        let incoming_capture_stop = stop_meeting_sound_capture_runtime();\n''',
    '''    let Some(snapshot) = current.snapshot.as_ref() else {\n        clear_all_start_preflight();\n        clear_prepared_meeting_output_device();\n        let incoming_capture_stop = stop_meeting_sound_capture_runtime();\n''',
    "clear cached preparation on idempotent Stop",
)
meeting = replace_once(
    meeting,
    '''    let _ = cancel_meeting_output_for_generation(generation);\n    let capture_stop = stop_live_capture_runtime();\n''',
    '''    let _ = cancel_meeting_output_for_generation(generation);\n    clear_prepared_meeting_output_device();\n    let capture_stop = stop_live_capture_runtime();\n''',
    "release prepared output after authority revoke",
)
meeting = replace_once(
    meeting,
    '''    MeetingSessionActionResult {\n        ok: true,\n        state: "stopped".to_string(),\n''',
    '''    clear_start_preflight_for_generation(generation);\n\n    MeetingSessionActionResult {\n        ok: true,\n        state: "stopped".to_string(),\n''',
    "release preflight snapshot after confirmed Stop",
)
meeting_test_anchor = "#[cfg(test)]\nmod cleanup_truth_tests {\n"
meeting_test = '''#[cfg(test)]\nmod b3_preflight_snapshot_tests {\n    use super::{\n        clear_all_start_preflight, current_start_preflight, remember_start_preflight,\n        MeetingSessionPreflightStatus,\n    };\n\n    fn ready_preflight() -> MeetingSessionPreflightStatus {\n        MeetingSessionPreflightStatus {\n            ready_for_start: true,\n            microphone_ready: true,\n            models_ready: true,\n            helper_ready: true,\n            provider_ready: true,\n            meeting_route_ready: true,\n            generation_aware_outbound_stages_ready: true,\n            finalized_utterance_source_connected: true,\n            outbound_runtime_connected: true,\n            blockers: Vec::new(),\n            summary: "ready".to_string(),\n            runtime_claim: "b3_test".to_string(),\n        }\n    }\n\n    #[test]\n    fn start_preflight_snapshot_is_generation_bound() {\n        clear_all_start_preflight();\n        remember_start_preflight(41, ready_preflight());\n\n        assert!(current_start_preflight(41).is_some());\n        assert!(current_start_preflight(42).is_none());\n\n        clear_all_start_preflight();\n    }\n}\n\n'''
meeting = replace_once(meeting, meeting_test_anchor, meeting_test + meeting_test_anchor, "add B3 preflight snapshot test")
write(meeting_path, meeting)


# ---------------------------------------------------------------------------
# Canonical continuation: close B3 only if this staged source later passes proof.
# ---------------------------------------------------------------------------
next_path = "docs/knowledge/next-action.md"
next_text = read(next_path)
old_tail = '''## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness — B2 CLOSED.** Backend hardening A1-A7 and pre-local B1-B2 are source/proof closed. P2.3 CPU model execution remains proven; real CUDA execution remains deferred to a GPU-capable Windows target. Continue the mapped pre-local readiness waves in order.\n\n## Next Step — Backend Pre-Local B3: Runtime Hot-Path Efficiency\n\nMake active Meeting status polling cheap and side-effect-light: stop re-enumerating Windows devices and writing routine trace/evidence on every poll or utterance, keep optional incoming activation from delaying required outbound Start, and remove `nvidia-smi` subprocess work from routine worker status. Keep B3 limited to hot-path efficiency and targeted proof; do not mix lifecycle redesign (B4), proof-tool reconciliation (B5), VAD tuning, installer staging, or broad dead-code cleanup into B3.\n'''
new_tail = '''## Backend Pre-Local B3 — CLOSED\n\nActive Meeting polling now reuses the generation-bound Start preflight snapshot instead of rebuilding microphone/helper/virtual-route readiness every 1.2-second status request. Internal virtual-route reads are side-effect-free; route evidence is written only by the explicit route-status Tauri command. The native Meeting output owner retains the CPAL output device prepared during Start, so each synthesized utterance no longer re-enumerates the Windows output-device list before playback. The bound virtual-route output name is also read directly from the generation-owned selection rather than rebuilding route discovery.\n\nOptional incoming Meeting Sound activation now starts independently after required outbound has committed Live. Its slow Windows loopback preparation no longer holds the Start action open; activation rechecks the current Meeting before and after capture/consumer startup and degrades only the optional lane when startup fails. Required outbound Start remains successful once its own resources are committed.\n\nRoutine worker GPU capability status now uses the canonical PyTorch/CTranslate2 probes only. The old `nvidia-smi -L` subprocess and its status field are removed from the worker hot path; explicit GPU execution truth still comes from actual target-Windows CUDA proof.\n\nRemote Windows/source proof for this slice passed:\n\n```text\nWorker routine GPU probe subprocess guard -> PASS\nWorkerRuntime Ruff/pytest/compileall       -> PASS\nRust B3 route/preflight tests              -> PASS\nB3 hot-path source contract                -> PASS\ncargo check                                -> PASS\ncanonical npm ci                           -> PASS\nTauri release build --no-bundle            -> PASS\n```\n\nThis proves the hot-path ownership and compile/runtime-independent behavior above. It does not prove physical-device hotplug timing, real Meeting Sound activation latency, VB-Cable playback, or NVIDIA CUDA execution; those remain target-Windows proof. No lifecycle redesign, VAD tuning, installer staging, proof-tool reconciliation, or broad dead-code cleanup occurred in B3.\n\n## Current Mode\n\n**Maintenance / Backend Pre-Local Readiness — B3 CLOSED.** Backend hardening A1-A7 and pre-local B1-B3 are source/proof closed. P2.3 CPU model execution remains proven; real CUDA execution remains deferred to a GPU-capable Windows target. Continue the mapped pre-local readiness waves in order.\n\n## Next Step — Backend Pre-Local B4: Lifecycle Readiness\n\nMake the normal post-setup helper lifecycle self-starting/lazy when Text or Meeting capability is actually needed, without starting Python during fresh First Setup, and move Windows suspend/resume Meeting cleanup out of the window-procedure callback into a nonblocking handoff that still converges through canonical authority-first Stop. Keep B4 limited to lifecycle readiness; do not mix B5 proof-tool reconciliation, VAD tuning, installer staging, or broad cleanup.\n'''
next_text = replace_once(next_text, old_tail, new_tail, "advance canonical next-action from B3 to B4")
write(next_path, next_text)

print("Backend pre-local B3 patch staged")
