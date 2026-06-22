import fs from 'node:fs';
import path from 'node:path';

const endpoint = process.env.OMNIPARSER_ENDPOINT || 'http://127.0.0.1:7860/parse';
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('Usage: node tools/omniparser-bridge/smoke-test-omniparser-bridge.mjs <screenshot.png>');
  process.exit(2);
}

if (!fs.existsSync(imagePath)) {
  console.error(`Screenshot not found: ${imagePath}`);
  process.exit(2);
}

const image_base64 = fs.readFileSync(imagePath).toString('base64');
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    image_base64,
    url: 'local-smoke-test',
    title: path.basename(imagePath)
  })
});

const text = await response.text();
let payload = {};
try {
  payload = text ? JSON.parse(text) : {};
} catch {
  console.error('Bridge returned non-JSON response:');
  console.error(text);
  process.exit(2);
}

const regions = Array.isArray(payload.regions) ? payload.regions : [];
const failures = [];
if (!response.ok) failures.push(`HTTP ${response.status}: ${payload.error || text}`);
if (!regions.length) failures.push('No visual regions returned.');
for (const [index, region] of regions.entries()) {
  if (!region.rect || typeof region.rect !== 'object') failures.push(`Region ${index} missing rect.`);
  if (!region.role) failures.push(`Region ${index} missing role.`);
}

const report = {
  gate: 'translateit-omniparser-bridge-smoke-test',
  status: failures.length ? 'fail' : 'pass',
  endpoint,
  regions: regions.length,
  diagnostics: payload.diagnostics || null,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(2);
