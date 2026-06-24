import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { healthStatus } from './src/health-status.mjs';
import { handleAudit, handleRender, sendJson } from './src/route-handlers.mjs';
import { error, ENGINE, ENGINE_BUILD, PUBLIC_VERSION } from './src/shared-contract.mjs';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const here = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(here, 'reports');

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/health') return sendJson(res, 200, healthStatus());
  if (url.pathname === '/render') return handleRender(req, res, url);
  if (url.pathname === '/audit') return handleAudit(req, res, url, reportDir);
  return sendJson(res, 404, error('Route not found. Use /health, /render, or /audit.'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Clean RenderBridge running on http://127.0.0.1:${PORT}`);
  console.log(`Engine: ${ENGINE}`);
  console.log(`Engine Build: ${ENGINE_BUILD}`);
  console.log(`Public Version: ${PUBLIC_VERSION}`);
});
