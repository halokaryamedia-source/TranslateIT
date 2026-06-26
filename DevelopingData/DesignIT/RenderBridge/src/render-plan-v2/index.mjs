/* DESIGNIT_RENDERPLAN_V2_SEGMENTATION_17G */

function h17g(value) {
  let h = 5381;
  const s = String(value || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function imageUrl17g(value) {
  const s = String(value || "").trim();
  if (!/^https?:\/\//i.test(s)) return "";
  if (!/\.(webp|png|jpg|jpeg|gif|svg)(\?|#|$)/i.test(s)) return "";
  return s;
}

function rect17g(item) {
  if (!item || typeof item !== "object") return null;

  const raw = item.rect || item.bounds || item.box || item.frame || item;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(raw.x !== undefined ? raw.x : (raw.left !== undefined ? raw.left : 0));
  const y = Number(raw.y !== undefined ? raw.y : (raw.top !== undefined ? raw.top : 0));
  const width = Number(raw.width !== undefined ? raw.width : (raw.w !== undefined ? raw.w : (item.width !== undefined ? item.width : 0)));
  const height = Number(raw.height !== undefined ? raw.height : (raw.h !== undefined ? raw.h : (item.height !== undefined ? item.height : 0)));

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

function source17g(payload) {
  return payload && payload.source ? payload.source : {};
}

function rawMedia17g(payload) {
  const s = source17g(payload);
  const out = [];

  if (Array.isArray(s.rawMediaSourceTruth)) out.push(...s.rawMediaSourceTruth);
  if (s.sourceTruth && Array.isArray(s.sourceTruth.rawMedia)) out.push(...s.sourceTruth.rawMedia);

  return out;
}

function textBoxes17g(payload) {
  const s = source17g(payload);
  const out = [];

  if (Array.isArray(s.textSourceTruth)) out.push(...s.textSourceTruth);
  if (s.sourceTruth && Array.isArray(s.sourceTruth.textBoxes)) out.push(...s.sourceTruth.textBoxes);

  return out;
}

function controls17g(payload) {
  const s = source17g(payload);
  const out = [];

  if (Array.isArray(s.controlSourceTruth)) out.push(...s.controlSourceTruth);
  if (s.sourceTruth && Array.isArray(s.sourceTruth.controls)) out.push(...s.sourceTruth.controls);

  return out;
}

function color17g(value, fallback) {
  const s = String(value || "").trim();
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s;
  if (/^rgb/i.test(s)) return s;
  return fallback || "#111111";
}

function textValue17g(item) {
  return String(item.text || item.value || item.label || item.name || "").trim();
}

async function fetchImageAsset17g(url, stats) {
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, 20000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "DesignIT-RenderPlanV2/17G" }
    });

    if (!response.ok) {
      stats.fetchFailed++;
      stats.fetchFailures.push({ url, status: response.status });
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) {
      stats.fetchFailed++;
      stats.fetchFailures.push({ url, status: "empty" });
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const id = "v2_asset_" + h17g(url);

    stats.fetchSucceeded++;

    return {
      id,
      type: "image",
      contentType,
      mimeType: contentType,
      base64: buffer.toString("base64"),
      sourceUrl: url,
      url
    };
  } catch (error) {
    stats.fetchFailed++;
    stats.fetchFailures.push({ url, error: error && error.message ? error.message : String(error) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function collectRenderableMedia17g(mediaItems) {
  const out = [];
  const seen = new Set();

  for (const item of mediaItems) {
    const rect = rect17g(item);
    if (!rect || rect.area < 2500) continue;

    const url =
      imageUrl17g(item.currentSrc) ||
      imageUrl17g(item.src) ||
      imageUrl17g(item.url) ||
      imageUrl17g(item.finalUrl);

    if (!url) continue;

    const key = rect.key + "::" + url;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ item, rect, url });
  }

  return out;
}

async function hydrateAssets17g(renderableMedia, stats) {
  const assets = [];
  const index = new Map();
  const urls = [];
  const seen = new Set();

  for (const media of renderableMedia) {
    if (!media.url || seen.has(media.url)) continue;
    seen.add(media.url);
    urls.push(media.url);
  }

  for (const url of urls.slice(0, 80)) {
    const asset = await fetchImageAsset17g(url, stats);
    if (!asset) continue;

    assets.push(asset);
    index.set(url, asset);
  }

  return { assets, index };
}

function compileImages17g(renderableMedia, assetIndex, stats) {
  const nodes = [];
  const seen = new Set();

  for (const media of renderableMedia) {
    const item = media.item;
    const rect = media.rect;
    const url = media.url;
    const asset = assetIndex.get(url);

    if (!asset) {
      stats.imageNodesMissingAsset++;
      continue;
    }

    const dedupeKey = rect.area > 80000 ? rect.key : rect.key + "::" + url;
    if (seen.has(dedupeKey)) {
      stats.imageDuplicateSkipped++;
      continue;
    }
    seen.add(dedupeKey);

    nodes.push({
      id: "v2_img_" + h17g(url + "::" + rect.key),
      type: "image",
      name: String(item.alt || item.title || item.name || "Image / Raw Website"),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      assetId: asset.id,
      sourceUrl: url,
      fit: String(item.objectFit || "cover"),
      position: String(item.objectPosition || "50% 50%"),
      editable: true,
      layerPriority: 10
    });
  }

  return nodes;
}

function compileTexts17g(items) {
  const nodes = [];
  const seen = new Set();

  for (const item of items) {
    const text = textValue17g(item);
    if (!text) continue;

    const rect = rect17g(item);
    if (!rect || rect.width < 2 || rect.height < 2) continue;

    const key = rect.key + "::" + text;
    if (seen.has(key)) continue;
    seen.add(key);

    nodes.push({
      id: "v2_txt_" + h17g(key),
      type: "text",
      name: "Text / " + text.slice(0, 50),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      text,
      style: {
        fontSize: Number(item.fontSize || item.size || 14),
        fontWeight: String(item.fontWeight || "400"),
        color: color17g(item.color || item.fill || item.textColor, "#111111"),
        textAlign: String(item.textAlign || "LEFT").toUpperCase()
      },
      editable: true,
      layerPriority: 30
    });
  }

  return nodes;
}

function compileControls17g(items) {
  const nodes = [];
  const seen = new Set();

  for (const item of items) {
    const rect = rect17g(item);
    if (!rect || rect.width < 4 || rect.height < 4) continue;

    const label = String(item.text || item.label || item.name || item.role || "").trim();
    const key = rect.key + "::" + label;

    if (seen.has(key)) continue;
    seen.add(key);

    nodes.push({
      id: "v2_btn_" + h17g(key),
      type: "button",
      name: "Button / " + (label || "Control").slice(0, 50),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      text: label,
      style: {
        background: color17g(item.backgroundColor || item.background || item.fill, "transparent"),
        color: color17g(item.color || item.textColor, "#111111"),
        radius: Number(item.borderRadius || item.radius || 4),
        fontSize: Number(item.fontSize || 12)
      },
      editable: true,
      layerPriority: 20
    });
  }

  return nodes;
}

function nodePriority17g(node) {
  if (!node || typeof node !== "object") return 0;
  if (Number.isFinite(Number(node.layerPriority))) return Number(node.layerPriority);
  if (node.type === "rect") return 0;
  if (node.type === "image") return 10;
  if (node.type === "button") return 20;
  if (node.type === "text") return 30;
  return 15;
}

function cloneLocal17g(node, sectionY) {
  const copy = JSON.parse(JSON.stringify(node));
  copy.rect = copy.rect || {};
  copy.rect.y = Number(copy.rect.y || 0) - sectionY;
  return copy;
}

function makeSection17g(index, y, width) {
  return {
    id: "v2_section_" + index,
    type: "frame",
    name: index === 1 ? "01 Header / Top" : "Section " + index,
    rect: { x: 0, y: Math.max(0, y), width, height: 100 },
    style: { background: "transparent" },
    children: [],
    bottom: y + 100
  };
}

function finalizeSection17g(section) {
  section.children.sort(function(a, b) {
    const pa = nodePriority17g(a);
    const pb = nodePriority17g(b);

    if (pa !== pb) return pa - pb;

    const ay = a.rect ? Number(a.rect.y || 0) : 0;
    const by = b.rect ? Number(b.rect.y || 0) : 0;
    return ay - by;
  });

  section.rect.height = Math.max(80, section.bottom - section.rect.y + 24);
  delete section.bottom;
  return section;
}

function naturalSections17g(nodes, pageWidth) {
  const sorted = nodes.slice().sort(function(a, b) {
    const ar = rect17g(a);
    const br = rect17g(b);
    return (ar ? ar.y : 0) - (br ? br.y : 0);
  });

  const sections = [];
  let current = null;

  for (const node of sorted) {
    const r = rect17g(node);
    if (!r) continue;

    if (!current || r.y > current.bottom + 220 || r.y > current.rect.y + 780) {
      current = makeSection17g(sections.length + 1, Math.max(0, r.y - 24), pageWidth);
      sections.push(current);
    }

    current.children.push(cloneLocal17g(node, current.rect.y));
    current.bottom = Math.max(current.bottom, r.bottom);
  }

  return sections.map(finalizeSection17g);
}

function bandSections17g(nodes, pageWidth, pageHeight) {
  const bands = [];
  const headerEnd = 180;
  const footerStart = Math.max(0, pageHeight - 500);

  bands.push({ name: "01 Header / Top", start: 0, end: headerEnd });

  let cursor = headerEnd;
  let index = 2;

  while (cursor < footerStart) {
    bands.push({ name: "Section " + index, start: cursor, end: Math.min(footerStart, cursor + 650) });
    cursor += 650;
    index++;
  }

  if (footerStart > headerEnd) {
    bands.push({ name: "Footer / Bottom", start: footerStart, end: pageHeight + 2000 });
  }

  const sections = [];

  for (const band of bands) {
    const children = [];

    for (const node of nodes) {
      const r = rect17g(node);
      if (!r) continue;

      const centerY = r.y + r.height / 2;
      if (centerY >= band.start && centerY < band.end) {
        children.push(node);
      }
    }

    if (!children.length) continue;

    let top = Number.POSITIVE_INFINITY;
    let bottom = 0;

    for (const node of children) {
      const r = rect17g(node);
      if (!r) continue;
      top = Math.min(top, r.y);
      bottom = Math.max(bottom, r.bottom);
    }

    if (!Number.isFinite(top)) continue;

    const section = {
      id: "v2_section_" + (sections.length + 1),
      type: "frame",
      name: sections.length === 0 ? "01 Header / Top" : band.name,
      rect: { x: 0, y: Math.max(0, top - 24), width: pageWidth, height: Math.max(80, bottom - top + 48) },
      style: { background: "transparent" },
      children: [],
      bottom: bottom
    };

    for (const node of children) {
      section.children.push(cloneLocal17g(node, section.rect.y));
    }

    sections.push(finalizeSection17g(section));
  }

  return sections;
}

function groupIntoSections17g(nodes, pageWidth, pageHeight, stats) {
  const natural = naturalSections17g(nodes, pageWidth);

  stats.naturalSections = natural.length;

  if (natural.length >= 3 || pageHeight < 1200) {
    stats.segmentationMode = "natural-gap";
    return natural.length ? natural : [finalizeSection17g(makeSection17g(1, 0, pageWidth))];
  }

  const banded = bandSections17g(nodes, pageWidth, pageHeight);

  stats.bandedSections = banded.length;

  if (banded.length > natural.length) {
    stats.segmentationMode = "adaptive-bands";
    return banded;
  }

  stats.segmentationMode = "natural-fallback";
  return natural.length ? natural : [finalizeSection17g(makeSection17g(1, 0, pageWidth))];
}

function walkCount17g(node, counts) {
  if (!node || typeof node !== "object") return;

  const type = node.type || "unknown";
  counts[type] = (counts[type] || 0) + 1;

  if (Array.isArray(node.children)) {
    for (const child of node.children) walkCount17g(child, counts);
  }
}

function findBadRefs17g(node, out) {
  if (!node || typeof node !== "object") return;

  const text = [
    node.type,
    node.name,
    node.kind,
    node.assetKind,
    node.sourceReason
  ].map(function(value) { return String(value || "").toLowerCase(); }).join(" ");

  if (/screenshot|backplate|raw-reference-screenshot|internal-reference-hidden/.test(text)) {
    out.push({ name: node.name || "", type: node.type || "", text });
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) findBadRefs17g(child, out);
  }
}

function validate17g(plan, stats) {
  const counts = {};
  walkCount17g(plan.root, counts);

  const badRefs = [];
  findBadRefs17g(plan.root, badRefs);

  const imageAssets = Array.isArray(plan.assets)
    ? plan.assets.filter(function(asset) { return asset && asset.type === "image" && asset.base64; })
    : [];

  const rawRenderable = Number(stats.rawRenderableMedia || 0);
  const expectedImages = rawRenderable <= 0 ? 0 : Math.min(8, rawRenderable);
  const expectedTexts = Math.min(10, Number(stats.textBoxes || 0));
  const expectedFrames = plan.page.height > 1200 ? 2 : 1;

  const reasons = [];

  if (imageAssets.length < expectedImages) reasons.push("image assets below adaptive minimum");
  if ((counts.image || 0) < expectedImages) reasons.push("image nodes below adaptive minimum");
  if ((counts.text || 0) < expectedTexts) reasons.push("text nodes below adaptive minimum");
  if ((counts.frame || 0) < expectedFrames) reasons.push("frame nodes below adaptive minimum");
  if (stats.imageNodesMissingAsset > 0) reasons.push("image nodes missing asset");
  if (badRefs.length > 0) reasons.push("raw/internal screenshot references found in root");

  return {
    ok: reasons.length === 0,
    reasons,
    counts,
    badRefs: badRefs.slice(0, 20),
    imageAssets: imageAssets.length,
    adaptiveMinimums: {
      rawRenderable,
      expectedImages,
      expectedTexts,
      expectedFrames
    }
  };
}

async function buildRenderPlanV2Base17NFix2(payload) {
  const s = source17g(payload);

  const pageWidth =
    Number(s.viewport && s.viewport.width) ||
    Number(payload && payload.page && payload.page.width) ||
    1440;

  const pageHeight =
    Number(s.pageHeight) ||
    Number(payload && payload.page && payload.page.height) ||
    3000;

  const plan = {
    version: "render-plan-v2",
    readyForFigma: false,
    page: {
      width: pageWidth,
      height: pageHeight,
      background: "#ffffff"
    },
    assets: [],
    root: {
      id: "v2_root",
      type: "frame",
      name: "DesignIT Editable Page",
      rect: { x: 0, y: 0, width: pageWidth, height: pageHeight },
      style: { background: "#ffffff" },
      children: []
    },
    diagnostics: {
      marker: "DESIGNIT_RENDERPLAN_V2_SEGMENTATION_17G",
      rawMedia: 0,
      rawRenderableMedia: 0,
      textBoxes: 0,
      controls: 0,
      fetchSucceeded: 0,
      fetchFailed: 0,
      fetchFailures: [],
      imageNodesMissingAsset: 0,
      imageDuplicateSkipped: 0,
      segmentationMode: "",
      naturalSections: 0,
      bandedSections: 0,
      nodeCounts: {},
      validation: null
    }
  };

  const media = rawMedia17g(payload);
  const texts = textBoxes17g(payload);
  const controlItems = controls17g(payload);
  const renderableMedia = collectRenderableMedia17g(media);

  plan.diagnostics.rawMedia = media.length;
  plan.diagnostics.rawRenderableMedia = renderableMedia.length;
  plan.diagnostics.textBoxes = texts.length;
  plan.diagnostics.controls = controlItems.length;

  const hydrated = await hydrateAssets17g(renderableMedia, plan.diagnostics);

  const imageNodes = compileImages17g(renderableMedia, hydrated.index, plan.diagnostics);
  const textNodes = compileTexts17g(texts);
  const buttonNodes = compileControls17g(controlItems);

  const allNodes = []
    .concat(imageNodes)
    .concat(buttonNodes)
    .concat(textNodes);

  plan.assets = hydrated.assets;
  plan.root.children = groupIntoSections17g(allNodes, pageWidth, pageHeight, plan.diagnostics);

  const validation = validate17g(plan, plan.diagnostics);

  plan.readyForFigma = validation.ok;
  plan.diagnostics.nodeCounts = validation.counts;
  plan.diagnostics.validation = validation;

  return plan;
}
/* END DESIGNIT_RENDERPLAN_V2_SEGMENTATION_17G */

/* DESIGNIT_RENDERPLAN_V2_COMPARE_WRAPPER_17N_FIX2 */
function d17nFix2IsObj(value) {
  return value && typeof value === "object";
}

function d17nFix2Hash(value) {
  let h = 5381;
  const s = String(value || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function d17nFix2Number(value, fallback, min, max) {
  let n = Number(value);
  if (!Number.isFinite(n)) n = fallback;
  if (Number.isFinite(min)) n = Math.max(min, n);
  if (Number.isFinite(max)) n = Math.min(max, n);
  return n;
}

function d17nFix2Rect(rect, fallback) {
  const r = d17nFix2IsObj(rect) ? rect : {};
  const f = fallback || { x: 0, y: 0, width: 1, height: 1 };

  return {
    x: d17nFix2Number(r.x !== undefined ? r.x : r.left, f.x || 0, -100000, 100000),
    y: d17nFix2Number(r.y !== undefined ? r.y : r.top, f.y || 0, -100000, 100000),
    width: d17nFix2Number(r.width !== undefined ? r.width : r.w, f.width || 1, 1, 100000),
    height: d17nFix2Number(r.height !== undefined ? r.height : r.h, f.height || 1, 1, 100000)
  };
}

function d17nFix2Walk(node, visit) {
  if (!node || typeof node !== "object") return;

  visit(node);

  if (Array.isArray(node.children)) {
    for (const child of node.children) d17nFix2Walk(child, visit);
  }
}

function d17nFix2FindTargetUrl(value, depth, seen) {
  if (!value || depth > 7) return "";

  if (typeof value === "string") {
    const s = value.trim();
    if (/^https?:\/\//i.test(s) && !/\.(webp|png|jpg|jpeg|gif|svg|css|js|woff|woff2)(\?|#|$)/i.test(s)) {
      return s;
    }
    return "";
  }

  if (!d17nFix2IsObj(value)) return "";

  seen = seen || new Set();
  if (seen.has(value)) return "";
  seen.add(value);

  const preferred = [
    "targetUrl",
    "pageUrl",
    "websiteUrl",
    "inputUrl",
    "requestedUrl",
    "finalUrl",
    "url"
  ];

  for (const key of preferred) {
    if (typeof value[key] === "string") {
      const found = d17nFix2FindTargetUrl(value[key], depth + 1, seen);
      if (found) return found;
    }
  }

  for (const key of Object.keys(value).slice(0, 120)) {
    if (key === "base64" || key === "assets") continue;

    const found = d17nFix2FindTargetUrl(value[key], depth + 1, seen);
    if (found) return found;
  }

  return "";
}

function d17nFix2FindScreenshotObject(value, depth, seen) {
  if (!value || depth > 8) return null;

  if (!d17nFix2IsObj(value)) return null;

  seen = seen || new Set();
  if (seen.has(value)) return null;
  seen.add(value);

  const base64 = typeof value.base64 === "string" ? value.base64 : "";
  const contentType = String(value.contentType || value.mimeType || "");

  if (base64.length > 100000 && /image\/png|image\/jpeg|image\/webp/i.test(contentType || "image/png")) {
    return value;
  }

  const keys = [
    "source",
    "screenshot",
    "rawScreenshot",
    "referenceScreenshot",
    "visualScreenshot",
    "rawReferenceFrame",
    "visualBacking",
    "visualBackplate",
    "cloneModel",
    "visualModel",
    "diagnostics"
  ];

  for (const key of keys) {
    const found = d17nFix2FindScreenshotObject(value[key], depth + 1, seen);
    if (found) return found;
  }

  for (const key of Object.keys(value).slice(0, 120)) {
    if (key === "assets" || key === "renderPlanV2" || key === "figmaRenderPlan") continue;

    const found = d17nFix2FindScreenshotObject(value[key], depth + 1, seen);
    if (found) return found;
  }

  return null;
}

function d17nFix2MakeReferenceAsset(payload, basePlan, width, height, diagnostics) {
  const screenshot = d17nFix2FindScreenshotObject(payload, 0, new Set());

  if (!screenshot || !screenshot.base64) {
    diagnostics.referenceScreenshot = {
      captured: false,
      source: "missing",
      bytes: 0,
      width,
      height,
      reason: "No source screenshot base64 found in payload"
    };
    return null;
  }

  const asset = {
    id: "v2_reference_screenshot_" + d17nFix2Hash(d17nFix2FindTargetUrl(payload, 0, new Set()) || "payload-reference"),
    type: "image",
    contentType: screenshot.contentType || screenshot.mimeType || "image/png",
    mimeType: screenshot.mimeType || screenshot.contentType || "image/png",
    base64: screenshot.base64,
    sourceUrl: d17nFix2FindTargetUrl(payload, 0, new Set()) || "",
    url: d17nFix2FindTargetUrl(payload, 0, new Set()) || "",
    referenceScreenshot: true
  };

  const bytes = Buffer.from(String(asset.base64 || ""), "base64").length;

  diagnostics.referenceScreenshot = {
    captured: bytes > 100000,
    source: "payload-screenshot",
    bytes,
    width: d17nFix2Number(screenshot.width || screenshot.w, width, 1, 100000),
    height: d17nFix2Number(screenshot.height || screenshot.h, height, 1, 100000),
    reason: bytes > 100000 ? "" : "Payload screenshot too small"
  };

  return asset;
}

function d17nFix2CloneNode(node, offsetX, offsetY, diagnostics, pathName) {
  if (!node || typeof node !== "object") return null;

  const copy = JSON.parse(JSON.stringify(node));
  const r = d17nFix2Rect(copy.rect, { x: 0, y: 0, width: 1, height: 1 });

  copy.rect = {
    x: r.x + d17nFix2Number(offsetX, 0, -100000, 100000),
    y: r.y + d17nFix2Number(offsetY, 0, -100000, 100000),
    width: r.width,
    height: r.height
  };

  if (!Array.isArray(copy.children)) {
    copy.children = [];
  } else {
    const children = [];
    for (let i = 0; i < copy.children.length; i++) {
      const child = d17nFix2CloneNode(copy.children[i], 0, 0, diagnostics, (pathName || copy.name || "$") + ".children[" + i + "]");
      if (child) children.push(child);
    }
    copy.children = children;
  }

  if (
    !Number.isFinite(copy.rect.x) ||
    !Number.isFinite(copy.rect.y) ||
    !Number.isFinite(copy.rect.width) ||
    !Number.isFinite(copy.rect.height) ||
    copy.rect.width <= 0 ||
    copy.rect.height <= 0
  ) {
    diagnostics.invalidRectsBlocked++;
    if (diagnostics.invalidRectSamples.length < 30) {
      diagnostics.invalidRectSamples.push({
        path: pathName || copy.name || copy.id || "",
        type: copy.type || "",
        name: copy.name || "",
        rect: copy.rect
      });
    }
    return null;
  }

  return copy;
}

function d17nFix2Count(root) {
  const counts = {
    frame: 0,
    image: 0,
    text: 0,
    button: 0,
    invalidRects: 0,
    imageMissingAsset: 0
  };

  const assetIds = new Set();

  d17nFix2Walk(root, function(node) {
    if (node.type === "frame") counts.frame++;
    if (node.type === "image") counts.image++;
    if (node.type === "text") counts.text++;
    if (node.type === "button") counts.button++;

    const r = node.rect;
    if (
      !r ||
      !Number.isFinite(Number(r.x)) ||
      !Number.isFinite(Number(r.y)) ||
      !Number.isFinite(Number(r.width)) ||
      !Number.isFinite(Number(r.height)) ||
      Number(r.width) <= 0 ||
      Number(r.height) <= 0
    ) {
      counts.invalidRects++;
    }
  });

  return counts;
}

function d17nFix2ValidateImageRefs(root, assets) {
  const ids = new Set();

  for (const asset of Array.isArray(assets) ? assets : []) {
    if (asset && asset.id) ids.add(String(asset.id));
  }

  const missing = [];

  d17nFix2Walk(root, function(node) {
    if (node.type === "image") {
      if (!node.assetId || !ids.has(String(node.assetId))) {
        missing.push({
          name: node.name || "",
          assetId: node.assetId || ""
        });
      }
    }
  });

  return missing;
}

function d17nFix2WrapCompare(payload, basePlan) {
  const baseRoot = basePlan && basePlan.root ? basePlan.root : null;
  const baseDiagnostics = basePlan && basePlan.diagnostics ? basePlan.diagnostics : {};

  const targetWidth = d17nFix2Number(basePlan && basePlan.page && (basePlan.page.targetWidth || basePlan.page.width), 1440, 800, 3000);
  const targetHeight = d17nFix2Number(basePlan && basePlan.page && (basePlan.page.targetHeight || basePlan.page.height), 3000, 900, 12000);
  const gap = 120;

  const diagnostics = Object.assign({}, baseDiagnostics, {
    marker: "DESIGNIT_RENDERPLAN_V2_COMPARE_WRAPPER_17N_FIX2",
    compareContract: "compare-view-17n-fix2",
    invalidRectsBlocked: 0,
    invalidRectSamples: [],
    referenceScreenshot: null,
    validation: null
  });

  const referenceAsset = d17nFix2MakeReferenceAsset(payload, basePlan, targetWidth, targetHeight, diagnostics);

  const assets = Array.isArray(basePlan.assets) ? basePlan.assets.slice() : [];

  if (referenceAsset) {
    const already = assets.some(asset => asset && asset.id === referenceAsset.id);
    if (!already) assets.unshift(referenceAsset);
  }

  const leftReference = {
    id: "v2_left_reference_screenshot",
    type: "frame",
    name: "01 Reference Screenshot",
    rect: { x: 0, y: 0, width: targetWidth, height: targetHeight },
    style: { background: "#ffffff" },
    locked: true,
    editable: false,
    children: referenceAsset ? [{
      id: "v2_reference_screenshot_image",
      type: "image",
      name: "Reference Screenshot Image",
      rect: { x: 0, y: 0, width: targetWidth, height: targetHeight },
      assetId: referenceAsset.id,
      sourceUrl: referenceAsset.sourceUrl || "",
      editable: false,
      locked: true
    }] : []
  };

  const editableChildren = [];

  if (baseRoot && Array.isArray(baseRoot.children)) {
    for (let i = 0; i < baseRoot.children.length; i++) {
      const child = d17nFix2CloneNode(baseRoot.children[i], 0, 0, diagnostics, "$.baseRoot.children[" + i + "]");
      if (child) editableChildren.push(child);
    }
  }

  const rightEditable = {
    id: "v2_right_editable_result",
    type: "frame",
    name: "02 Editable Result",
    rect: { x: targetWidth + gap, y: 0, width: targetWidth, height: targetHeight },
    style: { background: "#ffffff" },
    editable: true,
    children: editableChildren
  };

  const root = {
    id: "v2_compare_root",
    type: "frame",
    name: "DesignIT Compare Result",
    rect: {
      x: 0,
      y: 0,
      width: targetWidth * 2 + gap,
      height: targetHeight
    },
    style: { background: "#ffffff" },
    children: [
      leftReference,
      rightEditable
    ]
  };

  const counts = d17nFix2Count(root);
  const missingImageRefs = d17nFix2ValidateImageRefs(root, assets);

  const expectedImages = baseDiagnostics && baseDiagnostics.validation && baseDiagnostics.validation.adaptiveMinimums
    ? Number(baseDiagnostics.validation.adaptiveMinimums.expectedImages || 0)
    : Math.max(0, counts.image - 1);

  const reasons = [];

  if (!referenceAsset) reasons.push("reference screenshot asset missing");
  if (!diagnostics.referenceScreenshot || !diagnostics.referenceScreenshot.captured) reasons.push("reference screenshot not captured");
  if (root.children.length !== 2) reasons.push("root children not exactly 2");
  if (!leftReference.children.length) reasons.push("left reference image missing");
  if (!rightEditable.children.length) reasons.push("right editable children missing");
  if (counts.invalidRects > 0) reasons.push("invalid rects found");
  if (missingImageRefs.length > 0) reasons.push("image nodes referencing missing assets");
  if (counts.image < expectedImages + 1) reasons.push("image nodes below expected plus reference");
  if (counts.text < Math.min(10, Number(baseDiagnostics.textBoxes || counts.text || 0))) reasons.push("text nodes below expected");

  diagnostics.nodeCounts = counts;
  diagnostics.validation = {
    ok: reasons.length === 0,
    reasons,
    counts,
    missingImageRefs: missingImageRefs.slice(0, 30),
    adaptiveMinimums: {
      expectedImages,
      expectedReferenceImages: 1
    }
  };

  return {
    version: "render-plan-v2",
    contractVersion: "compare-view-17n-fix2",
    readyForFigma: reasons.length === 0,
    page: {
      width: targetWidth * 2 + gap,
      height: targetHeight,
      targetWidth,
      targetHeight,
      background: "#ffffff"
    },
    assets,
    compareView: {
      id: "v2_compare_contract",
      type: "compareView",
      name: "DesignIT Compare View",
      leftReference,
      rightEditable,
      gap,
      requirement: "leftReference is original screenshot, rightEditable is clean editable reconstruction"
    },
    root,
    diagnostics
  };
}

export async function buildRenderPlanV2(payload) {
  const basePlan = await buildRenderPlanV2Base17NFix2(payload);
  return d17nFix2WrapCompare(payload, basePlan);
}
/* END DESIGNIT_RENDERPLAN_V2_COMPARE_WRAPPER_17N_FIX2 */
