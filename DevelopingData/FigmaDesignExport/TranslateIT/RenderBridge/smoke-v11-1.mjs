const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await getJson(`${bridge}/health`);
assert(health.mode === 'universal-page-adapter-v11-1-design-clone', `Expected V11.1 health mode, got ${health.mode}`);

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const plan = payload.rebuildPlan || {};
const tokens = plan.tokens || {};
const diagnostics = payload.diagnostics || {};

assert(payload.mode === 'universal-page-adapter-v11-1-design-clone', `Expected V11.1 payload mode, got ${payload.mode}`);
assert(payload.screenshot && payload.screenshot.base64, 'Missing screenshot reference.');
assert(Array.isArray(payload.sections) && payload.sections.length > 0, 'Missing sections.');
assert(Array.isArray(payload.layers) && payload.layers.length > 0, 'Missing layers.');
assert(Array.isArray(plan.sections) && plan.sections.length > 0, 'Missing rebuildPlan.sections.');
assert(tokens && Array.isArray(tokens.colors), 'Missing rebuildPlan.tokens.colors.');
assert(tokens && Array.isArray(tokens.typography), 'Missing rebuildPlan.tokens.typography.');
assert(tokens && Array.isArray(tokens.spacing) && tokens.spacing.length >= 6, 'Missing or weak rebuildPlan.tokens.spacing.');
assert(plan.responsive && plan.responsive.desktop && plan.responsive.tablet && plan.responsive.mobile, 'Missing responsive desktop/tablet/mobile notes.');
assert(Array.isArray(payload.outputRules) && payload.outputRules.length >= 5, 'Missing output rules.');

console.log(JSON.stringify({
  ok: true,
  targetUrl,
  healthMode: health.mode,
  payloadMode: payload.mode,
  adapter: payload.adapter,
  diagnostics,
  rebuildPlan: {
    sections: plan.sections.length,
    colors: tokens.colors.length,
    typography: tokens.typography.length,
    spacing: tokens.spacing.length,
    responsive: Object.keys(plan.responsive || {}).length
  },
  outputRules: payload.outputRules.length
}, null, 2));
