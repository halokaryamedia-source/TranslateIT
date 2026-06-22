# TranslateIT External Engine Setup

Current honest status without external helper engines:

```txt
NOT READY FOR FIGMA TEST
```

## Visual UI Parser Adapter

TranslateIT now supports these external parser inputs:

### OmniParser-style endpoint

```powershell
$env:OMNIPARSER_ENDPOINT='http://127.0.0.1:7860/parse'
```

The endpoint receives JSON with `image_base64`, `url`, and `title`.

Expected response should contain `regions`, `components`, `boxes`, or `elements`.

Each region should include:

```json
{
  "role": "button | text | image | container | navigation",
  "text": "optional OCR text",
  "confidence": 0.92,
  "rect": { "x": 0, "y": 0, "w": 100, "h": 40 }
}
```

### UIED-style CLI

```powershell
$env:UIED_CLI_PATH='D:\Tools\uied\uied-parse.exe'
```

Expected call:

```txt
UIED_CLI_PATH source.png output.json
```

Output JSON uses the same region schema.

## Mandatory Gate Before Figma

```powershell
node .\tests\test-engine-pipeline-readiness.mjs https://www.mivubi.com/
```

Expected:

```txt
reports/translateit-engine-pipeline-readiness.json
status = pass
figmaTestAllowed = true
```

If external parser is missing, this gate must fail.
