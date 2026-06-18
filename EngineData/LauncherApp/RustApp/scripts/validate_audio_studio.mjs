import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const repoRoot = resolve(root, "../../..");

const requiredFiles = [
  "EngineData/LauncherApp/RustApp/src/audioStudioEntry.ts",
  "EngineData/LauncherApp/RustApp/src/audioStudioThemeEntry.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioState.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedBinding.ts",
  "EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedState.ts",
  "EngineData/LauncherApp/RustApp/src/app/engineTranslate/audioStudioApi.ts",
  "EngineData/LauncherApp/RustApp/src/app/shared/audioStudioTypes.ts",
  "EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs",
  "EngineData/LauncherApp/RustApp/src-tauri/src/commands/mod.rs",
  "EngineData/LauncherApp/RustApp/src-tauri/src/main.rs",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ROUTE_PLACEHOLDER.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json",
  "EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json",
];

const requiredText = [
  ["EngineData/LauncherApp/RustApp/index.html", "/src/audioStudioEntry.ts"],
  ["EngineData/LauncherApp/RustApp/src/audioStudioEntry.ts", "bindAudioStudioUi"],
  ["EngineData/LauncherApp/RustApp/src/audioStudioEntry.ts", "bindAudioStudioAdvancedUi"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts", "validateImportFile"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts", "commandNoticeSequence"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioBinding.ts", "getSelectedReadingLine"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedBinding.ts", "isAdvancedMode"],
  ["EngineData/LauncherApp/RustApp/src/app/launcher/audioStudioAdvancedBinding.ts", "clampPercent"],
  ["EngineData/LauncherApp/RustApp/src/app/shared/audioStudioTypes.ts", "AUDIO_STUDIO_COMMAND_STATES"],
  ["EngineData/LauncherApp/RustApp/src/app/engineTranslate/audioStudioApi.ts", "normalizeCommandResult"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs", "validate_take_request"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/commands/audio_studio.rs", "MAX_TAKE_TITLE_LENGTH"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/commands/mod.rs", "pub mod audio_studio"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_import_take"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_stage_guided_take"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_update_take_state"],
  ["EngineData/LauncherApp/RustApp/src-tauri/src/main.rs", "audio_studio_export_project_metadata"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_PROJECT_METADATA_CONTRACT.json", "UserData/CacheData/AudioStudio/logs/"],
  ["EngineData/Backend/RuntimeContracts/AUDIO_STUDIO_ADVANCED_QUALITY_CONTRACT.json", "root_contracts_normalized"],
];

const errors = [];

function readRepoFile(relativePath) {
  const absolutePath = resolve(repoRoot, relativePath);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, "utf8");
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

if (errors.length > 0) {
  console.error("Audio Studio static validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("Audio Studio static validation passed.");
