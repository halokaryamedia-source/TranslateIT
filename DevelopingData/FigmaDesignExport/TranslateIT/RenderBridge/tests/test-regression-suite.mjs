const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
async function readJson(res) {
  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text));
  return payload;
}

const health = await readJson(await fetch(bridge + '/health'));
if (health.engine !== 'translateit-core') throw new Error('Wrong engine: ' + (health.engine || 'missing'));
if (health.engineBuild !== 'alpha-clean-1') throw new Error('Wrong engine build: ' + (health.engineBuild || 'missing'));
if (health.contract !== 'cloneModel') throw new Error('Wrong contract: ' + (health.contract || 'missing'));
if (health.retiredWorkflowActive !== false) throw new Error('retiredWorkflowActive must be false');

console.log(JSON.stringify({ status: 'pass', bridge, engine: health.engine, engineBuild: health.engineBuild, contract: health.contract }, null, 2));
