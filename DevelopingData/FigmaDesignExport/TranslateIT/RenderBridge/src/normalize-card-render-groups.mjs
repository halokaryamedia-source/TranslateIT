function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function isCardGroup(group) { return group?.componentGroup?.role === 'card' || /\bcard\b/i.test(clean(group?.name)); }
function isSurfaceLayer(layer) { return layer.kind === 'shape' || layer.role === 'container' || /surface|background/i.test(clean(layer.name)); }
function minPaint(children) { return children.reduce((m, layer) => Math.min(m, num(layer.paintOrder, 0)), 0); }
function normalizeCardGroup(group) {
  if (!isCardGroup(group)) return group;
  const children = Array.isArray(group.children) ? group.children : [];
  const surfaces = children.filter(isSurfaceLayer).sort((a, b) => num(a.paintOrder, 0) - num(b.paintOrder, 0));
  const content = children.filter((layer) => !surfaces.includes(layer)).sort((a, b) => num(a.paintOrder, 0) - num(b.paintOrder, 0) || num(a.rect?.y, 0) - num(b.rect?.y, 0));
  const normalizedSurface = surfaces.slice(0, 1).map((layer) => ({ ...layer, name: 'Card Surface', rect: { x: 0, y: 0, w: group.rect?.w || layer.rect?.w || 1, h: group.rect?.h || layer.rect?.h || 1 }, paintOrder: -1000 }));
  const droppedSurfaces = Math.max(0, surfaces.length - 1);
  return {
    ...group,
    name: clean(group.name || group.componentGroup?.name || 'Card Component'),
    role: 'card-component',
    layout: { ...(group.layout || {}), enabled: false, mode: 'ABSOLUTE', sourceSafe: true, component: 'card' },
    children: normalizedSurface.concat(content),
    diagnostics: { ...(group.diagnostics || {}), cardNormalized: true, cardSurfaceLayers: normalizedSurface.length, cardContentLayers: content.length, droppedDuplicateSurfaces: droppedSurfaces, paintOrder: minPaint(content) }
  };
}
export function normalizeCardRenderGroups(renderPlan) {
  const plan = clone(renderPlan);
  let cardGroups = 0;
  let cardSurfaceLayers = 0;
  let droppedDuplicateSurfaces = 0;
  plan.frames = (plan.frames || []).map((frame) => {
    const groups = (frame.groups || []).map((group) => {
      const next = normalizeCardGroup(group);
      if (next.diagnostics?.cardNormalized) { cardGroups += 1; cardSurfaceLayers += next.diagnostics.cardSurfaceLayers || 0; droppedDuplicateSurfaces += next.diagnostics.droppedDuplicateSurfaces || 0; }
      return next;
    });
    return { ...frame, groups, diagnostics: { ...(frame.diagnostics || {}), normalizedCardGroups: groups.filter((group) => group.diagnostics?.cardNormalized).length } };
  });
  plan.diagnostics = { ...(plan.diagnostics || {}), normalizedCardGroups: cardGroups, normalizedCardSurfaces: cardSurfaceLayers, droppedDuplicateCardSurfaces: droppedDuplicateSurfaces, cardRenderHierarchy: 'surface-plus-content-absolute-v1' };
  return plan;
}
