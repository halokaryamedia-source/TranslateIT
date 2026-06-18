use crate::commands::diagnostic_trace::{trace_command_end, trace_command_start};
use crate::engine;
use crate::engine::adapters::internal_validation_gate_logic::{
    analyze_internal_validation_gate, InternalValidationGateReport,
};
use crate::engine::adapters::live_pipeline_compact_status_logic::{
    build_live_pipeline_compact_status, LivePipelineCompactStatusReport,
};
use crate::engine::adapters::live_runtime_pipeline_gate_logic::{
    analyze_live_runtime_pipeline_gate, LiveRuntimePipelineGateReport,
};
use crate::engine::adapters::migration_closure_gate_logic::{
    analyze_migration_closure_gate, MigrationClosureGateReport, MigrationClosureGateRequest,
};
use crate::engine::adapters::realtime_status_payload_logic::{
    build_realtime_status_payload, RealtimeStatusPayload,
};
use crate::engine::adapters::runtime_readiness_bundle_logic::{
    analyze_runtime_readiness_bundle, RuntimeReadinessBundleReport,
};
use crate::engine::adapters::runtime_status_bundle_logic::{
    build_runtime_status_bundle, RuntimeStatusBundleReport,
};
use crate::engine::adapters::segment_flow_logic::{
    analyze_realtime_translate_stream, RealtimeTranslateStreamReport,
    RealtimeTranslateStreamRequest,
};
use crate::engine::diagnostics::RuntimeDiagnostics;
use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;
use crate::engine::state::EngineStatus;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct FrontendStartupTraceRecord {
    pub label: String,
    pub detail: serde_json::Value,
    pub at: String,
    pub build_marker: String,
}

#[tauri::command]
pub fn get_engine_status() -> EngineStatus {
    let started = trace_command_start("get_engine_status", "collecting engine status");
    let result = engine::current_status();
    trace_command_end("get_engine_status", started, "ok");
    result
}

#[tauri::command]
pub fn get_runtime_diagnostics() -> RuntimeDiagnostics {
    let started = trace_command_start("get_runtime_diagnostics", "collecting runtime diagnostics");
    let result = engine::runtime_diagnostics();
    trace_command_end("get_runtime_diagnostics", started, "ok");
    result
}

#[tauri::command]
pub fn analyze_runtime_readiness() -> RuntimeReadinessBundleReport {
    analyze_runtime_readiness_bundle()
}

#[tauri::command]
pub fn get_runtime_status_bundle() -> RuntimeStatusBundleReport {
    let started = trace_command_start(
        "get_runtime_status_bundle",
        "building runtime status bundle",
    );
    let result = build_runtime_status_bundle();
    trace_command_end("get_runtime_status_bundle", started, "ok");
    result
}

#[tauri::command]
pub fn get_realtime_status_payload() -> RealtimeStatusPayload {
    let started = trace_command_start(
        "get_realtime_status_payload",
        "building realtime status payload",
    );
    let result = build_realtime_status_payload();
    trace_command_end("get_realtime_status_payload", started, "ok");
    result
}

#[tauri::command]
pub fn analyze_realtime_translate_stream_state(
    request: RealtimeTranslateStreamRequest,
) -> RealtimeTranslateStreamReport {
    let started = trace_command_start(
        "analyze_realtime_translate_stream_state",
        "analyzing realtime translate stream",
    );
    let result = analyze_realtime_translate_stream(request);
    trace_command_end("analyze_realtime_translate_stream_state", started, "ok");
    result
}

#[tauri::command]
pub fn analyze_live_pipeline_gate() -> LiveRuntimePipelineGateReport {
    let started = trace_command_start("analyze_live_pipeline_gate", "analyzing live pipeline gate");
    let result = analyze_live_runtime_pipeline_gate();
    trace_command_end("analyze_live_pipeline_gate", started, "ok");
    result
}

#[tauri::command]
pub fn get_live_pipeline_compact_status() -> LivePipelineCompactStatusReport {
    let started = trace_command_start(
        "get_live_pipeline_compact_status",
        "building compact status",
    );
    let result = build_live_pipeline_compact_status();
    trace_command_end("get_live_pipeline_compact_status", started, "ok");
    result
}

#[tauri::command]
pub fn analyze_internal_validation() -> InternalValidationGateReport {
    let started = trace_command_start(
        "analyze_internal_validation",
        "analyzing internal validation gate",
    );
    let result = analyze_internal_validation_gate();
    trace_command_end("analyze_internal_validation", started, "ok");
    result
}

#[tauri::command]
pub fn analyze_migration_closure(
    request: MigrationClosureGateRequest,
) -> MigrationClosureGateReport {
    let started = trace_command_start(
        "analyze_migration_closure",
        "analyzing migration closure gate",
    );
    let result = analyze_migration_closure_gate(request);
    trace_command_end("analyze_migration_closure", started, "ok");
    result
}

#[tauri::command]
pub fn validate_native_cuda_backend() -> NativeCudaBackendValidationReport {
    let started = trace_command_start(
        "validate_native_cuda_backend",
        "validating native cuda backend",
    );
    let result = NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate();
    trace_command_end("validate_native_cuda_backend", started, "ok");
    result
}

#[tauri::command]
pub fn record_frontend_startup_trace(record: FrontendStartupTraceRecord) {
    let started = trace_command_start(
        "record_frontend_startup_trace",
        format!(
            "label={} at={} build_marker={}",
            record.label, record.at, record.build_marker
        ),
    );
    let detail = if record.detail.is_null() {
        "detail=null".to_string()
    } else {
        format!("detail={}", record.detail)
    };
    trace_command_end("record_frontend_startup_trace", started, detail);
}
