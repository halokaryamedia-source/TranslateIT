---
name: awesome-rust-research
description: Bounded Rust ecosystem discovery for a real dependency/tooling need. Uses Awesome Rust as a candidate index only, then verifies candidates against primary sources and current TranslateIT constraints. Support skill only; not a Rust coding specialist.
metadata:
  role: support
  discovery_source: https://github.com/rust-unofficial/awesome-rust
  discovery_source_license: CC0-1.0
---

# Awesome Rust Research

Use this only when TranslateIT has a **proved Rust dependency/tooling decision** to
make. Do not activate it merely because the affected file is Rust.

`rust-unofficial/awesome-rust` is a curated discovery index, not an implementation
authority. It can surface candidates, but a candidate is not approved until its
maintainer documentation/source and current project constraints support adoption.

## Before External Discovery

1. Identify the exact capability missing from the current owner.
2. Inspect the existing Cargo dependency or implementation that already owns it.
3. Establish why extending the current owner/dependency is insufficient.
4. Define the minimum acceptance criteria for a replacement/addition.

If no new crate/tool is actually required, stop with `No change required`.

## Candidate Discovery

Use Awesome Rust only to narrow the search space in relevant categories such as:

- development tooling, profiling, static analysis, testing, or FFI;
- asynchronous/concurrency/runtime libraries;
- audio/system/Windows libraries when the semantic specialist has already proved
  that external discovery is required.

Do not dump a long list of crates. Prefer one recommended candidate and at most two
credible alternatives when trade-offs are material.

## Primary-Source Verification

For each serious candidate, verify from the project's official repository/docs and,
when material, crates.io metadata:

- capability fit for the exact TranslateIT requirement;
- Windows support and current maintenance state;
- license compatibility;
- MSRV / Rust edition / platform requirements;
- unsafe/native/system dependency surface;
- binary/compile/dependency cost where relevant;
- API stability and current release/documentation;
- whether adoption removes complexity or merely adds another path.

Popularity, stars, or inclusion in Awesome Rust are not acceptance evidence.

## Adoption Gate

Recommend adoption only when all are true:

```text
real current requirement
+ current owner cannot satisfy it cleanly
+ candidate capability is verified from primary source
+ project/platform/license constraints fit
+ dependency reduces net complexity or enables required acceptance
```

Otherwise recommend `KEEP CURRENT`, `DEFER`, or `NO CHANGE`.

## TranslateIT-Specific Guardrails

- Never create a second runtime/engine because a Rust crate looks cleaner.
- Do not replace Python AI execution with Rust merely for language purity.
- Do not introduce FFI/PyO3 unless profiling or packaging evidence proves the
  process boundary is the actual problem.
- Do not use a generic crate abstraction to hide unresolved audio/AI ownership.
- Version-sensitive implementation must be checked against current official docs
  before source edits.

## Output Shape

Return a compact decision:

```text
Requirement
Current owner
Candidate
Why it fits / why it does not
Dependency cost / risk
Decision: ADOPT | KEEP CURRENT | DEFER | REJECT
Required proof
```
