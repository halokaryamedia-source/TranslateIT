use serde::Serialize;
use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

const PATH_MODE_TAURI_PACKAGED: &str = "tauri_packaged_context";
const PATH_MODE_REPOSITORY_DEVELOPMENT: &str = "repository_development_fallback";
const PATH_MODE_UNVERIFIED_DEVELOPMENT: &str = "unverified_development_fallback";

#[derive(Debug, Clone)]
struct TauriPathContext {
    runtime_root: PathBuf,
    user_data_root: PathBuf,
}

static TAURI_PATH_CONTEXT: OnceLock<TauriPathContext> = OnceLock::new();

#[derive(Debug, Clone, Serialize)]
pub struct ProjectPaths {
    // Compatibility/diagnostic root. Runtime consumers should use the explicit roots
    // below instead of deriving paths from this field.
    pub project_root: String,
    pub runtime_root: String,
    pub worker_runtime_dir: String,
    pub python_runtime_dir: String,
    pub user_data_root: String,
    pub user_cache_dir: String,
    pub user_log_dir: String,
    pub user_saved_dir: String,
    pub asr_model_dir: String,
    pub translation_model_dir: String,
    pub voice_runtime_dir: String,
    pub backend_contract_dir: String,
    pub path_mode: String,
    pub packaged_context_initialized: bool,
    pub development_root_verified: bool,
    pub discovery_note: String,
}

impl ProjectPaths {
    pub fn discover() -> Self {
        if let Some(context) = TAURI_PATH_CONTEXT.get() {
            return paths_from_roots(
                &context.runtime_root,
                &context.user_data_root,
                &context.runtime_root,
                PATH_MODE_TAURI_PACKAGED,
                true,
                false,
                "Tauri packaged path context is initialized. Runtime/helper/model assets resolve under the Tauri resource directory and writable runtime data resolves under the app-local data directory. This proves path ownership only; it does not prove packaged assets are present or usable.",
            );
        }

        discover_repository_development_paths()
    }

    pub fn is_repository_development(&self) -> bool {
        self.path_mode == PATH_MODE_REPOSITORY_DEVELOPMENT
    }

    pub fn ensure_user_data_dirs(&self) -> io::Result<()> {
        for path in [
            &self.user_cache_dir,
            &self.user_log_dir,
            &self.user_saved_dir,
        ] {
            fs::create_dir_all(PathBuf::from(path))?;
        }
        Ok(())
    }
}

pub fn initialize_tauri_path_context(
    runtime_root: PathBuf,
    user_data_root: PathBuf,
) -> io::Result<ProjectPaths> {
    if !runtime_root.is_absolute() || !user_data_root.is_absolute() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Tauri runtime and app-local data roots must be absolute paths.",
        ));
    }

    let candidate = TauriPathContext {
        runtime_root,
        user_data_root,
    };

    if let Some(existing) = TAURI_PATH_CONTEXT.get() {
        if existing.runtime_root == candidate.runtime_root
            && existing.user_data_root == candidate.user_data_root
        {
            return Ok(ProjectPaths::discover());
        }
        return Err(io::Error::new(
            io::ErrorKind::AlreadyExists,
            "TranslateIT packaged path context was already initialized with different roots.",
        ));
    }

    TAURI_PATH_CONTEXT.set(candidate).map_err(|_| {
        io::Error::new(
            io::ErrorKind::AlreadyExists,
            "TranslateIT packaged path context could not be initialized exactly once.",
        )
    })?;

    Ok(ProjectPaths::discover())
}

fn discover_repository_development_paths() -> ProjectPaths {
    let start = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    let exe_start = env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf));
    let verified_root = if cfg!(debug_assertions) {
        find_development_project_root(&start)
            .or_else(|| exe_start.as_deref().and_then(find_development_project_root))
    } else {
        None
    };

    if let Some(root) = verified_root {
        let user_data_root = root.join("UserData");
        return paths_from_roots(
            &root,
            &user_data_root,
            &root,
            PATH_MODE_REPOSITORY_DEVELOPMENT,
            false,
            true,
            "Explicit debug-build repository-development fallback verified from AGENTS.md, EngineData/Frontend/RustApp, EngineData/Backend, and UserData markers. Runtime assets use the repository EngineData tree and writable development data uses repository UserData. This is development fallback evidence, not installed-path proof.",
        );
    }

    let user_data_root = start.join("UserData");
    paths_from_roots(
        &start,
        &user_data_root,
        &start,
        PATH_MODE_UNVERIFIED_DEVELOPMENT,
        false,
        false,
        if cfg!(debug_assertions) {
            "Tauri packaged path context is not initialized and no explicit repository-development root was verified. Paths are derived from the current working directory only as an unverified development fallback and must not be treated as installed-runtime proof."
        } else {
            "Release-build packaged path context has not been initialized yet. Current-working-directory paths are unverified bootstrap fallback only; Tauri setup must initialize resource and app-local data roots before runtime commands execute."
        },
    )
}

fn paths_from_roots(
    runtime_root: &Path,
    user_data_root: &Path,
    project_root: &Path,
    path_mode: &str,
    packaged_context_initialized: bool,
    development_root_verified: bool,
    discovery_note: &str,
) -> ProjectPaths {
    let local_worker_root = runtime_root
        .join("EngineData")
        .join("Backend")
        .join("LocalWorker");
    let worker_runtime_dir = local_worker_root.join("WorkerRuntime");
    let python_runtime_dir = local_worker_root.join("PythonRuntime");
    let runtime_assets = runtime_root
        .join("EngineData")
        .join("Backend")
        .join("RuntimeAssets");
    let backend_contract_dir = runtime_root
        .join("EngineData")
        .join("Backend")
        .join("RuntimeContracts");

    ProjectPaths {
        project_root: normalize_path(project_root),
        runtime_root: normalize_path(runtime_root),
        worker_runtime_dir: normalize_path(&worker_runtime_dir),
        python_runtime_dir: normalize_path(&python_runtime_dir),
        user_data_root: normalize_path(user_data_root),
        user_cache_dir: normalize_path(&user_data_root.join("CacheData")),
        user_log_dir: normalize_path(&user_data_root.join("LogData")),
        user_saved_dir: normalize_path(&user_data_root.join("SavedProject")),
        asr_model_dir: normalize_path(&runtime_assets.join("ASR").join("ModelData")),
        translation_model_dir: normalize_path(
            &runtime_assets.join("Translation").join("ModelData"),
        ),
        voice_runtime_dir: normalize_path(&runtime_assets.join("Voice")),
        backend_contract_dir: normalize_path(&backend_contract_dir),
        path_mode: path_mode.to_string(),
        packaged_context_initialized,
        development_root_verified,
        discovery_note: discovery_note.to_string(),
    }
}

fn find_development_project_root(start: &Path) -> Option<PathBuf> {
    for candidate in start.ancestors() {
        if has_development_root_markers(candidate) {
            return Some(candidate.to_path_buf());
        }
    }
    None
}

fn has_development_root_markers(candidate: &Path) -> bool {
    candidate.join("AGENTS.md").is_file()
        && candidate.join("EngineData").join("Backend").is_dir()
        && candidate
            .join("EngineData")
            .join("Frontend")
            .join("RustApp")
            .is_dir()
        && candidate.join("UserData").is_dir()
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::ProjectPaths;

    #[test]
    fn discover_produces_non_empty_runtime_and_user_paths() {
        let paths = ProjectPaths::discover();
        assert!(!paths.runtime_root.trim().is_empty());
        assert!(!paths.worker_runtime_dir.trim().is_empty());
        assert!(!paths.python_runtime_dir.trim().is_empty());
        assert!(!paths.user_data_root.trim().is_empty());
        assert!(!paths.user_cache_dir.trim().is_empty());
        assert!(!paths.user_log_dir.trim().is_empty());
        assert!(!paths.user_saved_dir.trim().is_empty());
        assert!(!paths.path_mode.trim().is_empty());
        assert!(!paths.discovery_note.trim().is_empty());
    }

    #[test]
    fn discover_uses_forward_slashes_in_reported_paths() {
        let paths = ProjectPaths::discover();
        assert!(!paths.runtime_root.contains('\\'));
        assert!(!paths.worker_runtime_dir.contains('\\'));
        assert!(!paths.python_runtime_dir.contains('\\'));
        assert!(!paths.user_data_root.contains('\\'));
        assert!(!paths.user_cache_dir.contains('\\'));
        assert!(!paths.user_log_dir.contains('\\'));
        assert!(!paths.user_saved_dir.contains('\\'));
    }
}
