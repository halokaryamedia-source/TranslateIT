import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixed = path.join(here, 'server.alpha.v4.fixed.generated.mjs');
const bootstrap = path.join(here, 'start-alpha-v4-fixed.mjs');

try {
  if (fs.existsSync(fixed)) fs.unlinkSync(fixed);
} catch (_) {}

console.log('Alpha V5 launcher: regenerating fixed structured bridge...');
await import(pathToFileURL(bootstrap).href);
