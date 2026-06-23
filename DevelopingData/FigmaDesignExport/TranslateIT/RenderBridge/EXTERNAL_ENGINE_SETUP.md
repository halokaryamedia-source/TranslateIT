# TranslateIT External Engine Setup

TranslateIT expects the external visual parser to run from the workspace-controlled folder:

```txt
DevelopingData/FigmaDesignExport/_external/OmniParser
```

Use the supported startup command from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File ".\DevelopingData\FigmaDesignExport\TranslateIT\scripts\start-dev.ps1"
```

The active endpoint is:

```txt
http://127.0.0.1:7860/parse
```

Do not start external engine folders from outside `DevelopingData/FigmaDesignExport` during normal development.
