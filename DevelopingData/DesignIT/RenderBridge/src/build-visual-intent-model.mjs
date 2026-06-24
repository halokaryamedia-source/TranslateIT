function area(rect) { return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0); }
function centerY(rect) { return (rect?.y || 0) + (rect?.h || 0) / 2; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function roleFromRegion(region, pageHeight) {
  const y = centerY(region.rect);
  const role = region.role || 'unknown';
  if (y < 180 && ['navigation', 'text', 'button', 'container'].includes(role)) return 'header-candidate';
  if (y > pageHeight * 0.72) return 'footer-candidate';
  if (role === 'button') return 'cta-candidate';
  if (role === 'image') return 'media-candidate';
  if (role === 'container' && area(region.rect) > 30000) return 'section-candidate';
  if (role === 'text' && area(region.rect) > 4000) return 'copy-candidate';
  return role + '-candidate';
}
function clusterByVertical(regions, pageHeight) {
  const sorted = regions.slice().sort((a, b) => (a.rect?.y || 0) - (b.rect?.y || 0));
  const clusters = [];
  for (const region of sorted) {
    const cy = centerY(region.rect);
    let cluster = clusters.find((item) => Math.abs(item.centerY - cy) < Math.max(90, Math.min(220, (region.rect?.h || 0) * 1.4)));
    if (!cluster) { cluster = { id: `cluster-${clusters.length + 1}`, regions: [], centerY: cy, yMin: region.rect?.y || 0, yMax: (region.rect?.y || 0) + (region.rect?.h || 0) }; clusters.push(cluster); }
    cluster.regions.push(region);
    cluster.centerY = cluster.regions.reduce((sum, item) => sum + centerY(item.rect), 0) / cluster.regions.length;
    cluster.yMin = Math.min(cluster.yMin, region.rect?.y || 0);
    cluster.yMax = Math.max(cluster.yMax, (region.rect?.y || 0) + (region.rect?.h || 0));
  }
  return clusters.map((cluster) => ({ ...cluster, role: cluster.centerY < 180 ? 'header-region' : cluster.centerY > pageHeight * 0.72 ? 'footer-region' : cluster.regions.some((r) => r.role === 'image') && cluster.regions.some((r) => r.role === 'text') ? 'hero-or-content-region' : 'content-region' }));
}
export function buildVisualIntentModel(parserResult, source = {}) {
  const pageHeight = source.screenshot?.height || source.pageHeight || 1600;
  const pageWidth = source.screenshot?.width || source.viewport?.width || 1440;
  const regions = (parserResult?.regions || []).map((region, index) => ({ ...region, id: region.id || `visual-region-${index}`, intentRole: roleFromRegion(region, pageHeight), normalized: { x: Number(((region.rect?.x || 0) / Math.max(1, pageWidth)).toFixed(4)), y: Number(((region.rect?.y || 0) / Math.max(1, pageHeight)).toFixed(4)), w: Number(((region.rect?.w || 0) / Math.max(1, pageWidth)).toFixed(4)), h: Number(((region.rect?.h || 0) / Math.max(1, pageHeight)).toFixed(4)) } })).filter((region) => area(region.rect) > 24);
  const clusters = clusterByVertical(regions, pageHeight);
  const diagnostics = { parser: parserResult?.engine || 'missing', regions: regions.length, clusters: clusters.length, headerCandidates: regions.filter((r) => r.intentRole === 'header-candidate').length, footerCandidates: regions.filter((r) => r.intentRole === 'footer-candidate').length, ctaCandidates: regions.filter((r) => r.intentRole === 'cta-candidate').length, mediaCandidates: regions.filter((r) => r.intentRole === 'media-candidate').length, hasUsefulVisualParse: regions.length >= 8 && clusters.length >= 2 };
  return { version: 'visual-intent-model-v1', source: { title: source.title || '', url: source.url || source.finalUrl || '' }, regions, clusters, diagnostics };
}
export function buildMissingVisualIntentModel(source = {}, reason = 'external visual parser missing') {
  return { version: 'visual-intent-model-v1', source: { title: source.title || '', url: source.url || source.finalUrl || '' }, regions: [], clusters: [], diagnostics: { parser: 'missing', regions: 0, clusters: 0, hasUsefulVisualParse: false, reason } };
}
