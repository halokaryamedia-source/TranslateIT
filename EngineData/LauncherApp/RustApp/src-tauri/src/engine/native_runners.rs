use serde::{Deserialize, Serialize};

use crate::engine::native_execution::{
    prepare_native_execution_contract, NativeExecutionContractRequest,
    NativeExecutionContractResult,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeStageRunnerRequest {
    pub asr: Option<NativeExecutionContractRequest>,
    pub translation: Option<NativeExecutionContractRequest>,
    pub output: Option<NativeExecutionContractRequest>,
}

#[derive(Debug, Clone, Serialize)]
pub struct NativeStageRunnerReport {
    pub asr: Option<NativeExecutionContractResult>,
    pub translation: Option<NativeExecutionContractResult>,
    pub output: Option<NativeExecutionContractResult>,
    pub ready_stage_count: usize,
    pub blocked_stage_count: usize,
    pub blockers: Vec<String>,
}

pub fn prepare_native_stage_runners(request: NativeStageRunnerRequest) -> NativeStageRunnerReport {
    let asr = request.asr.map(prepare_native_execution_contract);
    let translation = request.translation.map(prepare_native_execution_contract);
    let output = request.output.map(prepare_native_execution_contract);

    let mut ready_stage_count = 0;
    let mut blocked_stage_count = 0;
    let mut blockers = Vec::new();

    for result in [&asr, &translation, &output]
        .iter()
        .filter_map(|item| item.as_ref())
    {
        if result.ready_to_execute {
            ready_stage_count += 1;
        } else {
            blocked_stage_count += 1;
            blockers.push(format!("{}:{}", result.stage, result.blocker));
        }
    }

    NativeStageRunnerReport {
        asr,
        translation,
        output,
        ready_stage_count,
        blocked_stage_count,
        blockers,
    }
}
