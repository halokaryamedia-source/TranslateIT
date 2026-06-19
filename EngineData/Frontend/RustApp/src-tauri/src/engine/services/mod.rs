//! Application service boundary for TranslateIT runtime orchestration.
//!
//! Keep Tauri command wrappers thin. Move use-case coordination here when a command
//! starts mixing request validation, path access, worker orchestration, and response
//! shaping in the same file.
