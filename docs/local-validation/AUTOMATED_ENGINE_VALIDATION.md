# Automated Engine Validation

- Result: PARTIAL
- Created at: 2026-06-19T02:42:10.427Z
- Commit: ea645687

| Area | Command | Result | Notes |
|---|---|---|---|
| cleanup:project-processes:before | powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup_translateit_processes.ps1 | PASS |  |
| npm install | npm.cmd install | PASS | npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts: npm warn allow-scripts   esbuild@0.21.5 (install: (install scripts present)) npm warn allow-scripts npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow. |
| typecheck | npm.cmd run typecheck | PASS | > translateit-tauri-desktop-runtime@0.1.0 typecheck > tsc --noEmit |
| check:rust | npm.cmd run check:rust | PASS | Compiling translateit v0.1.0 (D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri) warning: function `probe_native_input_config` is never used    --> src\commands\audio.rs:175:8     | 175 | pub fn probe_native_input_config() -> NativeInputConfigProbeReport {     |        ^^^^^^^^^^^^^^^^^^^^^^^^^     |     = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default  warning: function `plan_native_capture_stream_state` is never used    --> src\command |
| build:frontend | npm.cmd run build:frontend | PASS | [1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter]  (!) D:/Work/AI Stuff/TranslateIT/TranslateIT-Rust/EngineData/LauncherApp/RustApp/src/app/shared/tauriBridge.ts is dynamically imported by D:/Work/AI Stuff/TranslateIT/TranslateIT-Rust/EngineData/LauncherApp/RustApp/src/app/launcher/startupDiagnostics.ts but also statically imported by D:/Work/AI Stuff/TranslateIT/TranslateIT-Rust/EngineData/LauncherApp/RustApp/src/app/engineTranslate/audioPipelineApi.ts, D:/Work/AI Stuff/Tran |
| build | npm.cmd run build | PASS | Info Looking up installed tauri packages to check mismatched versions...      Running beforeBuildCommand `npm run build:frontend` [1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter]  (!) D:/Work/AI Stuff/TranslateIT/TranslateIT-Rust/EngineData/LauncherApp/RustApp/src/app/shared/tauriBridge.ts is dynamically imported by D:/Work/AI Stuff/TranslateIT/TranslateIT-Rust/EngineData/LauncherApp/RustApp/src/app/launcher/startupDiagnostics.ts but also statically imported by D:/Work/AI St |
| cargo test | cargo.exe test | PASS | Compiling translateit v0.1.0 (D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri) warning: function `probe_native_input_config` is never used    --> src\commands\audio.rs:175:8     | 175 | pub fn probe_native_input_config() -> NativeInputConfigProbeReport {     |        ^^^^^^^^^^^^^^^^^^^^^^^^^     |     = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default  warning: function `plan_native_capture_stream_state` is never used    --> src\command |
| cargo fmt --check | cargo.exe fmt --check | PASS |  |
| cargo clippy | cargo.exe clippy --all-targets | PASS | Compiling translateit v0.1.0 (D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri) warning: function `probe_native_input_config` is never used    --> src\commands\audio.rs:175:8     | 175 | pub fn probe_native_input_config() -> NativeInputConfigProbeReport {     |        ^^^^^^^^^^^^^^^^^^^^^^^^^     |     = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default  warning: function `plan_native_capture_stream_state` is never used    --> src\command |
| cargo clippy -- -D warnings | cargo.exe clippy --all-targets -- -D warnings | PARTIAL | Compiling translateit v0.1.0 (D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri) error: function `probe_native_input_config` is never used    --> src\commands\audio.rs:175:8     | 175 | pub fn probe_native_input_config() -> NativeInputConfigProbeReport {     |        ^^^^^^^^^^^^^^^^^^^^^^^^^     |     = note: `-D dead-code` implied by `-D warnings`     = help: to override `-D warnings` add `#[expect(dead_code)]` or `#[allow(dead_code)]`  error: function `pla |
| validate:engine-total | npm.cmd run validate:engine-total | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:engine-total > node scripts/validate_engine_total.mjs  [validate:engine-total] files checked: 11 [validate:engine-total] scripts checked: 7 [validate:engine-total] bridge commands checked: 16/16 [validate:engine-total] engine module declarations checked: 18 {   "result": "PASS",   "filesChecked": 11,   "scriptsChecked": 7,   "bridgeCommandsChecked": 16,   "engineModulesChecked": 18 } |
| validate:settings-navigation | npm.cmd run validate:settings-navigation | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:settings-navigation > node scripts/validate_settings_navigation.mjs  {   "ok": true,   "status": "PASS",   "failed": [],   "checks": [     {       "name": "settingsButton exists",       "ok": true     },     {       "name": "openGeneralSettings handler",       "ok": true     },     {       "name": "settings page exists",       "ok": true     },     {       "name": "settings content exists",       "ok": true     },     {       "name": "back butto |
| validate:user-flow | npm.cmd run validate:user-flow | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:user-flow > node scripts/validate_user_flow_trace.mjs  {   "ok": true,   "status": "PASS",   "missing": [],   "note": "User-flow trace markers found in launcher controller and trace module." } |
| models:inventory | npm.cmd run models:inventory | PARTIAL | > translateit-tauri-desktop-runtime@0.1.0 models:inventory > node scripts/model_inventory.mjs  {   "ok": false,   "status": "BLOCKED",   "created_at": "2026-06-19T02:43:36.170Z",   "items": [     {       "model_id": "faster-whisper-large-v3-turbo",       "required": true,       "expected_path": "EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo",       "found": false,       "file_count": 0,       "size_bytes": 0,       "gpu_capable": true,       "cpu_fallback": true,   |
| models:verify | npm.cmd run models:verify | PARTIAL | > translateit-tauri-desktop-runtime@0.1.0 models:verify > node scripts/model_verify.mjs  {   "ok": false,   "status": "BLOCKED",   "created_at": "2026-06-19T02:43:36.608Z",   "items": [     {       "model_id": "faster-whisper-large-v3-turbo",       "required": true,       "expected_path": "EngineData/Backend/RuntimeAssets/ASR/ModelData/faster-whisper-large-v3-turbo",       "found": false,       "file_count": 0,       "size_bytes": 0,       "gpu_capable": true,       "cpu_fallback": true,       " |
| validate:gpu-policy | npm.cmd run validate:gpu-policy | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:gpu-policy > node scripts/validate_gpu_policy.mjs  {   "ok": true,   "status": "PASS",   "gpu_primary": true,   "cpu_fallback_allowed": true,   "note": "GPU primary and CPU fallback policy markers are present." } |
| validate:helper-bridge | npm.cmd run validate:helper-bridge | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:helper-bridge > node scripts/validate_helper_bridge.mjs  Helper bridge validation passed. |
| validate:voice-capture | npm.cmd run validate:voice-capture | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:voice-capture > node scripts/validate_voice_capture_flow.mjs  Voice capture validation passed. |
| validate:runtime-flow | npm.cmd run validate:runtime-flow | PARTIAL | Runtime flow validation failed: - capture helper readiness guard: missing Voice capture is blocked because helper provider readiness is not verified yet |
| validate:audio-studio | npm.cmd run validate:audio-studio | PASS | > translateit-tauri-desktop-runtime@0.1.0 validate:audio-studio > node scripts/validate_audio_studio.mjs  Audio Studio static validation passed. |
| validate:audio-studio:local | npm.cmd run validate:audio-studio:local | PASS | Compiling translateit v0.1.0 (D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri) warning: function `probe_native_input_config` is never used    --> src\commands\audio.rs:175:8     | 175 | pub fn probe_native_input_config() -> NativeInputConfigProbeReport {     |        ^^^^^^^^^^^^^^^^^^^^^^^^^     |     = note: `#[warn(dead_code)]` (part of `#[warn(unused)]`) on by default  warning: function `plan_native_capture_stream_state` is never used    --> src\command |
| verify:audio-studio:summary | npm.cmd run verify:audio-studio:summary | PASS | > translateit-tauri-desktop-runtime@0.1.0 verify:audio-studio:summary > node scripts/verify_audio_studio_local_summary.mjs  Audio Studio summary evidence verification passed. |
| status:all | npm.cmd run status:all | PASS | > translateit-tauri-desktop-runtime@0.1.0 status:all > node ../../../DevelopingData/Tooling/Scripts/Execution/translateit_all_status.mjs  {   "schema": "translateit.all_status.v1",   "ok": true,   "checks": [     {       "name": "contracts",       "exit_code": 0,       "loaded": true,       "output": {         "schema": "translateit.contract_status.v2",         "contracts_root": "EngineData/Backend/RuntimeContracts",         "loaded": {           "attachment": true,           "translation": true |
| status:translation | npm.cmd run status:translation | BLOCKED | > translateit-tauri-desktop-runtime@0.1.0 status:translation > node ../../../DevelopingData/Tooling/Scripts/Execution/translateit_translation_status.mjs  {   "schema": "translateit.translation_status.v3",   "contract_path": "EngineData/Backend/RuntimeContracts/TRANSLATION_RUNTIME_CONTRACT.json",   "runtime_manifest_path": "EngineData/Backend/RuntimeContracts/MODEL_RUNTIME_MANIFEST.json",   "contract_loaded": true,   "runtime_manifest_loaded": true,   "primary_translation_marker_ready": true,   " |
| status:audio-pipeline | npm.cmd run status:audio-pipeline | BLOCKED | > translateit-tauri-desktop-runtime@0.1.0 status:audio-pipeline > node ../../../DevelopingData/Tooling/Scripts/Execution/translateit_voice_status.mjs  {   "schema": "translateit.audio_pipeline_status.v3",   "contract_path": "EngineData/Backend/RuntimeContracts/AUDIO_PIPELINE_RUNTIME_CONTRACT.json",   "runtime_manifest_path": "EngineData/Backend/RuntimeContracts/MODEL_RUNTIME_MANIFEST.json",   "contract_loaded": true,   "runtime_manifest_loaded": true,   "asr_marker_ready": true,   "tts_marker_re |
| status:readiness | npm.cmd run status:readiness | PARTIAL | > translateit-tauri-desktop-runtime@0.1.0 status:readiness > node ../../../DevelopingData/Tooling/Scripts/Execution/translateit_tooling.mjs summarize-readiness  {   "schema": "translateit.readiness_summary.v4",   "created_at": "2026-06-19T02:43:47.350Z",   "client_ready": false,   "blockers": [     "missing:latest_validation_evidence.json",     "missing:latest_manual_runtime_evidence.json",     "missing:worker_smoke_evidence"   ],   "note": "Client-ready requires real local validation evidence." |
| validate:internal | npm.cmd run validate:internal | PARTIAL | > translateit-tauri-desktop-runtime@0.1.0 validate:internal > npm run validate:root && npm run validate:structure && npm run validate:launcher && npm run validate:worker && npm run validate:evidence && npm run validate:security-hardening && npm run validate:architecture-contracts && npm run validate:single-active-engine && npm run validate:userdata-root-policy && npm run validate:helper-bridge && npm run validate:voice-capture && npm run validate:settings-navigation && npm run validate:machine-p |
| validate:full | npm.cmd run validate:full | PARTIAL | > translateit-tauri-desktop-runtime@0.1.0 validate:full > npm run validate:root && npm run validate:structure && npm run validate:launcher && npm run validate:worker && npm run validate:models && npm run validate:evidence && npm run validate:security-hardening && npm run validate:architecture-contracts && npm run validate:single-active-engine && npm run validate:userdata-root-policy && npm run validate:helper-bridge && npm run validate:voice-capture && npm run validate:settings-navigation && npm |
| audit:deps | npm.cmd run audit:deps | PARTIAL | > translateit-tauri-desktop-runtime@0.1.0 audit:deps > npm audit --audit-level=moderate  # npm audit report  esbuild  <=0.24.2 Severity: moderate esbuild enables any website to send any requests to the development server and read the response - https://github.com/advisories/GHSA-67mh-4wv8-2f99 fix available via `npm audit fix --force` Will install vite@8.0.16, which is a breaking change node_modules/esbuild   vite  <=6.4.2   Depends on vulnerable versions of esbuild   node_modules/vite   2 vulne |
| setup:worker | npm.cmd run setup:worker | PASS | > translateit-tauri-desktop-runtime@0.1.0 setup:worker > powershell -NoProfile -ExecutionPolicy Bypass -File ../../Backend/LocalWorker/WorkerRuntime/setup_realtime_worker.ps1  TranslateIT local realtime worker setup Root: D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust WorkerRoot: D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\Backend\LocalWorker\WorkerRuntime Upgrading pip Requirement already satisfied: pip in D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\Backend\LocalWorker\ |
| smoke:worker | npm.cmd run smoke:worker | BLOCKED | > translateit-tauri-desktop-runtime@0.1.0 smoke:worker > powershell -NoProfile -ExecutionPolicy Bypass -File ../../Backend/LocalWorker/WorkerRuntime/run_realtime_worker_smoke.ps1  TranslateIT local realtime worker smoke test Root: D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust Mode: Realtime AudioPath:  {     "schema":  "translateit.local_worker_smoke_result.v2",     "created_at":  "2026-06-19T02:44:09.6520344Z",     "ok":  false,     "mode":  "Realtime",     "text_input":  "halo",     "aud |
| smoke:worker:quality | npm.cmd run smoke:worker:quality | BLOCKED | > translateit-tauri-desktop-runtime@0.1.0 smoke:worker:quality > powershell -NoProfile -ExecutionPolicy Bypass -File ../../Backend/LocalWorker/WorkerRuntime/run_realtime_worker_smoke.ps1 -Mode Quality -Text halo -TtsText Hello.  TranslateIT local realtime worker smoke test Root: D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust Mode: Quality AudioPath:  {     "schema":  "translateit.local_worker_smoke_result.v2",     "created_at":  "2026-06-19T02:44:20.5322945Z",     "ok":  false,     "mode":  " |
| smoke:worker:audio | npm.cmd run smoke:worker:audio | BLOCKED | > translateit-tauri-desktop-runtime@0.1.0 smoke:worker:audio > powershell -NoProfile -ExecutionPolicy Bypass -File ../../Backend/LocalWorker/WorkerRuntime/run_realtime_worker_smoke.ps1 -AudioPath UserData/CacheData/audio_segments/latest_live_target_segment.wav  TranslateIT local realtime worker smoke test Root: D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust Mode: Realtime AudioPath: UserData/CacheData/audio_segments/latest_live_target_segment.wav {     "schema":  "translateit.local_worker_smoke_ |
| validate:native-smoke | npm.cmd run dev | PARTIAL | Running BeforeDevCommand (`npm run dev:frontend`)      Running DevCommand (`cargo  run --no-default-features --color always --`)         Info Watching D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri for changes... [1m[92m   Compiling[0m translateit v0.1.0 (D:\Work\AI Stuff\TranslateIT\TranslateIT-Rust\EngineData\LauncherApp\RustApp\src-tauri) [1m[96m    Building[0m [=======================> ] 375/377: transla…[1m[96m    Building[0m [============== |
| cleanup:project-processes:after-native-smoke | powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/cleanup_translateit_processes.ps1 | PASS | Stopped process 5668 node.exe Stopped process 15580 node.exe Stopped process 28272 translateit.exe Stopped process 8152 msedgewebview2.exe Stopped process 20080 msedgewebview2.exe Stopped process 20604 msedgewebview2.exe Skipped process 26360 msedgewebview2.exe: Cannot find a process with the process identifier 26360. Skipped process 28748 msedgewebview2.exe: Cannot find a process with the process identifier 28748. Skipped process 20396 msedgewebview2.exe: Cannot find a process with the process  |

## Summary

{
  "result": "PARTIAL",
  "entries": [
    {
      "name": "cleanup:project-processes:before",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "npm install",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "typecheck",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "check:rust",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "build:frontend",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "build",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "cargo test",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "cargo fmt --check",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "cargo clippy",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "cargo clippy -- -D warnings",
      "classification": "PARTIAL",
      "ok": false,
      "status": 101,
      "timed_out": false
    },
    {
      "name": "validate:engine-total",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "validate:settings-navigation",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "validate:user-flow",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "models:inventory",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "models:verify",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "validate:gpu-policy",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "validate:helper-bridge",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "validate:voice-capture",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "validate:runtime-flow",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "validate:audio-studio",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "validate:audio-studio:local",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "verify:audio-studio:summary",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "status:all",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "status:translation",
      "classification": "BLOCKED",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "status:audio-pipeline",
      "classification": "BLOCKED",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "status:readiness",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "validate:internal",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "validate:full",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "audit:deps",
      "classification": "PARTIAL",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "setup:worker",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    },
    {
      "name": "smoke:worker",
      "classification": "BLOCKED",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "smoke:worker:quality",
      "classification": "BLOCKED",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "smoke:worker:audio",
      "classification": "BLOCKED",
      "ok": false,
      "status": 1,
      "timed_out": false
    },
    {
      "name": "validate:native-smoke",
      "classification": "PARTIAL",
      "ok": false,
      "status": null,
      "timed_out": true
    },
    {
      "name": "cleanup:project-processes:after-native-smoke",
      "classification": "PASS",
      "ok": true,
      "status": 0,
      "timed_out": false
    }
  ]
}
