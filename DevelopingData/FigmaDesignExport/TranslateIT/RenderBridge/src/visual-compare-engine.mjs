import fs from 'node:fs';
import path from 'node:path';

export async function comparePngFiles(sourcePath, outputPath, diffPath) {
  const { PNG } = await import('pngjs');
  const pixelmatch = (await import('pixelmatch')).default;
  const source = PNG.sync.read(fs.readFileSync(sourcePath));
  const output = PNG.sync.read(fs.readFileSync(outputPath));
  const width = Math.min(source.width, output.width);
  const height = Math.min(source.height, output.height);
  const sourceCrop = new PNG({ width, height });
  const outputCrop = new PNG({ width, height });
  PNG.bitblt(source, sourceCrop, 0, 0, width, height, 0, 0);
  PNG.bitblt(output, outputCrop, 0, 0, width, height, 0, 0);
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(sourceCrop.data, outputCrop.data, diff.data, width, height, { threshold: 0.12 });
  if (diffPath) {
    fs.mkdirSync(path.dirname(diffPath), { recursive: true });
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }
  const total = width * height;
  const mismatchRatio = total ? mismatchedPixels / total : 1;
  return {
    version: 'visual-compare-result-v1',
    engine: 'pixelmatch',
    status: mismatchRatio <= 0.18 ? 'pass' : 'review',
    width,
    height,
    mismatchedPixels,
    totalPixels: total,
    mismatchRatio: Number(mismatchRatio.toFixed(6)),
    similarity: Number((1 - mismatchRatio).toFixed(6)),
    diffPath: diffPath || null
  };
}

export async function buildVisualComparePlan(payload) {
  let available = true;
  try { await import('pixelmatch'); await import('pngjs'); } catch { available = false; }
  return {
    version: 'visual-compare-plan-v1',
    engine: 'pixelmatch',
    status: available ? 'ready' : 'missing',
    threshold: 0.18,
    source: payload?.source?.screenshot ? { width: payload.source.screenshot.width || 0, height: payload.source.screenshot.height || 0 } : null,
    diagnostics: {
      available,
      purpose: 'Compare source screenshot with future Figma/HTML preview render before approving manual Figma output.',
      note: 'Plan is ready. Actual comparison runs after a renderable preview image exists.'
    }
  };
}
