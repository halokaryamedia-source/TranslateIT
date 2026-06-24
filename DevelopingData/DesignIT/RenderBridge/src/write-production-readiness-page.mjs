import fs from 'node:fs';
import path from 'node:path';

function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function cls(verdict) { return verdict === 'Production-Ready Alpha Candidate' ? 'ok' : verdict === 'Alpha Reviewable' ? 'warn' : 'bad'; }
function list(items) { return (items || []).length ? `<ul>${items.map((item) => `<li><b>${esc(item.code)}</b> — ${esc(item.message)}</li>`).join('')}</ul>` : '<p class="small">None.</p>'; }

export function writeProductionReadinessPage(reportDir) {
  const production = readJson(path.join(reportDir, 'translateit-production-readiness.json')) || {};
  const layerTree = readJson(path.join(reportDir, 'translateit-professional-layer-tree.json')) || {};
  const readiness = readJson(path.join(reportDir, 'translateit-self-audit-readiness.json')) || {};
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>TranslateIT Production Readiness</title><style>body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1120px;margin:0 auto;padding:28px}.hero,.card{background:#111827;border:1px solid #334155;border-radius:22px;padding:22px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{background:#020617;border:1px solid #1f2937;border-radius:16px;padding:12px}.metric b{display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}.metric span{font-size:22px;font-weight:800}.ok{color:#86efac}.warn{color:#fde68a}.bad{color:#fca5a5}.small{font-size:12px;color:#94a3b8}p,li{line-height:1.55;color:#cbd5e1}.code{white-space:pre-wrap;background:#020617;border:1px solid #1f2937;border-radius:14px;padding:14px;color:#cbd5e1;overflow:auto}@media(max-width:900px){.grid{grid-template-columns:1fr}}</style></head><body><div class="wrap"><section class="hero"><p class="small">TranslateIT / Version 0.1 Alpha / Visual-Backed Editable Clone</p><h1 class="${cls(production.verdict)}">${esc(production.verdict || 'Not Ready')}</h1><p>${esc(production.limitation || 'Production readiness is scoped to visual-backed alpha workflow.')}</p><div class="grid"><div class="metric"><b>Alpha Candidate</b><span>${production.alphaCandidate ? 'YES' : 'NO'}</span></div><div class="metric"><b>Visual Similarity</b><span>${esc(production.summary?.visualSimilarity ?? 'n/a')}</span></div><div class="metric"><b>Layer Naming</b><span>${esc(production.summary?.layerNamingScore ?? layerTree.layerNamingScore ?? 'n/a')}</span></div><div class="metric"><b>Visual Risk</b><span>${esc(production.summary?.visualRisk || 'n/a')}</span></div></div></section><section class="card"><h2>Blockers</h2>${list(production.blockers)}<h2>Warnings</h2>${list(production.warnings)}</section><section class="card"><h2>Layer Tree Summary</h2><div class="code">${esc(JSON.stringify(layerTree.professionalLayerTree || layerTree, null, 2))}</div></section><section class="card"><h2>Readiness Summary</h2><div class="code">${esc(JSON.stringify(readiness, null, 2))}</div></section><section class="card"><h2>Production JSON</h2><div class="code">${esc(JSON.stringify(production, null, 2))}</div></section></div></body></html>`;
  const out = path.join(reportDir, 'translateit-production-readiness.html');
  fs.writeFileSync(out, html, 'utf8');
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('write-production-readiness-page.mjs')) {
  const reportDir = process.argv[2] || path.join(process.cwd(), 'reports');
  console.log(writeProductionReadinessPage(reportDir));
}
