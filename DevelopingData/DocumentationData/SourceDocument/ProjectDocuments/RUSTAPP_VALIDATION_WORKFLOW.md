# RustApp Validation Workflow

## Document control

- Project: TranslateIT
- Branch: `ChatGPT-ConvertEngine`
- Date: `2026-06-14`
- Status: Validation workflow added

## Workflow file

```text
.github/workflows/rustapp-validation.yml
```

## Purpose

The workflow provides CI validation for the RustApp migration branch.

## Trigger

- Manual run through `workflow_dispatch`.
- Pull request validation when RustApp or RustApp checker files change.

## Runner

```text
windows-latest
```

## Main validation script

```powershell
.\DevelopingData\ToolKitData\Scripts\Execution\run_rustapp_final_validation.ps1
```

## Important note

A passing workflow still does not mean production runtime Ready. The app can be marked Ready only after real model-load validation, CUDA validation, audio input flow, ASR, text, and output flows pass end-to-end.
