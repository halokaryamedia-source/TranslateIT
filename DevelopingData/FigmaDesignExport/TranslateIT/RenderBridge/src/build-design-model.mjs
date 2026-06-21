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

function unique(items, limit = 16) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const value = clean(item);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function assetForElement(element, assets) {
  if (element.imageIndex == null || element.imageIndex < 0) return null;
  return assets.find((asset) => asset.imageIndex === element.imageIndex) || null;
}

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
    source: {
      childElementCount: element.childElementCount || 0,
      directText: clean(element.directText),
      textDensity: element.textDensity || 0,
      tag: element.tag || ''
    },
    style: {
      color: cssColor(style.color) || '#111827',
      backgroundColor: cssColor(style.backgroundColor),
      fontSize: number(style.fontSize, 14),
      fontWeight: number(style.fontWeight, 400),
      fontFamily: clean(style.fontFamily).split(',')[0]?.replace(/["']/g, '') || 'Inter',
      lineHeight: number(style.lineHeight, 0),
      borderRadius: number(style.borderRadius, 0),
      textAlign: style.textAlign || 'left'
    }
  };

  if (semantic === 'image') {
    const asset = assetForElement(element, assets);
    return {
      ...base,
      type: 'image',
      role: 'image',
      name: `Image / ${clean(element.alt) || asset?.name || element.index}`,
      assetId: asset?.id || null,
      alt: clean(element.alt || asset?.name || '')
    };
  }

  if (semantic === 'button') {
    return {
      ...base,
      type: 'button',
      role: 'button',
      name: `Button / ${clean(element.text).slice(0, 36)}`,
      text: clean(element.text).slice(0, 80)
    };
  }

  if (semantic === 'nav-item' || semantic === 'footer-link' || semantic === 'link') {
    return {
      ...base,
      type: 'text',
      role: semantic,
      name: `${semantic === 'nav-item' ? 'Nav Item' : semantic === 'footer-link' ? 'Footer Link' : 'Link'} / ${clean(element.text).slice(0, 36)}`,
      text: clean(element.text).slice(0, 120)
    };
  }

  if (semantic === 'title' || semantic === 'section-title' || semantic === 'subheading' || semantic === 'body' || semantic === 'label' || semantic === 'footer-text') {
    return {
      ...base,
      type: 'text',
      role: semantic,
      name: `${semantic.replace('-', ' ')} / ${clean(element.text).slice(0, 42)}`,
      text: clean(element.text).slice(0, semantic === 'body' || semantic === 'footer-text' ? 260 : 140)
    };
  }

  if (element.role === 'container') {
    return {
      ...base,
      type: 'container',
      role: 'container',
      name: 'Container / Layout Surface'
    };
  }

  return null;
}

function normalizeTextKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ').trim();
}

function removeUnsafeTextLayers(elements, page) {
  const textItems = elements.filter((item) => item.type === 'text');
  const out = [];
  const seen = new Set();
  for (const item of elements) {
    if (item.type !== 'text') {
      out.push(item);
      continue;
    }
    const key = normalizeTextKey(item.text);
    if (!key) continue;
    if (seen.has(key)) continue;
    const rectArea = Math.max(1, (item.rect?.w || 0) * (item.rect?.h || 0));
    const pageArea = Math.max(1, page.width * page.height);
    const childCount = item.source?.childElementCount || 0;
    const directText = clean(item.source?.directText);
    const looksLikeParent = childCount >= 3 && item.text.length > Math.max(80, directText.length + 60);
    const tooLargeTextBox = rectArea > pageArea * 0.18 && item.text.length > 80 && !['title', 'section-title'].includes(item.role);
    const containsOtherText = textItems.some((other) => {
      if (other.id === item.id) return false;
      const otherKey = normalizeTextKey(other.text);
      if (!otherKey || otherKey.length < 3) return false;
      const inside = other.rect.x >= item.rect.x - 4 && other.rect.y >= item.rect.y - 4 && other.rect.x + other.rect.w <= item.rect.x + item.rect.w + 4 && other.rect.y + other.rect.h <= item.rect.y + item.rect.h + 4;
      return inside && key.includes(otherKey);
    });
    if ((looksLikeParent || tooLargeTextBox) && containsOtherText) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function refineSectionRect(section, elements, source) {
  const inside = elements.filter((item) => item.sectionId === section.id);
  if (!inside.length) return section.rect;
  const minY = Math.min(...inside.map((item) => item.rect.y));
  const maxY = Math.max(...inside.map((item) => item.rect.y + item.rect.h));
  const y = Math.max(0, Math.min(section.rect.y, minY - 40));
  const h = Math.max(section.rect.h, maxY - y + 52);
  return { x: 0, y, w: source.viewport.width, h: Math.min(h, source.pageHeight - y) };
}

function inferSectionIntent(section, elements) {
  const inside = elements.filter((item) => item.sectionId === section.id);
  const hasTitle = inside.some((item) => item.role === 'title' || item.role === 'section-title');
  const imageCount = inside.filter((item) => item.type === 'image').length;
  const buttonCount = inside.filter((item) => item.type === 'button').length;
  if (section.role === 'header') return 'navigation-bar';
  if (section.role === 'hero') return imageCount ? 'hero-with-media' : 'text-hero';
  if (section.role === 'footer') return 'footer-link-groups';
  if (imageCount >= 2) return 'gallery-or-card-grid';
  if (hasTitle && buttonCount) return 'content-callout';
  if (hasTitle) return 'content-section';
  return 'content-block';
}

function buildTokens(elements, source) {
  const colors = unique(elements.flatMap((item) => [item.style?.color, item.style?.backgroundColor]).filter(Boolean).map(cssColor).filter(Boolean), 18);
  const fontSizes = unique(elements.map((item) => String(Math.round(number(item.style?.fontSize, 14)))).filter(Boolean), 10).map((value) => Number(value));
  const radii = unique(elements.map((item) => String(Math.round(number(item.style?.borderRadius, 0)))).filter((value) => Number(value) > 0), 10).map((value) => Number(value));
  return {
    colors: colors.length ? colors : ['#111827', '#FFFFFF', '#F4C84A', '#087A4B'],
    typography: fontSizes.sort((a, b) => b - a).map((size) => ({ name: `Font / ${size}`, size })),
    radius: radii.sort((a, b) => a - b).map((value) => ({ name: `Radius / ${value}`, value })),
    spacing: [4, 8, 12, 16, 24, 32, 48, 64].map((value) => ({ name: `Space / ${value}`, value })),
    sourceViewport: source.viewport
  };
}

function applySafetyLayout(model) {
  const elements = model.elements;
  const textItems = elements.filter((item) => item.type === 'text');
  for (const item of textItems) {
    item.layout = item.layout || {};
    item.layout.wrap = true;
    item.layout.minWidth = Math.min(120, Math.max(40, item.rect.w));
    item.layout.maxWidth = Math.max(item.rect.w, Math.min(model.page.width - 80, item.rect.w + 24));
  }
  for (const item of elements.filter((entry) => entry.type === 'image')) {
    item.layout = { clip: true, objectFit: 'cover', maxHeight: Math.max(80, item.rect.h), preserveAspectIntent: true };
  }
  return model;
}

export function buildDesignModel(layout) {
  const source = layout.source;
  const assets = layout.assets || [];
  const page = {
    title: source.title || 'Imported Website',
    url: source.finalUrl || source.url,
    width: source.viewport.width,
    height: source.pageHeight,
    background: '#FFFFFF'
  };
  const normalizedRaw = layout.elements.map((item) => normalizeElement(item, assets)).filter(Boolean);
  const normalized = removeUnsafeTextLayers(normalizedRaw, page);
  const sections = layout.sections.map((section) => ({
    id: section.id,
    role: section.role,
    name: section.name,
    rect: refineSectionRect(section, normalized, source),
    intent: inferSectionIntent(section, normalized),
    elementIds: normalized.filter((item) => item.sectionId === section.id).map((item) => item.id)
  })).filter((section) => section.elementIds.length || ['header', 'footer'].includes(section.role));

  const model = {
    page,
    sections,
    elements: normalized.filter((item) => sections.some((section) => section.id === item.sectionId)),
    assets,
    tokens: buildTokens(normalized, source),
    diagnostics: {
      rawElements: layout.stats.rawElements,
      keptElements: layout.stats.keptElements,
      sections: sections.length,
      assets: assets.length,
      textElements: normalized.filter((item) => item.type === 'text').length,
      imageElements: normalized.filter((item) => item.type === 'image').length,
      buttonElements: normalized.filter((item) => item.type === 'button').length,
      removedParentText: layout.stats.removedParentText || 0,
      removedUnsafeText: normalizedRaw.length - normalized.length
    }
  };

  return applySafetyLayout(model);
}
