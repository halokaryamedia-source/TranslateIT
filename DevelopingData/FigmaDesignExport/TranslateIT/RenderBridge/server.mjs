import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);
const VIEWPORT = { width: 1440, height: 1600 };
const MAX_ELEMENTS = 220;

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

function rectUnion(rects) {
  const safe = rects.filter(Boolean);
  if (!safe.length) return { x: 0, y: 0, w: 1, h: 1 };
  const left = Math.min(...safe.map((r) => r.x));
  const top = Math.min(...safe.map((r) => r.y));
  const right = Math.max(...safe.map((r) => r.x + r.w));
  const bottom = Math.max(...safe.map((r) => r.y + r.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function clusterRows(elements) {
  const sorted = elements.slice().sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const rows = [];
  for (const item of sorted) {
    const mid = item.rect.y + item.rect.h / 2;
    let row = rows.find((candidate) => mid >= candidate.y - 18 && mid <= candidate.y + candidate.h + 18);
    if (!row) {
      row = { id: `row-${rows.length + 1}`, role: 'row', elements: [], y: item.rect.y, h: item.rect.h };
      rows.push(row);
    }
    row.elements.push(item);
    const union = rectUnion(row.elements.map((x) => x.rect));
    row.x = union.x;
    row.y = union.y;
    row.w = union.w;
    row.h = union.h;
  }
  return rows.map((row) => ({ ...row, elements: row.elements.sort((a, b) => a.rect.x - b.rect.x) }));
}

function clusterSections(rows) {
  const sections = [];
  for (const row of rows) {
    const gap = sections.length ? row.y - (sections[sections.length - 1].y + sections[sections.length - 1].h) : 9999;
    const isNew = !sections.length || gap > 72 || row.h > 420;
    if (isNew) {
      sections.push({ id: `section-${sections.length + 1}`, role: sections.length === 0 ? 'header' : 'section', rows: [row] });
    } else {
      sections[sections.length - 1].rows.push(row);
    }
    const section = sections[sections.length - 1];
    const union = rectUnion(section.rows.map((x) => ({ x: x.x || 0, y: x.y || 0, w: x.w || 1, h: x.h || 1 })));
    section.rect = union;
  }
  return sections;
}

async function compileDesign(sourceUrl) {
  const targetUrl = normalizeUrl(sourceUrl);
  if (!targetUrl) throw new Error('Missing url query parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1800);
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

    const data = await page.evaluate(({ maxElements }) => {
      const viewport = { width: window.innerWidth || 1440, height: window.innerHeight || 1600 };
      const blocked = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT', 'TEMPLATE', 'BR', 'IFRAME', 'VIDEO', 'AUDIO', 'CANVAS']);
      const out = [];
      let id = 1;

      function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
      function px(value, fallback = 0) { const n = parseFloat(String(value || '').replace('px', '')); return Number.isFinite(n) ? n : fallback; }
      function rectOf(element) {
        const rect = element.getBoundingClientRect();
        return { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) };
      }
      function visible(element, rect, computed) {
        if (!rect || rect.w < 2 || rect.h < 2) return false;
        if (rect.x > viewport.width || rect.y > viewport.height) return false;
        if (rect.x + rect.w < 0 || rect.y + rect.h < 0) return false;
        if (computed.display === 'none' || computed.visibility === 'hidden') return false;
        if (Number(computed.opacity) === 0) return false;
        return true;
      }
      function styleOf(computed) {
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderRadius: computed.borderRadius,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          textAlign: computed.textAlign,
          objectFit: computed.objectFit
        };
      }
      function roleOf(element, tag, text) {
        const cls = clean(element.className).toLowerCase();
        const role = clean(element.getAttribute('role')).toLowerCase();
        if (tag === 'IMG' || tag === 'PICTURE') return 'image';
        if (tag === 'BUTTON' || role === 'button' || cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return 'button';
        if (tag === 'A') return text ? 'link' : 'button';
        if (/^H[1-6]$/.test(tag)) return 'heading';
        if (tag === 'P') return 'paragraph';
        if (['SPAN', 'STRONG', 'EM', 'SMALL', 'LABEL'].includes(tag)) return text ? 'text' : 'box';
        return 'box';
      }
      function domPath(element) {
        const parts = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
          const tag = current.tagName.toLowerCase();
          const cls = clean(current.className).split(' ').filter(Boolean).slice(0, 1).map((x) => `.${x}`).join('');
          parts.unshift(tag + (current.id ? `#${current.id}` : '') + cls);
          current = current.parentElement;
        }
        return parts.join(' > ');
      }
      function directText(element) {
        return clean(Array.from(element.childNodes || []).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(' '));
      }
      function textFromElement(element) {
        return directText(element) || clean(element.getAttribute('aria-label')) || clean(element.getAttribute('alt')) || clean(element.getAttribute('title'));
      }
      function hasTextDescendant(element) {
        return !!clean(element.innerText || element.textContent || '');
      }

      const candidates = Array.from(document.querySelectorAll('body *'));
      for (const element of candidates) {
        if (id > maxElements) break;
        const tag = element.tagName;
        if (!tag || blocked.has(tag)) continue;
        const computed = window.getComputedStyle(element);
        const rect = rectOf(element);
        if (!visible(element, rect, computed)) continue;
        const text = textFromElement(element);
        const role = roleOf(element, tag, text);
        const area = rect.w * rect.h;
        const isLargeContainer = area > viewport.width * viewport.height * 0.38;

        if (role === 'box' && !text && hasTextDescendant(element) && isLargeContainer) continue;
        if (role === 'box' && !text && !['rgba(0, 0, 0, 0)', 'transparent'].includes(computed.backgroundColor) === false) continue;

        const item = {
          id: `el-${id++}`,
          role,
          tag: tag.toLowerCase(),
          name: clean(text || element.getAttribute('alt') || element.id || element.className || tag).slice(0, 96) || role,
          text: text,
          rect,
          style: styleOf(computed),
          path: domPath(element),
          src: element.currentSrc || element.src || element.getAttribute('src') || ''
        };

        if (role === 'image') {
          item.captureId = `ti-reconstruct-image-${id}`;
          element.setAttribute('data-ti-reconstruct-image-id', item.captureId);
        }

        if (role === 'image' || text || role === 'button' || role === 'link') out.push(item);
      }

      const unique = [];
      const seen = new Set();
      for (const item of out) {
        const key = `${item.role}|${item.text.toLowerCase()}|${Math.round(item.rect.x / 8)}|${Math.round(item.rect.y / 8)}|${Math.round(item.rect.w / 8)}|${Math.round(item.rect.h / 8)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
      }

      return {
        title: document.title || location.hostname,
        url: location.href,
        viewport,
        elements: unique.slice(0, maxElements),
        html: '<!doctype html>\n' + document.documentElement.outerHTML
      };
    }, { maxElements: MAX_ELEMENTS });

    async function attachImages(elements) {
      for (const item of elements) {
        if (item.role !== 'image' || !item.captureId) continue;
        try {
          const handle = await page.$(`[data-ti-reconstruct-image-id="${item.captureId}"]`);
          if (!handle) continue;
          const image = await handle.screenshot({ type: 'png' });
          item.image = { contentType: 'image/png', base64: image.toString('base64'), bytes: image.length };
        } catch (_) {}
      }
    }

    await attachImages(data.elements);
    const rows = clusterRows(data.elements);
    const sections = clusterSections(rows);

    return {
      ok: true,
      url: data.url || targetUrl,
      title: data.title,
      mode: 'design-reconstruction-compiler-v1',
      capturedAt: new Date().toISOString(),
      viewport: data.viewport,
      elements: data.elements,
      rows,
      sections,
      html: data.html,
      source: {
        kind: 'rendered-design-reconstruction',
        elementCount: data.elements.length,
        rowCount: rows.length,
        sectionCount: sections.length
      },
      warnings: [
        'Design Reconstruction Compiler uses rendered website as reference, extracts visible text/images/actions, clusters layout sections, and rebuilds an editable clean design.',
        'This is inspired by design-generation agents: structured editable approximation first, pixel-perfect cloning second.',
        'Some complex effects, sliders, and pseudo-elements may require manual cleanup.'
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
    json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: 'design-reconstruction-compiler-v1', port: PORT });
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
    const result = await compileDesign(requestUrl.searchParams.get('url'));
    json(res, 200, result);
  } catch (error) {
    json(res, 500, { ok: false, error: error && error.stack ? error.stack : error && error.message ? error.message : String(error) });
  } finally {
    activeJobs -= 1;
    resetIdleTimer();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Design Reconstruction Compiler V1 running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
