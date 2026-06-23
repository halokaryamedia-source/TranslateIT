const target = process.argv[2] || 'https://www.mivubi.com/';
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

const failures = [];
const warnings = [];

const healthResult = await readJson(await fetch(`${bridge}/health`));
const health = healthResult.payload || {};
if (!healthResult.ok || health.ok !== true) failures.push('RenderBridge health is not ok.');
if (health.engine !== 'translateit-core') failures.push(`Wrong engine: ${health.engine || 'missing'}`);
if (health.engineBuild !== 'alpha-clean-1') failures.push(`Wrong engine build: ${health.engineBuild || 'missing'}`);
if (health.retiredWorkflowActive !== false) failures.push('retiredWorkflowActive must be false');
if (health.contract !== 'cloneModel') failures.push(`Wrong contract: ${health.contract || 'missing'}`);
if (health.activeRenderer !== 'plugin/code-framework-production.js') failures.push(`Wrong active renderer: ${health.activeRenderer || 'missing'}`);
if (health.userFacingInput !== 'url-link') failures.push(`Wrong user-facing input: ${health.userFacingInput || 'missing'}`);

if (failures.length) {
  console.log(JSON.stringify({ gate: 'designit-sample-site', status: 'fail', target, bridge, health, warnings, failures }, null, 2));
  process.exitCode = 2;
} else {
  const auditResult = await readJson(await fetch(`${bridge}/audit?url=${encodeURIComponent(target)}`));
  const report = auditResult.payload || {};

  if (!auditResult.ok && report.code === 'EXTERNAL_VISUAL_ENGINE_REQUIRED') {
    warnings.push('External visual engine is not available. Sample visual-quality audit is blocked until OmniParser/UIED is running.');
    console.log(JSON.stringify({
      gate: 'designit-sample-site',
      status: 'blocked_external_visual_engine',
      target,
      bridge,
      readyForFigmaTest: false,
      externalVisualEngine: report.externalVisualEngine || null,
      nextAction: report.nextAction || [],
      warnings,
      failures: []
    }, null, 2));
  } else {
    if (!auditResult.ok) failures.push(`Audit failed unexpectedly: HTTP ${auditResult.status}`);
    if (auditResult.ok && report.readyForFigmaTest !== true) failures.push('Sample site is not ready for Figma test.');

    const cp = report.diagnostics?.clonePreview || {};
    console.log(JSON.stringify({
      gate: 'designit-sample-site',
      status: failures.length ? 'fail' : 'pass',
      publicVersion: report.publicVersion,
      engine: report.engine,
      engineBuild: report.engineBuild,
      targetUrl: report.targetUrl,
      readyForFigmaTest: report.readyForFigmaTest,
      visualReadiness: report.audit?.visualReadiness,
      score: report.audit?.score,
      metrics: report.audit?.metrics,
      visualModel: report.diagnostics?.visualModel || null,
      visualMatching: report.diagnostics?.visualMatching || null,
      clonePreview: {
        htmlPath: cp.htmlPath,
        pngPath: cp.pngPath,
        metrics: cp.metrics,
        comparison: cp.comparison || null,
        visualDiff: cp.visualDiff || null
      },
      cloneModel: report.diagnostics?.cloneModel || null,
      reportPath: report.reportPath,
      warnings: [...warnings, ...(report.audit?.warnings || [])],
      failures: [...failures, ...(report.audit?.failures || [])]
    }, null, 2));
    if (failures.length) process.exitCode = 2;
  }
}
