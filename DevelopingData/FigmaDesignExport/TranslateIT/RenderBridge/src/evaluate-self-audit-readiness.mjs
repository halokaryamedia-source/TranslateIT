import fs from 'node:fs';
import path from 'node:path';

function readText(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function parseExitCodes(text) { const out = {}; for (const line of String(text || '').split(/\r?\n/)) { const m = line.trim().match(/^([^=]+)=(\d+)$/); if (m) out[m[1]] = Number(m[2]); } return out; }
function fail(reasons, code, message) { reasons.push({ code, message }); }
function scoreNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export function evaluateSelfAuditReadiness(reportDir) {
  const exitCodes = parseExitCodes(readText(path.join(reportDir, 'self-audit-exit-codes.txt')));
  const figma = readJson(path.join(reportDir, 'translateit-figma-sim-preview-latest.json')) || {};
  const regression = readJson(path.join(reportDir, 'translateit-regression-latest.json')) || {};
  const mivubi = readJson(path.join(reportDir, 'translateit-regression-site-mivubi-sample.json')) || {};
  const reasons = [];
  const warnings = [];
  const requiredCoreSteps = ['health', 'imports', 'contract', 'v2-markers', 'figma-dry-run', 'figma-sim-preview'];
  for (const step of requiredCoreSteps) {
    if (exitCodes[step] !== 0) fail(reasons, 'gate_failed_' + step, `Required gate failed or missing: ${step}`);
  }
  if (!exists(path.join(reportDir, 'translateit-figma-sim-preview-latest.png'))) fail(reasons, 'missing_figma_sim_preview', 'Missing full Figma Simulation Preview PNG.');
  if (!exists(path.join(reportDir, 'translateit-figma-sim-main-latest.png'))) fail(reasons, 'missing_figma_sim_main_preview', 'Missing main-only Figma Simulation Preview PNG.');
  if (!exists(path.join(reportDir, 'translateit-figma-sim-main-diff-latest.png'))) warnings.push({ code: 'missing_figma_sim_diff', message: 'Missing main Figma simulation diff overlay.' });
  const visualBackingEnabled = figma.visualBacking && figma.visualBacking.enabled === true;
  if (!visualBackingEnabled) fail(reasons, 'visual_backing_missing', 'Visual backing is missing or disabled.');
  if (figma.status && figma.status !== 'pass') fail(reasons, 'figma_sim_status_failed', 'Figma simulation preview gate failed.');
  const cmp = figma.comparison || {};
  if (cmp.available === false) fail(reasons, 'figma_sim_comparison_missing', 'Figma simulation comparison is unavailable.');
  const simSimilarity = scoreNumber(cmp.visualSimilarityScore);
  const simTop = scoreNumber(cmp.topViewportSimilarityScore);
  const simWorst = scoreNumber(cmp.worstBandScore);
  const simRisk = cmp.risk || 'unknown';
  if (simRisk === 'high') fail(reasons, 'figma_sim_high_risk', 'Figma simulation visual risk is high.');
  if (simTop && simTop < 88) fail(reasons, 'figma_sim_top_low', `Top viewport similarity is too low: ${simTop}.`);
  if (simSimilarity && simSimilarity < 82) fail(reasons, 'figma_sim_similarity_low', `Figma simulation similarity is too low: ${simSimilarity}.`);
  if (simWorst && simWorst < 62) warnings.push({ code: 'figma_sim_worst_band_medium', message: `Worst visual band is still weak: ${simWorst}.` });
  const mivubiAudit = mivubi.audit || {};
  if (mivubi.readyForFigmaTest !== true) warnings.push({ code: 'mivubi_engine_not_ready', message: 'Mivubi engine audit is not fully ready.' });
  if (mivubiAudit.visualReadiness && mivubiAudit.visualReadiness !== 'pass') warnings.push({ code: 'mivubi_visual_readiness_not_pass', message: `Mivubi visual readiness is ${mivubiAudit.visualReadiness}.` });
  const requiredFailures = regression.summary && Array.isArray(regression.summary.requiredFailures) ? regression.summary.requiredFailures : [];
  if (requiredFailures.length) warnings.push({ code: 'regression_required_failures', message: `Regression has required failures: ${requiredFailures.join(', ')}` });
  let verdict = 'Not Ready';
  if (!reasons.length) verdict = warnings.length ? 'Reviewable' : 'Manual Figma Allowed';
  const allowed = verdict === 'Manual Figma Allowed';
  return {
    generatedAt: new Date().toISOString(),
    verdict,
    manualFigmaAllowed: allowed,
    primaryReviewTarget: 'reports/translateit-figma-sim-main-latest.png',
    secondaryReviewTarget: 'reports/translateit-figma-sim-preview-latest.png',
    exitCodes,
    figmaSimulation: {
      status: figma.status || 'unknown',
      visualBacking: visualBackingEnabled,
      overlayOpacity: figma.overlayOpacity ?? null,
      similarity: simSimilarity || null,
      topViewportSimilarity: simTop || null,
      worstBandScore: simWorst || null,
      risk: simRisk,
      fullPreview: figma.pngPath || null,
      mainPreview: figma.mainPngPath || null,
      diffPreview: figma.diffPngPath || null
    },
    engineAudit: {
      readyForFigmaTest: mivubi.readyForFigmaTest === true,
      visualReadiness: mivubiAudit.visualReadiness || 'unknown',
      score: mivubiAudit.score || null,
      visualSimilarityScore: mivubiAudit.visualSimilarityScore || null
    },
    regression: regression.summary || null,
    reasons,
    warnings
  };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-self-audit-readiness.mjs')) {
  const reportDir = process.argv[2] || path.join(process.cwd(), 'reports');
  const result = evaluateSelfAuditReadiness(reportDir);
  const outPath = path.join(reportDir, 'translateit-self-audit-readiness.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ ...result, outPath }, null, 2));
  if (!result.manualFigmaAllowed) process.exitCode = result.verdict === 'Not Ready' ? 2 : 0;
}
