const target = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function readJson(res) {
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${payload?.error || text}`);
  return payload || {};
}

const health = await readJson(await fetch(`${bridge}/health`));
if (health.engine !== 'translateit-core') throw new Error(`Wrong engine: ${health.engine || 'missing'}`);
if (health.engineBuild !== 'alpha-clean-1') throw new Error(`Wrong engine build: ${health.engineBuild || 'missing'}`);
if (health.legacyActive !== false) throw new Error('legacyActive must be false');

const report = await readJson(await fetch(`${bridge}/audit?url=${encodeURIComponent(target)}`));
console.log(JSON.stringify({
  publicVersion: report.publicVersion,
  engine: report.engine,
  engineBuild: report.engineBuild,
  targetUrl: report.targetUrl,
  readyForFigmaTest: report.readyForFigmaTest,
  visualReadiness: report.audit?.visualReadiness,
  score: report.audit?.score,
  layoutScore: report.audit?.layoutScore,
  overlapScore: report.audit?.overlapScore,
  imageScore: report.audit?.imageScore,
  textScore: report.audit?.textScore,
  sectionScore: report.audit?.sectionScore,
  layerCleanlinessScore: report.audit?.layerCleanlinessScore,
  metrics: report.audit?.metrics,
  reportPath: report.reportPath,
  failures: report.audit?.failures || [],
  warnings: report.audit?.warnings || []
}, null, 2));

if (!report.readyForFigmaTest) process.exitCode = 2;
