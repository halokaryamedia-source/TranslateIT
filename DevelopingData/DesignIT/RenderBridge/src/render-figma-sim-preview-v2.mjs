import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const px = (v) => `${Math.round(Number(v) || 0)}px`;
const color = (v, f) => /^#[0-9a-fA-F]{6}$/.test(String(v || '').trim()) ? String(v).trim() : f;
const op = (v, f = 1) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : f; };
const kw = (v, f) => /^[a-zA-Z-]+$/.test(String(v || '').trim()) ? String(v).trim() : f;
const shot = (p) => p?.source?.screenshot || null;
const shotUrl = (p) => shot(p)?.base64 ? `data:${shot(p).contentType || 'image/png'};base64,${shot(p).base64}` : '';
const sizeOf = (p, page) => ({ w: Math.max(320, Math.round(shot(p)?.width || page.width || 1440)), h: Math.max(1, Math.round(shot(p)?.height || page.height || 1600)) });
const sr = (r, s) => ({ x: Math.round((r?.x || 0) * s), y: Math.round((r?.y || 0) * s), w: Math.round((r?.w || 1) * s), h: Math.round((r?.h || 1) * s) });
const byOrder = (a, b) => (a.zIndex || 0) - (b.zIndex || 0) || (a.paintOrder || 0) - (b.paintOrder || 0) || ((a.rect?.y) || 0) - ((b.rect?.y) || 0);
const asset = (assets, id) => (assets || []).find((x) => x.id === id) || null;
const assetUrl = (a) => a?.base64 ? `data:${a.contentType || 'image/png'};base64,${a.base64}` : '';
function base(layer, r, z) { const st = layer.style || {}; const overflow = layer.type === 'text' || layer.type === 'button' ? kw(st.overflow || 'visible', 'visible') : 'hidden'; return `position:absolute;left:${px(r.x)};top:${px(r.y)};width:${px(r.w)};height:${px(r.h)};z-index:${Math.max(2, z)};opacity:${op(st.opacity)};border-radius:${px(st.borderRadius || 0)};box-sizing:border-box;overflow:${overflow}`; }
function textCss(layer, r, z, scale) { const st = layer.style || {}; const lh = st.lineHeight ? px((st.lineHeight || 0) * scale) : 'normal'; const ls = Number.isFinite(Number(st.letterSpacing)) ? px((st.letterSpacing || 0) * scale) : 'normal'; return `${base(layer, r, z)};font-size:${px((st.fontSize || 14) * scale)};font-weight:${Number(st.fontWeight || 400)};font-family:${esc(st.fontFamily || 'Inter')},Arial,sans-serif;line-height:${lh};letter-spacing:${ls};text-transform:${kw(st.textTransform || 'none', 'none')};color:${color(st.color, '#111827')};text-align:${st.textAlign || 'left'};white-space:${kw(st.whiteSpace || 'normal', 'normal')};word-break:${kw(st.wordBreak || 'normal', 'normal')};overflow-wrap:${kw(st.overflowWrap || 'normal', 'normal')};-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision`; }
function layerHtml(layer, secRect, scale, assets, z) { const lr = sr(layer.rect, scale); const rr = sr(secRect, scale); const r = { x: lr.x - rr.x, y: lr.y - rr.y, w: lr.w, h: lr.h }; const st = layer.style || {}; if (layer.type === 'shape') return `<div data-layer="${esc(layer.id)}" style="${base(layer, r, z)};background:${color(st.backgroundColor, '#FFFFFF')}"></div>`; if (layer.type === 'image') { const src = assetUrl(asset(assets, layer.assetId)); return src ? `<img data-layer="${esc(layer.id)}" src="${src}" style="${base(layer, r, z)};object-fit:${esc(layer.imageFit?.objectFit || 'cover')};object-position:${esc(layer.imageFit?.objectPosition || '50% 50%')};display:block" />` : `<div data-layer="${esc(layer.id)}" style="${base(layer, r, z)};background:#E5E7EB"></div>`; } if (layer.type === 'button') return `<div data-layer="${esc(layer.id)}" style="${textCss(layer, r, z, scale)};background:${color(st.backgroundColor, '#111827')};display:flex;align-items:center;justify-content:center;color:${color(st.color, '#FFFFFF')}">${esc(layer.text)}</div>`; return `<div data-layer="${esc(layer.id)}" style="${textCss(layer, r, z, scale)}">${esc(layer.text)}</div>`; }

export function buildFigmaSimPreviewHtml(payload) {
  const clone = payload.cloneModel || {}, page = clone.page || {}, source = sizeOf(payload, page);
  const frameW = 1280, scale = frameW / source.w, frameH = Math.max(1, Math.round(source.h * scale));
  const backingOn = !!(clone.visualBacking?.enabled && shotUrl(payload));
  const overlayOpacity = backingOn ? op(clone.visualBacking?.layerOpacity || 0.04, 0.04) : 1;
  const sections = (clone.sections || []).slice().sort((a, b) => (a.rect?.y || 0) - (b.rect?.y || 0));
  const layers = (clone.layers || []).slice().sort(byOrder);
  const sectionIds = new Set(sections.map((s) => s.id));
  const sectionHtml = sections.map((section) => { const r = sr(section.rect, scale); const kids = layers.filter((layer) => layer.sectionId === section.id).map((layer, index) => layerHtml(layer, section.rect, scale, clone.assets || [], index + 2)).join(''); return `<section data-section="${esc(section.id)}" style="position:absolute;left:0;top:${px(r.y)};width:${px(frameW)};height:${px(Math.max(1, r.h))};overflow:hidden;z-index:3">${kids}</section>`; }).join('');
  const loose = layers.filter((layer) => !sectionIds.has(layer.sectionId)).map((layer, index) => layerHtml(layer, { x: 0, y: 0, w: source.w, h: source.h }, scale, clone.assets || [], index + 2)).join('');
  const backing = backingOn ? `<img data-layer="Visual Backing / Source Screenshot" src="${shotUrl(payload)}" style="position:absolute;left:0;top:0;width:${px(frameW)};height:${px(frameH)};z-index:1;object-fit:fill;display:block;user-select:none;pointer-events:none" />` : '';
  const overlay = backingOn ? `<div data-layer="Editable Reconstruction / Low Opacity" style="position:absolute;left:0;top:0;width:${px(frameW)};height:${px(frameH)};z-index:2;opacity:${overlayOpacity};overflow:hidden">${sectionHtml}${loose}</div>` : `${sectionHtml}${loose}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#202020;font-family:Inter,Arial,sans-serif}.root{position:relative;width:1440px;height:${px(112 + frameH + 80)};background:#fff;overflow:hidden}.title{position:absolute;left:80px;top:30px;color:#111827;font-weight:700;font-size:28px}.note{position:absolute;left:80px;top:68px;color:#667085;font-size:12px}.main{position:absolute;left:80px;top:112px;width:${px(frameW)};height:${px(frameH)};background:${color(page.background, '#FFFFFF')};overflow:hidden;isolation:isolate}</style></head><body><main class="root"><div class="title">${esc(page.title || 'Website')}</div><div class="note">Version 0.1 - Alpha / source-size ${source.w}x${source.h} / visual-backed ${backingOn ? 'on' : 'off'}</div><div class="main">${backing}${overlay}</div></main></body></html>`;
}

export async function renderFigmaSimPreview(payload, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const html = buildFigmaSimPreviewHtml(payload);
  const htmlPath = path.join(reportDir, 'translateit-figma-sim-preview-latest.html');
  const pngPath = path.join(reportDir, 'translateit-figma-sim-preview-latest.png');
  const mainPngPath = path.join(reportDir, 'translateit-figma-sim-main-latest.png');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1 });
  let mainSize = null;
  try { await page.setContent(html, { waitUntil: 'load' }); await page.screenshot({ path: pngPath, fullPage: true, type: 'png' }); const main = page.locator('.main'); await main.screenshot({ path: mainPngPath }); mainSize = await main.evaluate((el) => ({ width: Math.round(el.clientWidth), height: Math.round(el.clientHeight) })).catch(() => null); }
  finally { await page.close().catch(() => {}); await browser.close().catch(() => {}); }
  const clone = payload.cloneModel || {};
  const backingOn = !!(clone.visualBacking?.enabled && shotUrl(payload));
  return { htmlPath, pngPath, mainPngPath, visualBacking: backingOn, overlayOpacity: backingOn ? op(clone.visualBacking?.layerOpacity || 0.04, 0.04) : 1, mainSize, sourceSize: sizeOf(payload, clone.page || {}) };
}
