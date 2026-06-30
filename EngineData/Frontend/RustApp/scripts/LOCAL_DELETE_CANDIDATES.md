# Local Delete Candidates

Use this file when doing a local cleanup pass. These files are **not part of the active V1 Advance CI gate** and can be deleted locally after one final local check.

## Keep / active scripts

Do not delete these files unless the workflow and package scripts are changed first:

```text
EngineData/Frontend/RustApp/scripts/validate_script_profiles.mjs
EngineData/Frontend/RustApp/scripts/validate_frontend_import_integrity.mjs
EngineData/Frontend/RustApp/scripts/validate_file_naming_policy.mjs
EngineData/Frontend/RustApp/scripts/validate_translation_flow_integrity.mjs
EngineData/Frontend/RustApp/scripts/validate_runtime_ux_depth_integrity.mjs
EngineData/Frontend/RustApp/scripts/validate_startup_runtime_readiness.mjs
EngineData/Frontend/RustApp/scripts/validate_v1_advance_ci_scope.mjs
EngineData/Frontend/RustApp/scripts/validate_virtual_route_contract.mjs
EngineData/Frontend/RustApp/scripts/validate_rust_manifest_preflight.mjs
EngineData/Frontend/RustApp/scripts/validate_frontend_build_preflight.mjs
EngineData/Frontend/RustApp/scripts/validate_tauri_package_preflight.mjs
EngineData/Frontend/RustApp/scripts/run_contract_reports.mjs
EngineData/Frontend/RustApp/scripts/run_local_tauri_compile_check.mjs
EngineData/Frontend/RustApp/scripts/run_frontend_backend_contract_report.mjs
EngineData/Frontend/RustApp/scripts/run_worker_contract_report.mjs
EngineData/Frontend/RustApp/scripts/run_rust_module_linkage_report.mjs
EngineData/Frontend/RustApp/scripts/run_ui_binding_consistency_report.mjs
EngineData/Frontend/RustApp/scripts/run_action_binding_report.mjs
```

## Delete candidates / retired scripts

These scripts were removed from `package.json` and are not called by the active workflow. Several were reduced to one-line retired stubs because direct deletion through the connector was blocked.

```text
EngineData/Frontend/RustApp/scripts/run_package_script_integrity_report.mjs
EngineData/Frontend/RustApp/scripts/run_settings_integrity_report.mjs
EngineData/Frontend/RustApp/scripts/validate_architecture_contracts.mjs
EngineData/Frontend/RustApp/scripts/validate_audio_studio.mjs
EngineData/Frontend/RustApp/scripts/validate_helper_bridge.mjs
EngineData/Frontend/RustApp/scripts/validate_runtime_flow.mjs
EngineData/Frontend/RustApp/scripts/validate_settings_navigation.mjs
EngineData/Frontend/RustApp/scripts/validate_ui_reference.mjs
EngineData/Frontend/RustApp/scripts/validate_userdata_root_policy.mjs
EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
EngineData/Frontend/RustApp/scripts/validate_voice_capture_flow.mjs
```

## Review-before-delete candidates

These were identified as old/unused npm aliases, but automatic modification was blocked or they may still contain broad repository checks. Delete only after a local search confirms no workflow/package/docs call them.

```text
EngineData/Frontend/RustApp/scripts/validate_single_active_engine.mjs
EngineData/Frontend/RustApp/scripts/validate_machine_paths.mjs
EngineData/Frontend/RustApp/scripts/validate_ui_template.mjs
```

## Suggested local deletion flow

From repo root:

```bash
git checkout V1-Advance

# review candidates first
cat EngineData/Frontend/RustApp/scripts/local-delete-candidates.txt

# delete only after review
xargs rm -f < EngineData/Frontend/RustApp/scripts/local-delete-candidates.txt

# final checks
cd EngineData/Frontend/RustApp
npm run validate:quick
npm run test:contract-reports
```

If those checks pass locally, commit the deletion cleanup.
