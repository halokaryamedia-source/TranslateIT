# App Bridge

The active frontend-to-runtime bridge is intentionally small:

```text
runtimeApi.ts
-> thin Tauri command calls used by current product/setup callers

runtimeProductFacade.ts
-> product-level Meeting/Text readiness and actions
```

Do not recreate command-family subfolders, direct virtual-route APIs, Audio Studio bridges, realtime scoring/reducer layers, or duplicate runtime APIs unless a current approved product requirement proves a distinct responsibility is needed.
