use std::fs;
use std::path::Path;

use crate::engine::runtime_state::latest_runtime_session_state;

const APPLICATION_MEETING_OWNER_ID: &str = "translateit_application_meeting";
const BUILTIN_VOICE_IDS: &[&str] = &["MaleVoice", "FemaleVoice"];
const STAGING_DIR: &str = ".MyVoice.builtin-next";
const PREVIOUS_DIR: &str = ".MyVoice.builtin-previous";

pub fn is_supported_builtin_voice(voice_id: &str) -> bool {
    BUILTIN_VOICE_IDS.contains(&voice_id)
}

pub fn meeting_blocks_voice_change() -> bool {
    let report = latest_runtime_session_state();
    match report.snapshot {
        Some(snapshot) => snapshot.owner_id == APPLICATION_MEETING_OWNER_ID,
        None => report.has_active_session,
    }
}

fn recover_interrupted_swap(
    target_dir: &Path,
    staging: &Path,
    previous: &Path,
) -> Result<(), String> {
    if target_dir.exists() {
        if staging.exists() {
            fs::remove_dir_all(staging)
                .map_err(|_| "builtin_voice:stale_staging_cleanup_failed".to_string())?;
        }
        if previous.exists() {
            fs::remove_dir_all(previous)
                .map_err(|_| "builtin_voice:stale_previous_cleanup_failed".to_string())?;
        }
        return Ok(());
    }

    if previous.exists() {
        fs::rename(previous, target_dir)
            .map_err(|_| "builtin_voice:swap_recovery_failed".to_string())?;
    }
    if staging.exists() {
        fs::remove_dir_all(staging)
            .map_err(|_| "builtin_voice:stale_staging_cleanup_failed".to_string())?;
    }
    Ok(())
}

pub fn replace_directory_atomically<F>(target_dir: &Path, build_staging: F) -> Result<(), String>
where
    F: FnOnce(&Path) -> Result<(), String>,
{
    let parent = target_dir
        .parent()
        .ok_or_else(|| "builtin_voice:target_parent_missing".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|_| "builtin_voice:target_parent_unavailable".to_string())?;
    let staging = parent.join(STAGING_DIR);
    let previous = parent.join(PREVIOUS_DIR);
    recover_interrupted_swap(target_dir, &staging, &previous)?;

    fs::create_dir_all(&staging)
        .map_err(|_| "builtin_voice:staging_create_failed".to_string())?;
    if let Err(error) = build_staging(&staging) {
        let _ = fs::remove_dir_all(&staging);
        return Err(error);
    }

    if target_dir.exists() {
        if previous.exists() {
            fs::remove_dir_all(&previous)
                .map_err(|_| "builtin_voice:previous_cleanup_failed".to_string())?;
        }
        fs::rename(target_dir, &previous)
            .map_err(|_| "builtin_voice:current_backup_failed".to_string())?;
    }

    if let Err(error) = fs::rename(&staging, target_dir) {
        if previous.exists() && !target_dir.exists() {
            if fs::rename(&previous, target_dir).is_err() {
                return Err(format!("builtin_voice:swap_failed:{error};rollback_failed"));
            }
        }
        return Err(format!("builtin_voice:swap_failed:{error}"));
    }

    if previous.exists() {
        let _ = fs::remove_dir_all(previous);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn root(label: &str) -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("translateit_builtin_swap_{label}_{now}"))
    }

    #[test]
    fn failed_staging_preserves_existing_selected_voice() {
        let root = root("preserve");
        let target = root.join("saved").join("MyVoice");
        fs::create_dir_all(&target).expect("target");
        fs::write(target.join("current.marker"), b"old").expect("marker");

        let error = replace_directory_atomically(&target, |_staging| {
            Err("builtin_voice:test_failure".to_string())
        })
        .expect_err("must fail");

        assert_eq!(error, "builtin_voice:test_failure");
        assert_eq!(fs::read(target.join("current.marker")).expect("old voice"), b"old");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn successful_swap_replaces_old_voice_as_one_directory() {
        let root = root("swap");
        let target = root.join("saved").join("MyVoice");
        fs::create_dir_all(&target).expect("target");
        fs::write(target.join("current.marker"), b"old").expect("marker");

        replace_directory_atomically(&target, |staging| {
            fs::write(staging.join("actor.json"), b"new")
                .map_err(|error| error.to_string())
        })
        .expect("swap");

        assert!(!target.join("current.marker").exists());
        assert_eq!(fs::read(target.join("actor.json")).expect("new voice"), b"new");
        assert!(!root.join("saved").join(PREVIOUS_DIR).exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn interrupted_swap_restores_previous_voice_before_retry() {
        let root = root("recovery");
        let parent = root.join("saved");
        let target = parent.join("MyVoice");
        let previous = parent.join(PREVIOUS_DIR);
        let staging = parent.join(STAGING_DIR);
        fs::create_dir_all(&previous).expect("previous");
        fs::write(previous.join("current.marker"), b"old").expect("marker");
        fs::create_dir_all(&staging).expect("staging");
        fs::write(staging.join("partial.marker"), b"partial").expect("partial");

        recover_interrupted_swap(&target, &staging, &previous).expect("recover");
        assert_eq!(fs::read(target.join("current.marker")).expect("restored"), b"old");
        assert!(!staging.exists());
        assert!(!previous.exists());
        let _ = fs::remove_dir_all(root);
    }
}
