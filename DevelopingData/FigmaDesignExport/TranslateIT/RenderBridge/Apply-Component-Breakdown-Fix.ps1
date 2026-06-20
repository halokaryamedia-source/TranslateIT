$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $BridgeDir
$PluginDir = Join-Path $Root 'plugin'
$Bridge = Join-Path $BridgeDir 'server.mjs'
$Ui = Join-Path $PluginDir 'ui.html'
$Code = Join-Path $PluginDir 'code.js'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'

foreach ($f in @($Bridge, $Ui, $Code)) {
  if (!(Test-Path $f)) { throw "Missing file: $f" }
  Copy-Item $f "$f.backup_component_breakdown_$Stamp"
}

# 1) RenderBridge: return visible DOM element bounds as componentMap.
$s = Get-Content $Bridge -Raw
if ($s -notmatch 'componentMap') {
  $capture = @'
    const componentMap = await page.evaluate(() => {
      function isVisible(el, r, cs) {
        if (!r || r.width < 8 || r.height < 8) return false;
        if (r.bottom < 0 || r.right < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return false;
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        return true;
      }
      function textOf(el) {
        const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
        return text.slice(0, 100);
      }
      function color(value) { return String(value || '').trim(); }
      return Array.from(document.querySelectorAll('body *')).map((el, index) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        if (!isVisible(el, r, cs)) return null;
        const tag = el.tagName.toLowerCase();
        const text = textOf(el);
        const cls = String(el.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        const id = el.id ? '#' + el.id : '';
        const name = (text || tag + id + (cls ? '.' + cls : '') || 'component').slice(0, 80);
        const important = /^(header|nav|main|section|article|aside|footer|button|a|img|h1|h2|h3|h4|p|li|input|textarea)$/.test(tag) || r.width > 180 || r.height > 80 || text.length > 0;
        if (!important) return null;
        return {
          index,
          tag,
          name,
          text,
          x: Math.max(0, Math.round(r.left)),
          y: Math.max(0, Math.round(r.top)),
          w: Math.round(r.width),
          h: Math.round(r.height),
          bg: color(cs.backgroundColor),
          color: color(cs.color),
          border: color(cs.borderColor),
          radius: color(cs.borderRadius),
          fontSize: color(cs.fontSize),
          fontWeight: color(cs.fontWeight)
        };
      }).filter(Boolean).sort((a, b) => (b.w * b.h) - (a.w * a.h)).slice(0, 180);
    });
'@
  $s = $s.Replace('    const result = await captureRenderedHtml(page, targetUrl);', "$capture`n    const result = await captureRenderedHtml(page, targetUrl);")
  $s = $s.Replace('      screenshotHeight: viewport.height,', "      screenshotHeight: viewport.height,`n      componentMap,")
  Set-Content $Bridge $s -Encoding UTF8
}

# 2) UI: pass componentMap to plugin main runtime.
$u = Get-Content $Ui -Raw
if ($u -notmatch 'selectedComponents') {
  $u = $u.Replace('var selectedName = "TranslateIT Import";', 'var selectedName = "TranslateIT Import"; var selectedComponents = [];')
}
$u = [regex]::Replace($u, 'screenshotHeight:\s*selectedScreenshot \? selectedScreenshot\.height : 0', 'screenshotHeight: selectedScreenshot ? selectedScreenshot.height : 0, componentMap: selectedComponents', 1)
$u = [regex]::Replace($u, 'selectedScreenshot\s*=\s*data\.screenshotBase64 \? \{ base64: data\.screenshotBase64, width: data\.screenshotWidth, height: data\.screenshotHeight \} : null;', '$0 selectedComponents = data.componentMap || [];', 1)
Set-Content $Ui $u -Encoding UTF8

# 3) Plugin code: create editable component overlays on top of screenshot reference.
$c = Get-Content $Code -Raw
if ($c -notmatch 'makeComponentBreakdown') {
  $helper = @'
function safeComponentColor(value, fallback) {
  const out = cssColor(value, null);
  return out || fallback;
}
function makeComponentBreakdown(payload, width) {
  if (!payload || !payload.screenshotBase64 || !Array.isArray(payload.componentMap) || !payload.componentMap.length) return null;
  try {
    const bytes = base64ToBytes(payload.screenshotBase64);
    const image = figma.createImage(bytes);
    const sourceW = Number(payload.screenshotWidth) || 1440;
    const sourceH = Number(payload.screenshotHeight) || 1600;
    const imageW = Math.max(320, width - 160);
    const imageH = Math.max(240, Math.round(imageW * sourceH / sourceW));
    const scaleX = imageW / sourceW;
    const scaleY = imageH / sourceH;
    const section = makeFrame('01 Component Breakdown / Editable Overlay', Math.max(320, width - 96), imageH + 126, '#030407', 'section', 'component-breakdown');
    setCol(section, 18, 32);
    section.appendChild(makeText('01 Component Breakdown / Editable Overlay', 28, '#F5F7FA', true));
    section.appendChild(makeText('Each highlighted layer is generated from visible website elements. The screenshot is used as visual reference behind the editable boxes.', 13, '#8D96A6', false));
    const canvas = makeFrame('Component Map Canvas', imageW, imageH, '#FFFFFF', 'component-map-canvas', payload.name || 'website');
    canvas.layoutMode = 'NONE';
    canvas.paddingTop = 0; canvas.paddingRight = 0; canvas.paddingBottom = 0; canvas.paddingLeft = 0;
    const bg = figma.createRectangle();
    bg.name = 'Website Screenshot Background';
    bg.resize(imageW, imageH);
    bg.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
    bg.x = 0; bg.y = 0;
    canvas.appendChild(tag(bg, 'website-screenshot-background', payload.name || 'website'));
    payload.componentMap.slice(0, 120).forEach(function (item) {
      const x = Math.round((Number(item.x) || 0) * scaleX);
      const y = Math.round((Number(item.y) || 0) * scaleY);
      const w = Math.max(8, Math.round((Number(item.w) || 8) * scaleX));
      const h = Math.max(8, Math.round((Number(item.h) || 8) * scaleY));
      if (w < 8 || h < 8 || x > imageW || y > imageH) return;
      const layer = figma.createFrame();
      layer.name = (item.tag || 'component') + ' / ' + String(item.name || item.text || 'element').slice(0, 48);
      layer.resize(Math.min(w, imageW - x), Math.min(h, imageH - y));
      layer.x = x;
      layer.y = y;
      layer.fills = [{ type: 'SOLID', color: hexToRgb('#6382FF'), opacity: 0.08 }];
      layer.strokes = [{ type: 'SOLID', color: hexToRgb('#6382FF'), opacity: 0.85 }];
      layer.strokeWeight = 1;
      layer.cornerRadius = parsePx(item.radius, 4);
      tag(layer, 'editable-component-overlay', item.tag || 'element');
      setData(layer, 'data-component', item.name || item.tag || 'element');
      setData(layer, 'dom-tag', item.tag || '');
      setData(layer, 'dom-text', item.text || '');
      canvas.appendChild(layer);
      if (item.text && h > 18 && w > 60) {
        const t = makeText(String(item.text).slice(0, 80), Math.max(8, Math.min(14, parsePx(item.fontSize, 11))), safeComponentColor(item.color, '#F5F7FA'), /bold|600|700|800|900/i.test(String(item.fontWeight || '')));
        t.x = x + 4;
        t.y = y + 4;
        canvas.appendChild(t);
      }
    });
    section.appendChild(canvas);
    return section;
  } catch (err) {
    return null;
  }
}
'@
  $c = $c.Replace('async function importSingleHtml(payload, refresh) {', "$helper`nasync function importSingleHtml(payload, refresh) {")
}
if ($c -match 'const screenshotSection = makeScreenshotSection\(payload, width\);') {
  $c = $c.Replace('  if (screenshotSection) run.appendChild(screenshotSection);', "  if (screenshotSection) run.appendChild(screenshotSection);`n  const breakdownSection = makeComponentBreakdown(payload, width);`n  if (breakdownSection) run.appendChild(breakdownSection);")
}
Set-Content $Code $c -Encoding UTF8

# Restart local bridge if it is running.
Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'RenderBridge|server.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$BridgeDir'; node server.mjs`""

Write-Host '[DONE] Component Breakdown fix applied.' -ForegroundColor Green
Write-Host 'Reopen the Figma plugin and import the website again.' -ForegroundColor Green
