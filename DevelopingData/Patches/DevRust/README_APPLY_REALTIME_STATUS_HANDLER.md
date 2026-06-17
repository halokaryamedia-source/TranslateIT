# Apply Realtime Status Handler Registration

## Target file

`EngineData/LauncherApp/RustApp/src-tauri/src/main.rs`

## Required edit

Find:

```rust
get_runtime_status_bundle,
```

Add this line directly below it:

```rust
get_realtime_status_payload,
```

Expected result:

```rust
get_runtime_status_bundle,
get_realtime_status_payload,
analyze_live_pipeline_gate,
```

## Validation

From `EngineData/LauncherApp/RustApp`, run:

```text
npm run check:rust
```

## Related patch

`DevelopingData/Patches/DevRust/register_realtime_status_payload_handler.patch`
