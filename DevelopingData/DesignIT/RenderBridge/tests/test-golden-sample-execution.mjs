import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = process.cwd();
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const configPath = path.join(root, 'tests', 'fixtures', 'designit-golden-samples.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const fixtureRoot = path.join(root, config.fixtureRoot || 'tests/fixtures/golden-html');
const failures = [];
const warnings = [];

function safeJoin(base, requestPath) {
  const clean = decodeURIComponent(String(requestPath || '/').split('?')[0]).replace(/^\/+/, '');
  const full = path.resolve(base, clean || 'index.html');
  if (!full.startsWith(path.resolve(base))) return null;
  return full;
}

function createStaticServer() {
  const server = http.createServer((req, res) => {
    const file = safeJoin(fixtureRoot, req.url || '/');
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

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

function metricValue(report, key) {
  const metrics = report.audit?.metrics || {};
  const clone = report.diagnostics?.cloneModel || {};
  const renderPlan = report.diagnostics?.figmaRenderPlan || report.figmaRenderPlan?.diagnostics || {};
  const map = {
    editableText: metrics.textLayers ?? clone.textLayers ?? renderPlan.textLayers,
    editableImages: metrics.imageLayers ?? clone.imageLayers ?? renderPlan.imageLayers,
    editableButtons: metrics.buttonLayers ?? clone.buttonLayers ?? renderPlan.componentButtons,
    cards: metrics.cardGroups ?? clone.cardGroups ?? renderPlan.cardGroups,
    sections: metrics.sections ?? clone.sections ?? renderPlan.frames,
    editableInputs: metrics.inputLayers ?? clone.inputLayers ?? renderPlan.inputLayers
  };
  return Number(map[key] ?? 0);
}

function validateReportAgainstSample(sample, report) {
  const sampleFailures = [];
  if (report.readyForFigmaTest !== true) sampleFailures.push('report.readyForFigmaTest is not true');
  for (const [key, min] of Object.entries(sample.minimums || {})) {
    const actual = metricValue(report, key);
    if (key === 'editableInputs' && min > 0 && actual === 0) {
      sampleFailures.push(`${key} has no measured implementation yet; expected at least ${min}`);
    } else if (actual < Number(min)) {
      sampleFailures.push(`${key} below minimum: ${actual} < ${min}`);
    }
  }
  return sampleFailures;
}

const server = await createStaticServer();
const port = server.address().port;
const sampleResults = [];
let blockedByExternalEngine = false;

try {
  const health = await readJson(await fetch(`${bridge}/health`));
  if (!health.ok || health.payload?.ok !== true) failures.push('RenderBridge health is not ok.');
  if (health.payload?.renderPolicy !== 'external-visual-engine-required') failures.push('RenderBridge must keep the external visual engine policy explicit.');

  for (const sample of config.samples || []) {
    const fixture = sample.fixture;
    const fixtureFile = path.join(fixtureRoot, fixture || 'missing.html');
    if (!fixture || !fs.existsSync(fixtureFile)) {
      failures.push(`${sample.id}: fixture file is missing`);
      continue;
    }
    const fixtureUrl = `http://127.0.0.1:${port}/${encodeURIComponent(fixture)}`;
    const audit = await readJson(await fetch(`${bridge}/audit?url=${encodeURIComponent(fixtureUrl)}`));
    const row = { id: sample.id, fixture, fixtureUrl, httpStatus: audit.status, status: 'unknown', failures: [], warnings: [] };

    if (!audit.ok && audit.payload?.code === 'EXTERNAL_VISUAL_ENGINE_REQUIRED') {
      blockedByExternalEngine = true;
      row.status = 'blocked_external_visual_engine';
      row.warnings.push('External visual engine is required before golden sample render execution can complete.');
    } else if (!audit.ok) {
      row.status = 'fail';
      row.failures.push(`Audit failed unexpectedly: HTTP ${audit.status}`);
    } else {
      const sampleFailures = validateReportAgainstSample(sample, audit.payload);
      row.status = sampleFailures.length ? 'fail' : 'pass';
      row.score = audit.payload.audit?.score ?? null;
      row.readyForFigmaTest = audit.payload.readyForFigmaTest ?? null;
      row.failures.push(...sampleFailures);
    }

    if (row.failures.length) failures.push(...row.failures.map((failure) => `${sample.id}: ${failure}`));
    if (row.warnings.length) warnings.push(...row.warnings.map((warning) => `${sample.id}: ${warning}`));
    sampleResults.push(row);

    if (blockedByExternalEngine) break;
  }
} catch (error) {
  failures.push(`Golden sample execution failed unexpectedly: ${error?.message || String(error)}`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const status = failures.length ? 'fail' : blockedByExternalEngine ? 'blocked_external_visual_engine' : 'pass';
const report = {
  gate: 'designit-golden-sample-execution',
  status,
  fixtureRoot: path.relative(root, fixtureRoot).replace(/\\/g, '/'),
  bridge,
  servedFrom: `http://127.0.0.1:${port}`,
  sampleResults,
  warnings,
  failures,
  nextAction: blockedByExternalEngine ? 'Start OmniParser/UIED external visual engine, then rerun this gate.' : 'Use failed sample metrics to prioritize quality fixes.'
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
