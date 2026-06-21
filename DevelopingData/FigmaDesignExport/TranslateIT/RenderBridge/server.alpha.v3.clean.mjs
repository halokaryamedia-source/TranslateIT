import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const PUBLIC_VERSION = 'Version 0.1 - Alpha';
const MODE = 'translateit-design-clone-alpha';
const VIEWPORT = { width: 1440, height: 1600 };
let browserPromise;

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const key = (v) => clean(v).toLowerCase();
const px = (v, fallback = 0) => { const n = parseFloat(String(v || '').replace('px', '')); return Number.isFinite(n) ? n : fallback; };
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const truncate = (v, max) => { const t = clean(v); return t.length > max ? t.slice(0, max - 1) + '…' : t; };

function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }); res.end(JSON.stringify(payload)); }
function normalizeUrl(value) { const raw = clean(value); return raw ? (/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) : ''; }
async function getBrowser() { if (!browserPromise) browserPromise = chromium.launch({ headless: true }); return browserPromise; }
function colorFromCss(value) { const raw = String(value || '').trim(); if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return ''; const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/); if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0]; const rgba = raw.match(/rgba?\(([^)]+)\)/); if (!rgba) return ''; const parts = rgba[1].split(',').map((x) => parseFloat(x)); if (parts.length < 3 || (parts.length >= 4 && parts[3] === 0)) return ''; return '#' + parts.slice(0, 3).map((n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function unique(items, fn, limit) { const seen = new Set(); const out = []; for (const item of items || []) { const k = fn(item); if (!k || seen.has(k) || (limit && out.length >= limit)) continue; seen.add(k); out.push(item); } return out; }
function union(rects) { const safe = (rects || []).filter((r) => r && r.w > 0 && r.h > 0); if (!safe.length) return { x: 0, y: 0, w: 1, h: 1 }; const x = Math.min(...safe.map((r) => r.x)); const y = Math.min(...safe.map((r) => r.y)); const right = Math.max(...safe.map((r) => r.x + r.w)); const bottom = Math.max(...safe.map((r) => r.y + r.h)); return { x, y, w: right - x, h: bottom - y }; }
function expand(rect, pad) { return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 }; }

function buildSections(layers, viewport, pageHeight) {
  const important = layers.filter((l) => l.type === 'text' || l.type === 'image' || ['navigation', 'footer', 'section', 'button-bg', 'button-label', 'link'].includes(l.role)).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const maxY = Math.max(pageHeight || viewport.height, ...important.map((l) => l.rect.y + l.rect.h), viewport.height);
  const bandHeight = Math.max(520, Math.min(760, Math.round(viewport.height * 0.45)));
  const sections = [];
  for (let y = 0; y < maxY; y += bandHeight) {
    const bandLayers = layers.filter((l) => { const mid = l.rect.y + l.rect.h / 2; return mid >= y - 40 && mid < y + bandHeight + 40; });
    const useful = bandLayers.filter((l) => l.type === 'text' || l.type === 'image' || ['navigation', 'footer', 'button-bg', 'button-label', 'link'].includes(l.role));
    if (!useful.length) continue;
    const role = y < 260 ? 'header' : y + bandHeight > maxY * 0.78 ? 'footer' : 'section';
    const rect = expand(union(bandLayers.map((l) => l.rect)), 24);
    sections.push({ id: 'section-' + String(sections.length + 1), role, name: role === 'header' ? 'Header' : role === 'footer' ? 'Footer' : 'Section ' + String(sections.length + 1).padStart(2, '0'), rect, layers: bandLayers, components: [], looseLayers: bandLayers });
  }
  return sections.length ? sections.slice(0, 14) : [{ id: 'section-1', role: 'section', name: 'Section 01', rect: { x: 0, y: 0, w: viewport.width, h: maxY }, layers, components: [], looseLayers: layers }];
}
function templateIntentFor(section, index) { if (section.role === 'header') return 'header'; if (section.role === 'footer') return 'footer'; const text = section.layers.filter((l) => l.type === 'text').map((l) => key(l.text || l.name)).join(' '); if (index === 1 || /hero|welcome|discover|unlock|creative|start|main/.test(text)) return 'hero'; if (/project|portfolio|gallery|work|case|collection|showcase/.test(text)) return 'gallery'; return 'content'; }
function readableTexts(section, limit = 8) { return unique(section.layers.filter((l) => l.type === 'text').sort((a, b) => px((b.style || {}).fontSize, 14) - px((a.style || {}).fontSize, 14) || a.order - b.order), (l) => key(l.text || l.name), limit).map((l) => ({ text: clean(l.text || l.name), role: l.role || 'text', fontSize: px((l.style || {}).fontSize, 14) })); }
function buildPlan(payload) {
  const layers = payload.layers || [];
  const sections = payload.sections || [];
  const textLayers = layers.filter((l) => l.type === 'text');
  const imageLayers = layers.filter((l) => l.type === 'image');
  const colors = unique(layers.flatMap((l) => { const s = l.style || {}; return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor].map(colorFromCss).filter(Boolean); }), (v) => v, 20);
  const typography = unique(textLayers, (l) => [l.role, (l.style || {}).fontSize, (l.style || {}).fontWeight, (l.style || {}).color].join('|'), 18).map((l) => ({ role: l.role || 'text', sample: clean(l.text || l.name).slice(0, 80), fontSize: (l.style || {}).fontSize || '', fontWeight: (l.style || {}).fontWeight || '', color: colorFromCss((l.style || {}).color) }));
  const sectionPlans = sections.map((s, i) => { const templateIntent = templateIntentFor(s, i); const texts = readableTexts(s, 8); const imageCount = s.layers.filter((l) => l.type === 'image').length; return { name: s.name, role: s.role, templateIntent, suggestedLayout: templateIntent === 'header' ? 'horizontal-navigation' : templateIntent === 'hero' ? 'visual-hero' : imageCount ? 'text-media' : 'content-block', density: texts.length > 6 ? 'dense' : texts.length > 2 ? 'normal' : 'airy', contentBudget: { maxItems: 6, headingChars: 90, bodyChars: 180, maxHeight: Math.round(s.rect.h) }, priorityText: texts.map((t, idx) => ({ role: idx === 0 ? 'heading' : t.role, text: truncate(t.text, idx === 0 ? 90 : 140), originalLength: t.text.length })), mediaSlots: Math.min(3, imageCount), overflowRisk: texts.length > 8, sourceMetrics: { textNodes: texts.length, imageCount } }; });
  return { title: payload.title || 'Website Design Clone', url: payload.url || '', publicVersion: PUBLIC_VERSION, summary: 'Clean structured visual clone plan. Parent text blobs are filtered during extraction.', tokens: { colors, typography, spacing: [{ name: 'Space / XS', value: 4 }, { name: 'Space / SM', value: 8 }, { name: 'Space / MD', value: 16 }, { name: 'Space / LG', value: 24 }, { name: 'Space / XL', value: 40 }, { name: 'Section Gap', value: 72 }, { name: 'Card Padding', value: 24 }, { name: 'Grid Gap', value: 20 }], radius: [{ name: 'Radius / SM', value: 8 }, { name: 'Radius / MD', value: 16 }, { name: 'Radius / LG', value: 24 }, { name: 'Radius / XL', value: 32 }] }, componentBlueprints: [{ name: 'Navigation / Header' }, { name: 'Section / Hero' }, { name: 'Card / Default' }, { name: 'Media / Image' }, { name: 'Footer / Default' }], responsive: { desktop: 'Use captured visual sections.', tablet: 'Stack wider sections.', mobile: 'Single column.' }, counts: { sections: sections.length, text: textLayers.length, images: imageLayers.length, buttons: layers.filter((l) => l.role === 'button-bg' || l.role === 'button-label').length }, sections: sectionPlans, qualityHints: { overflowRiskCount: sectionPlans.filter((s) => s.overflowRisk).length, denseSectionCount: sectionPlans.filter((s) => s.density === 'dense').length, templateIntentCoverage: sectionPlans.length ? 1 : 0, professionalTarget: 'Inspect 01 Structured Visual Clone against 02 Screenshot Reference.' }, uncertainties: ['Real Figma visual validation is required.'] };
}

async function extractPage(page) {
  const payload = await page.evaluate(() => {
    const viewport = { width: innerWidth || 1440, height: innerHeight || 1600 };
    const pageHeight = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, viewport.height);
    const layers = []; let id = 1;
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
    const push = (layer) => { if (layers.length >= 900) return; layer.id = layer.id || 'layer-' + id++; layer.order = layers.length; layers.push(layer); };
    Array.from(document.querySelectorAll('body *')).forEach((el) => {
      if (layers.length >= 900 || blocked.has(el.tagName)) return;
      const style = getComputedStyle(el); if (!visible(style)) return;
      const rect = rectOf(el.getBoundingClientRect()); if (!usable(rect)) return;
      const role = roleOf(el); const area = rect.w * rect.h; const viewportArea = viewport.width * viewport.height;
      if (role === 'image') { const captureId = 'ti-img-' + id; el.setAttribute('data-ti-img-id', captureId); push({ type: 'image', role: 'image', tag: el.tagName.toLowerCase(), name: cleanText(el.getAttribute('alt') || el.getAttribute('aria-label') || el.id || el.className || 'Image'), rect, style: styleOf(style), captureId }); return; }
      if ((fill(style) || border(style) || role === 'button' || role === 'navigation' || role === 'section' || role === 'footer') && area < viewportArea * 1.6) push({ type: 'box', role: role === 'button' ? 'button-bg' : role, tag: el.tagName.toLowerCase(), name: cleanText(el.getAttribute('aria-label') || el.id || el.className || el.tagName), rect, style: styleOf(style) });
      const children = Array.from(el.children || []).filter((child) => visible(getComputedStyle(child)));
      const ownText = cleanText(Array.from(el.childNodes || []).filter((node) => node.nodeType === 3).map((node) => node.textContent || '').join(' '));
      const innerText = cleanText(el.innerText || el.textContent || '');
      const semantic = role === 'link' || role === 'button' || role === 'heading' || ['P', 'SPAN', 'LABEL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName);
      let text = ownText || (children.length === 0 || semantic ? innerText : '');
      const childTexts = children.map((child) => cleanText(child.innerText || child.textContent || '')).filter((value) => value.length > 2);
      if (children.length && !ownText && !semantic) text = '';
      if (childTexts.filter((childText) => text.includes(childText)).length >= 2 && role !== 'heading') text = '';
      if (text && text.length >= 2 && text.length <= 180) push({ type: 'text', role: role === 'link' ? 'link' : role === 'button' ? 'button-label' : role === 'heading' ? 'heading' : 'text', tag: el.tagName.toLowerCase(), name: text.slice(0, 96), text, rect, style: styleOf(style) });
    });
    const seen = new Set(); const unique = [];
    layers.sort((a, b) => a.order - b.order).forEach((layer) => { const fp = [layer.type, layer.role, layer.text || layer.name, Math.round(layer.rect.x / 4), Math.round(layer.rect.y / 4), Math.round(layer.rect.w / 4), Math.round(layer.rect.h / 4)].join('|'); if (seen.has(fp)) return; seen.add(fp); unique.push(layer); });
    return { title: document.title || location.hostname, url: location.href, viewport, pageHeight, layers: unique };
  });
  for (const layer of payload.layers) { if (layer.type !== 'image' || !layer.captureId) continue; try { const handle = await page.$('[data-ti-img-id="' + layer.captureId + '"]'); if (!handle) continue; const bytes = await handle.screenshot({ type: 'png' }); layer.image = { contentType: 'image/png', base64: bytes.toString('base64'), bytes: bytes.length }; } catch (_) {} }
  payload.sections = buildSections(payload.layers, payload.viewport, payload.pageHeight);
  payload.rebuildPlan = buildPlan(payload);
  return payload;
}
async function compile(target) {
  const targetUrl = normalizeUrl(target); if (!targetUrl) throw new Error('Missing url query parameter.');
  const browser = await getBrowser(); const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try { await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 }); try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {} await page.waitForTimeout(1600); await page.evaluate(async () => { await new Promise((resolve) => { let total = 0; const step = 700; const max = Math.min(14000, Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0)); const timer = setInterval(() => { scrollBy(0, step); total += step; if (total >= max) { clearInterval(timer); scrollTo(0, 0); resolve(); } }, 70); }); }); await page.waitForTimeout(700); const extracted = await extractPage(page); const shot = await page.screenshot({ type: 'png', fullPage: true }); return { ok: true, mode: MODE, publicVersion: PUBLIC_VERSION, adapter: 'translateit-alpha-v3-clean-structured-extraction', capturedAt: new Date().toISOString(), title: extracted.title, url: extracted.url, viewport: extracted.viewport, pageHeight: extracted.pageHeight, screenshot: { contentType: 'image/png', base64: shot.toString('base64'), width: extracted.viewport.width, height: extracted.pageHeight }, layers: extracted.layers, sections: extracted.sections, rebuildPlan: extracted.rebuildPlan, diagnostics: { layerCount: extracted.layers.length, sectionCount: extracted.sections.length, componentCount: 0, imageCount: extracted.layers.filter((x) => x.type === 'image').length, textCount: extracted.layers.filter((x) => x.type === 'text').length, rebuildPlanSectionCount: extracted.rebuildPlan.sections.length, colorTokenCount: extracted.rebuildPlan.tokens.colors.length, typographyTokenCount: extracted.rebuildPlan.tokens.typography.length, spacingTokenCount: extracted.rebuildPlan.tokens.spacing.length, radiusTokenCount: extracted.rebuildPlan.tokens.radius.length, componentBlueprintCount: extracted.rebuildPlan.componentBlueprints.length, overflowRiskCount: extracted.rebuildPlan.qualityHints.overflowRiskCount, denseSectionCount: extracted.rebuildPlan.qualityHints.denseSectionCount, responsiveCount: Object.keys(extracted.rebuildPlan.responsive || {}).length, templateIntentCount: new Set(extracted.rebuildPlan.sections.map((s) => s.templateIntent).filter(Boolean)).size }, outputRules: ['01 Structured Visual Clone / Main Output: editable section groups.', '02 Screenshot Reference / Pure Source: locked screenshot.', '03 UI Framework: supporting tokens/components.', '04 Rebuild Plan: semantic notes.', '05 Audit: diagnostics.'], warnings: ['Version 0.1 - Alpha is design-only.', 'Post-import Figma visual validation is required.'] }; } finally { await page.close(); }
}
const server = http.createServer(async (req, res) => { if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }); res.end(); return; } const requestUrl = new URL(req.url, 'http://127.0.0.1:' + PORT); if (requestUrl.pathname === '/health') return json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: MODE, publicVersion: PUBLIC_VERSION, adapter: 'alpha-v3-clean-structured-extraction', port: PORT }); if (requestUrl.pathname !== '/render') return json(res, 404, { ok: false, error: 'Use /render?url=https://example.com' }); try { json(res, 200, await compile(requestUrl.searchParams.get('url'))); } catch (error) { json(res, 500, { ok: false, error: error && error.stack ? error.stack : String(error) }); } });
server.listen(PORT, '127.0.0.1', () => console.log('TranslateIT ' + PUBLIC_VERSION + ' Alpha V3 Clean Bridge running at http://127.0.0.1:' + PORT));
