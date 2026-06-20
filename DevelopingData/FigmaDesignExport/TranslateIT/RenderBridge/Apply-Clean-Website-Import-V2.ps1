$ErrorActionPreference = 'Stop'

$BridgeDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $BridgeDir
$PluginDir = Join-Path $Root 'plugin'
$ServerFile = Join-Path $BridgeDir 'server.mjs'
$UiFile = Join-Path $PluginDir 'ui.html'
$CodeFile = Join-Path $PluginDir 'code.js'
$Stamp = Get-Date -Format 'yyyyMMdd_HHmmss'

foreach ($file in @($ServerFile, $UiFile, $CodeFile)) {
  if (Test-Path $file) { Copy-Item $file "$file.backup_clean_v2_$Stamp" }
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

async function render(urlValue) {
  const targetUrl = normalizeUrl(urlValue);
  if (!targetUrl) throw new Error('Missing url parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1 });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const base = await page.evaluate((sourceUrl) => {
      const vw = window.innerWidth || 1440;
      const vh = window.innerHeight || 1600;
      const layers = [];
      let uid = 0;

      function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
      function num(value, fallback) {
        const n = parseFloat(String(value || '').replace('px', ''));
        return Number.isFinite(n) ? n : fallback;
      }
      function rectOfRange(range) {
        const r = range.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      }
      function rectOfElement(el) {
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      }
      function visibleRect(r) {
        if (!r || r.w < 2 || r.h < 2) return false;
        if (r.x > vw || r.y > vh || r.x + r.w < 0 || r.y + r.h < 0) return false;
        return true;
      }
      function isVisible(el, r, cs) {
        if (!visibleRect(r)) return false;
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        return true;
      }
      function css(el) {
        const cs = window.getComputedStyle(el);
        return {
          display: cs.display,
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
      function hasVisualBox(cs) {
        const bg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
        const bw = num(cs.borderWidth, 0);
        const br = num(cs.borderRadius, 0);
        return bg || bw > 0 || br > 0;
      }
      function addTextNodes() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const text = clean(node.textContent);
            if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let node;
        while ((node = walker.nextNode())) {
          const parent = node.parentElement;
          const cs = window.getComputedStyle(parent);
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = Array.from(range.getClientRects()).slice(0, 5);
          rects.forEach((rawRect) => {
            const r = { x: Math.round(rawRect.left), y: Math.round(rawRect.top), w: Math.round(rawRect.width), h: Math.round(rawRect.height) };
            if (!isVisible(parent, r, cs)) return;
            layers.push({
              kind: 'text',
              name: clean(node.textContent).slice(0, 80),
              text: clean(node.textContent),
              rect: r,
              style: css(parent)
            });
          });
        }
      }
      function markImageAndMedia() {
        Array.from(document.querySelectorAll('img,picture,svg')).forEach((el) => {
          const cs = window.getComputedStyle(el);
          const r = rectOfElement(el);
          if (!isVisible(el, r, cs)) return;
          if (r.w < 16 || r.h < 16) return;
          const id = `ti-img-${uid++}`;
          el.setAttribute('data-ti-capture-id', id);
          layers.push({
            kind: 'image',
            captureId: id,
            name: clean(el.getAttribute('alt') || el.getAttribute('aria-label') || 'Image'),
            rect: r,
            style: css(el)
          });
        });
      }
      function addControlsAndBoxes() {
        Array.from(document.querySelectorAll('button,a,[role="button"],input,textarea,select')).forEach((el) => {
          const tag = el.tagName.toLowerCase();
          const csRaw = window.getComputedStyle(el);
          const r = rectOfElement(el);
          if (!isVisible(el, r, csRaw)) return;
          if (r.w < 14 || r.h < 10) return;
          const text = clean(el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title'));
          layers.push({
            kind: 'control',
            name: text || tag,
            text,
            rect: r,
            style: css(el)
          });
        });
        Array.from(document.querySelectorAll('section,article,header,footer,nav,main,aside,div,li')).forEach((el) => {
          const csRaw = window.getComputedStyle(el);
          const r = rectOfElement(el);
          if (!isVisible(el, r, csRaw)) return;
          if (!hasVisualBox(csRaw)) return;
          if (r.w * r.h > vw * vh * 0.35) return;
          if (r.w < 24 || r.h < 18) return;
          layers.push({
            kind: 'box',
            name: clean(el.getAttribute('aria-label') || el.className || el.id || el.tagName).slice(0, 60) || 'Box',
            text: '',
            rect: r,
            style: css(el)
          });
        });
      }

      addControlsAndBoxes();
      markImageAndMedia();
      addTextNodes();

      layers.sort((a, b) => {
        const order = { box: 0, image: 1, control: 2, text: 3 };
        return (order[a.kind] - order[b.kind]) || (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x);
      });

      return { title: document.title || new URL(sourceUrl).hostname, viewport: { width: vw, height: vh }, layers };
    }, targetUrl);

    const finalLayers = [];
    for (const layer of base.layers.slice(0, 260)) {
      if (layer.kind === 'image' && layer.captureId) {
        try {
          const handle = await page.$(`[data-ti-capture-id="${layer.captureId}"]`);
          if (handle) {
            const buffer = await handle.screenshot({ type: 'png' });
            layer.imageBase64 = buffer.toString('base64');
          }
        } catch (_) {}
      }
      finalLayers.push(layer);
    }

    return {
      ok: true,
      url: targetUrl,
      title: base.title,
      viewport: base.viewport,
      layers: finalLayers,
      html: '<!doctype html>\n' + await page.content(),
      capturedAt: new Date().toISOString(),
      mode: 'dom-layers-v2'
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
  if (requestUrl.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'translateit-render-bridge-v2' });
  if (requestUrl.pathname !== '/render') return sendJson(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });

  try {
    const result = await render(requestUrl.searchParams.get('url'));
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error && error.message ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Render Bridge V2 running at http://127.0.0.1:${PORT}`);
});
'@ | Set-Content $ServerFile -Encoding UTF8

@'
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    *{box-sizing:border-box}:root{--bg:#070a11;--panel:#101622;--soft:#111827;--line:#263244;--line2:#3b4860;--text:#f7f9fd;--muted:#a0abc0;--muted2:#6f7b90;--blue:#6382ff;--blueSoft:rgba(99,130,255,.14)}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--text);font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}body{padding:18px;background:radial-gradient(circle at 0% 0%,rgba(99,130,255,.18),transparent 34%),linear-gradient(180deg,#0b101a 0%,#070a11 100%)}.app{display:flex;flex-direction:column;gap:14px;max-width:560px;margin:0 auto}.topbar{display:flex;align-items:center;gap:12px;padding:2px 2px 8px}.mark{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(180deg,rgba(99,130,255,.22),rgba(99,130,255,.08));border:1px solid rgba(99,130,255,.28);color:#dbe3ff;font-weight:900}.eyebrow{color:var(--muted2);font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}h1{margin:0;font-size:20px;line-height:1.15}.sub{margin:0;color:var(--muted);font-size:12px;line-height:1.55}.card{border:1px solid var(--line);border-radius:20px;background:rgba(16,22,34,.92);box-shadow:0 18px 48px rgba(0,0,0,.25);overflow:hidden}.card-header{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 0}.card-title{margin:0;font-size:14px;font-weight:900}.badge{min-width:30px;height:30px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;color:#dce4ff;background:var(--blueSoft);border:1px solid rgba(99,130,255,.24);font-size:12px;font-weight:900}.card-body{padding:16px}input[type=file]{display:none}.source-input{width:100%;height:46px;border:1px solid var(--line);border-radius:15px;background:#0b1019;color:var(--text);padding:0 14px;outline:none;font:600 12px Inter,"Segoe UI",Roboto,Arial,sans-serif}.source-input:focus{border-color:var(--blue)}.divider{display:flex;align-items:center;gap:12px;margin:14px 0;color:var(--muted2);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.divider:before,.divider:after{content:"";height:1px;background:var(--line);flex:1}.dropzone{display:flex;align-items:center;gap:14px;min-height:96px;padding:16px;border:1px dashed var(--line2);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));cursor:pointer}.file-icon{flex:0 0 auto;width:50px;height:50px;border-radius:16px;display:grid;place-items:center;color:#dbe3ff;background:linear-gradient(180deg,rgba(99,130,255,.24),rgba(99,130,255,.10));border:1px solid rgba(99,130,255,.26);font-size:11px;font-weight:900}.file-title{color:var(--text);font-size:15px;font-weight:900;margin-bottom:6px}.file-desc{color:var(--muted);font-size:11.5px;line-height:1.5}button{width:100%;height:48px;border:1px solid var(--line);border-radius:15px;color:var(--text);background:var(--soft);font-size:14px;font-weight:900;cursor:pointer;margin-top:14px}.primary{border-color:rgba(99,130,255,.85);background:linear-gradient(180deg,#3149a5,#20306f);box-shadow:0 12px 30px rgba(99,130,255,.18)}button:disabled{opacity:.5;cursor:not-allowed}.helper{margin-top:10px;color:var(--muted2);font-size:11px;line-height:1.45}.status{border:1px solid var(--line);border-radius:18px;background:rgba(3,4,7,.68);padding:14px;min-height:112px;max-height:168px;overflow:auto;color:var(--muted);font-size:11.5px;line-height:1.55;white-space:pre-wrap}.status-title{display:flex;align-items:center;gap:8px;color:var(--text);font-size:13px;font-weight:900;margin-bottom:8px}.dot{width:8px;height:8px;border-radius:99px;background:var(--blue);box-shadow:0 0 0 4px rgba(99,130,255,.12)}.footer{color:var(--muted2);font-size:10px;line-height:1.45;text-align:center;padding:0 10px 4px}
  </style>
</head>
<body>
  <div class="app">
    <div class="topbar"><div class="mark">T</div><div><div class="eyebrow">TranslateIT Figma Plugin</div><h1>Design Export</h1></div></div>
    <p class="sub">Paste a website address, import it into Figma, then export the result as a UI Build Package JSON.</p>
    <section class="card"><div class="card-header"><h2 class="card-title">Import Data</h2><span class="badge">1</span></div><div class="card-body"><input id="sourceUrl" class="source-input" placeholder="Paste website address, e.g. https://example.com" /><div class="divider">or import file</div><input id="fileInput" type="file" accept=".html,.htm,.txt" /><label class="dropzone" for="fileInput"><div class="file-icon">HTML</div><div><div id="fileTitle" class="file-title">Select HTML file</div><div id="fileDesc" class="file-desc">Optional fallback if the website cannot be rendered directly.</div></div></label><button id="importData" class="primary">Import Data</button><div class="helper">Local Render Bridge must be running at http://127.0.0.1:8844.</div></div></section>
    <section class="card"><div class="card-header"><h2 class="card-title">Export Data</h2><span class="badge">2</span></div><div class="card-body"><button id="exportData">Export Data</button><div class="helper">Downloads the latest Figma result as a JSON package.</div></div></section>
    <div class="status"><div class="status-title"><span class="dot"></span><span>Status</span></div><div id="statusText">Ready. Paste a website address or select an HTML file.</div></div>
    <div class="footer">Flow: Website Address → Import Data → Review in Figma → Export Data</div>
  </div>
  <script>
    var payload = null;
    function el(id){return document.getElementById(id)}
    function setStatus(t){el('statusText').textContent=t}
    function send(type,data){var m={type:type};data=data||{};Object.keys(data).forEach(function(k){m[k]=data[k]});parent.postMessage({pluginMessage:m},'*')}
    function normalizeUrl(v){var u=String(v||'').trim(); if(!u)return ''; if(!/^https?:\/\//i.test(u))u='https://'+u; return u}
    function cleanName(n){return String(n||'TranslateIT Import').replace(/[^a-zA-Z0-9-_ ]+/g,'').trim()||'TranslateIT Import'}
    function downloadText(filename,text){var b=new Blob([text],{type:'application/json;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(u)},1000)}
    el('fileInput').onchange=function(){var f=el('fileInput').files[0]; if(!f)return; var r=new FileReader(); r.onload=function(){payload={title:cleanName(f.name),url:'file',layers:[],html:String(r.result||'')}; el('fileTitle').textContent=f.name; el('fileDesc').textContent=payload.html.length+' characters loaded.'; setStatus('File selected. Click Import Data.');}; r.readAsText(f)};
    el('importData').onclick=function(){var url=normalizeUrl(el('sourceUrl').value); el('importData').disabled=true; if(url){setStatus('Rendering website through local bridge...\n'+url); fetch('http://127.0.0.1:8844/render?url='+encodeURIComponent(url)).then(function(r){if(!r.ok)throw new Error('Bridge HTTP '+r.status);return r.json()}).then(function(data){payload=data; setStatus('Bridge rendered '+(data.layers?data.layers.length:0)+' layers. Importing to Figma...'); send('import-rendered-layers',{payload:data});}).catch(function(e){setStatus('Render Bridge failed. Start the bridge, then try again.\n\n'+(e&&e.message?e.message:e)); el('importData').disabled=false;}); return;} if(payload&&payload.html){send('import-html-fallback',{payload:payload});return;} setStatus('Paste a website address or select an HTML file first.'); el('importData').disabled=false;};
    el('exportData').onclick=function(){send('export-ui-package')};
    window.onmessage=function(event){var msg=event.data.pluginMessage;if(!msg)return;if(msg.type==='status'){setStatus(msg.text||''); if(String(msg.text||'').indexOf('Import complete')>=0||String(msg.text||'').indexOf('error')>=0)el('importData').disabled=false;} if(msg.exportJson){downloadText('ui-build-package-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',msg.exportJson)}};
  </script>
</body>
</html>
'@ | Set-Content $UiFile -Encoding UTF8

@'
figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const PAGE_NAME = 'TranslateIT Import / Workspace';
let lastRun = null;

function postStatus(text, extra) {
  const msg = { type: 'status', text: text };
  extra = extra || {};
  Object.keys(extra).forEach(function (k) { msg[k] = extra[k]; });
  figma.ui.postMessage(msg);
}

async function loadFonts() {
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); } catch (_) { await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' }); }
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Bold' }); } catch (_) {}
}

function fontRegular() { return { family: 'Inter', style: 'Regular' }; }
function fontBold() { return { family: 'Inter', style: 'Bold' }; }

function componentToHex(v) { return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0'); }
function rgbToHex(c) { return '#' + componentToHex(c.r) + componentToHex(c.g) + componentToHex(c.b); }
function hexToRgb(hex) {
  const fallback = { r: 0, g: 0, b: 0 };
  if (!/^#[0-9a-fA-F]{6}$/.test(hex || '')) return fallback;
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function cssColor(value, fallback) {
  const v = String(value || '').trim();
  if (!v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return fallback || null;
  const hex = v.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1]+hex[0][1]+hex[0][2]+hex[0][2]+hex[0][3]+hex[0][3] : hex[0];
  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const p = rgba[1].split(',').map(function (x) { return parseFloat(x); });
    if (p.length >= 3 && !(p.length >= 4 && p[3] === 0)) return '#' + p.slice(0, 3).map(function (n) { return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0'); }).join('');
  }
  return fallback || null;
}
function paint(hex) { return [{ type: 'SOLID', color: hexToRgb(hex) }]; }
function parsePx(v, fallback) { const m = String(v || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
function safeName(v) { return String(v || 'Layer').slice(0, 96); }
function b64ToBytes(base64) { const raw = atob(base64); const bytes = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); return bytes; }

async function workspace() {
  let page = figma.root.children.find(function (p) { return p.name === PAGE_NAME; });
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function makeTextLayer(layer, scale) {
  const style = layer.style || {};
  const node = figma.createText();
  const bold = /bold|600|700|800|900/i.test(String(style.fontWeight || ''));
  node.fontName = bold ? fontBold() : fontRegular();
  node.characters = String(layer.text || layer.name || ' ');
  node.fontSize = Math.max(6, parsePx(style.fontSize, 14) * scale);
  node.fills = paint(cssColor(style.color, '#111827') || '#111827');
  node.name = safeName('text / ' + (layer.text || layer.name));
  return node;
}

function makeImageLayer(layer, scale) {
  const rect = figma.createRectangle();
  rect.name = safeName('image / ' + (layer.name || 'Image'));
  const w = Math.max(2, Math.round(layer.rect.w * scale));
  const h = Math.max(2, Math.round(layer.rect.h * scale));
  rect.resize(w, h);
  if (layer.imageBase64) {
    const img = figma.createImage(b64ToBytes(layer.imageBase64));
    rect.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else {
    rect.fills = paint('#E5E7EB');
  }
  return rect;
}

function makeBoxLayer(layer, scale) {
  const style = layer.style || {};
  const box = figma.createFrame();
  box.name = safeName((layer.kind || 'box') + ' / ' + (layer.name || 'Box'));
  box.resize(Math.max(2, Math.round(layer.rect.w * scale)), Math.max(2, Math.round(layer.rect.h * scale)));
  box.layoutMode = 'NONE';
  box.paddingTop = 0; box.paddingRight = 0; box.paddingBottom = 0; box.paddingLeft = 0;
  const fill = cssColor(style.backgroundColor, null);
  box.fills = fill ? paint(fill) : [];
  const stroke = cssColor(style.borderColor, null);
  const weight = parsePx(style.borderWidth, 0);
  box.strokes = stroke && weight > 0 ? paint(stroke) : [];
  box.strokeWeight = weight > 0 ? weight : 0;
  box.cornerRadius = parsePx(style.borderRadius, 0) * scale;
  return box;
}

function layerToNode(layer, rootX, rootY, scale) {
  let node;
  if (layer.kind === 'text') node = makeTextLayer(layer, scale);
  else if (layer.kind === 'image') node = makeImageLayer(layer, scale);
  else node = makeBoxLayer(layer, scale);
  node.x = Math.round((layer.rect.x - rootX) * scale);
  node.y = Math.round((layer.rect.y - rootY) * scale);
  node.setSharedPluginData(NS, 'kind', layer.kind || 'layer');
  node.setSharedPluginData(NS, 'source', JSON.stringify({ text: layer.text || '', name: layer.name || '' }).slice(0, 3000));
  return node;
}

async function importRenderedLayers(payload) {
  await loadFonts();
  const page = await workspace();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = payload.title || 'Website Import';
  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, viewport.width || 1440);
  const layers = Array.isArray(payload.layers) ? payload.layers : [];

  const run = figma.createFrame();
  run.name = safeName(title + ' / ' + stamp);
  run.resize(1440, Math.max(900, Math.round((viewport.height || 1600) * scale) + 220));
  run.x = 0; run.y = 0;
  run.fills = paint('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 24;
  run.paddingTop = 40; run.paddingRight = 40; run.paddingBottom = 40; run.paddingLeft = 40;

  const heading = figma.createText();
  heading.fontName = fontBold();
  heading.characters = title;
  heading.fontSize = 30;
  heading.fills = paint('#F7F9FD');
  heading.name = 'Import Title';
  run.appendChild(heading);

  const note = figma.createText();
  note.fontName = fontRegular();
  note.characters = 'Generated from rendered HTML/CSS as separate Figma layers. Images are imported as image layers; text is editable.';
  note.fontSize = 12;
  note.fills = paint('#8D96A6');
  note.name = 'Import Note';
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Rebuilt DOM Layers';
  canvas.resize(1280, Math.max(400, Math.round((viewport.height || 1600) * scale)));
  canvas.fills = paint('#FFFFFF');
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0; canvas.paddingRight = 0; canvas.paddingBottom = 0; canvas.paddingLeft = 0;

  layers.forEach(function (layer) {
    if (!layer || !layer.rect) return;
    const node = layerToNode(layer, 0, 0, scale);
    canvas.appendChild(node);
  });

  run.appendChild(canvas);
  page.appendChild(run);
  lastRun = run;
  postStatus('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nLayers generated: ' + layers.length + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) { postStatus('No import run found. Import Data first.'); return; }
  const pkg = { schema: 'translateit.ui-build-package.v2', generatedAt: new Date().toISOString(), figmaRun: lastRun.name };
  postStatus('Export complete.', { exportJson: JSON.stringify(pkg, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-rendered-layers') await importRenderedLayers(msg.payload || {});
    else if (msg.type === 'export-ui-package') exportPackage();
    else postStatus('Unsupported command: ' + msg.type);
  } catch (err) {
    postStatus('Plugin error: ' + (err && err.message ? err.message : err));
  }
};
'@ | Set-Content $CodeFile -Encoding UTF8

node --check $ServerFile
node --check $CodeFile

Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -match 'RenderBridge|server.mjs' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$BridgeDir'; node server.mjs`""

Write-Host '[DONE] Clean Website Import V2 applied.' -ForegroundColor Green
Write-Host 'Reopen Figma plugin and import the website again.' -ForegroundColor Green
