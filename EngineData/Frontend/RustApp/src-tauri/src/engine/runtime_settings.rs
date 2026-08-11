use std::path::PathBuf;

use crate::engine::paths::ProjectPaths;
pub use crate::engine::settings::RuntimeSettings;

pub fn load_settings() -> RuntimeSettings {
    let project_paths = ProjectPaths::discover();
    let settings_path =
        PathBuf::from(project_paths.user_cache_dir).join("rust_runtime_settings.json");
    RuntimeSettings::load_or_default(&settings_path)
}
