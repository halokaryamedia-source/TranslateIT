# TranslateIT — Next Action

## Current Status

`MILMMT-46-1B-v1.0 CANONICAL / REPO-SIDE DEVELOPMENT CLEANUP CLOSED / R3 PACKAGING + INSTALLER LIFECYCLE SOURCE COMPLETE / DUPLICATE RELEASE CI RETIRED / LOCAL & TARGET-PC ACCEPTANCE DEFERRED`

## Active Boundary

- `Local` is the current development authority.
- `Developing` remains the GitHub default branch and historical/recovery authority; it is not a silent write target.
- Canonical translator is `xiaomi-research/MiLMMT-46-1B-v1.0` at revision `4fc480b6c58dec29c159dcdf9fde0f6d5c354995`.
- Canonical WorkerRuntime dependency authority is Python 3.12.x + Torch 2.11.0/cu126 + Transformers 4.57.6 + Tokenizers 0.22.2.
- M2M100, Marian, Transformers 4.50.0, and retired helper paths may remain only as historical evidence or explicit negative guards.
- The **R3 packaging boundary** is one automatic offline `TranslateIT-Setup.exe` plus colocated `TranslateIT-Payload.7z`. The large Python/model/Voice/VB-CABLE payload is not embedded as Tauri resources.
- Setup source owns payload app-version/schema/SHA-256 verification, disk-space gate, staged replacement/rollback, private-runtime dependency verification, VB-CABLE vendor invocation, reboot signaling, and installed-runtime manifest creation.
- Uninstall source removes TranslateIT-owned external runtime while preserving app-local user data and the system VB-CABLE driver.
- CI authority is consolidated: one MiLMMT contract workflow, one R3 release workflow, one read-only WorkerRuntime lock check, and Repository Verify. The duplicate release profiling workflows are retired.
- Repository/static/hosted evidence does not prove actual Setup execution, Windows driver consent/restart behavior, installed runtime, CUDA/audio behavior, Meeting delivery, or clean-machine readiness.
- Local/target-PC acceptance remains intentionally deferred until explicitly requested.

## Closed Development Boundary

Do not reopen model selection, MiLMMT latency tuning, dependency convergence, worker architecture, R3 payload representation, installer lifecycle, or duplicate release-workflow cleanup without a new concrete defect or requirement. In particular, do not add StaticCache, `torch.compile`, speed-only quantization, alternate inference backends, another translator, network bootstrap, a second user-facing installer, or a parallel release pipeline merely to create more proof.

## Next Step

**Keep repo-side development closed. When validation is explicitly resumed, run the Windows R3 build-artifact proof first from current `Local`; only after that may installed-runtime/GPU/audio/VB-CABLE/Meeting/clean-machine acceptance proceed. Until then, do not perform local or target-PC testing and do not add source changes solely to manufacture acceptance evidence.**
