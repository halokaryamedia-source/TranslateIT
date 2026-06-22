# TranslateIT External Engine Setup

Current honest status without external helper engines:

```txt
NOT READY FOR FIGMA TEST
```

## Visual UI Parser Adapter

TranslateIT now supports these external parser inputs:

### Option A — OmniParser V2 bridge endpoint

Recommended primary path.

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

A ready-to-run bridge contract now exists in:

```txt
tools/omniparser-bridge/
```

Files:

```txt
tools/omniparser-bridge/README.md
tools/omniparser-bridge/omniparser_bridge_server.py
tools/omniparser-bridge/start-omniparser-bridge.ps1
tools/omniparser-bridge/smoke-test-omniparser-bridge.mjs
```

Recommended local setup:

```powershell
git clone https://github.com/microsoft/OmniParser.git D:\Tools\OmniParser
cd D:\Tools\OmniParser
conda create -n omni python==3.12
conda activate omni
pip install -r requirements.txt
```

Download OmniParser V2 weights into `D:\Tools\OmniParser\weights`:

```powershell
for $f in @(
  'icon_detect/train_args.yaml',
  'icon_detect/model.pt',
  'icon_detect/model.yaml',
  'icon_caption/config.json',
  'icon_caption/generation_config.json',
  'icon_caption/model.safetensors'
) {
  huggingface-cli download microsoft/OmniParser-v2.0 $f --local-dir weights
}
Rename-Item weights\icon_caption weights\icon_caption_florence -ErrorAction SilentlyContinue
```

Start the bridge from RenderBridge:

```powershell
cd .\tools\omniparser-bridge
powershell -ExecutionPolicy Bypass -File .\start-omniparser-bridge.ps1 -OmniParserRepo 'D:\Tools\OmniParser'
```

Then set the endpoint in the RenderBridge audit terminal:

```powershell
$env:OMNIPARSER_ENDPOINT='http://127.0.0.1:7860/parse'
```

Optional bridge smoke test with any PNG screenshot:

```powershell
node .\tools\omniparser-bridge\smoke-test-omniparser-bridge.mjs .\reports\some-screenshot.png
```

### Option B — UIED-style CLI fallback

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

If external parser is missing, unreachable, or returns no useful visual regions, this gate must fail.

## Full Audit

```powershell
powershell -ExecutionPolicy Bypass -File .\run-engine-pipeline-audit.ps1
```

Reports:

```txt
reports/translateit-external-engine-readiness.json
reports/translateit-engine-pipeline-readiness.json
reports/translateit-engine-preview.html
```

Important: `translateit-external-engine-readiness.json` checks configuration. The real Figma gate is `translateit-engine-pipeline-readiness.json`, because it validates actual parser output through `/render`.
