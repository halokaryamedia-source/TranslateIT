const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function readJson(res) {
  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  return { ok: res.ok, status: res.status, payload };
}

const healthResult = await readJson(await fetch(`${bridge}/health`));
const failures = [];
const warnings = [];

if (!healthResult.ok || healthResult.payload?.ok !== true) failures.push('RenderBridge health is not ok.');
if (healthResult.payload?.engine !== 'translateit-core') failures.push(`Wrong engine: ${healthResult.payload?.engine || 'missing'}`);
if (healthResult.payload?.engineBuild !== 'alpha-clean-1') failures.push(`Wrong engine build: ${healthResult.payload?.engineBuild || 'missing'}`);
if (healthResult.payload?.renderPolicy !== 'external-visual-engine-required') failures.push('RenderBridge must document external visual engine requirement.');
if (healthResult.payload?.internalLayoutFallback !== false) failures.push('Internal layout fallback must be disabled by default.');
if (!healthResult.payload?.externalVisualEngine?.required) failures.push('Health payload must declare the external visual engine requirement.');

const probeUrl = process.env.TRANSLATEIT_VISUAL_ENGINE_PROBE_URL || 'https://www.mivubi.com/';
let renderProbe = null;
try {
  const renderResult = await readJson(await fetch(`${bridge}/render?url=${encodeURIComponent(probeUrl)}`));
  renderProbe = { httpStatus: renderResult.status, ok: renderResult.payload?.ok === true, code: renderResult.payload?.code || null, message: renderResult.payload?.message || null };
  if (!renderResult.ok && renderResult.payload?.code === 'EXTERNAL_VISUAL_ENGINE_REQUIRED') {
    warnings.push('External visual engine is not available. This is acceptable for the readiness gate, but render-quality gates will be blocked until OmniParser/UIED is running.');
  } else if (!renderResult.ok || renderResult.payload?.ok !== true) {
    failures.push(`Render probe failed unexpectedly: HTTP ${renderResult.status}`);
  }
} catch (error) {
  failures.push(`Render probe failed unexpectedly: ${error?.message || String(error)}`);
}

const report = {
  gate: 'designit-visual-engine-readiness',
  status: failures.length ? 'fail' : 'pass',
  bridge,
  health: {
    renderPolicy: healthResult.payload?.renderPolicy || null,
    internalLayoutFallback: healthResult.payload?.internalLayoutFallback ?? null,
    externalVisualEngine: healthResult.payload?.externalVisualEngine || null
  },
  renderProbe,
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
