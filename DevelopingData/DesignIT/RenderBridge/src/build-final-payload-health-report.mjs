function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function list(value) { return Array.isArray(value) ? value : []; }
function allRenderLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => [
    ...list(frame.directChildren),
    ...list(frame.children),
    ...list(frame.groups).flatMap((group) => list(group.children))
  ]);
}
function allGroups(plan = {}) { return list(plan.frames).flatMap((frame) => list(frame.groups)); }
function hasValidRect(item = {}) { const r = item.rect || {}; return n(r.w) > 0 && n(r.h) > 0 && Number.isFinite(n(r.x)) && Number.isFinite(n(r.y)); }
function count(items, fn) { return list(items).filter(fn).length; }
function statusOf({ fatal, warning }) {
  if (fatal.length) return 'fail';
  if (warning.length) return 'review';
  return 'pass';
}
export function buildFinalPayloadHealthReport(payload) {
  const plan = payload?.figmaRenderPlan || {};
  const manifest = payload?.productionExportManifest || {};
  const renderLayers = allRenderLayers(plan);
  const groups = allGroups(plan);
  const ids = new Set();
  const duplicateIds = [];
  for (const layer of renderLayers) {
    if (!layer.id) continue;
    if (ids.has(layer.id)) duplicateIds.push(layer.id);
    ids.add(layer.id);
  }
  const invalidFrames = count(plan.frames, (frame) => !hasValidRect(frame));
  const invalidLayers = count(renderLayers, (layer) => !hasValidRect(layer));
  const emptyGroups = count(groups, (group) => !list(group.children).length);
  const emptyText = count(renderLayers, (layer) => layer.kind === 'text' && !String(layer.text || '').trim());
  const missingAssets = count(renderLayers, (layer) => layer.kind === 'image' && layer.assetId && layer.hasAsset === false);
  const placeholders = count(renderLayers, (layer) => list(layer.warnings).includes('downgraded-missing-image-to-placeholder') || layer.role === 'image-placeholder-surface');
  const unknownLayers = count(renderLayers, (layer) => !['text', 'image', 'button', 'shape'].includes(String(layer.kind || '')));
  const fatal = [
    plan.status !== 'pass' ? 'figmaRenderPlan.status is not pass' : '',
    invalidFrames ? `${invalidFrames} invalid frame rect(s)` : '',
    invalidLayers ? `${invalidLayers} invalid layer rect(s)` : '',
    duplicateIds.length ? `${duplicateIds.length} duplicate render layer id(s)` : '',
    missingAssets ? `${missingAssets} unresolved missing image asset(s)` : '',
    unknownLayers ? `${unknownLayers} unknown render layer kind(s)` : ''
  ].filter(Boolean);
  const warning = [
    emptyGroups ? `${emptyGroups} empty group(s)` : '',
    emptyText ? `${emptyText} empty text layer(s)` : '',
    placeholders ? `${placeholders} image placeholder(s)` : '',
    manifest?.risk?.level === 'high' ? 'production manifest risk is high' : ''
  ].filter(Boolean);
  return {
    version: 'final-payload-health-report-v1',
    status: statusOf({ fatal, warning }),
    source: payload?.source ? { title: payload.source.title || '', url: payload.source.url || payload.source.finalUrl || '' } : null,
    summary: {
      frames: list(plan.frames).length,
      groups: groups.length,
      renderLayers: renderLayers.length,
      invalidFrames,
      invalidLayers,
      duplicateIds: duplicateIds.length,
      emptyGroups,
      emptyText,
      missingAssets,
      placeholders,
      unknownLayers,
      sanitized: plan.diagnostics?.sanitized === true,
      manifestStatus: manifest.status || 'missing',
      manifestRisk: manifest.risk?.level || 'unknown'
    },
    fatal,
    warning,
    nextAction: fatal.length ? 'fix-payload-before-figma-import' : warning.length ? 'review-report-before-figma-import' : 'ready-for-controlled-figma-import'
  };
}
