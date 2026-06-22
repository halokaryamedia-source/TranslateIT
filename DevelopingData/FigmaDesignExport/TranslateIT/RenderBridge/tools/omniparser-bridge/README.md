# TranslateIT OmniParser Bridge

This folder contains the local bridge contract for connecting Microsoft OmniParser V2 to TranslateIT.

TranslateIT expects a local HTTP endpoint:

```txt
POST http://127.0.0.1:7860/parse
```

Request body:

```json
{
  "image_base64": "<png base64>",
  "url": "https://www.example.com",
  "title": "Example"
}
```

Response body must use TranslateIT's normalized visual region contract:

```json
{
  "engine": "omniparser-v2-bridge",
  "regions": [
    {
      "id": "region-1",
      "role": "button",
      "text": "Contact",
      "confidence": 0.92,
      "rect": { "x": 100, "y": 200, "w": 180, "h": 48 }
    }
  ]
}
```

## Why this bridge exists

OmniParser is a Python vision pipeline. TranslateIT RenderBridge is a Node service. The bridge keeps both systems separated:

```txt
TranslateIT RenderBridge -> OMNIPARSER_ENDPOINT -> Python OmniParser Bridge -> OmniParser V2
```

This prevents the Figma/plugin pipeline from pretending that visual parsing is ready when OmniParser is not actually running.

## Setup outline

Use the official Microsoft OmniParser repository as the external dependency:

```powershell
git clone https://github.com/microsoft/OmniParser.git D:\Tools\OmniParser
cd D:\Tools\OmniParser
conda create -n omni python==3.12
conda activate omni
pip install -r requirements.txt
```

Download OmniParser V2 weights into the OmniParser `weights` folder:

```powershell
huggingface-cli download microsoft/OmniParser-v2.0 icon_detect/train_args.yaml --local-dir weights
huggingface-cli download microsoft/OmniParser-v2.0 icon_detect/model.pt --local-dir weights
huggingface-cli download microsoft/OmniParser-v2.0 icon_detect/model.yaml --local-dir weights
huggingface-cli download microsoft/OmniParser-v2.0 icon_caption/config.json --local-dir weights
huggingface-cli download microsoft/OmniParser-v2.0 icon_caption/generation_config.json --local-dir weights
huggingface-cli download microsoft/OmniParser-v2.0 icon_caption/model.safetensors --local-dir weights
Rename-Item weights\icon_caption weights\icon_caption_florence -ErrorAction SilentlyContinue
```

Then start a Python bridge that implements `/parse` and returns the schema above.

After the bridge is running:

```powershell
$env:OMNIPARSER_ENDPOINT='http://127.0.0.1:7860/parse'
```

Run the TranslateIT audit:

```powershell
cd D:\Work\AI Stuff\TranslateIT-Rust\Developing\Version 0.1\DevelopingData\FigmaDesignExport\TranslateIT\RenderBridge
powershell -ExecutionPolicy Bypass -File .\run-engine-pipeline-audit.ps1
```

Expected honest behavior:

- If OmniParser bridge is not running or returns no useful regions: `figmaTestAllowed = false`.
- If OmniParser bridge returns useful visual regions and layout intent passes: `figmaTestAllowed = true`.

## Important

Do not set `TRANSLATEIT_VISUAL_ENGINE_READY=1` manually unless a real parser service is running and returning useful regions. That flag is only allowed for controlled integration environments.
