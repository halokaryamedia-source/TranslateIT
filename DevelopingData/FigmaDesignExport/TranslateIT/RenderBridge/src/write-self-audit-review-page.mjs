import fs from 'node:fs';
import path from 'node:path';

function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function read(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function rel(from, to) { return path.relative(from, to).replace(/\\/g, '/'); }
function parseJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }

export function writeSelfAuditReviewPage(reportDir) {
  const reviewPath = path.join(reportDir, 'translateit-self-audit-review.html');
  const figmaPng = path.join(reportDir, 'translateit-figma-sim-preview-latest.png');
  const enginePng = path.join(reportDir, 'translateit-regression-site-mivubi-sample.png');
  const diffPng = path.join(reportDir, 'translateit-regression-site-mivubi-sample-diff.png');
  const exitCodes = read(path.join(reportDir, 'self-audit-exit-codes.txt'));
  const figmaJson = parseJson(path.join(reportDir, 'translateit-figma-sim-preview-latest.json'));
  const regressionJson = parseJson(path.join(reportDir, 'translateit-regression-site-mivubi-sample.json'));
  const audit = regressionJson && regressionJson.audit || {};
  const metrics = audit.metrics || {};
  const comparison = metrics.preview && metrics.preview.comparison || {};
  const verdict = audit.visualReadiness === 'pass' && comparison.risk !== 'high' ? 'Reviewable' : 'Needs more engine work';
  const imageBlock = (title, file, note) => exists(file) ? `<section class="card"><h2>${esc(title)}</h2><p>${esc(note)}</p><img src="${esc(rel(reportDir, file))}" /></section>` : `<section class="card missing"><h2>${esc(title)}</h2><p>Missing file: ${esc(path.basename(file))}</p></section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>TranslateIT Self Audit Review</title><style>body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:28px}.hero{background:#111827;border:1px solid #334155;border-radius:22px;padding:22px;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{background:#020617;border:1px solid #1f2937;border-radius:16px;padding:12px}.metric b{display:block;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em}.metric span{font-size:22px;font-weight:800}.card{background:#111827;border:1px solid #334155;border-radius:22px;padding:18px;margin:18px 0}.card img{width:100%;display:block;border-radius:14px;border:1px solid #1f2937;background:white}.missing{border-color:#7f1d1d}.code{white-space:pre-wrap;background:#020617;border:1px solid #1f2937;border-radius:14px;padding:14px;color:#cbd5e1}.ok{color:#86efac}.warn{color:#fde68a}.bad{color:#fca5a5}h1,h2,p{margin-top:0}p{color:#cbd5e1;line-height:1.55}.small{font-size:12px;color:#94a3b8}</style></head><body><div class="wrap"><div class="hero"><p class="small">TranslateIT / Version 0.1 - Alpha / Visual-Backed Editable Clone</p><h1>Self Audit Review: ${esc(verdict)}</h1><p>Main review target is <b>Figma Simulation Preview</b>. Manual Figma testing should wait until this preview is visually acceptable.</p><div class="grid"><div class="metric"><b>Visual Readiness</b><span>${esc(audit.visualReadiness || 'n/a')}</span></div><div class="metric"><b>Score</b><span>${esc(audit.score || 'n/a')}</span></div><div class="metric"><b>Similarity</b><span>${esc(audit.visualSimilarityScore || comparison.visualSimilarityScore || 'n/a')}</span></div><div class="metric"><b>Risk</b><span>${esc(comparison.risk || 'n/a')}</span></div></div></div>${imageBlock('1. Figma Simulation Preview', figmaPng, 'This is the closest automated preview to what the Figma plugin should render.')}${imageBlock('2. Engine Clone Preview', enginePng, 'This is the RenderBridge clone preview before plugin-style framing.')}${imageBlock('3. Source vs Clone Diff Overlay', diffPng, 'Left is source screenshot; right is clone with red diff overlay.')}<section class="card"><h2>Figma Simulation JSON</h2><div class="code">${esc(JSON.stringify(figmaJson || {}, null, 2))}</div></section><section class="card"><h2>Exit Codes</h2><div class="code">${esc(exitCodes || 'No exit codes found.')}</div></section><section class="card"><h2>Decision Checklist</h2><div class="code">Manual Figma test allowed only when:\n- Figma Simulation Preview visually matches the source target.\n- Visual backing is present.\n- Editable overlay is grouped and low opacity.\n- Exit codes for imports, contract, v2, figma-dry-run, figma-sim-preview are 0.\n- No high-risk visual comparison flag.</div></section></div></body></html>`;
  fs.writeFileSync(reviewPath, html, 'utf8');
  return reviewPath;
}

if (process.argv[1] && process.argv[1].endsWith('write-self-audit-review-page.mjs')) {
  const reportDir = process.argv[2] || path.join(process.cwd(), 'reports');
  console.log(writeSelfAuditReviewPage(reportDir));
}
