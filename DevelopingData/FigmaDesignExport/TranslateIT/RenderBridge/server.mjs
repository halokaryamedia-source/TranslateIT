import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);
const VIEWPORT = { width: 1440, height: 1600 };
const MAX_LAYERS = 900;
const MODE = 'universal-page-adapter-v9';

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
    if (activeJobs > 0) return resetIdleTimer();
    try { if (browserPromise) await (await browserPromise).close(); } catch (_) {}
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

function union(rects) {
  const safe = rects.filter(Boolean).filter((r) => r.w > 0 && r.h > 0);
  if (!safe.length) return { x: 0, y: 0, w: 1, h: 1 };
  const x = Math.min(...safe.map((r) => r.x));
  const y = Math.min(...safe.map((r) => r.y));
  const right = Math.max(...safe.map((r) => r.x + r.w));
  const bottom = Math.max(...safe.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

function expand(rect, pad) {
  return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

function overlaps(a, b) {
  return a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function componentName(members, index) {
  const hasImage = members.some((l) => l.type === 'image');
  const hasText = members.some((l) => l.type === 'text');
  const hasButton = members.some((l) => l.role === 'button-bg' || l.role === 'button-label');
  const hasLink = members.some((l) => l.role === 'link');
  if (hasImage && hasText) return `Image Card ${String(index + 1).padStart(2, '0')}`;
  if (hasButton) return `CTA / Button Group ${String(index + 1).padStart(2, '0')}`;
  if (hasLink) return `Navigation Group ${String(index + 1).padStart(2, '0')}`;
  if (hasImage) return `Media Asset ${String(index + 1).padStart(2, '0')}`;
  if (hasText) return `Text Block ${String(index + 1).padStart(2, '0')}`;
  return `Component ${String(index + 1).padStart(2, '0')}`;
}

function buildComponents(section) {
  const layers = section.layers || [];
  const used = new Set();
  const components = [];
  const candidates = layers
    .filter((l) => l.type === 'image' || l.role === 'button-bg' || l.role === 'button-label' || l.role === 'link')
    .sort((a, b) => (b.rect.w * b.rect.h) - (a.rect.w * a.rect.h));

  candidates.forEach((candidate) => {
    if (used.has(candidate.id)) return;
    const zone = expand(candidate.rect, candidate.type === 'image' ? 72 : 42);
    const members = layers.filter((layer) => !used.has(layer.id) && overlaps(zone, layer.rect));
    if (members.length < 1) return;
    members.forEach((layer) => used.add(layer.id));
    components.push({
      id: `component-${components.length + 1}`,
      role: 'component',
      name: componentName(members, components.length),
      rect: expand(union(members.map((l) => l.rect)), 8),
      layers: members.sort((a, b) => a.order - b.order)
    });
  });

  section.components = components;
  section.looseLayers = layers.filter((layer) => !used.has(layer.id));
  return section;
}

function clusterSections(layers, viewport, pageHeight) {
  const important = layers
    .filter((l) => l.type !== 'box' || l.role === 'button-bg' || l.role === 'navigation' || l.role === 'section' || l.role === 'footer')
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const sections = [];

  for (const layer of important) {
    let current = sections[sections.length - 1];
    const currentBottom = current ? current.rect.y + current.rect.h : 0;
    const gap = current ? layer.rect.y - currentBottom : 9999;
    if (!current || gap > 150 || layer.role === 'section' || layer.role === 'footer') {
      current = { id: `section-${sections.length + 1}`, role: layer.role === 'footer' ? 'footer' : layer.role === 'navigation' && !sections.length ? 'header' : 'section', layers: [] };
      sections.push(current);
    }
    current.layers.push(layer);
    current.rect = union(current.layers.map((item) => item.rect));
  }

  sections.forEach((section, index) => {
    section.layers = layers.filter((layer) => {
      const mid = layer.rect.y + layer.rect.h / 2;
      return mid >= section.rect.y - 48 && mid <= section.rect.y + section.rect.h + 48;
    });
    section.rect = expand(union(section.layers.map((item) => item.rect)), 32);
    section.rect.x = Math.max(0, section.rect.x);
    section.rect.y = Math.max(0, section.rect.y);
    section.rect.w = Math.min(viewport.width, Math.max(section.rect.w, viewport.width * 0.25));
    if (index === 0 && section.rect.y < 220) section.role = 'header';
    if (index === sections.length - 1 && section.rect.y > pageHeight * 0.55) section.role = 'footer';
    section.name = section.role === 'header' ? 'Header' : section.role === 'footer' ? 'Footer' : `Section ${String(index + 1).padStart(2, '0')}`;
    buildComponents(section);
  });

  return sections.length ? sections : [buildComponents({
    id: 'section-1',
    role: 'section',
    name: 'Section 01',
    rect: { x: 0, y: 0, w: viewport.width, h: pageHeight || viewport.height },
    layers
  })];
}

async function extractPage(page) {
  const payload = await page.evaluate(({ maxLayers }) => {
    const viewport = { width: window.innerWidth || 1440, height: window.innerHeight || 1600 };
    const pageHeight = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, viewport.height);
    const blocked = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'BR', 'IFRAME', 'VIDEO', 'AUDIO', 'CANVAS']);
    const layers = [];
    let id = 1;

    function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
    function px(value, fallback = 0) { const n = parseFloat(String(value || '').replace('px', '')); return Number.isFinite(n) ? n : fallback; }
    function rectFromDOM(rect) { return { x: Math.round(rect.left + window.scrollX), y: Math.round(rect.top + window.scrollY), w: Math.round(rect.width), h: Math.round(rect.height) }; }
    function usable(rect) { return rect && rect.w >= 2 && rect.h >= 2 && rect.x < viewport.width && rect.x + rect.w > 0 && rect.y < pageHeight + viewport.height * 0.2 && rect.y + rect.h > 0; }
    function visible(style) { return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0; }
    function hasFill(style) { return style.backgroundColor && style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)'; }
    function hasBorder(style) { return px(style.borderTopWidth) > 0 || px(style.borderRightWidth) > 0 || px(style.borderBottomWidth) > 0 || px(style.borderLeftWidth) > 0; }
    function hasBgImage(style) { return style.backgroundImage && style.backgroundImage !== 'none' && /^url\(/.test(style.backgroundImage); }
    function styleOf(style) {
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderTopColor: style.borderTopColor,
        borderRightColor: style.borderRightColor,
        borderBottomColor: style.borderBottomColor,
        borderLeftColor: style.borderLeftColor,
        borderTopWidth: style.borderTopWidth,
        borderRightWidth: style.borderRightWidth,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
        textAlign: style.textAlign,
        objectFit: style.objectFit,
        opacity: style.opacity
      };
    }
    function pathOf(el) {
      const parts = [];
      let cur = el;
      while (cur && cur.nodeType === Node.ELEMENT_NODE && cur !== document.documentElement) {
        const tag = cur.tagName.toLowerCase();
        const cls = clean(cur.className).split(' ').filter(Boolean).slice(0, 1).map((x) => `.${x}`).join('');
        parts.unshift(tag + (cur.id ? `#${cur.id}` : '') + cls);
        cur = cur.parentElement;
      }
      return parts.join(' > ');
    }
    function roleOf(el) {
      const tag = el.tagName;
      const cls = clean(el.className).toLowerCase();
      const role = clean(el.getAttribute('role')).toLowerCase();
      if (tag === 'IMG' || tag === 'PICTURE' || tag === 'SVG') return 'image';
      if (tag === 'BUTTON' || role === 'button' || cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return 'button';
      if (tag === 'NAV' || tag === 'HEADER') return 'navigation';
      if (tag === 'A') return cls.includes('button') || cls.includes('btn') || cls.includes('cta') ? 'button' : 'link';
      if (/^H[1-6]$/.test(tag)) return 'heading';
      if (tag === 'FOOTER') return 'footer';
      if (tag === 'SECTION' || tag === 'MAIN' || tag === 'ARTICLE') return 'section';
      return 'box';
    }
    function push(layer) {
      if (layers.length >= maxLayers) return;
      layer.id = layer.id || `layer-${id++}`;
      layer.order = layers.length;
      layers.push(layer);
    }
    function isTextCandidate(el, role, text, rect) {
      if (!text || text.length < 2) return false;
      if (!usable(rect)) return false;
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag) || tag === 'P' || tag === 'A' || tag === 'BUTTON' || tag === 'LI' || tag === 'LABEL') return true;
      const children = Array.from(el.children || []).filter((child) => visible(window.getComputedStyle(child)) && usable(rectFromDOM(child.getBoundingClientRect())));
      if (children.length === 0 && text.length <= 180) return true;
      if ((role === 'button' || role === 'link' || role === 'heading') && text.length <= 220) return true;
      return false;
    }

    Array.from(document.querySelectorAll('body *')).forEach((el) => {
      if (layers.length >= maxLayers || blocked.has(el.tagName)) return;
      const style = window.getComputedStyle(el);
      if (!visible(style)) return;
      const rect = rectFromDOM(el.getBoundingClientRect());
      if (!usable(rect)) return;
      const role = roleOf(el);
      const area = rect.w * rect.h;
      const viewportArea = viewport.width * viewport.height;

      if (role === 'image' || (hasBgImage(style) && clean(el.innerText).length < 3)) {
        const captureId = `ti-img-${id}`;
        el.setAttribute('data-ti-img-id', captureId);
        push({ type: 'image', role: role === 'image' ? 'image' : 'background-image', tag: el.tagName.toLowerCase(), name: clean(el.getAttribute('alt') || el.getAttribute('aria-label') || el.id || el.className || 'Image'), rect, style: styleOf(style), path: pathOf(el), captureId });
        return;
      }

      if ((hasFill(style) || hasBorder(style) || role === 'button' || role === 'navigation' || role === 'section' || role === 'footer') && area < viewportArea * 0.9) {
        push({ type: 'box', role: role === 'button' ? 'button-bg' : role, tag: el.tagName.toLowerCase(), name: clean(el.getAttribute('aria-label') || el.id || el.className || el.tagName), rect, style: styleOf(style), path: pathOf(el) });
      }

      const text = clean(el.innerText || el.textContent || '');
      if (isTextCandidate(el, role, text, rect)) {
        push({ type: 'text', role: role === 'link' ? 'link' : role === 'button' ? 'button-label' : role === 'heading' ? 'heading' : 'text', tag: el.tagName.toLowerCase(), name: text.slice(0, 96), text, rect, style: styleOf(style), path: pathOf(el) });
      }
    });

    const seen = new Set();
    const unique = [];
    layers.sort((a, b) => a.order - b.order).forEach((layer) => {
      const fingerprint = `${layer.type}|${layer.role}|${layer.text || layer.name}|${Math.round(layer.rect.x / 3)}|${Math.round(layer.rect.y / 3)}|${Math.round(layer.rect.w / 3)}|${Math.round(layer.rect.h / 3)}`;
      if (seen.has(fingerprint)) return;
      seen.add(fingerprint);
      unique.push(layer);
    });

    return { title: document.title || location.hostname, url: location.href, viewport, pageHeight, layers: unique };
  }, { maxLayers: MAX_LAYERS });

  for (const layer of payload.layers) {
    if (layer.type !== 'image' || !layer.captureId) continue;
    try {
      const handle = await page.$(`[data-ti-img-id="${layer.captureId}"]`);
      if (!handle) continue;
      const bytes = await handle.screenshot({ type: 'png' });
      layer.image = { contentType: 'image/png', base64: bytes.toString('base64'), bytes: bytes.length };
    } catch (_) {}
  }

  payload.sections = clusterSections(payload.layers, payload.viewport, payload.pageHeight);
  return payload;
}

async function compile(target) {
  const targetUrl = normalizeUrl(target);
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
        const max = Math.min(12000, Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0));
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
    await page.waitForTimeout(600);

    const extracted = await extractPage(page);
    const shot = await page.screenshot({ type: 'png', fullPage: true });
    const componentCount = extracted.sections.reduce((sum, section) => sum + ((section.components || []).length), 0);

    return {
      ok: true,
      mode: MODE,
      adapter: 'universal-page-clean-useful-output',
      capturedAt: new Date().toISOString(),
      title: extracted.title,
      url: extracted.url,
      viewport: extracted.viewport,
      pageHeight: extracted.pageHeight,
      screenshot: { contentType: 'image/png', base64: shot.toString('base64'), width: extracted.viewport.width, height: extracted.pageHeight },
      layers: extracted.layers,
      sections: extracted.sections,
      diagnostics: {
        layerCount: extracted.layers.length,
        sectionCount: extracted.sections.length,
        componentCount,
        imageCount: extracted.layers.filter((x) => x.type === 'image').length,
        textCount: extracted.layers.filter((x) => x.type === 'text').length
      },
      outputRules: [
        '01 Screenshot Preview must stay pure: one screenshot rectangle only.',
        '02 UI Components must be clean library components, not raw browser coordinates.',
        '03 Editable Result must be a clean structured draft, not a raw reconstruction dump.',
        '04 Audit summarizes usefulness and remaining gaps.'
      ],
      warnings: [
        'V9 clean useful output prioritizes usable components and editable drafts over chaotic raw coordinate reconstruction.',
        'Screenshot-only visual fidelity is not considered enough for a pass.'
      ]
    };
  } finally {
    await page.close();
  }
}

server = http.createServer(async (req, res) => {
  resetIdleTimer();
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' });
    res.end();
    return;
  }
  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (requestUrl.pathname === '/health') return json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: MODE, port: PORT });
  if (requestUrl.pathname === '/shutdown') {
    json(res, 200, { ok: true, message: 'Render Bridge shutting down.' });
    setTimeout(async () => {
      try { if (browserPromise) await (await browserPromise).close(); } catch (_) {}
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    }, 200);
    return;
  }
  if (requestUrl.pathname !== '/render') return json(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });
  activeJobs += 1;
  try {
    json(res, 200, await compile(requestUrl.searchParams.get('url')));
  } catch (error) {
    json(res, 500, { ok: false, error: error && error.stack ? error.stack : error && error.message ? error.message : String(error) });
  } finally {
    activeJobs -= 1;
    resetIdleTimer();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Universal Page Adapter V9 running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
