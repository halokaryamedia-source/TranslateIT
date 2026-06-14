# Structure Cleanup Report

## Result

TranslateIT development files are now consolidated under:

```text
DevelopingData/
  Documentation/
  Quality/
  Samples/
  Tooling/
```

Runtime files are isolated under:

```text
EngineData/
  LauncherApp/
  TranscriptEngine/
  TranslateEngine/
  VoiceEngine/
```

## Retired paths

These paths are retired and should not return:

```text
DeveloperData/
DevelopingData/DocumentationData/
DevelopingData/Reports/
DevelopingData/ToolKitData/
DevelopingData/Diagnostics/
DevelopingData/Docs/
DevelopingData/LauncherHelpers/
DevelopingData/SampleData/
DevelopingData/Tests/
```

## Active documentation route

```text
DevelopingData/Documentation/
```

## Active tooling route

```text
DevelopingData/Tooling/Scripts/Execution/
```

## Active application route

```text
TranslateIT.vbs -> EngineData/LauncherApp/RustApp
```

## Important rule

Do not create parallel documentation or runtime folders. Add future documentation under `DevelopingData/Documentation` and future validation tooling under `DevelopingData/Tooling`.
