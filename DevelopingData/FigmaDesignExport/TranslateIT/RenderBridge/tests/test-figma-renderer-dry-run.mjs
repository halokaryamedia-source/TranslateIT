import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'manifest.json'), 'utf8'));
const codePath = path.join(pluginRoot, manifest.main || 'code.js');
const uiPath = path.join(pluginRoot, manifest.ui || 'ui.html');

async function readJson(res) {
  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return { ok: res.ok, status: res.status, payload };
}

function makeNode(type) {
  return {
    type,
    name: '',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fills: [],
    strokes: [],
    effects: [],
    children: [],
    opacity: 1,
    cornerRadius: 0,
    resize(w, h) { this.width = w; this.height = h; },
    appendChild(node) { this.children.push(node); node.parent = this; },
    setPluginData(key, value) { this.pluginData = this.pluginData || {}; this.pluginData[key] = value; },
    getPluginData(key) { return this.pluginData?.[key] || ''; },
    set characters(value) { this._characters = String(value || ''); },
    get characters() { return this._characters || ''; }
  };
}

function countNodes(node, acc = { total: 0, frames: 0, texts: 0, rectangles: 0, images: 0 }) {
  if (!node) return acc;
  acc.total += 1;
  if (node.type === 'FRAME' || node.type === 'PAGE') acc.frames += 1;
  if (node.type === 'TEXT') acc.texts += 1;
  if (node.type === 'RECTANGLE') {
    acc.rectangles += 1;
    if ((node.fills || []).some((fill) => fill.type === 'IMAGE')) acc.images += 1;
  }
  for (const child of node.children || []) countNodes(child, acc);
  return acc;
}

const payloadResult = await readJson(await fetch(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`));
const payload = payloadResult.payload;

if (!payloadResult.ok && payload?.code === 'EXTERNAL_VISUAL_ENGINE_REQUIRED') {
  console.log(JSON.stringify({
    gate: 'designit-figma-renderer-dry-run',
    status: 'blocked_external_visual_engine',
    targetUrl,
    activeRenderer: manifest.main || 'code.js',
    externalVisualEngine: payload.externalVisualEngine || null,
    nextAction: payload.nextAction || [],
    failures: [],
    warnings: ['External visual engine is not available. Figma dry-run is blocked until OmniParser/UIED is running.']
  }, null, 2));
} else {
  if (!payloadResult.ok || payload.ok !== true) throw new Error('Render payload failed: ' + JSON.stringify(payload).slice(0, 700));
  if (manifest.main !== 'code-framework-production.js') throw new Error('Dry-run must use code-framework-production.js.');
  if (manifest.ui !== 'ui-framework.html') throw new Error('Dry-run must use ui-framework.html.');

  const postedMessages = [];
  const page = makeNode('PAGE');
  page.name = 'Mock Page';
  const figma = {
    root: { children: [page] },
    currentPage: page,
    ui: { postMessage(message) { postedMessages.push(message); }, onmessage: null },
    viewport: { scrollAndZoomIntoView() {} },
    showUI() {},
    async loadFontAsync() {},
    async setCurrentPageAsync(nextPage) { this.currentPage = nextPage; },
    createPage() { const node = makeNode('PAGE'); this.root.children.push(node); return node; },
    createFrame() { return makeNode('FRAME'); },
    createRectangle() { return makeNode('RECTANGLE'); },
    createText() { return makeNode('TEXT'); },
    createImage(bytes) { return { hash: 'mock-image-' + (bytes?.length || 0) }; }
  };
  const context = {
    figma,
    __html__: fs.existsSync(uiPath) ? fs.readFileSync(uiPath, 'utf8') : '<html></html>',
    console,
    atob(value) { return Buffer.from(String(value || ''), 'base64').toString('binary'); },
    Date,
    Math,
    JSON,
    String,
    Number,
    Array,
    Object,
    RegExp,
    Error,
    isFinite,
    Uint8Array
  };

  const pluginCode = fs.readFileSync(codePath, 'utf8');
  vm.runInNewContext(pluginCode, context, { filename: 'plugin/' + (manifest.main || 'code.js'), timeout: 5000 });
  if (typeof figma.ui.onmessage !== 'function') throw new Error('Plugin did not register figma.ui.onmessage');
  await figma.ui.onmessage({ type: 'import-design-model', payload });

  const pageCounts = figma.root.children.map((child) => ({ name: child.name, ...countNodes(child) }));
  const imported = pageCounts.find((item) => /Website|TranslateIT|DesignIT|Import/i.test(item.name)) || pageCounts[pageCounts.length - 1];
  const statusText = postedMessages.map((message) => message.text || '').join('\n');
  const failures = [];

  if (!statusText.includes('Import complete')) failures.push('plugin did not report import complete');
  if (!statusText.includes('Rendered')) failures.push('production renderer summary missing rendered count');
  if (!statusText.includes('layers')) failures.push('production renderer summary missing layer count');
  if (!imported || imported.total < 20) failures.push('imported mock tree is too small');
  if (!imported || imported.texts < 4) failures.push('not enough text nodes rendered');
  if (!imported || imported.rectangles < 4) failures.push('not enough rectangle/image nodes rendered');

  const report = {
    gate: 'designit-figma-renderer-dry-run',
    status: failures.length ? 'fail' : 'pass',
    targetUrl,
    activeRenderer: manifest.main || 'code.js',
    activeUi: manifest.ui || 'ui.html',
    cloneMode: payload.cloneModel?.mode || null,
    sections: payload.cloneModel?.sections?.length || 0,
    layers: payload.cloneModel?.layers?.length || 0,
    assets: payload.cloneModel?.assets?.length || 0,
    imported,
    postedMessages,
    failures
  };

  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 2;
}
