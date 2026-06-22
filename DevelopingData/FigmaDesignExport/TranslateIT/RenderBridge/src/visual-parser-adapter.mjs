import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function rectOf(item = {}) { const r = item.rect || item.bbox || item.box || item.bounds || item; return { x: Math.round(Number(r.x ?? r.left ?? 0)), y: Math.round(Number(r.y ?? r.top ?? 0)), w: Math.round(Number(r.w ?? r.width ?? Math.max(0, Number(r.right ?? 0) - Number(r.left ?? 0)))), h: Math.round(Number(r.h ?? r.height ?? Math.max(0, Number(r.bottom ?? 0) - Number(r.top ?? 0)))) }; }
function normalizeRole(value) { const v = clean(value).toLowerCase(); if (/button|cta/.test(v)) return 'button'; if (/text|label|ocr|paragraph|heading|title/.test(v)) return 'text'; if (/image|media|picture|photo/.test(v)) return 'image'; if (/input|field|form/.test(v)) return 'input'; if (/nav|menu|link/.test(v)) return 'navigation'; if (/card|panel|container|section|group|block/.test(v)) return 'container'; return v || 'unknown'; }
export function normalizeVisualParserOutput(raw, source = {}) {
  const candidates = raw?.regions || raw?.elements || raw?.boxes || raw?.components || raw?.parsed || [];
  const regions = Array.isArray(candidates) ? candidates.map((item, index) => {
    const rect = rectOf(item);
    return { id: clean(item.id) || `visual-${index}`, role: normalizeRole(item.role || item.type || item.label || item.class || item.category), text: clean(item.text || item.content || item.ocr || item.labelText || ''), confidence: Number(item.confidence ?? item.score ?? item.probability ?? 0), rect, source: item.source || raw.engine || 'external-visual-parser', rawIndex: index };
  }).filter((item) => item.rect.w > 2 && item.rect.h > 2) : [];
  return { version: 'visual-parser-normalized-v1', engine: raw?.engine || raw?.source || 'external', source: { title: source.title || '', url: source.url || source.finalUrl || '', screenshot: source.screenshot ? { width: source.screenshot.width, height: source.screenshot.height } : null }, regions, diagnostics: { regions: regions.length, textRegions: regions.filter((r) => r.role === 'text').length, buttons: regions.filter((r) => r.role === 'button').length, images: regions.filter((r) => r.role === 'image').length, containers: regions.filter((r) => r.role === 'container').length } };
}
async function runOmniParserEndpoint(source) {
  const endpoint = process.env.OMNIPARSER_ENDPOINT;
  if (!endpoint) return null;
  const screenshot = source.screenshot?.base64;
  if (!screenshot) throw new Error('OMNIPARSER_ENDPOINT configured but source screenshot is missing.');
  const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image_base64: screenshot, url: source.url || source.finalUrl || '', title: source.title || '' }) });
  const text = await res.text();
  let json = {}; try { json = text ? JSON.parse(text) : {}; } catch { throw new Error('OmniParser endpoint returned non-JSON response.'); }
  if (!res.ok) throw new Error('OmniParser endpoint failed: HTTP ' + res.status + ' ' + (json.error || text));
  return normalizeVisualParserOutput({ engine: 'omniparser-endpoint', ...json }, source);
}
function runUiedCli(source) {
  const cli = process.env.UIED_CLI_PATH;
  if (!cli) return null;
  const screenshot = source.screenshot?.base64;
  if (!screenshot) throw new Error('UIED_CLI_PATH configured but source screenshot is missing.');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'translateit-uied-'));
  const imagePath = path.join(tmp, 'source.png');
  const outPath = path.join(tmp, 'uied-output.json');
  fs.writeFileSync(imagePath, Buffer.from(screenshot, 'base64'));
  const result = spawnSync(cli, [imagePath, outPath], { encoding: 'utf8', timeout: 90000 });
  if (result.status !== 0) throw new Error('UIED CLI failed: ' + (result.stderr || result.stdout || 'unknown error'));
  if (!fs.existsSync(outPath)) throw new Error('UIED CLI completed but did not create output JSON.');
  const json = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  return normalizeVisualParserOutput({ engine: 'uied-cli', ...json }, source);
}
export async function runExternalVisualParser(source) {
  const attempts = [];
  try { const omni = await runOmniParserEndpoint(source); if (omni) return { status: 'ready', parser: 'omniparser-endpoint', result: omni, attempts }; } catch (error) { attempts.push({ parser: 'omniparser-endpoint', error: error.message }); }
  try { const uied = runUiedCli(source); if (uied) return { status: 'ready', parser: 'uied-cli', result: uied, attempts }; } catch (error) { attempts.push({ parser: 'uied-cli', error: error.message }); }
  return { status: 'missing', parser: null, result: null, attempts, reason: 'No external visual parser configured. Set OMNIPARSER_ENDPOINT or UIED_CLI_PATH.' };
}
