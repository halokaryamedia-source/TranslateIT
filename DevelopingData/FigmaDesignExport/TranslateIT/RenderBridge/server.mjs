import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);

let browserPromise = null;
let activeJobs = 0;
let idleTimer = null;

function touch() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (activeJobs > 0) {
      touch();
      return;
    }

    console.log(`Render Bridge idle for ${IDLE_EXIT_MS}ms. Shutting down.`);
    try {
      if (browserPromise) {
        const browser = await browserPromise;
        await browser.close();
      }
    } catch (_) {}

    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  }, IDLE_EXIT_MS);
  idleTimer.unref();
}

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const height = document.body ? document.body.scrollHeight : 0;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= height || totalHeight > 5000) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 80);
    });
  });
}

async function captureRenderedHtml(page, sourceUrl) {
  return page.evaluate((url) => {
    const styleProps = [
      'display',
      'box-sizing',
      'position',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'margin',
      'gap',
      'row-gap',
      'column-gap',
      'flex-direction',
      'align-items',
      'justify-content',
      'background',
      'background-color',
      'color',
      'border',
      'border-color',
      'border-width',
      'border-radius',
      'font-size',
      'font-weight',
      'font-family',
      'line-height',
      'letter-spacing',
      'text-align',
      'opacity',
      'visibility'
    ];

    function absoluteUrl(value) {
      try {
        return new URL(value, url).href;
      } catch (_) {
        return value;
      }
    }

    const clone = document.documentElement.cloneNode(true);

    clone.querySelectorAll('script,noscript,iframe,canvas,video,audio').forEach(node => node.remove());

    const originalNodes = Array.from(document.documentElement.querySelectorAll('*'));
    const cloneNodes = Array.from(clone.querySelectorAll('*'));

    for (let i = 0; i < cloneNodes.length; i += 1) {
      const original = originalNodes[i];
      const cloned = cloneNodes[i];
      if (!original || !cloned) continue;

      const computed = window.getComputedStyle(original);
      const inline = [];

      styleProps.forEach(prop => {
        const value = computed.getPropertyValue(prop);
        if (value) inline.push(`${prop}:${value}`);
      });

      cloned.setAttribute('style', inline.join(';'));

      if (!cloned.getAttribute('data-component')) {
        const tag = cloned.tagName ? cloned.tagName.toLowerCase() : 'node';
        const id = cloned.id ? `#${cloned.id}` : '';
        const className = String(cloned.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        cloned.setAttribute('data-component', `${tag}${id}${className ? '.' + className : ''}`);
      }

      if (cloned.tagName === 'IMG') {
        const src = cloned.getAttribute('src');
        if (src) cloned.setAttribute('src', absoluteUrl(src));
      }

      if (cloned.tagName === 'A') {
        const href = cloned.getAttribute('href');
        if (href) cloned.setAttribute('href', absoluteUrl(href));
      }
    }

    const title = document.title || new URL(url).hostname;
    return {
      title,
      html: '<!doctype html>\n' + clone.outerHTML
    };
  }, sourceUrl);
}

async function renderUrl(sourceUrl) {
  const targetUrl = normalizeUrl(sourceUrl);
  if (!targetUrl) throw new Error('Missing url query parameter.');

  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1600 },
    deviceScaleFactor: 1
  });

  try {
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: 12000 });
    } catch (_) {
      // Some sites keep network connections open. Continue with current DOM.
    }

    await page.waitForTimeout(1200);
    await autoScroll(page);
    await page.waitForTimeout(600);

    const result = await captureRenderedHtml(page, targetUrl);
    return {
      ok: true,
      url: targetUrl,
      title: result.title,
      html: result.html,
      mode: 'rendered-dom-computed-style',
      capturedAt: new Date().toISOString(),
      idleExitMs: IDLE_EXIT_MS,
      warnings: [
        'Canvas, video, audio, iframe, WebGL, and complex animations are skipped.',
        'The output is an editable Figma approximation, not a pixel-perfect browser screenshot.'
      ]
    };
  } finally {
    await page.close();
  }
}

const server = http.createServer(async (req, res) => {
  touch();

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
    json(res, 200, {
      ok: true,
      service: 'translateit-render-bridge',
      port: PORT,
      idleExitMs: IDLE_EXIT_MS
    });
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
    const targetUrl = requestUrl.searchParams.get('url');
    const result = await renderUrl(targetUrl);
    json(res, 200, result);
  } catch (error) {
    json(res, 500, {
      ok: false,
      error: error && error.message ? error.message : String(error)
    });
  } finally {
    activeJobs -= 1;
    touch();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Render Bridge running at http://127.0.0.1:${PORT}`);
  console.log(`Auto shutdown after ${IDLE_EXIT_MS}ms idle.`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
  touch();
});

process.on('SIGINT', async () => {
  try {
    if (browserPromise) {
      const browser = await browserPromise;
      await browser.close();
    }
  } finally {
    process.exit(0);
  }
});
