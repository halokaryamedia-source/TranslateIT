import fs from 'node:fs';
import path from 'node:path';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const root = process.cwd();
const configPath = path.join(root, 'tests', 'regression-sites.json');
const reportDir = path.join(root, 'reports');
const sites = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function safeId(value) { return String(value || 'site').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase(); }
function copyIfExists(from, to) { try { if (from && fs.existsSync(from)) fs.copyFileSync(from, to); return fs.existsSync(to) ? to : null; } catch { return null; } }
async function readJson(res) { const text = await res.text(); let payload = {}; try { payload = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text)); return payload; }

async function auditSite(site) {
  try {
    const report = await readJson(await fetch(bridge + '/audit?url=' + encodeURIComponent(site.url)));
    const audit = report.audit || {};
    const metrics = audit.metrics || {};
    const id = safeId(site.id);
    const siteJsonPath = path.join(reportDir, 'translateit-regression-site-' + id + '.json');
    const siteHtmlPath = path.join(reportDir, 'translateit-regression-site-' + id + '.html');
    const sitePngPath = path.join(reportDir, 'translateit-regression-site-' + id + '.png');
    const siteDiffPngPath = path.join(reportDir, 'translateit-regression-site-' + id + '-diff.png');
    const siteDiffHtmlPath = path.join(reportDir, 'translateit-regression-site-' + id + '-diff.html');
    fs.writeFileSync(siteJsonPath, JSON.stringify(report, null, 2), 'utf8');
    const clonePreview = report.diagnostics && report.diagnostics.clonePreview || {};
    const visualDiff = clonePreview.visualDiff || {};
    const copiedHtml = copyIfExists(clonePreview.htmlPath, siteHtmlPath);
    const copiedPng = copyIfExists(clonePreview.pngPath, sitePngPath);
    const copiedDiffPng = copyIfExists(visualDiff.overlayPath, siteDiffPngPath);
    const copiedDiffHtml = copyIfExists(visualDiff.overlayHtmlPath, siteDiffHtmlPath);
    return {
      id: site.id,
      category: site.category,
      url: site.url,
      required: site.required === true,
      status: report.readyForFigmaTest ? 'pass' : 'fail',
      readyForFigmaTest: report.readyForFigmaTest === true,
      visualReadiness: audit.visualReadiness || 'unknown',
      score: audit.score || 0,
      visualSimilarityScore: audit.visualSimilarityScore || 0,
      visualMatchScore: audit.visualMatchScore || 0,
      cloneFidelityScore: audit.cloneFidelityScore || 0,
      topViewportSimilarityScore: metrics.preview && metrics.preview.comparison ? metrics.preview.comparison.topViewportSimilarityScore : 0,
      sectionBandSimilarityScore: metrics.preview && metrics.preview.comparison ? metrics.preview.comparison.sectionBandSimilarityScore : 0,
      worstBandScore: metrics.preview && metrics.preview.comparison ? metrics.preview.comparison.worstBandScore : 0,
      visualMatchRate: metrics.visualMatchRate || 0,
      visualMatchConfidence: metrics.visualMatchConfidence || 0,
      fabricatedLayoutRisk: metrics.preview && metrics.preview.comparison ? metrics.preview.comparison.risk : metrics.preview && metrics.preview.fabricatedLayoutRisk || 'unknown',
      siteReportPath: siteJsonPath,
      previewHtmlPath: copiedHtml || clonePreview.htmlPath || null,
      previewPngPath: copiedPng || clonePreview.pngPath || null,
      diffPngPath: copiedDiffPng || visualDiff.overlayPath || null,
      diffHtmlPath: copiedDiffHtml || visualDiff.overlayHtmlPath || null,
      failures: audit.failures || [],
      warnings: audit.warnings || []
    };
  } catch (err) {
    return { id: site.id, category: site.category, url: site.url, required: site.required === true, status: 'error', readyForFigmaTest: false, error: err && err.message ? err.message : String(err) };
  }
}

const health = await readJson(await fetch(bridge + '/health'));
if (health.engine !== 'translateit-core') throw new Error('Wrong engine: ' + (health.engine || 'missing'));
if (health.engineBuild !== 'alpha-clean-1') throw new Error('Wrong engine build: ' + (health.engineBuild || 'missing'));
if (health.contract !== 'cloneModel') throw new Error('Wrong contract: ' + (health.contract || 'missing'));
if (health.legacyActive !== false) throw new Error('legacyActive must be false');

fs.mkdirSync(reportDir, { recursive: true });
const results = [];
for (const site of sites) results.push(await auditSite(site));

const summary = { generatedAt: new Date().toISOString(), bridge, total: results.length, pass: results.filter((item) => item.status === 'pass').length, fail: results.filter((item) => item.status === 'fail').length, error: results.filter((item) => item.status === 'error').length, requiredFailures: results.filter((item) => item.required && item.status !== 'pass').map((item) => item.id) };
const output = { summary, results };
const reportPath = path.join(reportDir, 'translateit-regression-latest.json');
fs.writeFileSync(reportPath, JSON.stringify(output, null, 2), 'utf8');
console.log(JSON.stringify({ ...summary, reportPath, siteReports: results.map((item) => ({ id: item.id, status: item.status, report: item.siteReportPath, preview: item.previewPngPath, diff: item.diffPngPath })) }, null, 2));
if (summary.requiredFailures.length) process.exitCode = 2;
