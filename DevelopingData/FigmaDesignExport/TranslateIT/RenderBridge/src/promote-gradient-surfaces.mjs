function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function hexFromRgb(raw) { const match = String(raw || '').match(/rgba?\(([^)]+)\)/i); if (!match) return ''; const parts = match[1].split(',').map((x) => Number.parseFloat(x)); if (parts.length < 3 || parts[3] === 0) return ''; return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join(''); }
function normalizeColor(raw) { const value = clean(raw); if (/^#[0-9a-fA-F]{6}$/.test(value)) return value; if (/^#[0-9a-fA-F]{3}$/.test(value)) return '#' + value.slice(1).split('').map((x) => x + x).join(''); return hexFromRgb(value); }
function extractColors(backgroundImage) { const raw = clean(backgroundImage); const colors = []; const re = /#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)/g; let match; while ((match = re.exec(raw)) && colors.length < 4) { const c = normalizeColor(match[0]); if (c && !colors.includes(c)) colors.push(c); } return colors; }
function gradientType(backgroundImage) { const raw = clean(backgroundImage).toLowerCase(); if (raw.includes('radial-gradient')) return 'radial'; if (raw.includes('linear-gradient')) return 'linear'; return ''; }
function gradientOf(style = {}) { const bg = clean(style.backgroundImage || ''); const type = gradientType(bg); if (!type) return null; const colors = extractColors(bg); if (colors.length < 2) return null; return { type, colors, raw: bg, supported: type === 'linear', source: 'css-background-image' }; }
export function promoteGradientSurfaces(model) {
  let gradientLayers = 0;
  const elements = (model.elements || []).map((element) => {
    const gradient = gradientOf(element.style || {});
    if (!gradient) return element;
    gradientLayers += 1;
    return { ...element, style: { ...(element.style || {}), backgroundGradient: gradient, backgroundColor: element.style?.backgroundColor || gradient.colors[0] }, visualEffects: { ...(element.visualEffects || {}), backgroundGradient: gradient }, sourceReason: element.sourceReason || 'css-gradient-preserved' };
  });
  return { ...model, elements, diagnostics: { ...(model.diagnostics || {}), gradientLayers, gradientSurfacesPreserved: true } };
}
