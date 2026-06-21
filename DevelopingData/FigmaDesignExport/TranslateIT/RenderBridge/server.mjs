import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSite } from './src/capture-site.mjs';
import { extractLayout } from './src/extract-layout.mjs';
import { buildDesignModel } from './src/build-design-model.mjs';
import { visualAudit } from './src/visual-audit.mjs';
import { PUBLIC_VERSION, ENGINE, ENGINE_BUILD, ok, error, assertCleanPayload, normalizeUrl } from './src/shared-contract.mjs';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const here = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(here, 'reports');

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function writeLatestReport(name, payload) {
  fs.mkdirSync(reportDir, { recursive: true });
  const file = path.join(reportDir, name);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const layout = extractLayout(capture);
  const designModel = buildDesignModel(layout);
  const payload = ok({
    source: {
      ...capture.source,
      screenshot: capture.source.screenshot
    },
    designModel,
    diagnostics: {
      capture: {
        rawElements: capture.rawElements.length,
        assets: capture.assets.length
      },
      layout: layout.stats,
      model: designModel.diagnostics
    }
  });
  const contractFailures = assertCleanPayload(payload);
  if (contractFailures.length) {
    throw new Error(`Clean contract failed: ${contractFailures.join(', ')}`);
  }
  return payload;
}

async function handleRender(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try {
    const payload = await buildPayload(target);
    return sendJson(res, 200, payload);
  } catch (err) {
    return sendJson(res, 500, error(err?.message || err));
  }
}

async function handleAudit(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try {
    const payload = await buildPayload(target);
    const audit = visualAudit(payload);
    const report = {
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      targetUrl: target,
      generatedAt: new Date().toISOString(),
      readyForFigmaTest: audit.visualReadiness === 'pass',
      audit,
      diagnostics: payload.diagnostics
    };
    report.reportPath = writeLatestReport('translateit-clean-latest.json', report);
    return sendJson(res, 200, report);
  } catch (err) {
    const report = {
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      targetUrl: target,
      generatedAt: new Date().toISOString(),
      readyForFigmaTest: false,
      error: err?.message || String(err)
    };
    report.reportPath = writeLatestReport('translateit-clean-latest.json', report);
    return sendJson(res, 500, report);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/health') {
    return sendJson(res, 200, ok({
      adapter: 'clean-render-bridge',
      activeServer: 'server.mjs',
      activeRenderer: 'plugin/code.js',
      contract: 'designModel',
      legacyActive: false
    }));
  }
  if (url.pathname === '/render') return handleRender(req, res, url);
  if (url.pathname === '/audit') return handleAudit(req, res, url);
  return sendJson(res, 404, error('Route not found. Use /health, /render, or /audit.'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Clean RenderBridge running on http://127.0.0.1:${PORT}`);
  console.log(`Engine: ${ENGINE}`);
  console.log(`Engine Build: ${ENGINE_BUILD}`);
  console.log(`Public Version: ${PUBLIC_VERSION}`);
});
