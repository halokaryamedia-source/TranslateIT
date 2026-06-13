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
    pub discovery_note: String,
}

impl ProjectPaths {
    pub fn discover() -> Self {
        let start = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let root = find_project_root(&start).unwrap_or(start);

        let user_cache_dir = root.join("UserData").join("CacheData");
        let user_log_dir = root.join("UserData").join("LogData");
        let user_saved_dir = root.join("UserData").join("SavedData");
        let asr_model_dir = root
            .join("EngineData")
            .join("TranscriptEngine")
            .join("ModelData");
        let translation_model_dir = root
            .join("EngineData")
            .join("TranslateEngine")
            .join("ModelData");

        Self {
            project_root: normalize_path(&root),
            user_cache_dir: normalize_path(&user_cache_dir),
            user_log_dir: normalize_path(&user_log_dir),
            user_saved_dir: normalize_path(&user_saved_dir),
            asr_model_dir: normalize_path(&asr_model_dir),
            translation_model_dir: normalize_path(&translation_model_dir),
            discovery_note: "Project root is discovered by walking upward until EngineData, DevelopingData, and UserData are visible.".to_string(),
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
