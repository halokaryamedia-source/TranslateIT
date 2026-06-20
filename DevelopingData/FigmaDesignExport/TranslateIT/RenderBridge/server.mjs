import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);
const VIEWPORT = { width: 1440, height: 1600 };

let browserPromise = null;
let activeJobs = 0;
let idleTimer = null;
let server = null;

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
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

async function captureInspectorTree(page, targetUrl) {
  const treePackage = await page.evaluate((sourceUrl) => {
    const viewport = {
      width: window.innerWidth || 1440,
      height: window.innerHeight || 1600
    };

    const BLOCKED = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'BR', 'IFRAME', 'VIDEO', 'AUDIO', 'CANVAS']);
    const STRUCTURAL_TAGS = new Set(['BODY', 'HEADER', 'NAV', 'MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'FOOTER', 'UL', 'OL', 'LI']);
    const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'STRONG', 'EM', 'SMALL', 'LABEL']);
    const CONTROL_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']);
    const MEDIA_TAGS = new Set(['IMG', 'PICTURE', 'SVG']);

    let id = 0;

    function clean(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function px(value, fallback = 0) {
      const number = parseFloat(String(value || '').replace('px', ''));
      return Number.isFinite(number) ? number : fallback;
    }

    function rectOf(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      };
    }

    function directText(element) {
      return clean(Array.from(element.childNodes || [])
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(' '));
    }

    function visible(element, rect, computed) {
      if (!rect || rect.w < 1 || rect.h < 1) return false;
      if (rect.x > viewport.width || rect.y > viewport.height) return false;
      if (rect.x + rect.w < 0 || rect.y + rect.h < 0) return false;
      if (computed.display === 'none' || computed.visibility === 'hidden') return false;
      if (Number(computed.opacity) === 0) return false;
      return true;
    }

    function styleOf(element, computed) {
      return {
        display: computed.display,
        position: computed.position,
        flexDirection: computed.flexDirection,
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        gap: computed.gap,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        backgroundColor: computed.backgroundColor,
        backgroundImage: computed.backgroundImage,
        color: computed.color,
        borderTopColor: computed.borderTopColor,
        borderRightColor: computed.borderRightColor,
        borderBottomColor: computed.borderBottomColor,
        borderLeftColor: computed.borderLeftColor,
        borderTopWidth: computed.borderTopWidth,
        borderRightWidth: computed.borderRightWidth,
        borderBottomWidth: computed.borderBottomWidth,
        borderLeftWidth: computed.borderLeftWidth,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        opacity: computed.opacity,
        objectFit: computed.objectFit
      };
    }

    function hasVisualStyle(style) {
      const background = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
      const border = px(style.borderTopWidth) > 0 || px(style.borderRightWidth) > 0 || px(style.borderBottomWidth) > 0 || px(style.borderLeftWidth) > 0;
      const radius = px(style.borderRadius) > 0;
      const shadow = style.boxShadow && style.boxShadow !== 'none';
      const backgroundImage = style.backgroundImage && style.backgroundImage !== 'none';
      return background || border || radius || shadow || backgroundImage;
    }

    function roleOf(element, tag, style, text) {
      const role = clean(element.getAttribute('role')).toLowerCase();
      const className = clean(element.className).toLowerCase();
      if (MEDIA_TAGS.has(tag)) return 'image';
      if (tag === 'BUTTON' || role === 'button' || className.includes('button') || className.includes('btn') || className.includes('cta')) return 'button';
      if (tag === 'A' && text) return 'link';
      if (/^H[1-6]$/.test(tag)) return 'heading';
      if (TEXT_TAGS.has(tag) && text) return 'text';
      if (tag === 'NAV') return 'nav';
      if (STRUCTURAL_TAGS.has(tag)) return tag === 'BODY' ? 'root' : 'section';
      if (hasVisualStyle(style)) return 'box';
      return 'group';
    }

    function nameOf(element, tag, role, text) {
      const aria = clean(element.getAttribute('aria-label'));
      const alt = clean(element.getAttribute('alt'));
      const title = clean(element.getAttribute('title'));
      const idName = clean(element.id);
      const cls = clean(element.className).split(' ').filter(Boolean).slice(0, 2).join('.');
      return clean(text || aria || alt || title || idName || cls || role || tag).slice(0, 96) || 'Layer';
    }

    function domPath(element) {
      const path = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        const idName = current.id ? `#${current.id}` : '';
        const cls = clean(current.className).split(' ').filter(Boolean).slice(0, 1).map((item) => `.${item}`).join('');
        path.unshift(`${tag}${idName}${cls}`);
        current = current.parentElement;
      }
      return path.join(' > ');
    }

    function textNodeChildren(element, parentStyle) {
      const output = [];
      Array.from(element.childNodes || []).forEach((node) => {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const text = clean(node.textContent);
        if (!text || text.length < 2) return;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.from(range.getClientRects()).slice(0, 4);
        rects.forEach((domRect) => {
          const rect = {
            x: Math.round(domRect.left),
            y: Math.round(domRect.top),
            w: Math.round(domRect.width),
            h: Math.round(domRect.height)
          };
          if (rect.w < 1 || rect.h < 1) return;
          output.push({
            id: `text-${id++}`,
            type: 'text',
            role: 'text',
            tag: '#text',
            name: text.slice(0, 96),
            text,
            rect,
            style: parentStyle,
            path: '',
            children: []
          });
        });
      });
      return output;
    }

    function shouldKeepNode(node, element, computed) {
      const viewportArea = viewport.width * viewport.height;
      const area = node.rect.w * node.rect.h;
      const tag = element.tagName;

      if (node.role === 'root') return true;
      if (node.type === 'text') return !!node.text;
      if (node.role === 'image') return node.rect.w >= 8 && node.rect.h >= 8;
      if (node.role === 'button' || node.role === 'link') return node.rect.w >= 8 && node.rect.h >= 8;
      if (node.role === 'heading' || node.role === 'text') return !!node.text || node.children.length > 0;
      if (node.children.length > 0) return true;
      if (hasVisualStyle(node.style) && area < viewportArea * 0.55 && node.rect.w >= 4 && node.rect.h >= 4) return true;
      if (STRUCTURAL_TAGS.has(tag) && node.children.length > 0) return true;
      return false;
    }

    function flattenNoise(node) {
      if (!node) return null;
      if ((node.role === 'group' || node.role === 'box') && !hasVisualStyle(node.style) && !node.text && node.children.length === 1) {
        return node.children[0];
      }
      if ((node.role === 'group') && !node.text && node.children.length === 0) return null;
      return node;
    }

    function build(element, depth = 0) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null;
      const tag = element.tagName;
      if (BLOCKED.has(tag)) return null;

      const computed = window.getComputedStyle(element);
      const rect = rectOf(element);
      if (!visible(element, rect, computed)) return null;

      const style = styleOf(element, computed);
      const text = directText(element) || clean(element.getAttribute('aria-label')) || clean(element.getAttribute('alt')) || clean(element.getAttribute('placeholder'));
      const role = roleOf(element, tag, style, text);
      const type = role === 'image' ? 'image' : role === 'button' || role === 'link' ? 'control' : role === 'heading' || role === 'text' ? 'text-container' : 'frame';

      const node = {
        id: `node-${id++}`,
        type,
        role,
        tag: tag.toLowerCase(),
        name: nameOf(element, tag.toLowerCase(), role, text),
        text,
        rect,
        style,
        path: domPath(element),
        children: []
      };

      if (role === 'image') {
        node.captureId = `image-${id}`;
        element.setAttribute('data-ti-image-id', node.captureId);
        node.src = element.currentSrc || element.src || element.getAttribute('src') || '';
      }

      if (role === 'heading' || role === 'text' || role === 'button' || role === 'link') {
        node.children.push(...textNodeChildren(element, style));
      }

      Array.from(element.children || []).forEach((child) => {
        const childNode = build(child, depth + 1);
        if (childNode) node.children.push(childNode);
      });

      if ((role === 'button' || role === 'link') && node.children.length === 0 && text) {
        node.children.push({
          id: `text-${id++}`,
          type: 'text',
          role: 'text',
          tag: '#text',
          name: text.slice(0, 96),
          text,
          rect,
          style,
          path: node.path,
          children: []
        });
      }

      if (!shouldKeepNode(node, element, computed)) return null;
      return flattenNoise(node);
    }

    const root = build(document.body);
    return {
      title: document.title || new URL(sourceUrl).hostname,
      viewport,
      tree: root,
      html: '<!doctype html>\n' + document.documentElement.outerHTML
    };
  }, targetUrl);

  async function attachImages(node) {
    if (!node) return;
    if (node.role === 'image' && node.captureId) {
      try {
        const handle = await page.$(`[data-ti-image-id="${node.captureId}"]`);
        if (handle) {
          const image = await handle.screenshot({ type: 'png' });
          node.imageBase64 = image.toString('base64');
        }
      } catch (_) {}
    }

    for (const child of node.children || []) await attachImages(child);
  }

  await attachImages(treePackage.tree);
  return treePackage;
}

async function renderUrl(sourceUrl) {
  const targetUrl = normalizeUrl(sourceUrl);
  if (!targetUrl) throw new Error('Missing url query parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1400);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const inspector = await captureInspectorTree(page, targetUrl);
    return {
      ok: true,
      url: targetUrl,
      title: inspector.title,
      viewport: inspector.viewport,
      tree: inspector.tree,
      html: inspector.html,
      mode: 'inspector-dom-tree-v5',
      capturedAt: new Date().toISOString(),
      warnings: [
        'Inspector tree mode reads DOM hierarchy, computed CSS, text ranges, and image assets.',
        'Pseudo-elements, canvas, video, iframe contents, and complex animation states may still require manual cleanup.'
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
    json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: 'inspector-dom-tree-v5', port: PORT });
    return;
  }

  if (requestUrl.pathname === '/shutdown') {
    json(res, 200, { ok: true, message: 'Render Bridge shutting down.' });
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
    json(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });
    return;
  }

  activeJobs += 1;
  try {
    const result = await renderUrl(requestUrl.searchParams.get('url'));
    json(res, 200, result);
  } catch (error) {
    json(res, 500, { ok: false, error: error && error.message ? error.message : String(error) });
  } finally {
    activeJobs -= 1;
    resetIdleTimer();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Render Bridge Inspector Tree V5 running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
