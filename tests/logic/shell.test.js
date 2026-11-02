import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';

const read = (f) => readFileSync(f, 'utf8');
const swSource = read('sw.js');
const shell = new Set([...swSource.slice(swSource.indexOf('const SHELL'), swSource.indexOf('];', swSource.indexOf('const SHELL'))).matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]));

function filesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name).split(sep).join('/');
    return statSync(p).isDirectory() ? filesIn(p) : [p];
  });
}

test('every app file is precached by the service worker (it serves them cache first)', () => {
  const files = [...filesIn('js'), ...filesIn('css')];
  const missing = files.filter((f) => f !== 'js/config.example.js' && !f.endsWith('config.local.js') && !shell.has(f));
  assert.deepEqual(missing, [], 'add these to SHELL in sw.js');
});

test('everything listed in SHELL exists', () => {
  for (const f of shell) {
    if (f === '' || f === 'index.html') continue;
    assert.ok(statSync(f).isFile(), `missing file in SHELL: ${f}`);
  }
});

test('index.html preloads every module app.js needs at start', () => {
  const html = read('index.html');
  const preloaded = new Set([...html.matchAll(/rel="modulepreload" href="\.\/([^"]+)"/g)].map((m) => m[1]));
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const m of read(file).matchAll(/(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]/g)) walk(normalize(join(dirname(file), m[1])).split(sep).join('/'));
  };
  walk('js/app.js');
  const missing = [...seen].filter((f) => !preloaded.has(f));
  assert.deepEqual(missing, [], 'add these as modulepreload links in index.html');
});

test('the service worker never caches Firebase auth pages', () => {
  assert.match(swSource, /startsWith\('\/__\/'\)\) return/);
});
