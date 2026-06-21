function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function number(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || '').replace('px', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cssColor(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return '';
  const hex = raw.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
  if (hex) return hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (!rgba) return '';
  const parts = rgba[1].split(',').map((item) => Number.parseFloat(item));
  if (parts.length < 3 || parts[3] === 0) return '';
  return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}

function unique(items, limit = 16) { const seen = new Set(); const out = []; for (const item of items) { const value = clean(item); const key = value.toLowerCase(); if (!value || seen.has(key)) continue; seen.add(key); out.push(value); if (out.length >= limit) break; } return out; }
function assetForElement(element, assets) { if (element.imageIndex == null || element.imageIndex < 0) return null; return assets.find((asset) => asset.imageIndex === element.imageIndex) || null; }

function normalizeElement(element, assets) {
  const style = element.style || {};
  const semantic = element.semanticRole || 'element';
  const base = {
    id: `el-${element.index}`,
    type: 'text',
    role: semantic,
    name: 'Element',
    sectionId: element.sectionId || null,
    rect: element.rect,
    source: { childElementCount: element.childElementCount || 0, directText: clean(element.directText), textDensity: element.textDensity || 0, tag: element.tag || '', position: style.position || '', zIndex: style.zIndex || '' },
    style: { color: cssColor(style.color) || '#111827', backgroundColor: cssColor(style.backgroundColor), fontSize: number(style.fontSize, 14), fontWeight: number(style.fontWeight, 400), fontFamily: clean(style.fontFamily).split(',')[0]?.replace(/["']/g, '') || 'Inter', lineHeight: number(style.lineHeight, 0), borderRadius: number(style.borderRadius, 0), textAlign: style.textAlign || 'left', position: style.position || '', zIndex: style.zIndex || '' }
  };
  if (semantic === 'image') { const asset = assetForElement(element, assets); return { ...base, type: 'image', role: 'image', name: `Image / ${clean(element.alt) || asset?.name || element.index}`, assetId: asset?.id || null, alt: clean(element.alt || asset?.name || '') }; }
  if (semantic === 'button') return { ...base, type: 'button', role: 'button', name: `Button / ${clean(element.text).slice(0, 36)}`, text: clean(element.text).slice(0, 80) };
  if (semantic === 'nav-item' || semantic === 'footer-link' || semantic === 'link') return { ...base, type: 'text', role: semantic, name: `${semantic === 'nav-item' ? 'Nav Item' : semantic === 'footer-link' ? 'Footer Link' : 'Link'} / ${clean(element.text).slice(0, 36)}`, text: clean(element.text).slice(0, 120) };
  if (semantic === 'title' || semantic === 'section-title' || semantic === 'subheading' || semantic === 'body' || semantic === 'label' || semantic === 'footer-text') return { ...base, type: 'text', role: semantic, name: `${semantic.replace('-', ' ')} / ${clean(element.text).slice(0, 42)}`, text: clean(element.text).slice(0, semantic === 'body' || semantic === 'footer-text' ? 260 : 140) };
  if (element.role === 'container') return { ...base, type: 'container', role: 'container', name: 'Container / Layout Surface' };
  return null;
}

function normalizeTextKey(value) { return clean(value).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ').trim(); }
function area(rect) { return Math.max(1, (rect?.w || 0) * (rect?.h || 0)); }
function overlapArea(a, b) { const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return x * y; }
function overlapRatio(a, b) { const overlap = overlapArea(a, b); if (!overlap) return 0; return overlap / Math.max(1, Math.min(area(a), area(b))); }
function contains(parent, child, pad = 4) { return child.x >= parent.x - pad && child.y >= parent.y - pad && child.x + child.w <= parent.x + parent.w + pad && child.y + child.h <= parent.y + parent.h + pad; }
function textWeight(item) { const roleScore = { title: 100, 'section-title': 85, subheading: 70, body: 55, button: 60, 'nav-item': 50, link: 45, label: 35, 'footer-link': 35, 'footer-text': 30 }; return (roleScore[item.role] || 20) + Math.min(50, item.text.length * 0.4) + Math.min(40, item.style.fontSize || 14) + (item.style.fontWeight >= 600 ? 15 : 0); }

function resolveAggregateText(elements) {
  const textItems = elements.filter((item) => item.type === 'text');
  const remove = new Set();
  for (const item of textItems) {
    if (remove.has(item.id)) continue;
    const key = normalizeTextKey(item.text);
    if (!key || key.length < 4) { remove.add(item.id); continue; }
    const related = textItems.filter((other) => {
      if (other.id === item.id || remove.has(other.id)) return false;
      const otherKey = normalizeTextKey(other.text);
      if (!otherKey || otherKey.length < 3) return false;
      const relatedByText = key.includes(otherKey) || otherKey.includes(key);
      const relatedBySpace = contains(item.rect, other.rect, 10) || contains(other.rect, item.rect, 10) || overlapRatio(item.rect, other.rect) > 0.55;
      return relatedByText && relatedBySpace;
    });
    if (related.length < 1) continue;
    const childLike = related.filter((other) => key.includes(normalizeTextKey(other.text)) && normalizeTextKey(other.text).length < key.length);
    const peerTextCount = childLike.length;
    const isCompositeTitle = ['title', 'section-title'].includes(item.role) && item.text.length <= 90 && peerTextCount >= 1;
    const isAggregateNavigation = ['label', 'body', 'nav-item', 'footer-text'].includes(item.role) && peerTextCount >= 2;
    const isLargeParent = area(item.rect) > 90000 && peerTextCount >= 1 && !isCompositeTitle;
    if (isCompositeTitle) { for (const child of childLike) { if (!['button', 'nav-item', 'footer-link'].includes(child.role)) remove.add(child.id); } continue; }
    if (isAggregateNavigation || isLargeParent) { remove.add(item.id); continue; }
    for (const other of related) { const otherKey = normalizeTextKey(other.text); if (otherKey === key) { const keep = textWeight(item) >= textWeight(other) ? item : other; const drop = keep.id === item.id ? other : item; remove.add(drop.id); } }
  }
  return elements.filter((item) => !remove.has(item.id));
}

function removeTextInsideImages(elements) { const images = elements.filter((item) => item.type === 'image'); if (!images.length) return elements; return elements.filter((item) => { if (item.type !== 'text') return true; const insideImage = images.find((image) => overlapRatio(item.rect, image.rect) > 0.72 || contains(image.rect, item.rect, 8)); if (!insideImage) return true; if (['title', 'section-title', 'body'].includes(item.role) && (item.style.fontSize || 0) >= 18) return true; return false; }); }

function removeUnsafeTextLayers(elements, page) {
  const textItems = elements.filter((item) => item.type === 'text');
  const out = [];
  const seen = new Set();
  for (const item of elements) {
    if (item.type !== 'text') { out.push(item); continue; }
    const key = normalizeTextKey(item.text);
    if (!key) continue;
    if (seen.has(key)) continue;
    const rectArea = area(item.rect);
    const pageArea = Math.max(1, page.width * page.height);
    const childCount = item.source?.childElementCount || 0;
    const directText = clean(item.source?.directText);
    const looksLikeParent = childCount >= 3 && item.text.length > Math.max(80, directText.length + 60);
    const tooLargeTextBox = rectArea > pageArea * 0.18 && item.text.length > 80 && !['title', 'section-title'].includes(item.role);
    const containsOtherText = textItems.some((other) => { if (other.id === item.id) return false; const otherKey = normalizeTextKey(other.text); if (!otherKey || otherKey.length < 3) return false; const inside = contains(item.rect, other.rect, 8) || overlapRatio(item.rect, other.rect) > 0.6; return inside && key.includes(otherKey); });
    if ((looksLikeParent || tooLargeTextBox) && containsOtherText) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function removeSevereTextCollisions(elements) {
  const textItems = elements.filter((item) => item.type === 'text');
  const remove = new Set();
  for (let i = 0; i < textItems.length; i += 1) {
    for (let j = i + 1; j < textItems.length; j += 1) {
      const a = textItems[i]; const b = textItems[j];
      if (a.sectionId !== b.sectionId) continue;
      if (remove.has(a.id) || remove.has(b.id)) continue;
      const ratio = overlapRatio(a.rect, b.rect);
      if (ratio < 0.34) continue;
      const ak = normalizeTextKey(a.text); const bk = normalizeTextKey(b.text);
      const relatedText = ak.includes(bk) || bk.includes(ak) || ak === bk;
      const bothHeadline = ['title', 'section-title', 'subheading'].includes(a.role) && ['title', 'section-title', 'subheading'].includes(b.role);
      if (!relatedText && !bothHeadline) continue;
      const keep = textWeight(a) >= textWeight(b) ? a : b;
      const drop = keep.id === a.id ? b : a;
      remove.add(drop.id);
    }
  }
  return elements.filter((item) => !remove.has(item.id));
}

function refineSectionRect(section, elements, source) { const inside = elements.filter((item) => item.sectionId === section.id); if (!inside.length) return section.rect; const minY = Math.min(...inside.map((item) => item.rect.y)); const maxY = Math.max(...inside.map((item) => item.rect.y + item.rect.h)); const y = Math.max(0, Math.min(section.rect.y, minY - 40)); const h = Math.max(section.rect.h, maxY - y + 52); return { x: 0, y, w: source.viewport.width, h: Math.min(h, source.pageHeight - y) }; }
function inferSectionIntent(section, elements) { const inside = elements.filter((item) => item.sectionId === section.id); const hasTitle = inside.some((item) => item.role === 'title' || item.role === 'section-title'); const imageCount = inside.filter((item) => item.type === 'image').length; const buttonCount = inside.filter((item) => item.type === 'button').length; if (section.role === 'header') return 'navigation-bar'; if (section.role === 'hero') return imageCount ? 'hero-with-media' : 'text-hero'; if (section.role === 'footer') return 'footer-link-groups'; if (imageCount >= 2) return 'gallery-or-card-grid'; if (hasTitle && buttonCount) return 'content-callout'; if (hasTitle) return 'content-section'; return 'content-block'; }
function buildTokens(elements, source) { const colors = unique(elements.flatMap((item) => [item.style?.color, item.style?.backgroundColor]).filter(Boolean).map(cssColor).filter(Boolean), 18); const fontSizes = unique(elements.map((item) => String(Math.round(number(item.style?.fontSize, 14)))).filter(Boolean), 10).map((value) => Number(value)); const radii = unique(elements.map((item) => String(Math.round(number(item.style?.borderRadius, 0)))).filter((value) => Number(value) > 0), 10).map((value) => Number(value)); return { colors: colors.length ? colors : ['#111827', '#FFFFFF', '#F4C84A', '#087A4B'], typography: fontSizes.sort((a, b) => b - a).map((size) => ({ name: `Font / ${size}`, size })), radius: radii.sort((a, b) => a - b).map((value) => ({ name: `Radius / ${value}`, value })), spacing: [4, 8, 12, 16, 24, 32, 48, 64].map((value) => ({ name: `Space / ${value}`, value })), sourceViewport: source.viewport }; }

function applySafetyLayout(model) { const elements = model.elements; for (const item of elements.filter((item) => item.type === 'text')) { item.layout = item.layout || {}; item.layout.wrap = true; item.layout.minWidth = Math.min(120, Math.max(40, item.rect.w)); item.layout.maxWidth = Math.max(item.rect.w, Math.min(model.page.width - 80, item.rect.w + 24)); } for (const item of elements.filter((entry) => entry.type === 'image')) { item.layout = { clip: true, objectFit: 'cover', maxHeight: Math.max(80, item.rect.h), preserveAspectIntent: true }; } return model; }

export function buildDesignModel(layout) {
  const source = layout.source;
  const assets = layout.assets || [];
  const page = { title: source.title || 'Imported Website', url: source.finalUrl || source.url, width: source.viewport.width, height: source.pageHeight, background: '#FFFFFF' };
  const normalizedRaw = layout.elements.map((item) => normalizeElement(item, assets)).filter(Boolean);
  const unsafeFiltered = removeUnsafeTextLayers(normalizedRaw, page);
  const aggregateFiltered = resolveAggregateText(unsafeFiltered);
  const imageFiltered = removeTextInsideImages(aggregateFiltered);
  const normalized = removeSevereTextCollisions(imageFiltered);
  const sections = layout.sections.map((section) => ({ id: section.id, role: section.role, name: section.name, rect: refineSectionRect(section, normalized, source), intent: inferSectionIntent(section, normalized), elementIds: normalized.filter((item) => item.sectionId === section.id).map((item) => item.id) })).filter((section) => section.elementIds.length || ['header', 'footer'].includes(section.role));
  const model = { page, sections, elements: normalized.filter((item) => sections.some((section) => section.id === item.sectionId)), assets, tokens: buildTokens(normalized, source), diagnostics: { rawElements: layout.stats.rawElements, keptElements: layout.stats.keptElements, sections: sections.length, assets: assets.length, textElements: normalized.filter((item) => item.type === 'text').length, imageElements: normalized.filter((item) => item.type === 'image').length, buttonElements: normalized.filter((item) => item.type === 'button').length, removedParentText: layout.stats.removedParentText || 0, removedUnsafeText: normalizedRaw.length - unsafeFiltered.length, removedAggregateText: unsafeFiltered.length - aggregateFiltered.length, removedImageOverlayText: aggregateFiltered.length - imageFiltered.length, removedCollisionText: imageFiltered.length - normalized.length, cssStackingPreserved: true } };
  return applySafetyLayout(model);
}
