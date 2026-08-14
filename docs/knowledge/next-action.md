# TranslateIT — Next Action

## Current Mode

**Maintenance / P4 Meeting Audio Provider Policy SOURCE-CLOSED — RELEASE/LOCAL EVIDENCE DEFERRED**

VoiceLab A1 through A6, the pre-local VoiceLab quality audit, P3 runtime/model packaging source closure, and P4 Meeting audio provider distribution policy are now source-closed. Target/local Windows validation remains explicitly deferred by the user.

## P4 Result

The initial controlled Meeting audio provider direction is now:

```text
standard VB-Audio VB-CABLE only
-> controlled release-side provider payload
-> bundled VB-Audio / donationware notice
-> existing Rust/CPAL matched-pair detection and delivery
```

P4 does not create a second audio runtime owner. `commands/virtual_mic_route.rs` and `engine/audio/meeting_output.rs` remain responsible for finding, binding, and using the Windows virtual-audio pair during Meeting operation.

The release source explicitly excludes provider expansion that is not required by the current product:

```text
no VB-CABLE A+B / C+D bundle
no Voicemeeter bundle
no alternate provider selector
no custom TranslateIT virtual-audio driver
no driver-bypass / autoclick / certificate workaround
```

The controlled provider staging path is:

```text
EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/
├─ README.md
├─ NOTICE.txt
└─ Package/
   ├─ VBCABLE_Setup_x64.exe
   ├─ VBCABLE_Setup.exe
   └─ official package support files
```

`Package/` remains ignored by Git. The official provider bytes are release inputs, not application source.

## Distribution And Installation Boundary

The source records VB-CABLE's third-party identity and donationware boundary instead of rebranding it as a TranslateIT-owned Windows driver.

A particular TranslateIT release may stage/distribute the provider only after its applicable redistribution/licensing conditions have been satisfied. Repository source, a notice file, or a passing source validator does not establish that legal/commercial condition for a release.

The actual Windows driver installation is also intentionally not automated further in source yet. Administrator elevation/security consent, restart behavior, install failure/rollback, endpoint appearance, and post-restart usability are installer/target evidence and must not be guessed from static source.

## Release Payload Gate

`scripts/validate_release_payload.mjs` now fails closed unless the controlled release input includes:

```text
private PythonRuntime
required ASR + ID<->EN translation models
approved GPT-SoVITS VoiceLab payload
standard VB-CABLE provider package
VB-Audio / VB-CABLE donationware notice
```

It also rejects known alternate provider payload names for VB-CABLE A+B/C+D and Voicemeeter so an expanded audio stack cannot enter the installer accidentally.

## Accepted P4 Hosted Proof

Final P4 source proof:

```text
run 31780383064
exact checkout SHA b549ce109f3dc08ac0b8bbb7b5b99b52d64da804
Windows Server 2022
P4 provider packaging/resource contract -> PASS
normal source validation -> PASS
frontend production build -> PASS
cargo check --locked -> PASS
missing controlled VB-CABLE payload -> correctly FAIL-CLOSED
read-only git diff closure guard -> PASS
```

The initial run `31780280965` failed only because the validator compared one Markdown sentence including formatting too literally; the policy itself was unchanged, and the validator was corrected to test semantic content rather than Markdown emphasis.

## Existing P3 Boundary

P3 remains source-closed. The controlled release source maps only the production WorkerRuntime files, private PythonRuntime, required ASR/translation models, GPT-SoVITS VoiceLab assets, and now the controlled standard VB-CABLE provider payload into the Tauri/NSIS resource layout.

Packaged mode still resolves only `EngineData/Backend/LocalWorker/PythonRuntime/python.exe`; repository `.venv`, environment overrides, system Python, and developer setup scripts are not installed-product fallbacks.

## Deferred Target / Installer Evidence

The following remain intentionally unproven while local testing is deferred:

```text
applicable redistribution/license status for the concrete release
actual official VB-CABLE package bytes used for that release
successful NSIS installer generation with all controlled payloads
VB-CABLE driver installation/elevation/security consent
restart/reboot handling and recovery
installed virtual endpoint appearance and matched-pair detection
physical translated-audio delivery through the pair
Zoom/Meet/Teams reception
installed private Python/model/GPT-SoVITS execution
real MyVoice training/synthesis quality
CUDA/VRAM practicality
latency / long-session stability
safe installed Stop/Close/power lifecycle
clean-machine execution
```

Hosted source proof must not be presented as evidence for these claims.

## Next Step

**STOP additional provider/installer plumbing until a concrete authorized release payload and target-Windows installer evidence are available. Local/target validation remains deferred by the user. Continue only with another independently grounded source task, or resume release/local validation when explicitly requested.**
