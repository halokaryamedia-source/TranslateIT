function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function area(rect) {
  return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0);
}

function hasVisibleBackground(item) {
  const bg = String(item.style?.backgroundColor || '').trim();
  return bg && !/rgba\(0, 0, 0, 0\)|transparent/i.test(bg);
}

function visualType(item) {
  if (item.role === 'image') return 'image-region';
  if (item.role === 'button') return 'button-region';
  if (['heading-1', 'heading-2', 'heading-3', 'text', 'link', 'navigation', 'footer'].includes(item.role) && clean(item.text)) return 'text-region';
  if (['container', 'decorative'].includes(item.role) || hasVisibleBackground(item)) return 'shape-region';
  return 'unknown-region';
}

function confidenceReason(item, pageArea) {
  const reasons = [];
  const rectArea = area(item.rect);
  if (item.role === 'image') reasons.push('image-role');
  if (item.role === 'button') reasons.push('button-role');
  if (clean(item.text)) reasons.push('visible-text');
  if (hasVisibleBackground(item)) reasons.push('visible-background');
  if (rectArea > 3000) reasons.push('meaningful-area');
  if (rectArea > pageArea * 0.01) reasons.push('large-surface');
  if (!reasons.length) reasons.push('low-signal-visible-rect');
  return reasons;
}

function scoreBlock(item, pageArea) {
  const rectArea = area(item.rect);
  let score = 0.42;
  if (item.role === 'image') score += 0.2;
  if (item.role === 'button') score += 0.14;
  if (clean(item.text)) score += 0.18;
  if (rectArea > 3000) score += 0.08;
  if (rectArea > pageArea * 0.01) score += 0.06;
  if (hasVisibleBackground(item)) score += 0.08;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function sectionBandFor(item, viewport, pageHeight) {
  const y = item.rect?.y || 0;
  const h = item.rect?.h || 0;
  if (y < 220) return 'header';
  if (y < Math.max(640, viewport.height * 0.65)) return 'hero';
  if (y + h > pageHeight - 420) return 'footer';
  return 'content';
}

function isImportantBlock(block, pageArea) {
  const blockArea = area(block.rect);
  if (block.type === 'image-region') return true;
  if (block.type === 'button-region') return true;
  if (block.type === 'text-region' && clean(block.text).length >= 2) return true;
  if (blockArea > pageArea * 0.006 && block.confidence >= 0.56) return true;
  return false;
}

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function coveredArea(blocks) {
  const ordered = blocks
    .filter((block) => block.rect && area(block.rect) > 0)
    .sort((a, b) => area(b.rect) - area(a.rect));
  let total = 0;
  const accepted = [];
  for (const block of ordered) {
    const blockArea = area(block.rect);
    const overlap = accepted.reduce((sum, item) => sum + overlapArea(block.rect, item.rect), 0);
    const effective = Math.max(0, blockArea - Math.min(blockArea, overlap));
    if (effective <= 0) continue;
    total += effective;
    accepted.push(block);
  }
  return total;
}

export function buildVisualModel(capture) {
  const viewport = capture.source?.viewport || { width: 1440, height: 1600 };
  const pageHeight = capture.source?.pageHeight || viewport.height;
  const pageArea = Math.max(1, viewport.width * pageHeight);
  const raw = capture.rawElements || [];
  const visualBlocks = raw
    .filter((item) => item.rect && area(item.rect) >= 24)
    .map((item) => {
      const blockArea = area(item.rect);
      const type = visualType(item);
      const reasons = confidenceReason(item, pageArea);
      return {
        id: `visual-${item.index}`,
        type,
        role: item.role,
        source: 'dom-derived-visible-geometry',
        confidenceReason: reasons,
        coverageArea: blockArea,
        isLargeSurface: blockArea > pageArea * 0.01,
        isTextCandidate: type === 'text-region',
        isImageCandidate: type === 'image-region',
        isContainerCandidate: type === 'shape-region' || type === 'button-region',
        rect: item.rect,
        text: clean(item.directText || item.text).slice(0, 180),
        matchedRawId: item.id,
        imageIndex: item.imageIndex,
        sectionBand: sectionBandFor(item, viewport, pageHeight),
        confidence: scoreBlock(item, pageArea),
        style: {
          color: item.style?.color || '',
          backgroundColor: item.style?.backgroundColor || '',
          fontSize: item.style?.fontSize || '',
          fontWeight: item.style?.fontWeight || ''
        }
      };
    })
    .filter((block) => block.type !== 'unknown-region' || block.confidence >= 0.55)
    .sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x));

  const importantBlocks = visualBlocks.filter((block) => isImportantBlock(block, pageArea));
  const counts = visualBlocks.reduce((acc, block) => {
    acc[block.type] = (acc[block.type] || 0) + 1;
    acc[block.sectionBand] = (acc[block.sectionBand] || 0) + 1;
    return acc;
  }, {});
  const visibleArea = Math.max(1, viewport.width * Math.min(pageHeight, viewport.height * 3));
  const importantCoveredArea = Math.min(visibleArea, coveredArea(importantBlocks));
  const allCoveredArea = Math.min(visibleArea, coveredArea(visualBlocks));
  const coverageRatio = Number((importantCoveredArea / visibleArea).toFixed(3));

  return {
    mode: 'screenshot-first-html-assisted-visual-model',
    source: {
      viewport,
      pageHeight,
      screenshot: capture.source?.screenshot ? { width: capture.source.screenshot.width, height: capture.source.screenshot.height, contentType: capture.source.screenshot.contentType } : null
    },
    visualBlocks,
    coverage: {
      visibleArea,
      coveredArea: importantCoveredArea,
      allCoveredArea,
      coverageRatio,
      importantBlocks: importantBlocks.length
    },
    diagnostics: {
      blocks: visualBlocks.length,
      importantBlocks: importantBlocks.length,
      textRegions: counts['text-region'] || 0,
      imageRegions: counts['image-region'] || 0,
      shapeRegions: counts['shape-region'] || 0,
      buttonRegions: counts['button-region'] || 0,
      headerRegions: counts.header || 0,
      heroRegions: counts.hero || 0,
      contentRegions: counts.content || 0,
      footerRegions: counts.footer || 0,
      coverageRatio,
      averageConfidence: visualBlocks.length ? Number((visualBlocks.reduce((sum, block) => sum + block.confidence, 0) / visualBlocks.length).toFixed(2)) : 0
    }
  };
}
