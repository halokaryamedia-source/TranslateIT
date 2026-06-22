function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function short(value, max = 120) { const text = clean(value); return text.length > max ? text.slice(0, max - 1).trim() + '…' : text; }
function uniq(values) { const seen = new Set(); const out = []; for (const value of values.map(clean).filter(Boolean)) { const key = value.toLowerCase(); if (seen.has(key)) continue; seen.add(key); out.push(value); } return out; }
function byRole(model, roles) { const set = new Set(roles); return (model.layers || []).filter((layer) => set.has(layer.role) || set.has(layer.type)); }
function sectionOf(model, id) { return (model.sections || []).find((section) => section.id === id) || { role: 'content', name: 'Content' }; }
function textLayers(model) { return (model.layers || []).filter((layer) => layer.type === 'text' && clean(layer.text)); }
function mediaLayers(model) { return (model.layers || []).filter((layer) => layer.type === 'image' && layer.role !== 'component-slice' && layer.assetId); }
function texts(model, roles, limit = 8) { return uniq(byRole(model, roles).map((layer) => short(layer.text || layer.alt || layer.name, 160))).slice(0, limit); }
function largestText(model, roles, fallback) { const list = byRole(model, roles).filter((layer) => clean(layer.text)).sort((a, b) => Number(b.style?.fontSize || 0) - Number(a.style?.fontSize || 0)); return short(list[0]?.text || fallback, 160); }
function colorTokens(model) {
  const colors = [];
  for (const layer of model.layers || []) {
    const style = layer.style || {};
    for (const color of [style.color, style.backgroundColor]) if (/^#[0-9a-fA-F]{6}$/.test(color || '')) colors.push(color.toUpperCase());
  }
  const base = ['#FFFFFF', '#111827', '#64748B', '#F8FAFC'];
  return uniq([...colors, ...base]).slice(0, 10).map((value, index) => ({ id: `color-${index + 1}`, name: index === 0 ? 'Primary' : index === 1 ? 'Text' : `Color ${index + 1}`, value }));
}
function typographyTokens(model) {
  const sizes = uniq((model.layers || []).map((layer) => String(Math.round(Number(layer.style?.fontSize || 0)))).filter((value) => Number(value) >= 8));
  const picked = sizes.map(Number).sort((a, b) => b - a).slice(0, 6);
  return picked.map((size, index) => ({ id: `type-${index + 1}`, name: index === 0 ? 'Heading XL' : index === 1 ? 'Heading M' : index === picked.length - 1 ? 'Caption' : `Text ${index + 1}`, fontSize: size, fontFamily: 'Inter', fontWeight: index < 2 ? 800 : 400 }));
}
function imageRef(model, layer) { return layer ? { layerId: layer.id, assetId: layer.assetId, alt: clean(layer.alt || layer.name), role: layer.role } : null; }
function detectPageType(model) {
  const hasHero = (model.sections || []).some((section) => section.role === 'hero');
  const cardish = textLayers(model).length >= 8 && mediaLayers(model).length >= 2;
  if (hasHero && cardish) return 'landing-page';
  if (hasHero) return 'simple-landing-page';
  return 'content-page';
}
export function buildDesignBlueprint(model, source = {}) {
  const nav = texts(model, ['nav-item', 'link'], 8);
  const body = texts(model, ['body', 'label', 'subheading', 'footer-text'], 12);
  const media = mediaLayers(model);
  const title = largestText(model, ['title', 'section-title'], source.title || 'Website');
  const sections = [];
  sections.push({ id: 'header', type: 'header', name: 'Header', layout: 'horizontal-nav', children: [
    { id: 'brand', type: 'logo-text', text: short(source.title || model.page?.title || 'Brand', 36) },
    { id: 'navigation', type: 'nav-links', items: nav.length ? nav.slice(0, 6) : ['About', 'Works', 'Contact'] },
    { id: 'header-cta', type: 'button', text: nav.find((item) => /contact|collab|contribute|join/i.test(item)) || 'Let’s Collaborate' }
  ]});
  sections.push({ id: 'hero', type: 'hero', name: 'Hero', layout: 'two-column-media', children: [
    { id: 'hero-copy', type: 'copy-stack', eyebrow: short(source.title || 'Website', 40), title, body: body[0] || 'Editable website content reconstructed into a clean Figma framework.', cta: 'Explore Works' },
    { id: 'hero-media', type: 'media-grid', images: [imageRef(model, media[0]), imageRef(model, media[1] || media[0])].filter(Boolean) }
  ]});
  sections.push({ id: 'content-cards', type: 'content-grid', name: 'Content / Cards', layout: 'three-card-grid', children: [0, 1, 2].map((index) => ({ id: `card-${index + 1}`, type: 'card', title: body[index * 2 + 1] || ['Recent Works', 'Education Project', 'Community Work'][index], body: body[index * 2 + 2] || 'Editable card content generated from source website.', image: imageRef(model, media[index] || media[0]) })) });
  sections.push({ id: 'footer', type: 'footer', name: 'Footer', layout: 'brand-and-columns', children: [
    { id: 'footer-brand', type: 'brand-summary', title: short(source.title || model.page?.title || 'Brand', 40), body: body[body.length - 1] || 'Specialized project team exploring education, art, and culture.' },
    { id: 'footer-links', type: 'link-list', items: nav.slice(0, 5) },
    { id: 'footer-contact', type: 'contact', text: body.find((item) => /@|\+|contact/i.test(item)) || 'hello@example.com' }
  ]});
  const tokens = { colors: colorTokens(model), typography: typographyTokens(model), spacing: [8, 12, 16, 24, 32, 48, 80].map((value) => ({ name: `Space ${value}`, value })), radius: [{ name: 'Button', value: 999 }, { name: 'Card', value: 20 }, { name: 'Media', value: 18 }] };
  const diagnostics = { sections: sections.length, navItems: nav.length, textLayers: textLayers(model).length, mediaLayers: media.length, tokens: tokens.colors.length + tokens.typography.length + tokens.spacing.length + tokens.radius.length, hasHeader: true, hasHero: true, hasFooter: true };
  return { version: 'design-blueprint-v1', pageType: detectPageType(model), source: { title: source.title || model.page?.title || 'Website', url: source.url || source.finalUrl || '' }, sections, tokens, diagnostics };
}
