use std::path::Path;

pub fn guided_take_file_exists(path: &Path) -> bool {
    path.is_file()
}
