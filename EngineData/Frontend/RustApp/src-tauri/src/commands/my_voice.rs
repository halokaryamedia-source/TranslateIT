use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

use crate::engine::paths::ProjectPaths;
use crate::engine::runtime_state::latest_runtime_session_state;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";
const MY_VOICE_SCHEMA_VERSION: u32 = 1;
const VOICE_ACTOR_ENGINE: &str = "gpt-sovits-v2proplus";
const VOICE_ACTOR_ENGINE_REVISION: &str = "d523079fc05d9a8028d6085bffe4a2757c32abb6";
const ACTOR_MANIFEST_FILE: &str = "actor.json";
const GPT_WEIGHT_FILE: &str = "gpt.ckpt";
const SOVITS_WEIGHT_FILE: &str = "sovits.pth";
const REFERENCE_WAV_FILE: &str = "reference.wav";
const DATASET_MANIFEST_FILE: &str = "dataset.json";
const CANONICAL_SAMPLE_RATE: u32 = 32_000;
const CANONICAL_CHANNELS: u16 = 1;
const CANONICAL_BITS_PER_SAMPLE: u16 = 16;
const MIN_REFERENCE_MS: u64 = 3_000;
const MAX_REFERENCE_MS: u64 = 10_000;
const MAX_MANIFEST_BYTES: u64 = 64 * 1024;

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
pub struct MyVoiceBuildSnapshot {
    pub active: bool,
    pub generation: Option<u64>,
    pub phase: String,
    pub cancel_requested: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum BuildPhase {
    Preparing,
    Training,
    Evaluating,
    Cancelling,
}

impl BuildPhase {
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
struct ActiveBuild {
    generation: u64,
    phase: BuildPhase,
    cancel_requested: bool,
}

#[derive(Debug, Default)]
struct BuildLifecycle {
    next_generation: u64,
    active: Option<ActiveBuild>,
}

impl BuildLifecycle {
    fn snapshot(&self) -> MyVoiceBuildSnapshot {
        match self.active.as_ref() {
            Some(active) => MyVoiceBuildSnapshot {
                active: true,
                generation: Some(active.generation),
                phase: active.phase.as_str().to_string(),
                cancel_requested: active.cancel_requested,
            },
            None => idle_snapshot(),
        }
    }

    fn begin(&mut self) -> Result<MyVoiceBuildSnapshot, String> {
        if self.active.is_some() {
            return Err("voice_lab:build_already_active".to_string());
        }
        self.next_generation = self.next_generation.saturating_add(1).max(1);
        self.active = Some(ActiveBuild {
            generation: self.next_generation,
            phase: BuildPhase::Preparing,
            cancel_requested: false,
        });
        Ok(self.snapshot())
    }

    fn transition(
        &mut self,
        generation: u64,
        expected: BuildPhase,
        next: BuildPhase,
    ) -> Result<MyVoiceBuildSnapshot, String> {
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

    fn cancel(&mut self, generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
        let Some(active) = self.active.as_mut() else {
            return Err("voice_lab:no_active_build".to_string());
        };
        if active.generation != generation {
            return Err("voice_lab:stale_build_generation".to_string());
        }
        if active.phase != BuildPhase::Cancelling {
            active.cancel_requested = true;
            active.phase = BuildPhase::Cancelling;
        }
        Ok(self.snapshot())
    }

    fn finish(&mut self, generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
        let Some(active) = self.active.as_ref() else {
            return Err("voice_lab:no_active_build".to_string());
        };
        if active.generation != generation {
            return Err("voice_lab:stale_build_generation".to_string());
        }
        if !matches!(active.phase, BuildPhase::Evaluating | BuildPhase::Cancelling) {
            return Err("voice_lab:invalid_build_transition".to_string());
        }
        self.active = None;
        Ok(self.snapshot())
    }

    fn fail(&mut self, generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
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
pub struct MyVoiceStoragePaths {
    pub cache_root: PathBuf,
    pub takes_dir: PathBuf,
    pub build_dataset_dir: PathBuf,
    pub candidate_actor_dir: PathBuf,
    pub saved_root: PathBuf,
    pub approved_actor_dir: PathBuf,
}

impl MyVoiceStoragePaths {
    pub fn from_project_paths(paths: &ProjectPaths) -> Self {
        Self::from_roots(Path::new(&paths.user_cache_dir), Path::new(&paths.user_saved_dir))
    }

    fn from_roots(cache_root: &Path, saved_root: &Path) -> Self {
        // Keep the historical directory name so existing local recordings and approved
        // voice data remain discoverable. New source vocabulary is My Voice.
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

static BUILD_STATE: OnceLock<Mutex<BuildLifecycle>> = OnceLock::new();
static PROMOTION_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn build_store() -> &'static Mutex<BuildLifecycle> {
    BUILD_STATE.get_or_init(|| Mutex::new(BuildLifecycle::default()))
}

fn promotion_lock() -> &'static Mutex<()> {
    PROMOTION_LOCK.get_or_init(|| Mutex::new(()))
}

fn idle_snapshot() -> MyVoiceBuildSnapshot {
    MyVoiceBuildSnapshot {
        active: false,
        generation: None,
        phase: "idle".to_string(),
        cancel_requested: false,
    }
}

fn meeting_blocks_my_voice() -> bool {
    let report = latest_runtime_session_state();
    match report.snapshot {
        Some(snapshot) => snapshot.owner_id == APPLICATION_MEETING_OWNER_ID,
        None => report.has_active_session,
    }
}

pub fn current_my_voice_build_snapshot() -> MyVoiceBuildSnapshot {
    build_store()
        .lock()
        .map(|state| state.snapshot())
        .unwrap_or_else(|_| MyVoiceBuildSnapshot {
            active: true,
            generation: None,
            phase: "state_unavailable".to_string(),
            cancel_requested: true,
        })
}

pub fn my_voice_build_blocks_meeting() -> bool {
    build_store()
        .lock()
        .map(|state| state.blocks_meeting())
        .unwrap_or(true)
}

pub fn begin_my_voice_build() -> Result<MyVoiceBuildSnapshot, String> {
    if meeting_blocks_my_voice() {
        return Err("voice_lab:meeting_active".to_string());
    }
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .begin()
}

pub fn mark_my_voice_build_training(generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .transition(generation, BuildPhase::Preparing, BuildPhase::Training)
}

pub fn mark_my_voice_build_evaluating(generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .transition(generation, BuildPhase::Training, BuildPhase::Evaluating)
}

pub fn request_my_voice_build_cancel(generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .cancel(generation)
}

pub fn finish_my_voice_build(generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .finish(generation)
}

pub fn fail_my_voice_build(generation: u64) -> Result<MyVoiceBuildSnapshot, String> {
    build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?
        .fail(generation)
}

pub fn prepare_guided_dataset(
    paths: &ProjectPaths,
    generation: u64,
    manifest: &GuidedDatasetManifest,
) -> Result<PathBuf, String> {
    ensure_build_generation(generation, BuildPhase::Preparing)?;
    prepare_guided_dataset_at(&MyVoiceStoragePaths::from_project_paths(paths), manifest)
}

pub fn promote_voice_actor_candidate(paths: &ProjectPaths) -> Result<(), String> {
    if meeting_blocks_my_voice() {
        return Err("voice_lab:meeting_active".to_string());
    }
    if my_voice_build_blocks_meeting() {
        return Err("voice_lab:build_active".to_string());
    }
    promote_voice_actor_candidate_at(&MyVoiceStoragePaths::from_project_paths(paths))
}

fn ensure_build_generation(generation: u64, phase: BuildPhase) -> Result<(), String> {
    let guard = build_store()
        .lock()
        .map_err(|_| "voice_lab:build_state_unavailable".to_string())?;
    let Some(active) = guard.active.as_ref() else {
        return Err("voice_lab:no_active_build".to_string());
    };
    if active.generation != generation {
        return Err("voice_lab:stale_build_generation".to_string());
    }
    if active.phase != phase || active.cancel_requested {
        return Err("voice_lab:invalid_build_transition".to_string());
    }
    Ok(())
}

fn canonical_take_file_name(line_id: u32) -> String {
    format!("take_{line_id:04}.wav")
}

fn validate_guided_dataset_manifest(manifest: &GuidedDatasetManifest) -> Result<(), String> {
    if manifest.schema_version != MY_VOICE_SCHEMA_VERSION {
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
    storage: &MyVoiceStoragePaths,
    manifest: &GuidedDatasetManifest,
) -> Result<PathBuf, String> {
    validate_guided_dataset_manifest(manifest)?;
    fs::create_dir_all(&storage.takes_dir)
        .map_err(|error| format!("voice_lab:takes_directory_unavailable:{error}"))?;

    for take in &manifest.takes {
        inspect_canonical_wav(&storage.takes_dir.join(&take.wav_file))?;
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
        inspect_canonical_wav(&target)?;
    }

    let manifest_path = storage.build_dataset_dir.join(DATASET_MANIFEST_FILE);
    write_json(&manifest_path, manifest)?;
    Ok(manifest_path)
}

fn validate_actor_package(dir: &Path) -> Result<VoiceActorPackageManifest, String> {
    let manifest_path = dir.join(ACTOR_MANIFEST_FILE);
    let metadata = fs::symlink_metadata(&manifest_path)
        .map_err(|error| format!("voice_lab:actor_manifest_missing:{error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err("voice_lab:actor_manifest_not_regular_file".to_string());
    }
    if metadata.len() == 0 || metadata.len() > MAX_MANIFEST_BYTES {
        return Err("voice_lab:actor_manifest_size_invalid".to_string());
    }
    let bytes = fs::read(&manifest_path)
        .map_err(|error| format!("voice_lab:actor_manifest_read_failed:{error}"))?;
    let manifest = serde_json::from_slice::<VoiceActorPackageManifest>(&bytes)
        .map_err(|error| format!("voice_lab:actor_manifest_invalid_json:{error}"))?;

    if manifest.schema_version != MY_VOICE_SCHEMA_VERSION
        || manifest.engine != VOICE_ACTOR_ENGINE
        || manifest.engine_revision != VOICE_ACTOR_ENGINE_REVISION
    {
        return Err("voice_lab:actor_engine_contract_mismatch".to_string());
    }
    if manifest.gpt_weight_file != GPT_WEIGHT_FILE
        || manifest.sovits_weight_file != SOVITS_WEIGHT_FILE
        || manifest.reference_wav_file != REFERENCE_WAV_FILE
    {
        return Err("voice_lab:actor_package_filename_mismatch".to_string());
    }
    if manifest.reference_text.trim().is_empty() {
        return Err("voice_lab:actor_reference_text_missing".to_string());
    }
    if !manifest.held_out_evaluation_complete {
        return Err("voice_lab:actor_evaluation_incomplete".to_string());
    }

    validate_nonempty_regular_file(&dir.join(GPT_WEIGHT_FILE), "gpt_weight")?;
    validate_nonempty_regular_file(&dir.join(SOVITS_WEIGHT_FILE), "sovits_weight")?;
    let wav = inspect_canonical_wav(&dir.join(REFERENCE_WAV_FILE))?;
    if wav.duration_ms < MIN_REFERENCE_MS
        || wav.duration_ms > MAX_REFERENCE_MS
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

fn promote_voice_actor_candidate_at(storage: &MyVoiceStoragePaths) -> Result<(), String> {
    let _guard = promotion_lock()
        .lock()
        .map_err(|_| "voice_lab:promotion_state_unavailable".to_string())?;
    fs::create_dir_all(&storage.saved_root)
        .map_err(|error| format!("voice_lab:saved_root_unavailable:{error}"))?;
    recover_interrupted_promotion(storage)?;
    validate_actor_package(&storage.candidate_actor_dir)?;

    let staging = storage.saved_root.join(".MyVoice.next");
    let previous = storage.saved_root.join(".MyVoice.previous");
    if staging.exists() {
        fs::remove_dir_all(&staging)
            .map_err(|error| format!("voice_lab:staging_cleanup_failed:{error}"))?;
    }
    fs::create_dir_all(&staging)
        .map_err(|error| format!("voice_lab:staging_create_failed:{error}"))?;

    for file_name in [ACTOR_MANIFEST_FILE, GPT_WEIGHT_FILE, SOVITS_WEIGHT_FILE, REFERENCE_WAV_FILE] {
        fs::copy(storage.candidate_actor_dir.join(file_name), staging.join(file_name))
            .map_err(|error| format!("voice_lab:actor_stage_copy_failed:{error}"))?;
    }
    validate_actor_package(&staging)?;

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

    validate_actor_package(&storage.approved_actor_dir)?;
    if previous.exists() {
        let _ = fs::remove_dir_all(previous);
    }
    Ok(())
}

fn recover_interrupted_promotion(storage: &MyVoiceStoragePaths) -> Result<(), String> {
    let staging = storage.saved_root.join(".MyVoice.next");
    let previous = storage.saved_root.join(".MyVoice.previous");

    if storage.approved_actor_dir.exists() {
        validate_actor_package(&storage.approved_actor_dir)?;
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
        validate_actor_package(&previous)?;
        fs::rename(&previous, &storage.approved_actor_dir)
            .map_err(|error| format!("voice_lab:promotion_recovery_failed:{error}"))?;
    }
    if staging.exists() {
        fs::remove_dir_all(&staging)
            .map_err(|error| format!("voice_lab:stale_staging_cleanup_failed:{error}"))?;
    }
    Ok(())
}

fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "voice_lab:manifest_parent_missing".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("voice_lab:manifest_parent_create_failed:{error}"))?;
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("voice_lab:manifest_serialize_failed:{error}"))?;
    if bytes.is_empty() || bytes.len() as u64 > MAX_MANIFEST_BYTES {
        return Err("voice_lab:manifest_size_invalid".to_string());
    }
    fs::write(path, bytes).map_err(|error| format!("voice_lab:manifest_write_failed:{error}"))
}

fn inspect_canonical_wav(path: &Path) -> Result<CanonicalWavInfo, String> {
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
        let mut header = [0u8; 8];
        file.read_exact(&mut header)
            .map_err(|error| format!("voice_lab:wav_chunk_header_failed:{error}"))?;
        let size = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as u64;
        let start = file
            .stream_position()
            .map_err(|error| format!("voice_lab:wav_seek_failed:{error}"))?;
        if start.saturating_add(size) > metadata.len() {
            return Err("voice_lab:wav_chunk_out_of_bounds".to_string());
        }

        if &header[0..4] == b"fmt " {
            if size < 16 {
                return Err("voice_lab:wav_format_chunk_too_small".to_string());
            }
            let mut fmt = [0u8; 16];
            file.read_exact(&mut fmt)
                .map_err(|error| format!("voice_lab:wav_format_read_failed:{error}"))?;
            format = Some((
                u16::from_le_bytes([fmt[0], fmt[1]]),
                u16::from_le_bytes([fmt[2], fmt[3]]),
                u32::from_le_bytes([fmt[4], fmt[5], fmt[6], fmt[7]]),
                u16::from_le_bytes([fmt[14], fmt[15]]),
            ));
        } else if &header[0..4] == b"data" {
            data_size = Some(size);
        }

        file.seek(SeekFrom::Start(start.saturating_add(size.saturating_add(size % 2))))
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
        || channels != CANONICAL_CHANNELS
        || sample_rate != CANONICAL_SAMPLE_RATE
        || bits_per_sample != CANONICAL_BITS_PER_SAMPLE
    {
        return Err("voice_lab:wav_not_canonical_pcm16_32khz_mono".to_string());
    }
    if data_size == 0 {
        return Err("voice_lab:wav_empty".to_string());
    }
    let bytes_per_second = u64::from(sample_rate)
        .saturating_mul(u64::from(channels))
        .saturating_mul(u64::from(bits_per_sample / 8));
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
        std::env::temp_dir().join(format!("translateit_my_voice_{label}_{now}"))
    }

    fn write_wav(path: &Path, duration_ms: u64) {
        let samples = u64::from(CANONICAL_SAMPLE_RATE) * duration_ms / 1_000;
        let data_size = samples.saturating_mul(2) as u32;
        let mut bytes = Vec::with_capacity(44 + data_size as usize);
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&(36u32.saturating_add(data_size)).to_le_bytes());
        bytes.extend_from_slice(b"WAVEfmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes());
        bytes.extend_from_slice(&CANONICAL_CHANNELS.to_le_bytes());
        bytes.extend_from_slice(&CANONICAL_SAMPLE_RATE.to_le_bytes());
        bytes.extend_from_slice(&(CANONICAL_SAMPLE_RATE * 2).to_le_bytes());
        bytes.extend_from_slice(&2u16.to_le_bytes());
        bytes.extend_from_slice(&CANONICAL_BITS_PER_SAMPLE.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&data_size.to_le_bytes());
        bytes.resize(44 + data_size as usize, 0);
        fs::create_dir_all(path.parent().expect("wav parent")).expect("create wav parent");
        fs::write(path, bytes).expect("write wav");
    }

    fn dataset() -> GuidedDatasetManifest {
        GuidedDatasetManifest {
            schema_version: MY_VOICE_SCHEMA_VERSION,
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

    fn actor_manifest(duration_ms: u64) -> VoiceActorPackageManifest {
        VoiceActorPackageManifest {
            schema_version: MY_VOICE_SCHEMA_VERSION,
            engine: VOICE_ACTOR_ENGINE.to_string(),
            engine_revision: VOICE_ACTOR_ENGINE_REVISION.to_string(),
            gpt_weight_file: GPT_WEIGHT_FILE.to_string(),
            sovits_weight_file: SOVITS_WEIGHT_FILE.to_string(),
            reference_wav_file: REFERENCE_WAV_FILE.to_string(),
            reference_text: "Tomorrow we will review the project timeline.".to_string(),
            reference_duration_ms: duration_ms,
            held_out_evaluation_complete: true,
        }
    }

    fn write_actor(dir: &Path, marker: &[u8]) {
        fs::create_dir_all(dir).expect("create actor");
        fs::write(dir.join(GPT_WEIGHT_FILE), marker).expect("gpt weight");
        fs::write(dir.join(SOVITS_WEIGHT_FILE), marker).expect("sovits weight");
        write_wav(&dir.join(REFERENCE_WAV_FILE), 4_000);
        write_json(&dir.join(ACTOR_MANIFEST_FILE), &actor_manifest(4_000)).expect("manifest");
    }

    #[test]
    fn lifecycle_is_generation_bound_and_cancel_does_not_fake_completion() {
        let mut lifecycle = BuildLifecycle::default();
        let start = lifecycle.begin().expect("start");
        let generation = start.generation.expect("generation");
        assert!(lifecycle.blocks_meeting());
        assert_eq!(lifecycle.finish(generation), Err("voice_lab:invalid_build_transition".to_string()));
        lifecycle
            .transition(generation, BuildPhase::Preparing, BuildPhase::Training)
            .expect("training");
        let cancelling = lifecycle.cancel(generation).expect("cancel");
        assert!(cancelling.cancel_requested);
        assert_eq!(cancelling.phase, "cancelling");
        lifecycle.finish(generation).expect("cancel complete");
        assert!(!lifecycle.blocks_meeting());
    }

    #[test]
    fn dataset_requires_authorization_and_true_held_out_lines() {
        let mut manifest = dataset();
        manifest.authorized_voice_confirmed = false;
        assert_eq!(
            validate_guided_dataset_manifest(&manifest),
            Err("voice_lab:voice_authorization_required".to_string())
        );
        let mut manifest = dataset();
        manifest.held_out_lines[0].exact_text = manifest.takes[0].exact_text.clone();
        assert_eq!(
            validate_guided_dataset_manifest(&manifest),
            Err("voice_lab:held_out_line_used_for_training".to_string())
        );
    }

    #[test]
    fn accepted_dataset_is_frozen_from_canonical_guided_wavs_only() {
        let root = test_root("dataset");
        let storage = MyVoiceStoragePaths::from_roots(&root.join("cache"), &root.join("saved"));
        write_wav(&storage.takes_dir.join(canonical_take_file_name(1)), 1_200);
        let path = prepare_guided_dataset_at(&storage, &dataset()).expect("prepare dataset");
        assert!(path.is_file());
        assert!(storage.build_dataset_dir.join(canonical_take_file_name(1)).is_file());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn actor_contract_requires_native_weights_reference_and_evaluation() {
        let root = test_root("actor");
        write_actor(&root, b"weight");
        assert!(validate_actor_package(&root).is_ok());
        let mut manifest = actor_manifest(4_000);
        manifest.held_out_evaluation_complete = false;
        write_json(&root.join(ACTOR_MANIFEST_FILE), &manifest).expect("rewrite manifest");
        assert_eq!(
            validate_actor_package(&root),
            Err("voice_lab:actor_evaluation_incomplete".to_string())
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn invalid_rebuild_candidate_never_replaces_current_actor() {
        let root = test_root("promotion");
        let storage = MyVoiceStoragePaths::from_roots(&root.join("cache"), &root.join("saved"));
        write_actor(&storage.approved_actor_dir, b"old");
        write_actor(&storage.candidate_actor_dir, b"new");
        promote_voice_actor_candidate_at(&storage).expect("first promotion");
        assert_eq!(
            fs::read(storage.approved_actor_dir.join(GPT_WEIGHT_FILE)).expect("approved"),
            b"new"
        );
        fs::remove_file(storage.candidate_actor_dir.join(SOVITS_WEIGHT_FILE)).expect("invalidate");
        assert!(promote_voice_actor_candidate_at(&storage).is_err());
        assert_eq!(
            fs::read(storage.approved_actor_dir.join(GPT_WEIGHT_FILE)).expect("preserved"),
            b"new"
        );
        let _ = fs::remove_dir_all(root);
    }
}
