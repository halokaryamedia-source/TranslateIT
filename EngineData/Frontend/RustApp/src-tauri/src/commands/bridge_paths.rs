use std::path::PathBuf;

use crate::engine::paths::ProjectPaths;

pub fn project_root() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().project_root)
}

pub fn worker_root() -> PathBuf {
    project_root()
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker")
        .join("WorkerRuntime")
}

pub fn worker_script() -> PathBuf {
    worker_root().join("realtime_local_worker.py")
}

pub fn worker_python() -> PathBuf {
    if cfg!(windows) {
        worker_root()
            .join(".venv")
            .join("Scripts")
            .join("python.exe")
    } else {
        worker_root().join(".venv").join("bin").join("python")
    }
}

pub fn helper_bridge_log_dir() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().user_cache_dir)
        .join("HelperBridge")
        .join("logs")
}

pub fn helper_stderr_log_path(generation_token: u64) -> PathBuf {
    helper_bridge_log_dir().join(format!("helper_bridge_stderr_{generation_token}.log"))
}

pub fn slash_path(path: &std::path::Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
