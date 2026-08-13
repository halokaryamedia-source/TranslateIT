use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::application_meeting_session_blocks_voice_lab;

const VOICE_LAB_SCHEMA_VERSION: u32 = 1;
const VOICE_ACTOR_ENGINE: &str = "gpt-sovits-v2proplus";
const VOICE_ACTOR_ENGINE_REVISION: &str = "d523079fc05d9a8028d6085bffe4a2757c32abb6";
const VOICE_ACTOR_MANIFEST_FILE: &str = "actor.json";
const VOICE_ACTOR_GPT_WEIGHT_FILE: &str = "gpt.ckpt";
const VOICE_ACTOR_SOVITS_WEIGHT_FILE: &str = "sovits.pth";
const VOICE_ACTOR_REFERENCE_WAV_FILE: &str = "reference.wav";
const VOICE_LAB_DATASET_MANIFEST_FILE: &str = "dataset.json";
const VOICE_LAB_CANONICAL_SAMPLE_RATE: u32 = 32_000;
const VOICE_LAB_CANONICAL_CHANNELS: u16 = 1;
const VOICE_LAB_CANONICAL_BITS_PER_SAMPLE: u16 = 16;
const VOICE_ACTOR_MIN_REFERENCE_MS: u64 = 3_000;
const VOICE_ACTOR_MAX_REFERENCE_MS: u64 = 10_000;
const MAX_VOICE_LAB_MANIFEST_BYTES: u64 = 64 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GuidedTakeContract {
    pub line_id: u32,
    pub exact_text: String,
    pub wav_file: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GuidedEvaluationLineContract {
    pub line_id: u32,
    pub exact_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GuidedDatasetManifest {
    pub schema_version: u32,
    pub authorized_voice_confirmed: bool,
    pub takes: Vec<GuidedTakeContract>,
    pub held_out_lines: Vec<GuidedEvaluationLineContract>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VoiceActorPackageManifest {
    pub schema_version: u32,
    pub engine: String,
    pub engine_revision: String,
    pub gpt_weight_file: String,
    pub sovits_weight_file: String,
    pub reference_wav_file: String,
    pub reference_text: String,
    pub reference_duration_ms: u64,
    pub held_out_evaluation_complete: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct VoiceLabBuildSnapshot {
    pub active: bool,
    pub generation: Option<u64>,
    pub phase: String,
    pub cancel_requested: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VoiceLabBuildPhase {
    Preparing,
    Training,
    Evaluating,
    Cancelling,
}

impl VoiceLabBuildPhase {
    fn as_str(self) -> &'static str {
        match self {
            Self::Preparing => "preparing",
            Self::Training => "training",
            Self::Evaluating => "evaluating",
            Self::Cancelling => "cancelling",
        }
    }
}

#[derive(Debug, Clone)]
struct ActiveVoiceLabBuild {
    generation: u64,
    phase: VoiceLabBuildPhase,
    cancel_requested: bool,
}

#[derive(Debug, Default)]
struct VoiceLabBuildLifecycle {
    next_generation: u64,
    active: Option<ActiveVoiceLabBuild>,
}

impl VoiceLabBuildLifecycle {
    fn snapshot(&self) -> VoiceLabBuildSnapshot {
        match self.active.as_ref() {
            Some(active) => VoiceLabBuildSnapshot {
                active: true,
                generation: Some(active.generation),
                phase: active.phase.as_str().to_string(),
                cancel_requested: active.cancel_requested,
            },
            None => idle_build_snapshot(),
        }
    }

    fn begin(&mut self) -> Result<VoiceLabBuildSnapshot, String> {
        if self.active.is_some() {
            return Err("voice_lab:build_already_active".to_string());
        }
        self.next_generation = self.next_generation.saturating_add(1).max(1);
        self.active = Some(ActiveVoiceLabBuild {
            generation: self.next_generation,
            phase: VoiceLabBuildPhase::Preparing,
            cancel_requested: false,
        });
        Ok(self.snapshot())
    }

    fn transition(
        &mut self,
        generation: u64,
        expected: VoiceLabBuildPhase,
        next: VoiceLabBuildPhase,
    ) -> Result<VoiceLabBuildSnapshot, String> {
        let Some(active) = self.active.as_mut() else {
            return Err("voice_lab:no_active_build".to_string());
        };
        if active.generation != generation {
            return Err("voice_lab:stale_build_generation".to_string());
        }
        if active.phase != expected || active.cancel_requested {
            return Err("voice_lab:invalid_build_transition".to_string());
        }
        active.phase = next;
        Ok(self.snapshot())
    }

    fn request_cancel(&mut self, generation: u64) -> Result<VoiceLabBuildSnapshot, String> {
        let Some(active) = self.active.as_mut() else {
            return Err("voice_lab:no_active_build".to_string());
        };
        if active.generation != generation {
            return Err("voice_lab:stale_build_generation".to_string());
        }
        if active.phase == VoiceLabBuildPhase::Cancelling {
            return Ok(self.snapshot());
        }
        active.cancel_requested = true;
        active.phase = VoiceLabBuildPhase::Cancelling;
        Ok(self.snapshot())
    }

    fn finish(&mut self, generation: u64) -> Result<VoiceLabBuildSnapshot, String> {
        let Some(active) = self.active.as_ref() else {
            return Err("voice_lab:no_active_build".to_string());
        };
        if active.generation != generation {
            return Err("voice_lab:stale_build_generation".to_string());
        }
        self.active = None;
        Ok(self.snapshot())
    }

    fn blocks_meeting(&self) -> bool {
        self.active.is_some()
    }
}

#[derive(Debug, Clone)]
pub struct VoiceLabStoragePaths {
    pub cache_root: PathBuf,
    pub takes_dir: PathBuf,
    pub build_dataset_dir: PathBuf,
    pub candidate_actor_dir: PathBuf,
    pub saved_root: PathBuf,
    pub approved_actor_dir: PathBuf,
}

impl VoiceLabStoragePaths {
    pub fn from_project_paths(paths: &ProjectPaths) -> Self {
        Self::from_roots(
            Path::new(&paths.user_cache_dir),
            Path::new(&paths.user_saved_dir),
        )
    }

    fn from_roots(cache_root: &Path, saved_root: &Path) -> Self {
        let cache_root = cache_root.join("VoiceLab");
        let saved_root = saved_root.join("VoiceLab");
        Self {
            takes_dir: cache_root.join("Takes"),
            build_dataset_dir: cache_root.join("Build").join("Dataset"),
            candidate_actor_dir: cache_root.join("Candidate"),
            approved_actor_dir: saved_root.join("MyVoice"),
            cache_root,
            saved_root,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct CanonicalWavInfo {
    duration_ms: u64,
}

static VOICE_LAB_BUILD_STATE: OnceLock<Mutex<VoiceLabBuildLifecycle>> = OnceLock::new();
static VOICE_LAB_PROMOTION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn build_store() -> &'static Mutex<VoiceLabBuildLifecycle> {
    VOICE_LAB_BUILD_STATE.get_or_init(|| Mutex::new(VoiceLabBuildLifecycle::default()))
}

fn promotion_lock() -> &'static Mutex<()> {
    VOICE_LAB_PROMOTION_LOCK.get_or_init(|| Mutex::new(()))
}

fn idle_build_snapshot() -> VoiceLabBuildSnapshot {
    VoiceLabBuildSnapshot {
        active: false,
        generation: None,
        phase: "idle".to_string(),
        cancel_requested: false,
    }
}

pub fn current_voice_lab_build_snapshot() -> VoiceLabBuildSnapshot {
    build_store()
        .lock()
        .map(|state| state.snapshot())
        .unwrap_or_else(|_| VoiceLabBuildSnapshot {
            active: true,
            generation: None,
            phase: "state_unavailable".to_string(),
            cancel_requested: true,
        })
}

pub fn voice_lab_build_blocks_meeting() -> bool {
    build_store()
        .lock()
        .map(|state| state.blocks_meeting())
        .unwrap_or(true)
}

pub fn begin_voice_lab_build() -> Result<VoiceLabBuildSnapshot, String> {
    if application_meeting_session_blocks_voice_lab() {
        return Err("voice_lab:meeting_active".to_string());
    }
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .begin()
}

pub fn mark_voice_lab_build_training(generation: u64) -> Result<VoiceLabBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .transition(
            generation,
            VoiceLabBuildPhase::Preparing,
            VoiceLabBuildPhase::Training,
        )
}

pub fn mark_voice_lab_build_evaluating(generation: u64) -> Result<VoiceLabBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .transition(
            generation,
            VoiceLabBuildPhase::Training,
            VoiceLabBuildPhase::Evaluating,
        )
}

pub fn request_voice_lab_build_cancel(generation: u64) -> Result<VoiceLabBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .request_cancel(generation)
}

pub fn finish_voice_lab_build(generation: u64) -> Result<VoiceLabBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .finish(generation)
}

pub fn prepare_guided_dataset(
    paths: &ProjectPaths,
    generation: u64,
    manifest: &GuidedDatasetManifest,
) -> Result<PathBuf, String> {
    ensure_build_generation(generation, VoiceLabBuildPhase::Preparing)?;
    let storage = VoiceLabStoragePaths::from_project_paths(paths);
    prepare_guided_dataset_at(&storage, manifest)
}

pub fn promote_voice_actor_candidate(paths: &ProjectPaths) -> Result<(), String> {
    if application_meeting_session_blocks_voice_lab() {
        return Err("voice_lab:meeting_active".to_string());
    }
    if voice_lab_build_blocks_meeting() {
        return Err("voice_lab:build_active".to_string());
    }
    let storage = VoiceLabStoragePaths::from_project_paths(paths);
    promote_voice_actor_candidate_at(&storage)
}

fn ensure_build_generation(
    generation: u64,
    expected_phase: VoiceLabBuildPhase,
) -> Result<(), String> {
    let guard = build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?;
    let Some(active) = guard.active.as_ref() else {
        return Err("voice_lab:no_active_build".to_string());
    };
    if active.generation != generation {
        return Err("voice_lab:stale_build_generation".to_string());
    }
    if active.phase != expected_phase || active.cancel_requested {
        return Err("voice_lab:invalid_build_transition".to_string());
    }
    Ok(())
}

fn canonical_take_file_name(line_id: u32) -> String {
    format!("take_{line_id:04}.wav")
}

fn validate_guided_dataset_manifest(manifest: &GuidedDatasetManifest) -> Result<(), String> {
    if manifest.schema_version != VOICE_LAB_SCHEMA_VERSION {
        return Err("voice_lab:unsupported_dataset_schema".to_string());
    }
    if !manifest.authorized_voice_confirmed {
        return Err("voice_lab:voice_authorization_required".to_string());
    }
    if manifest.takes.is_empty() {
        return Err("voice_lab:no_accepted_takes".to_string());
    }
    if manifest.held_out_lines.is_empty() {
        return Err("voice_lab:no_held_out_evaluation_lines".to_string());
    }

    let mut training_ids = HashSet::new();
    let mut training_text = HashSet::new();
    let mut training_files = HashSet::new();
    for take in &manifest.takes {
        let text = take.exact_text.trim();
        if take.line_id == 0 || text.is_empty() {
            return Err("voice_lab:invalid_guided_take".to_string());
        }
        if take.wav_file != canonical_take_file_name(take.line_id) {
            return Err("voice_lab:noncanonical_take_filename".to_string());
        }
        if !training_ids.insert(take.line_id)
            || !training_text.insert(text.to_string())
            || !training_files.insert(take.wav_file.clone())
        {
            return Err("voice_lab:duplicate_guided_take".to_string());
        }
    }

    let mut held_out_ids = HashSet::new();
    let mut held_out_text = HashSet::new();
    for line in &manifest.held_out_lines {
        let text = line.exact_text.trim();
        if line.line_id == 0 || text.is_empty() {
            return Err("voice_lab:invalid_held_out_line".to_string());
        }
        if !held_out_ids.insert(line.line_id) || !held_out_text.insert(text.to_string()) {
            return Err("voice_lab:duplicate_held_out_line".to_string());
        }
        if training_ids.contains(&line.line_id) || training_text.contains(text) {
            return Err("voice_lab:held_out_line_used_for_training".to_string());
        }
    }
    Ok(())
}

fn prepare_guided_dataset_at(
    storage: &VoiceLabStoragePaths,
    manifest: &GuidedDatasetManifest,
) -> Result<PathBuf, String> {
    validate_guided_dataset_manifest(manifest)?;
    fs::create_dir_all(&storage.takes_dir)
        .map_err(|error| format!("voice_lab:takes_directory_unavailable:{error}"))?;

    for take in &manifest.takes {
        let source = storage.takes_dir.join(&take.wav_file);
        inspect_canonical_voice_lab_wav(&source)?;
    }

    if storage.build_dataset_dir.exists() {
        fs::remove_dir_all(&storage.build_dataset_dir)
            .map_err(|error| format!("voice_lab:build_dataset_cleanup_failed:{error}"))?;
    }
    fs::create_dir_all(&storage.build_dataset_dir)
        .map_err(|error| format!("voice_lab:build_dataset_create_failed:{error}"))?;

    for take in &manifest.takes {
        let source = storage.takes_dir.join(&take.wav_file);
        let target = storage.build_dataset_dir.join(&take.wav_file);
        fs::copy(&source, &target)
            .map_err(|error| format!("voice_lab:build_take_copy_failed:{error}"))?;
        inspect_canonical_voice_lab_wav(&target)?;
    }

    let manifest_path = storage
        .build_dataset_dir
        .join(VOICE_LAB_DATASET_MANIFEST_FILE);
    write_json_file(&manifest_path, manifest)?;
    Ok(manifest_path)
}

fn validate_voice_actor_package(dir: &Path) -> Result<VoiceActorPackageManifest, String> {
    let manifest_path = dir.join(VOICE_ACTOR_MANIFEST_FILE);
    let metadata = fs::symlink_metadata(&manifest_path)
        .map_err(|error| format!("voice_lab:actor_manifest_missing:{error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("voice_lab:actor_manifest_not_regular_file".to_string());
    }
    if metadata.len() == 0 || metadata.len() > MAX_VOICE_LAB_MANIFEST_BYTES {
        return Err("voice_lab:actor_manifest_size_invalid".to_string());
    }
    let bytes = fs::read(&manifest_path)
        .map_err(|error| format!("voice_lab:actor_manifest_read_failed:{error}"))?;
    let manifest = serde_json::from_slice::<VoiceActorPackageManifest>(&bytes)
        .map_err(|error| format!("voice_lab:actor_manifest_invalid_json:{error}"))?;

    if manifest.schema_version != VOICE_LAB_SCHEMA_VERSION
        || manifest.engine != VOICE_ACTOR_ENGINE
        || manifest.engine_revision != VOICE_ACTOR_ENGINE_REVISION
    {
        return Err("voice_lab:actor_engine_contract_mismatch".to_string());
    }
    if manifest.gpt_weight_file != VOICE_ACTOR_GPT_WEIGHT_FILE
        || manifest.sovits_weight_file != VOICE_ACTOR_SOVITS_WEIGHT_FILE
        || manifest.reference_wav_file != VOICE_ACTOR_REFERENCE_WAV_FILE
    {
        return Err("voice_lab:actor_package_filename_mismatch".to_string());
    }
    if manifest.reference_text.trim().is_empty() {
        return Err("voice_lab:actor_reference_text_missing".to_string());
    }
    if !manifest.held_out_evaluation_complete {
        return Err("voice_lab:actor_evaluation_incomplete".to_string());
    }

    validate_nonempty_regular_file(&dir.join(VOICE_ACTOR_GPT_WEIGHT_FILE), "gpt_weight")?;
    validate_nonempty_regular_file(
        &dir.join(VOICE_ACTOR_SOVITS_WEIGHT_FILE),
        "sovits_weight",
    )?;
    let wav = inspect_canonical_voice_lab_wav(&dir.join(VOICE_ACTOR_REFERENCE_WAV_FILE))?;
    if wav.duration_ms < VOICE_ACTOR_MIN_REFERENCE_MS
        || wav.duration_ms > VOICE_ACTOR_MAX_REFERENCE_MS
        || manifest.reference_duration_ms != wav.duration_ms
    {
        return Err("voice_lab:actor_reference_duration_invalid".to_string());
    }

    Ok(manifest)
}

fn validate_nonempty_regular_file(path: &Path, label: &str) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("voice_lab:{label}_missing:{error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() || metadata.len() == 0 {
        return Err(format!("voice_lab:{label}_invalid"));
    }
    Ok(())
}

fn promote_voice_actor_candidate_at(storage: &VoiceLabStoragePaths) -> Result<(), String> {
    let _promotion = promotion_lock()
        .lock()
        .map_err(|_| "voice_lab:promotion_state_unavailable".to_string())?;

    fs::create_dir_all(&storage.saved_root)
        .map_err(|error| format!("voice_lab:saved_root_unavailable:{error}"))?;
    recover_interrupted_promotion(storage)?;
    validate_voice_actor_package(&storage.candidate_actor_dir)?;

    let staging = storage.saved_root.join(".MyVoice.next");
    let previous = storage.saved_root.join(".MyVoice.previous");
    if staging.exists() {
        fs::remove_dir_all(&staging)
            .map_err(|error| format!("voice_lab:staging_cleanup_failed:{error}"))?;
    }
    fs::create_dir_all(&staging)
        .map_err(|error| format!("voice_lab:staging_create_failed:{error}"))?;

    for file_name in [
        VOICE_ACTOR_MANIFEST_FILE,
        VOICE_ACTOR_GPT_WEIGHT_FILE,
        VOICE_ACTOR_SOVITS_WEIGHT_FILE,
        VOICE_ACTOR_REFERENCE_WAV_FILE,
    ] {
        fs::copy(
            storage.candidate_actor_dir.join(file_name),
            staging.join(file_name),
        )
        .map_err(|error| format!("voice_lab:actor_stage_copy_failed:{error}"))?;
    }
    validate_voice_actor_package(&staging)?;

    if storage.approved_actor_dir.exists() {
        if previous.exists() {
            fs::remove_dir_all(&previous)
                .map_err(|error| format!("voice_lab:previous_cleanup_failed:{error}"))?;
        }
        fs::rename(&storage.approved_actor_dir, &previous)
            .map_err(|error| format!("voice_lab:approved_actor_backup_failed:{error}"))?;
    }

    if let Err(error) = fs::rename(&staging, &storage.approved_actor_dir) {
        if previous.exists() && !storage.approved_actor_dir.exists() {
            if let Err(rollback_error) = fs::rename(&previous, &storage.approved_actor_dir) {
                return Err(format!(
                    "voice_lab:actor_promotion_failed:{error};rollback_failed:{rollback_error}"
                ));
            }
        }
        return Err(format!("voice_lab:actor_promotion_failed:{error}"));
    }

    validate_voice_actor_package(&storage.approved_actor_dir)?;
    if previous.exists() {
        let _ = fs::remove_dir_all(previous);
    }
    Ok(())
}

fn recover_interrupted_promotion(storage: &VoiceLabStoragePaths) -> Result<(), String> {
    let staging = storage.saved_root.join(".MyVoice.next");
    let previous = storage.saved_root.join(".MyVoice.previous");

    if storage.approved_actor_dir.exists() {
        validate_voice_actor_package(&storage.approved_actor_dir)?;
        if staging.exists() {
            fs::remove_dir_all(&staging)
                .map_err(|error| format!("voice_lab:stale_staging_cleanup_failed:{error}"))?;
        }
        if previous.exists() {
            fs::remove_dir_all(&previous)
                .map_err(|error| format!("voice_lab:stale_previous_cleanup_failed:{error}"))?;
        }
        return Ok(());
    }

    if previous.exists() {
        validate_voice_actor_package(&previous)?;
        fs::rename(&previous, &storage.approved_actor_dir)
            .map_err(|error| format!("voice_lab:promotion_recovery_failed:{error}"))?;
    }
    if staging.exists() {
        fs::remove_dir_all(&staging)
            .map_err(|error| format!("voice_lab:stale_staging_cleanup_failed:{error}"))?;
    }
    Ok(())
}

fn write_json_file<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "voice_lab:manifest_parent_missing".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("voice_lab:manifest_parent_create_failed:{error}"))?;
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("voice_lab:manifest_serialize_failed:{error}"))?;
    if bytes.is_empty() || bytes.len() as u64 > MAX_VOICE_LAB_MANIFEST_BYTES {
        return Err("voice_lab:manifest_size_invalid".to_string());
    }
    fs::write(path, bytes).map_err(|error| format!("voice_lab:manifest_write_failed:{error}"))
}

fn inspect_canonical_voice_lab_wav(path: &Path) -> Result<CanonicalWavInfo, String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("voice_lab:wav_missing:{error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() || metadata.len() < 44 {
        return Err("voice_lab:wav_invalid_file".to_string());
    }

    let mut file = File::open(path).map_err(|error| format!("voice_lab:wav_open_failed:{error}"))?;
    let mut riff = [0u8; 12];
    file.read_exact(&mut riff)
        .map_err(|error| format!("voice_lab:wav_header_read_failed:{error}"))?;
    if &riff[0..4] != b"RIFF" || &riff[8..12] != b"WAVE" {
        return Err("voice_lab:wav_not_pcm_container".to_string());
    }

    let mut format: Option<(u16, u16, u32, u16)> = None;
    let mut data_size: Option<u64> = None;
    loop {
        let position = file
            .stream_position()
            .map_err(|error| format!("voice_lab:wav_seek_failed:{error}"))?;
        if position.saturating_add(8) > metadata.len() {
            break;
        }

        let mut chunk_header = [0u8; 8];
        file.read_exact(&mut chunk_header)
            .map_err(|error| format!("voice_lab:wav_chunk_header_failed:{error}"))?;
        let chunk_size = u32::from_le_bytes([
            chunk_header[4],
            chunk_header[5],
            chunk_header[6],
            chunk_header[7],
        ]) as u64;
        let chunk_start = file
            .stream_position()
            .map_err(|error| format!("voice_lab:wav_seek_failed:{error}"))?;
        if chunk_start.saturating_add(chunk_size) > metadata.len() {
            return Err("voice_lab:wav_chunk_out_of_bounds".to_string());
        }

        if &chunk_header[0..4] == b"fmt " {
            if chunk_size < 16 {
                return Err("voice_lab:wav_format_chunk_too_small".to_string());
            }
            let mut fmt = [0u8; 16];
            file.read_exact(&mut fmt)
                .map_err(|error| format!("voice_lab:wav_format_read_failed:{error}"))?;
            let audio_format = u16::from_le_bytes([fmt[0], fmt[1]]);
            let channels = u16::from_le_bytes([fmt[2], fmt[3]]);
            let sample_rate = u32::from_le_bytes([fmt[4], fmt[5], fmt[6], fmt[7]]);
            let bits_per_sample = u16::from_le_bytes([fmt[14], fmt[15]]);
            format = Some((audio_format, channels, sample_rate, bits_per_sample));
        } else if &chunk_header[0..4] == b"data" {
            data_size = Some(chunk_size);
        }

        let padded_size = chunk_size.saturating_add(chunk_size % 2);
        file.seek(SeekFrom::Start(chunk_start.saturating_add(padded_size)))
            .map_err(|error| format!("voice_lab:wav_seek_failed:{error}"))?;
        if format.is_some() && data_size.is_some() {
            break;
        }
    }

    let Some((audio_format, channels, sample_rate, bits_per_sample)) = format else {
        return Err("voice_lab:wav_format_missing".to_string());
    };
    let Some(data_size) = data_size else {
        return Err("voice_lab:wav_data_missing".to_string());
    };
    if audio_format != 1
        || channels != VOICE_LAB_CANONICAL_CHANNELS
        || sample_rate != VOICE_LAB_CANONICAL_SAMPLE_RATE
        || bits_per_sample != VOICE_LAB_CANONICAL_BITS_PER_SAMPLE
    {
        return Err("voice_lab:wav_not_canonical_pcm16_32khz_mono".to_string());
    }
    if data_size == 0 {
        return Err("voice_lab:wav_empty".to_string());
    }

    let bytes_per_second = u64::from(sample_rate)
        .saturating_mul(u64::from(channels))
        .saturating_mul(u64::from(bits_per_sample / 8));
    if bytes_per_second == 0 {
        return Err("voice_lab:wav_invalid_rate".to_string());
    }
    let duration_ms = data_size.saturating_mul(1_000) / bytes_per_second;
    if duration_ms == 0 {
        return Err("voice_lab:wav_too_short".to_string());
    }
    Ok(CanonicalWavInfo { duration_ms })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_root(label: &str) -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("translateit_voicelab_{label}_{now}"))
    }

    fn write_pcm16_mono_wav(path: &Path, duration_ms: u64) {
        let sample_count = u64::from(VOICE_LAB_CANONICAL_SAMPLE_RATE)
            .saturating_mul(duration_ms)
            / 1_000;
        let data_size = sample_count.saturating_mul(2) as u32;
        let mut bytes = Vec::with_capacity(44 + data_size as usize);
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36u32.saturating_add(data_size)).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&VOICE_LAB_CANONICAL_CHANNELS.to_le_bytes());
        bytes.extend_from_slice(&VOICE_LAB_CANONICAL_SAMPLE_RATE.to_le_bytes());
        bytes.extend_from_slice(&(VOICE_LAB_CANONICAL_SAMPLE_RATE * 2).to_le_bytes());
        bytes.extend_from_slice(&2u16.to_le_bytes());
        bytes.extend_from_slice(&VOICE_LAB_CANONICAL_BITS_PER_SAMPLE.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_size.to_le_bytes());
        bytes.resize(44 + data_size as usize, 0);
        fs::create_dir_all(path.parent().expect("wav parent")).expect("create wav parent");
        fs::write(path, bytes).expect("write wav");
    }

    fn valid_dataset() -> GuidedDatasetManifest {
        GuidedDatasetManifest {
            schema_version: VOICE_LAB_SCHEMA_VERSION,
            authorized_voice_confirmed: true,
            takes: vec![GuidedTakeContract {
                line_id: 1,
                exact_text: "Tomorrow we will review the project timeline.".to_string(),
                wav_file: canonical_take_file_name(1),
            }],
            held_out_lines: vec![GuidedEvaluationLineContract {
                line_id: 101,
                exact_text: "The meeting begins after everyone is ready.".to_string(),
            }],
        }
    }

    fn valid_actor_manifest(reference_duration_ms: u64) -> VoiceActorPackageManifest {
        VoiceActorPackageManifest {
            schema_version: VOICE_LAB_SCHEMA_VERSION,
            engine: VOICE_ACTOR_ENGINE.to_string(),
            engine_revision: VOICE_ACTOR_ENGINE_REVISION.to_string(),
            gpt_weight_file: VOICE_ACTOR_GPT_WEIGHT_FILE.to_string(),
            sovits_weight_file: VOICE_ACTOR_SOVITS_WEIGHT_FILE.to_string(),
            reference_wav_file: VOICE_ACTOR_REFERENCE_WAV_FILE.to_string(),
            reference_text: "Tomorrow we will review the project timeline.".to_string(),
            reference_duration_ms,
            held_out_evaluation_complete: true,
        }
    }

    fn write_actor_package(dir: &Path, reference_duration_ms: u64, marker: &[u8]) {
        fs::create_dir_all(dir).expect("create actor package");
        fs::write(dir.join(VOICE_ACTOR_GPT_WEIGHT_FILE), marker).expect("write gpt weight");
        fs::write(dir.join(VOICE_ACTOR_SOVITS_WEIGHT_FILE), marker).expect("write sovits weight");
        write_pcm16_mono_wav(
            &dir.join(VOICE_ACTOR_REFERENCE_WAV_FILE),
            reference_duration_ms,
        );
        write_json_file(
            &dir.join(VOICE_ACTOR_MANIFEST_FILE),
            &valid_actor_manifest(reference_duration_ms),
        )
        .expect("write actor manifest");
    }

    #[test]
    fn lifecycle_is_generation_bound_and_cancel_is_explicit() {
        let mut lifecycle = VoiceLabBuildLifecycle::default();
        let started = lifecycle.begin().expect("begin build");
        let generation = started.generation.expect("generation");
        assert!(lifecycle.blocks_meeting());
        assert_eq!(started.phase, "preparing");
        assert_eq!(
            lifecycle.transition(
                generation + 1,
                VoiceLabBuildPhase::Preparing,
                VoiceLabBuildPhase::Training,
            ),
            Err("voice_lab:stale_build_generation".to_string())
        );
        let training = lifecycle
            .transition(
                generation,
                VoiceLabBuildPhase::Preparing,
                VoiceLabBuildPhase::Training,
            )
            .expect("training transition");
        assert_eq!(training.phase, "training");
        let cancelling = lifecycle.request_cancel(generation).expect("cancel request");
        assert_eq!(cancelling.phase, "cancelling");
        assert!(cancelling.cancel_requested);
        let finished = lifecycle.finish(generation).expect("finish cancel");
        assert!(!finished.active);
        assert!(!lifecycle.blocks_meeting());
    }

    #[test]
    fn dataset_requires_authorization_and_held_out_separation() {
        let mut manifest = valid_dataset();
        manifest.authorized_voice_confirmed = false;
        assert_eq!(
            validate_guided_dataset_manifest(&manifest),
            Err("voice_lab:voice_authorization_required".to_string())
        );

        let mut manifest = valid_dataset();
        manifest.held_out_lines[0].exact_text = manifest.takes[0].exact_text.clone();
        assert_eq!(
            validate_guided_dataset_manifest(&manifest),
            Err("voice_lab:held_out_line_used_for_training".to_string())
        );
    }

    #[test]
    fn guided_dataset_freezes_only_canonical_accepted_wavs() {
        let root = test_root("dataset");
        let storage = VoiceLabStoragePaths::from_roots(&root.join("cache"), &root.join("saved"));
        let manifest = valid_dataset();
        write_pcm16_mono_wav(&storage.takes_dir.join(canonical_take_file_name(1)), 1_200);

        let manifest_path = prepare_guided_dataset_at(&storage, &manifest).expect("prepare dataset");
        assert!(manifest_path.is_file());
        assert!(storage
            .build_dataset_dir
            .join(canonical_take_file_name(1))
            .is_file());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn actor_package_requires_native_weights_evaluation_and_reference_contract() {
        let root = test_root("actor_validation");
        write_actor_package(&root, 4_000, b"weight");
        assert!(validate_voice_actor_package(&root).is_ok());

        let mut manifest = valid_actor_manifest(4_000);
        manifest.held_out_evaluation_complete = false;
        write_json_file(&root.join(VOICE_ACTOR_MANIFEST_FILE), &manifest)
            .expect("rewrite actor manifest");
        assert_eq!(
            validate_voice_actor_package(&root),
            Err("voice_lab:actor_evaluation_incomplete".to_string())
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn promotion_replaces_only_after_candidate_is_valid_and_keeps_old_on_rejection() {
        let root = test_root("promotion");
        let storage = VoiceLabStoragePaths::from_roots(&root.join("cache"), &root.join("saved"));
        write_actor_package(&storage.approved_actor_dir, 4_000, b"old");
        write_actor_package(&storage.candidate_actor_dir, 4_000, b"new");

        promote_voice_actor_candidate_at(&storage).expect("promote candidate");
        assert_eq!(
            fs::read(storage.approved_actor_dir.join(VOICE_ACTOR_GPT_WEIGHT_FILE))
                .expect("read approved weight"),
            b"new"
        );

        fs::remove_file(storage.candidate_actor_dir.join(VOICE_ACTOR_SOVITS_WEIGHT_FILE))
            .expect("invalidate candidate");
        assert!(promote_voice_actor_candidate_at(&storage).is_err());
        assert_eq!(
            fs::read(storage.approved_actor_dir.join(VOICE_ACTOR_GPT_WEIGHT_FILE))
                .expect("read preserved approved weight"),
            b"new"
        );
        let _ = fs::remove_dir_all(root);
    }
}
