function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function rect(r = {}) { return { x: Math.round(num(r.x, 0)), y: Math.round(num(r.y, 0)), w: Math.max(1, Math.round(num(r.w, 1))), h: Math.max(1, Math.round(num(r.h, 1))) }; }
function style(layer = {}) { return layer.style || {}; }
function isMissingImage(layer) { return clean(layer.kind) === 'image' && layer.assetId && layer.hasAsset === false; }
function downgradeMissingImage(layer, counters) {
  counters.missingImagesDowngraded += 1;
  return { ...layer, kind: 'shape', role: 'image-placeholder-surface', assetId: null, hasAsset: true, name: `Image Placeholder / ${clean(layer.name).slice(0, 52) || counters.missingImagesDowngraded}`, style: { ...style(layer), backgroundColor: style(layer).backgroundColor || '#F1F5F9', borderColor: style(layer).borderColor || '#CBD5E1', borderWidth: style(layer).borderWidth || 1, borderRadius: style(layer).borderRadius || 8 }, warnings: [...(layer.warnings || []).filter((w) => w !== 'missing-image-asset'), 'downgraded-missing-image-to-placeholder'] };
}
function sanitizeLayer(layer, counters, path) {
  let next = { ...layer, id: clean(layer.id || `${path}-layer-${counters.layers}`), name: clean(layer.name || layer.id || 'Layer'), rect: rect(layer.rect) };
  if (!next.id || counters.ids.has(next.id)) next.id = `${path}-layer-${counters.layers}`;
  counters.ids.add(next.id);
  counters.layers += 1;
  if (next.rect.w <= 1 || next.rect.h <= 1) counters.tinyLayers += 1;
  if (isMissingImage(next)) next = downgradeMissingImage(next, counters);
  if (clean(next.kind) === 'text' && !clean(next.text)) { counters.emptyTextDropped += 1; return null; }
  if (!['text', 'image', 'button', 'shape'].includes(clean(next.kind))) { counters.unknownLayersDropped += 1; return null; }
  return next;
}
function sanitizeGroup(group, counters, path) {
  const id = clean(group.id || `${path}-group-${counters.groups}`);
  const children = (group.children || []).map((layer) => sanitizeLayer(layer, counters, id)).filter(Boolean);
  if (!children.length) { counters.emptyGroupsDropped += 1; return null; }
  counters.groups += 1;
  return { ...group, id, name: clean(group.name || id), rect: rect(group.rect), children, diagnostics: { ...(group.diagnostics || {}), sanitizedChildren: children.length } };
}
export function sanitizeFigmaRenderPlan(renderPlan) {
  const plan = clone(renderPlan);
  const counters = { ids: new Set(), layers: 0, groups: 0, missingImagesDowngraded: 0, emptyTextDropped: 0, unknownLayersDropped: 0, emptyGroupsDropped: 0, tinyLayers: 0 };
  plan.frames = (plan.frames || []).map((frame, index) => {
    const frameId = clean(frame.id || `frame-${index}`);
    const directChildren = (frame.directChildren || []).map((layer) => sanitizeLayer(layer, counters, `${frameId}-direct`)).filter(Boolean);
    const groups = (frame.groups || []).map((group) => sanitizeGroup(group, counters, frameId)).filter(Boolean);
    const children = (frame.children || []).map((layer) => sanitizeLayer(layer, counters, frameId)).filter(Boolean);
    return { ...frame, id: frameId, name: clean(frame.name || frameId), rect: rect(frame.rect), directChildren, groups, children, diagnostics: { ...(frame.diagnostics || {}), sanitizedDirectChildren: directChildren.length, sanitizedGroups: groups.length, sanitizedChildren: children.length } };
  });
  plan.diagnostics = { ...(plan.diagnostics || {}), sanitized: true, sanitizedLayers: counters.layers, sanitizedGroups: counters.groups, missingImagesDowngraded: counters.missingImagesDowngraded, emptyTextDropped: counters.emptyTextDropped, unknownLayersDropped: counters.unknownLayersDropped, emptyGroupsDropped: counters.emptyGroupsDropped, tinyLayers: counters.tinyLayers };
  return plan;
}
