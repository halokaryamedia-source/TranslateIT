function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function base64Bytes(value) {
  if (!value) return 0;

  try {
    return Buffer.from(String(value), "base64").length;
  } catch {
    return 0;
  }
}

function hashText(value) {
  let h = 2166136261;
  const text = String(value || "");

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return (h >>> 0).toString(36);
}

function screenshotCandidateFromObject(obj, sourcePath) {
  if (!isObject(obj)) return null;

  const base64 = typeof obj.base64 === "string" ? obj.base64 : "";
  const bytes = base64Bytes(base64);
  const contentType = String(obj.contentType || obj.mimeType || "image/png");

  if (!base64 || bytes < 1000) return null;
  if (!contentType.toLowerCase().startsWith("image/")) return null;

  return {
    sourcePath,
    base64,
    bytes,
    contentType,
    width: Number(obj.width || obj.w || 0) || null,
    height: Number(obj.height || obj.h || 0) || null
  };
}

export function findReferenceScreenshotCandidate(payload) {
  if (!isObject(payload)) return null;

  const directPaths = [
    ["source", "screenshot"],
    ["diagnostics", "capture", "screenshot"],
    ["visualModel", "source", "screenshot"],
    ["cloneModel", "visualBacking", "screenshot"],
    ["visualBacking", "screenshot"]
  ];

  const candidates = [];

  for (const path of directPaths) {
    let cur = payload;
    let ok = true;

    for (const key of path) {
      if (!isObject(cur) || !(key in cur)) {
        ok = false;
        break;
      }

      cur = cur[key];
    }

    if (!ok) continue;

    const candidate = screenshotCandidateFromObject(cur, "$." + path.join("."));
    if (candidate) candidates.push(candidate);
  }

  candidates.sort((a, b) => b.bytes - a.bytes);

  return candidates[0] || null;
}

export function makeReferenceScreenshotAsset(payload) {
  const candidate = findReferenceScreenshotCandidate(payload);
  if (!candidate) return null;

  const sourceUrl =
    payload &&
    payload.source &&
    (payload.source.finalUrl || payload.source.url)
      ? String(payload.source.finalUrl || payload.source.url)
      : "";

  return {
    id: "clean_reference_screenshot_" + hashText(sourceUrl + ":" + candidate.bytes + ":" + candidate.sourcePath),
    type: "image",
    kind: "reference-screenshot",
    assetKind: "reference-screenshot",
    contentType: candidate.contentType || "image/png",
    mimeType: candidate.contentType || "image/png",
    base64: candidate.base64,
    width: candidate.width || undefined,
    height: candidate.height || undefined,
    sourceUrl,
    referenceScreenshot: true,
    sourcePath: candidate.sourcePath
  };
}

export function ensureReferenceScreenshotAsset(payload, plan) {
  if (!isObject(plan)) return plan;

  const next = JSON.parse(JSON.stringify(plan));
  next.assets = Array.isArray(next.assets) ? next.assets : [];

  const already = next.assets.find(asset => asset && asset.referenceScreenshot === true && asset.base64);

  if (already) {
    return next;
  }

  const referenceAsset = makeReferenceScreenshotAsset(payload);

  if (referenceAsset) {
    next.assets.unshift(referenceAsset);
  }

  return next;
}