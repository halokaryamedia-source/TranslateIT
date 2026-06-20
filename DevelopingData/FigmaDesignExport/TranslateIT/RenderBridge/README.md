# TranslateIT Render Bridge

Local background helper for the TranslateIT Figma plugin.

It keeps the plugin workflow simple:

```txt
Paste Website Address → Import Data → Review in Figma → Export Data
```

## Recommended setup

Run once:

```txt
Install-Auto-Bridge.cmd
```

After this one-time setup, the bridge starts automatically when Windows logs in. The user can open the Figma plugin normally, paste a website address, and click **Import Data**.

## Manual start fallback

Use this only if automatic startup is not installed:

```txt
Start-Render-Bridge.cmd
```

Keep the terminal window open while using the Figma plugin.

## Why this exists

Figma plugins cannot reliably fetch and render every external website by themselves. Many modern sites depend on JavaScript, React, Vue, Next.js, lazy-loaded images, and computed styles.

The Render Bridge opens the website in a local Chromium browser through Playwright, waits for the page to render, captures the final DOM with computed styles, and sends that HTML back to the Figma plugin.

## Health check

Open this in a browser:

```txt
http://127.0.0.1:8844/health
```

Expected result:

```json
{ "ok": true }
```

## Figma usage

1. Open the TranslateIT Figma plugin.
2. Paste a website URL.
3. Click **Import Data**.
4. Review the generated Figma layers.
5. Click **Export Data**.

## Uninstall automatic bridge

Run:

```txt
Uninstall-Auto-Bridge.cmd
```

## Limitations

This creates editable Figma approximations, not perfect screenshots. Canvas, WebGL, videos, iframes, advanced animation, login-only content, and complex responsive states may still need manual cleanup.
