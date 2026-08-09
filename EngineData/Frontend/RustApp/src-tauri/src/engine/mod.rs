#![allow(dead_code)]

pub mod adapters;
pub mod audio;
pub mod capture_lifecycle;
pub mod config;
pub mod cuda_policy;
pub mod diagnostics;
pub mod domain;
pub mod hardware;
pub mod history_store;
pub mod inference;
pub mod logging;
pub mod models;
pub mod native_execution;
pub mod native_runners;
pub mod paths;
pub mod playback;
pub mod runtime_job;
pub mod runtime_settings;
pub mod runtime_state;
pub mod services;
pub mod session_chat;
pub mod session_store;
pub mod settings;
pub mod state;
pub mod status_runtime;
pub mod transcript;
pub mod transcript_session;

pub use capture_lifecycle::{start_capture, stop_capture};
pub use runtime_settings::{load_settings, save_default_settings};
pub use status_runtime::{current_status, live_capture_runtime_status, runtime_diagnostics};
