// Generates placeholder PNG icons with no dependencies (node:zlib only).
// Run: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [0x1b, 0x21, 0x2c];
const ACCENT = [0xc6, 0xf4, 0x32];
const BOLT = [[0.57, 0.1], [0.27, 0.56], [0.47, 0.56], [0.41, 0.9], [0.73, 0.42], [0.53, 0.42]];

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundedSquare(x, y, r) {
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, { rounded, boltScale }) {
  const SS = 3; // supersampling for smooth edges
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          if (rounded && !inRoundedSquare(x, y, 0.22)) continue;
          const bx = (x - 0.5) / boltScale + 0.5;
          const by = (y - 0.5) / boltScale + 0.5;
          const c = inPolygon(bx, by, BOLT) ? ACCENT : BG;
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const o = py * (size * 4 + 1) + 1 + px * 4;
      const cover = a / 255;
      raw[o] = cover ? Math.round(r / cover) : 0;
      raw[o + 1] = cover ? Math.round(g / cover) : 0;
      raw[o + 2] = cover ? Math.round(b / cover) : 0;
      raw[o + 3] = Math.round(a / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', png(192, { rounded: true, boltScale: 0.9 }));
writeFileSync('icons/icon-512.png', png(512, { rounded: true, boltScale: 0.9 }));
// Maskable: full bleed, bolt inside the central 80% safe zone.
writeFileSync('icons/icon-maskable-512.png', png(512, { rounded: false, boltScale: 0.62 }));
// iOS rounds the corners itself, so the apple icon is full bleed too.
writeFileSync('icons/apple-touch-icon.png', png(180, { rounded: false, boltScale: 0.8 }));
console.log('icons written');
