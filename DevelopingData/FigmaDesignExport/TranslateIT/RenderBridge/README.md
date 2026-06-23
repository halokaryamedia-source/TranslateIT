# TranslateIT RenderBridge

RenderBridge is the local HTTP bridge used by the TranslateIT Figma plugin.

## Active start command

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\start-dev.ps1"
```

## Active endpoint

```txt
http://127.0.0.1:8844
```

## External visual parser

RenderBridge requires:

```txt
http://127.0.0.1:7860/parse
```

The parser is started by `TranslateIT/scripts/start-dev.ps1` through `TranslateIT/scripts/start-omni-wsl.ps1`.

## Figma manifest

Use only:

```txt
DevelopingData\FigmaDesignExport\TranslateIT\plugin\manifest.json
```

Use URL input only.
