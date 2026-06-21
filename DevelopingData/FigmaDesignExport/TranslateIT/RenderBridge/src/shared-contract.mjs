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
  return {
    ok: true,
    publicVersion: PUBLIC_VERSION,
    engine: ENGINE,
    engineBuild: ENGINE_BUILD,
    generatedAt: new Date().toISOString(),
    ...payload
  };
}

export function error(message, extra = {}) {
  return {
    ok: false,
    publicVersion: PUBLIC_VERSION,
    engine: ENGINE,
    engineBuild: ENGINE_BUILD,
    error: String(message || 'Unknown error'),
    ...extra
  };
}

export function assertCleanPayload(payload) {
  const failures = [];
  if (!payload || payload.ok !== true) failures.push('payload is not ok');
  if (payload?.publicVersion !== PUBLIC_VERSION) failures.push('publicVersion mismatch');
  if (payload?.engine !== ENGINE) failures.push('engine mismatch');
  if (payload?.engineBuild !== ENGINE_BUILD) failures.push('engineBuild mismatch');
  if (!payload?.source) failures.push('source missing');
  if (!payload?.designModel) failures.push('designModel missing');
  if (!Array.isArray(payload?.designModel?.sections)) failures.push('designModel.sections missing');
  if (!Array.isArray(payload?.designModel?.elements)) failures.push('designModel.elements missing');
  if (!Array.isArray(payload?.designModel?.assets)) failures.push('designModel.assets missing');
  return failures;
}
