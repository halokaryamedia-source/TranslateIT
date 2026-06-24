import fs from 'node:fs';
import path from 'node:path';

function readText(file) { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function parseExitCodes(text) { const out = {}; for (const line of String(text || '').split(/\r?\n/)) { const m = line.trim().match(/^([^=]+)=(\d+)$/); if (m) out[m[1]] = Number(m[2]); } return out; }
function add(list, code, message) { list.push({ code, message }); }
function score(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function evaluateProductionReadiness(reportDir) {
  const exits = parseExitCodes(readText(path.join(reportDir, 'self-audit-exit-codes.txt')));
  const readiness = readJson(path.join(reportDir, 'translateit-self-audit-readiness.json')) || {};
  const figma = readJson(path.join(reportDir, 'translateit-figma-sim-preview-latest.json')) || {};
  const parity = readJson(path.join(reportDir, 'translateit-source-size-frame-parity.json')) || {};
  const professional = readJson(path.join(reportDir, 'translateit-professional-gate-report.json')) || {};
  const layerTree = readJson(path.join(reportDir, 'translateit-professional-layer-tree.json')) || {};
  const blockers = [];
  const warnings = [];
  const requiredSteps = ['health', 'imports', 'contract', 'v2-markers', 'mivubi-sample', 'figma-dry-run', 'figma-sim-preview', 'source-size-parity', 'regression', 'review-dashboard', 'professional-gate-report', 'professional-layer-tree'];
  for (const step of requiredSteps) if (exits[step] !== 0) add(blockers, 'exit_' + step, `Exit code for ${step} is not 0.`);
  const requiredFiles = ['translateit-self-audit-review.html', 'translateit-self-audit-readiness.json', 'translateit-professional-gate-report.json', 'translateit-professional-layer-tree.json', 'translateit-source-size-frame-parity.json', 'translateit-figma-sim-main-latest.png', 'translateit-figma-sim-main-diff-latest.png'];
  for (const file of requiredFiles) if (!exists(path.join(reportDir, file))) add(blockers, 'missing_' + file.replace(/[^a-z0-9]+/gi, '_'), `Missing report artifact: ${file}.`);
  if (readiness.manualFigmaAllowed !== true) add(blockers, 'manual_figma_not_allowed', 'Self-audit readiness does not allow manual Figma testing.');
  if (figma.status !== 'pass') add(blockers, 'figma_sim_not_pass', 'Figma simulation gate did not pass.');
  if (parity.status !== 'pass') add(blockers, 'source_size_parity_not_pass', 'Source-size frame parity did not pass.');
  if (professional.status !== 'pass') add(blockers, 'professional_gate_not_pass', 'Professional gate report did not pass.');
  if (layerTree.status !== 'pass') add(blockers, 'layer_tree_not_pass', 'Professional layer tree gate did not pass.');
  if (score(figma.comparison?.visualSimilarityScore) < 96) add(warnings, 'visual_similarity_below_release_target', 'Visual similarity is below production alpha target 96.');
  if (score(figma.comparison?.topViewportSimilarityScore) < 96) add(warnings, 'top_viewport_below_release_target', 'Top viewport similarity is below production alpha target 96.');
  if (score(layerTree.layerNamingScore) < 98) add(warnings, 'layer_naming_below_release_target', 'Layer naming score is below production alpha target 98.');
  if (readiness.captureQuality?.imageLoadRatio < 1) add(warnings, 'image_load_not_perfect', 'Image load ratio is below 100%.');
  let verdict = 'Not Ready';
  if (!blockers.length && warnings.length) verdict = 'Alpha Reviewable';
  if (!blockers.length && !warnings.length) verdict = 'Production-Ready Alpha Candidate';
  return {
    generatedAt: new Date().toISOString(),
    verdict,
    productionReady: verdict === 'Production-Ready Alpha Candidate',
    alphaCandidate: !blockers.length,
    productMode: 'visual-backed-editable-clone',
    limitation: 'This is production-ready only for the alpha visual-backed workflow; pure native editable reconstruction is still a later milestone.',
    summary: {
      visualSimilarity: score(figma.comparison?.visualSimilarityScore),
      topViewportSimilarity: score(figma.comparison?.topViewportSimilarityScore),
      visualRisk: figma.comparison?.risk || 'unknown',
      layerNamingScore: score(layerTree.layerNamingScore),
      sourceSizeParity: parity.status || 'unknown',
      professionalLayerTree: layerTree.status || 'unknown',
      manualFigmaAllowed: readiness.manualFigmaAllowed === true
    },
    blockers,
    warnings,
    exitCodes: exits
  };
}

if (process.argv[1] && process.argv[1].endsWith('evaluate-production-readiness.mjs')) {
  const reportDir = process.argv[2] || path.join(process.cwd(), 'reports');
  const result = evaluateProductionReadiness(reportDir);
  const out = path.join(reportDir, 'translateit-production-readiness.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify({ ...result, out }, null, 2));
  if (!result.alphaCandidate) process.exitCode = 2;
}
