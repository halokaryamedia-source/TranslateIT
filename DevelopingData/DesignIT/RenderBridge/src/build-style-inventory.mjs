function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function allLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => list(frame.directChildren).concat(list(frame.children), list(frame.groups).flatMap((group) => list(group.children))));
}
function add(map, key) { const k = clean(key); if (!k || k === 'none') return; map.set(k, (map.get(k) || 0) + 1); }
function top(map, limit) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value, count]) => ({ value, count })); }
export function buildStyleInventory(payload) {
  const layers = allLayers(payload?.figmaRenderPlan || {});
  const colors = new Map();
  const fontSizes = new Map();
  const radii = new Map();
  const shadows = new Map();
  const gradients = [];
  for (const layer of layers) {
    const st = layer.style || {};
    add(colors, st.color); add(colors, st.backgroundColor); add(colors, st.borderColor);
    const fs = Math.round(n(st.fontSize, 0)); if (fs) add(fontSizes, String(fs));
    const br = Math.round(n(st.borderRadius, 0)); if (br) add(radii, String(br));
    add(shadows, st.boxShadow);
    if (st.backgroundGradient) gradients.push(st.backgroundGradient);
  }
  return { version: 'style-inventory-v1', status: layers.length ? 'ready' : 'missing', colors: top(colors, 32), fontSizes: top(fontSizes, 16), radii: top(radii, 16), shadows: top(shadows, 12), gradients: gradients.slice(0, 16), diagnostics: { layers: layers.length, colors: colors.size, fontSizes: fontSizes.size, radii: radii.size, shadows: shadows.size, gradients: gradients.length } };
}
