function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function area(rect = {}) { return Math.max(0, (rect.w || 0) * (rect.h || 0)); }
function overlapArea(a = {}, b = {}) { const x = Math.max(0, Math.min((a.x || 0) + (a.w || 0), (b.x || 0) + (b.w || 0)) - Math.max(a.x || 0, b.x || 0)); const y = Math.max(0, Math.min((a.y || 0) + (a.h || 0), (b.y || 0) + (b.h || 0)) - Math.max(a.y || 0, b.y || 0)); return x * y; }
function coverage(slice, editable) { return overlapArea(slice.rect, editable.rect) / Math.max(1, area(editable.rect)); }
function isSlice(layer) { return layer.role === 'component-slice' || layer.sourceReason === 'component-slice-visual-block'; }
function isEditableDetail(layer) { return ['text', 'button'].includes(layer.type) || ['logo-image', 'icon-image'].includes(layer.role); }
export function rebalanceVisualSliceOverlays(cloneModel) {
  const model = clone(cloneModel);
  const layers = model.layers || [];
  const slices = layers.filter(isSlice);
  const details = layers.filter(isEditableDetail);
  let demoted = 0;
  let removed = 0;
  const remove = new Set();
  const next = layers.map((layer) => {
    if (!isSlice(layer)) return layer;
    const covered = details.filter((detail) => detail.sectionId === layer.sectionId && coverage(layer, detail) > 0.72);
    if (covered.length >= 4 && area(layer.rect) < 180000) { remove.add(layer.id); removed += 1; return layer; }
    if (covered.length >= 2) { demoted += 1; return { ...layer, zIndex: -9300 + demoted, paintOrder: -9300 + demoted, opacity: 0.28, sourceReason: `${layer.sourceReason || 'visual-block'} + demoted-behind-editable-layers`, style: { ...(layer.style || {}), opacity: 0.28 } }; }
    return layer;
  }).filter((layer) => !remove.has(layer.id));
  model.layers = next;
  model.diagnostics = { ...(model.diagnostics || {}), visualSliceOverlaysDemoted: demoted, visualSliceOverlaysRemoved: removed };
  model.uiLibrary = { ...(model.uiLibrary || {}), visualSlicePolicy: 'demote-or-remove-slices-that-cover-editable-details-v1' };
  return model;
}
