# LauncherHelpers

## Status

Retired.

The legacy helper launchers were removed after the Rust/Tauri migration. Runtime entry must now go through the single root launcher:

```text
TranslateIT.vbs
```

That launcher targets the RustApp route:

```text
EngineData/LauncherApp/RustApp
```

## Rule

Do not add Python launcher, SAPI helper, debug BAT, or alternate legacy runtime entry files here. All user-facing startup must resolve to the Rust/Tauri app route only.
