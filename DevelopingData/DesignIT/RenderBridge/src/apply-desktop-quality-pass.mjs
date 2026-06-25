function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function list(value) { return Array.isArray(value) ? value : []; }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function area(rect = {}) { return Math.max(0, n(rect.w, 0)) * Math.max(0, n(rect.h, 0)); }
function kind(layer) { return clean(layer.kind || layer.type); }
function textOf(layer) { return clean(layer.text || layer.component?.label || layer.input?.value || layer.input?.placeholder || ''); }
function layerKey(layer) {
  const r = layer.rect || {};
  return [kind(layer), textOf(layer).toLowerCase(), layer.assetId || '', Math.round(n(r.x) / 4), Math.round(n(r.y) / 4), Math.round(n(r.w) / 4), Math.round(n(r.h) / 4)].join('|');
}
function isTinyNoise(layer) {
  const k = kind(layer);
  const a = area(layer.rect);
  const name = clean(layer.name || layer.role || '').toLowerCase();
  if (k === 'text' || k === 'button' || k === 'input') return false;
  if (k === 'image' && /icon|svg|decorative|arrow|chevron/.test(name)) return a < 14000;
  if (k === 'image') return a < 900;
  return a < 36;
}
function sortLayer(a, b) {
  return n(a.paintOrder, 0) - n(b.paintOrder, 0) || n(a.rect?.y, 0) - n(b.rect?.y, 0) || n(a.rect?.x, 0) - n(b.rect?.x, 0);
}
function cleanLayers(layers, counters) {
  const seen = new Set();
  const next = [];
  for (const layer of list(layers)) {
    if (!layer) continue;
    if (kind(layer) === 'text' && !textOf(layer)) {
      counters.removed += 1;
      counters.reasons['empty-text'] = (counters.reasons['empty-text'] || 0) + 1;
      continue;
    }
    if (isTinyNoise(layer)) {
      counters.removed += 1;
      counters.reasons['tiny-noise'] = (counters.reasons['tiny-noise'] || 0) + 1;
      continue;
    }
    const key = layerKey(layer);
    if (seen.has(key)) {
      counters.removed += 1;
      counters.reasons['duplicate-layer'] = (counters.reasons['duplicate-layer'] || 0) + 1;
      continue;
    }
    seen.add(key);
    next.push(layer);
  }
  return next.sort(sortLayer);
}
function quality(frames, counters) {
  const layers = frames.reduce((sum, frame) => sum + list(frame.children).length, 0);
  const textLayers = frames.reduce((sum, frame) => sum + list(frame.children).filter((layer) => kind(layer) === 'text').length, 0);
  const imageLayers = frames.reduce((sum, frame) => sum + list(frame.children).filter((layer) => kind(layer) === 'image').length, 0);
  let score = 100;
  if (layers < 12) score -= 25;
  if (textLayers < 6) score -= 20;
  score -= Math.min(25, counters.removed);
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, grade: score >= 80 ? 'good' : score >= 55 ? 'usable-review' : 'needs-fix', layers, textLayers, imageLayers, removedLayers: counters.removed, removedReasons: counters.reasons };
}
export function applyDesktopQualityPass(figmaRenderPlan) {
  const plan = clone(figmaRenderPlan);
  const counters = { removed: 0, reasons: {} };
  const frames = list(plan.frames).slice().sort((a, b) => n(a.rect?.y, 0) - n(b.rect?.y, 0));
  let y = 0;
  plan.frames = frames.map((frame) => {
    const h = Math.max(80, n(frame.rect?.h, 320));
    const directChildren = cleanLayers(frame.directChildren || frame.children || [], counters);
    const groups = list(frame.groups).map((group) => ({ ...group, children: cleanLayers(group.children, counters) })).filter((group) => list(group.children).length);
    const children = [...directChildren, ...groups.flatMap((group) => list(group.children))].sort(sortLayer);
    const next = { ...frame, rect: { x: 0, y, w: n(frame.rect?.w, plan.page?.width || 1440), h }, directChildren, groups, children };
    y += h;
    return next;
  });
  plan.page = { ...(plan.page || {}), width: n(plan.page?.width, 1440), height: Math.max(640, y) };
  plan.diagnostics = { ...(plan.diagnostics || {}), desktopQualityPass: true, desktopQuality: quality(plan.frames, counters) };
  return plan;
}
