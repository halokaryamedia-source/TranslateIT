const TEXT_ROLES = new Set(['heading-1', 'heading-2', 'heading-3', 'text', 'link', 'button', 'navigation', 'footer']);

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function num(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || '').replace('px', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function area(rect) {
  return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0);
}

function hasSurface(item) {
  const bg = String(item.style?.backgroundColor || '').trim();
  if (!bg || /transparent|rgba\(0, 0, 0, 0\)/i.test(bg)) return false;
  return true;
}

function intersects(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

function contains(parent, child, pad = 2) {
  if (!parent || !child) return false;
  return child.x >= parent.x - pad && child.y >= parent.y - pad && child.x + child.w <= parent.x + parent.w + pad && child.y + child.h <= parent.y + parent.h + pad;
}

function normalizeTextKey(text) {
  return clean(text).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ').trim();
}

function isTextish(item) {
  return TEXT_ROLES.has(item.role) && clean(item.text).length > 0;
}

function isLikelyParentText(item) {
  const text = clean(item.text);
  const direct = clean(item.directText);
  const tag = String(item.tag || '').toLowerCase();
  if (!isTextish(item)) return false;
  if (/^h[1-6]$|^p$|^a$|^button$|^span$|^strong$|^em$|^small$|^label$|^li$/.test(tag)) return false;
  if (item.childElementCount >= 3 && text.length > Math.max(80, direct.length + 60)) return true;
  if (item.area > 180000 && text.length > 90 && direct.length < text.length * 0.45) return true;
  if ((item.role === 'navigation' || item.role === 'footer') && text.length > 180 && item.childElementCount >= 3) return true;
  return false;
}

function importance(item, source) {
  const rect = item.rect || {};
  const font = num(item.style?.fontSize, 14);
  const weight = num(item.style?.fontWeight, 400);
  const text = clean(item.text);
  let score = 0;
  score += Math.min(80, font * 2.5);
  score += Math.min(60, text.length * 0.35);
  score += Math.min(45, area(rect) / 12000);
  if (rect.y < source.viewport.height * 0.8) score += 35;
  if (item.role === 'heading-1') score += 90;
  if (item.role === 'heading-2') score += 60;
  if (item.role === 'heading-3') score += 35;
  if (item.role === 'button') score += 30;
  if (item.role === 'image') score += 45;
  if (item.role === 'navigation') score += 18;
  if (item.role === 'footer') score += 8;
  if (item.role === 'container' || item.role === 'decorative') score += hasSurface(item) ? 32 : 0;
  if (weight >= 600) score += 18;
  if (text.length > 220) score -= 45;
  if (font < 9 && item.role !== 'link') score -= 25;
  if (isLikelyParentText(item)) score -= 120;
  return Math.round(score);
}

function removeParentTextContainers(items) {
  return items.filter((item) => {
    if (!isLikelyParentText(item)) return true;
    const key = normalizeTextKey(item.text);
    const childTextItems = items.filter((other) => {
      if (other.id === item.id || !isTextish(other)) return false;
      if (!contains(item.rect, other.rect, 8)) return false;
      const otherKey = normalizeTextKey(other.text);
      return otherKey && key.includes(otherKey) && otherKey.length >= 3;
    });
    return childTextItems.length < 2;
  });
}

function removeDuplicateText(items) {
  const sorted = [...items].sort((a, b) => b.importance - a.importance);
  const seen = new Map();
  const out = [];
  for (const item of sorted) {
    const text = clean(item.text);
    if (!text || !TEXT_ROLES.has(item.role)) {
      out.push(item);
      continue;
    }
    const key = normalizeTextKey(text);
    if (!key) continue;
    const existing = seen.get(key);
    if (existing) continue;
    const childDuplicate = out.find((other) => {
      if (!clean(other.text) || !TEXT_ROLES.has(other.role)) return false;
      if (!contains(item.rect, other.rect, 4)) return false;
      const otherText = normalizeTextKey(other.text);
      return key.includes(otherText) && otherText.length >= 3;
    });
    if (childDuplicate && item.importance <= childDuplicate.importance + 35) continue;
    const parentDuplicate = out.find((other) => {
      if (!clean(other.text) || !TEXT_ROLES.has(other.role)) return false;
      if (!contains(other.rect, item.rect, 4)) return false;
      const otherText = normalizeTextKey(other.text);
      return otherText.includes(key) || key.includes(otherText);
    });
    if (parentDuplicate && parentDuplicate.importance >= item.importance) continue;
    seen.set(key, item.id);
    out.push(item);
  }
  return out.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

function deriveSemanticRole(item, source) {
  const text = clean(item.text);
  const rect = item.rect || {};
  const font = num(item.style?.fontSize, 14);
  const yRatio = rect.y / Math.max(1, source.pageHeight || 1);
  if ((item.role === 'container' || item.role === 'decorative') && hasSurface(item)) return 'container';
  if (item.role === 'image') return 'image';
  if (item.role === 'button') return 'button';
  if (item.role === 'navigation' || (rect.y < 180 && item.role === 'link')) return 'nav-item';
  if (item.role === 'footer' || yRatio > 0.78) return item.role === 'link' ? 'footer-link' : 'footer-text';
  if (item.role === 'heading-1' || font >= 34) return 'title';
  if (item.role === 'heading-2' || font >= 24) return 'section-title';
  if (item.role === 'heading-3' || font >= 18) return 'subheading';
  if (item.role === 'link') return 'link';
  if (text.length > 90) return 'body';
  return 'label';
}

function detectSections(items, source) {
  const width = source.viewport.width;
  const pageHeight = source.pageHeight;
  const ordered = [...items].sort((a, b) => a.rect.y - b.rect.y);
  const headerItems = ordered.filter((item) => item.rect.y < 180 && ['nav-item', 'link', 'label', 'button', 'title', 'container'].includes(item.semanticRole));
  const footerItems = ordered.filter((item) => item.rect.y > pageHeight * 0.72 || item.semanticRole?.startsWith('footer') || (item.semanticRole === 'container' && item.rect.y > pageHeight * 0.6));
  const heroCandidates = ordered.filter((item) => item.rect.y < Math.min(pageHeight * 0.45, 760) && ['title', 'body', 'button', 'image', 'container'].includes(item.semanticRole));

  const sections = [];
  if (headerItems.length) {
    const maxY = Math.max(...headerItems.map((item) => item.rect.y + item.rect.h), 96);
    sections.push({ id: 'section-header', role: 'header', name: 'Header / Navigation', rect: { x: 0, y: 0, w: width, h: Math.min(180, Math.max(84, maxY + 24)) } });
  }

  if (heroCandidates.length) {
    const minY = Math.min(...heroCandidates.map((item) => item.rect.y));
    const maxY = Math.max(...heroCandidates.map((item) => item.rect.y + item.rect.h));
    sections.push({ id: 'section-hero', role: 'hero', name: 'Hero / Primary', rect: { x: 0, y: Math.max(0, minY - 48), w: width, h: Math.min(860, Math.max(360, maxY - minY + 96)) } });
  }

  const reserved = sections.map((section) => section.rect);
  const contentItems = ordered.filter((item) => !reserved.some((rect) => contains(rect, item.rect, 16)) && !footerItems.includes(item));
  const clusters = [];
  for (const item of contentItems) {
    if (!['title', 'section-title', 'subheading', 'body', 'image', 'button', 'link', 'label', 'container'].includes(item.semanticRole)) continue;
    const last = clusters[clusters.length - 1];
    if (!last || item.rect.y - last.bottom > 260) {
      clusters.push({ top: item.rect.y, bottom: item.rect.y + item.rect.h, items: [item] });
    } else {
      last.items.push(item);
      last.bottom = Math.max(last.bottom, item.rect.y + item.rect.h);
    }
  }

  clusters.slice(0, 8).forEach((cluster, index) => {
    sections.push({ id: `section-content-${index + 1}`, role: index === 0 ? 'content' : 'content-block', name: index === 0 ? 'Content / Main' : `Content / Block ${index + 1}`, rect: { x: 0, y: Math.max(0, cluster.top - 56), w: width, h: Math.max(240, cluster.bottom - cluster.top + 112) } });
  });

  if (footerItems.length) {
    const minY = Math.min(...footerItems.map((item) => item.rect.y));
    const maxY = Math.max(...footerItems.map((item) => item.rect.y + item.rect.h));
    sections.push({ id: 'section-footer', role: 'footer', name: 'Footer', rect: { x: 0, y: Math.max(0, minY - 48), w: width, h: Math.max(220, maxY - minY + 96) } });
  }

  const deduped = [];
  for (const section of sections.sort((a, b) => a.rect.y - b.rect.y)) {
    const overlaps = deduped.find((other) => intersects(other.rect, section.rect) && other.role === section.role);
    if (!overlaps) deduped.push(section);
  }
  return deduped;
}

function attachSection(elements, sections) {
  return elements.map((item) => {
    const centerY = item.rect.y + item.rect.h / 2;
    const section = sections.find((candidate) => centerY >= candidate.rect.y - 24 && centerY <= candidate.rect.y + candidate.rect.h + 24) || sections[0];
    return { ...item, sectionId: section?.id || null };
  });
}

export function extractLayout(capture) {
  const source = capture.source;
  const raw = Array.isArray(capture.rawElements) ? capture.rawElements : [];
  let elements = raw.map((item) => ({ ...item, text: clean(item.text), directText: clean(item.directText), importance: importance(item, source) })).filter((item) => {
    if (!item.rect || area(item.rect) < 24) return false;
    if (isLikelyParentText(item)) return false;
    if (item.role === 'decorative') return hasSurface(item) && item.area >= 16000;
    if (item.role === 'container') return hasSurface(item) && item.area >= 6000;
    if (item.role === 'image') return item.area >= 5000;
    if (TEXT_ROLES.has(item.role)) return clean(item.text).length > 0;
    return false;
  });

  elements = removeParentTextContainers(elements);
  elements = removeDuplicateText(elements);
  elements = elements.map((item) => ({ ...item, semanticRole: deriveSemanticRole(item, source) }));
  elements = elements.filter((item) => {
    if (item.semanticRole === 'container') return true;
    if (item.semanticRole === 'label' && item.text.length <= 1) return false;
    if (item.semanticRole === 'body' && item.text.length < 18) return false;
    if (item.semanticRole === 'footer-text' && item.text.length < 2) return false;
    return true;
  });

  const sections = detectSections(elements, source);
  elements = attachSection(elements, sections);

  return { source, sections, elements, assets: capture.assets || [], stats: { rawElements: raw.length, keptElements: elements.length, sections: sections.length, images: elements.filter((item) => item.semanticRole === 'image').length, surfaces: elements.filter((item) => item.semanticRole === 'container').length, text: elements.filter((item) => ['title', 'section-title', 'subheading', 'body', 'label', 'link', 'nav-item', 'footer-link', 'footer-text'].includes(item.semanticRole)).length, removedParentText: raw.filter(isLikelyParentText).length } };
}
