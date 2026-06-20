import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);
const VIEWPORT = { width: 1440, height: 1600 };
const MAX_NODES = 420;

let idleTimer = null;
let activeJobs = 0;
let server = null;
let browserPromise = null;

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
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

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

async function captureLayoutTree(page, targetUrl) {
  const treePackage = await page.evaluate((sourceUrl, maxNodes) => {
    const viewport = {
      width: window.innerWidth || 1440,
      height: window.innerHeight || 1600
    };
    const blocked = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'BR', 'IFRAME', 'VIDEO', 'AUDIO', 'CANVAS']);
    const textTags = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'STRONG', 'EM', 'SMALL', 'LABEL']);
    const sectionTags = new Set(['BODY', 'HEADER', 'NAV', 'MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'FOOTER', 'UL', 'OL', 'LI']);
    const mediaTags = new Set(['IMG', 'PICTURE', 'SVG']);
    let id = 0;

    function clean(value) {
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function px(value, fallback = 0) {
      const n = parseFloat(String(value || '').replace('px', ''));
      return Number.isFinite(n) ? n : fallback;
    }

    function rectOf(element) {
      if (element === document.body) {
        return {
          x: 0,
          y: 0,
          w: viewport.width,
          h: Math.max(viewport.height, document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0)
        };
      }
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      };
    }

    function isVisible(element, rect, computed) {
      if (element === document.body) return true;
      if (!rect || rect.w < 1 || rect.h < 1) return false;
      if (rect.x > viewport.width || rect.y > viewport.height) return false;
      if (rect.x + rect.w < 0 || rect.y + rect.h < 0) return false;
      if (computed.display === 'none' || computed.visibility === 'hidden') return false;
      if (Number(computed.opacity) === 0) return false;
      return true;
    }

    function ownText(element) {
      return clean(Array.from(element.childNodes || [])
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(' '));
    }

    function fullText(element) {
      return clean(element.innerText || element.textContent || element.getAttribute('aria-label') || element.getAttribute('alt') || element.getAttribute('title') || '');
    }

    function styleOf(computed) {
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
      const hasBackground = style.backgroundColor && style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasBackgroundImage = style.backgroundImage && style.backgroundImage !== 'none';
      const hasBorder = px(style.borderTopWidth) > 0 || px(style.borderRightWidth) > 0 || px(style.borderBottomWidth) > 0 || px(style.borderLeftWidth) > 0;
      const hasRadius = px(style.borderRadius) > 0;
      const hasShadow = style.boxShadow && style.boxShadow !== 'none';
      return hasBackground || hasBackgroundImage || hasBorder || hasRadius || hasShadow;
    }

    function domPath(element) {
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase();
        const idPart = current.id ? `#${current.id}` : '';
        const classPart = clean(current.className).split(' ').filter(Boolean).slice(0, 1).map((cls) => `.${cls}`).join('');
        parts.unshift(tag + idPart + classPart);
        current = current.parentElement;
      }
      return parts.join(' > ');
    }

    function roleOf(element, tag, style, text) {
      const role = clean(element.getAttribute('role')).toLowerCase();
      const className = clean(element.className).toLowerCase();
      if (tag === 'BODY') return 'root';
      if (tag === 'HEADER') return 'header';
      if (tag === 'NAV') return 'nav';
      if (tag === 'FOOTER') return 'footer';
      if (mediaTags.has(tag)) return 'image';
      if (tag === 'BUTTON' || role === 'button' || className.includes('button') || className.includes('btn') || className.includes('cta')) return 'button';
      if (tag === 'A' && text) return 'link';
      if (/^H[1-6]$/.test(tag)) return 'heading';
      if (tag === 'P') return 'paragraph';
      if (textTags.has(tag) && text) return 'text';
      if (sectionTags.has(tag)) return 'section';
      if (className.includes('card') || className.includes('project') || className.includes('portfolio') || className.includes('work')) return 'card';
      if (hasVisualStyle(style)) return 'box';
      return 'group';
    }

    function nameOf(element, tag, role, text) {
      const aria = clean(element.getAttribute('aria-label'));
      const alt = clean(element.getAttribute('alt'));
      const title = clean(element.getAttribute('title'));
      const cls = clean(element.className).split(' ').filter(Boolean).slice(0, 2).join('.');
      return clean(text || aria || alt || title || element.id || cls || role || tag.toLowerCase()).slice(0, 96) || 'Layer';
    }

    function makeTextChild(text, rect, style, path, tag = '#text') {
      if (!text || id > maxNodes) return null;
      return {
        id: `text-${id++}`,
        type: 'text',
        role: 'text',
        tag,
        name: clean(text).slice(0, 96),
        text: clean(text),
        rect,
        style,
        path,
        children: []
      };
    }

    function shouldTreatAsSingleText(element, tag, role, text, children) {
      if (!text) return false;
      if (role === 'heading' || role === 'paragraph') return true;
      if ((role === 'button' || role === 'link') && !element.querySelector('img,svg,picture')) return true;
      if (role === 'text' && children.length === 0) return true;
      return false;
    }

    function build(element, depth = 0) {
      if (!element || id > maxNodes || depth > 18) return null;
      const tag = element.tagName;
      if (!tag || blocked.has(tag)) return null;
      const computed = window.getComputedStyle(element);
      const rect = rectOf(element);
      if (!isVisible(element, rect, computed)) return null;

      const style = styleOf(computed);
      const own = ownText(element);
      const text = own || fullText(element);
      const role = roleOf(element, tag, style, text);
      const path = domPath(element);

      if (role === 'image') {
        const captureId = `ti-layout-image-${id}`;
        element.setAttribute('data-ti-layout-image-id', captureId);
        return {
          id: `node-${id++}`,
          type: 'image',
          role: 'image',
          tag: tag.toLowerCase(),
          name: nameOf(element, tag, role, text),
          text: clean(element.getAttribute('alt') || ''),
          rect,
          style,
          path,
          src: element.currentSrc || element.src || element.getAttribute('src') || '',
          captureId,
          children: []
        };
      }

      const rawChildren = [];
      Array.from(element.children || []).forEach((child) => {
        const built = build(child, depth + 1);
        if (built) rawChildren.push(built);
      });

      if (shouldTreatAsSingleText(element, tag, role, text, rawChildren)) {
        const textNode = makeTextChild(text, rect, style, path, tag.toLowerCase());
        if (role === 'button' || role === 'link') {
          return {
            id: `node-${id++}`,
            type: 'frame',
            role,
            tag: tag.toLowerCase(),
            name: nameOf(element, tag, role, text),
            text: '',
            rect,
            style,
            path,
            children: textNode ? [textNode] : []
          };
        }
        return textNode;
      }

      const area = rect.w * rect.h;
      const viewportArea = viewport.width * viewport.height;
      const keepFrame = role === 'root' || rawChildren.length > 0 || (hasVisualStyle(style) && area < viewportArea * 0.8);
      if (!keepFrame) return null;

      if ((role === 'group' || role === 'box') && !hasVisualStyle(style) && rawChildren.length === 1 && tag !== 'BODY') return rawChildren[0];

      return {
        id: `node-${id++}`,
        type: 'frame',
        role,
        tag: tag.toLowerCase(),
        name: nameOf(element, tag, role, text),
        text: '',
        rect,
        style,
        path,
        children: rawChildren
      };
    }

    const tree = build(document.body) || {
      id: 'root-0',
      type: 'frame',
      role: 'root',
      tag: 'body',
      name: 'root',
      text: '',
      rect: { x: 0, y: 0, w: viewport.width, h: viewport.height },
      style: {},
      path: 'body',
      children: []
    };

    return {
      title: document.title || new URL(sourceUrl).hostname,
      viewport,
      tree,
      nodeCount: id,
      html: '<!doctype html>\n' + document.documentElement.outerHTML
    };
  }, targetUrl, MAX_NODES);

  async function attachImages(node) {
    if (!node) return;
    if (node.role === 'image' && node.captureId) {
      try {
        const handle = await page.$(`[data-ti-layout-image-id="${node.captureId}"]`);
        if (handle) {
          const image = await handle.screenshot({ type: 'png' });
          node.image = {
            contentType: 'image/png',
            base64: image.toString('base64'),
            bytes: image.length
          };
        }
      } catch (_) {}
    }
    for (const child of node.children || []) await attachImages(child);
  }

  await attachImages(treePackage.tree);
  return treePackage;
}

async function compileLayoutTree(sourceUrl) {
  const targetUrl = normalizeUrl(sourceUrl);
  if (!targetUrl) throw new Error('Missing url query parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1600);
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let total = 0;
        const step = 700;
        const max = Math.min(9000, Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0));
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          total += step;
          if (total >= max) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 70);
      });
    });
    await page.waitForTimeout(500);
    const result = await captureLayoutTree(page, targetUrl);
    return {
      ok: true,
      url: page.url() || targetUrl,
      title: result.title,
      mode: 'layout-tree-compiler-v3',
      capturedAt: new Date().toISOString(),
      viewport: result.viewport,
      tree: result.tree,
      html: result.html,
      source: {
        kind: 'rendered-layout-tree',
        nodeCount: result.nodeCount
      },
      warnings: [
        'Layout Tree Compiler uses rendered DOM hierarchy, computed CSS layout bounds, text nodes, and image assets.',
        'It does not use a full-page screenshot as the main output.',
        'Complex pseudo-elements, canvas, video, iframes, and advanced CSS effects may still need manual cleanup.'
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
    json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: 'layout-tree-compiler-v3', port: PORT });
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
    const result = await compileLayoutTree(requestUrl.searchParams.get('url'));
    json(res, 200, result);
  } catch (error) {
    json(res, 500, { ok: false, error: error && error.message ? error.message : String(error) });
  } finally {
    activeJobs -= 1;
    resetIdleTimer();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Layout Tree Compiler V3 running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
