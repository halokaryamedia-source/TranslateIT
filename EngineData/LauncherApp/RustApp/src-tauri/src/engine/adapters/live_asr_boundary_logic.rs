use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::engine::adapters::asr_model_logic::{build_asr_profile_plan, AsrProfilePlan, AsrProfileRequest};
use crate::engine::audio::live_audio_buffer::{live_target_segment_snapshot, LiveTargetSegmentReport};
use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;
use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone, Serialize)]
pub struct LiveAsrBoundaryReport {
    pub ok: bool,
    pub execution_attempted: bool,
    pub transcript_text: Option<String>,
    pub segment_id: String,
    pub input_ready: bool,
    pub model_ready: bool,
    pub backend_ready: bool,
    pub decoder_connected: bool,
    pub ready_for_decoder_call: bool,
    pub consume_after_success_only: bool,
    pub duplicate_guard_key: String,
    pub duplicate_of_last_success: bool,
    pub last_consumed_segment_id: Option<String>,
    pub last_consumed_unix_ms: Option<u128>,
    pub target_segment: LiveTargetSegmentReport,
    pub asr_profile_plan: AsrProfilePlan,
    pub backend_validation: NativeCudaBackendValidationReport,
    pub blocker: String,
    pub note: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct AsrConsumeGuardReport {
    pub consumed: bool,
    pub segment_id: String,
    pub duplicate_guard_key: String,
    pub last_consumed_segment_id: Option<String>,
    pub note: String,
}

#[derive(Debug, Clone)]
struct AsrConsumeState {
    segment_id: String,
    duplicate_guard_key: String,
    consumed_unix_ms: u128,
}

static ASR_CONSUME_STATE: OnceLock<Mutex<Option<AsrConsumeState>>> = OnceLock::new();

pub fn analyze_live_asr_boundary() -> LiveAsrBoundaryReport {
    let project_paths = ProjectPaths::discover();
    let target_segment = live_target_segment_snapshot();
    let segment_id = segment_id(&target_segment);
    let duplicate_guard_key = duplicate_key(&target_segment);
    let consume_state = latest_consume_state();
    let duplicate_of_last_success = consume_state
        .as_ref()
        .map(|state| state.duplicate_guard_key == duplicate_guard_key)
        .unwrap_or(false);
    let backend_validation = NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    let asr_profile_plan = build_asr_profile_plan(AsrProfileRequest {
        primary_model: Some("large-v3-turbo".to_string()),
        backup_model: Some("medium".to_string()),
        model_root: Some(project_paths.asr_model_dir.clone()),
        device: Some(backend_validation.preferred_device.clone()),
        compute_type: Some(backend_validation.preferred_compute_type.clone()),
        language: Some("id".to_string()),
        task: Some("transcribe".to_string()),
        temperature: Some(0),
        beam_size: Some(1),
        condition_on_previous_text: Some(false),
        vad_filter: Some(false),
        word_timestamps: Some(false),
        initial_prompt: None,
    });

    let input_ready = target_segment.ready && target_segment.frame.as_ref().map(|frame| frame.is_target_format()).unwrap_or(false);
    let model_ready = asr_profile_plan.ready_for_native_execution;
    let backend_ready = backend_validation.ready;
    let decoder_connected = false;
    let ready_for_decoder_call = input_ready && model_ready && backend_ready && decoder_connected && !duplicate_of_last_success;

    let blocker = if duplicate_of_last_success {
        "asr_boundary:duplicate_segment_already_consumed".to_string()
    } else if !input_ready {
        format!("asr_boundary:input_not_ready:{}", target_segment.blocker)
    } else if !model_ready {
        "asr_boundary:model_not_ready".to_string()
    } else if !backend_ready {
        format!("asr_boundary:backend_not_ready:{}", backend_validation.blocker)
    } else if !decoder_connected {
        "asr_boundary:native_decoder_not_connected".to_string()
    } else {
        String::new()
    };

    let note = if ready_for_decoder_call {
        format!(
            "Live ASR boundary is ready to call the native decoder. segment_id={}, samples={}",
            segment_id, target_segment.target_sample_count
        )
    } else {
        format!(
            "Live ASR boundary is blocked before transcription. segment_id={}, input_ready={}, model_ready={}, backend_ready={}, decoder_connected={}, duplicate={}, blocker={}",
            segment_id, input_ready, model_ready, backend_ready, decoder_connected, duplicate_of_last_success, blocker
        )
    };

    LiveAsrBoundaryReport {
        ok: false,
        execution_attempted: false,
        transcript_text: None,
        segment_id,
        input_ready,
        model_ready,
        backend_ready,
        decoder_connected,
        ready_for_decoder_call,
        consume_after_success_only: true,
        duplicate_guard_key,
        duplicate_of_last_success,
        last_consumed_segment_id: consume_state.as_ref().map(|state| state.segment_id.clone()),
        last_consumed_unix_ms: consume_state.as_ref().map(|state| state.consumed_unix_ms),
        target_segment,
        asr_profile_plan,
        backend_validation,
        blocker,
        note,
    }
}

pub fn mark_live_asr_segment_consumed_after_success() -> AsrConsumeGuardReport {
    let boundary = analyze_live_asr_boundary();
    if !boundary.ready_for_decoder_call {
        return AsrConsumeGuardReport {
            consumed: false,
            segment_id: boundary.segment_id,
            duplicate_guard_key: boundary.duplicate_guard_key,
            last_consumed_segment_id: boundary.last_consumed_segment_id,
            note: format!("ASR segment was not consumed because decoder call is not ready. blocker={}", boundary.blocker),
        };
    }

    let state = AsrConsumeState {
        segment_id: boundary.segment_id.clone(),
        duplicate_guard_key: boundary.duplicate_guard_key.clone(),
        consumed_unix_ms: current_unix_ms(),
    };
    let store = ASR_CONSUME_STATE.get_or_init(|| Mutex::new(None));
    if let Ok(mut guard) = store.lock() {
        *guard = Some(state.clone());
    }

    AsrConsumeGuardReport {
        consumed: true,
        segment_id: state.segment_id,
        duplicate_guard_key: state.duplicate_guard_key,
        last_consumed_segment_id: Some(boundary.segment_id),
        note: "ASR segment consume guard was updated after successful decoder execution.".to_string(),
    }
}

fn latest_consume_state() -> Option<AsrConsumeState> {
    ASR_CONSUME_STATE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .ok()
        .and_then(|guard| guard.as_ref().cloned())
}

fn segment_id(segment: &LiveTargetSegmentReport) -> String {
    if !segment.ready {
        return "live_segment_pending".to_string();
    }
    format!(
        "live_asr_{}_{}_{}_{}",
        segment.target_sample_rate_hz,
        segment.target_channels,
        segment.target_sample_count,
        hash_segment(segment)
    )
}

fn duplicate_key(segment: &LiveTargetSegmentReport) -> String {
    format!(
        "{}:{}:{}:{}:{}",
        segment.ready,
        segment.source_sample_rate_hz.unwrap_or(0),
        segment.target_sample_rate_hz,
        segment.target_sample_count,
        hash_segment(segment)
    )
}

fn hash_segment(segment: &LiveTargetSegmentReport) -> u64 {
    let mut hasher = DefaultHasher::new();
    segment.ready.hash(&mut hasher);
    segment.source_sample_rate_hz.hash(&mut hasher);
    segment.source_channels.hash(&mut hasher);
    segment.target_sample_rate_hz.hash(&mut hasher);
    segment.target_channels.hash(&mut hasher);
    segment.source_duration_ms.hash(&mut hasher);
    segment.target_duration_ms.hash(&mut hasher);
    segment.source_sample_count.hash(&mut hasher);
    segment.target_sample_count.hash(&mut hasher);
    segment.resampled.hash(&mut hasher);
    segment.downmixed_to_mono.hash(&mut hasher);
    if let Some(frame) = &segment.frame {
        frame.sample_rate_hz.hash(&mut hasher);
        frame.channels.hash(&mut hasher);
        frame.samples.len().hash(&mut hasher);
        for sample in frame.samples.iter().step_by((frame.samples.len() / 64).max(1)) {
            sample.to_bits().hash(&mut hasher);
        }
    }
    hasher.finish()
}

fn current_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
