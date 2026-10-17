#!/usr/bin/env node
/**
 * Offline generator for the hero pine: node tools/tree-gen-pine/generate.mjs [--out dir] [--only near,mid,far] [--debug dir]
 * Writes hero-pine-{near,mid,far}.glb (four seeded variants each) into public/models/flora/hero/.
 * All geometry and textures are procedural; nothing is read from any third-party asset.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { makeBark } from './lib/bark.mjs';
import { loadNeedleAtlas, NEEDLE_ATLAS } from './lib/needles.mjs';
import { VARIANTS, makeSpec } from './lib/skeleton.mjs';
import { buildLod, bakeColors } from './lib/build.mjs';
import { writeGlb } from './lib/glb.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d; };
const outDir = path.resolve(opt('--out', path.join(root, 'public/models/flora/hero')));
const only = opt('--only', 'near,mid,far').split(',');
const debugDir = opt('--debug', null);
fs.mkdirSync(outDir, { recursive: true });

const t0 = Date.now();
const lap = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const bark = makeBark(2048, 7); lap('bark');
const atlas = await loadNeedleAtlas(root); lap('needle atlas (shared conifer atlas)');
const raw = (data, w, c) => sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width: w, height: w, channels: c } });
const webp = (img, q, extra = {}) => img.webp({ quality: q, effort: 5, ...extra }).toBuffer();

async function textures(lod) {
  const size = { near: 2048, mid: 1024, far: 256 }[lod], nsize = { near: 2048, mid: 1024, far: 512 }[lod];
  const scaled = (data, c) => size === 2048 ? raw(data, 2048, c) : raw(data, 2048, c).resize(size, size, { kernel: 'lanczos3' });
  const images = {
    bark: { name: `hero-pine-bark-albedo-${size}`, data: await webp(scaled(bark.albedo, 3), lod === 'far' ? 70 : 84) },
    needles: { name: `hero-pine-conifer-atlas-${nsize}`, clamp: true, data: await webp(nsize === 2048 ? raw(atlas.rgba, 2048, 4) : raw(atlas.rgba, 2048, 4).resize(nsize, nsize, { kernel: 'lanczos3' }), 88, { alphaQuality: 100 }) },
  };
  if (lod !== 'far') {
    images.normal = { name: `hero-pine-bark-normal-${size}`, data: await webp(scaled(bark.normal, 3), 90) };
    images.orm = { name: `hero-pine-bark-orm-${size}`, data: await webp(scaled(bark.orm, 3), 88) };
  }
  return images;
}

const stats = {};
for (const lod of only) {
  const variants = [];
  stats[lod] = [];
  for (let i = 0; i < VARIANTS.length; i++) {
    const spec = makeSpec(VARIANTS[i]);
    const r = buildLod(spec, bark, lod);
    bakeColors(r, spec);
    let crownRadius = 0; for (let k = 0; k < r.leaf.count; k++) crownRadius = Math.max(crownRadius, Math.hypot(r.leaf.p[k * 3], r.leaf.p[k * 3 + 2]));
    variants.push({ name: `v${i}`, wood: r.wood, leaf: r.leaf, trunkRadius: +(spec.rb * 1.15).toFixed(3), height: spec.H, crownRadius: +crownRadius.toFixed(2) });
    stats[lod].push({ variant: i, height: spec.H, wood: r.wood.tris, leaf: r.leaf.tris, total: r.wood.tris + r.leaf.tris, vertices: r.wood.count + r.leaf.count, pads: r.pads.length, branches: spec.branches.length, liveBranches: spec.branches.filter((b) => !b.dead).length });
  }
  const glb = writeGlb({ variants, images: await textures(lod), name: lod });
  const file = path.join(outDir, `hero-pine-${lod}.glb`);
  fs.writeFileSync(file, glb);
  lap(`${lod}: ${glb.length} bytes -> ${file}`);
  console.log(JSON.stringify(stats[lod]));
}
if (debugDir) {
  fs.mkdirSync(debugDir, { recursive: true });
  await raw(bark.albedo, 2048, 3).resize(1024, 1024).png().toFile(path.join(debugDir, 'bark-albedo.png'));
  await raw(bark.normal, 2048, 3).resize(1024, 1024).png().toFile(path.join(debugDir, 'bark-normal.png'));
  await raw(atlas.rgba, 2048, 4).png().toFile(path.join(debugDir, 'needle-atlas.png'));
  await raw(atlas.rgba, 2048, 4).flatten({ background: '#6a8a9a' }).png().toFile(path.join(debugDir, 'needle-atlas-flat.png'));
}
export { NEEDLE_ATLAS };
