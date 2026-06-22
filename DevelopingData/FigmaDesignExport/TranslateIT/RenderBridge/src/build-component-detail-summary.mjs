function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function layers(plan = {}) {
  return list(plan.frames).flatMap((frame) => list(frame.directChildren).concat(list(frame.children), list(frame.groups).flatMap((group) => list(group.children))));
}
function groups(plan = {}) {
  return list(plan.frames).flatMap((frame) => list(frame.groups));
}
function item(layer) {
  return { id: layer.id || null, name: layer.name || null, role: layer.role || null, kind: layer.kind || null, text: clean(layer.text).slice(0, 96), assetId: layer.assetId || null };
}
function groupItem(group) {
  return { id: group.id || null, name: group.name || null, role: group.role || null, childCount: list(group.children).length };
}
export function buildComponentDetailSummary(payload) {
  const plan = payload?.figmaRenderPlan || {};
  const all = layers(plan);
  const allGroups = groups(plan);
  const buttons = all.filter((layer) => layer.kind === 'button');
  const images = all.filter((layer) => layer.kind === 'image');
  const text = all.filter((layer) => layer.kind === 'text');
  const cards = allGroups.filter((group) => /card/i.test(group.name || '') || group.role === 'card-component');
  const logos = all.filter((layer) => /logo/i.test(layer.name || layer.role || ''));
  const icons = all.filter((layer) => /icon/i.test(layer.name || layer.role || ''));
  return {
    version: 'component-detail-summary-v1',
    status: all.length ? 'ready' : 'missing',
    summary: { buttons: buttons.length, images: images.length, text: text.length, cards: cards.length, logos: logos.length, icons: icons.length },
    candidates: {
      buttons: buttons.slice(0, 24).map(item),
      cards: cards.slice(0, 24).map(groupItem),
      logos: logos.slice(0, 12).map(item),
      icons: icons.slice(0, 24).map(item),
      media: images.slice(0, 24).map(item),
      headings: text.filter((layer) => /heading|title|hero/i.test(layer.name || layer.role || '')).slice(0, 24).map(item)
    }
  };
}
