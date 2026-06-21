import fs from 'node:fs';
import path from 'node:path';
import { buildPayload } from './build-payload.mjs';
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

export async function handleRender(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try {
    return sendJson(res, 200, await buildPayload(target));
  } catch (err) {
    return sendJson(res, 500, error(err?.message || err));
  }
}

export async function handleAudit(req, res, url, reportDir) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try {
    const payload = await buildPayload(target);
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
