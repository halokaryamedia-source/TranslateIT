function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function num(value, fallback = 0) { const n = Number.parseFloat(String(value || '').replace('px', '')); return Number.isFinite(n) ? n : fallback; }
function cssColor(value) { const raw = clean(value); if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return ''; const hex = raw.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/); if (hex) return hex[0]; const rgba = raw.match(/rgba?\(([^)]+)\)/); if (!rgba) return ''; const parts = rgba[1].split(',').map((x) => Number.parseFloat(x)); if (parts.length < 3 || parts[3] === 0) return ''; return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join(''); }
function keyOfRaw(raw) { return `el-${raw.index}`; }
function maxBorder(style = {}) { return Math.max(num(style.borderWidth), num(style.borderTopWidth), num(style.borderRightWidth), num(style.borderBottomWidth), num(style.borderLeftWidth)); }
function hasShadow(style = {}) { const shadow = clean(style.boxShadow); return shadow && shadow !== 'none'; }
function hasFilter(style = {}) { const filter = clean(style.filter); const backdrop = clean(style.backdropFilter); return (filter && filter !== 'none') || (backdrop && backdrop !== 'none'); }
function effectOf(raw) { const style = raw.style || {}; const borderWidth = maxBorder(style); const borderColor = cssColor(style.borderColor) || cssColor(style.borderTopColor) || cssColor(style.borderRightColor) || cssColor(style.borderBottomColor) || cssColor(style.borderLeftColor); const borderStyle = clean(style.borderStyle || ''); return { borderWidth, borderColor, borderStyle, boxShadow: clean(style.boxShadow || ''), filter: clean(style.filter || ''), backdropFilter: clean(style.backdropFilter || ''), hasStroke: borderWidth > 0 && !!borderColor && borderStyle !== 'none', hasShadow: hasShadow(style), hasFilter: hasFilter(style) }; }
export function promoteSurfaceEffects(model, layout) {
  const rawById = new Map((layout.elements || []).map((raw) => [keyOfRaw(raw), raw]));
  let strokeLayers = 0;
  let shadowLayers = 0;
  let filterLayers = 0;
  const elements = (model.elements || []).map((element) => {
    const raw = rawById.get(element.id);
    if (!raw) return element;
    const effect = effectOf(raw);
    if (!effect.hasStroke && !effect.hasShadow && !effect.hasFilter) return element;
    if (effect.hasStroke) strokeLayers += 1;
    if (effect.hasShadow) shadowLayers += 1;
    if (effect.hasFilter) filterLayers += 1;
    return { ...element, style: { ...(element.style || {}), borderWidth: effect.borderWidth, borderColor: effect.borderColor, borderStyle: effect.borderStyle, boxShadow: effect.boxShadow, filter: effect.filter, backdropFilter: effect.backdropFilter }, visualEffects: effect, sourceReason: element.sourceReason || 'css-surface-effects-preserved' };
  });
  return { ...model, elements, diagnostics: { ...(model.diagnostics || {}), strokeLayers, shadowLayers, filterLayers, surfaceEffectsPreserved: true } };
}
