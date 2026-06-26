import { buildRenderPlanV2 } from "./render-plan-v2/index.mjs";
import { buildPayload as buildPayloadCore } from './build-payload-core-v5.mjs';



/* DESIGNIT_MAP_RAW_MEDIA_TO_LAYERS_16D_G */
function d16gSourceUrl(media) {
  if (!media) return "";
  if (media.currentSrc) return String(media.currentSrc);
  if (media.src) return String(media.src);
  if (media.poster) return String(media.poster);
  if (Array.isArray(media.urls) && media.urls[0]) return String(media.urls[0]);
  return "";
}

function d16gRectOf(node) {
  if (!node || typeof node !== "object") return null;

  const raw = node.rect || node.bounds || node.box || node.frame || node;

  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? 0);
  const height = Number(raw.height ?? raw.h ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height, right: x + width, bottom: y + height, area: width * height };
}

function d16gIoU(a, b) {
  if (!a || !b) return 0;

  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);

  const w = Math.max(0, right - left);
  const h = Math.max(0, bottom - top);
  const intersection = w * h;

  if (intersection <= 0) return 0;

  const union = a.area + b.area - intersection;
  if (union <= 0) return 0;

  return intersection / union;
}

function d16gCenterDistanceRatio(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;

  const dx = ax - bx;
  const dy = ay - by;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const scale = Math.max(1, Math.sqrt(Math.max(a.area, b.area)));

  return dist / scale;
}

function d16gIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = [
    node.type,
    node.kind,
    node.name,
    node.assetKind,
    node.assetId,
    node.role
  ].map((value) => String(value || "").toLowerCase()).join(" ");

  if (/image|media|photo|picture|bitmap|visual/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;

  return false;
}

function d16gWalk(node, visit, path = "$") {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      d16gWalk(node[i], visit, path + "[" + i + "]");
    }
    return;
  }

  if (typeof node !== "object") return;

  visit(node, path);

  /* DESIGNIT_WALK_ALL_PAYLOAD_KEYS_16D_G2 */
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

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    d16gWalk(value, visit, path + "." + key);
  }
}

function d16gBestMediaForRect(rect, mediaList) {
  if (!rect || !Array.isArray(mediaList) || !mediaList.length) return null;

  let best = null;
  let bestScore = -1;

  for (const media of mediaList) {
    const url = d16gSourceUrl(media);
    if (!url) continue;

    const mediaRect = d16gRectOf(media);
    if (!mediaRect) continue;

    const iou = d16gIoU(rect, mediaRect);
    const distanceRatio = d16gCenterDistanceRatio(rect, mediaRect);
    const areaRatio = Math.min(rect.area, mediaRect.area) / Math.max(rect.area, mediaRect.area);
    const score = iou * 4 + areaRatio * 1.4 - Math.min(distanceRatio, 4) * 0.35;

    if (score > bestScore) {
      bestScore = score;
      best = { media, score, iou, areaRatio, distanceRatio };
    }
  }

  if (!best) return null;
  if (best.iou < 0.08 && best.areaRatio < 0.2 && best.distanceRatio > 0.75) return null;

  return best;
}

function d16gApplyRawMediaMapping(node, match, path) {
  const media = match.media;
  const url = d16gSourceUrl(media);

  node.designitRawMediaMapped16DG = true;
  node.designitRawMediaMatch = {
    marker: "DESIGNIT_MAP_RAW_MEDIA_TO_LAYERS_16D_G",
    path,
    score: Number(match.score.toFixed(4)),
    iou: Number(match.iou.toFixed(4)),
    areaRatio: Number(match.areaRatio.toFixed(4)),
    distanceRatio: Number(match.distanceRatio.toFixed(4))
  };

  node.rawSourceUrl = url;
  node.sourceUrl = url;
  node.currentSrc = media.currentSrc || "";
  node.src = media.src || "";
  node.srcset = media.srcset || "";
  node.rawSrc = media.rawSrc || "";
  node.rawMediaKind = media.kind || "";
  node.rawMediaSelector = media.selector || "";
  node.rawMediaRect = media.rect || null;
  node.rawMediaNaturalWidth = media.naturalWidth || 0;
  node.rawMediaNaturalHeight = media.naturalHeight || 0;
  node.rawMediaObjectFit = media.objectFit || "";
  node.rawMediaObjectPosition = media.objectPosition || "";

  if (!node.name && media.alt) node.name = "Image / " + media.alt;
  if (node.assetKind && /screenshot|slice|crop|backplate/i.test(String(node.assetKind))) {
    node.assetKind = "raw-dom-image";
  }

  return node;
}

function d16gMapRawMediaToImageLayers(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const source = payload.source || {};
  const rawA = Array.isArray(source.rawMediaSourceTruth) ? source.rawMediaSourceTruth : [];
  const rawB = source.sourceTruth && Array.isArray(source.sourceTruth.rawMedia) ? source.sourceTruth.rawMedia : [];
  const bg = Array.isArray(source.backgroundMediaSourceTruth) ? source.backgroundMediaSourceTruth : [];

  const rawMedia = rawA.concat(rawB).concat(bg)
    .filter((media) => media && d16gSourceUrl(media))
    .filter((media, index, arr) => {
      const url = d16gSourceUrl(media);
      const r = d16gRectOf(media);
      const key = url + "|" + (r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(",") : "");
      return arr.findIndex((item) => {
        const u2 = d16gSourceUrl(item);
        const r2 = d16gRectOf(item);
        const key2 = u2 + "|" + (r2 ? [Math.round(r2.x), Math.round(r2.y), Math.round(r2.width), Math.round(r2.height)].join(",") : "");
        return key2 === key;
      }) === index;
    });

  let imageLikeCount = 0;
  let mappedCount = 0;
  let mappedAssets = 0;
  let mappedLayers = 0;
  const mappedSamples = [];

  d16gWalk(payload, (node, path) => {
    if (!d16gIsImageLike(node)) return;

    imageLikeCount++;

    const rect = d16gRectOf(node);
    const match = d16gBestMediaForRect(rect, rawMedia);

    if (!match) return;

    d16gApplyRawMediaMapping(node, match, path);
    mappedCount++;

    if (/\.assets\[|asset/i.test(path)) mappedAssets++;
    else mappedLayers++;

    if (mappedSamples.length < 12) {
      mappedSamples.push({
        path,
        name: node.name || "",
        type: node.type || "",
        kind: node.kind || "",
        url: node.rawSourceUrl || "",
        score: node.designitRawMediaMatch.score,
        iou: node.designitRawMediaMatch.iou
      });
    }
  });

  payload.designitRawMediaMapping16DG = {
    marker: "DESIGNIT_MAP_RAW_MEDIA_TO_LAYERS_16D_G",
    rawMediaCount: rawMedia.length,
    imageLikeCount,
    mappedCount,
    mappedLayers,
    mappedAssets,
    mappedSamples
  };

  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.rawMediaMapping16DG = payload.designitRawMediaMapping16DG;

  if (payload.source) {
    payload.source.rawMediaMapping16DG = payload.designitRawMediaMapping16DG;
  }

  return payload;
}
/* END DESIGNIT_MAP_RAW_MEDIA_TO_LAYERS_16D_G */




/* DESIGNIT_RENDERABLE_MEDIA_CLEANUP_16D_I */
function d16iNodeText(node) {
  if (!node || typeof node !== "object") return "";
  return [
    node.type,
    node.kind,
    node.name,
    node.role,
    node.assetKind,
    node.assetId,
    node.id,
    node.rawSourceUrl,
    node.sourceUrl,
    node.currentSrc,
    node.src
  ].map((value) => String(value || "").toLowerCase()).join(" ");
}

function d16iRectOf(node) {
  if (!node || typeof node !== "object") return null;
  const raw = node.rect || node.bounds || node.box || node.frame || node;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? 0);
  const height = Number(raw.height ?? raw.h ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    x,
    y,
    width,
    height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16iIsImageLike(node) {
  if (!node || typeof node !== "object") return false;
  const text = d16iNodeText(node);
  if (/image|media|photo|picture|bitmap|visual/.test(text)) return true;
  if (/\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;
  if (node.rawMediaRect) return true;
  return false;
}

function d16iIsMapped(node) {
  if (!node || typeof node !== "object") return false;
  if (node.designitRawMediaMapped16DG === true) return true;
  const text = d16iNodeText(node);
  return /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text);
}

function d16iIsBakedSuspect(node) {
  if (!node || typeof node !== "object") return false;
  const text = d16iNodeText(node);
  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(text);
}

function d16iKeepScore(node) {
  let score = 0;
  if (d16iIsMapped(node)) score += 1000;
  if (!d16iIsBakedSuspect(node)) score += 200;
  const text = d16iNodeText(node);
  if (/raw-dom-image|rawsourceurl|sourceurl|currentSrc/i.test(text)) score += 80;
  if (/component-slice|screenshot|backplate|crop|\bslice\b/.test(text)) score -= 500;
  const rect = d16iRectOf(node);
  if (rect) score += Math.min(50, Math.sqrt(rect.area) / 20);
  return score;
}

function d16iCleanArray(arr, stats, path) {
  if (!Array.isArray(arr)) return arr;

  const cleaned = [];

  for (let i = 0; i < arr.length; i++) {
    const item = d16iCleanNode(arr[i], stats, path + "[" + i + "]");

    if (!item || typeof item !== "object") {
      cleaned.push(item);
      continue;
    }

    const rect = d16iRectOf(item);
    const imageLike = d16iIsImageLike(item);
    const mapped = d16iIsMapped(item);
    const baked = d16iIsBakedSuspect(item);

    if (imageLike && baked && !mapped) {
      stats.removedBakedUnmapped++;
      stats.removedSamples.push({ reason: "baked-unmapped", path: path + "[" + i + "]", name: item.name || "", type: item.type || "", kind: item.kind || "", assetKind: item.assetKind || "" });
      continue;
    }

    cleaned.push(item);
  }

  const groups = new Map();

  for (let i = 0; i < cleaned.length; i++) {
    const item = cleaned[i];
    if (!item || typeof item !== "object") continue;

    const rect = d16iRectOf(item);
    if (!rect || rect.area < 80000) continue;
    if (!d16iIsImageLike(item)) continue;

    const key = rect.key;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ item, index: i, score: d16iKeepScore(item) });
  }

  const removeIndexes = new Set();

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => b.score - a.score);
    const keep = group[0];

    for (let i = 1; i < group.length; i++) {
      removeIndexes.add(group[i].index);
      stats.removedDuplicateSameRect++;
      stats.removedSamples.push({
        reason: "duplicate-large-same-rect",
        rect: key,
        keptName: keep.item.name || "",
        removedName: group[i].item.name || "",
        removedType: group[i].item.type || "",
        removedKind: group[i].item.kind || "",
        removedAssetKind: group[i].item.assetKind || ""
      });
    }
  }

  if (removeIndexes.size > 0) {
    return cleaned.filter((_, index) => !removeIndexes.has(index));
  }

  return cleaned;
}

function d16iCleanNode(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return d16iCleanArray(node, stats, path);
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

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (Array.isArray(value)) {
      node[key] = d16iCleanArray(value, stats, path + "." + key);
    } else {
      node[key] = d16iCleanNode(value, stats, path + "." + key);
    }
  }

  return node;
}

function d16iCleanRenderableMedia(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_RENDERABLE_MEDIA_CLEANUP_16D_I",
    removedBakedUnmapped: 0,
    removedDuplicateSameRect: 0,
    removedSamples: []
  };

  for (const key of ["cloneModel", "figmaRenderPlan"]) {
    if (payload[key]) {
      payload[key] = d16iCleanNode(payload[key], stats, "$." + key);
    }
  }

  stats.removedSamples = stats.removedSamples.slice(0, 40);

  payload.designitRenderableMediaCleanup16DI = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.renderableMediaCleanup16DI = stats;

  return payload;
}
/* END DESIGNIT_RENDERABLE_MEDIA_CLEANUP_16D_I */




/* DESIGNIT_GLOBAL_RENDERABLE_CLEANUP_16D_J */
function d16jText(node) {
  if (!node || typeof node !== "object") return "";
  return [
    node.type,
    node.kind,
    node.name,
    node.role,
    node.assetKind,
    node.assetId,
    node.id,
    node.rawSourceUrl,
    node.sourceUrl,
    node.currentSrc,
    node.src,
    node.rawSrc
  ].map((value) => String(value || "").toLowerCase()).join(" ");
}

function d16jRect(node) {
  if (!node || typeof node !== "object") return null;
  const raw = node.rect || node.bounds || node.box || node.frame || node;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? 0);
  const height = Number(raw.height ?? raw.h ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    x,
    y,
    width,
    height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16jIsImageLike(node) {
  if (!node || typeof node !== "object") return false;
  const text = d16jText(node);
  if (/image|media|photo|picture|bitmap|visual/.test(text)) return true;
  if (/\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;
  if (node.rawMediaRect) return true;
  return false;
}

function d16jIsMapped(node) {
  if (!node || typeof node !== "object") return false;
  if (node.designitRawMediaMapped16DG === true) return true;
  return /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(d16jText(node));
}

function d16jIsBaked(node) {
  if (!node || typeof node !== "object") return false;
  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(d16jText(node));
}

function d16jKeepScore(node) {
  let score = 0;
  if (d16jIsMapped(node)) score += 10000;
  if (!d16jIsBaked(node)) score += 1000;
  if (node.designitRawMediaMapped16DG === true) score += 500;
  if (node.rawSourceUrl || node.sourceUrl || node.currentSrc || node.src) score += 300;
  if (/component-slice|screenshot|backplate|crop|\bslice\b/.test(d16jText(node))) score -= 5000;
  const rect = d16jRect(node);
  if (rect) score += Math.min(200, Math.sqrt(rect.area));
  return score;
}

function d16jDemoteNode(node, reason) {
  if (!node || typeof node !== "object") return;

  node.designitGlobalRenderableCleanup16DJ = true;
  node.designitCleanupReason16DJ = reason;
  node.type = "shape";
  node.kind = "decorative";
  node.role = "decorative";
  node.name = "Decorative Surface";

  delete node.assetKind;
  delete node.assetId;
  delete node.imageIndex;
  delete node.imageMeta;
  delete node.rawMediaRect;
  delete node.rawMediaKind;
  delete node.rawMediaSelector;
  delete node.rawMediaNaturalWidth;
  delete node.rawMediaNaturalHeight;
  delete node.rawMediaObjectFit;
  delete node.rawMediaObjectPosition;
  delete node.rawSourceUrl;
  delete node.sourceUrl;
  delete node.currentSrc;
  delete node.src;
  delete node.rawSrc;
  delete node.srcset;
}

function d16jWalk(node, path, parent, key, records) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      d16jWalk(node[i], path + "[" + i + "]", node, i, records);
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

    if (!value || typeof value !== "object") continue;

    d16jWalk(value, path + "." + prop, node, prop, records);
  }
}

function d16jCleanModel(root, modelName, stats) {
  if (!root || typeof root !== "object") return root;

  const records = [];
  d16jWalk(root, "$." + modelName, null, null, records);

  const removeByParent = new Map();

  function markRemove(record, reason) {
    if (Array.isArray(record.parent)) {
      if (!removeByParent.has(record.parent)) removeByParent.set(record.parent, new Set());
      removeByParent.get(record.parent).add(record.key);
      stats.removed++;
      stats.samples.push({ model: modelName, reason, path: record.path, name: record.node.name || "", type: record.node.type || "", kind: record.node.kind || "", assetKind: record.node.assetKind || "" });
    } else {
      d16jDemoteNode(record.node, reason);
      stats.demoted++;
      stats.samples.push({ model: modelName, reason: reason + "-demoted", path: record.path, name: record.node.name || "", type: record.node.type || "", kind: record.node.kind || "", assetKind: record.node.assetKind || "" });
    }
  }

  for (const record of records) {
    const node = record.node;
    if (d16jIsImageLike(node) && d16jIsBaked(node) && !d16jIsMapped(node)) {
      markRemove(record, "baked-unmapped-global");
    }
  }

  const groups = new Map();

  for (const record of records) {
    const node = record.node;
    const rect = d16jRect(node);

    if (!rect || rect.area < 80000) continue;
    if (!d16jIsImageLike(node)) continue;

    const key = rect.key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ record, score: d16jKeepScore(node) });
  }

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => b.score - a.score);
    const keep = group[0];

    for (let i = 1; i < group.length; i++) {
      markRemove(group[i].record, "duplicate-large-rect-global:" + rectKey);
      stats.removedDuplicateLargeRects++;
    }

    stats.keptDuplicateSamples.push({
      model: modelName,
      rect: rectKey,
      keptPath: keep.record.path,
      keptName: keep.record.node.name || "",
      keptMapped: d16jIsMapped(keep.record.node),
      duplicateCount: group.length
    });
  }

  for (const [parent, indexes] of removeByParent.entries()) {
    const sorted = Array.from(indexes).sort((a, b) => b - a);
    for (const index of sorted) {
      parent.splice(index, 1);
    }
  }

  return root;
}

function d16jGlobalRenderableCleanup(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_GLOBAL_RENDERABLE_CLEANUP_16D_J",
    removed: 0,
    demoted: 0,
    removedDuplicateLargeRects: 0,
    samples: [],
    keptDuplicateSamples: []
  };

  if (payload.cloneModel) payload.cloneModel = d16jCleanModel(payload.cloneModel, "cloneModel", stats);
  if (payload.figmaRenderPlan) payload.figmaRenderPlan = d16jCleanModel(payload.figmaRenderPlan, "figmaRenderPlan", stats);

  stats.samples = stats.samples.slice(0, 60);
  stats.keptDuplicateSamples = stats.keptDuplicateSamples.slice(0, 30);

  payload.designitGlobalRenderableCleanup16DJ = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.globalRenderableCleanup16DJ = stats;

  return payload;
}
/* END DESIGNIT_GLOBAL_RENDERABLE_CLEANUP_16D_J */




/* DESIGNIT_FINAL_RENDERPLAN_MEDIA_SYNC_16D_L */
function d16lText(node) {
  if (!node || typeof node !== "object") return "";
  return [
    node.type,
    node.kind,
    node.name,
    node.role,
    node.assetKind,
    node.assetId,
    node.id,
    node.rawSourceUrl,
    node.sourceUrl,
    node.currentSrc,
    node.src,
    node.rawSrc
  ].map((value) => String(value || "").toLowerCase()).join(" ");
}

function d16lRect(node) {
  if (!node || typeof node !== "object") return null;

  const raw = node.rect || node.bounds || node.box || node.frame || node;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? 0);
  const height = Number(raw.height ?? raw.h ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16lIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16lText(node);

  if (/image|media|photo|picture|bitmap|visual/.test(text)) return true;
  if (/\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;
  if (node.rawMediaRect) return true;

  return false;
}

function d16lIsMapped(node) {
  if (!node || typeof node !== "object") return false;
  if (node.designitRawMediaMapped16DG === true) return true;
  return /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(d16lText(node));
}

function d16lIsBaked(node) {
  if (!node || typeof node !== "object") return false;
  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(d16lText(node));
}

function d16lIoU(a, b) {
  if (!a || !b) return 0;

  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);

  const w = Math.max(0, right - left);
  const h = Math.max(0, bottom - top);
  const intersection = w * h;

  if (intersection <= 0) return 0;

  const union = a.area + b.area - intersection;
  return union > 0 ? intersection / union : 0;
}

function d16lDistanceRatio(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;

  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;

  const dx = ax - bx;
  const dy = ay - by;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const scale = Math.max(1, Math.sqrt(Math.max(a.area, b.area)));

  return distance / scale;
}

function d16lUrlOf(node) {
  if (!node || typeof node !== "object") return "";
  return String(node.rawSourceUrl || node.sourceUrl || node.currentSrc || node.src || "");
}

function d16lWalk(node, path, parent, key, records) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      d16lWalk(node[i], path + "[" + i + "]", node, i, records);
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

    if (!value || typeof value !== "object") continue;

    d16lWalk(value, path + "." + prop, node, prop, records);
  }
}

function d16lApplyMapping(target, source, stats, reason) {
  const url = d16lUrlOf(source);
  if (!url) return false;

  target.designitRawMediaMapped16DG = true;
  target.designitFinalRenderPlanSync16DL = true;
  target.rawSourceUrl = url;
  target.sourceUrl = url;
  target.currentSrc = source.currentSrc || source.rawSourceUrl || source.sourceUrl || source.src || url;
  target.src = source.src || source.rawSourceUrl || source.sourceUrl || url;
  target.srcset = source.srcset || "";
  target.rawSrc = source.rawSrc || "";
  target.rawMediaRect = source.rawMediaRect || source.rect || source.bounds || source.frame || null;
  target.rawMediaKind = source.rawMediaKind || "synced-raw-dom-image";
  target.rawMediaNaturalWidth = source.rawMediaNaturalWidth || source.naturalWidth || 0;
  target.rawMediaNaturalHeight = source.rawMediaNaturalHeight || source.naturalHeight || 0;
  target.rawMediaObjectFit = source.rawMediaObjectFit || source.objectFit || "cover";
  target.rawMediaObjectPosition = source.rawMediaObjectPosition || source.objectPosition || "50% 50%";

  if (target.assetKind && /screenshot|slice|crop|backplate/i.test(String(target.assetKind))) {
    target.assetKind = "raw-dom-image";
  }

  if (!target.name || /screenshot|slice|crop|backplate/i.test(String(target.name))) {
    target.name = source.name && !/screenshot|slice|crop|backplate/i.test(String(source.name))
      ? source.name
      : "Image / Raw DOM Media";
  }

  stats.syncedMappings++;
  stats.samples.push({
    reason,
    targetName: target.name || "",
    sourceName: source.name || "",
    url
  });

  return true;
}

function d16lDemote(node, reason, stats) {
  if (!node || typeof node !== "object") return;

  stats.demotedBaked++;

  node.designitFinalRenderPlanSync16DL = true;
  node.designitCleanupReason16DL = reason;
  node.type = "shape";
  node.kind = "decorative";
  node.role = "decorative";
  node.name = "Decorative Surface";

  delete node.assetKind;
  delete node.assetId;
  delete node.imageIndex;
  delete node.imageMeta;
  delete node.rawMediaRect;
  delete node.rawMediaKind;
  delete node.rawMediaSelector;
  delete node.rawMediaNaturalWidth;
  delete node.rawMediaNaturalHeight;
  delete node.rawSourceUrl;
  delete node.sourceUrl;
  delete node.currentSrc;
  delete node.src;
  delete node.rawSrc;
  delete node.srcset;
}

function d16lScore(node) {
  let score = 0;
  if (d16lIsMapped(node)) score += 10000;
  if (!d16lIsBaked(node)) score += 1000;
  if (node.designitFinalRenderPlanSync16DL === true) score += 300;
  const rect = d16lRect(node);
  if (rect) score += Math.min(200, Math.sqrt(rect.area));
  if (d16lIsBaked(node)) score -= 5000;
  return score;
}

function d16lRemoveDuplicateLargeRects(root, modelName, stats) {
  const records = [];
  d16lWalk(root, "$." + modelName, null, null, records);

  const groups = new Map();

  for (const record of records) {
    const node = record.node;
    const rect = d16lRect(node);

    if (!rect || rect.area < 80000) continue;
    if (!d16lIsImageLike(node)) continue;

    if (!groups.has(rect.key)) groups.set(rect.key, []);
    groups.get(rect.key).push({ record, score: d16lScore(node) });
  }

  const removeByParent = new Map();

  function markRemove(record) {
    if (Array.isArray(record.parent)) {
      if (!removeByParent.has(record.parent)) removeByParent.set(record.parent, new Set());
      removeByParent.get(record.parent).add(record.key);
      stats.removedDuplicates++;
    } else {
      d16lDemote(record.node, "duplicate-large-rect-demoted", stats);
    }
  }

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => b.score - a.score);

    for (let i = 1; i < group.length; i++) {
      markRemove(group[i].record);
    }

    stats.duplicateSamples.push({
      model: modelName,
      rect: rectKey,
      count: group.length,
      keptName: group[0].record.node.name || "",
      keptMapped: d16lIsMapped(group[0].record.node)
    });
  }

  for (const [parent, indexes] of removeByParent.entries()) {
    const sorted = Array.from(indexes).sort((a, b) => b - a);
    for (const index of sorted) parent.splice(index, 1);
  }
}

function d16lFinalRenderPlanMediaSync(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_FINAL_RENDERPLAN_MEDIA_SYNC_16D_L",
    sourceMappedImages: 0,
    syncedMappings: 0,
    demotedBaked: 0,
    removedDuplicates: 0,
    samples: [],
    duplicateSamples: []
  };

  const mappedSources = [];

  for (const modelName of ["cloneModel", "visualModel", "designModel"]) {
    const model = payload[modelName];
    if (!model) continue;

    const records = [];
    d16lWalk(model, "$." + modelName, null, null, records);

    for (const record of records) {
      const node = record.node;
      const rect = d16lRect(node);
      const url = d16lUrlOf(node);

      if (!rect || !url) continue;
      if (!d16lIsImageLike(node)) continue;
      if (!d16lIsMapped(node)) continue;

      mappedSources.push({ node, rect, url, path: record.path });
    }
  }

  stats.sourceMappedImages = mappedSources.length;

  const targets = [];
  for (const modelName of ["figmaRenderPlan", "cloneModel"]) {
    const model = payload[modelName];
    if (!model) continue;

    const records = [];
    d16lWalk(model, "$." + modelName, null, null, records);

    for (const record of records) {
      if (!d16lIsImageLike(record.node)) continue;
      targets.push({ ...record, modelName, rect: d16lRect(record.node) });
    }
  }

  for (const target of targets) {
    if (d16lIsMapped(target.node)) continue;
    if (!target.rect) continue;

    let best = null;
    let bestScore = -1;

    for (const source of mappedSources) {
      const iou = d16lIoU(target.rect, source.rect);
      const dist = d16lDistanceRatio(target.rect, source.rect);
      const areaRatio = Math.min(target.rect.area, source.rect.area) / Math.max(target.rect.area, source.rect.area);
      const score = iou * 6 + areaRatio * 2 - Math.min(dist, 4) * 0.5;

      if (score > bestScore) {
        bestScore = score;
        best = { source, iou, dist, areaRatio, score };
      }
    }

    if (best && (best.iou >= 0.08 || best.dist <= 0.7 || best.areaRatio >= 0.35)) {
      d16lApplyMapping(target.node, best.source.node, stats, "rect-sync");
    }
  }

  for (const target of targets) {
    if (d16lIsImageLike(target.node) && d16lIsBaked(target.node) && !d16lIsMapped(target.node)) {
      d16lDemote(target.node, "final-baked-unmapped-demote", stats);
    }
  }

  if (payload.cloneModel) d16lRemoveDuplicateLargeRects(payload.cloneModel, "cloneModel", stats);
  if (payload.figmaRenderPlan) d16lRemoveDuplicateLargeRects(payload.figmaRenderPlan, "figmaRenderPlan", stats);

  stats.samples = stats.samples.slice(0, 60);
  stats.duplicateSamples = stats.duplicateSamples.slice(0, 30);

  payload.designitFinalRenderPlanMediaSync16DL = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.finalRenderPlanMediaSync16DL = stats;

  return payload;
}
/* END DESIGNIT_FINAL_RENDERPLAN_MEDIA_SYNC_16D_L */




/* DESIGNIT_STRIP_INTERNAL_SCREENSHOT_REFS_16D_N */
function d16nText(node) {
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
    node.mode
  ].map((value) => String(value || "").toLowerCase()).join(" ");
}

function d16nRect(node) {
  if (!node || typeof node !== "object") return null;

  const raw = node.rect || node.bounds || node.box || node.frame || node;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? 0);
  const height = Number(raw.height ?? raw.h ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    x,
    y,
    width,
    height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16nIsInternalScreenshotRef(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16nText(node);
  const rect = d16nRect(node);
  const largeFullPageLike = rect && rect.area > 1000000;

  if (/internal screenshot reference hidden/.test(text)) return true;
  if (/raw screenshot\s*\/\s*website/.test(text)) return true;
  if (/raw-reference-screenshot/.test(text)) return true;
  if (/visualbackplate|visual-backplate|backplate|page-screenshot/.test(text) && largeFullPageLike) return true;

  if (
    largeFullPageLike &&
    /screenshot|backplate|visual truth|visualtruth|visual-reference|raw reference/.test(text) &&
    !/https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)
  ) {
    return true;
  }

  return false;
}

function d16nStripArray(arr, stats, path) {
  if (!Array.isArray(arr)) return arr;

  const result = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (d16nIsInternalScreenshotRef(item)) {
      stats.removed++;
      stats.samples.push({
        reason: "array-remove-internal-screenshot-ref",
        path: path + "[" + i + "]",
        name: item && item.name ? String(item.name) : "",
        kind: item && item.kind ? String(item.kind) : "",
        assetKind: item && item.assetKind ? String(item.assetKind) : ""
      });
      continue;
    }

    if (item && typeof item === "object") {
      result.push(d16nStripNode(item, stats, path + "[" + i + "]"));
    } else {
      result.push(item);
    }
  }

  return result;
}

function d16nStripNode(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return d16nStripArray(node, stats, path);
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

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (d16nIsInternalScreenshotRef(value)) {
      delete node[key];
      stats.removed++;
      stats.samples.push({
        reason: "property-delete-internal-screenshot-ref",
        path: path + "." + key,
        name: value && value.name ? String(value.name) : "",
        kind: value && value.kind ? String(value.kind) : "",
        assetKind: value && value.assetKind ? String(value.assetKind) : ""
      });
      continue;
    }

    if (Array.isArray(value)) {
      node[key] = d16nStripArray(value, stats, path + "." + key);
    } else {
      node[key] = d16nStripNode(value, stats, path + "." + key);
    }
  }

  return node;
}

function d16nStripInternalScreenshotRefs(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_STRIP_INTERNAL_SCREENSHOT_REFS_16D_N",
    removed: 0,
    samples: []
  };

  if (payload.cloneModel) {
    payload.cloneModel = d16nStripNode(payload.cloneModel, stats, "$.cloneModel");
  }

  if (payload.figmaRenderPlan) {
    if (payload.figmaRenderPlan.visualBackplate) {
      if (d16nIsInternalScreenshotRef(payload.figmaRenderPlan.visualBackplate)) {
        delete payload.figmaRenderPlan.visualBackplate;
        stats.removed++;
        stats.samples.push({
          reason: "delete-figmaRenderPlan.visualBackplate",
          path: "$.figmaRenderPlan.visualBackplate"
        });
      }
    }

    if (
      payload.figmaRenderPlan.diagnostics &&
      payload.figmaRenderPlan.diagnostics.visualBackplate
    ) {
      delete payload.figmaRenderPlan.diagnostics.visualBackplate;
      stats.removed++;
      stats.samples.push({
        reason: "delete-figmaRenderPlan.diagnostics.visualBackplate",
        path: "$.figmaRenderPlan.diagnostics.visualBackplate"
      });
    }

    payload.figmaRenderPlan = d16nStripNode(payload.figmaRenderPlan, stats, "$.figmaRenderPlan");
  }

  stats.samples = stats.samples.slice(0, 50);

  payload.designitStripInternalScreenshotRefs16DN = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.stripInternalScreenshotRefs16DN = stats;

  return payload;
}
/* END DESIGNIT_STRIP_INTERNAL_SCREENSHOT_REFS_16D_N */




/* DESIGNIT_FINAL_SAME_RECT_DEDUPE_16D_O */
function d16oText(node) {
  if (!node || typeof node !== "object") return "";

  return [
    node.type,
    node.kind,
    node.name,
    node.role,
    node.assetKind,
    node.assetId,
    node.id,
    node.rawSourceUrl,
    node.sourceUrl,
    node.currentSrc,
    node.src,
    node.rawSrc,
    node.sourceReason,
    node.renderMode,
    node.mode
  ].map((value) => String(value || "").toLowerCase()).join(" ");
}

function d16oRect(node) {
  if (!node || typeof node !== "object") return null;

  const raw = node.rect || node.bounds || node.box || node.frame || node;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? raw.w ?? 0);
  const height = Number(raw.height ?? raw.h ?? 0);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return {
    x,
    y,
    width,
    height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16oIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16oText(node);

  if (/image|media|photo|picture|bitmap|visual/.test(text)) return true;
  if (/\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;
  if (node.rawMediaRect) return true;

  return false;
}

function d16oIsMapped(node) {
  if (!node || typeof node !== "object") return false;

  if (node.designitRawMediaMapped16DG === true) return true;

  if (
    node.designitFinalRenderPlanSync16DL === true &&
    /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(d16oText(node))
  ) {
    return true;
  }

  return /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(d16oText(node));
}

function d16oIsBaked(node) {
  if (!node || typeof node !== "object") return false;

  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(d16oText(node));
}

function d16oScore(node) {
  const text = d16oText(node);
  const rect = d16oRect(node);

  let score = 0;

  if (d16oIsMapped(node)) score += 100000;
  if (node.designitRawMediaMapped16DG === true) score += 20000;
  if (node.designitFinalRenderPlanSync16DL === true) score += 10000;
  if (node.rawSourceUrl || node.sourceUrl || node.currentSrc || node.src) score += 5000;

  if (!d16oIsBaked(node)) score += 3000;

  if (/raw-dom-image|synced-raw-dom-image/.test(text)) score += 2000;
  if (/internal screenshot|raw screenshot|backplate|visualbackplate|visual-backplate|raw-reference-screenshot/.test(text)) score -= 50000;

  if (rect) score += Math.min(1000, Math.sqrt(rect.area));

  return score;
}

function d16oWalk(node, path, parent, key, records) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      d16oWalk(node[i], path + "[" + i + "]", node, i, records);
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
      d16oWalk(value, path + "." + prop, node, prop, records);
    }
  }
}

function d16oRemoveRecord(record, stats, reason) {
  if (!record || !record.parent) return false;

  const node = record.node || {};

  if (Array.isArray(record.parent)) {
    if (!stats.arrayRemovals.has(record.parent)) {
      stats.arrayRemovals.set(record.parent, new Set());
    }

    stats.arrayRemovals.get(record.parent).add(record.key);
    stats.removed++;
  } else if (typeof record.parent === "object" && typeof record.key === "string") {
    delete record.parent[record.key];
    stats.removed++;
  } else {
    return false;
  }

  stats.samples.push({
    reason,
    path: record.path,
    name: String(node.name || ""),
    kind: String(node.kind || ""),
    type: String(node.type || ""),
    assetKind: String(node.assetKind || ""),
    mapped: d16oIsMapped(node),
    baked: d16oIsBaked(node)
  });

  return true;
}

function d16oCleanModel(root, modelName, stats) {
  if (!root || typeof root !== "object") return root;

  const records = [];
  d16oWalk(root, "$." + modelName, null, null, records);

  const groups = new Map();

  for (const record of records) {
    const node = record.node;
    const rect = d16oRect(node);

    if (!rect || rect.area < 80000) continue;
    if (!d16oIsImageLike(node)) continue;

    const groupKey = rect.key;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }

    groups.get(groupKey).push({
      record,
      score: d16oScore(node)
    });
  }

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => b.score - a.score);

    const keep = group[0];

    stats.groups.push({
      model: modelName,
      rect: rectKey,
      count: group.length,
      keptPath: keep.record.path,
      keptName: String(keep.record.node.name || ""),
      keptMapped: d16oIsMapped(keep.record.node),
      keptBaked: d16oIsBaked(keep.record.node)
    });

    for (let i = 1; i < group.length; i++) {
      d16oRemoveRecord(group[i].record, stats, "final-same-rect-dedupe:" + rectKey);
    }
  }

  return root;
}

function d16oApplyArrayRemovals(stats) {
  for (const [arr, indexes] of stats.arrayRemovals.entries()) {
    const sorted = Array.from(indexes).sort((a, b) => b - a);

    for (const index of sorted) {
      arr.splice(index, 1);
    }
  }

  delete stats.arrayRemovals;
}

function d16oFinalSameRectDedupe(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_FINAL_SAME_RECT_DEDUPE_16D_O",
    removed: 0,
    groups: [],
    samples: [],
    arrayRemovals: new Map()
  };

  if (payload.cloneModel) {
    payload.cloneModel = d16oCleanModel(payload.cloneModel, "cloneModel", stats);
  }

  if (payload.figmaRenderPlan) {
    payload.figmaRenderPlan = d16oCleanModel(payload.figmaRenderPlan, "figmaRenderPlan", stats);
  }

  d16oApplyArrayRemovals(stats);

  stats.groups = stats.groups.slice(0, 40);
  stats.samples = stats.samples.slice(0, 80);

  payload.designitFinalSameRectDedupe16DO = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.finalSameRectDedupe16DO = stats;

  return payload;
}
/* END DESIGNIT_FINAL_SAME_RECT_DEDUPE_16D_O */




/* DESIGNIT_FORCE_STRIP_RENDERABLE_SCREENSHOT_REFS_16D_P */
function d16pText(node) {
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

function d16pRect(node) {
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
    x,
    y,
    width,
    height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16pIsRenderableScreenshotRef(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16pText(node);
  const rect = d16pRect(node);
  const large = rect && rect.area > 1000000;

  if (/internal screenshot reference hidden/.test(text)) return true;
  if (/raw screenshot\s*\/\s*website/.test(text)) return true;
  if (/raw-reference-screenshot/.test(text)) return true;
  if (/page-screenshot|visual-backplate|visualbackplate|backplate/.test(text) && large) return true;
  if (/screenshot/.test(text) && large && !/https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;

  if (
    node.base64 &&
    large &&
    /image\/png|image\/jpeg|internal|reference|screenshot|backplate/.test(text)
  ) {
    return true;
  }

  return false;
}

function d16pIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16pText(node);

  if (/image|media|photo|picture|bitmap|visual/.test(text)) return true;
  if (/\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;
  if (node.rawMediaRect) return true;

  return false;
}

function d16pIsMapped(node) {
  if (!node || typeof node !== "object") return false;

  if (node.designitRawMediaMapped16DG === true) return true;

  const text = d16pText(node);

  if (
    node.designitFinalRenderPlanSync16DL === true &&
    /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)
  ) {
    return true;
  }

  return /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text);
}

function d16pIsBaked(node) {
  if (!node || typeof node !== "object") return false;

  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(d16pText(node));
}

function d16pWalkStrip(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    const kept = [];

    for (let i = 0; i < node.length; i++) {
      const item = node[i];

      if (d16pIsRenderableScreenshotRef(item)) {
        stats.removed++;
        stats.samples.push({
          reason: "array-remove-renderable-screenshot-ref",
          path: path + "[" + i + "]",
          name: String(item && item.name || ""),
          kind: String(item && item.kind || ""),
          assetKind: String(item && item.assetKind || "")
        });
        continue;
      }

      kept.push(d16pWalkStrip(item, stats, path + "[" + i + "]"));
    }

    return kept;
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

    if (/visualbackplate|visualBackplate/.test(key)) {
      delete node[key];
      stats.removed++;
      stats.samples.push({
        reason: "delete-visualBackplate-property",
        path: path + "." + key
      });
      continue;
    }

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (d16pIsRenderableScreenshotRef(value)) {
      delete node[key];
      stats.removed++;
      stats.samples.push({
        reason: "delete-renderable-screenshot-ref-property",
        path: path + "." + key,
        name: String(value && value.name || ""),
        kind: String(value && value.kind || ""),
        assetKind: String(value && value.assetKind || "")
      });
      continue;
    }

    node[key] = d16pWalkStrip(value, stats, path + "." + key);
  }

  return node;
}

function d16pRemoveResidualSameRect(root, modelName, stats) {
  if (!root || typeof root !== "object") return root;

  const records = [];

  function walk(node, path, parent, key) {
    if (!node) return;

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], path + "[" + i + "]", node, i);
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
        walk(value, path + "." + prop, node, prop);
      }
    }
  }

  walk(root, "$." + modelName, null, null);

  const groups = new Map();

  for (const record of records) {
    const rect = d16pRect(record.node);

    if (!rect || rect.area < 80000) continue;
    if (!d16pIsImageLike(record.node)) continue;

    if (!groups.has(rect.key)) groups.set(rect.key, []);
    groups.get(rect.key).push(record);
  }

  const removals = new Map();

  function score(record) {
    let value = 0;
    const node = record.node;

    if (d16pIsMapped(node)) value += 100000;
    if (!d16pIsBaked(node)) value += 1000;
    if (d16pIsRenderableScreenshotRef(node)) value -= 100000;
    if (/raw-reference-screenshot|internal screenshot|raw screenshot|backplate/.test(d16pText(node))) value -= 50000;

    const rect = d16pRect(node);
    if (rect) value += Math.min(500, Math.sqrt(rect.area));

    return value;
  }

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => score(b) - score(a));

    for (let i = 1; i < group.length; i++) {
      const record = group[i];

      if (Array.isArray(record.parent)) {
        if (!removals.has(record.parent)) removals.set(record.parent, new Set());
        removals.get(record.parent).add(record.key);

        stats.duplicateRemoved++;
        stats.samples.push({
          reason: "residual-same-rect-remove",
          rect: rectKey,
          path: record.path,
          name: String(record.node.name || ""),
          kind: String(record.node.kind || ""),
          assetKind: String(record.node.assetKind || "")
        });
      } else if (record.parent && typeof record.parent === "object" && typeof record.key === "string") {
        delete record.parent[record.key];

        stats.duplicateRemoved++;
        stats.samples.push({
          reason: "residual-same-rect-delete-property",
          rect: rectKey,
          path: record.path,
          name: String(record.node.name || ""),
          kind: String(record.node.kind || ""),
          assetKind: String(record.node.assetKind || "")
        });
      }
    }
  }

  for (const [arr, indexes] of removals.entries()) {
    const sorted = Array.from(indexes).sort((a, b) => b - a);

    for (const index of sorted) {
      arr.splice(index, 1);
    }
  }

  return root;
}

function d16pForceStripRenderableScreenshotRefs(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_FORCE_STRIP_RENDERABLE_SCREENSHOT_REFS_16D_P",
    removed: 0,
    duplicateRemoved: 0,
    samples: []
  };

  if (payload.cloneModel) {
    payload.cloneModel = d16pWalkStrip(payload.cloneModel, stats, "$.cloneModel");
    payload.cloneModel = d16pRemoveResidualSameRect(payload.cloneModel, "cloneModel", stats);
  }

  if (payload.figmaRenderPlan) {
    if (payload.figmaRenderPlan.visualBackplate) {
      delete payload.figmaRenderPlan.visualBackplate;
      stats.removed++;
      stats.samples.push({
        reason: "force-delete-figmaRenderPlan.visualBackplate",
        path: "$.figmaRenderPlan.visualBackplate"
      });
    }

    if (payload.figmaRenderPlan.diagnostics && payload.figmaRenderPlan.diagnostics.visualBackplate) {
      delete payload.figmaRenderPlan.diagnostics.visualBackplate;
      stats.removed++;
      stats.samples.push({
        reason: "force-delete-figmaRenderPlan.diagnostics.visualBackplate",
        path: "$.figmaRenderPlan.diagnostics.visualBackplate"
      });
    }

    payload.figmaRenderPlan = d16pWalkStrip(payload.figmaRenderPlan, stats, "$.figmaRenderPlan");
    payload.figmaRenderPlan = d16pRemoveResidualSameRect(payload.figmaRenderPlan, "figmaRenderPlan", stats);
  }

  stats.samples = stats.samples.slice(0, 80);

  payload.designitForceStripRenderableScreenshotRefs16DP = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.forceStripRenderableScreenshotRefs16DP = stats;

  return payload;
}
/* END DESIGNIT_FORCE_STRIP_RENDERABLE_SCREENSHOT_REFS_16D_P */




/* DESIGNIT_DIRECT_HARD_STRIP_REFERENCES_16D_S */
function d16sText(node) {
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

function d16sIsInternalReference(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16sText(node);

  if (/internal screenshot reference hidden/.test(text)) return true;
  if (/raw website screenshot/.test(text)) return true;
  if (/raw screenshot\s*\/\s*website/.test(text)) return true;
  if (/raw-reference-screenshot/.test(text)) return true;
  if (/raw-reference-comparison-frame/.test(text)) return true;
  if (/comparison-only/.test(text) && /screenshot|reference/.test(text)) return true;
  if (/visualbackplate|visual-backplate|backplate|page-screenshot/.test(text) && !/https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;

  return false;
}

function d16sFilterArray(arr, stats, path) {
  if (!Array.isArray(arr)) return arr;

  const kept = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (d16sIsInternalReference(item)) {
      stats.removed++;
      stats.samples.push({
        reason: "direct-array-remove-internal-reference",
        path: path + "[" + i + "]",
        name: String(item && item.name || ""),
        kind: String(item && item.kind || ""),
        assetKind: String(item && item.assetKind || ""),
        sourceReason: String(item && item.sourceReason || "")
      });
      continue;
    }

    kept.push(item);
  }

  return kept;
}

function d16sCleanObject(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return d16sFilterArray(node, stats, path).map((item, index) => d16sCleanObject(item, stats, path + "[" + index + "]"));
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

    if (/visualbackplate/i.test(key)) {
      delete node[key];
      stats.removed++;
      stats.visualBackplatesDeleted++;
      stats.samples.push({
        reason: "direct-delete-visualBackplate-key",
        path: path + "." + key
      });
      continue;
    }

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (d16sIsInternalReference(value)) {
      delete node[key];
      stats.removed++;
      stats.samples.push({
        reason: "direct-delete-internal-reference-property",
        path: path + "." + key,
        name: String(value && value.name || ""),
        kind: String(value && value.kind || ""),
        assetKind: String(value && value.assetKind || ""),
        sourceReason: String(value && value.sourceReason || "")
      });
      continue;
    }

    if (Array.isArray(value)) {
      node[key] = d16sFilterArray(value, stats, path + "." + key);
      for (let i = 0; i < node[key].length; i++) {
        node[key][i] = d16sCleanObject(node[key][i], stats, path + "." + key + "[" + i + "]");
      }
    } else {
      node[key] = d16sCleanObject(value, stats, path + "." + key);
    }
  }

  return node;
}

function d16sDirectHardStripReferences(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_DIRECT_HARD_STRIP_REFERENCES_16D_S",
    removed: 0,
    cloneAssetsBefore: 0,
    cloneAssetsAfter: 0,
    visualBackplatesDeleted: 0,
    samples: []
  };

  if (payload.cloneModel && Array.isArray(payload.cloneModel.assets)) {
    stats.cloneAssetsBefore = payload.cloneModel.assets.length;
    payload.cloneModel.assets = d16sFilterArray(payload.cloneModel.assets, stats, "$.cloneModel.assets");
    stats.cloneAssetsAfter = payload.cloneModel.assets.length;
  }

  if (payload.figmaRenderPlan) {
    if (payload.figmaRenderPlan.visualBackplate) {
      delete payload.figmaRenderPlan.visualBackplate;
      stats.removed++;
      stats.visualBackplatesDeleted++;
      stats.samples.push({
        reason: "direct-delete-figmaRenderPlan.visualBackplate",
        path: "$.figmaRenderPlan.visualBackplate"
      });
    }

    if (payload.figmaRenderPlan.diagnostics && payload.figmaRenderPlan.diagnostics.visualBackplate) {
      delete payload.figmaRenderPlan.diagnostics.visualBackplate;
      stats.removed++;
      stats.visualBackplatesDeleted++;
      stats.samples.push({
        reason: "direct-delete-figmaRenderPlan.diagnostics.visualBackplate",
        path: "$.figmaRenderPlan.diagnostics.visualBackplate"
      });
    }

    payload.figmaRenderPlan = d16sCleanObject(payload.figmaRenderPlan, stats, "$.figmaRenderPlan");
  }

  if (payload.cloneModel) {
    payload.cloneModel = d16sCleanObject(payload.cloneModel, stats, "$.cloneModel");
  }

  stats.samples = stats.samples.slice(0, 100);

  payload.designitDirectHardStripReferences16DS = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.directHardStripReferences16DS = stats;

  return payload;
}
/* END DESIGNIT_DIRECT_HARD_STRIP_REFERENCES_16D_S */




/* DESIGNIT_FINAL_END_PIPELINE_SANITIZER_16D_U */
function d16uText(node) {
  if (!node || typeof node !== "object") return "";

  let compact = "";

  try {
    compact = JSON.stringify(node, (key, value) => {
      if (key === "base64" || key === "screenshot") return "";
      if (typeof value === "string" && value.length > 500) return value.slice(0, 500);
      return value;
    }).slice(0, 6000).toLowerCase();
  } catch {
    compact = "";
  }

  const fields = [
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

  return fields + " " + compact;
}

function d16uHasHttpImage(node) {
  return /https?:\/\/[^\s"'<>]+\.(webp|png|jpg|jpeg|gif|svg)/i.test(d16uText(node));
}

function d16uIsInternalReference(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16uText(node);

  if (d16uHasHttpImage(node)) return false;

  if (/internal screenshot reference hidden/.test(text)) return true;
  if (/raw website screenshot/.test(text)) return true;
  if (/raw screenshot\s*\/\s*website/.test(text)) return true;
  if (/raw-reference-screenshot/.test(text)) return true;
  if (/raw-reference-comparison-frame/.test(text)) return true;
  if (/comparison-only/.test(text) && /screenshot|reference/.test(text)) return true;
  if (/page-screenshot|visualbackplate|visual-backplate|visual backplate|backplate/.test(text)) return true;

  return false;
}

function d16uRect(node) {
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
    x,
    y,
    width,
    height,
    area: width * height,
    key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",")
  };
}

function d16uIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16uText(node);

  if (/image|media|photo|picture|bitmap|visual|background/.test(text)) return true;
  if (/\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (node.imageIndex !== undefined && node.imageIndex !== null) return true;
  if (node.imageMeta) return true;
  if (node.rawMediaRect) return true;

  return false;
}

function d16uIsMapped(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16uText(node);

  if (node.designitRawMediaMapped16DG === true) return true;
  if (node.designitFinalRenderPlanSync16DL === true && /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;
  if (/https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) return true;

  return false;
}

function d16uIsBaked(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16uText(node);

  if (d16uHasHttpImage(node)) return false;

  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(text);
}

function d16uFilterArray(arr, stats, path) {
  if (!Array.isArray(arr)) return arr;

  const kept = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (d16uIsInternalReference(item)) {
      stats.removedInternalRefs++;
      stats.samples.push({
        reason: "array-remove-internal-reference",
        path: path + "[" + i + "]",
        name: String(item && item.name || ""),
        kind: String(item && item.kind || ""),
        assetKind: String(item && item.assetKind || "")
      });
      continue;
    }

    kept.push(d16uCleanObject(item, stats, path + "[" + i + "]"));
  }

  return kept;
}

function d16uCleanObject(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) {
    return d16uFilterArray(node, stats, path);
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
        reason: "delete-render-model-diagnostics",
        path: path + "." + key
      });
      continue;
    }

    if (/visualbackplate|visualBackplate/.test(key)) {
      delete node[key];
      stats.removedVisualBackplates++;
      stats.samples.push({
        reason: "delete-visualBackplate-property",
        path: path + "." + key
      });
      continue;
    }

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (d16uIsInternalReference(value)) {
      delete node[key];
      stats.removedInternalRefs++;
      stats.samples.push({
        reason: "delete-internal-reference-property",
        path: path + "." + key,
        name: String(value && value.name || ""),
        kind: String(value && value.kind || ""),
        assetKind: String(value && value.assetKind || "")
      });
      continue;
    }

    node[key] = d16uCleanObject(value, stats, path + "." + key);
  }

  return node;
}

function d16uWalk(node, path, parent, key, records) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      d16uWalk(node[i], path + "[" + i + "]", node, i, records);
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
      d16uWalk(value, path + "." + prop, node, prop, records);
    }
  }
}

function d16uScore(record) {
  const node = record.node;
  let score = 0;

  if (d16uIsMapped(node)) score += 100000;
  if (!d16uIsBaked(node)) score += 10000;
  if (d16uIsInternalReference(node)) score -= 100000;
  if (/raw-dom-image|synced-raw-dom-image/.test(d16uText(node))) score += 5000;

  const rect = d16uRect(node);
  if (rect) score += Math.min(1000, Math.sqrt(rect.area));

  return score;
}

function d16uDedupeLargeRects(root, modelName, stats) {
  if (!root || typeof root !== "object") return root;

  const records = [];
  d16uWalk(root, "$." + modelName, null, null, records);

  const groups = new Map();

  for (const record of records) {
    const rect = d16uRect(record.node);

    if (!rect || rect.area < 80000) continue;
    if (!d16uIsImageLike(record.node)) continue;

    if (!groups.has(rect.key)) groups.set(rect.key, []);
    groups.get(rect.key).push(record);
  }

  const removals = new Map();

  function markRemove(record, rectKey) {
    if (Array.isArray(record.parent)) {
      if (!removals.has(record.parent)) removals.set(record.parent, new Set());
      removals.get(record.parent).add(record.key);
      stats.removedDuplicates++;
    } else if (record.parent && typeof record.parent === "object" && typeof record.key === "string") {
      delete record.parent[record.key];
      stats.removedDuplicates++;
    } else {
      return;
    }

    stats.samples.push({
      reason: "final-dedupe-large-same-rect",
      rect: rectKey,
      path: record.path,
      name: String(record.node && record.node.name || ""),
      kind: String(record.node && record.node.kind || ""),
      assetKind: String(record.node && record.node.assetKind || "")
    });
  }

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => d16uScore(b) - d16uScore(a));

    for (let i = 1; i < group.length; i++) {
      markRemove(group[i], rectKey);
    }
  }

  for (const [arr, indexes] of removals.entries()) {
    const sorted = Array.from(indexes).sort((a, b) => b - a);
    for (const index of sorted) arr.splice(index, 1);
  }

  return root;
}

function d16uFinalEndPipelineSanitizer(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_FINAL_END_PIPELINE_SANITIZER_16D_U",
    removedInternalRefs: 0,
    removedDiagnostics: 0,
    removedVisualBackplates: 0,
    removedDuplicates: 0,
    samples: []
  };

  if (payload.cloneModel) {
    payload.cloneModel = d16uCleanObject(payload.cloneModel, stats, "$.cloneModel");
    payload.cloneModel = d16uDedupeLargeRects(payload.cloneModel, "cloneModel", stats);
  }

  if (payload.figmaRenderPlan) {
    payload.figmaRenderPlan = d16uCleanObject(payload.figmaRenderPlan, stats, "$.figmaRenderPlan");
    payload.figmaRenderPlan = d16uDedupeLargeRects(payload.figmaRenderPlan, "figmaRenderPlan", stats);
  }

  stats.samples = stats.samples.slice(0, 120);

  payload.designitFinalEndPipelineSanitizer16DU = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.finalEndPipelineSanitizer16DU = stats;

  return payload;
}
/* END DESIGNIT_FINAL_END_PIPELINE_SANITIZER_16D_U */




/* DESIGNIT_FINAL_BUILDPAYLOAD_RETURN_SANITIZER_16D_V */
function d16vShallowText(node) {
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

function d16vText(node) {
  if (!node || typeof node !== "object") return "";

  let compact = "";

  try {
    compact = JSON.stringify(node, (key, value) => {
      if (key === "base64" || key === "screenshot") return "";
      if (typeof value === "string" && value.length > 300) return value.slice(0, 300);
      return value;
    }).slice(0, 3000).toLowerCase();
  } catch {
    compact = "";
  }

  return d16vShallowText(node) + " " + compact;
}

function d16vHasHttpImage(node) {
  return /https?:\/\/[^\s"'<>]+\.(webp|png|jpg|jpeg|gif|svg)/i.test(d16vText(node));
}

function d16vIsInternalReference(node) {
  if (!node || typeof node !== "object") return false;

  const shallow = d16vShallowText(node);
  const deep = d16vText(node);

  if (/internal screenshot reference hidden/.test(shallow)) return true;
  if (/raw website screenshot/.test(shallow)) return true;
  if (/raw screenshot\s*\/\s*website/.test(shallow)) return true;
  if (/raw-reference-screenshot/.test(shallow)) return true;
  if (/raw-reference-comparison-frame/.test(shallow)) return true;
  if (/comparison-only/.test(shallow) && /screenshot|reference/.test(shallow)) return true;
  if (/page-screenshot|visualbackplate|visual-backplate|visual backplate/.test(shallow)) return true;

  if (!d16vHasHttpImage(node)) {
    if (/internal screenshot reference hidden/.test(deep)) return true;
    if (/raw website screenshot/.test(deep)) return true;
    if (/raw screenshot\s*\/\s*website/.test(deep)) return true;
    if (/raw-reference-screenshot/.test(deep)) return true;
    if (/raw-reference-comparison-frame/.test(deep)) return true;
    if (/page-screenshot|visualbackplate|visual-backplate|visual backplate/.test(deep)) return true;
  }

  return false;
}

function d16vRect(node) {
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

function d16vIsImageLike(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16vText(node);

  return /image|media|photo|picture|bitmap|visual|background/.test(text) ||
    /\.(webp|png|jpg|jpeg|gif|svg)/.test(text) ||
    node.imageIndex !== undefined ||
    !!node.imageMeta ||
    !!node.rawMediaRect;
}

function d16vIsMapped(node) {
  if (!node || typeof node !== "object") return false;

  const text = d16vText(node);

  return node.designitRawMediaMapped16DG === true ||
    (node.designitFinalRenderPlanSync16DL === true && /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text)) ||
    /https?:\/\/.*\.(webp|png|jpg|jpeg|gif|svg)/.test(text);
}

function d16vIsBaked(node) {
  if (!node || typeof node !== "object") return false;
  if (d16vHasHttpImage(node)) return false;

  return /screenshot|backplate|page-screenshot|visual-backplate|component-slice|component slice|crop|\bslice\b/.test(d16vText(node));
}

function d16vFilterArray(arr, stats, path) {
  if (!Array.isArray(arr)) return arr;

  const kept = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (d16vIsInternalReference(item)) {
      stats.removedInternalRefs++;
      stats.samples.push({
        reason: "final-return-array-remove-internal-reference",
        path: path + "[" + i + "]",
        name: String(item && item.name || ""),
        kind: String(item && item.kind || ""),
        assetKind: String(item && item.assetKind || ""),
        sourceReason: String(item && item.sourceReason || "")
      });
      continue;
    }

    kept.push(d16vCleanObject(item, stats, path + "[" + i + "]"));
  }

  return kept;
}

function d16vCleanObject(node, stats, path) {
  if (!node || typeof node !== "object") return node;

  if (Array.isArray(node)) return d16vFilterArray(node, stats, path);

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
      stats.samples.push({ reason: "final-return-delete-render-diagnostics", path: path + "." + key });
      continue;
    }

    if (/visualbackplate/i.test(key)) {
      delete node[key];
      stats.removedVisualBackplates++;
      stats.samples.push({ reason: "final-return-delete-visualBackplate-key", path: path + "." + key });
      continue;
    }

    const value = node[key];

    if (!value || typeof value !== "object") continue;

    if (d16vIsInternalReference(value)) {
      delete node[key];
      stats.removedInternalRefs++;
      stats.samples.push({
        reason: "final-return-delete-internal-reference-property",
        path: path + "." + key,
        name: String(value && value.name || ""),
        kind: String(value && value.kind || ""),
        assetKind: String(value && value.assetKind || ""),
        sourceReason: String(value && value.sourceReason || "")
      });
      continue;
    }

    node[key] = d16vCleanObject(value, stats, path + "." + key);
  }

  return node;
}

function d16vWalk(node, path, parent, key, records) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) d16vWalk(node[i], path + "[" + i + "]", node, i, records);
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
    if (value && typeof value === "object") d16vWalk(value, path + "." + prop, node, prop, records);
  }
}

function d16vScore(record) {
  let score = 0;
  const node = record.node;

  if (d16vIsMapped(node)) score += 100000;
  if (!d16vIsBaked(node)) score += 10000;
  if (d16vIsInternalReference(node)) score -= 100000;

  const rect = d16vRect(node);
  if (rect) score += Math.min(1000, Math.sqrt(rect.area));

  return score;
}

function d16vDedupeLargeRects(root, modelName, stats) {
  if (!root || typeof root !== "object") return root;

  const records = [];
  d16vWalk(root, "$." + modelName, null, null, records);

  const groups = new Map();

  for (const record of records) {
    const rect = d16vRect(record.node);

    if (!rect || rect.area < 80000) continue;
    if (!d16vIsImageLike(record.node)) continue;

    if (!groups.has(rect.key)) groups.set(rect.key, []);
    groups.get(rect.key).push(record);
  }

  const removals = new Map();

  for (const [rectKey, group] of groups.entries()) {
    if (group.length <= 1) continue;

    group.sort((a, b) => d16vScore(b) - d16vScore(a));

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
        reason: "final-return-dedupe-large-same-rect",
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

function d16vFinalBuildPayloadReturnSanitizer(payload) {
  if (!payload || typeof payload !== "object") return payload;

  const stats = {
    marker: "DESIGNIT_FINAL_BUILDPAYLOAD_RETURN_SANITIZER_16D_V",
    removedInternalRefs: 0,
    removedDiagnostics: 0,
    removedVisualBackplates: 0,
    removedDuplicates: 0,
    samples: []
  };

  if (payload.cloneModel) {
    payload.cloneModel = d16vCleanObject(payload.cloneModel, stats, "$.cloneModel");
    payload.cloneModel = d16vDedupeLargeRects(payload.cloneModel, "cloneModel", stats);
  }

  if (payload.figmaRenderPlan) {
    payload.figmaRenderPlan = d16vCleanObject(payload.figmaRenderPlan, stats, "$.figmaRenderPlan");
    payload.figmaRenderPlan = d16vDedupeLargeRects(payload.figmaRenderPlan, "figmaRenderPlan", stats);
  }

  stats.samples = stats.samples.slice(0, 160);

  payload.designitFinalBuildPayloadReturnSanitizer16DV = stats;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.finalBuildPayloadReturnSanitizer16DV = stats;

  return payload;
}
/* END DESIGNIT_FINAL_BUILDPAYLOAD_RETURN_SANITIZER_16D_V */


async function buildPayloadOriginal17B(targetUrl) {
  const payload = await buildPayloadCore(targetUrl);
  return d16vFinalBuildPayloadReturnSanitizer(d16uFinalEndPipelineSanitizer(d16sDirectHardStripReferences(d16pForceStripRenderableScreenshotRefs(d16oFinalSameRectDedupe(d16nStripInternalScreenshotRefs(d16lFinalRenderPlanMediaSync(d16jGlobalRenderableCleanup(d16iCleanRenderableMedia(d16gMapRawMediaToImageLayers(payload))))))))));
}



/* DESIGNIT_RENDERPLAN_V2_BUILD_WRAPPER_17B */
async function d17bAttachRenderPlanV2(payload) {
  if (!payload || typeof payload !== "object") return payload;

  try {
    payload.renderPlanV2 = await buildRenderPlanV2(payload);

    if (payload.figmaRenderPlan && typeof payload.figmaRenderPlan === "object") {
      payload.figmaRenderPlan.renderPlanV2 = payload.renderPlanV2;
    }

    payload.diagnostics = payload.diagnostics || {};
    payload.diagnostics.renderPlanV2Wrapper17B = {
      marker: "DESIGNIT_RENDERPLAN_V2_BUILD_WRAPPER_17B",
      readyForFigma: Boolean(payload.renderPlanV2 && payload.renderPlanV2.readyForFigma),
      assets: payload.renderPlanV2 && Array.isArray(payload.renderPlanV2.assets) ? payload.renderPlanV2.assets.length : 0,
      rootChildren: payload.renderPlanV2 && payload.renderPlanV2.root && Array.isArray(payload.renderPlanV2.root.children) ? payload.renderPlanV2.root.children.length : 0
    };
  } catch (error) {
    payload.renderPlanV2 = {
      version: "render-plan-v2",
      readyForFigma: false,
      error: error && error.stack ? error.stack : String(error)
    };
  }

  return payload;
}
/* END DESIGNIT_RENDERPLAN_V2_BUILD_WRAPPER_17B */


export async function buildPayload(...params) {
  const payload = await buildPayloadOriginal17B(...params);
  return await d17bAttachRenderPlanV2(payload);
}
