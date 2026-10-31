// Downloads the two frames of every mapped exercise into assets/exercises/.
// Source: github.com/yuhonas/free-exercise-db (Unlicense). Run: node tools/fetch-exercise-images.mjs
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MEDIA_IDS } from '../js/data/exercise-media.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'exercises');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

let fetched = 0;
let failed = 0;
for (const mediaId of new Set(Object.values(MEDIA_IDS))) {
  for (const frame of [0, 1]) {
    const file = join(ROOT, mediaId, `${frame}.jpg`);
    try { await access(file); continue; } catch { /* not downloaded yet */ }
    const res = await fetch(`${BASE}/${mediaId}/${frame}.jpg`);
    if (!res.ok) { console.error(`FAILED ${mediaId}/${frame}.jpg (${res.status})`); failed++; continue; }
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    fetched++;
  }
}
console.log(`downloaded ${fetched}, failed ${failed}`);
process.exit(failed ? 1 : 0);
