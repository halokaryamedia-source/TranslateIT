from pathlib import Path

path = Path("docs/knowledge/next-action.md")
text = path.read_text(encoding="utf-8")

old_mode = "**Plan / R1.3 Third-Party Notice Bundle CLOSED — R2 DEPENDENCY / SUPPLY-CHAIN STATIC AUDIT NEXT**"
new_mode = "**Plan / R2 Dependency / Supply-Chain Static Audit CLOSED — R3 CONTROLLED RELEASE-INPUT EVIDENCE NEXT**"
if old_mode not in text:
    raise SystemExit("R2 current-mode anchor not found")
text = text.replace(old_mode, new_mode, 1)

marker = "## Existing Source-Closed Boundaries\n"
if marker not in text:
    raise SystemExit("existing source-closed boundary marker not found")

section = '''## R2 Dependency / Supply-Chain Static Audit Closure

The bounded hosted supply-chain audit is closed at the existing dependency/release owners. It did not create a security framework, dependency dashboard, updater/signing system, or broad dependency modernization wave.

Initial hosted audit:

```text
run 31810734172
Windows Server 2022
npm full dependency audit -> 0 vulnerabilities
npm production-only audit -> 0 vulnerabilities
active Windows/no-dev Python closure -> 116 distributions
tracked high-confidence secret scan -> 0 hits
tracked developer-path scan -> 2 intentional redaction-test fixtures only
```

RustSec initially identified `crossbeam-epoch 0.9.18` (`RUSTSEC-2026-0204`), `quick-xml 0.39.4` (`RUSTSEC-2026-0194` and `RUSTSEC-2026-0195`), and the `anyhow 1.0.102` warning/advisory (`RUSTSEC-2026-0190`). Platform trace run `31811131980` established that `crossbeam-epoch` reaches the Windows product through `sysinfo -> rayon`, `anyhow` is in the Tauri Windows tree, and `quick-xml` is transitive through `plist 1.9.0 -> Tauri`. GTK/glib maintenance warnings were not in the Windows target tree.

The minimum actionable source changes were therefore:

```text
Cargo.lock
anyhow 1.0.102 -> 1.0.103
crossbeam-epoch 0.9.18 -> 0.9.20

build_release.ps1
npm exec -- tauri ...
-> exact local node_modules\\.bin\\tauri.cmd
-> fail closed when npm-ci-installed CLI is absent

validate_release_package_contract.mjs
-> require the local Tauri CLI release path
-> reject npm exec / npx in the controlled release build
```

The lock update is exactly two package entries; no other Rust package version changed. Product commit:

```text
44e158a1c78480703e70be94b146231347669ac9
Contain actionable supply-chain findings
```

The identical bounded patch received hosted compile/audit proof in run `31811769155` before commit:

```text
exact two-package Cargo.lock delta -> PASS
exact three-owner product diff -> PASS
local Tauri CLI from npm ci -> PASS
release package source contract -> PASS
npm production audit -> 0 vulnerabilities
frontend typecheck -> PASS
frontend production build -> PASS
cargo check --locked with RUSTFLAGS=-Dwarnings -> PASS
cargo test --locked -> 42 passed / 0 failed
post-patch RustSec set -> only RUSTSEC-2026-0194 and RUSTSEC-2026-0195 remain
```

That run intentionally did not commit after a later proof-harness assertion used the first `get_translation_runtime()` occurrence in the whole worker instead of the call inside `handle_translate()`. Direct source inspection establishes the actual boundary: `handle_translate()` rejects text above `MAX_TRANSLATION_TEXT_CHARS = 2_000` before calling `get_translation_runtime()` and before Marian tokenization. A later temporary regex harness also used a multiline end-anchor incorrectly; neither harness failure changed product source or invalidated the earlier compile/audit results. Commit run `31812531853` then applied the same exact three-owner patch and exact two-package lock delta.

Residual findings are classified rather than hidden:

- `quick-xml 0.39.4` remains because `plist 1.9.0` constrains `quick-xml ^0.39.2`; a precise 0.41 update is rejected by Cargo. No direct TranslateIT XML/plist parser or untrusted-XML input owner was established in current product source, so a broad Tauri/plist upgrade is not justified solely to force this transitive update. Reassess if the parent constraint changes or a real untrusted XML path is introduced.
- `transformers 4.50.0` is affected by the MarianTokenizer `remove_language_code` ReDoS advisory and Marian tokenization is on the Text/Meeting translation path. The fixed line starts at Transformers 4.53.0, but the pinned GPT-SoVITS source explicitly constrains Transformers to `<=4.50`. Current TranslateIT rejects source text above 2,000 characters before tokenizer/model runtime, so the exposure is bounded locally; do not claim the advisory is removed. A Transformers upgrade requires a separate GPT-SoVITS compatibility proof rather than violating the pinned integration boundary.
- the audited setuptools finding applies to source-distribution building on normalization-sensitive macOS filesystems, not the packaged Windows runtime path.
- the audited Torch JIT advisory requires the affected `torch.jit.script` path; no such tracked TranslateIT product call was established, so no broad Torch/CUDA upgrade was introduced.

The release-script audit also removed one avoidable supply-chain ambiguity: the controlled release no longer uses `npm exec`, whose missing-package behavior can resolve/install a package outside the already-installed local CLI. Release builds now require the exact Tauri CLI installed by the frozen npm dependency setup.

R2 remains static/source evidence. It does not establish installed-runtime security, prove that transitive residual advisories are impossible in every upstream code path, replace future advisory monitoring, or substitute for target Windows/runtime testing.

'''
text = text.replace(marker, section + marker, 1)

boundary_line = "R1.3 deterministic third-party notice/source bundle\n"
if boundary_line not in text:
    raise SystemExit("R1.3 boundary list anchor not found")
text = text.replace(boundary_line, boundary_line + "R2 dependency / supply-chain static audit and bounded actionable containment\n", 1)

old_next = "**R2 — run one bounded hosted dependency / supply-chain static audit against the final tracked source locks and release scripts: the frontend npm lock/package, Rust `Cargo.lock`/manifest, WorkerRuntime `uv.lock`, and release packaging sources. Use authoritative advisory tooling/databases, separate dev-only or platform-irrelevant findings from production-relevant findings, and change dependencies only for concrete actionable risk. Include a bounded tracked-source secret/path leakage check. Do not add a security framework, updater/signing infrastructure, dependency dashboard, or speculative hardening; do not claim installed-runtime security or start local Windows testing. If the audit finds no actionable source issue, close with `No change required`.**"
new_next = "**R3 — controlled release-input evidence gate. Before attempting installer generation, establish the concrete standard VB-CABLE redistribution/licensing status for the intended TranslateIT release and obtain the exact official provider package bytes; stage only the already-pinned CPython/model/GPT-SoVITS/FFmpeg/provider inputs whose provenance, hashes, and required notices can be verified. If provider redistribution rights cannot be established for the intended release, STOP and do not bundle provider bytes. Once all concrete release inputs exist, run one hosted Windows controlled-payload preflight and NSIS installer-generation rehearsal. Do not use placeholder assets, first-use downloads, or call installer generation installed-runtime/clean-machine proof; local Windows validation remains deferred.**"
if old_next not in text:
    raise SystemExit("R2 next-step anchor not found")
text = text.replace(old_next, new_next, 1)

path.write_text(text, encoding="utf-8")
print("[r2-state] canonical closure synced")
