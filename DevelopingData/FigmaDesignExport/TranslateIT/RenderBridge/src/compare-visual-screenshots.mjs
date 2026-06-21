import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function fileToDataUrl(filePath, contentType = 'image/png') {
  const base64 = fs.readFileSync(filePath).toString('base64');
  return `data:${contentType};base64,${base64}`;
}

function sourceDataUrl(payload) {
  const shot = payload.source?.screenshot;
  if (!shot?.base64) return '';
  return `data:${shot.contentType || 'image/png'};base64,${shot.base64}`;
}

function outputPath(preview, suffix) {
  const dir = preview?.pngPath ? path.dirname(preview.pngPath) : process.cwd();
  return path.join(dir, suffix);
}

export async function compareSourceAndClonePreview(payload, preview) {
  const sourceUrl = sourceDataUrl(payload);
  if (!sourceUrl || !preview?.pngPath || !fs.existsSync(preview.pngPath)) {
    return { available: false, reason: 'source or clone preview screenshot missing' };
  }

  const cloneUrl = fileToDataUrl(preview.pngPath, 'image/png');
  const overlayPath = outputPath(preview, 'translateit-visual-diff-latest.png');
  const overlayHtmlPath = outputPath(preview, 'translateit-visual-diff-latest.html');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 1 });
  try {
    const result = await page.evaluate(async ({ sourceUrl, cloneUrl }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image load failed'));
          img.src = src;
        });
      }
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function round(v) { return Number(v.toFixed(3)); }
      function score(v) { return Math.round(clamp(v, 0, 100)); }
      function samplePair(source, clone, sampleW, sampleH, sourceY0, sourceY1, cloneY0, cloneY1) {
        const canvas = document.createElement('canvas');
        canvas.width = sampleW * 2;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, sourceY0, source.width, Math.max(1, sourceY1 - sourceY0), 0, 0, sampleW, sampleH);
        ctx.drawImage(clone, 0, cloneY0, clone.width, Math.max(1, cloneY1 - cloneY0), sampleW, 0, sampleW, sampleH);
        const a = ctx.getImageData(0, 0, sampleW, sampleH).data;
        const b = ctx.getImageData(sampleW, 0, sampleW, sampleH).data;
        let diff = 0, strong = 0, count = 0, sourceInk = 0, cloneInk = 0;
        const sourceHist = new Array(8).fill(0);
        const cloneHist = new Array(8).fill(0);
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
          sourceHist[Math.min(7, Math.floor(sa / 32))] += 1;
          cloneHist[Math.min(7, Math.floor(ca / 32))] += 1;
          count += 1;
        }
        const avgDiff = count ? diff / count : 255;
        const strongDiffRatio = count ? strong / count : 1;
        const inkDelta = Math.abs(sourceInk - cloneInk) / Math.max(1, sourceInk);
        let histDelta = 0;
        for (let h = 0; h < sourceHist.length; h += 1) histDelta += Math.abs(sourceHist[h] - cloneHist[h]);
        histDelta = count ? histDelta / count : 1;
        const pixelSimilarityScore = score(100 - avgDiff * 0.55 - strongDiffRatio * 38 - inkDelta * 20);
        const blockSimilarityScore = score(100 - strongDiffRatio * 100);
        const inkCoverageScore = score(100 - inkDelta * 100);
        const colorSimilarityScore = score(100 - histDelta * 42);
        const visualSimilarityScore = score(pixelSimilarityScore * 0.45 + blockSimilarityScore * 0.24 + inkCoverageScore * 0.16 + colorSimilarityScore * 0.15);
        return { averagePixelDifference: Number(avgDiff.toFixed(2)), strongDiffRatio: round(strongDiffRatio), inkCoverageDelta: round(inkDelta), colorHistogramDelta: round(histDelta), pixelSimilarityScore, blockSimilarityScore, inkCoverageScore, colorSimilarityScore, visualSimilarityScore };
      }
      const source = await loadImage(sourceUrl);
      const clone = await loadImage(cloneUrl);
      const sampleW = 240;
      const fullH = Math.max(160, Math.min(620, Math.round(sampleW * Math.min(source.height / source.width, clone.height / clone.width))));
      const topH = Math.min(fullH, 260);
      const full = samplePair(source, clone, sampleW, fullH, 0, source.height, 0, clone.height);
      const top = samplePair(source, clone, sampleW, topH, 0, Math.min(source.height, source.width * 0.95), 0, Math.min(clone.height, clone.width * 0.95));
      const bands = [];
      const bandCount = 4;
      for (let i = 0; i < bandCount; i += 1) {
        const sy0 = Math.round(source.height * i / bandCount);
        const sy1 = Math.round(source.height * (i + 1) / bandCount);
        const cy0 = Math.round(clone.height * i / bandCount);
        const cy1 = Math.round(clone.height * (i + 1) / bandCount);
        bands.push(samplePair(source, clone, sampleW, 120, sy0, sy1, cy0, cy1));
      }
      const sectionBandSimilarityScore = score(bands.reduce((sum, band) => sum + band.visualSimilarityScore, 0) / Math.max(1, bands.length));
      const worstBandScore = score(Math.min(...bands.map((band) => band.visualSimilarityScore)));
      const imageRegionSimilarityScore = score((top.visualSimilarityScore + full.blockSimilarityScore + sectionBandSimilarityScore) / 3);
      const layoutShiftRiskScore = score(100 - Math.max(0, 70 - worstBandScore) * 1.1 - Math.max(0, 70 - top.blockSimilarityScore) * 0.8);
      const visualSimilarityScore = score(full.visualSimilarityScore * 0.34 + top.visualSimilarityScore * 0.24 + sectionBandSimilarityScore * 0.22 + full.colorSimilarityScore * 0.1 + layoutShiftRiskScore * 0.1);
      const fabricatedLayoutRisk = visualSimilarityScore < 55 || worstBandScore < 46 || top.visualSimilarityScore < 52 ? 'high' : visualSimilarityScore < 74 || worstBandScore < 62 ? 'medium' : 'low';
      const risk = fabricatedLayoutRisk;
      const overlay = document.createElement('canvas');
      const overlayW = 720;
      const overlayH = Math.max(360, Math.min(1100, Math.round(overlayW * Math.min(source.height / source.width, clone.height / clone.width) / 2)));
      overlay.width = overlayW;
      overlay.height = overlayH;
      const octx = overlay.getContext('2d', { willReadFrequently: true });
      octx.fillStyle = '#111827';
      octx.fillRect(0, 0, overlayW, overlayH);
      octx.drawImage(source, 0, 0, source.width, source.height, 0, 0, overlayW / 2, overlayH);
      octx.drawImage(clone, 0, 0, clone.width, clone.height, overlayW / 2, 0, overlayW / 2, overlayH);
      const left = octx.getImageData(0, 0, overlayW / 2, overlayH);
      const right = octx.getImageData(overlayW / 2, 0, overlayW / 2, overlayH);
      const out = octx.createImageData(overlayW / 2, overlayH);
      for (let i = 0; i < left.data.length; i += 4) {
        const d = (Math.abs(left.data[i] - right.data[i]) + Math.abs(left.data[i + 1] - right.data[i + 1]) + Math.abs(left.data[i + 2] - right.data[i + 2])) / 3;
        out.data[i] = 255;
        out.data[i + 1] = d > 42 ? 50 : 255;
        out.data[i + 2] = d > 42 ? 50 : 255;
        out.data[i + 3] = d > 42 ? 210 : 0;
      }
      octx.putImageData(out, overlayW / 2, 0);
      octx.fillStyle = 'rgba(17,24,39,.82)';
      octx.fillRect(0, 0, overlayW, 34);
      octx.fillStyle = '#fff';
      octx.font = '14px Arial';
      octx.fillText('SOURCE', 14, 22);
      octx.fillText('CLONE + RED DIFF OVERLAY', overlayW / 2 + 14, 22);
      return { available: true, version: 'visual-comparison-v2', sampleSize: { width: sampleW, height: fullH }, sourceSize: { width: source.width, height: source.height }, cloneSize: { width: clone.width, height: clone.height }, averagePixelDifference: full.averagePixelDifference, strongDiffRatio: full.strongDiffRatio, inkCoverageDelta: full.inkCoverageDelta, pixelSimilarityScore: full.pixelSimilarityScore, blockSimilarityScore: full.blockSimilarityScore, inkCoverageScore: full.inkCoverageScore, topViewportSimilarityScore: top.visualSimilarityScore, fullPageSimilarityScore: full.visualSimilarityScore, sectionBandSimilarityScore, worstBandScore, imageRegionSimilarityScore, colorSimilarityScore: full.colorSimilarityScore, layoutShiftRiskScore, visualSimilarityScore, fabricatedLayoutRisk, risk, bands: bands.map((band, index) => ({ index, score: band.visualSimilarityScore, strongDiffRatio: band.strongDiffRatio, inkCoverageDelta: band.inkCoverageDelta })), overlayDataUrl: overlay.toDataURL('image/png') };
    }, { sourceUrl, cloneUrl });
    if (result.overlayDataUrl) {
      const base64 = result.overlayDataUrl.split(',')[1] || '';
      fs.writeFileSync(overlayPath, Buffer.from(base64, 'base64'));
      fs.writeFileSync(overlayHtmlPath, `<!doctype html><html><head><meta charset="utf-8"><title>TranslateIT Visual Diff</title><style>body{margin:0;background:#0b1020;color:#fff;font-family:Arial,sans-serif;padding:24px}img{max-width:100%;display:block;border:1px solid #334155}pre{white-space:pre-wrap;background:#111827;padding:16px;border-radius:10px}</style></head><body><h1>TranslateIT Visual Diff</h1><img src="${path.basename(overlayPath)}"><pre>${JSON.stringify({ visualSimilarityScore: result.visualSimilarityScore, risk: result.risk, topViewportSimilarityScore: result.topViewportSimilarityScore, sectionBandSimilarityScore: result.sectionBandSimilarityScore, worstBandScore: result.worstBandScore, layoutShiftRiskScore: result.layoutShiftRiskScore }, null, 2)}</pre></body></html>`, 'utf8');
      delete result.overlayDataUrl;
    }
    return { ...result, overlayPath, overlayHtmlPath };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
