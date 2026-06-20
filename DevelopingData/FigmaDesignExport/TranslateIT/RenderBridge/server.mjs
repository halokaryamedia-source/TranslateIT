import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);
const VIEWPORT = { width: 1440, height: 1600 };

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

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

async function captureVisibleImages(page) {
  const descriptors = await page.evaluate(() => {
    function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
    return Array.from(document.querySelectorAll('img, picture img')).map((img, index) => {
      const rect = img.getBoundingClientRect();
      const visible = rect.width > 8 && rect.height > 8 && rect.x < window.innerWidth && rect.y < window.innerHeight && rect.x + rect.width > 0 && rect.y + rect.height > 0;
      const id = `ti-mivubi-img-${index}`;
      img.setAttribute('data-ti-mivubi-img-id', id);
      return {
        id,
        index,
        visible,
        alt: clean(img.getAttribute('alt') || ''),
        src: img.currentSrc || img.src || img.getAttribute('src') || '',
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        area: Math.round(rect.width * rect.height)
      };
    }).filter((item) => item.visible);
  });

  const withImages = [];
  for (const item of descriptors) {
    try {
      const handle = await page.$(`[data-ti-mivubi-img-id="${item.id}"]`);
      if (!handle) continue;
      const bytes = await handle.screenshot({ type: 'png' });
      withImages.push({
        ...item,
        image: { contentType: 'image/png', base64: bytes.toString('base64'), bytes: bytes.length }
      });
    } catch (_) {
      withImages.push(item);
    }
  }
  return withImages;
}

function chooseMivubiAssets(images) {
  const small = images.filter((item) => item.area < 16000).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const logo = images.find((item) => /logo|mivubi|mvub/i.test(item.alt + ' ' + item.src) && item.area < 20000) || small[0] || null;

  const projectImages = images
    .filter((item) => item.area > 35000 && item.rect.h > 180 && item.rect.w > 120)
    .sort((a, b) => {
      const centerBiasA = Math.abs((a.rect.x + a.rect.w / 2) - 720);
      const centerBiasB = Math.abs((b.rect.x + b.rect.w / 2) - 720);
      return centerBiasA - centerBiasB || b.area - a.area;
    });

  const mainProject = projectImages[0] || null;
  const sideProject = projectImages.find((item) => !mainProject || item.id !== mainProject.id) || null;

  return {
    logo: logo ? logo.image : null,
    mainProject: mainProject ? mainProject.image : null,
    sideProject: sideProject ? sideProject.image : null,
    selected: {
      logo: logo ? { alt: logo.alt, src: logo.src, rect: logo.rect, area: logo.area } : null,
      mainProject: mainProject ? { alt: mainProject.alt, src: mainProject.src, rect: mainProject.rect, area: mainProject.area } : null,
      sideProject: sideProject ? { alt: sideProject.alt, src: sideProject.src, rect: sideProject.rect, area: sideProject.area } : null
    },
    raw: images.map((item) => ({ alt: item.alt, src: item.src, rect: item.rect, area: item.area }))
  };
}

async function compileMivubiHome(targetUrl) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const images = await captureVisibleImages(page);
    const assets = chooseMivubiAssets(images);
    const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
    const title = await page.title();

    return {
      ok: true,
      mode: 'mivubi-home-adapter-v1',
      adapter: 'mivubi-home',
      capturedAt: new Date().toISOString(),
      url: page.url() || targetUrl,
      title: title || 'Mivubi Team',
      viewport: VIEWPORT,
      assets,
      content: {
        brand: 'Mivubi',
        nav: ['About', 'Portfolio', 'Goodies', 'Contents', 'Talk with us'],
        topCta: 'Lets Contribute',
        badge: 'Mivubi Team',
        headline: ['Unlocking', 'Potential Through', 'Cultural Games.'],
        intro: 'MIVUBI Team is dedicated to utilizing Minecraft for Education, Art, and Cultural Initiatives.',
        primaryCta: 'Talk with us',
        socials: ['in', 'ig', 'tk'],
        mainCard: { title: 'RAMpoggan Arena', date: 'Dec 20, 2025' },
        sideFeature: {
          title: 'Tana Samawa',
          description: 'Tana Samawa merekonstruksi Sumbawa melalui video game dengan pendekatan topografi, arsitektur, ikonografi, dan kultural sebagai ruang alternatif reka pengetahuan.',
          label: 'Recent Project',
          date: 'Oct 5 - Nov 20, 2025'
        },
        footer: {
          description: "We're a specialized project team exploring new possibilities using the Minecraft platform in the realms of Education, Art, and Culture.",
          recentWorks: ['RAMpoggan Arena', 'Tana Samawa', 'Jalur Tanam: Lini Masa', 'Perkebunan Nusantara'],
          programs: ['Contents', 'Careers'],
          contact: ['Java, Indonesia', 'mivubiteam@gmail.com', '+62821-3214-5370']
        }
      },
      diagnostics: {
        sourceTextChars: clean(pageText).length,
        capturedImages: images.length,
        selectedAssets: assets.selected,
        rawImages: assets.raw
      },
      warnings: [
        'Dedicated Mivubi adapter rebuilds the page from a design model instead of dumping DOM layers.',
        'Images are captured from the live website and inserted into structured project cards.',
        'This adapter is site-specific and intentionally prioritizes clean editable design over generic DOM conversion.'
      ]
    };
  } finally {
    await page.close();
  }
}

async function compile(target) {
  const targetUrl = normalizeUrl(target);
  if (!targetUrl) throw new Error('Missing url query parameter.');
  const host = new URL(targetUrl).hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'mivubi.com') return compileMivubiHome(targetUrl);
  throw new Error('This build is currently locked to the Mivubi Home Adapter. Generic website import is disabled until the adapter output is stable.');
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
  if (requestUrl.pathname === '/health') return json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: 'mivubi-home-adapter-v1', port: PORT });
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
  console.log(`TranslateIT Mivubi Home Adapter running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
