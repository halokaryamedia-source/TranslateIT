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
    PathBuf::from(ProjectPaths::discover().worker_runtime_dir)
}

pub fn python_runtime_root() -> PathBuf {
    PathBuf::from(ProjectPaths::discover().python_runtime_dir)
}

pub fn worker_script() -> PathBuf {
    worker_root().join("realtime_local_worker.py")
}

fn development_worker_python() -> PathBuf {
    if cfg!(windows) {
        worker_root()
            .join(".venv")
            .join("Scripts")
            .join("python.exe")
    } else {
        worker_root().join(".venv").join("bin").join("python")
    }
}

fn development_worker_python_candidates() -> Vec<WorkerPythonCommand> {
    let mut candidates = Vec::new();

    if let Ok(raw) = std::env::var("TRANSLATEIT_WORKER_PYTHON") {
        let trimmed = raw.trim();
        if !trimmed.is_empty() {
            candidates.push(WorkerPythonCommand {
                program: PathBuf::from(trimmed),
                bootstrap_args: Vec::new(),
                source: "repository_env_override".to_string(),
            });
        }
    }

    candidates.push(WorkerPythonCommand {
        program: development_worker_python(),
        bootstrap_args: Vec::new(),
        source: "repository_worker_venv".to_string(),
    });

    candidates.push(WorkerPythonCommand {
        program: PathBuf::from("python"),
        bootstrap_args: Vec::new(),
        source: "repository_system_python".to_string(),
    });

    candidates.push(WorkerPythonCommand {
        program: PathBuf::from("python3"),
        bootstrap_args: Vec::new(),
        source: "repository_system_python3".to_string(),
    });

    if cfg!(windows) {
        candidates.push(WorkerPythonCommand {
            program: PathBuf::from("py"),
            bootstrap_args: vec!["-3".to_string()],
            source: "repository_windows_python_launcher".to_string(),
        });
    }

    candidates
}

fn worker_python_candidates() -> Vec<WorkerPythonCommand> {
    let paths = ProjectPaths::discover();
    if paths.packaged_context_initialized {
        return vec![WorkerPythonCommand {
            program: PathBuf::from(paths.python_runtime_dir).join("python.exe"),
            bootstrap_args: Vec::new(),
            source: "packaged_python_runtime".to_string(),
        }];
    }

    if !paths.is_repository_development() {
        return Vec::new();
    }

    development_worker_python_candidates()
}

fn worker_python_command_available(candidate: &WorkerPythonCommand) -> bool {
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

pub fn resolve_worker_python_command() -> Option<WorkerPythonCommand> {
    worker_python_candidates()
        .into_iter()
        .find(worker_python_command_available)
}

pub fn worker_python_unavailable_message() -> String {
    let paths = ProjectPaths::discover();
    if paths.packaged_context_initialized {
        return format!(
            "TranslateIT's packaged Python runtime is missing or unusable at {}/python.exe. Reinstall or repair TranslateIT instead of installing Python manually.",
            paths.python_runtime_dir
        );
    }

    if paths.is_repository_development() {
        return "No usable development Python runtime was found. Repository development may use TRANSLATEIT_WORKER_PYTHON, WorkerRuntime/.venv, or a system Python installation; these are not installed-product dependencies."
            .to_string();
    }

    "Python runtime resolution is unavailable outside packaged mode or verified repository development."
        .to_string()
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
