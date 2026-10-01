#!/usr/bin/env node
/**
 * Export every person's texture sheet with its repainting guides (docs/art/people-retexture.md):
 *
 *   npm run people:sheets                     all people, 1024 px sheets, into out/people/
 *   npm run people:sheets -- --size 2048      larger sheets
 *   npm run people:sheets -- --only player,rillford_reeve
 *   npm run people:sheets -- --out some/folder
 *
 * For each person <id> it writes <id>.png (the painted sheet), <id>.template.png (flat-colour block-in with outlines,
 * guide lines and labels), <id>.parts.png (one flat colour per piece), <id>.mask.png (white where a surface is),
 * <id>.edit-mask.png (transparent where a surface is, for image editors) and <id>.json (layout, legend, description and
 * a suggested prompt), plus index.json. A repainted sheet goes to src/assets/people/<id>.png.
 *
 * Check repainted sheets against each person's current shape, as the game will use them:
 *
 *   npm run people:check                      every image installed in src/assets/people
 *   npm run people:check -- some/caravan_master.v2.png
 *                                             any PNG; the person is the file name up to its first dot
 *
 * It prints the holes (background deep inside a figure) and the stray paint outside the figures, as shares of the
 * person, and exits with 1 if any image may not fit (over 1% holes or 3% stray paint). Only PNG can be checked here;
 * preview other formats in tools/people.html.
 *
 * Runs the game's own code through Vite in Node; no browser and no dependencies beyond the repository's.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const size = Number(opt('size', '1024'));
const only = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const outDir = path.resolve(root, opt('out', 'out/people'));
const check = args.includes('--check');
const installDir = path.join(root, 'src/assets/people');

/* ---------------------------------------------------------------- PNG */

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** RGBA rows top to bottom to a PNG file. */
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** A PNG file to RGBA rows top to bottom: 8- or 16-bit grey, RGB, palette, grey with alpha or RGBA, not interlaced. */
function readPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let at = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let palette = null;
  let trns = null;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      type = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG; save it without interlacing');
    } else if (kind === 'PLTE') palette = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    at += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  if (!channels || (depth !== 8 && !(depth === 16 && type !== 3))) throw new Error(`unsupported PNG (colour type ${type}, ${depth}-bit)`);
  const bpp = (channels * depth) / 8;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = v & 0xff;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  const step = depth / 8;
  for (let p = 0; p < width * height; p++) {
    const s = (k) => px[p * bpp + k * step];
    let r;
    let g;
    let b;
    let a = 255;
    if (type === 3) {
      const i = s(0);
      r = palette[i * 3];
      g = palette[i * 3 + 1];
      b = palette[i * 3 + 2];
      if (trns && i < trns.length) a = trns[i];
    } else if (type === 0 || type === 4) {
      r = g = b = s(0);
      if (type === 4) a = s(1);
    } else {
      r = s(0);
      g = s(1);
      b = s(2);
      if (type === 6) a = s(3);
    }
    rgba.set([r, g, b, a], p * 4);
  }
  return { width, height, rgba };
}

/* ---------------------------------------------------------------- export or check */

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const mod = await server.ssrLoadModule('/tools/peopleSheets.ts');
  if (check) {
    const given = args.filter((a, i) => !a.startsWith('--') && !['--size', '--only', '--out'].includes(args[i - 1] ?? ''));
    const files = given.length
      ? given.map((f) => path.resolve(f))
      : fs.existsSync(installDir)
        ? fs.readdirSync(installDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => path.join(installDir, f))
        : [];
    if (!files.length) console.log('no replacement sheets to check (src/assets/people holds none)');
    const people = new Map(mod.cast().map((m) => [m.id, m]));
    let bad = 0;
    for (const file of files) {
      const name = path.basename(file);
      const id = name.slice(0, name.indexOf('.'));
      const m = people.get(id);
      const fail = (why) => {
        bad++;
        console.log(`${name.padEnd(28)} ${why}`);
      };
      if (!m) {
        fail(`no person with the id "${id}"`);
        continue;
      }
      if (!/\.png$/i.test(name)) {
        console.log(`${name.padEnd(28)} not checked here (only PNG); preview it in tools/people.html`);
        continue;
      }
      let img;
      try {
        img = readPng(fs.readFileSync(file));
      } catch (err) {
        fail(String(err.message ?? err));
        continue;
      }
      if (img.width !== img.height) {
        fail(`${img.width}x${img.height}: a sheet must be square, laid out as exported`);
        continue;
      }
      const r = mod.checkSheet(m, img.rgba, img.width);
      if (!r.fits) bad++;
      console.log(`${name.padEnd(28)} ${String(img.width).padStart(4)}px  ${r.report}  ${r.fits ? 'fits' : 'MAY NOT FIT: re-export and compare'}`);
    }
    process.exitCode = bad ? 1 : 0;
  } else {
    exportAll(mod);
  }
} finally {
  await server.close();
}

function exportAll(mod) {
  fs.mkdirSync(outDir, { recursive: true });
  const index = [];
  for (const m of mod.cast()) {
    if (only.length && !only.includes(m.id)) continue;
    const t0 = performance.now();
    const e = mod.exportPerson(m, size);
    const files = { sheet: `${e.id}.png`, template: `${e.id}.template.png`, parts: `${e.id}.parts.png`, mask: `${e.id}.mask.png`, editMask: `${e.id}.edit-mask.png` };
    fs.writeFileSync(path.join(outDir, files.sheet), png(e.size, e.size, e.sheet));
    fs.writeFileSync(path.join(outDir, files.template), png(e.size, e.size, e.template));
    fs.writeFileSync(path.join(outDir, files.parts), png(e.size, e.size, e.parts));
    fs.writeFileSync(path.join(outDir, files.mask), png(e.size, e.size, e.mask));
    fs.writeFileSync(path.join(outDir, files.editMask), png(e.size, e.size, e.editMask));
    const manifest = { ...e.manifest, files };
    fs.writeFileSync(path.join(outDir, `${e.id}.json`), JSON.stringify(manifest, null, 2) + '\n');
    index.push({ id: e.id, name: e.manifest.name, role: e.manifest.role, files, install: e.manifest.install });
    console.log(`${e.id.padEnd(20)} ${e.size}px  ${(performance.now() - t0).toFixed(0)} ms`);
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ size, people: index }, null, 2) + '\n');
  console.log(`wrote ${index.length} people to ${path.relative(root, outDir) || '.'}`);
}
