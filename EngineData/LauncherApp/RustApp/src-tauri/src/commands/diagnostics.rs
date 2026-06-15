use crate::engine;
use crate::engine::adapters::internal_validation_gate_logic::{analyze_internal_validation_gate, InternalValidationGateReport};
use crate::engine::adapters::live_pipeline_compact_status_logic::{build_live_pipeline_compact_status, LivePipelineCompactStatusReport};
use crate::engine::adapters::live_runtime_pipeline_gate_logic::{analyze_live_runtime_pipeline_gate, LiveRuntimePipelineGateReport};
use crate::engine::adapters::migration_closure_gate_logic::{analyze_migration_closure_gate, MigrationClosureGateReport, MigrationClosureGateRequest};
use crate::engine::adapters::runtime_readiness_bundle_logic::{analyze_runtime_readiness_bundle, RuntimeReadinessBundleReport};
use crate::engine::adapters::runtime_status_bundle_logic::{build_runtime_status_bundle, RuntimeStatusBundleReport};
use crate::engine::diagnostics::RuntimeDiagnostics;
use crate::engine::inference::backend_validation::NativeCudaBackendValidationReport;
use crate::engine::state::EngineStatus;

#[tauri::command]
pub fn get_engine_status() -> EngineStatus { engine::current_status() }

#[tauri::command]
pub fn get_runtime_diagnostics() -> RuntimeDiagnostics { engine::runtime_diagnostics() }

#[tauri::command]
pub fn analyze_runtime_readiness() -> RuntimeReadinessBundleReport { analyze_runtime_readiness_bundle() }

#[tauri::command]
pub fn get_runtime_status_bundle() -> RuntimeStatusBundleReport { build_runtime_status_bundle() }

#[tauri::command]
pub fn analyze_live_pipeline_gate() -> LiveRuntimePipelineGateReport { analyze_live_runtime_pipeline_gate() }

#[tauri::command]
pub fn get_live_pipeline_compact_status() -> LivePipelineCompactStatusReport { build_live_pipeline_compact_status() }

#[tauri::command]
pub fn analyze_internal_validation() -> InternalValidationGateReport { analyze_internal_validation_gate() }

#[tauri::command]
pub fn analyze_migration_closure(request: MigrationClosureGateRequest) -> MigrationClosureGateReport { analyze_migration_closure_gate(request) }

#[tauri::command]
pub fn validate_native_cuda_backend() -> NativeCudaBackendValidationReport { NativeCudaBackendValidationReport::validate_ctranslate2_cuda_candidate() }
