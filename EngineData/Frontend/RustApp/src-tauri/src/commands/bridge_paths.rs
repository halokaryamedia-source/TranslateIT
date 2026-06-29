use std::path::PathBuf;
use std::process::{Command, Stdio};

use crate::engine::paths::ProjectPaths;

#[derive(Debug, Clone)]
pub struct WorkerPythonCommand {
    pub program: PathBuf,
    pub bootstrap_args: Vec<String>,
    pub source: String,
}

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

pub fn worker_python_candidates() -> Vec<WorkerPythonCommand> {
    let mut candidates = Vec::new();

    if let Ok(raw) = std::env::var("TRANSLATEIT_WORKER_PYTHON") {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            candidates.push(WorkerPythonCommand {
                program: PathBuf::from(trimmed),
                bootstrap_args: Vec::new(),
                source: "TRANSLATEIT_WORKER_PYTHON".to_string(),
            });
        }
    }

    candidates.push(WorkerPythonCommand {
        program: worker_python(),
        bootstrap_args: Vec::new(),
        source: "worker_venv".to_string(),
    });

    candidates.push(WorkerPythonCommand {
        program: PathBuf::from("python"),
        bootstrap_args: Vec::new(),
        source: "system_python_path".to_string(),
    });

    candidates.push(WorkerPythonCommand {
        program: PathBuf::from("python3"),
        bootstrap_args: Vec::new(),
        source: "system_python3_path".to_string(),
    });

    if cfg!(windows) {
        candidates.push(WorkerPythonCommand {
            program: PathBuf::from("py"),
            bootstrap_args: vec!["-3".to_string()],
            source: "windows_python_launcher".to_string(),
        });
    }

    candidates
}

pub fn worker_python_command_available(candidate: &WorkerPythonCommand) -> bool {
    if candidate.program.components().count() > 1 && !candidate.program.is_file() {
        return false;
    }

    let mut command = Command::new(&candidate.program);
    command.args(&candidate.bootstrap_args);
    command.arg("--version");
    command.stdin(Stdio::null());
    command.stdout(Stdio::null());
    command.stderr(Stdio::null());

    command.status().map(|status| status.success()).unwrap_or(false)
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
