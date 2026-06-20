$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $BridgeDir
$PluginDir = Join-Path $Root 'plugin'
$ServerFile = Join-Path $BridgeDir 'server.mjs'
$CodeFile = Join-Path $PluginDir 'code.js'
$UiFile = Join-Path $PluginDir 'ui.html'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'

foreach ($file in @($ServerFile, $CodeFile, $UiFile)) {
  if (!(Test-Path $file)) { throw "Missing file: $file" }
  Copy-Item $file "$file.backup_hierarchy_v3_$Stamp"
}

@'
import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
let browserPromise = null;

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

async function render(target) {
  const targetUrl = normalizeUrl(target);
  if (!targetUrl) throw new Error('Missing url parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1 });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const result = await page.evaluate((sourceUrl) => {
      const vw = window.innerWidth || 1440;
      const vh = window.innerHeight || 1600;
      const blocked = new Set(['script', 'style', 'meta', 'link', 'noscript', 'template', 'br']);
      const maxDepth = 9;
      const maxNodes = 260;
      let count = 0;
      let imageId = 0;

      function cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
      }

      function rectOf(el) {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left),
          y: Math.round(r.top),
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      }

      function directText(el) {
        let out = '';
        Array.from(el.childNodes || []).forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) out += ' ' + node.textContent;
        });
        return cleanText(out);
      }

      function visible(el, rect, cs) {
        if (!rect || rect.w < 2 || rect.h < 2) return false;
        if (rect.x > vw || rect.y > vh || rect.x + rect.w < 0 || rect.y + rect.h < 0) return false;
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        return true;
      }

      function numberPx(value) {
        const n = parseFloat(String(value || '').replace('px', ''));
        return Number.isFinite(n) ? n : 0;
      }

      function hasVisibleBox(cs) {
        const bg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
        const border = numberPx(cs.borderTopWidth) > 0 || numberPx(cs.borderRightWidth) > 0 || numberPx(cs.borderBottomWidth) > 0 || numberPx(cs.borderLeftWidth) > 0;
        const radius = numberPx(cs.borderRadius) > 0;
        return bg || border || radius;
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
          backgroundColor: cs.backgroundColor,
          color: cs.color,
          borderColor: cs.borderTopColor || cs.borderColor,
          borderWidth: cs.borderTopWidth || cs.borderWidth,
          borderRadius: cs.borderRadius,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          textAlign: cs.textAlign,
          opacity: cs.opacity
        };
      }

      function roleOf(el, tag, cs, text) {
        const role = String(el.getAttribute('role') || '').toLowerCase();
        const cls = String(el.className || '').toLowerCase();
        if (tag === 'img' || tag === 'picture' || tag === 'svg') return 'image';
        if (tag === 'button' || role === 'button' || cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return 'button';
        if (tag === 'a' && text) return 'link';
        if (/^h[1-6]$/.test(tag)) return 'heading';
        if (['p', 'span', 'strong', 'em', 'small', 'label'].includes(tag) && text) return 'text';
        if (tag === 'nav') return 'nav';
        if (['header', 'footer', 'main', 'section', 'article', 'aside', 'li'].includes(tag)) return 'section';
        if (hasVisibleBox(cs)) return 'box';
        return 'group';
      }

      function nameOf(el, role, tag, text) {
        const aria = cleanText(el.getAttribute('aria-label'));
        const alt = cleanText(el.getAttribute('alt'));
        const title = cleanText(el.getAttribute('title'));
        const cls = cleanText(String(el.className || '').split(/\s+/).filter(Boolean).slice(0, 2).join('.'));
        return cleanText(text || aria || alt || title || el.id || cls || role || tag).slice(0, 96) || 'Layer';
      }

      function shouldKeep(role, tag, rect, text, children, cs) {
        if (role === 'image') return rect.w >= 12 && rect.h >= 12;
        if (role === 'button' || role === 'link' || role === 'heading' || role === 'text') return !!text && rect.w >= 4 && rect.h >= 4;
        if (role === 'nav') return children.length > 0;
        if (role === 'section') return children.length > 0 || hasVisibleBox(cs);
        if (role === 'box') return children.length > 0 || hasVisibleBox(cs);
        return children.length > 0;
      }

      function flattenIfUseless(node) {
        if (!node) return null;
        if (node.role === 'group' && !node.text && node.children.length === 1) return node.children[0];
        if (node.role === 'group' && !node.text && !node.children.length) return null;
        return node;
      }

      function build(el, depth) {
        if (!el || count > maxNodes || depth > maxDepth) return null;
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (!tag || blocked.has(tag)) return null;

        const cs = window.getComputedStyle(el);
        const rect = rectOf(el);
        if (!visible(el, rect, cs)) return null;

        const text = directText(el) || cleanText(el.getAttribute('aria-label')) || cleanText(el.getAttribute('alt')) || cleanText(el.getAttribute('placeholder'));
        const role = roleOf(el, tag, cs, text);
        const children = [];

        Array.from(el.children || []).forEach((child) => {
          const built = build(child, depth + 1);
          if (built) children.push(built);
        });

        if (!shouldKeep(role, tag, rect, text, children, cs)) return null;

        const node = {
          id: `node-${count++}`,
          tag,
          role,
          name: nameOf(el, role, tag, text),
          text,
          rect,
          style: styleOf(cs),
          children
        };

        if (role === 'image') {
          node.captureId = `ti-img-${imageId++}`;
          el.setAttribute('data-ti-capture-id', node.captureId);
          node.src = el.currentSrc || el.src || el.getAttribute('src') || '';
        }

        return flattenIfUseless(node);
      }

      const root = build(document.body, 0);
      return {
        title: document.title || new URL(sourceUrl).hostname,
        viewport: { width: vw, height: vh },
        tree: root,
        html: '<!doctype html>\n' + document.documentElement.outerHTML
      };
    }, targetUrl);

    async function attachImages(node) {
      if (!node) return;
      if (node.role === 'image' && node.captureId) {
        try {
          const handle = await page.$(`[data-ti-capture-id="${node.captureId}"]`);
          if (handle) {
            const buffer = await handle.screenshot({ type: 'png' });
            node.imageBase64 = buffer.toString('base64');
          }
        } catch (_) {}
      }
      for (const child of node.children || []) await attachImages(child);
    }

    await attachImages(result.tree);

    return {
      ok: true,
      url: targetUrl,
      title: result.title,
      viewport: result.viewport,
      tree: result.tree,
      html: result.html,
      mode: 'hierarchical-dom-v3',
      capturedAt: new Date().toISOString()
    };
  } finally {
    await page.close();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (requestUrl.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'translateit-render-bridge-v3' });
  if (requestUrl.pathname !== '/render') return sendJson(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });

  try {
    const data = await render(requestUrl.searchParams.get('url'));
    sendJson(res, 200, data);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error && error.message ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Render Bridge V3 running at http://127.0.0.1:${PORT}`);
});
'@ | Set-Content $ServerFile -Encoding UTF8

$ui = Get-Content $UiFile -Raw
$ui = $ui -replace "send\('import-rendered-layers',\{payload:data\}\);", "send('import-rendered-tree',{payload:data});"
$ui = $ui -replace "Bridge rendered '\+\(data\.layers\?data\.layers\.length:0\)\+' layers\. Importing to Figma\.\.\.", "Bridge rendered hierarchical DOM. Importing to Figma..."
Set-Content $UiFile $ui -Encoding UTF8

@'
figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const PAGE_NAME = 'TranslateIT Import / Workspace';
let lastRun = null;

function status(text, extra) {
  const msg = { type: 'status', text };
  extra = extra || {};
  Object.keys(extra).forEach((key) => msg[key] = extra[key]);
  figma.ui.postMessage(msg);
}

async function loadFonts() {
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch (_) { await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' }); }
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Bold' }); } catch (_) {}
}

function regularFont() { return { family: 'Inter', style: 'Regular' }; }
function boldFont() { return { family: 'Inter', style: 'Bold' }; }
function px(v, f) { const m = String(v || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : f; }
function comp(v) { return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0'); }
function rgbToHex(c) { return '#' + comp(c.r) + comp(c.g) + comp(c.b); }
function hexToRgb(hex) { const n = parseInt(/^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '000000', 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
function color(v, fallback) {
  const s = String(v || '').trim();
  if (!s || s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return fallback || null;
  const hex = s.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1]+hex[0][1]+hex[0][2]+hex[0][2]+hex[0][3]+hex[0][3] : hex[0];
  const rgba = s.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const p = rgba[1].split(',').map(x => parseFloat(x));
    if (p.length >= 3 && !(p.length >= 4 && p[3] === 0)) return '#' + p.slice(0, 3).map(n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
  }
  return fallback || null;
}
function paint(hex) { return hex ? [{ type: 'SOLID', color: hexToRgb(hex) }] : []; }
function safeName(s) { return String(s || 'Layer').slice(0, 96); }
function b64(base64) { const raw = atob(base64); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; }

async function page() {
  let p = figma.root.children.find((x) => x.name === PAGE_NAME);
  if (!p) p = figma.createPage();
  p.name = PAGE_NAME;
  await figma.setCurrentPageAsync(p);
  return p;
}

function makeText(node, scale) {
  const s = node.style || {};
  const t = figma.createText();
  const bold = /bold|600|700|800|900/i.test(String(s.fontWeight || ''));
  t.fontName = bold ? boldFont() : regularFont();
  t.characters = String(node.text || node.name || ' ');
  t.fontSize = Math.max(6, px(s.fontSize, 14) * scale);
  t.fills = paint(color(s.color, '#111827'));
  t.name = safeName((node.role || 'text') + ' / ' + (node.text || node.name));
  return t;
}

function makeFrame(node, scale) {
  const s = node.style || {};
  const f = figma.createFrame();
  f.name = safeName((node.role || node.tag || 'frame') + ' / ' + (node.name || node.tag || 'Layer'));
  f.resize(Math.max(2, Math.round((node.rect.w || 2) * scale)), Math.max(2, Math.round((node.rect.h || 2) * scale)));
  f.layoutMode = 'NONE';
  f.paddingTop = 0; f.paddingRight = 0; f.paddingBottom = 0; f.paddingLeft = 0;
  f.clipsContent = false;
  const fill = color(s.backgroundColor, null);
  f.fills = paint(fill);
  const stroke = color(s.borderColor, null);
  const weight = px(s.borderWidth, 0);
  f.strokes = stroke && weight > 0 ? paint(stroke) : [];
  f.strokeWeight = weight > 0 ? weight : 0;
  f.cornerRadius = Math.max(0, px(s.borderRadius, 0) * scale);
  return f;
}

function makeImage(node, scale) {
  const r = figma.createRectangle();
  r.name = safeName('image / ' + (node.name || 'Image'));
  r.resize(Math.max(2, Math.round((node.rect.w || 2) * scale)), Math.max(2, Math.round((node.rect.h || 2) * scale)));
  if (node.imageBase64) {
    const img = figma.createImage(b64(node.imageBase64));
    r.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else {
    r.fills = paint('#E5E7EB');
  }
  return r;
}

function isTextRole(role) { return role === 'text' || role === 'heading' || role === 'link'; }

function build(node, parentRect, scale) {
  if (!node || !node.rect) return null;
  const role = node.role || 'group';
  let out;
  if (role === 'image') out = makeImage(node, scale);
  else if (isTextRole(role)) out = makeText(node, scale);
  else out = makeFrame(node, scale);

  out.x = Math.round(((node.rect.x || 0) - (parentRect.x || 0)) * scale);
  out.y = Math.round(((node.rect.y || 0) - (parentRect.y || 0)) * scale);
  out.setSharedPluginData(NS, 'role', role);
  out.setSharedPluginData(NS, 'tag', node.tag || '');

  if ('children' in out && !isTextRole(role) && role !== 'image') {
    (node.children || []).forEach((child) => {
      const c = build(child, node.rect, scale);
      if (c) out.appendChild(c);
    });
    if ((role === 'button') && node.text) {
      const label = makeText({ role: 'text', text: node.text, style: node.style || {}, rect: { x: node.rect.x + 10, y: node.rect.y + 4, w: node.rect.w - 20, h: node.rect.h - 8 } }, scale);
      label.x = 10 * scale;
      label.y = Math.max(2, (out.height - label.height) / 2);
      out.appendChild(label);
    }
  }
  return out;
}

async function importTree(payload) {
  await loadFonts();
  const p = await page();
  const tree = payload.tree;
  if (!tree || !tree.rect) throw new Error('Render Bridge returned no DOM tree.');

  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, viewport.width || tree.rect.w || 1440);
  const runH = Math.max(900, Math.round((viewport.height || tree.rect.h || 1600) * scale) + 220);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const run = figma.createFrame();
  run.name = safeName((payload.title || 'Website Import') + ' / ' + stamp);
  run.resize(1440, runH);
  run.fills = paint('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 24;
  run.paddingTop = 40; run.paddingRight = 40; run.paddingBottom = 40; run.paddingLeft = 40;

  const title = figma.createText();
  title.fontName = boldFont();
  title.characters = payload.title || 'Website Import';
  title.fontSize = 30;
  title.fills = paint('#F7F9FD');
  run.appendChild(title);

  const note = figma.createText();
  note.fontName = regularFont();
  note.characters = 'Generated from hierarchical rendered HTML/CSS. Text, buttons, images, cards, and sections follow the website DOM structure.';
  note.fontSize = 12;
  note.fills = paint('#8D96A6');
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Hierarchical DOM Layers';
  canvas.resize(1280, Math.max(400, Math.round((viewport.height || tree.rect.h || 1600) * scale)));
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0; canvas.paddingRight = 0; canvas.paddingBottom = 0; canvas.paddingLeft = 0;
  canvas.fills = paint('#FFFFFF');

  const body = build(tree, { x: 0, y: 0 }, scale);
  if (body) { body.x = 0; body.y = 0; canvas.appendChild(body); }

  run.appendChild(canvas);
  p.appendChild(run);
  lastRun = run;

  status('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Hierarchical DOM Layers\nNext step: review in Figma, then Export Data.');
}

function exportPkg() {
  if (!lastRun) return status('No import run found. Import Data first.');
  status('Export complete.', { exportJson: JSON.stringify({ schema: 'translateit.ui-build-package.v3', generatedAt: new Date().toISOString(), figmaRun: lastRun.name }, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-rendered-tree' || msg.type === 'import-rendered-layers') await importTree(msg.payload || {});
    else if (msg.type === 'export-ui-package') exportPkg();
    else status('Unsupported command: ' + msg.type);
  } catch (err) {
    status('Plugin error: ' + (err && err.message ? err.message : err));
  }
};
'@ | Set-Content $CodeFile -Encoding UTF8

node --check $ServerFile
node --check $CodeFile

Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'RenderBridge|server.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$BridgeDir'; node server.mjs`""

Write-Host '[DONE] Hierarchical DOM Builder V3 applied.' -ForegroundColor Green
Write-Host 'Reopen Figma plugin and import the website again.' -ForegroundColor Green
