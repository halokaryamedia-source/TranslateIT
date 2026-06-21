function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unionRect(items) {
  const xs = items.map((item) => item.rect.x);
  const ys = items.map((item) => item.rect.y);
  const xe = items.map((item) => item.rect.x + item.rect.w);
  const ye = items.map((item) => item.rect.y + item.rect.h);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xe) - x, h: Math.max(...ye) - y };
}

function sameLine(a, b) {
  const ay = a.rect.y + a.rect.h / 2;
  const by = b.rect.y + b.rect.h / 2;
  const tolerance = Math.max(10, Math.min(a.rect.h || 0, b.rect.h || 0) * 0.55);
  return Math.abs(ay - by) <= tolerance;
}

function closeHorizontally(a, b) {
  const left = a.rect.x <= b.rect.x ? a : b;
  const right = left === a ? b : a;
  const gap = right.rect.x - (left.rect.x + left.rect.w);
  return gap >= -16 && gap <= Math.max(90, Math.min(left.rect.w, right.rect.w) * 1.4);
}

function isHeadlineCandidate(item) {
  if (!item || item.type !== 'text') return false;
  if (!['title', 'section-title', 'subheading'].includes(item.role)) return false;
  if (clean(item.text).length < 2) return false;
  if ((item.style?.fontSize || 0) < 18) return false;
  return true;
}

function compatibleStyle(a, b) {
  const af = a.style?.fontSize || 0;
  const bf = b.style?.fontSize || 0;
  const aw = a.style?.fontWeight || 0;
  const bw = b.style?.fontWeight || 0;
  if (Math.abs(af - bf) > Math.max(6, Math.min(af, bf) * 0.25)) return false;
  if (Math.abs(aw - bw) > 250) return false;
  return true;
}

function shouldMerge(a, b) {
  if (a.sectionId !== b.sectionId) return false;
  if (!sameLine(a, b)) return false;
  if (!closeHorizontally(a, b)) return false;
  if (!compatibleStyle(a, b)) return false;
  const textA = clean(a.text);
  const textB = clean(b.text);
  if (!textA || !textB) return false;
  if (textA.length > 90 || textB.length > 90) return false;
  return true;
}

function makeMerged(group, index) {
  const sorted = group.slice().sort((a, b) => a.rect.x - b.rect.x);
  const first = sorted[0];
  const text = sorted.map((item) => clean(item.text)).filter(Boolean).join(' ');
  return {
    ...first,
    id: `line-${first.id}-${index}`,
    name: `${first.role.replace('-', ' ')} / ${text.slice(0, 42)}`,
    rect: unionRect(sorted),
    text,
    source: {
      ...(first.source || {}),
      lineReconstructed: true,
      mergedElementIds: sorted.map((item) => item.id)
    },
    sourceReason: 'line-aware-headline-reconstruction',
    confidence: Math.max(first.confidence || 0.74, 0.82)
  };
}

export function reconstructTextLines(model) {
  const elements = model.elements || [];
  const candidates = elements.filter(isHeadlineCandidate).sort((a, b) => (a.sectionId || '').localeCompare(b.sectionId || '') || a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const used = new Set();
  const merged = [];
  let mergeIndex = 0;

  for (const item of candidates) {
    if (used.has(item.id)) continue;
    const group = [item];
    used.add(item.id);
    for (const other of candidates) {
      if (used.has(other.id)) continue;
      if (group.some((existing) => shouldMerge(existing, other))) {
        group.push(other);
        used.add(other.id);
      }
    }
    if (group.length > 1) {
      merged.push(makeMerged(group, mergeIndex++));
    } else {
      merged.push(item);
    }
  }

  const candidateIds = new Set(candidates.map((item) => item.id));
  const nextElements = elements.filter((item) => !candidateIds.has(item.id)).concat(merged).sort((a, b) => {
    const ai = Number(String(a.id || '').match(/(\d+)/)?.[1] || 0);
    const bi = Number(String(b.id || '').match(/(\d+)/)?.[1] || 0);
    return ai - bi;
  });
  const nextSections = (model.sections || []).map((section) => ({
    ...section,
    elementIds: nextElements.filter((item) => item.sectionId === section.id).map((item) => item.id)
  }));

  return {
    ...model,
    sections: nextSections,
    elements: nextElements,
    diagnostics: {
      ...(model.diagnostics || {}),
      lineReconstruction: true,
      reconstructedHeadlineLines: merged.filter((item) => item.source?.lineReconstructed).length
    }
  };
}
