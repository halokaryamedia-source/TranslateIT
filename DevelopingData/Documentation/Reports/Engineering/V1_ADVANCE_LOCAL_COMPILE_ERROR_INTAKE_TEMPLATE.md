# V1-Advance Local Compile Error Intake Template

Branch: `V1-Advance`
Status: manual error intake template

## Purpose

Use this template when `npm run check:tauri-rust-local` fails on a Windows development machine.

The goal is to capture the first actionable Rust/Tauri compile error quickly, without sending oversized logs or only the final exit-code line.

## Command to run

Run from:

```text
EngineData/Frontend/RustApp
```

Command:

```bash
npm run check:tauri-rust-local
```

## Minimum information to send

Copy and send this block:

```text
Branch / commit:
OS:
Node version:
npm version:
rustc version:
cargo version:
Command run:
First Rust error code:
First Rust error message:
File path mentioned by the first error:
Line number mentioned by the first error:
```

## Log excerpt format

Paste only the first real Rust error section, usually starting with:

```text
error[E...]
```

Include around 20 to 60 lines after that first error, especially the lines that show:

```text
--> path/to/file.rs:line:column
```

## What not to send alone

Do not send only:

```text
cargo exited with status 101
npm ERR! code 1
```

Those lines only confirm failure. They do not identify the Rust source error.

## Example intake

```text
Branch / commit: V1-Advance / <commit-sha>
OS: Windows 11
Node version: v20.x
npm version: 10.x
rustc version: rustc 1.xx.x
cargo version: cargo 1.xx.x
Command run: npm run check:tauri-rust-local
First Rust error code: error[E0433]
First Rust error message: failed to resolve: could not find ...
File path mentioned by the first error: EngineData/Frontend/RustApp/src-tauri/src/...
Line number mentioned by the first error: 123
```

## Triage order

Fix only the first real Rust error first.

After that fix is pushed and CI remains green, run `npm run check:tauri-rust-local` again and repeat the intake process for the next first error.

This avoids guessing across many cascading compile errors.
