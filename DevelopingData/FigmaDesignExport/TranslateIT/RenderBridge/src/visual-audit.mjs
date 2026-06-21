function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function area(rect) {
  return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0);
}

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function textKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9\u00c0-\u024f]+/gi, ' ').trim();
}

function scoreFromFailures(count, total, floor = 0) {
  if (total <= 0) return 100;
  return Math.max(floor, Math.round(((total - count) / total) * 100));
}

function auditOverlaps(model) {
  const items = model.elements.filter((item) => ['text', 'button', 'image'].includes(item.type));
  const major = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (a.sectionId !== b.sectionId) continue;
      const overlap = overlapArea(a.rect, b.rect);
      if (!overlap) continue;
      const minArea = Math.max(1, Math.min(area(a.rect), area(b.rect)));
      const ratio = overlap / minArea;
      const bothText = a.type === 'text' && b.type === 'text';
      const imageText = (a.type === 'image' && b.type === 'text') || (b.type === 'image' && a.type === 'text');
      if ((bothText && ratio > 0.18) || (imageText && ratio > 0.12) || ratio > 0.42) {
        major.push({ a: a.name, b: b.name, ratio: Number(ratio.toFixed(3)) });
      }
    }
  }
  return { major, score: scoreFromFailures(major.length, Math.max(8, items.length), 30) };
}

function auditImages(model) {
  const images = model.elements.filter((item) => item.type === 'image');
  const issues = [];
  for (const image of images) {
    const r = image.rect || {};
    if (r.w < 48 || r.h < 48) issues.push(`${image.name}: too small`);
    if (r.w > model.page.width * 0.95) issues.push(`${image.name}: too wide`);
    if (r.h > model.page.height * 0.55) issues.push(`${image.name}: too tall`);
    if (!image.assetId) issues.push(`${image.name}: missing captured asset`);
  }
  return { issues, score: images.length ? scoreFromFailures(issues.length, Math.max(3, images.length * 2), 35) : 70 };
}

function auditText(model) {
  const texts = model.elements.filter((item) => item.type === 'text');
  const issues = [];
  const seen = new Map();
  for (const text of texts) {
    const value = clean(text.text);
    const key = textKey(value);
    if (!value) issues.push(`${text.name}: empty text`);
    if (text.rect.w < 18 || text.rect.h < 8) issues.push(`${text.name}: weak bounds`);
    if (text.style?.fontSize && text.style.fontSize < 6) issues.push(`${text.name}: font too small`);
    if (key) seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicates = Array.from(seen.values()).filter((count) => count > 1).length;
  for (let i = 0; i < duplicates; i += 1) issues.push('duplicate text group');
  return { issues, duplicateGroups: duplicates, score: scoreFromFailures(issues.length, Math.max(8, texts.length), 25) };
}

function auditSections(model) {
  const roles = new Set(model.sections.map((section) => section.role));
  const issues = [];
  if (!roles.has('header')) issues.push('header section missing');
  if (!roles.has('hero')) issues.push('hero section missing');
  if (!roles.has('footer')) issues.push('footer section missing');
  if (model.sections.length < 3) issues.push('not enough sections');
  for (const section of model.sections) {
    if (!section.elementIds?.length && !['header', 'footer'].includes(section.role)) issues.push(`${section.name}: empty section`);
    if (section.rect.h < 60) issues.push(`${section.name}: too short`);
  }
  return { issues, score: scoreFromFailures(issues.length, 8, 40) };
}

function auditLayerCleanliness(model) {
  const issues = [];
  const names = model.elements.map((item) => clean(item.name));
  const unnamed = names.filter((name) => !name || name === 'Element').length;
  const rawish = names.filter((name) => /raw-|unknown|undefined|null/i.test(name)).length;
  const tooMany = model.elements.length > 160 ? model.elements.length - 160 : 0;
  for (let i = 0; i < unnamed; i += 1) issues.push('unnamed layer');
  for (let i = 0; i < rawish; i += 1) issues.push('raw layer name');
  for (let i = 0; i < tooMany; i += 1) issues.push('too many layers');
  return { issues, score: scoreFromFailures(issues.length, Math.max(12, model.elements.length), 45) };
}

export function visualAudit(payload) {
  const model = payload.designModel || {};
  const overlap = auditOverlaps(model);
  const image = auditImages(model);
  const text = auditText(model);
  const section = auditSections(model);
  const layer = auditLayerCleanliness(model);
  const scores = {
    layoutScore: Math.round((section.score + overlap.score) / 2),
    overlapScore: overlap.score,
    imageScore: image.score,
    textScore: text.score,
    sectionScore: section.score,
    layerCleanlinessScore: layer.score,
    duplicateTextScore: Math.max(0, 100 - text.duplicateGroups * 12),
    editabilityScore: Math.round((layer.score + text.score + image.score) / 3)
  };
  const weighted = Math.round(
    scores.layoutScore * 0.2 +
    scores.overlapScore * 0.2 +
    scores.imageScore * 0.13 +
    scores.textScore * 0.17 +
    scores.sectionScore * 0.12 +
    scores.layerCleanlinessScore * 0.1 +
    scores.editabilityScore * 0.08
  );

  const failures = [];
  if (scores.overlapScore < 88) failures.push('major overlap risk detected');
  if (scores.imageScore < 70) failures.push('image quality/bounds risk detected');
  if (scores.textScore < 78) failures.push('text readability risk detected');
  if (scores.sectionScore < 70) failures.push('section completeness risk detected');
  if (scores.layerCleanlinessScore < 76) failures.push('layer cleanliness risk detected');
  if ((model.elements || []).length < 10) failures.push('not enough editable elements');
  if ((model.sections || []).length < 3) failures.push('not enough clean sections');

  const warnings = [];
  if (weighted < 78) warnings.push('visual quality is below preferred target');
  if (text.duplicateGroups > 0) warnings.push('duplicate text groups detected');
  if (image.issues.length) warnings.push('some images need cleanup');

  return {
    visualReadiness: failures.length ? 'fail' : 'pass',
    score: weighted,
    ...scores,
    metrics: {
      sections: model.sections?.length || 0,
      elements: model.elements?.length || 0,
      assets: model.assets?.length || 0,
      textElements: model.elements?.filter((item) => item.type === 'text').length || 0,
      imageElements: model.elements?.filter((item) => item.type === 'image').length || 0,
      buttonElements: model.elements?.filter((item) => item.type === 'button').length || 0,
      majorOverlaps: overlap.major.length,
      duplicateTextGroups: text.duplicateGroups
    },
    details: {
      overlapIssues: overlap.major.slice(0, 12),
      imageIssues: image.issues.slice(0, 12),
      textIssues: text.issues.slice(0, 12),
      sectionIssues: section.issues.slice(0, 12),
      layerIssues: layer.issues.slice(0, 12)
    },
    warnings,
    failures
  };
}
