function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function hex(value, fallback) { return /^#[0-9a-fA-F]{6}$/.test(clean(value)) ? clean(value) : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function styleFor(layer) {
  const st = { ...(layer.style || {}) };
  if (layer.kind === 'text') {
    st.color = hex(st.color, '#111827');
    st.fontSize = clamp(n(st.fontSize, 14), 7, 140);
    st.fontWeight = n(st.fontWeight, 400);
    st.opacity = clamp(n(st.opacity, 1), 0, 1);
  }
  if (layer.kind === 'image') {
    st.objectFit = clean(st.objectFit) || 'cover';
    st.backgroundColor = hex(st.backgroundColor, '#E5E7EB');
    st.opacity = clamp(n(st.opacity, 1), 0, 1);
  }
  if (layer.kind === 'button') {
    st.backgroundColor = hex(layer.component?.backgroundColor || st.backgroundColor, '#111827');
    st.color = hex(layer.component?.textColor || st.color, '#FFFFFF');
    st.fontSize = clamp(n(st.fontSize, 13), 7, 80);
    st.fontWeight = n(st.fontWeight, 700);
    st.borderRadius = n(st.borderRadius || layer.component?.radius, 8);
  }
  if (layer.kind === 'shape') {
    st.backgroundColor = hex(st.backgroundColor, '#FFFFFF');
    st.opacity = clamp(n(st.opacity, 1), 0, 1);
  }
  return st;
}
function fixLayer(layer) {
  return { ...layer, name: clean(layer.name) || layer.id || 'Layer', style: styleFor(layer), pluginReady: true };
}
export function finalizePluginRenderPlan(figmaRenderPlan) {
  const plan = clone(figmaRenderPlan);
  let finalizedLayers = 0;
  const mapLayer = (layer) => { finalizedLayers += 1; return fixLayer(layer); };
  plan.frames = list(plan.frames).map((frame) => ({
    ...frame,
    directChildren: list(frame.directChildren).map(mapLayer),
    children: list(frame.children).map(mapLayer),
    groups: list(frame.groups).map((group) => ({ ...group, children: list(group.children).map(mapLayer) }))
  }));
  plan.diagnostics = { ...(plan.diagnostics || {}), pluginRenderFinalPass: true, finalizedLayers };
  return plan;
}
