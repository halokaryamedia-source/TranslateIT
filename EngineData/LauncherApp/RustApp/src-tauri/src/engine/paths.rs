use serde::Serialize;
use std::env;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct ProjectPaths {
    pub project_root: String,
    pub user_cache_dir: String,
    pub user_log_dir: String,
    pub user_saved_dir: String,
    pub asr_model_dir: String,
    pub translation_model_dir: String,
    pub voice_runtime_dir: String,
    pub backend_contract_dir: String,
    pub discovery_note: String,
}

impl ProjectPaths {
    pub fn discover() -> Self {
        let start = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let exe_start = env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(Path::to_path_buf));
        let root = find_project_root(&start)
            .or_else(|| exe_start.as_deref().and_then(find_project_root))
            .unwrap_or_else(|| start.clone());
        let root_verified = has_runtime_root_markers(&root);

        let user_cache_dir = root.join("UserData").join("CacheData");
        let user_log_dir = root.join("UserData").join("LogData");
        let user_saved_dir = root.join("UserData").join("SavedProject");
        let runtime_assets = root
            .join("EngineData")
            .join("Backend")
            .join("RuntimeAssets");
        let asr_model_dir = runtime_assets.join("ASR").join("ModelData");
        let translation_model_dir = runtime_assets.join("Translation").join("ModelData");
        let voice_runtime_dir = runtime_assets.join("Voice");
        let backend_contract_dir = root
            .join("EngineData")
            .join("Backend")
            .join("RuntimeContracts");

        Self {
            project_root: normalize_path(&root),
            user_cache_dir: normalize_path(&user_cache_dir),
            user_log_dir: normalize_path(&user_log_dir),
            user_saved_dir: normalize_path(&user_saved_dir),
            asr_model_dir: normalize_path(&asr_model_dir),
            translation_model_dir: normalize_path(&translation_model_dir),
            voice_runtime_dir: normalize_path(&voice_runtime_dir),
            backend_contract_dir: normalize_path(&backend_contract_dir),
            discovery_note: discovery_note(root_verified),
        }
    }
}

fn find_project_root(start: &Path) -> Option<PathBuf> {
    for candidate in start.ancestors() {
        if has_runtime_root_markers(candidate) {
            return Some(candidate.to_path_buf());
        }
    }
    None
}

fn has_runtime_root_markers(candidate: &Path) -> bool {
    candidate.join("EngineData").is_dir()
        && candidate.join("DevelopingData").is_dir()
        && candidate.join("UserData").is_dir()
}

fn discovery_note(root_verified: bool) -> String {
    if root_verified {
        "Runtime root verified from EngineData/DevelopingData/UserData markers. Runtime assets use EngineData/Backend/RuntimeAssets. Backend contracts use EngineData/Backend/RuntimeContracts.".to_string()
    } else {
        "Runtime root markers were not found; falling back to current working directory. Verify launch path before production packaging.".to_string()
    }
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::ProjectPaths;

    #[test]
    fn discover_produces_non_empty_runtime_paths() {
        let paths = ProjectPaths::discover();
        assert!(!paths.project_root.trim().is_empty());
        assert!(!paths.user_cache_dir.trim().is_empty());
        assert!(!paths.user_log_dir.trim().is_empty());
        assert!(!paths.user_saved_dir.trim().is_empty());
        assert!(!paths.discovery_note.trim().is_empty());
    }

    #[test]
    fn discover_uses_forward_slashes_in_reported_paths() {
        let paths = ProjectPaths::discover();
        assert!(!paths.project_root.contains('\\'));
        assert!(!paths.user_cache_dir.contains('\\'));
        assert!(!paths.user_log_dir.contains('\\'));
        assert!(!paths.user_saved_dir.contains('\\'));
    }
}
