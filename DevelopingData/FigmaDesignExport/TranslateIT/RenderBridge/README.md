# TranslateIT Render Bridge

Local strict V5 render helper for the TranslateIT Figma plugin.

Current workflow:

```txt
Paste Website URL
-> strict V5 RenderBridge
-> V5 enhanced structured payload
-> strict V5 Figma renderer
-> editable source-inspired clone + locked screenshot reference
```

## Single Active Engine

Current active bridge engine:

```txt
start-alpha-v5.mjs
```

Current active plugin renderer:

```txt
../plugin/code.v5.strict.js
```

Older bridge and plugin entrypoints are disabled or redirected so current testing does not accidentally use a legacy path.

## Recommended setup

Run once:

```txt
Install-Session-Bridge.cmd
```

After setup, the Figma plugin can start the strict V5 bridge when import needs it.

## Daily usage

1. Open the TranslateIT Figma plugin.
2. Paste a website URL.
3. Click **Import Design Clone**.
4. Review the generated editable clone and locked screenshot reference.
5. Export data only after the strict V5 output is acceptable.

## Preflight before visual testing

Before user visual testing, run:

```powershell
.\start-alpha-v5-gated.ps1 https://www.mivubi.com/
```

The gate checks:

```txt
single active engine
strict V5 default plugin wiring
strict V5 media capture
structured model quality
strict V5 enhanced payload contract
```

Do not open Figma for visual testing if the gate fails.

## Health check

```txt
http://127.0.0.1:8844/health
```

Expected health:

```txt
publicVersion: Version 0.1 - Alpha
adapter: V5 enhanced structured adapter
```

## Manual start fallback

Use this only for debugging:

```txt
Start-Render-Bridge.cmd
```

This command routes through `npm start`, and `npm start` routes to `start-alpha-v5.mjs`.

## Stop manually

```txt
http://127.0.0.1:8844/shutdown
```

## Limitations

This creates editable source-inspired Figma approximations, not perfect screenshots. Canvas, WebGL, videos, iframes, advanced animation, login-only content, and complex responsive states may still need manual cleanup.
