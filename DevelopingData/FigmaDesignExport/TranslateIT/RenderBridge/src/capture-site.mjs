import { chromium } from 'playwright';
import { DEFAULT_VIEWPORT, normalizeUrl } from './shared-contract.mjs';

let browserPromise;
async function getBrowser() { if (!browserPromise) browserPromise = chromium.launch({ headless: true }); return browserPromise; }
function toBase64(buffer) { return Buffer.from(buffer).toString('base64'); }
async function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function stabilizePage(page) {
  const diagnostics = { animationsFrozen: false, lazyScrollPasses: 0, imageCount: 0, imageLoadedCount: 0, imageBrokenCount: 0, fontReady: false, finalScrollY: 0 };
  await page.addStyleTag({ content: `*,*::before,*::after{animation-duration:0.001s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:0s!important;transition-delay:0s!important;scroll-behavior:auto!important;caret-color:transparent!important}video,canvas{animation:none!important}` }).then(() => { diagnostics.animationsFrozen = true; }).catch(() => {});
  await page.evaluate(() => { try { document.documentElement.style.scrollBehavior = 'auto'; } catch {} try { document.querySelectorAll('video').forEach((video) => { video.pause(); video.currentTime = 0; }); } catch {} try { document.querySelectorAll('[loading="lazy"]').forEach((el) => el.setAttribute('loading', 'eager')); } catch {} }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).then(() => { diagnostics.fontReady = true; }).catch(() => {});
  const pageHeight = await page.evaluate(() => Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, innerHeight)).catch(() => 0);
  const viewportHeight = await page.evaluate(() => innerHeight).catch(() => 900);
  const maxScroll = Math.max(0, pageHeight - viewportHeight);
  const steps = Math.min(8, Math.max(1, Math.ceil(pageHeight / Math.max(1, viewportHeight))));
  for (let i = 0; i <= steps; i += 1) { const y = Math.round(maxScroll * (i / steps)); await page.evaluate((nextY) => window.scrollTo(0, nextY), y).catch(() => {}); diagnostics.lazyScrollPasses += 1; await sleep(180); }
  await page.evaluate(() => Promise.all(Array.from(document.images || []).map(async (img) => { try { if (img.decode) await img.decode(); } catch {} }))).catch(() => {});
  const imageStats = await page.evaluate(() => { const images = Array.from(document.images || []); return { imageCount: images.length, imageLoadedCount: images.filter((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0).length, imageBrokenCount: images.filter((img) => img.complete && (!img.naturalWidth || !img.naturalHeight)).length }; }).catch(() => ({ imageCount: 0, imageLoadedCount: 0, imageBrokenCount: 0 }));
  Object.assign(diagnostics, imageStats);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await sleep(250);
  diagnostics.finalScrollY = await page.evaluate(() => window.scrollY || 0).catch(() => 0);
  return diagnostics;
}

function isSliceCandidate(item, raw) {
  const rect = item.rect || {};
  const area = Math.max(0, rect.w || 0) * Math.max(0, rect.h || 0);
  if (area < 14000 || rect.w < 90 || rect.h < 70) return false;
  if (rect.h > raw.pageHeight * 0.62) return false;
  if (rect.w > raw.viewport.width * 1.04) return false;
  if (item.role === 'image') return false;
  const bg = String(item.style?.backgroundColor || '');
  const bgImg = String(item.style?.backgroundImage || '');
  const shadow = String(item.style?.boxShadow || '');
  const hasVisualSurface = item.role === 'container' || item.role === 'navigation' || item.role === 'footer' || (bg && !/transparent|rgba\(0, 0, 0, 0\)/i.test(bg)) || (bgImg && bgImg !== 'none') || (shadow && shadow !== 'none');
  const hasGroupedContent = (item.childElementCount || 0) >= 2 && String(item.text || '').length <= 700;
  return hasVisualSurface || hasGroupedContent;
}
function isBackgroundAssetCandidate(item) {
  const rect = item.rect || {};
  const area = Math.max(0, rect.w || 0) * Math.max(0, rect.h || 0);
  const bg = String(item.style?.backgroundImage || '');
  if (!bg || bg === 'none' || !/url\(/i.test(bg)) return false;
  if (area < 9000 || rect.w < 80 || rect.h < 60) return false;
  return true;
}
function isIconAssetCandidate(item) {
  const rect = item.rect || {};
  const area = Math.max(0, rect.w || 0) * Math.max(0, rect.h || 0);
  if (area < 100 || area > 90000) return false;
  if (Number.isFinite(item.imageIndex) && item.imageIndex >= 0) return false;
  const hint = `${item.tag || ''} ${item.alt || ''} ${item.className || ''} ${item.directText || ''}`.toLowerCase();
  if (item.tag === 'svg' || item.role === 'image') return true;
  return /logo|icon|brand|mark|symbol/.test(hint) && rect.w >= 8 && rect.h >= 8;
}
function iconKind(item) {
  const hint = `${item.alt || ''} ${item.className || ''} ${item.directText || ''}`.toLowerCase();
  if (/logo|brand|mark/.test(hint) || (item.rect?.y || 9999) < 160) return 'logo-icon';
  if (item.tag === 'svg') return 'svg-icon';
  return 'icon-image';
}

export async function captureSite(inputUrl, options = {}) {
  const url = normalizeUrl(inputUrl);
  if (!url) throw new Error('URL is required.');
  const viewport = options.viewport || DEFAULT_VIEWPORT;
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options.timeout || 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    const captureDiagnostics = await stabilizePage(page);
    await page.evaluate(() => { Array.from(document.images || []).forEach((img, index) => img.setAttribute('data-translateit-image-index', String(index))); });

    const raw = await page.evaluate(() => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const parseColor = (value) => String(value || '').trim();
      const directTextOf = (el) => clean(Array.from(el.childNodes || []).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent || '').join(' '));
      const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }; };
      const imageMetaOf = (el, style, rect) => { const tag = String(el.tagName || '').toLowerCase(); if (tag !== 'img') return null; const naturalWidth = Number(el.naturalWidth || 0); const naturalHeight = Number(el.naturalHeight || 0); const renderedRatio = rect.w && rect.h ? Number((rect.w / rect.h).toFixed(4)) : 0; const naturalRatio = naturalWidth && naturalHeight ? Number((naturalWidth / naturalHeight).toFixed(4)) : 0; return { naturalWidth, naturalHeight, renderedRatio, naturalRatio, objectFit: style.objectFit || 'fill', objectPosition: style.objectPosition || '50% 50%', aspectDrift: naturalRatio && renderedRatio ? Number(Math.abs(naturalRatio - renderedRatio).toFixed(4)) : 0 }; };
      const visible = (el) => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); if (s.display === 'none' || s.visibility === 'hidden') return false; if (Number(s.opacity || 1) <= 0.03) return false; if (r.width < 3 || r.height < 3) return false; return true; };
      const roleOf = (el, text, directText, style, rect, childElementCount) => { const tag = String(el.tagName || '').toLowerCase(); const cls = String(el.className || ''); const aria = String(el.getAttribute('aria-label') || ''); const id = String(el.id || ''); const hint = `${tag} ${cls} ${aria} ${id}`.toLowerCase(); if (tag === 'img' || tag === 'picture' || tag === 'svg') return 'image'; if (tag === 'button' || el.getAttribute('role') === 'button' || /\b(btn|button|cta)\b/i.test(cls)) return 'button'; if (tag === 'a' && text.length <= 96) return 'link'; if (/header|nav|navbar|menu/.test(hint) && rect.y < 260) return 'navigation'; if (/footer/.test(hint)) return 'footer'; if (/h1/.test(tag)) return 'heading-1'; if (/h2/.test(tag)) return 'heading-2'; if (/h3|h4/.test(tag)) return 'heading-3'; if (/^(p|span|strong|em|small|label|li)$/i.test(tag) && text && text.length <= 260) return 'text'; if (directText && directText.length <= 180 && childElementCount <= 2) return 'text'; const hasBg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent'; const hasBgImage = style.backgroundImage && style.backgroundImage !== 'none' && /url\(/i.test(style.backgroundImage); const hasShadow = style.boxShadow && style.boxShadow !== 'none'; const hasBorder = parseFloat(style.borderTopWidth || '0') + parseFloat(style.borderRightWidth || '0') + parseFloat(style.borderBottomWidth || '0') + parseFloat(style.borderLeftWidth || '0') > 0; if ((hasBg || hasBgImage || hasShadow || hasBorder) && rect.w * rect.h > 10000) return 'container'; return 'decorative'; };
      const nodes = Array.from(document.querySelectorAll('body *')).filter(visible);
      nodes.forEach((el, index) => el.setAttribute('data-translateit-raw-index', String(index)));
      const elements = nodes.map((el, index) => {
        const style = getComputedStyle(el); const rect = rectOf(el); const text = clean(el.innerText || el.textContent || ''); const directText = directTextOf(el); const childElementCount = el.children ? el.children.length : 0; const tag = String(el.tagName || '').toLowerCase(); const role = roleOf(el, text, directText, style, rect, childElementCount);
        return { id: `raw-${index}`, rawIndex: index, index, tag, role, text: text.slice(0, 320), directText: directText.slice(0, 220), childElementCount, textDensity: text.length ? Number((text.length / Math.max(1, rect.w * rect.h)).toFixed(6)) : 0, rect, area: rect.w * rect.h, imageIndex: tag === 'img' ? Number(el.getAttribute('data-translateit-image-index') || -1) : null, imageMeta: imageMetaOf(el, style, rect), alt: clean(el.getAttribute('alt') || el.getAttribute('aria-label') || el.getAttribute('title') || ''), href: el.href || '', className: String(el.className || ''), style: { color: parseColor(style.color), backgroundColor: parseColor(style.backgroundColor), backgroundImage: String(style.backgroundImage || ''), backgroundSize: style.backgroundSize, backgroundPosition: style.backgroundPosition, backgroundRepeat: style.backgroundRepeat, fontSize: style.fontSize, fontWeight: style.fontWeight, fontFamily: style.fontFamily, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, textTransform: style.textTransform, whiteSpace: style.whiteSpace, wordBreak: style.wordBreak, overflowWrap: style.overflowWrap, opacity: style.opacity, overflow: style.overflow, textAlign: style.textAlign, display: style.display, position: style.position, zIndex: style.zIndex, borderRadius: style.borderRadius, borderWidth: style.borderWidth, borderColor: style.borderColor, borderStyle: style.borderStyle, borderTopWidth: style.borderTopWidth, borderRightWidth: style.borderRightWidth, borderBottomWidth: style.borderBottomWidth, borderLeftWidth: style.borderLeftWidth, borderTopColor: style.borderTopColor, borderRightColor: style.borderRightColor, borderBottomColor: style.borderBottomColor, borderLeftColor: style.borderLeftColor, boxShadow: style.boxShadow, filter: style.filter, backdropFilter: style.backdropFilter, objectFit: style.objectFit, objectPosition: style.objectPosition } };
      }).filter((item) => {
        if (item.role === 'decorative') return item.area >= 16000 && item.area < innerWidth * Math.max(innerHeight, document.documentElement.scrollHeight) * 0.85;
        if (item.role === 'container') return item.area >= 12000;
        if (item.role === 'image') return item.tag === 'svg' ? item.area >= 100 : item.area >= 900;
        if (item.role === 'navigation') return item.text.length <= 160 && item.rect.w >= 8 && item.rect.h >= 8;
        if (item.role === 'footer') return item.text.length <= 260 && item.rect.w >= 8 && item.rect.h >= 8;
        if (item.text) return item.rect.w >= 8 && item.rect.h >= 8;
        return false;
      }).slice(0, 300);
      const title = clean(document.title || location.hostname);
      const pageHeight = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, innerHeight);
      return { title, finalUrl: location.href, viewport: { width: innerWidth, height: innerHeight }, pageHeight, elements };
    });

    const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png', animations: 'disabled' });
    const screenshot = { contentType: 'image/png', base64: toBase64(screenshotBuffer), width: raw.viewport.width, height: raw.pageHeight };
    const imageAssets = [];
    const imageElements = raw.elements.filter((item) => item.role === 'image' && Number.isFinite(item.imageIndex)).slice(0, 24);
    for (const item of imageElements) {
      try { const handle = await page.$(`[data-translateit-image-index="${item.imageIndex}"]`); if (!handle) continue; const box = await handle.boundingBox(); if (!box || box.width < 12 || box.height < 12) continue; const buffer = await handle.screenshot({ type: 'png', animations: 'disabled' }); imageAssets.push({ id: `asset-image-${item.imageIndex}`, kind: 'image', imageIndex: item.imageIndex, name: item.alt || `Image ${item.imageIndex + 1}`, rect: item.rect, imageMeta: item.imageMeta || null, contentType: 'image/png', base64: toBase64(buffer), width: Math.round(box.width), height: Math.round(box.height), naturalWidth: item.imageMeta?.naturalWidth || Math.round(box.width), naturalHeight: item.imageMeta?.naturalHeight || Math.round(box.height), objectFit: item.imageMeta?.objectFit || 'cover', objectPosition: item.imageMeta?.objectPosition || '50% 50%' }); } catch (_) {}
    }
    const iconAssets = [];
    const iconElements = raw.elements.filter(isIconAssetCandidate).sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x)).slice(0, 36);
    for (const item of iconElements) {
      try { const handle = await page.$(`[data-translateit-raw-index="${item.rawIndex}"]`); if (!handle) continue; const box = await handle.boundingBox(); if (!box || box.width < 8 || box.height < 8) continue; const buffer = await handle.screenshot({ type: 'png', animations: 'disabled' }); const kind = iconKind(item); const id = `asset-${kind}-${item.rawIndex}`; iconAssets.push({ id, kind, rawIndex: item.rawIndex, name: item.alt || item.directText || item.className || `${kind} ${item.rawIndex}`, rect: item.rect, contentType: 'image/png', base64: toBase64(buffer), width: Math.round(box.width), height: Math.round(box.height), naturalWidth: Math.round(box.width), naturalHeight: Math.round(box.height), objectFit: 'contain', objectPosition: '50% 50%' }); } catch (_) {}
    }
    const backgroundAssets = [];
    const backgroundElements = raw.elements.filter(isBackgroundAssetCandidate).sort((a, b) => (b.area || 0) - (a.area || 0)).slice(0, 18);
    for (const item of backgroundElements) {
      try { const handle = await page.$(`[data-translateit-raw-index="${item.rawIndex}"]`); if (!handle) continue; const box = await handle.boundingBox(); if (!box || box.width < 40 || box.height < 40) continue; const buffer = await handle.screenshot({ type: 'png', animations: 'disabled' }); const id = `asset-background-${item.rawIndex}`; item.backgroundAssetId = id; backgroundAssets.push({ id, kind: 'background-image', rawIndex: item.rawIndex, name: item.alt || item.directText || item.text?.slice(0, 48) || `Background ${item.rawIndex}`, rect: item.rect, contentType: 'image/png', base64: toBase64(buffer), width: Math.round(box.width), height: Math.round(box.height), naturalWidth: Math.round(box.width), naturalHeight: Math.round(box.height), objectFit: /contain/i.test(item.style?.backgroundSize || '') ? 'contain' : 'cover', objectPosition: item.style?.backgroundPosition || '50% 50%' }); } catch (_) {}
    }
    const componentAssets = [];
    const sliceCandidates = raw.elements.filter((item) => isSliceCandidate(item, raw)).sort((a, b) => (b.area || 0) - (a.area || 0)).slice(0, 18);
    for (const item of sliceCandidates) {
      try { const handle = await page.$(`[data-translateit-raw-index="${item.rawIndex}"]`); if (!handle) continue; const box = await handle.boundingBox(); if (!box || box.width < 40 || box.height < 40) continue; const buffer = await handle.screenshot({ type: 'png', animations: 'disabled' }); const id = `asset-component-${item.rawIndex}`; item.componentAssetId = id; componentAssets.push({ id, kind: 'component-slice', rawIndex: item.rawIndex, name: item.alt || item.directText || item.text?.slice(0, 48) || `Component ${item.rawIndex}`, rect: item.rect, contentType: 'image/png', base64: toBase64(buffer), width: Math.round(box.width), height: Math.round(box.height), naturalWidth: Math.round(box.width), naturalHeight: Math.round(box.height), objectFit: 'fill', objectPosition: '50% 50%' }); } catch (_) {}
    }
    captureDiagnostics.iconAssetCount = iconAssets.length;
    captureDiagnostics.backgroundAssetCount = backgroundAssets.length;
    captureDiagnostics.componentSliceCount = componentAssets.length;
    return { source: { url, finalUrl: raw.finalUrl, title: raw.title, viewport: raw.viewport, pageHeight: raw.pageHeight, screenshot, captureDiagnostics }, rawElements: raw.elements, assets: imageAssets.concat(iconAssets).concat(backgroundAssets).concat(componentAssets) };
  } finally { await page.close().catch(() => {}); }
}
