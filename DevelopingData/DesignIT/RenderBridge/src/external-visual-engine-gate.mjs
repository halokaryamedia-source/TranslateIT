const DEFAULT_ENDPOINT = 'http://127.0.0.1:7860/parse';

export function externalVisualEngineConfig() {
  return {
    endpoint: process.env.OMNIPARSER_ENDPOINT || DEFAULT_ENDPOINT,
    uiedCliPath: process.env.UIED_CLI_PATH || '',
    allowInternalFallback: process.env.TRANSLATEIT_ALLOW_INTERNAL_LAYOUT_FALLBACK === '1'
  };
}

export async function checkExternalVisualEngine() {
  const config = externalVisualEngineConfig();
  if (config.allowInternalFallback) {
    return { ok: true, mode: 'internal-fallback-explicitly-enabled', warning: 'Internal layout fallback is enabled by env flag.' };
  }
  if (config.uiedCliPath) {
    return { ok: true, mode: 'uied-cli', endpoint: config.uiedCliPath };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ healthcheck: true, image_base64: '', title: 'TranslateIT external visual engine healthcheck' }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (response.ok || response.status === 400 || response.status === 422) {
      return { ok: true, mode: 'omniparser-endpoint', endpoint: config.endpoint, httpStatus: response.status };
    }
    return { ok: false, mode: 'omniparser-endpoint', endpoint: config.endpoint, reason: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, mode: 'omniparser-endpoint', endpoint: config.endpoint, reason: error?.message || String(error) };
  }
}

export function externalVisualEngineRequiredError(status) {
  return {
    ok: false,
    code: 'EXTERNAL_VISUAL_ENGINE_REQUIRED',
    message: 'External visual engine is required. Internal DOM/layout fallback is disabled because it produced unusable Figma output.',
    externalVisualEngine: status,
    nextAction: [
      'Start OmniParser at http://127.0.0.1:7860/parse, or set UIED_CLI_PATH.',
      'Do not use internal fallback unless explicitly debugging with TRANSLATEIT_ALLOW_INTERNAL_LAYOUT_FALLBACK=1.',
      'Restart RenderBridge after the visual engine is available.'
    ]
  };
}
