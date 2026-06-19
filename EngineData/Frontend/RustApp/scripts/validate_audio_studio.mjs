import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../../..");

const requiredFiles = [
  "EngineData/Frontend/RustApp/src/audioStudioEntry.ts",
  "EngineData/Frontend/RustApp/src/audioStudioThemeEntry.ts",
  "EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioBinding.ts",
  "EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioState.ts",
  "EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioAdvancedBinding.ts",
  "EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioAdvancedState.ts",
  "EngineData/Frontend/RustApp/src/app/bridge/audio/audioStudioApi.ts",
  "EngineData/Frontend/RustApp/src/app/shared/audioStudioTypes.ts",
  "EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs",
  "EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs",
  "EngineData/Frontend/RustApp/src-tauri/src/main.rs",
  "EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_PLACEHOLDER.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json",
];

const requiredText = [
  ["EngineData/Frontend/RustApp/index.html", "/src/audioStudioEntry.ts"],
  ["EngineData/Frontend/RustApp/src/audioStudioEntry.ts", "bindAudioStudioUi"],
  ["EngineData/Frontend/RustApp/src/audioStudioEntry.ts", "bindAudioStudioAdvancedUi"],
  ["EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioBinding.ts", "validateImportFile"],
  ["EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioBinding.ts", "commandNoticeSequence"],
  ["EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioBinding.ts", "getSelectedReadingLine"],
  ["EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioAdvancedBinding.ts", "isAdvancedMode"],
  ["EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioAdvancedBinding.ts", "clampPercent"],
  ["EngineData/Frontend/RustApp/src/app/shared/audioStudioTypes.ts", "AUDIO_STUDIO_COMMAND_STATES"],
  ["EngineData/Frontend/RustApp/src/app/bridge/audio/audioStudioApi.ts", "normalizeCommandResult"],
  ["EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs", "validate_take_request"],
  ["EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs", "MAX_TAKE_TITLE_LENGTH"],
  ["EngineData/Frontend/RustApp/src-tauri/src/commands/mod.rs", "pub mod audio_studio"],
  ["EngineData/Frontend/RustApp/src-tauri/src/main.rs", "audio_studio_import_take"],
  ["EngineData/Frontend/RustApp/src-tauri/src/main.rs", "audio_studio_stage_guided_take"],
  ["EngineData/Frontend/RustApp/src-tauri/src/main.rs", "audio_studio_update_take_state"],
  ["EngineData/Frontend/RustApp/src-tauri/src/main.rs", "audio_studio_export_project_metadata"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "Audio Studio local validation started"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "UserData/CacheData/AudioStudio/logs"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "translateit.audio_studio_local_validation.v1"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "summaryPath"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "not_ready_until_target_pc_review"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "readEvidenceContract"],
  ["EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", "AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json", "UserData/CacheData/AudioStudio/logs/"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json", "root_contracts_normalized"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json", "translateit.audio_studio_local_validation_evidence_contract.v1"],
];

const expectedTakeSources = ["import", "guided_reading"];
const expectedTakeStates = ["draft", "staged", "accepted", "needs_retry", "blocked"];
const expectedCommandStates = ["invalid_request", "placeholder_only", "ready", "blocked"];
const expectedAdvancedModeIds = ["starter_profile", "production_profile", "broadcast_profile"];
const expectedImportExtensions = [".wav", ".mp3", ".m4a", ".ogg", ".webm"];
const expectedRoots = {
  cache: "UserData/CacheData/AudioStudio/",
  saved_project: "UserData/SavedProject/AudioStudio/",
  logs: "UserData/CacheData/AudioStudio/logs/",
};

const expectedLimits = {
  maxStagedTakes: "MAX_STAGED_TAKES = 12",
  maxImportFilesPerAction: "MAX_IMPORT_FILES_PER_ACTION = 12",
  maxImportFileSizeBytes: "MAX_IMPORT_FILE_SIZE_BYTES = 500 * 1024 * 1024",
  frontendTitleLength: "MAX_TAKE_TITLE_LENGTH = 120",
  frontendDetailLength: "MAX_TAKE_DETAIL_LENGTH = 500",
  rustTakeIdLength: "MAX_TAKE_ID_LENGTH: usize = 160",
  rustTitleLength: "MAX_TAKE_TITLE_LENGTH: usize = 120",
  rustDetailLength: "MAX_TAKE_DETAIL_LENGTH: usize = 500",
};

const expectedPayloadLimits = {
  take_id_max_chars: 160,
  take_title_max_chars: 120,
  take_detail_max_chars: 500,
  staged_takes_max: 12,
  import_files_per_action_max: 12,
  import_file_max_bytes: 524288000,
  accepted_import_extensions: expectedImportExtensions,
};

const expectedEvidenceSummaryFields = [
  "schema",
  "status",
  "started_at",
  "completed_at",
  "package_root",
  "log_path",
  "summary_path",
  "include_tauri_build",
  "runtime_claim",
  "steps",
  "error_message",
];
const expectedEvidenceStepFields = ["name", "command", "status", "started_at", "completed_at", "exit_code"];
const expectedEvidenceStatuses = ["running", "passed", "failed"];
const expectedEvidenceSteps = ["Audio Studio static validator", "TypeScript typecheck", "Rust cargo check", "Frontend build"];

const errors = [];

function readRepoFile(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  const content = readRepoFile(relativePath);
  if (content === null) {
    errors.push(`Cannot inspect missing JSON file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(`Invalid JSON in ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function expectArrayEquals(actual, expected, label) {
  if (!Array.isArray(actual)) {
    errors.push(`${label} must be an array.`);
    return;
  }
  const actualJoined = actual.join("|");
  const expectedJoined = expected.join("|");
  if (actualJoined !== expectedJoined) {
    errors.push(`${label} mismatch. Expected ${expectedJoined}, got ${actualJoined}.`);
  }
}

function expectValue(actual, expected, label) {
  if (actual !== expected) {
    errors.push(`${label} mismatch. Expected ${expected}, got ${String(actual)}.`);
  }
}

function expectScriptIncludes(scripts, scriptName, expectedText) {
  const script = scripts?.[scriptName];
  if (typeof script !== "string") {
    errors.push(`package.json script is missing: ${scriptName}`);
    return;
  }
  if (!script.includes(expectedText)) {
    errors.push(`package.json script ${scriptName} must include: ${expectedText}`);
  }
}

function expectFileIncludesAll(relativePath, expectedValues, label) {
  const content = readRepoFile(relativePath);
  if (content === null) {
    errors.push(`Cannot inspect missing file for ${label}: ${relativePath}`);
    return;
  }
  for (const expectedValue of expectedValues) {
    if (!content.includes(expectedValue)) {
      errors.push(`${label} in ${relativePath} is missing: ${expectedValue}`);
    }
  }
}

for (const relativePath of requiredFiles) {
  if (!existsSync(resolve(repoRoot, relativePath))) {
    errors.push(`Missing required Audio Studio file: ${relativePath}`);
  }
}

for (const [relativePath, expectedText] of requiredText) {
  const content = readRepoFile(relativePath);
  if (content === null) {
    errors.push(`Cannot inspect missing file: ${relativePath}`);
    continue;
  }
  if (!content.includes(expectedText)) {
    errors.push(`Missing expected Audio Studio marker in ${relativePath}: ${expectedText}`);
  }
}

expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/shared/audioStudioTypes.ts", expectedTakeSources, "shared take source constants");
expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/shared/audioStudioTypes.ts", expectedTakeStates, "shared take state constants");
expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/shared/audioStudioTypes.ts", expectedCommandStates, "shared command state constants");
expectFileIncludesAll("EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs", expectedTakeSources, "Rust take source validation");
expectFileIncludesAll("EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs", expectedTakeStates, "Rust take state validation");
expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioAdvancedState.ts", expectedAdvancedModeIds, "advanced mode id constants");
expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioAdvancedBinding.ts", ["AUDIO_STUDIO_ADVANCED_MODE_IDS", "AUDIO_STUDIO_DEFAULT_ADVANCED_MODE", "isAdvancedMode", "clampPercent"], "advanced binding hardening markers");
expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioBinding.ts", [expectedLimits.maxStagedTakes, expectedLimits.maxImportFilesPerAction, expectedLimits.maxImportFileSizeBytes, ...expectedImportExtensions], "frontend import limits");
expectFileIncludesAll("EngineData/Frontend/RustApp/src/app/active-launcher/audioStudioState.ts", [expectedLimits.frontendTitleLength, expectedLimits.frontendDetailLength], "frontend take metadata limits");
expectFileIncludesAll("EngineData/Frontend/RustApp/src-tauri/src/commands/audio_studio.rs", [expectedLimits.rustTakeIdLength, expectedLimits.rustTitleLength, expectedLimits.rustDetailLength], "Rust payload limits");
expectFileIncludesAll("EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", ["validate:audio-studio", "typecheck", "check:rust", "build:frontend", "summary_path", "runtime_claim", "error_message"], "local validation runner steps and summary evidence");
expectFileIncludesAll("EngineData/Frontend/RustApp/scripts/run_audio_studio_local_validation.mjs", ["readEvidenceContract", "evidenceContractPath", "approved_output_root", "summary_file_pattern", "required_runtime_claim", "required_steps", "optional_steps"], "local validation evidence contract usage");

const packageJson = readJson("EngineData/Frontend/RustApp/package.json");
if (packageJson) {
  expectScriptIncludes(packageJson.scripts, "validate:audio-studio", "node scripts/validate_audio_studio.mjs");
  expectScriptIncludes(packageJson.scripts, "validate:audio-studio:local", "node scripts/run_audio_studio_local_validation.mjs");
  expectScriptIncludes(packageJson.scripts, "validate:internal", "validate:audio-studio");
  expectScriptIncludes(packageJson.scripts, "validate:full", "validate:audio-studio");
}

const metadataContract = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json");
if (metadataContract) {
  expectValue(metadataContract.schema, "translateit.audio_studio_project_metadata_contract.v1", "metadata contract schema");
  expectValue(metadataContract.status, "contract_only", "metadata contract status");
  expectValue(metadataContract.local_validation_required_before_ready, true, "metadata local validation requirement");
  expectValue(metadataContract.approved_roots?.cache, expectedRoots.cache, "metadata cache root");
  expectValue(metadataContract.approved_roots?.saved_project, expectedRoots.saved_project, "metadata saved project root");
  expectValue(metadataContract.approved_roots?.logs, expectedRoots.logs, "metadata logs root");
  expectArrayEquals(metadataContract.allowed_take_sources, expectedTakeSources, "metadata allowed take sources");
  expectArrayEquals(metadataContract.allowed_take_states, expectedTakeStates, "metadata allowed take states");
  for (const [key, expectedValue] of Object.entries(expectedPayloadLimits)) {
    if (Array.isArray(expectedValue)) {
      expectArrayEquals(metadataContract.payload_limits?.[key], expectedValue, `metadata payload limit ${key}`);
    } else {
      expectValue(metadataContract.payload_limits?.[key], expectedValue, `metadata payload limit ${key}`);
    }
  }
}

const advancedContract = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json");
if (advancedContract) {
  expectValue(advancedContract.schema, "translateit.audio_studio_advanced_quality_contract.v1", "advanced quality contract schema");
  expectValue(advancedContract.status, "advanced_non_local_contract", "advanced quality contract status");
  expectValue(advancedContract.approved_audio_studio_roots?.cache, expectedRoots.cache, "advanced cache root");
  expectValue(advancedContract.approved_audio_studio_roots?.saved_project, expectedRoots.saved_project, "advanced saved project root");
  expectValue(advancedContract.approved_audio_studio_roots?.logs, expectedRoots.logs, "advanced logs root");
  if (!Array.isArray(advancedContract.non_local_done_definition) || !advancedContract.non_local_done_definition.includes("root_contracts_normalized")) {
    errors.push("advanced non-local definition must include root_contracts_normalized.");
  }
  if (!Array.isArray(advancedContract.non_local_done_definition) || !advancedContract.non_local_done_definition.includes("metadata_payload_limits_synced")) {
    errors.push("advanced non-local definition must include metadata_payload_limits_synced.");
  }
}

const evidenceContract = readJson("EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_LOCAL_VALIDATION_EVIDENCE_CONTRACT.json");
if (evidenceContract) {
  expectValue(evidenceContract.schema, "translateit.audio_studio_local_validation_evidence_contract.v1", "local validation evidence contract schema");
  expectValue(evidenceContract.status, "contract_only", "local validation evidence contract status");
  expectValue(evidenceContract.approved_output_root, expectedRoots.logs, "local validation evidence output root");
  expectValue(evidenceContract.summary_schema, "translateit.audio_studio_local_validation.v1", "local validation summary schema");
  expectValue(evidenceContract.required_runtime_claim, "not_ready_until_target_pc_review", "local validation required runtime claim");
  expectArrayEquals(evidenceContract.required_summary_fields, expectedEvidenceSummaryFields, "local validation required summary fields");
  expectArrayEquals(evidenceContract.allowed_summary_statuses, expectedEvidenceStatuses, "local validation allowed summary statuses");
  expectArrayEquals(evidenceContract.required_step_fields, expectedEvidenceStepFields, "local validation required step fields");
  expectArrayEquals(evidenceContract.allowed_step_statuses, expectedEvidenceStatuses, "local validation allowed step statuses");
  expectArrayEquals(evidenceContract.required_steps, expectedEvidenceSteps, "local validation required steps");
}

if (errors.length > 0) {
  console.error("Audio Studio static validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Audio Studio static validation passed.");



