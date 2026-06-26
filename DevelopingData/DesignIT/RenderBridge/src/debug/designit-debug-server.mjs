import express from "express";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DESIGNIT_ROOT = path.resolve(__dirname, "../../..");
const REPORTS_ROOT = path.join(DESIGNIT_ROOT, "_debug", "reports");
const LATEST_DIR = path.join(REPORTS_ROOT, "latest");
const PORT = Number(process.env.DESIGNIT_DEBUG_PORT || 8855);

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
    "-",
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds())
  ].join("");
}

function safeSlug(input) {
  return String(input || "site")
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9.-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "site";
}

function cleanUrl(input) {
  const value = String(input || "").trim();
  if (!value) throw new Error("Missing ?url=");
  const u = new URL(value);
  if (!["http:", "https:"].includes(u.protocol)) {
    throw new Error("Only http/https URLs are allowed.");
  }
  return u.href;
}

function area(rect) {
  if (!rect) return 0;
  return Math.max(0, Number(rect.width || 0)) * Math.max(0, Number(rect.height || 0));
}

function overlapArea(a, b) {
  if (!a || !b) return 0;
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function ensureFreshLatest() {
  await fs.mkdir(REPORTS_ROOT, { recursive: true });
  await fs.rm(LATEST_DIR, { recursive: true, force: true });
  await fs.mkdir(LATEST_DIR, { recursive: true });
}

async function captureDomSnapshot(page) {
  const styles = [
    "display",
    "position",
    "z-index",
    "opacity",
    "visibility",
    "overflow",
    "background-color",
    "background-image",
    "background-size",
    "background-position",
    "background-repeat",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "text-align",
    "border-radius",
    "box-shadow",
    "object-fit"
  ];

  try {
    const session = await page.context().newCDPSession(page);
    return await session.send("DOMSnapshot.captureSnapshot", {
      computedStyles: styles,
      includeDOMRects: true,
      includePaintOrder: true
    });
  } catch (error) {
    return {
      error: String(error?.message || error),
      note: "DOMSnapshot failed. Playwright evaluate extraction still available."
    };
  }
}

async function extractSourceTruth(page) {
  return await page.evaluate(() => {
    const MAX_ELEMENTS = 5000;

    function rectOf(el) {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom)
      };
    }

    function isVisibleRect(rect) {
      return rect && rect.width > 1 && rect.height > 1 && rect.bottom >= 0 && rect.right >= 0;
    }

    function cssPath(el) {
      if (!el || el.nodeType !== 1) return "";
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && node !== document.documentElement) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          part += "#" + CSS.escape(node.id);
          parts.unshift(part);
          break;
        }

        const cls = Array.from(node.classList || []).slice(0, 3);
        if (cls.length) part += "." + cls.map((x) => CSS.escape(x)).join(".");

        const parent = node.parentElement;
        if (parent) {
          const sameTag = Array.from(parent.children).filter((x) => x.tagName === node.tagName);
          if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
        }

        parts.unshift(part);
        node = parent;
      }
      return parts.join(" > ");
    }

    function textClean(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function absoluteUrl(value) {
      try {
        if (!value) return "";
        return new URL(value, location.href).href;
      } catch {
        return String(value || "");
      }
    }

    function parseCssUrls(value) {
      const result = [];
      const text = String(value || "");
      const rx = /url\((['"]?)(.*?)\1\)/gi;
      let m;
      while ((m = rx.exec(text))) {
        if (m[2]) result.push(absoluteUrl(m[2]));
      }
      return result;
    }

    const all = Array.from(document.querySelectorAll("*")).slice(0, MAX_ELEMENTS);

    const rawMedia = [];
    const backgroundMedia = [];
    const textBoxes = [];
    const controls = [];
    const landmarks = [];

    for (const el of all) {
      const tag = el.tagName.toLowerCase();
      const style = getComputedStyle(el);
      const rect = rectOf(el);

      if (!isVisibleRect(rect)) continue;
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) <= 0.01) continue;

      const role = el.getAttribute("role") || "";
      const aria = el.getAttribute("aria-label") || "";
      const title = el.getAttribute("title") || "";
      const alt = el.getAttribute("alt") || "";
      const href = el.getAttribute("href") || "";
      const selector = cssPath(el);

      if (["header", "main", "footer", "nav", "section", "article", "aside"].includes(tag) || role) {
        landmarks.push({
          tag,
          role,
          aria,
          selector,
          rect
        });
      }

      if (tag === "img") {
        rawMedia.push({
          kind: "img",
          selector,
          tag,
          rect,
          currentSrc: el.currentSrc || "",
          src: absoluteUrl(el.getAttribute("src") || ""),
          srcset: el.getAttribute("srcset") || "",
          alt,
          objectFit: style.objectFit,
          loading: el.getAttribute("loading") || "",
          naturalWidth: el.naturalWidth || 0,
          naturalHeight: el.naturalHeight || 0
        });
      }

      if (tag === "source") {
        rawMedia.push({
          kind: "source",
          selector,
          tag,
          rect,
          src: absoluteUrl(el.getAttribute("src") || ""),
          srcset: el.getAttribute("srcset") || "",
          media: el.getAttribute("media") || "",
          type: el.getAttribute("type") || ""
        });
      }

      if (tag === "video") {
        rawMedia.push({
          kind: "video",
          selector,
          tag,
          rect,
          src: absoluteUrl(el.currentSrc || el.getAttribute("src") || ""),
          poster: absoluteUrl(el.getAttribute("poster") || ""),
          controls: el.hasAttribute("controls")
        });
      }

      if (tag === "svg") {
        rawMedia.push({
          kind: "svg-inline",
          selector,
          tag,
          rect,
          aria,
          title,
          text: textClean(el.textContent).slice(0, 200)
        });
      }

      if (tag === "canvas") {
        rawMedia.push({
          kind: "canvas",
          selector,
          tag,
          rect,
          aria,
          title
        });
      }

      if (style.backgroundImage && style.backgroundImage !== "none") {
        const urls = parseCssUrls(style.backgroundImage);
        backgroundMedia.push({
          kind: "css-background",
          selector,
          tag,
          rect,
          urls,
          backgroundImage: style.backgroundImage,
          backgroundSize: style.backgroundSize,
          backgroundPosition: style.backgroundPosition,
          backgroundRepeat: style.backgroundRepeat
        });
      }

      const directText = textClean(Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join(" "));

      const fullText = textClean(el.textContent);

      const isTextTag = /^(h1|h2|h3|h4|h5|h6|p|span|strong|em|small|label|li|blockquote)$/i.test(tag);
      const looksLikeText = directText.length > 0 && directText.length <= 300;
      const isButtonLike = tag === "button" || role === "button" || tag === "a";

      if ((isTextTag || looksLikeText) && directText) {
        textBoxes.push({
          tag,
          selector,
          rect,
          text: directText,
          fullText: fullText.slice(0, 500),
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          color: style.color,
          textAlign: style.textAlign
        });
      }

      const controlText = textClean(el.innerText || el.textContent).slice(0, 120);
      const isArrow = /next|prev|previous|arrow|slide|carousel|→|←|›|‹|»|«/i.test(`${aria} ${title} ${controlText}`);
      if (isButtonLike || isArrow) {
        controls.push({
          tag,
          role,
          aria,
          title,
          href: absoluteUrl(href),
          selector,
          rect,
          text: controlText,
          isArrow
        });
      }
    }

    const cssAssets = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const href = sheet.href || "inline";
        for (const rule of Array.from(sheet.cssRules || [])) {
          const txt = rule.cssText || "";
          const urls = parseCssUrls(txt);
          if (urls.length) {
            cssAssets.push({
              href,
              selectorText: rule.selectorText || "",
              urls,
              cssText: txt.slice(0, 1000)
            });
          }
        }
      } catch {
        cssAssets.push({
          href: sheet.href || "unknown",
          error: "stylesheet not readable, likely CORS"
        });
      }
    }

    return {
      url: location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      },
      counts: {
        rawMedia: rawMedia.length,
        backgroundMedia: backgroundMedia.length,
        textBoxes: textBoxes.length,
        controls: controls.length,
        landmarks: landmarks.length,
        cssAssets: cssAssets.length
      },
      rawMedia,
      backgroundMedia,
      textBoxes,
      controls,
      landmarks,
      cssAssets
    };
  });
}

function validateContract(sourceTruth) {
  const issues = [];
  const warnings = [];

  const rawMedia = Array.isArray(sourceTruth.rawMedia) ? sourceTruth.rawMedia : [];
  const backgroundMedia = Array.isArray(sourceTruth.backgroundMedia) ? sourceTruth.backgroundMedia : [];
  const textBoxes = Array.isArray(sourceTruth.textBoxes) ? sourceTruth.textBoxes : [];
  const controls = Array.isArray(sourceTruth.controls) ? sourceTruth.controls : [];

  if (rawMedia.length + backgroundMedia.length === 0) {
    issues.push({
      level: "error",
      rule: "NO_RAW_MEDIA",
      message: "No raw media sources were found from DOM/CSS. Engine must not invent screenshot-crop image layers."
    });
  }

  if (textBoxes.length === 0) {
    issues.push({
      level: "error",
      rule: "NO_TEXT_BOXES",
      message: "No text boxes were found. Editable text extraction is not working."
    });
  }

  for (const media of [...rawMedia, ...backgroundMedia]) {
    const urls = [];
    if (media.currentSrc) urls.push(media.currentSrc);
    if (media.src) urls.push(media.src);
    if (media.poster) urls.push(media.poster);
    if (Array.isArray(media.urls)) urls.push(...media.urls);

    for (const u of urls) {
      if (/screenshot|backplate|crop|slice|data:image/i.test(String(u))) {
        issues.push({
          level: "error",
          rule: "FORBIDDEN_BAKED_MEDIA_SOURCE",
          message: "Media candidate points to a screenshot/backplate/crop/data image source.",
          selector: media.selector,
          url: u
        });
      }
    }

    for (const t of textBoxes) {
      const oa = overlapArea(media.rect, t.rect);
      const ta = area(t.rect);
      if (ta > 0 && oa / ta > 0.65) {
        warnings.push({
          level: "warning",
          rule: "MEDIA_OVERLAPS_TEXT",
          message: "A media/background box strongly overlaps a text box. This may be valid overlay UI, but it must not become baked text inside an image layer.",
          mediaSelector: media.selector,
          textSelector: t.selector,
          text: t.text,
          overlapRatio: Number((oa / ta).toFixed(3))
        });
      }
    }

    for (const c of controls) {
      const oa = overlapArea(media.rect, c.rect);
      const ca = area(c.rect);
      if (ca > 0 && oa / ca > 0.65) {
        warnings.push({
          level: "warning",
          rule: "MEDIA_OVERLAPS_CONTROL",
          message: "A media/background box strongly overlaps a button/control. Control must remain separate from the image layer.",
          mediaSelector: media.selector,
          controlSelector: c.selector,
          controlText: c.text || c.aria || c.title,
          overlapRatio: Number((oa / ca).toFixed(3))
        });
      }
    }
  }

  const arrowControls = controls.filter((c) => c.isArrow);
  if (arrowControls.length > 0) {
    warnings.push({
      level: "info",
      rule: "ARROW_CONTROLS_FOUND",
      message: "Arrow/carousel controls detected. These should be separate UI/vector/text layers, not part of media crops.",
      count: arrowControls.length
    });
  }

  return {
    ok: issues.length === 0,
    counts: {
      errors: issues.length,
      warnings: warnings.length,
      rawMedia: rawMedia.length,
      backgroundMedia: backgroundMedia.length,
      textBoxes: textBoxes.length,
      controls: controls.length
    },
    issues,
    warnings
  };
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeDebugHtml(meta, sourceTruth, contract, reportName) {
  const mediaRows = [...sourceTruth.rawMedia, ...sourceTruth.backgroundMedia].slice(0, 150).map((m, i) => {
    const src = m.currentSrc || m.src || m.poster || (Array.isArray(m.urls) ? m.urls.join(", ") : "");
    return `<tr>
      <td>${i + 1}</td>
      <td>${htmlEscape(m.kind)}</td>
      <td>${htmlEscape(m.tag)}</td>
      <td>${htmlEscape(`${m.rect?.x},${m.rect?.y} ${m.rect?.width}x${m.rect?.height}`)}</td>
      <td>${htmlEscape(src).slice(0, 300)}</td>
      <td><code>${htmlEscape(m.selector).slice(0, 240)}</code></td>
    </tr>`;
  }).join("");

  const textRows = sourceTruth.textBoxes.slice(0, 150).map((t, i) => {
    return `<tr>
      <td>${i + 1}</td>
      <td>${htmlEscape(t.tag)}</td>
      <td>${htmlEscape(`${t.rect?.x},${t.rect?.y} ${t.rect?.width}x${t.rect?.height}`)}</td>
      <td>${htmlEscape(t.text).slice(0, 250)}</td>
      <td><code>${htmlEscape(t.selector).slice(0, 240)}</code></td>
    </tr>`;
  }).join("");

  const controlRows = sourceTruth.controls.slice(0, 150).map((c, i) => {
    return `<tr>
      <td>${i + 1}</td>
      <td>${htmlEscape(c.tag)}</td>
      <td>${htmlEscape(c.role)}</td>
      <td>${htmlEscape(`${c.rect?.x},${c.rect?.y} ${c.rect?.width}x${c.rect?.height}`)}</td>
      <td>${htmlEscape(c.text || c.aria || c.title).slice(0, 250)}</td>
      <td>${c.isArrow ? "yes" : "no"}</td>
      <td><code>${htmlEscape(c.selector).slice(0, 240)}</code></td>
    </tr>`;
  }).join("");

  const warningRows = [...contract.issues, ...contract.warnings].slice(0, 300).map((w, i) => {
    return `<tr>
      <td>${i + 1}</td>
      <td>${htmlEscape(w.level)}</td>
      <td>${htmlEscape(w.rule)}</td>
      <td>${htmlEscape(w.message)}</td>
      <td><code>${htmlEscape(w.text || w.controlText || w.selector || w.mediaSelector || "").slice(0, 220)}</code></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>DesignIT Debug Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; margin: 24px; background: #f6f7f9; color: #111; }
    h1, h2 { margin: 0 0 12px; }
    section { background: white; border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .card { background: #f1f3f5; padding: 12px; border-radius: 10px; }
    .ok { color: #0a7a2f; font-weight: 700; }
    .bad { color: #b00020; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e5e5e5; text-align: left; vertical-align: top; padding: 8px; }
    code { white-space: pre-wrap; word-break: break-word; }
    img { max-width: 100%; border: 1px solid #ddd; border-radius: 8px; background: #fff; }
    a { color: #0645ad; }
  </style>
</head>
<body>
  <h1>DesignIT Debug Report</h1>
  <p><strong>URL:</strong> ${htmlEscape(meta.url)}</p>
  <p><strong>Report:</strong> ${htmlEscape(reportName)}</p>
  <p><strong>Status:</strong> <span class="${contract.ok ? "ok" : "bad"}">${contract.ok ? "PASS" : "FAIL"}</span></p>

  <section>
    <h2>Summary</h2>
    <div class="grid">
      <div class="card"><strong>Raw Media</strong><br>${contract.counts.rawMedia}</div>
      <div class="card"><strong>Background Media</strong><br>${contract.counts.backgroundMedia}</div>
      <div class="card"><strong>Text Boxes</strong><br>${contract.counts.textBoxes}</div>
      <div class="card"><strong>Controls</strong><br>${contract.counts.controls}</div>
    </div>
  </section>

  <section>
    <h2>Raw Screenshot</h2>
    <p><a href="./raw-screenshot.png" target="_blank">Open raw screenshot</a></p>
    <img src="./raw-screenshot.png" alt="Raw screenshot">
  </section>

  <section>
    <h2>Contract Issues / Warnings</h2>
    <table>
      <thead><tr><th>#</th><th>Level</th><th>Rule</th><th>Message</th><th>Detail</th></tr></thead>
      <tbody>${warningRows || "<tr><td colspan='5'>No issues.</td></tr>"}</tbody>
    </table>
  </section>

  <section>
    <h2>Raw Media Candidates</h2>
    <p>Source of truth for image/media layers. Screenshot crops/backplates are forbidden here.</p>
    <table>
      <thead><tr><th>#</th><th>Kind</th><th>Tag</th><th>Rect</th><th>Source</th><th>Selector</th></tr></thead>
      <tbody>${mediaRows || "<tr><td colspan='6'>No media found.</td></tr>"}</tbody>
    </table>
  </section>

  <section>
    <h2>Text Boxes</h2>
    <table>
      <thead><tr><th>#</th><th>Tag</th><th>Rect</th><th>Text</th><th>Selector</th></tr></thead>
      <tbody>${textRows || "<tr><td colspan='5'>No text found.</td></tr>"}</tbody>
    </table>
  </section>

  <section>
    <h2>Controls / Buttons / Arrows</h2>
    <table>
      <thead><tr><th>#</th><th>Tag</th><th>Role</th><th>Rect</th><th>Text/Label</th><th>Arrow?</th><th>Selector</th></tr></thead>
      <tbody>${controlRows || "<tr><td colspan='7'>No controls found.</td></tr>"}</tbody>
    </table>
  </section>

  <section>
    <h2>JSON Files</h2>
    <ul>
      <li><a href="./capture-meta.json" target="_blank">capture-meta.json</a></li>
      <li><a href="./source-truth.json" target="_blank">source-truth.json</a></li>
      <li><a href="./raw-media.json" target="_blank">raw-media.json</a></li>
      <li><a href="./text-boxes.json" target="_blank">text-boxes.json</a></li>
      <li><a href="./ui-controls.json" target="_blank">ui-controls.json</a></li>
      <li><a href="./dom-snapshot.json" target="_blank">dom-snapshot.json</a></li>
      <li><a href="./contract-report.json" target="_blank">contract-report.json</a></li>
    </ul>
  </section>
</body>
</html>`;
}

async function captureWebsiteDebug(targetUrl, options = {}) {
  const url = cleanUrl(targetUrl);
  const width = Number(options.width || 1366);
  const height = Number(options.height || 768);
  const fullPage = String(options.fullPage ?? "1") !== "0";

  await ensureFreshLatest();

  const reportName = `${nowStamp()}-${safeSlug(url)}`;
  const reportDir = path.join(REPORTS_ROOT, reportName);
  await fs.mkdir(reportDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  let page;

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true
    });

    page = await context.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    try {
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch {}

    await page.screenshot({
      path: path.join(reportDir, "raw-screenshot.png"),
      fullPage
    });

    const domSnapshot = await captureDomSnapshot(page);
    const sourceTruth = await extractSourceTruth(page);
    const contract = validateContract(sourceTruth);

    const meta = {
      generatedAt: new Date().toISOString(),
      url,
      title: sourceTruth.title,
      viewport: sourceTruth.viewport,
      reportName,
      reportDir,
      latestDir: LATEST_DIR,
      fullPage
    };

    await writeJson(path.join(reportDir, "capture-meta.json"), meta);
    await writeJson(path.join(reportDir, "dom-snapshot.json"), domSnapshot);
    await writeJson(path.join(reportDir, "source-truth.json"), sourceTruth);
    await writeJson(path.join(reportDir, "raw-media.json"), {
      rawMedia: sourceTruth.rawMedia,
      backgroundMedia: sourceTruth.backgroundMedia,
      cssAssets: sourceTruth.cssAssets
    });
    await writeJson(path.join(reportDir, "text-boxes.json"), sourceTruth.textBoxes);
    await writeJson(path.join(reportDir, "ui-controls.json"), sourceTruth.controls);
    await writeJson(path.join(reportDir, "contract-report.json"), contract);

    const html = makeDebugHtml(meta, sourceTruth, contract, reportName);
    await fs.writeFile(path.join(reportDir, "index.html"), html, "utf8");

    await fs.cp(reportDir, LATEST_DIR, { recursive: true });

    return {
      ok: true,
      url,
      reportName,
      reportDir,
      latestDir: LATEST_DIR,
      contract,
      counts: sourceTruth.counts
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const app = express();

  app.use("/reports", express.static(REPORTS_ROOT, {
    extensions: ["html"]
  }));

  app.get("/health", (req, res) => {
    res.json({
      ok: true,
      service: "DesignIT Debug Companion",
      port: PORT,
      reportsRoot: REPORTS_ROOT
    });
  });

  app.get("/", (req, res) => {
    res.type("html").send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>DesignIT Debug Companion</title></head>
<body style="font-family:Arial;margin:32px">
  <h1>DesignIT Debug Companion</h1>
  <p>Use:</p>
  <pre>http://127.0.0.1:${PORT}/designit-debug?url=https://www.mivubi.com/portfolio</pre>
</body>
</html>`);
  });

  app.get("/designit-debug", async (req, res) => {
    try {
      const result = await captureWebsiteDebug(req.query.url, {
        width: req.query.width,
        height: req.query.height,
        fullPage: req.query.full
      });

      res.redirect(`/reports/${encodeURIComponent(result.reportName)}/index.html`);
    } catch (error) {
      res.status(500).type("html").send(`<pre>${htmlEscape(error?.stack || error?.message || error)}</pre>`);
    }
  });

  app.get("/designit-debug.json", async (req, res) => {
    try {
      const result = await captureWebsiteDebug(req.query.url, {
        width: req.query.width,
        height: req.query.height,
        fullPage: req.query.full
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: String(error?.message || error)
      });
    }
  });

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`DesignIT Debug Companion running at http://127.0.0.1:${PORT}`);
    console.log(`Example: http://127.0.0.1:${PORT}/designit-debug?url=https://www.mivubi.com/portfolio`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
