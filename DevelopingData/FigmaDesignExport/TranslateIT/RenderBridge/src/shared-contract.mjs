export const PUBLIC_VERSION = 'Version 0.1 - Alpha';
export const ENGINE = 'translateit-core';
export const ENGINE_BUILD = 'alpha-clean-1';
export const DEFAULT_VIEWPORT = { width: 1440, height: 1600 };

export function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function ok(payload) {
  return { ok: true, publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, generatedAt: new Date().toISOString(), ...payload };
}

export function error(message, extra = {}) {
  return { ok: false, publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, error: String(message || 'Unknown error'), ...extra };
}

export function assertCleanPayload(payload) {
  const failures = [];
  if (!payload || payload.ok !== true) failures.push('payload is not ok');
  if (payload?.publicVersion !== PUBLIC_VERSION) failures.push('publicVersion mismatch');
  if (payload?.engine !== ENGINE) failures.push('engine mismatch');
  if (payload?.engineBuild !== ENGINE_BUILD) failures.push('engineBuild mismatch');
  if (!payload?.source) failures.push('source missing');
  if (!payload?.visualModel) failures.push('visualModel missing');
  if (payload?.visualModel?.mode !== 'screenshot-first-html-assisted-visual-model') failures.push('visualModel mode mismatch');
  if (!Array.isArray(payload?.visualModel?.visualBlocks)) failures.push('visualModel.visualBlocks missing');
  if (!payload?.cloneModel) failures.push('cloneModel missing');
  if (payload?.cloneModel?.mode !== 'layout-preserving-editable-clone') failures.push('cloneModel mode mismatch');
  if (payload?.cloneModel?.visualTruth !== 'screenshot-first-html-assisted') failures.push('cloneModel visualTruth mismatch');
  if (!Array.isArray(payload?.cloneModel?.sections)) failures.push('cloneModel.sections missing');
  if (!Array.isArray(payload?.cloneModel?.layers)) failures.push('cloneModel.layers missing');
  if (!Array.isArray(payload?.cloneModel?.assets)) failures.push('cloneModel.assets missing');
  return failures;
}
