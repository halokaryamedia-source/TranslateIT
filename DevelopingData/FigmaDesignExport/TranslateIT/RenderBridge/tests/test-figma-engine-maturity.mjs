import fs from 'node:fs';
import path from 'node:path';
import { evaluateFigmaEngineMaturity } from '../src/figma-engine-maturity-policy.mjs';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });

async function readJson(res) {
  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text));
  return payload;
}

const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const maturity = evaluateFigmaEngineMaturity(payload);
const report = {
  gate: 'translateit-figma-engine-maturity',
  targetUrl,
  ...maturity
};

fs.writeFileSync(path.join(reportDir, 'translateit-figma-engine-maturity.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (maturity.manualFigmaTestAllowed !== true) process.exitCode = 2;
