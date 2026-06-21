import fs from 'node:fs';
import { chromium } from 'playwright';

function fileToDataUrl(path, contentType = 'image/png') {
  const base64 = fs.readFileSync(path).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

function sourceDataUrl(payload) {
  const shot = payload.source?.screenshot;
  if (!shot?.base64) return '';
  return `data:${shot.contentType || 'image/png'};base64,${shot.base64}`;
}

export async function compareSourceAndClonePreview(payload, preview) {
  const sourceUrl = sourceDataUrl(payload);
  if (!sourceUrl || !preview?.pngPath || !fs.existsSync(preview.pngPath)) {
    return { available: false, reason: 'source or clone preview screenshot missing' };
  }

  const cloneUrl = fileToDataUrl(preview.pngPath, 'image/png');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 420 }, deviceScaleFactor: 1 });
  try {
    return await page.evaluate(async ({ sourceUrl, cloneUrl }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image load failed'));
          img.src = src;
        });
      }
      const source = await loadImage(sourceUrl);
      const clone = await loadImage(cloneUrl);
      const width = 180;
      const height = Math.max(120, Math.min(420, Math.round(width * Math.min(source.height / source.width, clone.height / clone.width))));
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, width, height);
      ctx.drawImage(clone, width, 0, width, height);
      const a = ctx.getImageData(0, 0, width, height).data;
      const b = ctx.getImageData(width, 0, width, height).data;
      let diff = 0;
      let strong = 0;
      let count = 0;
      let sourceInk = 0;
      let cloneInk = 0;
      for (let i = 0; i < a.length; i += 16) {
        const dr = Math.abs(a[i] - b[i]);
        const dg = Math.abs(a[i + 1] - b[i + 1]);
        const db = Math.abs(a[i + 2] - b[i + 2]);
        const d = (dr + dg + db) / 3;
        diff += d;
        if (d > 52) strong += 1;
        const sa = (a[i] + a[i + 1] + a[i + 2]) / 3;
        const ca = (b[i] + b[i + 1] + b[i + 2]) / 3;
        if (sa < 245) sourceInk += 1;
        if (ca < 245) cloneInk += 1;
        count += 1;
      }
      const avgDiff = count ? diff / count : 255;
      const strongDiffRatio = count ? strong / count : 1;
      const inkDelta = Math.abs(sourceInk - cloneInk) / Math.max(1, sourceInk);
      const pixelSimilarityScore = Math.round(Math.max(0, 100 - avgDiff * 0.55 - strongDiffRatio * 38 - inkDelta * 20));
      const blockSimilarityScore = Math.round(Math.max(0, 100 - strongDiffRatio * 100));
      const inkCoverageScore = Math.round(Math.max(0, 100 - inkDelta * 100));
      const visualSimilarityScore = Math.round(pixelSimilarityScore * 0.55 + blockSimilarityScore * 0.25 + inkCoverageScore * 0.2);
      const risk = visualSimilarityScore < 45 ? 'high' : visualSimilarityScore < 68 ? 'medium' : 'low';
      return {
        available: true,
        sampleSize: { width, height },
        sourceSize: { width: source.width, height: source.height },
        cloneSize: { width: clone.width, height: clone.height },
        averagePixelDifference: Number(avgDiff.toFixed(2)),
        strongDiffRatio: Number(strongDiffRatio.toFixed(3)),
        inkCoverageDelta: Number(inkDelta.toFixed(3)),
        pixelSimilarityScore,
        blockSimilarityScore,
        inkCoverageScore,
        visualSimilarityScore,
        risk
      };
    }, { sourceUrl, cloneUrl });
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
