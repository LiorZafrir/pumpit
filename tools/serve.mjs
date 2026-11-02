// Tiny static dev server (no dependencies). Run: npm run serve
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('.');
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const PORT = Number(arg('port') || process.env.PORT || 5173);
// --delay=150 (or DELAY_MS) adds latency to every response, to see what a slow connection does to loading.
const DELAY_MS = Number(arg('delay') || process.env.DELAY_MS || 0);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};
const BLOCKED = /^\/(node_modules|tests|tools|\.git|\.claude)(\/|$)/;

createServer(async (req, res) => {
  if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = normalize(path === '/' ? '/index.html' : path);
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT) || BLOCKED.test(rel)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/`));
