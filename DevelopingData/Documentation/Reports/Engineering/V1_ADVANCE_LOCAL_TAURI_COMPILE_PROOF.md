# V1-Advance Local Tauri Compile Proof

Branch: `V1-Advance`
Status: manual local proof, not a primary CI gate

## Purpose

This document explains how to run a local Rust/Tauri compile proof for the active TranslateIT desktop shell.

The primary GitHub Actions CI intentionally remains lightweight. It validates structure, policy, TypeScript, frontend build, Rust manifest metadata, and Tauri package preflight. It does not claim that the full Rust source compiles or that runtime models, CUDA, microphone, virtual microphone, TTS, installer packaging, or target-PC latency are ready.

## Command

Run from:

```text
EngineData/Frontend/RustApp
```

Command:

```bash
npm run check:tauri-rust-local
```

## What the command does

The command runs:

```text
rustc --version
cargo --version
npm run build:frontend   # only when dist/index.html is missing
cargo check --manifest-path src-tauri/Cargo.toml
```

This proves whether the Rust/Tauri source currently compiles on the local machine.

## Local requirements

- Windows development machine.
- Node.js and npm available.
- Rust toolchain available through `rustc` and `cargo`.
- Project dependencies installed with `npm install` or `npm ci` inside `EngineData/Frontend/RustApp`.
- Tauri system prerequisites installed locally.

## Expected pass result

A passing run ends with:

```text
[local-tauri-compile] Tauri Rust source compile check passed.
```

## If it fails

Copy the first real Rust error from the output. Usually the useful part starts around:

```text
error[E...]
```

Do not paste only the final `cargo exited with status 101` line, because that line does not explain the source problem.

## Current policy

This command is manual until the Rust source is stable enough to promote back into CI.

Do not add it to the primary workflow yet. The next step is to run this command on a Windows target machine, fix Rust compile errors from the actual logs, and only then consider re-promoting full Rust cargo check into CI.
