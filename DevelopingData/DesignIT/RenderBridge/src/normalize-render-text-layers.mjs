function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function key(text) { return clean(text).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ').trim(); }
function area(rect = {}) { return Math.max(0, (rect.w || 0) * (rect.h || 0)); }
function overlapArea(a = {}, b = {}) { const x = Math.max(0, Math.min((a.x || 0) + (a.w || 0), (b.x || 0) + (b.w || 0)) - Math.max(a.x || 0, b.x || 0)); const y = Math.max(0, Math.min((a.y || 0) + (a.h || 0), (b.y || 0) + (b.h || 0)) - Math.max(a.y || 0, b.y || 0)); return x * y; }
function overlapRatio(a, b) { return overlapArea(a, b) / Math.max(1, Math.min(area(a), area(b))); }
function textScore(layer) { const role = layer.role || ''; const roleScore = role === 'title' ? 100 : role === 'section-title' ? 90 : role === 'subheading' ? 70 : role === 'body' ? 55 : role.includes('nav') ? 45 : 30; return roleScore + Math.min(80, clean(layer.text).length) + Math.min(60, Number(layer.style?.fontSize || 0)); }
function shouldDrop(a, b) {
  const ak = key(a.text); const bk = key(b.text);
  if (!ak || !bk) return false;
  const related = ak === bk || ak.includes(bk) || bk.includes(ak);
  if (!related) return false;
  return overlapRatio(a.rect, b.rect) > 0.48 || (ak === bk && Math.abs((a.rect?.y || 0) - (b.rect?.y || 0)) < 12);
}
function normalizeLayers(layers) {
  const out = [];
  let removed = 0;
  for (const layer of layers || []) {
    if (layer.kind !== 'text') { out.push(layer); continue; }
    if (!clean(layer.text)) { removed += 1; continue; }
    const existing = out.find((item) => item.kind === 'text' && shouldDrop(item, layer));
    if (!existing) { out.push(layer); continue; }
    const keep = textScore(existing) >= textScore(layer) ? existing : layer;
    const drop = keep === existing ? layer : existing;
    if (drop === existing) {
      const idx = out.indexOf(existing);
      out[idx] = keep;
    }
    removed += 1;
  }
  return { layers: out, removed };
}
function normalizeGroup(group) {
  const result = normalizeLayers(group.children || []);
  return { group: { ...group, children: result.layers, diagnostics: { ...(group.diagnostics || {}), duplicateTextRemoved: result.removed } }, removed: result.removed };
}
export function normalizeRenderTextLayers(renderPlan) {
  const plan = clone(renderPlan);
  let removed = 0;
  plan.frames = (plan.frames || []).map((frame) => {
    const direct = normalizeLayers(frame.directChildren || []);
    removed += direct.removed;
    const groups = (frame.groups || []).map((group) => { const result = normalizeGroup(group); removed += result.removed; return result.group; });
    const flat = normalizeLayers(frame.children || []);
    return { ...frame, directChildren: direct.layers, groups, children: flat.layers, diagnostics: { ...(frame.diagnostics || {}), duplicateTextRemoved: direct.removed + flat.removed + groups.reduce((sum, group) => sum + (group.diagnostics?.duplicateTextRemoved || 0), 0) } };
  });
  plan.diagnostics = { ...(plan.diagnostics || {}), duplicateTextRemoved: removed, renderTextPolicy: 'drop-overlapping-duplicate-text-v1' };
  return plan;
}
