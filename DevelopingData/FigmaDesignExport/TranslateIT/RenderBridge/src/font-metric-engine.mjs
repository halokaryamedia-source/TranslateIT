function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
export async function buildFontMetricPlan(cloneModel) {
  let available = true;
  try { await import('opentype.js'); } catch { available = false; }
  const layers = cloneModel?.layers || [];
  const fontFamilies = new Map();
  for (const layer of layers) {
    if (layer.type !== 'text' && layer.type !== 'button') continue;
    const family = clean(layer.style?.fontFamily || 'Inter');
    fontFamilies.set(family, (fontFamilies.get(family) || 0) + 1);
  }
  return {
    version: 'font-metric-plan-v1',
    engine: 'opentype-js-adapter',
    status: available ? 'ready' : 'missing',
    fontFamilies: Array.from(fontFamilies.entries()).map(([family, layers]) => ({ family, layers })),
    diagnostics: {
      available,
      textLayers: layers.filter((layer) => layer.type === 'text' || layer.type === 'button').length,
      uniqueFamilies: fontFamilies.size,
      note: 'Font metric correction is planned but non-blocking until local font files are configured.'
    }
  };
}
