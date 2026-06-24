function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function area(rect) {
  return Math.max(1, (rect?.w || 0) * (rect?.h || 0));
}

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function overlapRatio(a, b) {
  const overlap = overlapArea(a, b);
  if (!overlap) return 0;
  return overlap / Math.max(1, Math.min(area(a), area(b)));
}

function rawIndex(item) {
  const match = String(item.id || '').match(/^el-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function isHeroLikeSection(section) {
  return section && (section.role === 'hero' || section.role === 'content');
}

function isHeadlineFragment(text) {
  const value = clean(text);
  if (!value) return true;
  if (value.length <= 18) return true;
  const words = value.split(' ').filter(Boolean);
  if (words.length <= 2) return true;
  return false;
}

function isProtectedText(item) {
  if (['nav-item', 'footer-link', 'footer-text', 'button'].includes(item.role)) return true;
  if ((item.style?.fontSize || 0) < 12) return true;
  return false;
}

function shouldRemoveOccludedText(text, image, section) {
  if (!text || !image || text.type !== 'text' || image.type !== 'image') return false;
  if (text.sectionId !== image.sectionId) return false;
  if (!isHeroLikeSection(section)) return false;
  if (isProtectedText(text)) return false;
  const ratio = overlapRatio(text.rect, image.rect);
  if (ratio < 0.12) return false;
  const imagePaintsAfterText = rawIndex(image) > rawIndex(text);
  if (!imagePaintsAfterText) return false;
  if (ratio > 0.44) return true;
  if (isHeadlineFragment(text.text) && ratio > 0.16) return true;
  if (['title', 'section-title', 'subheading'].includes(text.role) && ratio > 0.28) return true;
  return false;
}

function groupSimilarText(elements) {
  const out = [];
  const remove = new Set();
  const textItems = elements.filter((item) => item.type === 'text' && ['title', 'section-title', 'subheading'].includes(item.role));
  for (let i = 0; i < textItems.length; i += 1) {
    const a = textItems[i];
    if (remove.has(a.id)) continue;
    for (let j = i + 1; j < textItems.length; j += 1) {
      const b = textItems[j];
      if (remove.has(b.id) || a.sectionId !== b.sectionId) continue;
      const sameBand = Math.abs((a.rect.y || 0) - (b.rect.y || 0)) < Math.max(22, Math.min(a.rect.h || 0, b.rect.h || 0));
      const horizontalNear = Math.abs((a.rect.x || 0) - (b.rect.x || 0)) < 120;
      const aText = clean(a.text).toLowerCase();
      const bText = clean(b.text).toLowerCase();
      const duplicate = aText && bText && (aText.includes(bText) || bText.includes(aText));
      if ((duplicate || sameBand) && horizontalNear) {
        const keep = clean(a.text).length >= clean(b.text).length ? a : b;
        const drop = keep.id === a.id ? b : a;
        remove.add(drop.id);
      }
    }
  }
  for (const item of elements) if (!remove.has(item.id)) out.push(item);
  return { elements: out, removed: remove.size };
}

export function guardHeroOcclusion(model) {
  const sections = model.sections || [];
  const sectionById = new Map(sections.map((section) => [section.id, section]));
  const elements = model.elements || [];
  const images = elements.filter((item) => item.type === 'image');
  const remove = new Set();

  for (const text of elements.filter((item) => item.type === 'text')) {
    for (const image of images) {
      const section = sectionById.get(text.sectionId);
      if (shouldRemoveOccludedText(text, image, section)) {
        remove.add(text.id);
        break;
      }
    }
  }

  const afterOcclusion = elements.filter((item) => !remove.has(item.id));
  const grouped = groupSimilarText(afterOcclusion);
  const nextElements = grouped.elements;
  const nextSections = sections.map((section) => ({
    ...section,
    elementIds: nextElements.filter((item) => item.sectionId === section.id).map((item) => item.id)
  })).filter((section) => section.elementIds.length || ['header', 'footer'].includes(section.role));

  return {
    ...model,
    sections: nextSections,
    elements: nextElements.filter((item) => nextSections.some((section) => section.id === item.sectionId)),
    diagnostics: {
      ...(model.diagnostics || {}),
      removedHeroOccludedText: remove.size,
      removedHeadlineCollisionText: grouped.removed,
      heroOcclusionGuard: true
    }
  };
}
