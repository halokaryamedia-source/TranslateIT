import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const MODE = 'translateit-design-clone-alpha';
const PUBLIC_VERSION = 'Version 0.1 - Alpha';
const VIEWPORT = { width: 1440, height: 1600 };
const MAX_LAYERS = 1000;
let browserPromise;

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const key = (v) => clean(v).toLowerCase();
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const truncate = (v, max) => { const t = clean(v); return t.length > max ? t.slice(0, max - 1) + '…' : t; };
const px = (v, fallback = 0) => { const n = parseFloat(String(v || '').replace('px', '')); return Number.isFinite(n) ? n : fallback; };

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' });
  res.end(JSON.stringify(payload));
}
function normalizeUrl(value) { const raw = String(value || '').trim(); return raw ? (/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) : ''; }
async function getBrowser() { if (!browserPromise) browserPromise = chromium.launch({ headless: true }); return browserPromise; }
function unique(items, fn, limit) { const seen = new Set(); const out = []; for (const item of items || []) { const k = fn(item); if (!k || seen.has(k) || (limit && out.length >= limit)) continue; seen.add(k); out.push(item); } return out; }
function colorFromCss(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return '';
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (!rgba) return '';
  const parts = rgba[1].split(',').map((x) => parseFloat(x));
  if (parts.length < 3 || (parts.length >= 4 && parts[3] === 0)) return '';
  return '#' + parts.slice(0, 3).map((n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')).join('');
}
function union(rects) {
  const safe = (rects || []).filter((r) => r && r.w > 0 && r.h > 0);
  if (!safe.length) return { x: 0, y: 0, w: 1, h: 1 };
  const x = Math.min(...safe.map((r) => r.x));
  const y = Math.min(...safe.map((r) => r.y));
  const right = Math.max(...safe.map((r) => r.x + r.w));
  const bottom = Math.max(...safe.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}
function expand(rect, pad) { return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }; }
function defaultSpacingTokens() { return [{ name: 'Space / XS', value: 4 }, { name: 'Space / SM', value: 8 }, { name: 'Space / MD', value: 16 }, { name: 'Space / LG', value: 24 }, { name: 'Space / XL', value: 40 }, { name: 'Section Gap', value: 72 }, { name: 'Card Padding', value: 24 }, { name: 'Grid Gap', value: 20 }]; }
function defaultRadiusTokens() { return [{ name: 'Radius / SM', value: 8 }, { name: 'Radius / MD', value: 16 }, { name: 'Radius / LG', value: 24 }, { name: 'Radius / XL', value: 32 }]; }

function makeBandSections(layers, viewport, pageHeight) {
  const meaningful = (layers || []).filter((l) => l.type === 'text' || l.type === 'image' || ['navigation', 'footer', 'button-bg', 'button-label', 'link', 'heading'].includes(l.role));
  const maxY = Math.max(pageHeight || viewport.height, ...meaningful.map((l) => l.rect.y + l.rect.h), viewport.height);
  const bandHeight = Math.max(430, Math.min(680, Math.round(viewport.height * 0.42)));
  const sections = [];
  for (let y = 0; y < maxY; y += bandHeight) {
    const bandLayers = (layers || []).filter((layer) => {
      const mid = layer.rect.y + layer.rect.h / 2;
      return mid >= y - 56 && mid < y + bandHeight + 56;
    });
    const useful = bandLayers.filter((l) => l.type === 'text' || l.type === 'image' || ['navigation', 'footer', 'button-bg', 'button-label', 'link', 'heading'].includes(l.role));
    if (!useful.length && sections.length) continue;
    const role = y < 260 ? 'header' : y + bandHeight > maxY * 0.78 ? 'footer' : 'section';
    const rect = expand(union(bandLayers.length ? bandLayers.map((l) => l.rect) : [{ x: 0, y, w: viewport.width, h: bandHeight }]), 32);
    sections.push({ id: 'section-' + String(sections.length + 1), role, name: role === 'header' ? 'Header' : role === 'footer' ? 'Footer' : 'Section ' + String(sections.length + 1).padStart(2, '0'), rect, layers: bandLayers, components: [], looseLayers: bandLayers });
  }
  return sections.slice(0, 14);
}
function clusterSections(layers, viewport, pageHeight) {
  const sorted = (layers || []).filter((l) => l.rect && l.rect.w > 2 && l.rect.h > 2).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const sections = [];
  let current = null;
  for (const layer of sorted.filter((l) => l.type === 'text' || l.type === 'image' || ['navigation', 'footer', 'section', 'button-bg', 'button-label'].includes(l.role))) {
    const forced = layer.role === 'navigation' || layer.role === 'section' || layer.role === 'footer';
    const bottom = current ? current.rect.y + current.rect.h : 0;
    const gap = current ? layer.rect.y - bottom : 9999;
    if (!current || (gap > 190 && current.rect.h > 160) || (forced && current.layers.length > 4)) {
      current = { id: 'section-' + String(sections.length + 1), role: layer.role === 'footer' ? 'footer' : layer.role === 'navigation' && !sections.length ? 'header' : 'section', layers: [] };
      sections.push(current);
    }
    current.layers.push(layer);
    current.rect = expand(union(current.layers.map((l) => l.rect)), 32);
  }
  const minExpected = (pageHeight || viewport.height) > viewport.height * 1.25 ? 3 : 2;
  if (sections.length < minExpected) return makeBandSections(sorted, viewport, pageHeight);
  sections.forEach((section, index) => {
    section.layers = sorted.filter((layer) => { const mid = layer.rect.y + layer.rect.h / 2; return mid >= section.rect.y - 64 && mid <= section.rect.y + section.rect.h + 64; });
    section.rect = expand(union(section.layers.map((l) => l.rect)), 32);
    if (index === 0 && section.rect.y < 260) section.role = 'header';
    if (index === sections.length - 1 && section.rect.y > (pageHeight || viewport.height) * 0.55) section.role = 'footer';
    section.name = section.role === 'header' ? 'Header' : section.role === 'footer' ? 'Footer' : 'Section ' + String(index + 1).padStart(2, '0');
    section.components = [];
    section.looseLayers = section.layers;
  });
  return sections.slice(0, 14);
}
function sectionIntent(section, index) {
  if (section.role === 'header') return 'navigation/header';
  if (section.role === 'footer') return 'footer';
  const text = (section.layers || []).filter((l) => l.type === 'text').map((l) => key(l.text || l.name)).join(' ');
  if (index === 1 || /hero|welcome|discover|unlock|introducing|creative|start|main/.test(text)) return 'hero/landing';
  if (/project|portfolio|gallery|work|case|collection|showcase/.test(text)) return 'gallery/card-grid';
  if (/about|team|culture|mission|story|service|feature/.test(text)) return 'content/about';
  return 'content-section';
}
function templateIntentFor(section, index) { const intent = sectionIntent(section, index); if (intent.includes('navigation') || intent.includes('header')) return 'header'; if (intent.includes('hero') || intent.includes('landing')) return 'hero'; if (intent.includes('gallery') || intent.includes('grid')) return 'gallery'; if (intent.includes('footer')) return 'footer'; return 'content'; }
function readableTexts(section, limit = 10) { return unique((section.layers || []).filter((l) => l.type === 'text').sort((a, b) => px((b.style || {}).fontSize, 14) - px((a.style || {}).fontSize, 14) || a.order - b.order), (l) => key(l.text || l.name), limit).map((l) => ({ text: clean(l.text || l.name), role: l.role || 'text', fontSize: px((l.style || {}).fontSize, 14), weight: String((l.style || {}).fontWeight || '') })).filter((x) => x.text); }
function inferLayoutBlueprint(section, index) {
  const templateIntent = templateIntentFor(section, index);
  const texts = readableTexts(section, 12);
  const imageCount = (section.layers || []).filter((l) => l.type === 'image').length;
  const textChars = texts.reduce((sum, item) => sum + item.text.length, 0);
  const budgetByTemplate = { header: { maxItems: 6, headingChars: 32, bodyChars: 0, maxHeight: 132 }, hero: { maxItems: 4, headingChars: 90, bodyChars: 180, maxHeight: 600 }, content: { maxItems: 6, headingChars: 80, bodyChars: 260, maxHeight: 430 }, gallery: { maxItems: 7, headingChars: 80, bodyChars: 48, maxHeight: 520 }, footer: { maxItems: 5, headingChars: 42, bodyChars: 160, maxHeight: 188 } };
  const budget = budgetByTemplate[templateIntent] || budgetByTemplate.content;
  let suggestedLayout = 'single-column';
  if (templateIntent === 'header') suggestedLayout = 'horizontal-navigation';
  else if (templateIntent === 'hero') suggestedLayout = imageCount ? 'two-column-hero' : 'centered-hero';
  else if (templateIntent === 'gallery') suggestedLayout = 'three-card-grid';
  else if (templateIntent === 'footer') suggestedLayout = 'compact-footer';
  else if (imageCount) suggestedLayout = 'text-media-split';
  return { templateIntent, suggestedLayout, density: textChars > 900 ? 'dense' : textChars > 420 ? 'normal' : 'airy', contentBudget: budget, priorityText: texts.slice(0, budget.maxItems).map((item, i) => ({ role: i === 0 || item.role === 'heading' ? 'heading' : item.role, text: i === 0 ? truncate(item.text, budget.headingChars) : truncate(item.text, budget.bodyChars || 80), originalLength: item.text.length })), mediaSlots: Math.min(templateIntent === 'gallery' ? 3 : 1, imageCount), overflowRisk: textChars > budget.headingChars + budget.bodyChars + 320, sourceMetrics: { textNodes: texts.length, textChars, imageCount } };
}
function buildComponentBlueprints(sections) {
  const intents = new Set(sections.map((section, index) => templateIntentFor(section, index)));
  const out = [
    { name: 'Button / Primary', purpose: 'Main CTA used in hero/content sections.', states: ['default'], properties: ['label', 'radius', 'padding'] },
    { name: 'Button / Secondary', purpose: 'Secondary CTA variant.', states: ['default'], properties: ['label', 'radius', 'padding'] },
    { name: 'Card / Default', purpose: 'Reusable content card.', states: ['default'], properties: ['title', 'body', 'media optional'] },
    { name: 'Media / Image Placeholder', purpose: 'Image/media fallback.', states: ['default'], properties: ['aspect ratio', 'radius'] }
  ];
  if (intents.has('header')) out.push({ name: 'Navigation / Header', purpose: 'Top-level brand and navigation.', states: ['desktop'], properties: ['brand', 'links', 'cta'] });
  if (intents.has('hero')) out.push({ name: 'Section / Hero', purpose: 'Primary landing section.', states: ['desktop', 'mobile'], properties: ['heading', 'body', 'cta', 'media'] });
  if (intents.has('gallery')) out.push({ name: 'Section / Gallery', purpose: 'Three-card gallery.', states: ['desktop-3col'], properties: ['heading', 'cards'] });
  if (intents.has('footer')) out.push({ name: 'Section / Footer', purpose: 'Footer section.', states: ['default'], properties: ['brand', 'links'] });
  return out;
}
function buildRebuildPlan(payload) {
  const layers = payload.layers || [];
  const sections = payload.sections || [];
  const textLayers = layers.filter((l) => l.type === 'text');
  const imageLayers = layers.filter((l) => l.type === 'image');
  const colors = unique(layers.flatMap((l) => { const s = l.style || {}; return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor].map(colorFromCss).filter(Boolean); }), (v) => v, 20);
  const typography = unique(textLayers, (l) => { const s = l.style || {}; return [l.role, s.fontSize, s.fontWeight, s.color].join('|'); }, 18).map((l) => ({ role: l.role || 'text', sample: clean(l.text || l.name).slice(0, 80), fontSize: (l.style || {}).fontSize || '', fontWeight: (l.style || {}).fontWeight || '', color: colorFromCss((l.style || {}).color) }));
  const sectionPlans = sections.slice(0, 14).map((section, index) => { const b = inferLayoutBlueprint(section, index); return { name: section.name || 'Section ' + (index + 1), role: section.role || 'section', intent: sectionIntent(section, index), templateIntent: b.templateIntent, suggestedLayout: b.suggestedLayout, density: b.density, contentBudget: b.contentBudget, priorityText: b.priorityText, mediaSlots: b.mediaSlots, overflowRisk: b.overflowRisk, sourceMetrics: b.sourceMetrics, textCount: (section.layers || []).filter((l) => l.type === 'text').length, imageCount: (section.layers || []).filter((l) => l.type === 'image').length, componentCount: 0, confidence: Math.min(0.95, 0.45 + Math.min((section.layers || []).length, 24) / 45) }; });
  return { title: payload.title || 'Website Design Clone', url: payload.url || '', publicVersion: PUBLIC_VERSION, summary: 'Professional design clone plan for clean Figma reconstruction. Raw coordinate dumping is intentionally avoided.', tokens: { colors, typography, spacing: defaultSpacingTokens(), radius: defaultRadiusTokens() }, componentBlueprints: buildComponentBlueprints(sections), responsive: { desktop: 'Navigation stays horizontal. Hero/content use clear professional hierarchy.', tablet: 'Reduce grids and preserve section rhythm.', mobile: 'Stack sections vertically and collapse navigation.' }, counts: { sections: sections.length, text: textLayers.length, images: imageLayers.length, buttons: layers.filter((l) => l.role === 'button-bg' || l.role === 'button-label').length }, sections: sectionPlans, qualityHints: { overflowRiskCount: sectionPlans.filter((s) => s.overflowRisk).length, denseSectionCount: sectionPlans.filter((s) => s.density === 'dense').length, templateIntentCoverage: sectionPlans.length ? sectionPlans.filter((s) => s.templateIntent).length / sectionPlans.length : 0, professionalTarget: '9+ requires Figma visual validation and manual quality review after Alpha hardening.' }, uncertainties: ['Dynamic states are not reconstructed in Design Clone mode.', 'Post-import Figma visual validation is still required before claiming professional-ready quality.'] };
}
async function extractPage(page) {
  const payload = await page.evaluate(({ maxLayers }) => {
    const viewport = { width: window.innerWidth || 1440, height: window.innerHeight || 1600 };
    const pageHeight = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, viewport.height);
    const layers = [];
    let id = 1;
    const blocked = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'BR', 'IFRAME', 'VIDEO', 'AUDIO', 'CANVAS']);
    const cleanText = (v) => String(v || '').replace(/\s+/g, ' ').trim();
    const px = (v, f = 0) => { const n = parseFloat(String(v || '').replace('px', '')); return Number.isFinite(n) ? n : f; };
    const rectOf = (r) => ({ x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) });
    const usable = (r) => r && r.w >= 2 && r.h >= 2 && r.x < viewport.width && r.x + r.w > 0 && r.y < pageHeight + viewport.height * 0.2 && r.y + r.h > 0;
    const visible = (s) => s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0;
    const fill = (s) => s.backgroundColor && s.backgroundColor !== 'transparent' && s.backgroundColor !== 'rgba(0, 0, 0, 0)';
    const border = (s) => px(s.borderTopWidth) > 0 || px(s.borderRightWidth) > 0 || px(s.borderBottomWidth) > 0 || px(s.borderLeftWidth) > 0;
    const styleOf = (s) => ({ color: s.color, backgroundColor: s.backgroundColor, borderTopColor: s.borderTopColor, borderBottomColor: s.borderBottomColor, borderLeftColor: s.borderLeftColor, borderRightColor: s.borderRightColor, borderRadius: s.borderRadius, fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, textAlign: s.textAlign, opacity: s.opacity });
    const roleOf = (el) => { const tag = el.tagName; const cls = cleanText(el.className).toLowerCase(); const role = cleanText(el.getAttribute('role')).toLowerCase(); if (tag === 'IMG' || tag === 'PICTURE' || tag === 'SVG') return 'image'; if (tag === 'BUTTON' || role === 'button' || cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return 'button'; if (tag === 'NAV' || tag === 'HEADER') return 'navigation'; if (tag === 'A') return cls.includes('button') || cls.includes('btn') || cls.includes('cta') ? 'button' : 'link'; if (/^H[1-6]$/.test(tag)) return 'heading'; if (tag === 'FOOTER') return 'footer'; if (tag === 'SECTION' || tag === 'MAIN' || tag === 'ARTICLE') return 'section'; return 'box'; };
    const push = (layer) => { if (layers.length >= maxLayers) return; layer.id = layer.id || 'layer-' + id++; layer.order = layers.length; layers.push(layer); };
    Array.from(document.querySelectorAll('body *')).forEach((el) => {
      if (layers.length >= maxLayers || blocked.has(el.tagName)) return;
      const style = getComputedStyle(el);
      if (!visible(style)) return;
      const rect = rectOf(el.getBoundingClientRect());
      if (!usable(rect)) return;
      const role = roleOf(el);
      const area = rect.w * rect.h;
      const viewportArea = viewport.width * viewport.height;
      const text = cleanText(el.innerText || el.textContent || '');
      if (role === 'image') { const captureId = 'ti-img-' + id; el.setAttribute('data-ti-img-id', captureId); push({ type: 'image', role: 'image', tag: el.tagName.toLowerCase(), name: cleanText(el.getAttribute('alt') || el.getAttribute('aria-label') || el.id || el.className || 'Image'), rect, style: styleOf(style), captureId }); return; }
      if ((fill(style) || border(style) || role === 'button' || role === 'navigation' || role === 'section' || role === 'footer') && area < viewportArea * 1.8) push({ type: 'box', role: role === 'button' ? 'button-bg' : role, tag: el.tagName.toLowerCase(), name: cleanText(el.getAttribute('aria-label') || el.id || el.className || el.tagName), rect, style: styleOf(style) });
      const childCount = Array.from(el.children || []).filter((child) => visible(getComputedStyle(child))).length;
      if (text && text.length >= 2 && text.length <= 260 && (childCount <= 2 || role === 'link' || role === 'button' || role === 'heading')) push({ type: 'text', role: role === 'link' ? 'link' : role === 'button' ? 'button-label' : role === 'heading' ? 'heading' : 'text', tag: el.tagName.toLowerCase(), name: text.slice(0, 96), text, rect, style: styleOf(style) });
    });
    const seen = new Set();
    const unique = [];
    layers.sort((a, b) => a.order - b.order).forEach((layer) => { const fp = [layer.type, layer.role, layer.text || layer.name, Math.round(layer.rect.x / 4), Math.round(layer.rect.y / 4), Math.round(layer.rect.w / 4), Math.round(layer.rect.h / 4)].join('|'); if (seen.has(fp)) return; seen.add(fp); unique.push(layer); });
    return { title: document.title || location.hostname, url: location.href, viewport, pageHeight, layers: unique };
  }, { maxLayers: MAX_LAYERS });
  for (const layer of payload.layers) {
    if (layer.type !== 'image' || !layer.captureId) continue;
    try { const handle = await page.$('[data-ti-img-id="' + layer.captureId + '"]'); if (!handle) continue; const bytes = await handle.screenshot({ type: 'png' }); layer.image = { contentType: 'image/png', base64: bytes.toString('base64'), bytes: bytes.length }; } catch (_) {}
  }
  payload.sections = clusterSections(payload.layers, payload.viewport, payload.pageHeight);
  payload.rebuildPlan = buildRebuildPlan(payload);
  return payload;
}
async function compile(target) {
  const targetUrl = normalizeUrl(target);
  if (!targetUrl) throw new Error('Missing url query parameter.');
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1600);
    await page.evaluate(async () => { await new Promise((resolve) => { let total = 0; const step = 700; const max = Math.min(14000, Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0)); const timer = setInterval(() => { scrollBy(0, step); total += step; if (total >= max) { clearInterval(timer); scrollTo(0, 0); resolve(); } }, 70); }); });
    await page.waitForTimeout(700);
    const extracted = await extractPage(page);
    const shot = await page.screenshot({ type: 'png', fullPage: true });
    return { ok: true, mode: MODE, publicVersion: PUBLIC_VERSION, adapter: 'translateit-alpha-v2-band-section-blueprint', capturedAt: new Date().toISOString(), title: extracted.title, url: extracted.url, viewport: extracted.viewport, pageHeight: extracted.pageHeight, screenshot: { contentType: 'image/png', base64: shot.toString('base64'), width: extracted.viewport.width, height: extracted.pageHeight }, layers: extracted.layers, sections: extracted.sections, rebuildPlan: extracted.rebuildPlan, diagnostics: { layerCount: extracted.layers.length, sectionCount: extracted.sections.length, componentCount: 0, imageCount: extracted.layers.filter((x) => x.type === 'image').length, textCount: extracted.layers.filter((x) => x.type === 'text').length, rebuildPlanSectionCount: extracted.rebuildPlan.sections.length, colorTokenCount: extracted.rebuildPlan.tokens.colors.length, typographyTokenCount: extracted.rebuildPlan.tokens.typography.length, spacingTokenCount: extracted.rebuildPlan.tokens.spacing.length, radiusTokenCount: extracted.rebuildPlan.tokens.radius.length, componentBlueprintCount: extracted.rebuildPlan.componentBlueprints.length, overflowRiskCount: extracted.rebuildPlan.qualityHints.overflowRiskCount, denseSectionCount: extracted.rebuildPlan.qualityHints.denseSectionCount, responsiveCount: Object.keys(extracted.rebuildPlan.responsive || {}).length, templateIntentCount: new Set(extracted.rebuildPlan.sections.map((s) => s.templateIntent).filter(Boolean)).size }, outputRules: ['01 Screenshot Preview / Pure Reference: one screenshot rectangle only.', '02 Rebuild Plan / AI Interpretation: semantic section blueprints.', '03 UI Components / Structured Library: tokens and component blueprints.', '04 Editable Result / Clean Structured Draft: template-based editable draft.', '05 Audit / Design Clone Notes: visible diagnostics.'], warnings: ['Version 0.1 - Alpha is design-only.', 'Post-import Figma visual validation is required before calling the result professional-ready.'] };
  } finally { await page.close(); }
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }); res.end(); return; }
  const requestUrl = new URL(req.url, 'http://127.0.0.1:' + PORT);
  if (requestUrl.pathname === '/health') return json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: MODE, publicVersion: PUBLIC_VERSION, adapter: 'alpha-v2-band-section-blueprint', port: PORT });
  if (requestUrl.pathname !== '/render') return json(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });
  try { json(res, 200, await compile(requestUrl.searchParams.get('url'))); } catch (error) { json(res, 500, { ok: false, error: error && error.stack ? error.stack : String(error) }); }
});
server.listen(PORT, '127.0.0.1', () => console.log('TranslateIT ' + PUBLIC_VERSION + ' Alpha V2 Bridge running at http://127.0.0.1:' + PORT));
