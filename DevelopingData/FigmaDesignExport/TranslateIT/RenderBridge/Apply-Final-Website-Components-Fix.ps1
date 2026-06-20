$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $BridgeDir
$PluginDir = Join-Path $Root 'plugin'
$Server = Join-Path $BridgeDir 'server.mjs'
$Ui = Join-Path $PluginDir 'ui.html'
$Code = Join-Path $PluginDir 'code.js'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'

foreach ($f in @($Server, $Ui, $Code)) {
  if (!(Test-Path $f)) { throw "Missing file: $f" }
  Copy-Item $f "$f.backup_final_components_$Stamp"
}

# RenderBridge: capture finished component slices, not raw blue overlays.
$s = Get-Content $Server -Raw
if ($s -notmatch 'componentSlices') {
  $insert = @'
    const componentSlices = [];
    try {
      const candidates = await page.evaluate(() => {
        const vw = window.innerWidth || 1440;
        const vh = window.innerHeight || 1600;
        const blocked = new Set(['html', 'body', 'script', 'style', 'meta', 'link', 'noscript']);
        function area(r) { return Math.max(0, r.width) * Math.max(0, r.height); }
        function visible(el, r, cs) {
          if (!r || r.width < 16 || r.height < 12) return false;
          if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) return false;
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
          if (area(r) > vw * vh * 0.88) return false;
          return true;
        }
        function textOf(el) {
          return String(el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 90);
        }
        function iou(a, b) {
          const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
          const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
          const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
          const uni = a.w * a.h + b.w * b.h - inter;
          return uni > 0 ? inter / uni : 0;
        }
        const raw = [];
        Array.from(document.querySelectorAll('body *')).forEach((el, index) => {
          const tag = el.tagName.toLowerCase();
          if (blocked.has(tag)) return;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          if (!visible(el, r, cs)) return;
          const text = textOf(el);
          const bgImage = cs.backgroundImage && cs.backgroundImage !== 'none';
          const semantic = /^(header|nav|main|section|article|aside|footer|button|a|img|picture|h1|h2|h3|h4|p|li|figure)$/.test(tag);
          const usefulBlock = r.width >= 90 && r.height >= 45 && (text.length > 0 || bgImage || el.querySelector('img,picture,svg,button,a,h1,h2,h3,p'));
          if (!semantic && !usefulBlock) return;
          const id = 'ti-slice-' + index;
          el.setAttribute('data-ti-slice-id', id);
          raw.push({
            id,
            tag,
            name: (text || tag).slice(0, 80),
            text,
            x: Math.max(0, Math.round(r.left)),
            y: Math.max(0, Math.round(r.top)),
            w: Math.min(Math.round(r.width), vw),
            h: Math.min(Math.round(r.height), vh),
            area: Math.round(area(r)),
            score: Math.round(area(r)) + (semantic ? 20000 : 0) + (text ? 10000 : 0) + (bgImage ? 15000 : 0)
          });
        });
        const selected = [];
        raw.sort((a, b) => b.score - a.score).forEach(item => {
          if (selected.length >= 55) return;
          const tooSimilar = selected.some(other => iou(item, other) > 0.72);
          if (!tooSimilar) selected.push(item);
        });
        return selected.sort((a, b) => (a.y - b.y) || (a.x - b.x));
      });
      for (const item of candidates) {
        const handle = await page.$(`[data-ti-slice-id="${item.id}"]`);
        if (!handle) continue;
        try {
          const buffer = await handle.screenshot({ type: 'png' });
          componentSlices.push({ ...item, imageBase64: buffer.toString('base64') });
        } catch (_) {}
      }
    } catch (sliceError) {
      console.warn('Component slice capture failed:', sliceError && sliceError.message ? sliceError.message : sliceError);
    }
'@
  $s = $s.Replace('    const result = await captureRenderedHtml(page, targetUrl);', "$insert`n    const result = await captureRenderedHtml(page, targetUrl);")
  if ($s -match 'componentMap,') {
    $s = $s.Replace('      componentMap,', '      componentMap: componentSlices.length ? componentSlices : componentMap,')
  } else {
    $s = $s.Replace('      mode:', '      componentMap: componentSlices,`n      mode:')
  }
  Set-Content $Server $s -Encoding UTF8
}

# UI: pass component map into payload.
$u = Get-Content $Ui -Raw
if ($u -notmatch 'selectedComponents') {
  $u = $u.Replace('var selectedName = "TranslateIT Import";', 'var selectedName = "TranslateIT Import"; var selectedComponents = [];')
}
if ($u -notmatch 'componentMap: selectedComponents') {
  $u = [regex]::Replace($u, 'screenshotHeight:\s*selectedScreenshot \? selectedScreenshot\.height : 0', 'screenshotHeight: selectedScreenshot ? selectedScreenshot.height : 0, componentMap: selectedComponents', 1)
}
if ($u -notmatch 'selectedComponents = data.componentMap') {
  $u = [regex]::Replace($u, 'selectedScreenshot\s*=\s*data\.screenshotBase64 \? \{ base64: data\.screenshotBase64, width: data\.screenshotWidth, height: data\.screenshotHeight \} : null;', '$0 selectedComponents = data.componentMap || [];', 1)
}
Set-Content $Ui $u -Encoding UTF8

# Plugin code: create final component slice output and hide raw/reference sections.
$c = Get-Content $Code -Raw
if ($c -notmatch 'makeFinalWebsiteComponents') {
  $helper = @'
function makeFinalWebsiteComponents(payload, width) {
  if (!payload || !Array.isArray(payload.componentMap) || !payload.componentMap.length) return null;
  try {
    const sourceW = Number(payload.screenshotWidth) || 1440;
    const sourceH = Number(payload.screenshotHeight) || 1600;
    const canvasW = Math.max(320, width - 160);
    const canvasH = Math.max(240, Math.round(canvasW * sourceH / sourceW));
    const scaleX = canvasW / sourceW;
    const scaleY = canvasH / sourceH;
    const section = makeFrame('01 Website Components / Final Output', Math.max(320, width - 96), canvasH + 112, '#030407', 'section', 'final-website-components');
    setCol(section, 18, 32);
    section.appendChild(makeText('01 Website Components / Final Output', 28, '#F5F7FA', true));
    section.appendChild(makeText('Generated as separated visual components from the rendered website. No full-page reference screenshot is shown.', 13, '#8D96A6', false));
    const canvas = makeFrame('Website Component Canvas', canvasW, canvasH, '#FFFFFF', 'website-component-canvas', payload.name || 'website');
    canvas.layoutMode = 'NONE';
    canvas.paddingTop = 0; canvas.paddingRight = 0; canvas.paddingBottom = 0; canvas.paddingLeft = 0;
    payload.componentMap.slice(0, 55).forEach(function (item) {
      if (!item || !item.imageBase64) return;
      const x = Math.round((Number(item.x) || 0) * scaleX);
      const y = Math.round((Number(item.y) || 0) * scaleY);
      const w = Math.max(8, Math.round((Number(item.w) || 8) * scaleX));
      const h = Math.max(8, Math.round((Number(item.h) || 8) * scaleY));
      if (x >= canvasW || y >= canvasH) return;
      const bytes = base64ToBytes(item.imageBase64);
      const image = figma.createImage(bytes);
      const rect = figma.createRectangle();
      rect.name = String((item.tag || 'component') + ' / ' + (item.name || item.text || 'visual')).slice(0, 96);
      rect.resize(Math.min(w, canvasW - x), Math.min(h, canvasH - y));
      rect.x = x;
      rect.y = y;
      rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
      tag(rect, 'website-component-slice', item.tag || 'component');
      setData(rect, 'data-component', item.name || item.tag || 'component');
      setData(rect, 'dom-tag', item.tag || '');
      setData(rect, 'dom-text', item.text || '');
      canvas.appendChild(rect);
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
  $c = [regex]::Replace($c, "\n\s*const screenshotSection = makeScreenshotSection\(payload, width\);\s*\n\s*if \(screenshotSection\) run\.appendChild\(screenshotSection\);(?:\s*\n\s*const breakdownSection = makeComponentBreakdown\(payload, width\);\s*\n\s*if \(breakdownSection\) run\.appendChild\(breakdownSection\);)?", "`n  const finalSection = makeFinalWebsiteComponents(payload, width);`n  if (finalSection) run.appendChild(finalSection);", 1)
}
if ($c -notmatch 'uiSection.visible = false') {
  $c = $c.Replace('  run.appendChild(uiSection);', '  uiSection.visible = false;`n  uiSection.name = "99 Raw DOM Approximation / Hidden";`n  run.appendChild(uiSection);')
}
if ($c -notmatch 'report.visible = false') {
  $c = $c.Replace('  run.appendChild(report);', '  report.visible = false;`n  run.appendChild(report);')
}
Set-Content $Code $c -Encoding UTF8

Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'RenderBridge|server.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$BridgeDir'; node server.mjs`""

Write-Host '[DONE] Final Website Components output applied.' -ForegroundColor Green
Write-Host 'Reopen the Figma plugin and import the website again.' -ForegroundColor Green
