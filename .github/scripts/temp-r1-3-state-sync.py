from pathlib import Path

path = Path("docs/knowledge/next-action.md")
text = path.read_text(encoding="utf-8")

old_mode = "**Plan / R1.2 FFmpeg Provenance/Profile CLOSED — R1.3 THIRD-PARTY NOTICE BUNDLE NEXT**"
new_mode = "**Plan / R1.3 Third-Party Notice Bundle CLOSED — R2 DEPENDENCY / SUPPLY-CHAIN STATIC AUDIT NEXT**"
if old_mode not in text:
    raise SystemExit("R1.3 current-mode anchor not found")
text = text.replace(old_mode, new_mode, 1)

marker = "## Existing Source-Closed Boundaries\n"
section = '''## R1.3 Deterministic Third-Party Notice Bundle Closure

The remaining non-local notice/source-material boundary is source-closed without changing product runtime, model behavior, frontend, or installer UX. The release now has one generated notice owner rather than a manually maintained parallel license inventory.

A hosted Windows/no-dev audit evaluated the frozen WorkerRuntime dependency closure against Python 3.12.10 and the current `uv` policy. The active Windows production closure contained 116 Python distributions. The audit confirmed that Linux-only CUDA/NVIDIA packages and dev-only dependencies are not treated as Windows release notice inputs. The two deliberately reviewed LGPL Python dependencies remain `frozendict==2.4.7` and `soxr==1.1.0`; `fsspec==2026.7.0` was reconciled to its upstream BSD-3-Clause license after PyPI metadata did not carry a useful license declaration. This audit informs the release gate and is not a legal opinion.

`EngineData/Frontend/RustApp/scripts/generate_third_party_notices.mjs` is now the single notice-bundle source owner. It operates offline against the exact staged release inputs and deterministically builds:

```text
EngineData/Backend/RuntimeAssets/ThirdPartyNotices/THIRD_PARTY_NOTICES.txt
```

The generated bundle includes CPython's staged license, every installed Python distribution's embedded license/notice material plus metadata/source references, the canonical model inventory, bounded GPT-SoVITS/pretrained/nested-origin attribution, CMUdict acknowledgement, the pinned FFmpeg license/source companions, and the existing VB-CABLE notice. The generated output is ignored by Git; it is derived from the staged payload rather than becoming a second source authority.

The generator and payload preflight fail closed when an installed Python distribution has no embedded license/notice material, when the excluded `distance` distribution reappears, when the reviewed `g2p-en`/`frozendict`/`soxr`/`fsspec` versions drift, or when the reviewed LGPL material is absent. `build_release.ps1` now executes notice generation before payload preflight, and Tauri bundles the one resulting notice file with the release resources. Payload preflight rebuilds the expected bundle in memory and requires an exact match so a stale generated notice cannot be promoted.

VB-CABLE remains deliberately different: its NOTICE is included in the generated bundle, but neither the generator nor source proof declares concrete redistribution rights for a particular TranslateIT release. Provider rights/package bytes and installed-driver behavior remain separate gates.

Accepted hosted source proof:

```text
production dependency audit run 31806635501
Windows Server 2022 / Python 3.12.10 / uv 0.12.0
active Windows no-dev Python distributions -> 116
platform/dev-only dependency filtering -> PASS

final closure run 31807933526
bounded seven-owner release change -> PASS
notice generator/source syntax -> PASS
deterministic synthetic staged-payload bundle -> PASS
Distance reappearance fail-closed -> PASS
missing Python license material fail-closed -> PASS
release package source contract -> PASS
notice generation -> payload preflight -> Tauri build order -> PASS
source commit -> 00a95379edb58c31426dfbaaf120e1aa7b9933ff
```

Two earlier closure attempts did not produce a product commit. The first exposed only that an untracked new generator file is not returned by `git diff --name-only`; the second proved deterministic generation but exposed that a temporary environment variable did not persist across GitHub Actions steps. The final proof corrected the proof harness rather than weakening the product contract.

This closes source-side notice generation only. It does not prove that a future private staged runtime contains every required license file, that package-specific source/conveyance obligations have been legally satisfied, that VB-CABLE redistribution rights apply, that an installer has been generated, or that any installed/clean-machine runtime works.

'''
if "## R1.3 Deterministic Third-Party Notice Bundle Closure" not in text:
    if marker not in text:
        raise SystemExit("source-closed section anchor not found")
    text = text.replace(marker, section + marker, 1)

old_list = "R1.2 FFmpeg provenance / LGPL profile pinning\nP3 private Python/runtime/model packaging contract"
new_list = "R1.2 FFmpeg provenance / LGPL profile pinning\nR1.3 deterministic third-party notice/source bundle\nP3 private Python/runtime/model packaging contract"
if old_list not in text:
    raise SystemExit("source-closed R1.2 list anchor not found")
text = text.replace(old_list, new_list, 1)

old_next = "**R1.3 — close the remaining non-local third-party release notice/source bundle at the existing release owners. Derive the distributable notice/license/source requirements from the frozen `uv.lock`, CPython runtime, pinned ASR/translation/GPT-SoVITS assets, CMUdict, and pinned FFmpeg companions; create only the minimum deterministic notice bundle needed by the installer and make release preflight fail closed when a required notice/source record is absent. Keep VB-CABLE concrete redistribution rights as an external gate: if those rights are not established for the intended release, do not stage provider bytes or claim release clearance. Do not start local Windows testing or installer runtime claims.**"
new_next = "**R2 — run one bounded hosted dependency / supply-chain static audit against the final tracked source locks and release scripts: the frontend npm lock/package, Rust `Cargo.lock`/manifest, WorkerRuntime `uv.lock`, and release packaging sources. Use authoritative advisory tooling/databases, separate dev-only or platform-irrelevant findings from production-relevant findings, and change dependencies only for concrete actionable risk. Include a bounded tracked-source secret/path leakage check. Do not add a security framework, updater/signing infrastructure, dependency dashboard, or speculative hardening; do not claim installed-runtime security or start local Windows testing. If the audit finds no actionable source issue, close with `No change required`.**"
if old_next not in text:
    raise SystemExit("R1.3 next-step anchor not found")
text = text.replace(old_next, new_next, 1)

path.write_text(text, encoding="utf-8")
print("[r1.3-state] canonical closure prepared")
