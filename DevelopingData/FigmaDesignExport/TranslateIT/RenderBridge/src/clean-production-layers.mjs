function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function area(rect = {}) { return Math.max(0, (rect.w || 0) * (rect.h || 0)); }
function dedupeKey(layer) { return [layer.role || layer.type, clean(layer.text || layer.alt || layer.name).toLowerCase(), Math.round(layer.rect?.x || 0), Math.round(layer.rect?.y || 0)].join('|'); }
function score(layer) {
  if (layer.role === 'section-background') return 1000;
  if (layer.role === 'logo-image') return 950;
  if (layer.type === 'button') return 900;
  if (layer.role === 'title') return 880;
  if (layer.role === 'section-title') return 820;
  if (layer.type === 'text') return 700 + Math.min(120, clean(layer.text).length);
  if (layer.type === 'image') return 560 + Math.min(180, area(layer.rect) / 2500);
  if (layer.type === 'shape') return 420;
  return 300;
}
function keepAlways(layer) { return layer.role === 'section-background' || layer.role === 'logo-image' || layer.type === 'button' || ['title', 'section-title'].includes(layer.role); }
export function cleanProductionLayers(cloneModel) {
  const model = clone(cloneModel);
  const sections = new Map((model.sections || []).map((section) => [section.id, section]));
  const groups = new Map();
  for (const layer of model.layers || []) { const id = layer.sectionId || 'root'; if (!groups.has(id)) groups.set(id, []); groups.get(id).push(layer); }
  let duplicateRemoved = 0;
  let smallIconRemoved = 0;
  let overflowRemoved = 0;
  const output = [];
  for (const [sectionId, layers] of groups.entries()) {
    const seen = new Set();
    const unique = [];
    for (const layer of layers) {
      if (layer.role === 'icon-image' && area(layer.rect) < 120) { smallIconRemoved += 1; continue; }
      const key = dedupeKey(layer);
      if (seen.has(key) && !keepAlways(layer)) { duplicateRemoved += 1; continue; }
      seen.add(key);
      unique.push(layer);
    }
    const section = sections.get(sectionId) || {};
    const limit = section.role === 'header' ? 48 : section.role === 'hero' ? 80 : section.role === 'footer' ? 96 : 120;
    if (unique.length <= limit) { output.push(...unique); continue; }
    const allowed = new Set(unique.slice().sort((a, b) => score(b) - score(a)).slice(0, limit).map((layer) => layer.id));
    for (const layer of unique) { if (allowed.has(layer.id) || keepAlways(layer)) output.push(layer); else overflowRemoved += 1; }
  }
  model.layers = output.sort((a, b) => (a.paintOrder || a.zIndex || 0) - (b.paintOrder || b.zIndex || 0));
  model.diagnostics = { ...(model.diagnostics || {}), productionDuplicateLayersRemoved: duplicateRemoved, productionSmallIconsRemoved: smallIconRemoved, productionOverflowLayersRemoved: overflowRemoved };
  model.uiLibrary = { ...(model.uiLibrary || {}), productionLayerCleanup: 'dedupe-small-icons-section-limit-v1' };
  return model;
}
