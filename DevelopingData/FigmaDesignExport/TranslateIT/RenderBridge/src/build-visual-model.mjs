function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function area(rect) {
  return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0);
}

function visualType(item) {
  if (item.role === 'image') return 'image-region';
  if (item.role === 'button') return 'button-region';
  if (['heading-1', 'heading-2', 'heading-3', 'text', 'link', 'navigation', 'footer'].includes(item.role) && clean(item.text)) return 'text-region';
  if (['container', 'decorative'].includes(item.role)) return 'shape-region';
  return 'unknown-region';
}

function scoreBlock(item, pageArea) {
  const rectArea = area(item.rect);
  let score = 0.45;
  if (item.role === 'image') score += 0.2;
  if (clean(item.text)) score += 0.18;
  if (rectArea > 3000) score += 0.08;
  if (rectArea > pageArea * 0.01) score += 0.06;
  if (item.style?.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/i.test(item.style.backgroundColor)) score += 0.08;
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

export function buildVisualModel(capture) {
  const viewport = capture.source?.viewport || { width: 1440, height: 1600 };
  const pageHeight = capture.source?.pageHeight || viewport.height;
  const pageArea = Math.max(1, viewport.width * pageHeight);
  const raw = capture.rawElements || [];
  const visualBlocks = raw
    .filter((item) => item.rect && area(item.rect) >= 24)
    .map((item) => ({
      id: `visual-${item.index}`,
      type: visualType(item),
      role: item.role,
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
    }))
    .sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x));

  const counts = visualBlocks.reduce((acc, block) => {
    acc[block.type] = (acc[block.type] || 0) + 1;
    return acc;
  }, {});

  return {
    mode: 'screenshot-first-html-assisted-visual-model',
    source: {
      viewport,
      pageHeight,
      screenshot: capture.source?.screenshot ? { width: capture.source.screenshot.width, height: capture.source.screenshot.height, contentType: capture.source.screenshot.contentType } : null
    },
    visualBlocks,
    diagnostics: {
      blocks: visualBlocks.length,
      textRegions: counts['text-region'] || 0,
      imageRegions: counts['image-region'] || 0,
      shapeRegions: counts['shape-region'] || 0,
      buttonRegions: counts['button-region'] || 0,
      averageConfidence: visualBlocks.length ? Number((visualBlocks.reduce((sum, block) => sum + block.confidence, 0) / visualBlocks.length).toFixed(2)) : 0
    }
  };
}
