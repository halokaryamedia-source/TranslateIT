import fs from 'node:fs';
import path from 'node:path';

const endpoint = process.env.OMNIPARSER_ENDPOINT || 'http://127.0.0.1:7860/parse';
const healthUrl = endpoint.replace(/\/parse\/?$/, '/health');
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
const failures = [];
async function json(res) { const text = await res.text(); let data = {}; try { data = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (data.detail || data.error || text)); return data; }
try {
  const health = await json(await fetch(healthUrl));
  if (health.ok !== true) failures.push('health.ok is not true');
} catch (error) {
  failures.push('health failed: ' + error.message);
}
const onePixelPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
try {
  const parsed = await json(await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image_base64: onePixelPng, title: 'TranslateIT Endpoint Contract Test', url: 'about:blank' }) }));
  if (!Array.isArray(parsed.regions)) failures.push('parse response has no regions array');
} catch (error) {
  failures.push('parse failed: ' + error.message);
}
const report = { gate: 'translateit-omniparser-endpoint', status: failures.length ? 'fail' : 'pass', endpoint, healthUrl, failures };
fs.writeFileSync(path.join(reportDir, 'translateit-omniparser-endpoint.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
