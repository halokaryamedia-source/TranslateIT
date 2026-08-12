from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8", newline="\n")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if content.count(old) != 1:
        raise RuntimeError(f"Expected exactly one marker in {path}: {old[:120]!r}; found {content.count(old)}")
    write(path, content.replace(old, new, 1))


input_path = "EngineData/Frontend/RustApp/src-tauri/src/engine/audio/input.rs"
write(
    input_path,
    r'''use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{mpsc, Arc};
use std::time::{Duration, Instant};

use super::{TARGET_CHANNELS, TARGET_SAMPLE_RATE_HZ};

const MAX_INPUT_DEVICE_NAME_CHARS: usize = 160;
const FUNCTIONAL_INPUT_PROBE_TIMEOUT_MS: u64 = 2_000;

#[derive(Debug, Clone, Serialize)]
pub struct InputPreparationStatus {
    pub backend_id: String,
    pub input_device_name: Option<String>,
    pub target_sample_rate_hz: u32,
    pub target_channels: u16,
    pub prepared: bool,
    pub running: bool,
    pub functional_verified: bool,
    pub callback_frames_observed: u64,
    pub blocker: String,
    pub note: String,
}

impl InputPreparationStatus {
    pub fn inspect_input_device(requested_name: Option<&str>) -> Self {
        let host = cpal::default_host();
        let backend_id = format!("cpal-{}", host.id().name());
        let requested_name = requested_name.map(str::trim).filter(|value| !value.is_empty());

        let device = match resolve_input_device(&host, requested_name) {
            Ok((device, _)) => device,
            Err(error) => {
                return Self::blocked(
                    backend_id,
                    requested_name.map(str::to_string),
                    "audio_input:device_unavailable",
                    &error,
                )
            }
        };

        let device_name = safe_device_name(&device);
        let Ok(config) = device.default_input_config() else {
            return Self::blocked(
                backend_id,
                device_name,
                "audio_input:no_input_config",
                "The selected microphone exists, but no default input configuration was available.",
            );
        };

        let device_rate = config.sample_rate().0;
        let device_channels = config.channels();
        if device_rate < TARGET_SAMPLE_RATE_HZ || device_channels < TARGET_CHANNELS {
            return Self::blocked(
                backend_id,
                device_name,
                "audio_input:pipeline_format_incompatible",
                "The selected microphone does not satisfy the target 16 kHz mono pipeline requirement.",
            );
        }

        Self {
            backend_id,
            input_device_name: device_name,
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            prepared: true,
            running: false,
            functional_verified: false,
            callback_frames_observed: 0,
            blocker: String::new(),
            note: if requested_name.is_some() {
                "The selected microphone is available with a usable input configuration. This routine status check does not open a capture stream."
                    .to_string()
            } else {
                "The Windows default microphone is available with a usable input configuration. This routine status check does not open a capture stream."
                    .to_string()
            },
        }
    }

    fn blocked(
        backend_id: String,
        input_device_name: Option<String>,
        blocker: &str,
        note: &str,
    ) -> Self {
        Self {
            backend_id,
            input_device_name,
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            prepared: false,
            running: false,
            functional_verified: false,
            callback_frames_observed: 0,
            blocker: blocker.to_string(),
            note: note.to_string(),
        }
    }
}

pub fn probe_input_device_functionally(requested_name: Option<&str>) -> InputPreparationStatus {
    let started = Instant::now();
    let host = cpal::default_host();
    let backend_id = format!("cpal-{}", host.id().name());
    let requested_name = requested_name.map(str::trim).filter(|value| !value.is_empty());

    let device = match resolve_input_device(&host, requested_name) {
        Ok((device, _)) => device,
        Err(error) => {
            return InputPreparationStatus::blocked(
                backend_id,
                requested_name.map(str::to_string),
                "audio_input:functional_probe_device_unavailable",
                &error,
            )
        }
    };
    let device_name = safe_device_name(&device);
    let supported = match device.default_input_config() {
        Ok(config) => config,
        Err(error) => {
            return InputPreparationStatus::blocked(
                backend_id,
                device_name,
                "audio_input:functional_probe_no_input_config",
                &format!(
                    "The selected microphone could not provide a default input configuration for functional verification: {error}"
                ),
            )
        }
    };

    let sample_rate_hz = supported.sample_rate().0;
    let channels = supported.channels();
    if sample_rate_hz < TARGET_SAMPLE_RATE_HZ || channels < TARGET_CHANNELS {
        return InputPreparationStatus::blocked(
            backend_id,
            device_name,
            "audio_input:functional_probe_pipeline_format_incompatible",
            "The selected microphone exists, but its default format cannot feed the 16 kHz mono capture pipeline.",
        );
    }

    let sample_format = supported.sample_format();
    let stream_config = supported.config();
    let callback_frames = Arc::new(AtomicU64::new(0));
    let (event_tx, event_rx) = mpsc::sync_channel::<Result<(), String>>(1);
    let stream = match build_functional_probe_stream(
        &device,
        &stream_config,
        sample_format,
        Arc::clone(&callback_frames),
        event_tx,
    ) {
        Ok(stream) => stream,
        Err(error) => {
            return InputPreparationStatus::blocked(
                backend_id,
                device_name,
                "audio_input:functional_probe_stream_build_failed",
                &format!("The selected microphone could not open a verification stream: {error}"),
            )
        }
    };

    if let Err(error) = stream.play() {
        drop(stream);
        return InputPreparationStatus::blocked(
            backend_id,
            device_name,
            "audio_input:functional_probe_stream_start_failed",
            &format!("The selected microphone verification stream could not start: {error}"),
        );
    }

    let event = event_rx.recv_timeout(Duration::from_millis(FUNCTIONAL_INPUT_PROBE_TIMEOUT_MS));
    let observed = callback_frames.load(Ordering::SeqCst);
    drop(stream);

    match event {
        Ok(Ok(())) if observed > 0 => InputPreparationStatus {
            backend_id,
            input_device_name: device_name,
            target_sample_rate_hz: TARGET_SAMPLE_RATE_HZ,
            target_channels: TARGET_CHANNELS,
            prepared: true,
            running: false,
            functional_verified: true,
            callback_frames_observed: observed,
            blocker: String::new(),
            note: format!(
                "The microphone opened successfully and delivered native callback frames within {} ms. No microphone samples were retained by this verification.",
                started.elapsed().as_millis()
            ),
        },
        Ok(Ok(())) => InputPreparationStatus::blocked(
            backend_id,
            device_name,
            "audio_input:functional_probe_no_frames",
            "The microphone callback opened but did not deliver any audio frames during functional verification.",
        ),
        Ok(Err(error)) => InputPreparationStatus::blocked(
            backend_id,
            device_name,
            "audio_input:functional_probe_callback_failed",
            &format!("The microphone verification callback failed: {error}"),
        ),
        Err(mpsc::RecvTimeoutError::Timeout) => InputPreparationStatus::blocked(
            backend_id,
            device_name,
            "audio_input:functional_probe_timeout",
            "The microphone stream opened, but no audio callback frames arrived before the bounded verification timeout.",
        ),
        Err(mpsc::RecvTimeoutError::Disconnected) => InputPreparationStatus::blocked(
            backend_id,
            device_name,
            "audio_input:functional_probe_channel_closed",
            "The microphone verification stream ended before callback readiness could be confirmed.",
        ),
    }
}

fn build_functional_probe_stream(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_format: cpal::SampleFormat,
    callback_frames: Arc<AtomicU64>,
    event_tx: mpsc::SyncSender<Result<(), String>>,
) -> Result<cpal::Stream, String> {
    let channels = usize::from(config.channels.max(1));

    macro_rules! build_probe_stream {
        ($sample:ty) => {{
            let frames = Arc::clone(&callback_frames);
            let ready_tx = event_tx.clone();
            let error_tx = event_tx.clone();
            device
                .build_input_stream(
                    config,
                    move |data: &[$sample], _| {
                        let frame_count = data.len() / channels;
                        if frame_count > 0 {
                            frames.fetch_add(frame_count as u64, Ordering::SeqCst);
                            let _ = ready_tx.try_send(Ok(()));
                        }
                    },
                    move |error| {
                        let _ = error_tx.try_send(Err(error.to_string()));
                    },
                    None,
                )
                .map_err(|error| error.to_string())
        }};
    }

    match sample_format {
        cpal::SampleFormat::F32 => build_probe_stream!(f32),
        cpal::SampleFormat::I16 => build_probe_stream!(i16),
        cpal::SampleFormat::U16 => build_probe_stream!(u16),
        other => Err(format!(
            "Unsupported default microphone sample format for the active capture path: {other:?}"
        )),
    }
}

fn resolve_input_device(
    host: &cpal::Host,
    requested_name: Option<&str>,
) -> Result<(cpal::Device, bool), String> {
    if let Some(requested_name) = requested_name {
        return match find_named_input_device(host, requested_name) {
            Ok(Some(device)) => Ok((device, false)),
            Ok(None) => Err(
                "The selected microphone is not available. The previous/default microphone was not substituted."
                    .to_string(),
            ),
            Err(error) => Err(format!(
                "The selected microphone could not be enumerated: {error}"
            )),
        };
    }

    host.default_input_device()
        .map(|device| (device, true))
        .ok_or_else(|| "No Windows default input device was found.".to_string())
}

fn find_named_input_device(
    host: &cpal::Host,
    requested_name: &str,
) -> Result<Option<cpal::Device>, String> {
    let devices = host.input_devices().map_err(|error| error.to_string())?;
    for device in devices {
        if safe_device_name(&device).as_deref() == Some(requested_name) {
            return Ok(Some(device));
        }
    }
    Ok(None)
}

fn is_unsafe_input_name_character(character: char) -> bool {
    character == '\0'
        || ('\u{0001}'..='\u{0008}').contains(&character)
        || ('\u{000b}'..='\u{001f}').contains(&character)
        || character == '\u{007f}'
        || ('\u{202a}'..='\u{202e}').contains(&character)
        || ('\u{2066}'..='\u{2069}').contains(&character)
}

fn safe_device_name(device: &cpal::Device) -> Option<String> {
    let clean = device
        .name()
        .ok()?
        .trim()
        .chars()
        .filter(|character| !is_unsafe_input_name_character(*character))
        .take(MAX_INPUT_DEVICE_NAME_CHARS)
        .collect::<String>()
        .trim()
        .to_string();
    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}
''',
)

replace_once(
    "EngineData/Frontend/RustApp/src-tauri/src/commands/audio.rs",
    "use crate::engine::audio::input::InputPreparationStatus;",
    "use crate::engine::audio::input::{probe_input_device_functionally, InputPreparationStatus};",
)
replace_once(
    "EngineData/Frontend/RustApp/src-tauri/src/commands/audio.rs",
    '''#[tauri::command]\npub fn probe_input_device_candidate(device_id: Option<String>) -> InputPreparationStatus {\n    InputPreparationStatus::inspect_input_device(device_id.as_deref())\n}''',
    '''#[tauri::command]\npub fn probe_input_device_candidate(device_id: Option<String>) -> InputPreparationStatus {\n    probe_input_device_functionally(device_id.as_deref())\n}''',
)

replace_once(
    "EngineData/Frontend/RustApp/src-tauri/src/commands/settings.rs",
    '''            (\n                probe.prepared,\n                probe\n                    .input_device_name''',
    '''            (\n                probe.prepared && probe.functional_verified,\n                probe\n                    .input_device_name''',
)

replace_once(
    "EngineData/Frontend/RustApp/src/app/shared/types.ts",
    '''  prepared?: boolean;\n  selected_device_name: string | null;''',
    '''  prepared?: boolean;\n  functional_verified?: boolean;\n  callback_frames_observed?: number;\n  selected_device_name: string | null;''',
)

replace_once(
    "EngineData/Frontend/RustApp/src/app/bridge/runtimeProductFacade.ts",
    '''    const status = await runtimeApi.probeInputDeviceCandidate(normalizedDeviceId);\n    const ok = Boolean(status.ready || status.prepared);''',
    '''    const status = await runtimeApi.probeInputDeviceCandidate(normalizedDeviceId);\n    const ok = status.functional_verified === true;''',
)

validator = "EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs"
replace_once(
    validator,
    '''  settingsCommands: resolve(root, "src-tauri/src/commands/settings.rs"),\n  textTranslate: resolve(root, "src-tauri/src/commands/text_translate.rs"),''',
    '''  settingsCommands: resolve(root, "src-tauri/src/commands/settings.rs"),\n  audioCommands: resolve(root, "src-tauri/src/commands/audio.rs"),\n  audioInput: resolve(root, "src-tauri/src/engine/audio/input.rs"),\n  textTranslate: resolve(root, "src-tauri/src/commands/text_translate.rs"),''',
)
replace_once(
    validator,
    '''  "probe_input_device_candidate",\n  "probe_output_device_candidate",\n  "The previous preference was kept",\n]);''',
    '''  "probe_input_device_candidate",\n  "probe_output_device_candidate",\n  "probe.prepared && probe.functional_verified",\n  "The previous preference was kept",\n]);\nrequireMarkers(source.audioInput, "C1 functional microphone candidate verification", [\n  "FUNCTIONAL_INPUT_PROBE_TIMEOUT_MS",\n  "pub fn probe_input_device_functionally(",\n  ".build_input_stream(",\n  "stream.play()",\n  "recv_timeout(Duration::from_millis(FUNCTIONAL_INPUT_PROBE_TIMEOUT_MS))",\n  "functional_verified: true",\n  "callback_frames_observed: observed",\n  "No microphone samples were retained by this verification",\n]);\nforbidMarkers(source.audioInput, "C1 bounded functional microphone verification", ["thread::sleep("]);\nrequireMarkers(source.audioCommands, "C1 explicit-vs-routine microphone verification split", [\n  "probe_input_device_functionally(device_id.as_deref())",\n  "InputPreparationStatus::inspect_input_device(settings.audio.input_device_id.as_deref())",\n]);\nrequireMarkers(source.facade, "C1 frontend functional microphone truth", [\n  "status.functional_verified === true",\n]);''',
)

replace_once(
    "CONTEXT.md",
    '''`commands/settings.rs` owns the bounded audio-device selection transaction at the desktop boundary: load the current preference, probe the requested microphone/Meeting Sound through the existing audio owner, preserve the old preference on failure, persist on success, and return the canonical resulting settings. The frontend does not duplicate that rollback rule.''',
    '''`commands/settings.rs` owns the bounded audio-device selection transaction at the desktop boundary: load the current preference, functionally verify a requested microphone through a short CPAL stream/callback check (while routine status remains configuration-only), probe Meeting Sound through the existing output-device owner, preserve the old preference on failure, persist on success, and return the canonical resulting settings. The microphone verification retains no PCM/audio body. The frontend does not duplicate that rollback rule.''',
)

replace_once(
    "docs/knowledge/source-ownership.md",
    '''| Audio-device selection transaction | `commands/settings.rs` + `commands/audio.rs` | ACTIVE / RUST PROBE + PRESERVE + SAVE OWNER |''',
    '''| Audio-device selection transaction | `commands/settings.rs` + `commands/audio.rs` + `engine/audio/input.rs` | ACTIVE / FUNCTIONAL MIC PROBE + PRESERVE + SAVE OWNER |''',
)

next_action = "docs/knowledge/next-action.md"
content = read(next_action)
marker = "## Current Mode\n"
if marker not in content:
    raise RuntimeError("Current Mode marker missing in next-action.md")
prefix = content.split(marker, 1)[0].rstrip()
new_tail = r'''

## Pre-Local C1 — IMPLEMENTED / TARGET DEVICE PROOF DEFERRED

C1 closes the source-level gap behind PR-026 without turning routine readiness polling back into hardware work. `get_input_status` remains a configuration-only inspection path. Explicit microphone candidate verification now opens one temporary CPAL input stream using the same sample-format boundary as active live capture, starts the stream, waits up to a bounded 2-second callback budget for at least one native frame, then releases the stream. Silence is acceptable because the proof target is callback/device flow rather than speech content; no PCM samples or WAV are retained.

The audio-device selection transaction preserves the previous microphone preference unless that functional probe succeeds. A present/config-readable microphone that cannot build/start a stream, reports a callback error, or produces no callback frames before the bound is therefore rejected before persistence. Meeting/Mic Test resource ownership remains unchanged, and routine Meeting status polling does not call the functional probe.

Remote Windows proof for the implementation slice establishes source ownership and build correctness only:

```text
canonical source validators              -> PASS
svelte-check + frontend build            -> PASS
Rust unit tests                          -> PASS
cargo check                              -> PASS
Tauri release build --no-bundle          -> PASS
functional-probe ownership/source guard  -> PASS
```

A GitHub-hosted Windows runner is not a target microphone environment, so actual physical-device callback success remains target-Windows proof. No local-PC test, VAD retuning, Meeting route change, CUDA/model change, or installer work is part of C1.

## Current Mode

**Developing / Pre-Local Readiness — C1 IMPLEMENTED, TARGET DEVICE PROOF DEFERRED.** Backend hardening A1-A7 and B1-B6 remain closed. The selected-microphone persistence path now requires bounded functional stream/callback verification, while routine status stays side-effect-light. The user still does not approve local-PC testing, so C1 physical-device execution evidence remains deferred without blocking the next source-level pre-local development slice.

## Next Step — Pre-Local C2 Runtime Latency Instrumentation

Add privacy-safe outbound timing at the canonical Meeting owners so target testing can measure the official PR-052 metric from finalized utterance end to first translated audio playback, with stage timing sufficient to distinguish speech-boundary, ASR, translation, TTS, queue, and delivery cost. Do not tune VAD or invent a latency threshold before target-Windows evidence.
'''
write(next_action, prefix + new_tail)

print("C1 functional microphone patch staged")
