import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixed = path.join(here, 'server.alpha.v4.fixed.generated.mjs');
const bootstrap = path.join(here, 'start-alpha-v4-fixed.mjs');

if (!fs.existsSync(fixed)) {
  console.log('Alpha V5 launcher: generating fixed structured bridge first...');
  await import(pathToFileURL(bootstrap).href);
} else {
  console.log('Alpha V5 launcher: using fixed structured bridge:', fixed);
  await import(pathToFileURL(fixed).href);
}
