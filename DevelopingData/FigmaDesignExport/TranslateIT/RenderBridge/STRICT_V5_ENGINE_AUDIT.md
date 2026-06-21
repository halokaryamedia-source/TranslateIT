# TranslateIT Clean Engine Note

This branch no longer uses the previous strict renderer chain.

Active implementation:

```txt
engine: translateit-core
engineBuild: alpha-clean-1
server: RenderBridge/server.mjs
plugin renderer: plugin/code.js
plugin UI: plugin/ui.html
manifest: plugin/manifest.json
```

Use the clean plan instead:

```txt
../CLEAN_ENGINE_PLAN.md
```

Use the clean preflight command:

```powershell
.\test-translateit.ps1 https://www.mivubi.com/
```

`mivubi.com` is only a sample/regression target. It must not be hardcoded into the engine.
