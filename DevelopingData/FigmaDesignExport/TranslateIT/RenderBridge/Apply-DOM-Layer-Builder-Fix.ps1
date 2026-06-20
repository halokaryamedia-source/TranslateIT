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
  Copy-Item $f "$f.backup_dom_layer_builder_$Stamp"
}

# Patch RenderBridge to return structured DOM nodes with computed layout, not screenshot slices.
$s = Get-Content $Server -Raw
if ($s -notmatch 'domLayerTree') {
  $domCapture = @'
    const domLayerTree = await page.evaluate(() => {
      const vw = window.innerWidth || 1440;
      const vh = window.innerHeight || 1600;
      const blocked = new Set(['script', 'style', 'meta', 'link', 'noscript', 'template']);
      const maxDepth = 8;
      const maxChildren = 80;
      function rectOf(el) {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      }
      function visible(el, box, cs) {
        if (!box || box.w < 2 || box.h < 2) return false;
        if (box.x > vw || box.y > vh || box.x + box.w < 0 || box.y + box.h < 0) return false;
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        return true;
      }
      function textDirect(el) {
        let out = '';
        el.childNodes.forEach(n => {
          if (n.nodeType === Node.TEXT_NODE) out += ' ' + n.textContent;
        });
        return out.replace(/\s+/g, ' ').trim();
      }
      function cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
      }
      function styleOf(cs) {
        return {
          display: cs.display,
          position: cs.position,
          flexDirection: cs.flexDirection,
          alignItems: cs.alignItems,
          justifyContent: cs.justifyContent,
          gap: cs.gap,
          paddingTop: cs.paddingTop,
          paddingRight: cs.paddingRight,
          paddingBottom: cs.paddingBottom,
          paddingLeft: cs.paddingLeft,
          marginTop: cs.marginTop,
          marginRight: cs.marginRight,
          marginBottom: cs.marginBottom,
          marginLeft: cs.marginLeft,
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderColor: cs.borderColor,
          borderWidth: cs.borderWidth,
          borderRadius: cs.borderRadius,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          textAlign: cs.textAlign,
          opacity: cs.opacity
        };
      }
      function roleOf(el, tag, cs, directText) {
        const cls = String(el.className || '').toLowerCase();
        const role = String(el.getAttribute('role') || '').toLowerCase();
        if (tag === 'img' || tag === 'picture') return 'image';
        if (tag === 'button' || role === 'button' || cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return 'button';
        if (tag === 'a' && directText) return 'link';
        if (/^h[1-6]$/.test(tag)) return 'heading';
        if (['p', 'span', 'strong', 'em', 'small', 'label'].includes(tag) && directText) return 'text';
        if (tag === 'nav') return 'nav';
        if (['section', 'article', 'main', 'header', 'footer', 'aside'].includes(tag)) return 'section';
        const hasBg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
        const hasBorder = parseFloat(cs.borderTopWidth || '0') > 0 || parseFloat(cs.borderRightWidth || '0') > 0 || parseFloat(cs.borderBottomWidth || '0') > 0 || parseFloat(cs.borderLeftWidth || '0') > 0;
        if (hasBg || hasBorder || parseFloat(cs.borderRadius || '0') > 0) return 'box';
        return 'group';
      }
      function nameOf(el, tag, role, directText) {
        const aria = cleanText(el.getAttribute('aria-label'));
        const alt = cleanText(el.getAttribute('alt'));
        const title = cleanText(el.getAttribute('title'));
        const text = cleanText(directText || aria || alt || title || el.innerText).slice(0, 80);
        const id = el.id ? '#' + el.id : '';
        const cls = String(el.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        return text || `${role || tag}${id}${cls ? '.' + cls : ''}`;
      }
      function mediaUrl(el) {
        if (el.tagName && el.tagName.toLowerCase() === 'img') return el.currentSrc || el.src || el.getAttribute('src') || '';
        const img = el.querySelector('img');
        if (img) return img.currentSrc || img.src || img.getAttribute('src') || '';
        return '';
      }
      function shouldFlatten(el, tag, role, directText, children) {
        if (role === 'text' || role === 'heading' || role === 'button' || role === 'link' || role === 'image') return false;
        if (!children.length && !directText) return true;
        if (tag === 'div' && !directText && children.length === 1 && role === 'group') return true;
        return false;
      }
      function build(el, depth) {
        if (!el || depth > maxDepth) return null;
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (!tag || blocked.has(tag)) return null;
        const cs = window.getComputedStyle(el);
        const box = rectOf(el);
        if (!visible(el, box, cs)) return null;
        const directText = textDirect(el);
        const role = roleOf(el, tag, cs, directText);
        const rawChildren = Array.from(el.children || []).slice(0, maxChildren).map(child => build(child, depth + 1)).filter(Boolean);
        if (shouldFlatten(el, tag, role, directText, rawChildren)) {
          return rawChildren.length === 1 ? rawChildren[0] : { tag, role: 'group', name: nameOf(el, tag, role, directText), rect: box, style: styleOf(cs), text: '', mediaUrl: '', children: rawChildren };
        }
        return { tag, role, name: nameOf(el, tag, role, directText), rect: box, style: styleOf(cs), text: directText, mediaUrl: mediaUrl(el), children: rawChildren };
      }
      return build(document.body, 0);
    });
'@
  $s = $s.Replace('    const result = await captureRenderedHtml(page, targetUrl);', "$domCapture`n    const result = await captureRenderedHtml(page, targetUrl);")
  if ($s -match 'componentMap:') {
    $s = [regex]::Replace($s, 'componentMap:\s*[^,\n]+,', 'componentMap: [],`n      domLayerTree,', 1)
  } else {
    $s = $s.Replace('      mode:', '      componentMap: [],`n      domLayerTree,`n      mode:')
  }
  Set-Content $Server $s -Encoding UTF8
}

# UI: pass domLayerTree to code.js.
$u = Get-Content $Ui -Raw
if ($u -notmatch 'selectedDomLayerTree') {
  $u = $u.Replace('var selectedName = "TranslateIT Import";', 'var selectedName = "TranslateIT Import"; var selectedDomLayerTree = null;')
}
if ($u -notmatch 'domLayerTree: selectedDomLayerTree') {
  $u = [regex]::Replace($u, 'componentMap:\s*selectedComponents', 'componentMap: selectedComponents, domLayerTree: selectedDomLayerTree', 1)
}
if ($u -notmatch 'selectedDomLayerTree = data.domLayerTree') {
  $u = [regex]::Replace($u, 'selectedComponents = data\.componentMap \|\| \[\];', 'selectedComponents = data.componentMap || []; selectedDomLayerTree = data.domLayerTree || null;', 1)
}
Set-Content $Ui $u -Encoding UTF8

# code.js: add a DOM tree renderer that creates real Figma frames/texts. Hide screenshot/final slice output if DOM tree exists.
$c = Get-Content $Code -Raw
if ($c -notmatch 'makeDomLayerOutput') {
  $helper = @'
function rgbaCssToPaint(value, fallbackHex) {
  const color = cssColor(value, null);
  return color ? paint(color) : (fallbackHex ? paint(fallbackHex) : []);
}
function domTextNode(textValue, style) {
  const size = parsePx(style && style.fontSize, 14);
  const weight = String((style && style.fontWeight) || '');
  return makeText(textValue || ' ', size, (style && style.color) || '#111827', /bold|600|700|800|900/i.test(weight));
}
function makeDomNode(item, rootRect, scale, depth) {
  if (!item || !item.rect) return null;
  const rect = item.rect;
  const style = item.style || {};
  const x = Math.round((Number(rect.x) - Number(rootRect.x || 0)) * scale);
  const y = Math.round((Number(rect.y) - Number(rootRect.y || 0)) * scale);
  const w = Math.max(2, Math.round(Number(rect.w || 2) * scale));
  const h = Math.max(2, Math.round(Number(rect.h || 2) * scale));
  if (w < 2 || h < 2) return null;
  if (['text', 'heading', 'link'].indexOf(item.role) >= 0 && item.text) {
    const t = domTextNode(item.text, style);
    t.name = String(item.role + ' / ' + (item.name || item.text)).slice(0, 96);
    t.x = x;
    t.y = y;
    try { t.resize(Math.max(1, w), Math.max(1, h)); } catch (err) {}
    return t;
  }
  const node = figma.createFrame();
  node.name = String((item.role || item.tag || 'node') + ' / ' + (item.name || item.tag || 'component')).slice(0, 96);
  node.resize(w, h);
  node.x = x;
  node.y = y;
  node.layoutMode = 'NONE';
  node.paddingTop = 0; node.paddingRight = 0; node.paddingBottom = 0; node.paddingLeft = 0;
  node.clipsContent = false;
  node.fills = rgbaCssToPaint(style.backgroundColor, item.role === 'button' ? '#FFFFFF' : null);
  const borderColor = cssColor(style.borderColor, null);
  const borderWidth = parsePx(style.borderWidth, 0);
  node.strokes = borderColor && borderWidth > 0 ? paint(borderColor) : [];
  node.strokeWeight = borderWidth > 0 ? borderWidth : 0;
  node.cornerRadius = parsePx(style.borderRadius, 0);
  tag(node, 'dom-layer-' + (item.role || item.tag || 'node'), item.tag || 'dom');
  setData(node, 'dom-tag', item.tag || '');
  setData(node, 'dom-role', item.role || '');
  setData(node, 'dom-text', item.text || '');
  if ((item.role === 'button' || item.role === 'link') && item.text) {
    const label = domTextNode(item.text, style);
    label.x = 8;
    label.y = Math.max(4, Math.round((h - label.height) / 2));
    node.appendChild(label);
  } else if (item.role === 'image') {
    node.fills = paint('#E5E7EB');
    const label = makeText('Image', 10, '#6B7280', false);
    label.x = 8; label.y = 8;
    node.appendChild(label);
  }
  (item.children || []).forEach(function (child) {
    const childNode = makeDomNode(child, item.rect, 1, depth + 1);
    if (childNode) node.appendChild(childNode);
  });
  return node;
}
function makeDomLayerOutput(payload, width) {
  if (!payload || !payload.domLayerTree || !payload.domLayerTree.rect) return null;
  try {
    const tree = payload.domLayerTree;
    const sourceW = Math.max(1, Number(tree.rect.w) || Number(payload.screenshotWidth) || 1440);
    const sourceH = Math.max(1, Number(tree.rect.h) || Number(payload.screenshotHeight) || 1600);
    const canvasW = Math.max(320, width - 160);
    const scale = canvasW / sourceW;
    const canvasH = Math.max(240, Math.round(sourceH * scale));
    const section = makeFrame('01 Website UI / DOM Layers', Math.max(320, width - 96), canvasH + 112, '#030407', 'section', 'dom-layer-output');
    setCol(section, 18, 32);
    section.appendChild(makeText('01 Website UI / DOM Layers', 28, '#F5F7FA', true));
    section.appendChild(makeText('Generated from rendered HTML/CSS structure. Text, buttons, sections, and groups are recreated as Figma layers.', 13, '#8D96A6', false));
    const canvas = makeFrame('Website DOM Canvas', canvasW, canvasH, '#FFFFFF', 'website-dom-canvas', payload.name || 'website');
    canvas.layoutMode = 'NONE';
    canvas.paddingTop = 0; canvas.paddingRight = 0; canvas.paddingBottom = 0; canvas.paddingLeft = 0;
    const root = makeDomNode(tree, tree.rect, scale, 0);
    if (root) { root.x = 0; root.y = 0; canvas.appendChild(root); }
    section.appendChild(canvas);
    return section;
  } catch (err) {
    return null;
  }
}
'@
  $c = $c.Replace('async function importSingleHtml(payload, refresh) {', "$helper`nasync function importSingleHtml(payload, refresh) {")
}
if ($c -notmatch 'domSection = makeDomLayerOutput') {
  $c = $c.Replace('  const finalSection = makeFinalWebsiteComponents(payload, width);`n  if (finalSection) run.appendChild(finalSection);', '  const domSection = makeDomLayerOutput(payload, width);`n  if (domSection) run.appendChild(domSection);`n  if (!domSection) {`n    const finalSection = makeFinalWebsiteComponents(payload, width);`n    if (finalSection) run.appendChild(finalSection);`n  }')
}
Set-Content $Code $c -Encoding UTF8

Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'RenderBridge|server.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$BridgeDir'; node server.mjs`""

Write-Host '[DONE] DOM Layer Builder patch applied.' -ForegroundColor Green
Write-Host 'Reopen Figma plugin and import again.' -ForegroundColor Green
