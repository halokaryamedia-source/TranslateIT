import fs from 'node:fs';
import path from 'node:path';
import { buildFinalPayload } from './build-final-payload.mjs';
import { checkExternalVisualEngine, externalVisualEngineRequiredError } from './external-visual-engine-gate.mjs';
import { runCloneAudit } from './run-clone-audit.mjs';
import { PUBLIC_VERSION, ENGINE, ENGINE_BUILD, error, normalizeUrl } from './shared-contract.mjs';

export function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' });
  res.end(JSON.stringify(payload, null, 2));
}

function writeLatestReport(reportDir, name, payload) {
  fs.mkdirSync(reportDir, { recursive: true });
  const file = path.join(reportDir, name);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

async function requireExternalVisualEngine(res) {
  const visualEngine = await checkExternalVisualEngine();
  if (!visualEngine.ok) {
    sendJson(res, 503, externalVisualEngineRequiredError(visualEngine));
    return null;
  }
  return visualEngine;
}

export async function handleRender(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  const visualEngine = await requireExternalVisualEngine(res);
  if (!visualEngine) return;
  try {
    const payload = await buildFinalPayload(target);
    payload.externalVisualEngine = visualEngine;
    payload.diagnostics = { ...(payload.diagnostics || {}), externalVisualEngine: visualEngine, internalLayoutFallback: visualEngine.mode === 'internal-fallback-explicitly-enabled' };
    return sendJson(res, 200, payload);
  } catch (err) {
    return sendJson(res, 500, error(err?.message || err));
  }
}

export async function handleAudit(req, res, url, reportDir) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  const visualEngine = await requireExternalVisualEngine(res);
  if (!visualEngine) return;
  try {
    const payload = await buildFinalPayload(target);
    payload.externalVisualEngine = visualEngine;
    payload.diagnostics = { ...(payload.diagnostics || {}), externalVisualEngine: visualEngine, internalLayoutFallback: visualEngine.mode === 'internal-fallback-explicitly-enabled' };
    const audited = await runCloneAudit(payload, reportDir);
    const report = {
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      targetUrl: target,
      generatedAt: new Date().toISOString(),
      readyForFigmaTest: audited.audit.visualReadiness === 'pass',
      audit: audited.audit,
      diagnostics: audited.payload.diagnostics
    };
    report.reportPath = writeLatestReport(reportDir, 'translateit-clean-latest.json', report);
    return sendJson(res, 200, report);
  } catch (err) {
    const report = { publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, targetUrl: target, generatedAt: new Date().toISOString(), readyForFigmaTest: false, error: err?.message || String(err) };
    report.reportPath = writeLatestReport(reportDir, 'translateit-clean-latest.json', report);
    return sendJson(res, 500, report);
  }
}
