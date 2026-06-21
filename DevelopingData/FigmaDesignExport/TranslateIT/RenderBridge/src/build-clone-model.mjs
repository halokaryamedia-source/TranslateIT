function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function color(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  const match = raw.match(/rgba?\(([^)]+)\)/);
  if (!match) return fallback;
  const parts = match[1].split(',').map((x) => Number.parseFloat(x));
  if (parts.length < 3 || parts[3] === 0) return fallback;
  return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}

function area(rect) {
  return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0);
}

function rawIndexOf(element) {
  const match = String(element.id || '').match(/^el-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function explicitZIndex(element) {
  const raw = String(element.source?.zIndex || element.style?.zIndex || '').trim();
  if (!raw || raw === 'auto') return null;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function paintOrderOf(element, type) {
  const explicit = explicitZIndex(element);
  const rawIndex = rawIndexOf(element);
  if (explicit !== null) return explicit * 1000 + rawIndex;
  if (type === 'shape') return rawIndex - 200;
  return rawIndex;
}

function sectionName(section) {
  if (section.role === 'header') return 'Section / Header';
  if (section.role === 'hero') return 'Section / Hero';
  if (section.role === 'footer') return 'Section / Footer';
  if (section.role === 'content') return 'Section / Content';
  return section.name || `Section / ${section.role || 'Content'}`;
}

function layerType(element) {
  if (element.type === 'image') return 'image';
  if (element.type === 'button') return 'button';
  if (element.type === 'container') return 'shape';
  return 'text';
}

function layerName(element) {
  const role = clean(element.role || element.type || 'Layer');
  const txt = clean(element.text || element.alt || element.name || '');
  if (element.type === 'image') return `Image / ${clean(element.alt || element.name || role)}`;
  if (element.type === 'button') return `Button / ${txt.slice(0, 42)}`;
  if (element.type === 'container') return `Background / ${role}`;
  if (role === 'title') return 'Hero / Title';
  if (role === 'section-title') return 'Section / Title';
  if (role === 'nav-item') return `Navigation / ${txt.slice(0, 42)}`;
  if (role === 'footer-link') return `Footer Link / ${txt.slice(0, 42)}`;
  if (role === 'footer-text') return `Footer Text / ${txt.slice(0, 42)}`;
  return `${role} / ${txt.slice(0, 42)}`;
}

function styleOf(element) {
  const s = element.style || {};
  return {
    color: color(s.color, '#111827'),
    backgroundColor: color(s.backgroundColor, ''),
    fontSize: Number(s.fontSize || 14),
    fontWeight: Number(s.fontWeight || 400),
    fontFamily: s.fontFamily || 'Inter',
    lineHeight: Number(s.lineHeight || 0),
    borderRadius: Number(s.borderRadius || 0),
    textAlign: s.textAlign || 'left',
    position: s.position || element.source?.position || '',
    zIndex: s.zIndex || element.source?.zIndex || ''
  };
}

export function buildCloneModel(model, visualModel, visualMatching) {
  const sections = (model.sections || [])
    .map((section) => ({ id: section.id, role: section.role, name: sectionName(section), rect: section.rect, layerIds: [] }))
    .sort((a, b) => ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0));
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const layers = [];

  for (const element of model.elements || []) {
    if (!element.rect || area(element.rect) < 24) continue;
    const type = layerType(element);
    const layer = {
      id: `layer-${element.id}`,
      type,
      role: element.role || type,
      name: layerName(element),
      sectionId: element.sectionId || null,
      rect: element.rect,
      originalRect: element.originalRect || element.rect,
      text: clean(element.text),
      assetId: element.assetId || null,
      alt: clean(element.alt),
      style: styleOf(element),
      zIndex: paintOrderOf(element, type),
      paintOrder: paintOrderOf(element, type),
      editable: true,
      sourceReason: element.sourceReason || 'dom-css-visual-paint-order',
      confidence: element.confidence || 0.45,
      visualMatch: element.visualMatch || null
    };
    layers.push(layer);
    const section = sectionMap.get(layer.sectionId);
    if (section) section.layerIds.push(layer.id);
  }

  const backgroundLayers = sections.map((section, index) => ({
    id: `bg-${section.id}`,
    type: 'shape',
    role: 'section-background',
    name: `${section.name} / Background`,
    sectionId: section.id,
    rect: section.rect,
    text: '',
    assetId: null,
    alt: '',
    style: { color: '#111827', backgroundColor: section.role === 'footer' ? '#087A4B' : '#FFFFFF', fontSize: 0, fontWeight: 400, fontFamily: 'Inter', lineHeight: 0, borderRadius: 0, textAlign: 'left' },
    zIndex: -10000 + index,
    paintOrder: -10000 + index,
    editable: true,
    sourceReason: 'section-visual-background',
    confidence: 0.72,
    visualMatch: null
  }));

  const allLayers = backgroundLayers.concat(layers).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) || ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0));

  return {
    mode: 'layout-preserving-editable-clone',
    visualTruth: 'screenshot-first-html-assisted',
    page: { title: model.page?.title || 'Imported Website', url: model.page?.url || '', width: model.page?.width || 1440, height: model.page?.height || 1600, background: model.page?.background || '#FFFFFF' },
    sections,
    layers: allLayers,
    assets: model.assets || [],
    visualModel: { mode: visualModel.mode, diagnostics: visualModel.diagnostics },
    visualMatching,
    uiLibrary: { grouping: 'section-first-source-geometry', editableText: true, editableImages: true, screenshotReferenceOnly: true, paintOrder: 'dom-paint-order-preserved' },
    diagnostics: {
      sections: sections.length,
      layers: allLayers.length,
      textLayers: allLayers.filter((x) => x.type === 'text').length,
      imageLayers: allLayers.filter((x) => x.type === 'image').length,
      shapeLayers: allLayers.filter((x) => x.type === 'shape').length,
      buttonLayers: allLayers.filter((x) => x.type === 'button').length,
      visualBlocks: visualModel.diagnostics.blocks,
      visualConfidence: visualModel.diagnostics.averageConfidence,
      visualMatchRate: visualMatching.matchRate,
      visualMatchConfidence: visualMatching.averageConfidence,
      paintOrder: 'dom-paint-order-preserved'
    }
  };
}
