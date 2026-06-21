import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function px(value) { return `${Math.round(Number(value) || 0)}px`; }
function safeColor(value, fallback) { const raw = String(value || '').trim(); return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback; }
function safeCssKeyword(value, fallback) { const raw = String(value || '').trim(); return /^[a-zA-Z-]+$/.test(raw) ? raw : fallback; }
function safeOpacity(value, fallback = 1) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback; }
function assetById(assets, id) { return (assets || []).find((asset) => asset.id === id) || null; }
function scaleRect(rect, scale) { rect = rect || {}; return { x: Math.round((rect.x || 0) * scale), y: Math.round((rect.y || 0) * scale), w: Math.round((rect.w || 1) * scale), h: Math.round((rect.h || 1) * scale) }; }
function sortLayers(layers) { return (layers || []).slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) || (a.paintOrder || 0) - (b.paintOrder || 0) || ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0)); }
function imageDataUrl(asset) { return asset && asset.base64 ? `data:${asset.contentType || 'image/png'};base64,${asset.base64}` : ''; }
function sourceScreenshotDataUrl(payload) { const shot = payload.source && payload.source.screenshot; return shot && shot.base64 ? `data:${shot.contentType || 'image/png'};base64,${shot.base64}` : ''; }
function imageFitCss(layer) { const fit = layer.imageFit || layer.layout || {}; const objectFit = String(fit.objectFit || 'cover').trim() || 'cover'; const objectPosition = String(fit.objectPosition || '50% 50%').trim() || '50% 50%'; return `object-fit:${esc(objectFit)};object-position:${esc(objectPosition)}`; }
function baseLayerCss(layer, rect, zIndex) { const s = layer.style || {}; const overflow = layer.type === 'text' || layer.type === 'button' ? safeCssKeyword(s.overflow || 'visible', 'visible') : 'hidden'; return ['position:absolute', `left:${px(rect.x)}`, `top:${px(rect.y)}`, `width:${px(rect.w)}`, `height:${px(rect.h)}`, `z-index:${Math.max(2, zIndex)}`, `opacity:${safeOpacity(s.opacity, 1)}`, `border-radius:${px((s.borderRadius || 0))}`, 'box-sizing:border-box', `overflow:${overflow}`].join(';'); }
function textCss(layer, rect, zIndex, scale) { const s = layer.style || {}; const lineHeight = s.lineHeight ? px((s.lineHeight || 0) * scale) : 'normal'; const letterSpacing = Number.isFinite(Number(s.letterSpacing)) ? px((s.letterSpacing || 0) * scale) : 'normal'; return [baseLayerCss(layer, rect, zIndex), `font-size:${px((s.fontSize || 14) * scale)}`, `font-weight:${Number(s.fontWeight || 400)}`, `font-family:${esc(s.fontFamily || 'Inter')}, Arial, sans-serif`, `line-height:${lineHeight}`, `letter-spacing:${letterSpacing}`, `text-transform:${safeCssKeyword(s.textTransform || 'none', 'none')}`, `color:${safeColor(s.color, '#111827')}`, `text-align:${s.textAlign || 'left'}`, `white-space:${safeCssKeyword(s.whiteSpace || 'normal', 'normal')}`, `word-break:${safeCssKeyword(s.wordBreak || 'normal', 'normal')}`, `overflow-wrap:${safeCssKeyword(s.overflowWrap || 'normal', 'normal')}`, '-webkit-font-smoothing:antialiased', 'text-rendering:geometricPrecision'].join(';'); }
function layerHtml(layer, sectionRect, scale, assets, zIndex) { const lr = scaleRect(layer.rect, scale); const sr = scaleRect(sectionRect, scale); const rect = { x: lr.x - sr.x, y: lr.y - sr.y, w: lr.w, h: lr.h }; const s = layer.style || {}; if (layer.type === 'shape') return `<div data-layer="${esc(layer.id)}" style="${baseLayerCss(layer, rect, zIndex)};background:${safeColor(s.backgroundColor, '#FFFFFF')}"></div>`; if (layer.type === 'image') { const asset = assetById(assets, layer.assetId); const src = imageDataUrl(asset); if (src) return `<img data-layer="${esc(layer.id)}" src="${src}" style="${baseLayerCss(layer, rect, zIndex)};${imageFitCss(layer)};display:block" />`; return `<div data-layer="${esc(layer.id)}" style="${baseLayerCss(layer, rect, zIndex)};background:#E5E7EB"></div>`; } if (layer.type === 'button') return `<div data-layer="${esc(layer.id)}" style="${textCss(layer, rect, zIndex, scale)};background:${safeColor(s.backgroundColor, '#111827')};display:flex;align-items:center;justify-content:center;color:${safeColor(s.color, '#FFFFFF')}">${esc(layer.text)}</div>`; return `<div data-layer="${esc(layer.id)}" style="${textCss(layer, rect, zIndex, scale)}">${esc(layer.text)}</div>`; }

export function buildFigmaSimPreviewHtml(payload) {
  const clone = payload.cloneModel || {};
  const page = clone.page || {};
  const sw = Math.max(320, Math.round(page.width || 1440));
  const sh = Math.max(320, Math.round(page.height || 1600));
  const frameW = 1280;
  const scale = frameW / sw;
  const frameH = Math.max(900, Math.round(sh * scale));
  const rootW = 1440;
  const rootPad = 80;
  const rootTop = 112;
  const rootH = rootTop + frameH + 80;
  const visualBacking = !!(clone.visualBacking && clone.visualBacking.enabled && sourceScreenshotDataUrl(payload));
  const overlayOpacity = visualBacking ? safeOpacity(clone.visualBacking.layerOpacity || 0.04, 0.04) : 1;
  const sections = (clone.sections || []).slice().sort((a, b) => ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0));
  const layers = sortLayers(clone.layers || []);
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const sectionHtml = [];
  for (const section of sections) {
    const sr = scaleRect(section.rect, scale);
    const children = layers.filter((layer) => layer.sectionId === section.id).map((layer, index) => layerHtml(layer, section.rect, scale, clone.assets || [], index + 2)).join('');
    sectionHtml.push(`<section data-section="${esc(section.id)}" style="position:absolute;left:0;top:${px(sr.y)};width:${px(frameW)};height:${px(Math.max(1, sr.h))};overflow:hidden;z-index:3">${children}</section>`);
  }
  const looseLayers = layers.filter((layer) => !sectionMap.has(layer.sectionId)).map((layer, index) => layerHtml(layer, { x: 0, y: 0, w: sw, h: sh }, scale, clone.assets || [], index + 2)).join('');
  const screenshot = sourceScreenshotDataUrl(payload);
  const backing = visualBacking ? `<img data-layer="Visual Backing / Source Screenshot" src="${screenshot}" style="position:absolute;left:0;top:0;width:${px(frameW)};height:${px(frameH)};z-index:1;object-fit:fill;display:block;user-select:none;pointer-events:none" />` : '';
  const overlay = visualBacking ? `<div data-layer="Editable Reconstruction / Low Opacity" style="position:absolute;left:0;top:0;width:${px(frameW)};height:${px(frameH)};z-index:2;opacity:${overlayOpacity};overflow:hidden">${sectionHtml.join('')}${looseLayers}</div>` : `${sectionHtml.join('')}${looseLayers}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#202020;font-family:Inter,Arial,sans-serif}.root{position:relative;width:${px(rootW)};height:${px(rootH)};background:#fff;overflow:hidden}.title{position:absolute;left:80px;top:30px;color:#111827;font-weight:700;font-size:28px}.note{position:absolute;left:80px;top:68px;color:#667085;font-size:12px}.main{position:absolute;left:${px(rootPad)};top:${px(rootTop)};width:${px(frameW)};height:${px(frameH)};background:${safeColor(page.background, '#FFFFFF')};overflow:hidden;isolation:isolate}</style></head><body><main class="root"><div class="title">${esc(page.title || 'Website')}</div><div class="note">Version 0.1 - Alpha / translateit-core / alpha-clean-1 - ${visualBacking ? 'visual-backed editable clone' : 'layout-preserving editable clone'}</div><div class="main">${backing}${overlay}</div></main></body></html>`;
}
export async function renderFigmaSimPreview(payload, reportDir) { fs.mkdirSync(reportDir, { recursive: true }); const html = buildFigmaSimPreviewHtml(payload); const htmlPath = path.join(reportDir, 'translateit-figma-sim-preview-latest.html'); const pngPath = path.join(reportDir, 'translateit-figma-sim-preview-latest.png'); fs.writeFileSync(htmlPath, html, 'utf8'); const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1 }); try { await page.setContent(html, { waitUntil: 'load' }); await page.screenshot({ path: pngPath, fullPage: true, type: 'png' }); } finally { await page.close().catch(() => {}); await browser.close().catch(() => {}); } return { htmlPath, pngPath, visualBacking, overlayOpacity }; }
