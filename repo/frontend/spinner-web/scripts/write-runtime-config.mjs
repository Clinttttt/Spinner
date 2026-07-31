import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(projectRoot, 'public', 'runtime-config.js');
const configuredUrl = (process.env.SPINNER_API_URL ?? '').trim().replace(/\/+$/, '');

if (configuredUrl && process.env.VERCEL && !configuredUrl.startsWith('https://')) {
  throw new Error('SPINNER_API_URL must use HTTPS for a Vercel deployment.');
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `window.__SPINNER_API_URL__ = ${JSON.stringify(configuredUrl)};\n`,
  'utf8',
);

console.log(
  configuredUrl
    ? `Wrote customer web API origin: ${configuredUrl}`
    : 'Wrote empty API origin; production requests will use the current web origin.',
);
