function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function area(rect = {}) { return Math.max(0, n(rect.w, 0)) * Math.max(0, n(rect.h, 0)); }
function roundRect(rect = {}) { return { x: Math.round(n(rect.x, 0)), y: Math.round(n(rect.y, 0)), w: Math.max(1, Math.round(n(rect.w, 1))), h: Math.max(1, Math.round(n(rect.h, 1))) }; }
function isText(layer) { return clean(layer.kind || layer.type) === 'text'; }
function isImage(layer) { return clean(layer.kind || layer.type) === 'image'; }
function isShape(layer) { return clean(layer.kind || layer.type) === 'shape'; }
function isInput(layer) { return clean(layer.kind || layer.type) === 'input'; }
function isButton(layer) { return clean(layer.kind || layer.type) === 'button'; }
function layerText(layer) { return clean(layer.text || layer.component?.label || layer.input?.label || layer.input?.placeholder || layer.input?.value || ''); }
function layerRect(layer, groupRect = null) {
  const r = roundRect(layer.rect || {});
  if (!groupRect) return r;
  return { x: Math.round(n(groupRect.x, 0) + r.x), y: Math.round(n(groupRect.y, 0) + r.y), w: r.w, h: r.h };
}
function mostlyOutside(rect, bounds) {
  const x1 = Math.max(n(rect.x), n(bounds.x));
  const y1 = Math.max(n(rect.y), n(bounds.y));
  const x2 = Math.min(n(rect.x) + n(rect.w), n(bounds.x) + n(bounds.w));
  const y2 = Math.min(n(rect.y) + n(rect.h), n(bounds.y) + n(bounds.h));
  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return area(rect) > 0 && overlap / area(rect) < 0.08;
}
function iconLike(layer) {
  const hint = lower([layer.name, layer.role, layer.groupName, layer.assetId].filter(Boolean).join(' '));
  if (/logo|brand/.test(hint)) return false;
  return /icon|svg|social|chevron|arrow|caret|hamburger|menu|decorative/.test(hint);
}
function tinyNoise(layer, rect) {
  if (isText(layer) || isButton(layer) || isInput(layer)) return false;
  const a = area(rect);
  if (isShape(layer)) return a < 36;
  if (isImage(layer) && iconLike(layer)) return a < 14000;
  if (isImage(layer)) return a < 900;
  return a < 24;
}
function duplicateKey(layer, rect) {
  const kind = clean(layer.kind || layer.type || 'layer');
  const text = layerText(layer).slice(0, 80).toLowerCase();
  const x = Math.round(n(rect.x, 0) / 4) * 4;
  const y = Math.round(n(rect.y, 0) / 4) * 4;
  const w = Math.round(n(rect.w, 0) / 4) * 4;
  const h = Math.round(n(rect.h, 0) / 4) * 4;
  const asset = clean(layer.assetId || '');
  return [kind, text, asset, x, y, w, h].join('|');
}
function bbox(layers) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const layer of layers) {
    const r = roundRect(layer.rect || {});
    x1 = Math.min(x1, r.x);
    y1 = Math.min(y1, r.y);
    x2 = Math.max(x2, r.x + r.w);
    y2 = Math.max(y2, r.y + r.h);
  }
  if (!Number.isFinite(x1)) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: Math.round(x1), y: Math.round(y1), w: Math.max(1, Math.round(x2 - x1)), h: Math.max(1, Math.round(y2 - y1)) };
}
function normalizeGroup(group, frameBounds, seen, counters) {
  const groupRect = roundRect(group.rect || {});
  const keptAbs = [];
  const removed = [];
  for (const child of list(group.children)) {
    const abs = layerRect(child, groupRect);
    const reason = rejectLayer(child, abs, frameBounds, seen);
    if (reason) {
      counters.removed += 1;
      counters.reasons[reason] = (counters.reasons[reason] || 0) + 1;
      removed.push(child.name || child.id || reason);
      continue;
    }
    const key = duplicateKey(child, abs);
    seen.add(key);
    keptAbs.push({ child, abs });
  }
  if (!keptAbs.length) return null;
  const preserveSourceBounds = group.layout?.enabled === true;
  const nextRect = preserveSourceBounds ? groupRect : bbox(keptAbs.map((item) => ({ rect: item.abs })));
  const nextChildren = keptAbs.map(({ child, abs }) => ({
    ...child,
    rect: { x: Math.round(abs.x - nextRect.x), y: Math.round(abs.y - nextRect.y), w: abs.w, h: abs.h }
  })).sort(layerSort);
  return {
    ...group,
    rect: nextRect,
    children: nextChildren,
    diagnostics: {
      ...(group.diagnostics || {}),
      desktopQualityPass: true,
      sourceBoundsPreserved: preserveSourceBounds,
      layersBefore: list(group.children).length,
      layersAfter: nextChildren.length,
      removedLayers: removed.length
    }
  };
}
function rejectLayer(layer, rect, frameBounds, seen) {
  if (!layer) return 'null-layer';
  if (mostlyOutside(rect, frameBounds)) return 'off-frame';
  if (isText(layer) && !layerText(layer)) return 'empty-text';
  if (tinyNoise(layer, rect)) return 'tiny-noise';
  if (seen.has(duplicateKey(layer, rect))) return 'duplicate-layer';
  return '';
}
function layerSort(a, b) {
  return n(a.paintOrder, 0) - n(b.paintOrder, 0) || n(a.rect?.y, 0) - n(b.rect?.y, 0) || n(a.rect?.x, 0) - n(b.rect?.x, 0);
}
function frameWidth(plan, frames) {
  const fromPage = n(plan.page?.width, 0);
  const fromFrames = Math.max(0, ...frames.map((frame) => n(frame.rect?.w, 0)));
  return clamp(Math.round(fromPage || fromFrames || 1440), 1024, 1920);
}
function normalizeFrame(frame, index, y, width, counters) {
  const sourceRect = roundRect(frame.rect || { x: 0, y, w: width, h: 400 });
  const height = Math.max(80, sourceRect.h);
  const frameBounds = { x: 0, y: 0, w: width, h: height };
  const seen = new Set();
  const direct = [];
  for (const layer of list(frame.directChildren)) {
    const rect = roundRect(layer.rect || {});
    const reason = rejectLayer(layer, rect, frameBounds, seen);
    if (reason) {
      counters.removed += 1;
      counters.reasons[reason] = (counters.reasons[reason] || 0) + 1;
      continue;
    }
    seen.add(duplicateKey(layer, rect));
    direct.push({ ...layer, rect });
  }
  const groups = list(frame.groups).map((group) => normalizeGroup(group, frameBounds, seen, counters)).filter(Boolean).sort((a, b) => n(a.paintOrder, 0) - n(b.paintOrder, 0) || n(a.rect?.y, 0) - n(b.rect?.y, 0));
  const groupedChildren = groups.flatMap((group) => list(group.children).map((child) => ({ ...child, rect: { x: n(group.rect?.x, 0) + n(child.rect?.x, 0), y: n(group.rect?.y, 0) + n(child.rect?.y, 0), w: n(child.rect?.w, 1), h: n(child.rect?.h, 1) } })));
  const children = [...direct, ...groupedChildren].sort(layerSort);
  return {
    ...frame,
    name: frame.name || `${String(index + 1).padStart(2, '0')} Section`,
    rect: { x: 0, y, w: width, h: height },
    sourceRect,
    children,
    directChildren: direct.sort(layerSort),
    groups,
    diagnostics: {
      ...(frame.diagnostics || {}),
      desktopQualityPass: true,
      sourceY: sourceRect.y,
      layersAfterQualityPass: children.length,
      groupsAfterQualityPass: groups.length
    }
  };
}
function scoreQuality(frames, counters) {
  const layers = frames.reduce((sum, frame) => sum + list(frame.children).length, 0);
  const text = frames.reduce((sum, frame) => sum + list(frame.children).filter(isText).length, 0);
  const image = frames.reduce((sum, frame) => sum + list(frame.children).filter(isImage).length, 0);
  const emptyFrames = frames.filter((frame) => !list(frame.children).length).length;
  let score = 100;
  score -= Math.min(28, emptyFrames * 9);
  score -= Math.min(22, counters.removed * 1.4);
  if (layers < 12) score -= 25;
  if (text < 6) score -= 25;
  if (image > Math.max(18, text * 2)) score -= 18;
  return {
    score: clamp(Math.round(score), 0, 100),
    grade: score >= 80 ? 'good' : score >= 55 ? 'usable-review' : 'needs-fix',
    layers,
    textLayers: text,
    imageLayers: image,
    emptyFrames,
    removedLayers: counters.removed,
    removedReasons: counters.reasons
  };
}

export function applyDesktopQualityPass(figmaRenderPlan) {
  const plan = clone(figmaRenderPlan);
  const sourceFrames = list(plan.frames).slice().sort((a, b) => n(a.rect?.y, 0) - n(b.rect?.y, 0));
  const counters = { removed: 0, reasons: {} };
  const width = frameWidth(plan, sourceFrames);
  let y = 0;
  const frames = [];
  for (let index = 0; index < sourceFrames.length; index += 1) {
    const normalized = normalizeFrame(sourceFrames[index], index, y, width, counters);
    if (list(normalized.children).length || index === 0) {
      frames.push(normalized);
      y += normalized.rect.h;
    } else {
      counters.removed += 1;
      counters.reasons['empty-frame'] = (counters.reasons['empty-frame'] || 0) + 1;
    }
  }
  const quality = scoreQuality(frames, counters);
  plan.frames = frames;
  plan.page = {
    ...(plan.page || {}),
    width,
    height: Math.max(640, y),
    backgroundColor: plan.page?.backgroundColor || '#FFFFFF'
  };
  plan.diagnostics = {
    ...(plan.diagnostics || {}),
    desktopQualityPass: true,
    desktopQuality: quality,
    framesAfterDesktopQualityPass: frames.length
  };
  return plan;
}
