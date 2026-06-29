# TranslateIT V1-Advance Workflow Trigger Repair Audit

Branch: `V1-Advance`
Status: repair after workflow trigger cleanup failure

## Problem

After workflow trigger cleanup, the latest CI became red.

The likely cause was that the primary workflow was simplified while the V1-Advance policy validator still expected older workflow and documentation markers.

## Repair

Updated:

```text
EngineData/Frontend/RustApp/scripts/validate_v1_advance_policy.mjs
```

The validator now matches the current strategy:

```text
V1-Advance is the primary source branch
Developing is no longer the active merge target
Primary CI uses push to V1-Advance and workflow_dispatch
Rust validation is Rust Manifest Preflight
```

## Not claimed

This repair does not claim full cargo check readiness, Tauri packaging readiness, CUDA readiness, model readiness, microphone success, virtual microphone routing success, TTS provider quality, installer readiness, or target-PC latency.
