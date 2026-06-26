import { buildActiveCleanRoutePayload } from './designit-pipeline/active-clean-route.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { buildFinalPayload } from './build-final-payload.mjs';
import { checkExternalVisualEngine, externalVisualEngineRequiredError } from './external-visual-engine-gate.mjs';
import { runCloneAudit } from './run-clone-audit.mjs';
import { PUBLIC_VERSION, ENGINE, ENGINE_BUILD, error, normalizeUrl } from './shared-contract.mjs';



/* DESIGNIT_ROUTE_FINAL_RESPONSE_SANITIZER_16D_W */
function d16wText(node) {
  if (!node || typeof node !== "object") return "";

  return [
    node.type,
    node.kind,
    node.name,
    node.role,
    node.assetKind,
    node.assetId,
    node.id,
    node.sourceReason,
    node.renderMode,
    node.mode,
    node.contentType
  ].map((value) => String(value || "").toLowerCase()).join(" ");
}

function d16wIsInternalReference(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16wText(node);

  if (/internal screenshot reference hidden/.test(text)) return true;
  if (/raw website screenshot/.test(text)) return true;
  if (/raw screenshot\s*\/\s*website/.test(text)) return true;
  if (/raw-reference-screenshot/.test(text)) return true;
  if (/raw-reference-comparison-frame/.test(text)) return true;
  if (/comparison-only/.test(text) && /screenshot|reference/.test(text)) return true;
  if (/internal-reference-hidden/.test(text)) return true;
  if (/visualbackplate|visual-backplate|page-screenshot/.test(text)) return true;

  return false;
}

function d16wRect(node) {
  if (!node || typeof node !== "object") return null;

  const raw = node.rect || node.bounds || node.box || node.frame || node;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? node.width ?? 0);
  const height = Number(raw.height ?? raw.h ?? node.height ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(","),
    area: width * height
  };
}

function d16wIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16wText(node);

  return /image|media|photo|picture|bitmap|visual|background/.test(text) ||
    /\.(webp|png|jpg|jpeg|gif|svg)/.test(text) ||
    node.imageIndex !== undefined ||
    !!node.imageMeta ||
    !!node.rawMediaRect;
}

function d16wIsMapped(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16wText(node);

  return node.designitRawMediaMapped16DG === true ||
    node.designitFinalRenderPlanSync16DL === true ||
    /https?:\/\/[^\s"'<>]+\.(webp|png|jpg|jpeg|gif|svg)/i.test(text);
}

function d16wIsBaked(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16wText(node);

  if (/https?:\/\/[^\s"'<>]+\.(webp|png|jpg|jpeg|gif|svg)/i.test(text)) return false;

  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(text);
}

function d16wCleanArray(arr, stats, path) {
  if (!Array.isArray(arr)) return arr;

  const kept = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (d16wIsInternalReference(item)) {
      stats.removedInternalReferences++;
      stats.samples.push({
        reason: "route-final-array-remove-internal-reference",
        path: path + "[" + i + "]",
        name: String(item && item.name || ""),
        kind: String(item && item.kind || ""),
        assetKind: String(item && item.assetKind || ""),
        sourceReason: String(item && item.sourceReason || "")
      });
      continue;
    }

    kept.push(d16wCleanObject(item, stats, path + "[" + i + "]"));
  }

  return kept;
}

function d16wCleanObject(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return d16wCleanArray(node, stats, path);
  }

  for (const key of Object.keys(node)) {
    if (
      key === "source" ||
      key === "sourceTruth" ||
      key === "rawMediaSourceTruth" ||
      key === "backgroundMediaSourceTruth" ||
      key === "textSourceTruth" ||
      key === "controlSourceTruth" ||
      key === "screenshot" ||
      key === "base64"
    ) {
      continue;
    }

    if (key === "diagnostics") {
      delete node[key];
      stats.removedDiagnostics++;
      stats.samples.push({
        reason: "route-final-delete-render-model-diagnostics",
        path: path + "." + key
      });
      continue;
    }

    if (/visualbackplate/i.test(key)) {
      delete node[key];
      stats.removedVisualBackplates++;
      stats.samples.push({
        reason: "route-final-delete-visualBackplate",
        path: path + "." + key
      });
      continue;
    }

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (d16wIsInternalReference(value)) {
      delete node[key];
      stats.removedInternalReferences++;
      stats.samples.push({
        reason: "route-final-delete-internal-reference-property",
        path: path + "." + key,
        name: String(value && value.name || ""),
        kind: String(value && value.kind || ""),
        assetKind: String(value && value.assetKind || ""),
        sourceReason: String(value && value.sourceReason || "")
      });
      continue;
    }

    node[key] = d16wCleanObject(value, stats, path + "." + key);
  }

  return node;
}

function d16wWalk(node, path, parent, key, records) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      d16wWalk(node[i], path + "[" + i + "]", node, i, records);
    }
    return;
  }

  if (typeof node !== "object") return;

  records.push({ node, path, parent, key });

  for (const prop of Object.keys(node)) {
    if (
      prop === "source" ||
      prop === "sourceTruth" ||
      prop === "rawMediaSourceTruth" ||
      prop === "backgroundMediaSourceTruth" ||
      prop === "textSourceTruth" ||
      prop === "controlSourceTruth" ||
      prop === "screenshot" ||
      prop === "base64"
    ) {
      continue;
    }

    const value = node[prop];

    if (value && typeof value === "object") {
      d16wWalk(value, path + "." + prop, node, prop, records);
    }
  }
}

function d16wScore(record) {
  const node = record.node;

  let score = 0;

  if (d16wIsMapped(node)) score += 100000;
  if (!d16wIsBaked(node)) score += 10000;
  if (d16wIsInternalReference(node)) score -= 100000;

  const rect = d16wRect(node);
  if (rect) score += Math.min(1000, Math.sqrt(rect.area));

  return score;
}

function d16wDedupeLargeRects(root, modelName, stats) {
  if (!root || typeof root !== "object") return root;

  const records = [];
  d16wWalk(root, "$." + modelName, null, null, records);

  const groups = new Map();

  for (const record of records) {
    const rect = d16wRect(record.node);

    if (!rect || rect.area < 80000) continue;
    if (!d16wIsImageLike(record.node)) continue;

    if (!groups.has(rect.key)) groups.set(rect.key, []);
    groups.get(rect.key).push(record);
  }

  const removals = new Map();

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => d16wScore(b) - d16wScore(a));

    for (let i = 1; i < group.length; i++) {
      const record = group[i];

      if (Array.isArray(record.parent)) {
        if (!removals.has(record.parent)) removals.set(record.parent, new Set());
        removals.get(record.parent).add(record.key);
        stats.removedDuplicates++;
      } else if (record.parent && typeof record.parent === "object" && typeof record.key === "string") {
        delete record.parent[record.key];
        stats.removedDuplicates++;
      }

      stats.samples.push({
        reason: "route-final-dedupe-large-same-rect",
        rect: rectKey,
        path: record.path,
        name: String(record.node && record.node.name || ""),
        kind: String(record.node && record.node.kind || ""),
        assetKind: String(record.node && record.node.assetKind || "")
      });
    }
  }

  for (const [arr, indexes] of removals.entries()) {
    const sorted = Array.from(indexes).sort((a, b) => b - a);
    for (const index of sorted) arr.splice(index, 1);
  }

  return root;
}

function d16wSanitizeRouteFinalPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;

  if (!payload.cloneModel && !payload.figmaRenderPlan) return payload;

  const stats = {
    marker: "DESIGNIT_ROUTE_FINAL_RESPONSE_SANITIZER_16D_W",
    removedInternalReferences: 0,
    removedDiagnostics: 0,
    removedVisualBackplates: 0,
    removedDuplicates: 0,
    samples: []
  };

  if (payload.cloneModel) {
    payload.cloneModel = d16wCleanObject(payload.cloneModel, stats, "$.cloneModel");
    payload.cloneModel = d16wDedupeLargeRects(payload.cloneModel, "cloneModel", stats);
  }

  if (payload.figmaRenderPlan) {
    payload.figmaRenderPlan = d16wCleanObject(payload.figmaRenderPlan, stats, "$.figmaRenderPlan");
    payload.figmaRenderPlan = d16wDedupeLargeRects(payload.figmaRenderPlan, "figmaRenderPlan", stats);
  }

  stats.samples = stats.samples.slice(0, 160);

  payload.designitRouteFinalResponseSanitizer16DW = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.routeFinalResponseSanitizer16DW = stats;

  return payload;
}

function d16wSanitizeSendJsonArguments(args) {
  for (let i = 0; i < args.length; i++) {
    const value = args[i];

    if (
      value &&
      typeof value === "object" &&
      (value.cloneModel || value.figmaRenderPlan || value.designitRawMediaMapping16DG || value.source)
    ) {
      d16wSanitizeRouteFinalPayload(value);
    }
  }
}
/* END DESIGNIT_ROUTE_FINAL_RESPONSE_SANITIZER_16D_W */




/* DESIGNIT_16E_LITE_IMAGE_ASSETS */
function d16eLiteHash(value) {
  let h = 5381;
  const s = String(value || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return "img_" + (h >>> 0).toString(36);
}

function d16eLiteUrl(value) {
  const s = String(value || "").trim();
  if (!/^https?:\/\//i.test(s)) return "";
  if (!/\.(webp|png|jpg|jpeg|gif|svg)(\?|#|$)/i.test(s)) return "";
  return s;
}

function d16eLiteRect(item) {
  if (!item || typeof item !== "object") return null;
  const r = item.rect || item.bounds || item.box || item.frame || item;
  if (!r || typeof r !== "object") return null;

  const x = Number(r.x ?? r.left ?? 0);
  const y = Number(r.y ?? r.top ?? 0);
  const width = Number(r.width ?? r.w ?? item.width ?? 0);
  const height = Number(r.height ?? r.h ?? item.height ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height, area: width * height, key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",") };
}

function d16eLiteRawMedia(payload) {
  const out = [];
  const list = [];

  if (payload && payload.source && Array.isArray(payload.source.rawMediaSourceTruth)) {
    list.push(...payload.source.rawMediaSourceTruth);
  }

  if (payload && payload.source && payload.source.sourceTruth && Array.isArray(payload.source.sourceTruth.rawMedia)) {
    list.push(...payload.source.sourceTruth.rawMedia);
  }

  const seen = new Set();

  for (const item of list) {
    const url = d16eLiteUrl(item.currentSrc) || d16eLiteUrl(item.src) || d16eLiteUrl(item.url) || d16eLiteUrl(item.finalUrl);
    const rect = d16eLiteRect(item);

    if (!url || !rect || rect.area < 2500) continue;

    const key = rect.key + "::" + url;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      url,
      rect,
      name: String(item.alt || item.title || item.name || "Raw Website Image"),
      objectFit: String(item.objectFit || "cover"),
      objectPosition: String(item.objectPosition || "50% 50%")
    });
  }

  return out;
}

function d16eLiteAssetArray(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!Array.isArray(obj.assets)) obj.assets = [];
  return obj.assets;
}

function d16eLitePushAsset(arr, asset) {
  if (!Array.isArray(arr) || !asset) return;
  const exists = arr.some(x => x && (x.id === asset.id || x.assetId === asset.assetId || x.sourceUrl === asset.sourceUrl));
  if (!exists) arr.push(asset);
}

async function d16eLiteFetchImage(url, stats) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "DesignIT" } });
    if (!res.ok) {
      stats.fetchFailed++;
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) {
      stats.fetchFailed++;
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const id = "raw-url-" + d16eLiteHash(url);

    stats.fetchSucceeded++;

    return {
      id,
      assetId: id,
      kind: "raw-dom-image",
      assetKind: "raw-dom-image",
      contentType,
      mimeType: contentType,
      base64: buf.toString("base64"),
      sourceUrl: url,
      rawSourceUrl: url,
      url
    };
  } catch {
    stats.fetchFailed++;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function d16eLiteInjectFigmaLayers(payload, media, stats) {
  if (!payload || !payload.figmaRenderPlan || !Array.isArray(payload.figmaRenderPlan.frames)) return;

  const frame = payload.figmaRenderPlan.frames[0];
  if (!frame || typeof frame !== "object") return;

  if (!Array.isArray(frame.groups)) frame.groups = [];

  let group = frame.groups.find(g => g && g.name === "00 Raw Website Images");
  if (!group) {
    group = {
      kind: "group",
      type: "group",
      name: "00 Raw Website Images",
      children: [],
      sourceReason: "16e-lite-image-assets"
    };
    frame.groups.unshift(group);
  }

  if (!Array.isArray(group.children)) group.children = [];

  const existing = new Set();

  for (const child of group.children) {
    const r = d16eLiteRect(child);
    const u = d16eLiteUrl(child.sourceUrl) || d16eLiteUrl(child.rawSourceUrl) || d16eLiteUrl(child.src);
    if (r && u) existing.add(r.key + "::" + u);
  }

  for (const item of media) {
    const assetId = "raw-url-" + d16eLiteHash(item.url);
    const key = item.rect.key + "::" + item.url;
    if (existing.has(key)) continue;
    existing.add(key);

    group.children.push({
      kind: "image",
      type: "image",
      role: "image",
      name: item.name,
      rect: { x: item.rect.x, y: item.rect.y, width: item.rect.width, height: item.rect.height },
      assetId,
      assetKind: "raw-dom-image",
      rawSourceUrl: item.url,
      sourceUrl: item.url,
      currentSrc: item.url,
      src: item.url,
      objectFit: item.objectFit,
      objectPosition: item.objectPosition,
      editable: true,
      locked: false,
      designitRawMediaMapped16DG: true,
      designitRouteImageHydration16EA: true,
      sourceReason: "16e-lite-injected-raw-website-image"
    });

    stats.injectedFigmaLayers++;
  }
}

async function d16eLiteHydratePayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (!payload.source || !payload.figmaRenderPlan) return payload;

  const stats = {
    marker: "DESIGNIT_16E_LITE_IMAGE_ASSETS",
    rawMediaCount: 0,
    hydratedAssets: 0,
    injectedFigmaLayers: 0,
    fetchSucceeded: 0,
    fetchFailed: 0
  };

  const media = d16eLiteRawMedia(payload);
  stats.rawMediaCount = media.length;

  d16eLiteInjectFigmaLayers(payload, media, stats);

  const urls = Array.from(new Set(media.map(x => x.url))).slice(0, 80);
  const assets = [];

  for (const url of urls) {
    const asset = await d16eLiteFetchImage(url, stats);
    if (asset) {
      assets.push(asset);
      stats.hydratedAssets++;
    }
  }

  for (const asset of assets) {
    d16eLitePushAsset(d16eLiteAssetArray(payload), asset);
    d16eLitePushAsset(d16eLiteAssetArray(payload.cloneModel), asset);
    d16eLitePushAsset(d16eLiteAssetArray(payload.figmaRenderPlan), asset);
  }

  payload.designit16eLiteImageAssets = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.imageAssets16ELite = stats;

  return payload;
}

async function d16eLiteHydrateArguments(argsLike) {
  for (let i = 0; i < argsLike.length; i++) {
    const value = argsLike[i];
    if (value && typeof value === "object" && (value.source || value.cloneModel || value.figmaRenderPlan)) {
      await d16eLiteHydratePayload(value);
    }
  }
}
/* END DESIGNIT_16E_LITE_IMAGE_ASSETS */


export async function sendJson(res, status, payload) {
  try { await d16eLiteHydrateArguments(arguments); } catch (error) { console.warn('[DesignIT 16E-Lite] image hydration failed:', error && error.message ? error.message : error); }

  try { d16wSanitizeSendJsonArguments(arguments); } catch (error) { console.warn('[DesignIT 16D-W] final response sanitizer failed:', error && error.message ? error.message : error); }

  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' });
  res.end(JSON.stringify(payload, null, 2));
}

function writeLatestReport(reportDir, name, payload) {
  fs.mkdirSync(reportDir, { recursive: true });
  const file = path.join(reportDir, name);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

async function requireExternalVisualEngine(res) {
  const visualEngine = await checkExternalVisualEngine();
  if (!visualEngine.ok) {
    sendJson(res, 503, externalVisualEngineRequiredError(visualEngine));
    return null;
  }
  return visualEngine;
}


export async function handleRender(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  const visualEngine = await requireExternalVisualEngine(res);
  if (!visualEngine) return;
  try {
    const payload = await buildFinalPayload(target);
    payload.externalVisualEngine = visualEngine;
    payload.diagnostics = { ...(payload.diagnostics || {}), externalVisualEngine: visualEngine, internalLayoutFallback: visualEngine.mode === 'internal-fallback-explicitly-enabled' };
    const designitActiveCleanRouteResult = buildActiveCleanRoutePayload(payload);
    return sendJson(res, designitActiveCleanRouteResult.status, designitActiveCleanRouteResult.payload);
  } catch (err) {
    return sendJson(res, 500, error(err?.message || err));
  }
}

export async function handleAudit(req, res, url, reportDir) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  const visualEngine = await requireExternalVisualEngine(res);
  if (!visualEngine) return;
  try {
    const payload = await buildFinalPayload(target);
    payload.externalVisualEngine = visualEngine;
    payload.diagnostics = { ...(payload.diagnostics || {}), externalVisualEngine: visualEngine, internalLayoutFallback: visualEngine.mode === 'internal-fallback-explicitly-enabled' };
    const audited = await runCloneAudit(payload, reportDir);
    const report = {
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      targetUrl: target,
      generatedAt: new Date().toISOString(),
      readyForFigmaTest: audited.audit.visualReadiness === 'pass',
      audit: audited.audit,
      diagnostics: audited.payload.diagnostics
    };
    report.reportPath = writeLatestReport(reportDir, 'translateit-clean-latest.json', report);
    return sendJson(res, 200, report);
  } catch (err) {
    const report = { publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, targetUrl: target, generatedAt: new Date().toISOString(), readyForFigmaTest: false, error: err?.message || String(err) };
    report.reportPath = writeLatestReport(reportDir, 'translateit-clean-latest.json', report);
    return sendJson(res, 500, report);
  }
}
