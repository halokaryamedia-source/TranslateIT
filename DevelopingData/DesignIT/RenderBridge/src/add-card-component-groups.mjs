function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function area(rect = {}) { return Math.max(0, (rect.w || 0) * (rect.h || 0)); }
function overlapArea(a, b) { if (!a || !b) return 0; const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return x * y; }
function contains(parent, child, pad = 10) { if (!parent || !child) return false; return child.x >= parent.x - pad && child.y >= parent.y - pad && child.x + child.w <= parent.x + parent.w + pad && child.y + child.h <= parent.y + parent.h + pad; }
function isSurface(layer) { return layer?.type === 'shape' || layer?.type === 'container' || layer?.role === 'section-background' || /Surface|Container|Background/i.test(layer?.name || ''); }
function isContent(layer) { return layer && layer.role !== 'section-background' && ['text', 'image', 'button'].includes(layer.type); }
function cardName(surface, index) { const base = clean(surface.name || surface.role || 'Card'); return `Card ${String(index + 1).padStart(2, '0')} / ${base.replace(/^Content \/ /, '').slice(0, 42)}`; }
function scoreCard(surface, children) { const text = children.filter((x) => x.type === 'text').length; const images = children.filter((x) => x.type === 'image').length; const buttons = children.filter((x) => x.type === 'button').length; const density = children.length / Math.max(1, area(surface.rect) / 50000); return text * 2 + images * 3 + buttons * 3 + density; }
export function addCardComponentGroups(cloneModel) {
  const model = JSON.parse(JSON.stringify(cloneModel || {}));
  const layers = Array.isArray(model.layers) ? model.layers : [];
  const sections = Array.isArray(model.sections) ? model.sections : [];
  const cards = [];
  const used = new Set();
  for (const section of sections) {
    const sectionLayers = layers.filter((layer) => layer.sectionId === section.id);
    const surfaces = sectionLayers.filter((layer) => isSurface(layer) && layer.role !== 'section-background' && area(layer.rect) >= 12000 && area(layer.rect) <= 420000).sort((a, b) => area(b.rect) - area(a.rect));
    for (const surface of surfaces) {
      const children = sectionLayers.filter((layer) => layer.id !== surface.id && isContent(layer) && !used.has(layer.id) && (contains(surface.rect, layer.rect, 14) || overlapArea(surface.rect, layer.rect) / Math.max(1, area(layer.rect)) > 0.72));
      if (children.length < 2) continue;
      if (scoreCard(surface, children) < 4.5) continue;
      const cardId = `card-${section.id}-${cards.length + 1}`;
      const name = cardName(surface, cards.length);
      const childIds = [surface.id, ...children.map((x) => x.id)];
      for (const id of childIds) used.add(id);
      cards.push({ id: cardId, name, sectionId: section.id, surfaceLayerId: surface.id, layerIds: childIds, rect: surface.rect, score: Number(scoreCard(surface, children).toFixed(2)), contentLayers: children.length });
      for (const layer of layers) {
        if (!childIds.includes(layer.id)) continue;
        layer.componentGroup = { id: cardId, name, role: 'card', surfaceLayerId: surface.id };
        layer.groupPath = [section.name || section.id, '35 Cards', name];
        layer.layerTree = { ...(layer.layerTree || {}), family: 'Cards', componentGroup: name };
      }
    }
  }
  model.componentGroups = [ ...(model.componentGroups || []), ...cards ];
  model.diagnostics = { ...(model.diagnostics || {}), cardComponentGroups: cards.length, cardGroupedLayers: cards.reduce((sum, card) => sum + card.layerIds.length, 0) };
  model.uiLibrary = { ...(model.uiLibrary || {}), cardComponentGroups: cards.length ? 'safe-surface-contained-cards-v1' : 'none' };
  return model;
}
