import fs from 'node:fs';
import path from 'node:path';

function txt(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function json(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function has(file) { try { return fs.existsSync(file); } catch { return false; } }
function exits(text) { const out = {}; for (const line of String(text || '').split(/\r?\n/)) { const m = line.trim().match(/^([^=]+)=(\d+)$/); if (m) out[m[1]] = Number(m[2]); } return out; }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function add(list, code, message) { list.push({ code, message }); }

export function evaluateSelfAuditReadiness(reportDir) {
  const exitCodes = exits(txt(path.join(reportDir, 'self-audit-exit-codes.txt')));
  const figma = json(path.join(reportDir, 'translateit-figma-sim-preview-latest.json')) || {};
  const regression = json(path.join(reportDir, 'translateit-regression-latest.json')) || {};
  const mivubi = json(path.join(reportDir, 'translateit-regression-site-mivubi-sample.json')) || {};
  const reasons = [];
  const warnings = [];
  for (const step of ['health', 'imports', 'contract', 'v2-markers', 'figma-dry-run', 'figma-sim-preview']) {
    if (exitCodes[step] !== 0) add(reasons, 'gate_failed_' + step, `Required gate failed or missing: ${step}`);
  }
  const files = {
    full: path.join(reportDir, 'translateit-figma-sim-preview-latest.png'),
    main: path.join(reportDir, 'translateit-figma-sim-main-latest.png'),
    diff: path.join(reportDir, 'translateit-figma-sim-main-diff-latest.png')
  };
  if (!has(files.full)) add(reasons, 'missing_figma_sim_preview', 'Missing full Figma Simulation Preview PNG.');
  if (!has(files.main)) add(reasons, 'missing_figma_sim_main_preview', 'Missing main-only Figma Simulation Preview PNG.');
  if (!has(files.diff)) add(warnings, 'missing_figma_sim_diff', 'Missing main Figma simulation diff overlay.');
  const visualBacking = figma.visualBacking && figma.visualBacking.enabled === true;
  if (!visualBacking) add(reasons, 'visual_backing_missing', 'Visual backing is missing or disabled.');
  if (figma.status && figma.status !== 'pass') add(reasons, 'figma_sim_status_failed', 'Figma simulation preview gate failed.');
  const cmp = figma.comparison || {};
  const simScore = num(cmp.visualSimilarityScore);
  const topScore = num(cmp.topViewportSimilarityScore);
  const worstScore = num(cmp.worstBandScore);
  const risk = cmp.risk || 'unknown';
  if (cmp.available === false) add(reasons, 'figma_sim_comparison_missing', 'Figma simulation comparison is unavailable.');
  if (risk === 'high') add(reasons, 'figma_sim_high_risk', 'Figma simulation visual risk is high.');
  if (topScore && topScore < 88) add(reasons, 'figma_sim_top_low', `Top viewport similarity is too low: ${topScore}.`);
  if (simScore && simScore < 82) add(reasons, 'figma_sim_similarity_low', `Figma simulation similarity is too low: ${simScore}.`);
  if (worstScore && worstScore < 62) add(warnings, 'figma_sim_worst_band_medium', `Worst visual band is still weak: ${worstScore}.`);

  const capture = mivubi.diagnostics?.capture || {};
  const stable = capture.stabilization || {};
  const imageCount = num(stable.imageCount);
  const loadedCount = num(stable.imageLoadedCount);
  const missingCount = num(stable.imageBrokenCount);
  const imageRatio = imageCount ? loadedCount / imageCount : 1;
  if (imageCount && imageRatio < 0.72) add(reasons, 'capture_image_load_ratio_low', `Only ${loadedCount}/${imageCount} images loaded during capture.`);
  else if (imageCount && imageRatio < 0.9) add(warnings, 'capture_image_load_ratio_medium', `${loadedCount}/${imageCount} images loaded during capture.`);
  if (missingCount > 0) add(warnings, 'capture_image_missing_sources', `${missingCount} image sources were not usable during capture.`);
  if (stable.animationsFrozen === false) add(warnings, 'capture_animation_freeze_not_confirmed', 'Animation freeze was not confirmed.');

  const audit = mivubi.audit || {};
  if (mivubi.readyForFigmaTest !== true) add(warnings, 'mivubi_engine_not_ready', 'Mivubi engine audit is not fully ready.');
  if (audit.visualReadiness && audit.visualReadiness !== 'pass') add(warnings, 'mivubi_visual_readiness_not_pass', `Mivubi visual readiness is ${audit.visualReadiness}.`);
  const requiredFailures = regression.summary && Array.isArray(regression.summary.requiredFailures) ? regression.summary.requiredFailures : [];
  if (requiredFailures.length) add(warnings, 'regression_required_failures', `Regression has required failures: ${requiredFailures.join(', ')}`);

  const verdict = reasons.length ? 'Not Ready' : warnings.length ? 'Reviewable' : 'Manual Figma Allowed';
  return {
    generatedAt: new Date().toISOString(),
    verdict,
    manualFigmaAllowed: verdict === 'Manual Figma Allowed',
    primaryReviewTarget: 'reports/translateit-figma-sim-main-latest.png',
    secondaryReviewTarget: 'reports/translateit-figma-sim-preview-latest.png',
    exitCodes,
    captureQuality: {
      imageCount,
      imageLoadedCount: loadedCount,
      imageMissingCount: missingCount,
      imageLoadRatio: Number(imageRatio.toFixed(3)),
      animationsFrozen: stable.animationsFrozen ?? null,
      lazyScrollPasses: stable.lazyScrollPasses ?? null,
      fontReady: stable.fontReady ?? null
    },
    figmaSimulation: {
      status: figma.status || 'unknown',
      visualBacking,
      overlayOpacity: figma.overlayOpacity ?? null,
      similarity: simScore || null,
      topViewportSimilarity: topScore || null,
      worstBandScore: worstScore || null,
      risk,
      fullPreview: figma.pngPath || null,
      mainPreview: figma.mainPngPath || null,
      diffPreview: figma.diffPngPath || null
    },
    engineAudit: {
      readyForFigmaTest: mivubi.readyForFigmaTest === true,
      visualReadiness: audit.visualReadiness || 'unknown',
      score: audit.score || null,
      visualSimilarityScore: audit.visualSimilarityScore || null
    },
    regression: regression.summary || null,
    reasons,
    warnings
  };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-self-audit-readiness-v2.mjs')) {
  const reportDir = process.argv[2] || path.join(process.cwd(), 'reports');
  const result = evaluateSelfAuditReadiness(reportDir);
  const outPath = path.join(reportDir, 'translateit-self-audit-readiness.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ ...result, outPath }, null, 2));
  if (!result.manualFigmaAllowed) process.exitCode = result.verdict === 'Not Ready' ? 2 : 0;
}
