import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);

let browserPromise = null;
let idleTimer = null;
let activeJobs = 0;
let server = null;

function respondJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (activeJobs > 0) {
      resetIdleTimer();
      return;
    }

    try {
      if (browserPromise) {
        const browser = await browserPromise;
        await browser.close();
      }
    } catch (_) {}

    if (server) {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    }
  }, IDLE_EXIT_MS);
  idleTimer.unref();
}

async function captureInspectorData(page, targetUrl) {
  const data = await page.evaluate((sourceUrl) => {
    const viewport = {
      width: window.innerWidth || 1440,
      height: window.innerHeight || 1600
    };

    const blocked = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'BR']);
    const layers = [];
    let idCounter = 0;

    function clean(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function px(value, fallback = 0) {
      const number = parseFloat(String(value || '').replace('px', ''));
      return Number.isFinite(number) ? number : fallback;
    }

    function rectFromDomRect(rect) {
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      };
    }

    function rectOfElement(element) {
      return rectFromDomRect(element.getBoundingClientRect());
    }

    function isRectVisible(rect) {
      if (!rect || rect.w < 2 || rect.h < 2) return false;
      if (rect.x > viewport.width || rect.y > viewport.height) return false;
      if (rect.x + rect.w < 0 || rect.y + rect.h < 0) return false;
      return true;
    }

    function isElementVisible(element, rect, computed) {
      if (!isRectVisible(rect)) return false;
      if (computed.display === 'none') return false;
      if (computed.visibility === 'hidden') return false;
      if (Number(computed.opacity) === 0) return false;
      return true;
    }

    function styleFrom(element) {
      const c = window.getComputedStyle(element);
      return {
        display: c.display,
        position: c.position,
        flexDirection: c.flexDirection,
        alignItems: c.alignItems,
        justifyContent: c.justifyContent,
        gap: c.gap,
        paddingTop: c.paddingTop,
        paddingRight: c.paddingRight,
        paddingBottom: c.paddingBottom,
        paddingLeft: c.paddingLeft,
        backgroundColor: c.backgroundColor,
        backgroundImage: c.backgroundImage,
        color: c.color,
        borderColor: c.borderTopColor || c.borderColor,
        borderWidth: c.borderTopWidth || c.borderWidth,
        borderRadius: c.borderRadius,
        boxShadow: c.boxShadow,
        fontFamily: c.fontFamily,
        fontSize: c.fontSize,
        fontWeight: c.fontWeight,
        lineHeight: c.lineHeight,
        letterSpacing: c.letterSpacing,
        textAlign: c.textAlign,
        opacity: c.opacity
      };
    }

    function hasFillOrStroke(style) {
      const hasBackground = style.backgroundColor && style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasBorder = px(style.borderWidth) > 0;
      const hasRadius = px(style.borderRadius) > 0;
      const hasShadow = style.boxShadow && style.boxShadow !== 'none';
      return hasBackground || hasBorder || hasRadius || hasShadow;
    }

    function elementRole(element, tag, style, text) {
      const role = clean(element.getAttribute('role')).toLowerCase();
      const className = clean(element.className).toLowerCase();

      if (tag === 'IMG' || tag === 'PICTURE' || tag === 'SVG') return 'image';
      if (tag === 'BUTTON' || role === 'button' || className.includes('button') || className.includes('btn') || className.includes('cta')) return 'button';
      if (tag === 'A' && text) return 'link';
      if (/^H[1-6]$/.test(tag)) return 'heading';
      if (tag === 'NAV') return 'nav';
      if (['HEADER', 'FOOTER', 'MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'LI'].includes(tag)) return 'section';
      if (hasFillOrStroke(style)) return 'box';
      return 'group';
    }

    function layerName(element, tag, role, text) {
      const aria = clean(element.getAttribute('aria-label'));
      const alt = clean(element.getAttribute('alt'));
      const title = clean(element.getAttribute('title'));
      const id = clean(element.id);
      const className = clean(element.className).split(' ').filter(Boolean).slice(0, 2).join('.');
      return clean(text || aria || alt || title || id || className || role || tag).slice(0, 96) || 'Layer';
    }

    function domPath(element) {
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        const id = current.id ? `#${current.id}` : '';
        const cls = clean(current.className).split(' ').filter(Boolean).slice(0, 1).map((x) => `.${x}`).join('');
        parts.unshift(`${tag}${id}${cls}`);
        current = current.parentElement;
      }
      return parts.join(' > ');
    }

    function shouldIncludeElement(element, tag, role, rect, style, text) {
      if (tag === 'HTML' || tag === 'BODY') return false;
      if (!isRectVisible(rect)) return false;

      const area = rect.w * rect.h;
      const viewportArea = viewport.width * viewport.height;

      if (role === 'image') return rect.w >= 12 && rect.h >= 12;
      if (role === 'button' || role === 'link') return rect.w >= 8 && rect.h >= 8;
      if (role === 'heading') return !!text && rect.w >= 4 && rect.h >= 4;
      if (role === 'nav') return rect.w >= 80 && rect.h >= 16 && area < viewportArea * 0.25;
      if (role === 'section') return hasFillOrStroke(style) && area < viewportArea * 0.32 && rect.w >= 24 && rect.h >= 16;
      if (role === 'box') return hasFillOrStroke(style) && area < viewportArea * 0.28 && rect.w >= 8 && rect.h >= 8;
      return false;
    }

    function addElementLayer(element) {
      const tag = element.tagName;
      if (!tag || blocked.has(tag)) return;

      const computed = window.getComputedStyle(element);
      const rect = rectOfElement(element);
      if (!isElementVisible(element, rect, computed)) return;

      const style = styleFrom(element);
      const directText = clean(Array.from(element.childNodes || [])
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(' '));
      const text = directText || clean(element.getAttribute('aria-label')) || clean(element.getAttribute('alt')) || clean(element.getAttribute('placeholder'));
      const role = elementRole(element, tag, style, text);

      if (!shouldIncludeElement(element, tag, role, rect, style, text)) return;

      const layer = {
        id: `el-${idCounter++}`,
        kind: role === 'image' ? 'image' : role === 'button' || role === 'link' ? 'control' : 'box',
        role,
        tag: tag.toLowerCase(),
        name: layerName(element, tag.toLowerCase(), role, text),
        text,
        rect,
        style,
        path: domPath(element)
      };

      if (role === 'image') {
        layer.captureId = `ti-img-${idCounter}`;
        element.setAttribute('data-ti-capture-id', layer.captureId);
        layer.src = element.currentSrc || element.src || element.getAttribute('src') || '';
      }

      layers.push(layer);
    }

    function addTextLayers() {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const text = clean(node.textContent);
          if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent || blocked.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        const computed = window.getComputedStyle(parent);
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.from(range.getClientRects()).slice(0, 4);
        const text = clean(node.textContent);
        rects.forEach((domRect) => {
          const rect = rectFromDomRect(domRect);
          if (!isElementVisible(parent, rect, computed)) return;
          layers.push({
            id: `txt-${idCounter++}`,
            kind: 'text',
            role: /^H[1-6]$/.test(parent.tagName) ? 'heading' : 'text',
            tag: parent.tagName.toLowerCase(),
            name: text.slice(0, 96),
            text,
            rect,
            style: styleFrom(parent),
            path: domPath(parent)
          });
        });
      }
    }

    Array.from(document.querySelectorAll('body *')).forEach(addElementLayer);
    addTextLayers();

    const rank = { box: 0, image: 1, control: 2, text: 3 };
    layers.sort((a, b) => (rank[a.kind] - rank[b.kind]) || (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x));

    return {
      title: document.title || new URL(sourceUrl).hostname,
      viewport,
      layers: layers.slice(0, 320),
      html: '<!doctype html>\n' + document.documentElement.outerHTML
    };
  }, targetUrl);

  for (const layer of data.layers) {
    if (layer.kind !== 'image' || !layer.captureId) continue;
    try {
      const handle = await page.$(`[data-ti-capture-id="${layer.captureId}"]`);
      if (!handle) continue;
      const image = await handle.screenshot({ type: 'png' });
      layer.imageBase64 = image.toString('base64');
    } catch (_) {}
  }

  return data;
}

async function renderUrl(urlValue) {
  const targetUrl = normalizeUrl(urlValue);
  if (!targetUrl) throw new Error('Missing url query parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1600 },
    deviceScaleFactor: 1
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const inspector = await captureInspectorData(page, targetUrl);

    return {
      ok: true,
      url: targetUrl,
      title: inspector.title,
      viewport: inspector.viewport,
      layers: inspector.layers,
      html: inspector.html,
      mode: 'inspector-dom-v4',
      capturedAt: new Date().toISOString(),
      idleExitMs: IDLE_EXIT_MS,
      warnings: [
        'Inspector Mode uses DOM text, element boxes, computed CSS, and image assets.',
        'Pseudo-elements, canvas, video, WebGL, iframe content, and complex animations may need manual cleanup.'
      ]
    };
  } finally {
    await page.close();
  }
}

server = http.createServer(async (req, res) => {
  resetIdleTimer();

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (requestUrl.pathname === '/health') {
    respondJson(res, 200, { ok: true, service: 'translateit-render-bridge', mode: 'inspector-dom-v4', port: PORT });
    return;
  }

  if (requestUrl.pathname === '/shutdown') {
    respondJson(res, 200, { ok: true, message: 'Render Bridge shutting down.' });
    setTimeout(async () => {
      try {
        if (browserPromise) {
          const browser = await browserPromise;
          await browser.close();
        }
      } catch (_) {}
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    }, 200);
    return;
  }

  if (requestUrl.pathname !== '/render') {
    respondJson(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });
    return;
  }

  activeJobs += 1;
  try {
    const result = await renderUrl(requestUrl.searchParams.get('url'));
    respondJson(res, 200, result);
  } catch (error) {
    respondJson(res, 500, { ok: false, error: error && error.message ? error.message : String(error) });
  } finally {
    activeJobs -= 1;
    resetIdleTimer();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Render Bridge Inspector Mode running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
