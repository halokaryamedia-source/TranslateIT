function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function area(rect) {
  return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0);
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

function textKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ').trim();
}

function rawIdFromElement(element) {
  const match = String(element.id || '').match(/^el-(\d+)$/);
  return match ? `raw-${match[1]}` : '';
}

function expectedVisualType(element) {
  if (element.type === 'image') return 'image-region';
  if (element.type === 'button') return 'button-region';
  if (element.type === 'container') return 'shape-region';
  return 'text-region';
}

function textSimilarity(a, b) {
  const ak = textKey(a);
  const bk = textKey(b);
  if (!ak || !bk) return 0;
  if (ak === bk) return 1;
  if (ak.includes(bk) || bk.includes(ak)) return 0.72;
  const aw = new Set(ak.split(' ').filter(Boolean));
  const bw = new Set(bk.split(' ').filter(Boolean));
  let hit = 0;
  for (const word of aw) if (bw.has(word)) hit += 1;
  return hit / Math.max(1, Math.min(aw.size, bw.size));
}

function scoreMatch(element, block) {
  const sameRaw = rawIdFromElement(element) && rawIdFromElement(element) === block.matchedRawId;
  const overlap = overlapRatio(element.rect, block.rect);
  const sameType = expectedVisualType(element) === block.type;
  const text = textSimilarity(element.text || element.alt, block.text);
  let score = 0;
  if (sameRaw) score += 0.5;
  score += Math.min(0.34, overlap * 0.34);
  if (sameType) score += 0.12;
  score += Math.min(0.18, text * 0.18);
  score += Math.min(0.08, (block.confidence || 0) * 0.08);
  return Number(Math.min(1, score).toFixed(3));
}

function bestVisualBlock(element, blocks) {
  const rawId = rawIdFromElement(element);
  const candidates = blocks.filter((block) => {
    if (rawId && block.matchedRawId === rawId) return true;
    if (expectedVisualType(element) === block.type && overlapRatio(element.rect, block.rect) > 0.18) return true;
    if (element.type !== 'image' && textSimilarity(element.text, block.text) > 0.62 && overlapRatio(element.rect, block.rect) > 0.08) return true;
    return false;
  });
  let best = null;
  for (const block of candidates) {
    const score = scoreMatch(element, block);
    if (!best || score > best.score) best = { block, score };
  }
  return best;
}

export function matchDomToVisual(designModel, visualModel) {
  const blocks = visualModel.visualBlocks || [];
  const elements = (designModel.elements || []).map((element) => {
    const match = bestVisualBlock(element, blocks);
    if (!match || match.score < 0.35) {
      return {
        ...element,
        visualMatch: null,
        sourceReason: 'dom-only-no-strong-visual-match',
        confidence: 0.45
      };
    }
    return {
      ...element,
      originalRect: element.rect,
      rect: match.score >= 0.55 ? match.block.rect : element.rect,
      visualMatch: {
        id: match.block.id,
        type: match.block.type,
        matchedRawId: match.block.matchedRawId,
        score: match.score,
        confidence: match.block.confidence
      },
      sourceReason: match.score >= 0.55 ? 'visual-rect-dom-content-style' : 'dom-rect-visual-verified',
      confidence: Number(Math.min(0.98, 0.45 + match.score * 0.45).toFixed(2))
    };
  });
  const matched = elements.filter((element) => element.visualMatch).length;
  const avg = elements.length ? elements.reduce((sum, element) => sum + (element.confidence || 0), 0) / elements.length : 0;
  return {
    model: { ...designModel, elements },
    diagnostics: {
      visualBlocks: blocks.length,
      elements: elements.length,
      matchedElements: matched,
      unmatchedElements: elements.length - matched,
      matchRate: elements.length ? Number((matched / elements.length).toFixed(3)) : 0,
      averageConfidence: Number(avg.toFixed(2))
    }
  };
}
