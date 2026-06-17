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
        let root = find_project_root(&start).unwrap_or(start);

        let user_cache_dir = root.join("UserData").join("CacheData");
        let user_log_dir = root.join("UserData").join("LogData");
        let user_saved_dir = root.join("UserData").join("SavedProject");
        let runtime_assets = root.join("EngineData").join("RuntimeAssets");
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
            discovery_note: "Project root discovery requires EngineData, DevelopingData, and UserData. Runtime assets use EngineData/RuntimeAssets. Backend contracts use EngineData/Backend/RuntimeContracts.".to_string(),
        }
    }
}

fn find_project_root(start: &Path) -> Option<PathBuf> {
    for candidate in start.ancestors() {
        if candidate.join("EngineData").is_dir()
            && candidate.join("DevelopingData").is_dir()
            && candidate.join("UserData").is_dir()
        {
            return Some(candidate.to_path_buf());
        }
    }
    None
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
