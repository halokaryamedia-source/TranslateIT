import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function px(value) { return `${Math.round(Number(value) || 0)}px`; }
function safeColor(value, fallback) { const raw = String(value || '').trim(); return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback; }
function assetById(assets, id) { return (assets || []).find((asset) => asset.id === id) || null; }
function imageFitCss(layer) { const fit = layer.imageFit || layer.layout || {}; const objectFit = String(fit.objectFit || 'cover').trim() || 'cover'; const objectPosition = String(fit.objectPosition || '50% 50%').trim() || '50% 50%'; return `object-fit:${esc(objectFit)};object-position:${esc(objectPosition)}`; }

function layerCss(layer) {
  const r = layer.rect || {};
  const s = layer.style || {};
  const z = Number(layer.zIndex || 0) + 20;
  return ['position:absolute', `left:${px(r.x)}`, `top:${px(r.y)}`, `width:${px(r.w)}`, `height:${px(r.h)}`, `z-index:${z}`, `border-radius:${px(s.borderRadius || 0)}`, 'box-sizing:border-box', 'overflow:hidden'].join(';');
}

function textCss(layer) {
  const s = layer.style || {};
  return [layerCss(layer), `font-size:${px(s.fontSize || 14)}`, `font-weight:${Number(s.fontWeight || 400)}`, `font-family:${esc(s.fontFamily || 'Inter')}, Arial, sans-serif`, `line-height:${s.lineHeight ? px(s.lineHeight) : '1.25'}`, `color:${safeColor(s.color, '#111827')}`, `text-align:${s.textAlign || 'left'}`, 'white-space:normal', 'word-break:normal'].join(';');
}

function layerHtml(layer, assets) {
  const s = layer.style || {};
  if (layer.type === 'shape') return `<div data-layer="${esc(layer.id)}" style="${layerCss(layer)};background:${safeColor(s.backgroundColor, '#FFFFFF')}"></div>`;
  if (layer.type === 'image') {
    const asset = assetById(assets, layer.assetId);
    if (asset && asset.base64) return `<img data-layer="${esc(layer.id)}" src="data:${asset.contentType || 'image/png'};base64,${asset.base64}" style="${layerCss(layer)};${imageFitCss(layer)};display:block" />`;
    return `<div data-layer="${esc(layer.id)}" style="${layerCss(layer)};background:#E5E7EB"></div>`;
  }
  if (layer.type === 'button') return `<div data-layer="${esc(layer.id)}" style="${layerCss(layer)};background:${safeColor(s.backgroundColor, '#111827')};display:flex;align-items:center;justify-content:center;color:${safeColor(s.color, '#FFFFFF')};font-size:${px(s.fontSize || 14)};font-weight:${Number(s.fontWeight || 700)};font-family:${esc(s.fontFamily || 'Inter')}, Arial, sans-serif">${esc(layer.text)}</div>`;
  return `<div data-layer="${esc(layer.id)}" style="${textCss(layer)}">${esc(layer.text)}</div>`;
}

export function buildClonePreviewHtml(payload) {
  const clone = payload.cloneModel || {};
  const page = clone.page || {};
  const width = Math.max(320, Math.round(page.width || 1440));
  const height = Math.max(320, Math.round(page.height || 1600));
  const layers = (clone.layers || []).slice().sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#111827}.page{position:relative;width:${width}px;height:${height}px;background:${safeColor(page.background, '#FFFFFF')};overflow:hidden}</style></head><body><main class="page">${layers.map((layer) => layerHtml(layer, clone.assets || [])).join('')}</main></body></html>`;
}

export function previewMetrics(payload) {
  const clone = payload.cloneModel || {};
  const diagnostics = clone.diagnostics || {};
  const match = (payload.diagnostics && payload.diagnostics.visualMatching) || clone.visualMatching || {};
  const visual = (payload.diagnostics && payload.diagnostics.visualModel) || {};
  const layers = clone.layers || [];
  const semanticLayers = layers.filter((layer) => ['text', 'image', 'button'].includes(layer.type));
  const matched = semanticLayers.filter((layer) => layer.visualMatch).length;
  const editable = layers.filter((layer) => layer.editable !== false).length;
  const fitLayers = layers.filter((layer) => layer.type === 'image' && layer.imageFit).length;
  const matchRate = Number(match.matchRate || (semanticLayers.length ? matched / semanticLayers.length : 0));
  const confidence = Number(match.averageConfidence || diagnostics.visualMatchConfidence || 0);
  const visualBlockCount = Number(visual.blocks || diagnostics.visualBlocks || 0);
  const visualCoverageRatio = Number(visual.coverageRatio || 0);
  const rawLayerCoverage = visualBlockCount ? Math.min(1, semanticLayers.length / Math.max(1, visualBlockCount)) : matchRate;
  const confidenceCoverage = Math.min(1, Math.max(0, (matchRate * 0.72) + (confidence * 0.28)));
  const sourceCoverage = Math.max(rawLayerCoverage, confidenceCoverage, visualCoverageRatio);
  const geometryScore = Math.round(Math.min(100, Math.max(0, matchRate * 72 + confidence * 28)));
  const sourceCoverageScore = Math.round(Math.min(100, Math.max(0, sourceCoverage * 100)));
  const editableLayerScore = Math.round(layers.length ? editable / layers.length * 100 : 0);
  const imageFitScore = Math.round(layers.filter((layer) => layer.type === 'image').length ? fitLayers / layers.filter((layer) => layer.type === 'image').length * 100 : 100);
  const fabricatedLayoutRisk = matchRate < 0.45 || confidence < 0.52 ? 'high' : matchRate < 0.65 ? 'medium' : 'low';
  const visualSimilarityScore = Math.round(geometryScore * 0.5 + sourceCoverageScore * 0.22 + editableLayerScore * 0.18 + imageFitScore * 0.1);
  return { visualSimilarityScore, geometryPreservationScore: geometryScore, sourceCoverageScore, rawLayerCoverageScore: Math.round(rawLayerCoverage * 100), confidenceCoverageScore: Math.round(confidenceCoverage * 100), visualCoverageScore: Math.round(visualCoverageRatio * 100), editableLayerScore, imageFitScore, fabricatedLayoutRisk, visualMatchRate: Number(matchRate.toFixed(3)), visualMatchConfidence: Number(confidence.toFixed(2)) };
}

export async function renderClonePreview(payload, reportDir) {
  fs.mkdirSync(reportDir, { recursive: true });
  const html = buildClonePreviewHtml(payload);
  const htmlPath = path.join(reportDir, 'translateit-clone-preview-latest.html');
  const pngPath = path.join(reportDir, 'translateit-clone-preview-latest.png');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const clone = payload.cloneModel || {};
  const page = clone.page || {};
  const width = Math.max(320, Math.round(page.width || 1440));
  const height = Math.max(320, Math.min(5000, Math.round(page.height || 1600)));
  const browser = await chromium.launch({ headless: true });
  const previewPage = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  try {
    await previewPage.setContent(html, { waitUntil: 'load' });
    await previewPage.screenshot({ path: pngPath, fullPage: true, type: 'png' });
  } finally {
    await previewPage.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return { htmlPath, pngPath, metrics: previewMetrics(payload) };
}
