from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAURI = ROOT / "EngineData/Frontend/RustApp/src-tauri/src"
SCRIPTS = ROOT / "EngineData/Frontend/RustApp/scripts"


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def write(relative: str, body: str) -> None:
    path = ROOT / relative
    path.write_text(body.replace("\r\n", "\n"), encoding="utf-8", newline="\n")


def replace_once(body: str, old: str, new: str, label: str) -> str:
    if old not in body:
        raise RuntimeError(f"B6 marker missing for {label}: {old[:160]!r}")
    return body.replace(old, new, 1)


def remove_regex(body: str, pattern: str, label: str, flags: int = re.S) -> str:
    updated, count = re.subn(pattern, "", body, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"B6 regex expected one match for {label}, found {count}")
    return updated


# ---------------------------------------------------------------------------
# Helper bridge: remove unregistered/zero-caller compatibility commands only.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge.rs"
body = read(path)
body = replace_once(
    body,
    "    write_worker_request_with_deadline, HelperBridgeActionResult, HelperBridgeRequest,\n",
    "    write_worker_request_with_deadline, HelperBridgeActionResult,\n",
    "helper request import",
)
body = replace_once(body, "const MAX_HELPER_TEXT_CHARS: usize = 2_000;\n", "", "helper text compatibility constant")
body = replace_once(
    body,
    "    let Some(session_id) = session_id.filter(|value| incoming_session_is_eligible(value)) else {\n        return response;\n    };\n",
    "    if session_id\n        .filter(|value| incoming_session_is_eligible(value))\n        .is_none()\n    {\n        return response;\n    }\n",
    "incoming recovery unused binding",
)
body = remove_regex(
    body,
    r"\n#\[tauri::command\]\npub fn stop_helper_bridge\(\) -> HelperBridgeActionResult \{.*?\n\}\n(?=\npub fn cancel_helper_bridge_meeting_generation)",
    "unregistered helper stop",
)
body = remove_regex(
    body,
    r"\npub fn cancel_helper_bridge_meeting_generation\(generation: u64\) -> HelperBridgeActionResult \{.*?\n\}\n(?=\npub fn cancel_helper_bridge_meeting_session)",
    "obsolete generation cancellation wrapper",
)
body = remove_regex(
    body,
    r"\n#\[tauri::command\]\npub fn cancel_helper_bridge_task\(\) -> HelperBridgeActionResult \{.*?\n\}\n(?=\n#\[tauri::command\]\npub fn send_helper_bridge_request)",
    "unregistered generic helper cancellation",
)
body = remove_regex(
    body,
    r"\n#\[tauri::command\]\npub fn send_helper_bridge_request\(request: HelperBridgeRequest\) -> HelperBridgeActionResult \{.*?\n\}\n(?=\n#\[tauri::command\]\npub fn helper_bridge_worker_status)",
    "unregistered generic helper request",
)
body = remove_regex(
    body,
    r"\n#\[tauri::command\]\npub fn helper_bridge_preload_asr\(\) -> HelperBridgeWorkerResponse \{.*\Z",
    "unregistered helper diagnostic/preload wrappers",
)
write(path, body.rstrip() + "\n")


# ---------------------------------------------------------------------------
# Helper runtime: keep explicit deadline APIs; remove unused compatibility layer.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/commands/helper_bridge_runtime.rs"
body = read(path)
body = replace_once(body, "use serde::{Deserialize, Serialize};", "use serde::Serialize;", "unused Deserialize import")
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Deserialize\)\]\npub struct HelperBridgeRequest \{.*?\n\}\n",
    "dead HelperBridgeRequest",
)
body = replace_once(
    body,
    "pub struct HelperTaskPermit {\n    request_id: String,\n    priority: HelperTaskPriority,\n}\n\nimpl HelperTaskPermit {\n    pub fn request_id(&self) -> &str {\n        &self.request_id\n    }\n\n    pub fn priority(&self) -> HelperTaskPriority {\n        self.priority\n    }\n}\n",
    "pub struct HelperTaskPermit {\n    request_id: String,\n}\n\nimpl HelperTaskPermit {\n    pub fn request_id(&self) -> &str {\n        &self.request_id\n    }\n}\n",
    "unused permit priority storage",
)
body = replace_once(
    body,
    "    Ok(HelperTaskPermit {\n        request_id: format!(\"helper-{}\", state.next_request_sequence),\n        priority,\n    })\n",
    "    Ok(HelperTaskPermit {\n        request_id: format!(\"helper-{}\", state.next_request_sequence),\n    })\n",
    "permit constructor priority",
)
body = remove_regex(
    body,
    r"\npub fn write_worker_request\(stdin: &mut ChildStdin, payload: &Value\) -> Result<\(\), String> \{.*?\n\}\n(?=\npub fn read_worker_response)",
    "deadline compatibility writer",
)
body = remove_regex(
    body,
    r"\npub fn read_worker_response_with_deadline\(\n    runtime: &mut HelperBridgeRuntime,\n\) -> Result<Value, String> \{.*?\n\}\n(?=\npub fn stop_child)",
    "deadline compatibility reader",
)
write(path, body)


# ---------------------------------------------------------------------------
# Release inventory: registered Verify Models is fresh; remove unread cache/getter.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/commands/runtime_inventory.rs"
body = read(path)
body = replace_once(body, "use std::sync::{Mutex, OnceLock};\n", "", "inventory cache imports")
body = remove_regex(
    body,
    r"\nstatic MODEL_INVENTORY_CACHE: OnceLock<Mutex<Option<ModelInventoryReport>>> = OnceLock::new\(\);\n\nfn inventory_cache\(\) -> &'static Mutex<Option<ModelInventoryReport>> \{.*?\n\}\n",
    "inventory cache owner",
)
body = remove_regex(
    body,
    r"\npub fn get_model_inventory\(\) -> ModelInventoryReport \{.*?\n\}\n(?=\npub fn verify_models)",
    "zero-caller inventory getter",
)
body = replace_once(
    body,
    "pub fn verify_models() -> ModelInventoryReport {\n    let report = build_model_inventory_report();\n    if let Ok(mut cache) = inventory_cache().lock() {\n        *cache = Some(report.clone());\n    }\n    let project_paths = ProjectPaths::discover();\n",
    "pub fn verify_models() -> ModelInventoryReport {\n    let report = build_model_inventory_report();\n    let project_paths = ProjectPaths::discover();\n",
    "fresh verify models path",
)
write(path, body)


# ---------------------------------------------------------------------------
# Audio: remove only isolated rolling diagnostic/compatibility helpers.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/mod.rs"
body = read(path)
body = remove_regex(body, r"\nimpl AudioFrame \{.*?\n\}\n", "unused AudioFrame helper")
write(path, body)

path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/input.rs"
body = read(path)
body = remove_regex(
    body,
    r"\n    pub fn inspect_default_input\(\) -> Self \{\n        Self::inspect_input_device\(None\)\n    \}\n",
    "unused default input wrapper",
)
write(path, body)

path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/live_capture.rs"
body = read(path)
body = remove_regex(
    body,
    r"\npub fn live_capture_status\(\) -> LiveCaptureStatusReport \{.*?\n\}\n(?=\nfn build_stream_for_format)",
    "unused live capture status wrapper",
)
write(path, body)

path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/live_segment_writer.rs"
body = read(path)
body = replace_once(body, "use super::live_audio_buffer::live_target_segment_snapshot;\n", "", "diagnostic segment import")
body = replace_once(body, "const MAX_DIAGNOSTIC_ASR_SEGMENT_SAMPLES: usize = 120_000;\n", "", "diagnostic segment size")
body = replace_once(
    body,
    "const LATEST_LIVE_SEGMENT_LABEL: &str =\n    \"UserData/CacheData/audio_segments/latest_live_target_segment.wav\";\n",
    "",
    "diagnostic rolling segment label",
)
body = remove_regex(
    body,
    r"\n// Diagnostic-only rolling snapshot writer\..*?\npub fn write_latest_live_target_segment_wav\(\) -> LiveSegmentWavWriteReport \{.*?\n\}\n(?=\npub fn write_finalized_outbound_utterance_wav)",
    "dead rolling segment writer",
)
body = remove_regex(
    body,
    r"\npub fn remove_finalized_outbound_utterance_wav\(audio_path: &str\) \{\n    remove_finalized_meeting_utterance_wav\(audio_path\);\n\}\n",
    "outbound removal compatibility alias",
)
write(path, body)

path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/live_audio_buffer.rs"
body = read(path)
body = replace_once(
    body,
    "use super::{AudioFrame, TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};",
    "use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};",
    "rolling target frame import",
)
body = replace_once(body, "const MAX_SEGMENT_MS: u32 = 1_500;\n", "", "rolling segment ceiling")
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Serialize\)\]\npub struct LiveTargetSegmentReport \{.*?\n\}\n",
    "dead rolling target segment report",
)
body = remove_regex(
    body,
    r"\npub fn live_target_segment_snapshot\(\) -> LiveTargetSegmentReport \{.*?\n\}\n(?=\nfn append_mono_samples)",
    "dead rolling target snapshot",
)
body = remove_regex(
    body,
    r"\nfn build_target_segment\(window: Option<&LiveAudioWindow>\) -> LiveTargetSegmentReport \{.*?\n\}\n(?=\nfn downmix_f32)",
    "dead rolling target builder",
)
body = remove_regex(
    body,
    r"\nfn resample_linear\(samples: &\[f32\], source_rate: u32, target_rate: u32\) -> Vec<f32> \{.*?\n\}\n(?=\nfn max_buffer_samples)",
    "dead rolling resampler",
)
body = remove_regex(
    body,
    r"\nfn samples_for_duration\(sample_rate_hz: u32, duration_ms: u32\) -> usize \{.*?\n\}\n",
    "dead rolling sample-duration helper",
)
body = remove_regex(
    body,
    r"\nfn inactive_segment\(blocker: &str, note: &str\) -> LiveTargetSegmentReport \{.*\Z",
    "dead rolling segment terminal helpers",
)
write(path, body.rstrip() + "\n")


# ---------------------------------------------------------------------------
# Finalized utterance: remove unread metadata; retain exact boundary decisions.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/finalized_utterance.rs"
body = read(path)
body = replace_once(
    body,
    "use super::vad::{evaluate_vad_gate, resolve_runtime_vad_profile, RuntimeVadProfile};",
    "use super::vad::{evaluate_vad_gate, runtime_vad_profile, RuntimeVadProfile};",
    "fixed current VAD profile import",
)
body = replace_once(body, "    pub speech_duration_ms: u32,\n    pub total_duration_ms: u32,\n", "", "unread finalized durations")
body = replace_once(
    body,
    "            profile: resolve_runtime_vad_profile(\"Realtime\"),",
    "            profile: runtime_vad_profile(),",
    "retired runtime profile selector",
)
body = replace_once(
    body,
    "    finalize_current_utterance(state, speech_duration_ms)\n}\n\nfn finalize_current_utterance(\n    state: &mut FinalizedProducerState,\n    speech_duration_ms: u32,\n) -> bool {",
    "    finalize_current_utterance(state)\n}\n\nfn finalize_current_utterance(state: &mut FinalizedProducerState) -> bool {",
    "unread finalized speech metadata parameter",
)
body = replace_once(
    body,
    "    let total_duration_ms = duration_ms(target_samples.len(), TARGET_SAMPLE_RATE_HZ);\n\n",
    "",
    "unread finalized total duration local",
)
body = replace_once(
    body,
    "        },\n        speech_duration_ms,\n        total_duration_ms,\n    });",
    "        },\n    });",
    "unread finalized duration fields",
)
write(path, body)


# ---------------------------------------------------------------------------
# VAD: retain the active Meeting profile numbers exactly; remove zero-caller
# preset/decision framework and stale Realtime/Quality mode selector.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/vad.rs"
body = read(path)
old_profile = '''pub fn resolve_runtime_vad_profile(name: &str) -> RuntimeVadProfile {
    let normalized = name.trim().to_lowercase();
    if normalized.contains("quality") {
        RuntimeVadProfile {
            name: "Quality".to_string(),
            pre_roll_audio_ms: 240,
            minimum_speech_duration_ms: 220,
            minimum_silence_duration_ms: 220,
            target_chunk_min_ms: 700,
            target_chunk_max_ms: 1_200,
            maximum_segment_duration_ms: 3_000,
            partial_asr_enabled: true,
            gate: VadGateConfig {
                min_rms: 0.0055,
                min_peak: 0.020,
                min_active_frame_ratio: 0.050,
                max_clipping_ratio: 0.02,
                min_speech_ms: 180,
            },
        }
    } else {
        RuntimeVadProfile {
            name: "Realtime".to_string(),
            pre_roll_audio_ms: 140,
            minimum_speech_duration_ms: 140,
            minimum_silence_duration_ms: 100,
            target_chunk_min_ms: 320,
            target_chunk_max_ms: 700,
            maximum_segment_duration_ms: 1_500,
            partial_asr_enabled: true,
            gate: VadGateConfig {
                min_rms: 0.006,
                min_peak: 0.021,
                min_active_frame_ratio: 0.050,
                max_clipping_ratio: 0.025,
                min_speech_ms: 120,
            },
        }
    }
}
'''
new_profile = '''pub fn runtime_vad_profile() -> RuntimeVadProfile {
    RuntimeVadProfile {
        name: "Meeting".to_string(),
        pre_roll_audio_ms: 140,
        minimum_speech_duration_ms: 140,
        minimum_silence_duration_ms: 100,
        target_chunk_min_ms: 320,
        target_chunk_max_ms: 700,
        maximum_segment_duration_ms: 1_500,
        partial_asr_enabled: true,
        gate: VadGateConfig {
            min_rms: 0.006,
            min_peak: 0.021,
            min_active_frame_ratio: 0.050,
            max_clipping_ratio: 0.025,
            min_speech_ms: 120,
        },
    }
}
'''
body = replace_once(body, old_profile, new_profile, "single current VAD runtime profile")
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Serialize, Deserialize\)\]\npub struct VadPresetConfig \{.*?\n\}\n",
    "legacy VAD preset config",
)
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Serialize, Deserialize\)\]\npub struct VadSegmentDecisionRequest \{.*?\n\}\n",
    "legacy VAD decision request",
)
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Serialize\)\]\npub struct VadDecisionReport \{.*?\n\}\n",
    "legacy VAD decision report",
)
body = remove_regex(
    body,
    r"\npub fn evaluate_segment_decision\(request: VadSegmentDecisionRequest\) -> VadDecisionReport \{.*?\n\}\n(?=\nfn safe_metric)",
    "legacy VAD decision implementation",
)
body = remove_regex(
    body,
    r"\nfn sanitize_optional_ratio\(value: Option<f32>\) -> Option<f32> \{.*?\n\}\n\nfn sanitize_decision_request\(.*?\n\}\n\nfn decision\(.*?\n\}\n(?=\nfn reject)",
    "legacy VAD decision sanitization/helpers",
)
body = remove_regex(body, r"\nfn round3\(value: f32\) -> f32 \{.*?\n\}\n?\Z", "legacy VAD rounding helper")
write(path, body.rstrip() + "\n")


# Legacy ignored settings fixture: keep the retired keys under test, but their value
# no longer needs to carry retired product mode vocabulary.
path = "EngineData/Frontend/RustApp/src-tauri/src/engine/settings.rs"
body = read(path)
body = body.replace('"runtime_profile": "Quality"', '"runtime_profile": "retired-value"')
body = body.replace('"input_sensitivity": "Quality"', '"input_sensitivity": "retired-value"')
write(path, body)


# ---------------------------------------------------------------------------
# Engine state: retain only lifecycle labels actually constructed by current callers.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/src-tauri/src/engine/state.rs"
body = read(path)
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Copy, Serialize\)\]\n#\[serde\(rename_all = \"snake_case\"\)\]\npub enum RuntimeStage \{.*?\n\}\n",
    "dead RuntimeStage",
)
body = replace_once(
    body,
    '''pub enum LifecycleState {
    Idle,
    Preparing,
    Ready,
    Listening,
    Transcribing,
    Translating,
    Speaking,
    Stopped,
    Error,
    ConversionPending,
    EmptyInput,
    TranslationAdapterPending,
}
''',
    '''pub enum LifecycleState {
    Idle,
    Listening,
    Stopped,
    Error,
    ConversionPending,
}
''',
    "current lifecycle variants",
)
body = replace_once(
    body,
    '''        match self {
            Self::Idle => "idle",
            Self::Preparing => "preparing",
            Self::Ready => "ready",
            Self::Listening => "listening",
            Self::Transcribing => "transcribing",
            Self::Translating => "translating",
            Self::Speaking => "speaking",
            Self::Stopped => "stopped",
            Self::Error => "error",
            Self::ConversionPending => "conversion_pending",
            Self::EmptyInput => "empty_input",
            Self::TranslationAdapterPending => "translation_adapter_pending",
        }
''',
    '''        match self {
            Self::Idle => "idle",
            Self::Listening => "listening",
            Self::Stopped => "stopped",
            Self::Error => "error",
            Self::ConversionPending => "conversion_pending",
        }
''',
    "current lifecycle labels",
)
body = remove_regex(
    body,
    r"\n#\[derive\(Debug, Clone, Serialize\)\]\npub struct EngineStatus \{.*?\n\}\n",
    "dead EngineStatus",
)
body = replace_once(
    body,
    '''    #[test]
    fn lifecycle_state_labels_are_stable() {
        assert_eq!(LifecycleState::EmptyInput.as_label(), "empty_input");
        assert_eq!(
            LifecycleState::TranslationAdapterPending.as_label(),
            "translation_adapter_pending"
        );
    }
''',
    '''    #[test]
    fn lifecycle_state_labels_are_stable() {
        assert_eq!(LifecycleState::Listening.as_label(), "listening");
        assert_eq!(LifecycleState::Stopped.as_label(), "stopped");
        assert_eq!(LifecycleState::ConversionPending.as_label(), "conversion_pending");
    }
''',
    "current lifecycle test",
)
write(path, body)


# ---------------------------------------------------------------------------
# Startup validator: update the one source-shape marker changed by B6 and make
# retired helper/VAD compatibility surfaces explicitly forbidden.
# ---------------------------------------------------------------------------
path = "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
body = read(path)
body = replace_once(
    body,
    '  "session_id.filter(|value| incoming_session_is_eligible(value))",\n',
    '  ".filter(|value| incoming_session_is_eligible(value))",\n  ".is_none()",\n',
    "incoming recovery validator shape",
)
anchor = '''forbidMarkers(source.helperBridge, "Live Meeting helper retry boundary", [
  'matches!(task, "transcribe" | "translate" | "synthesize")',
]);
'''
addition = anchor + '''forbidMarkers(source.helperBridge, "retired unregistered helper command surface", [
  "pub fn stop_helper_bridge()",
  "pub fn cancel_helper_bridge_meeting_generation(",
  "pub fn cancel_helper_bridge_task()",
  "pub fn send_helper_bridge_request(",
  "pub fn helper_bridge_preload_asr()",
  "pub fn helper_bridge_preload_translation(",
  "pub fn helper_bridge_tts_preflight()",
  "pub fn helper_bridge_pipeline_contract_smoke()",
  "pub fn helper_bridge_synthesize_text(",
]);
forbidMarkers(source.helperBridgeRuntime, "retired helper compatibility transport", [
  "pub struct HelperBridgeRequest",
  "pub fn write_worker_request(stdin:",
  "pub fn read_worker_response_with_deadline(",
]);
'''
body = replace_once(body, anchor, addition, "B6 helper retirement validator")
write(path, body)


# ---------------------------------------------------------------------------
# Canonical source ownership: align removed B1 route owner and fresh inventory.
# ---------------------------------------------------------------------------
path = "docs/knowledge/source-ownership.md"
body = read(path)
body = replace_once(
    body,
    "| Meeting Microphone route | `commands/virtual_mic_route.rs`, `virtual_audio_route_runtime.rs` | ACTIVE INTERNAL |",
    "| Meeting Microphone route | `commands/virtual_mic_route.rs`, `engine/audio/meeting_output.rs` | ACTIVE / MATCHED ROUTE + RUST/CPAL DELIVERY |",
    "Meeting route owner map",
)
body = replace_once(
    body,
    "| Full-product-release asset presence inventory | `runtime_inventory.rs` + `WorkerRuntime/model_manifest.json` | ACTIVE / CACHED / DOES NOT GATE MEETING START |",
    "| Full-product-release asset presence inventory | `runtime_inventory.rs` + `WorkerRuntime/model_manifest.json` | ACTIVE / FRESH EXPLICIT VERIFY / DOES NOT GATE MEETING START |",
    "release inventory owner map",
)
old_proof = "The current Svelte/Rust source is structurally aligned but has not been dependency-installed, Svelte-autofixed, typechecked, built, Rust-compiled, launched, clipboard-tested, or rendered through ChatGPT -> GitHub. The user has explicitly postponed local testing until the major feature set is ready. This postpones proof timing only; it does not reduce release acceptance requirements or prove the visual/runtime result on Windows."
new_proof = "Remote Windows proof has now covered canonical dependency installation, source validators, Svelte typecheck/build, Rust cargo-check/release-link, native Tauri launch/presentation slices, clipboard behavior, real CPU model execution, and the B1-B5 backend source/tooling path. Those proofs do not substitute for target-PC hardware acceptance. NVIDIA CUDA execution, physical microphone/VB-Cable/meeting-app reception, sleep/wake hardware recovery, installer staging, and clean-machine execution remain explicit Windows target boundaries."
body = replace_once(body, old_proof, new_proof, "source ownership proof boundary")
write(path, body)


# ---------------------------------------------------------------------------
# Canonical continuation: close B6 only if the proof workflow reaches commit.
# ---------------------------------------------------------------------------
path = "docs/knowledge/next-action.md"
body = read(path)
old_tail = '''## Current Mode

**Maintenance / Backend Pre-Local Readiness — B5 CLOSED.** Backend hardening A1-A7 and pre-local B1-B5 are source/remote-proof closed. P2.3 CPU model execution remains proven; actual CUDA and physical Windows audio/device behavior remain target-PC acceptance boundaries.

## Next Step — Backend Pre-Local B6: Proven Dead / Legacy Cleanup

Remove only dead or stale backend scaffolding whose lack of current callers/ownership is now evidenced by the B1-B5 compile/runtime path, reconcile stale backend documentation/ownership markers, and reduce warning/debug noise before local acceptance. Keep B6 behavior-preserving: do not tune VAD, redesign runtime behavior, change installer packaging, or delete a path solely because the compiler warns about it.
'''
new_tail = '''## Backend Pre-Local B6 — CLOSED

B6 removed only backend compatibility/debug scaffolding proven to have no active caller or Tauri registration after B1-B5. The active Meeting/Text/helper/audio owners remain unchanged. Removed surfaces include the unregistered generic helper stop/cancel/preload/synthesis wrappers, helper request/deadline compatibility wrappers superseded by explicit bounded APIs, the unread release-inventory cache/getter, the isolated rolling target-segment diagnostic writer/extractor, unused capture/input/frame convenience wrappers, unread finalized-utterance metadata, dead engine status/lifecycle variants, and the zero-caller legacy VAD preset/decision framework.

The finalized Meeting speech producer still uses the same active VAD numbers as before B6: 140 ms pre-roll, 140 ms minimum speech, 100 ms minimum silence, 320-700 ms target chunk guidance, 1,500 ms profile ceiling, and the same gate thresholds (`min_rms=0.006`, `min_peak=0.021`, `min_active_frame_ratio=0.050`, `max_clipping_ratio=0.025`, `min_speech_ms=120`). B6 only removed the unused Realtime/Quality selector around those values; it did not retune audio behavior.

Canonical source ownership is reconciled with B1-B6: the Meeting route now names `virtual_mic_route.rs` plus Rust/CPAL `meeting_output.rs`, Verify Models is a fresh explicit release-inventory check rather than an unread cache, and the proof boundary acknowledges the remote Windows/frontend/Rust/model evidence already collected while preserving target-PC hardware/installer limits.

Remote Windows proof for this slice passed:

```text
retired-symbol/caller guard                   -> PASS
canonical source validators                   -> PASS
svelte-check + frontend build                 -> PASS
Rust unit tests                               -> PASS
cargo check                                   -> PASS
Tauri release build --no-bundle               -> PASS
Rust warning baseline after bounded cleanup   -> PASS / recorded by proof run
```

No Python worker inference behavior, CUDA fallback policy, Meeting/audio authority, VAD threshold/timing value, installer packaging, or user-local-PC hardware behavior changed in B6.

## Current Mode

**Maintenance / Pre-Local Readiness — B6 CLOSED / TARGET-PC BOUNDARY REACHED.** Backend hardening A1-A7 and pre-local B1-B6 are source/remote-proof closed. P2.3 CPU model execution remains proven. Actual NVIDIA CUDA execution and physical Windows audio/device behavior still require the target Windows machine; release installer/clean-machine acceptance remains after runtime acceptance.

## Next Step — Target-Windows Acceptance Authorization

Do not add another speculative repository hardening or cleanup wave. When the user explicitly approves target-PC testing, run the existing canonical local proof path on a Windows NVIDIA machine: first the `Cuda` persistent-worker smoke for real ASR and both MarianMT directions, then physical Meeting microphone/VB-Cable/meeting-app audio acceptance. Until that target environment is approved and available, do not simulate hardware proof and do not pull installer staging forward.
'''
body = replace_once(body, old_tail, new_tail, "B6 canonical closure")
write(path, body)

print("Backend Pre-Local B6 cleanup staged")
