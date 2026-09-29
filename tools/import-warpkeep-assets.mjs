#!/usr/bin/env node
/**
 * Copies a pinned, explicit selection of Warpkeep runtime GLBs into assets/warpkeep/
 * and writes the machine-readable catalog the game loads (manifest.json) and the inventory
 * record required by docs/engineering/shared-assets.md.
 *
 * Files are copied byte for byte; nothing is transformed. The catalog records the exact source
 * revision, path, size and SHA-256 of every file so a later build can verify what shipped.
 *
 * Usage: node tools/import-warpkeep-assets.mjs <path-to-warpkeep-checkout>
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('usage: node tools/import-warpkeep-assets.mjs <warpkeep-checkout>');
  process.exit(1);
}
const root = path.resolve(src);
const models = path.join(root, 'public', 'models', 'hegemony');
const sourceCommit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
const out = path.resolve('assets/warpkeep');

/** Reads the JSON chunk of a GLB and summarises it. */
function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a GLB`);
  const len = buf.readUInt32LE(8);
  let off = 12;
  let json = null;
  while (off < len) {
    const cl = buf.readUInt32LE(off);
    const ct = buf.readUInt32LE(off + 4);
    if (ct === 0x4e4f534a) json = JSON.parse(buf.subarray(off + 8, off + 8 + cl).toString('utf8'));
    off += 8 + cl;
  }
  return { buf, json };
}

function summarize(file) {
  const { buf, json: j } = readGlb(file);
  const acc = j.accessors ?? [];
  let tris = 0;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const m of j.meshes ?? []) {
    for (const p of m.primitives) {
      const pos = acc[p.attributes.POSITION];
      tris += (p.indices !== undefined ? acc[p.indices].count : pos.count) / 3;
      if (pos.min) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], pos.min[i]); max[i] = Math.max(max[i], pos.max[i]); }
    }
  }
  return {
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
    triangles: tris,
    skinned: (j.skins ?? []).length > 0,
    animations: (j.animations ?? []).map((a) => a.name),
    size: max.map((v, i) => +(v - min[i]).toFixed(3)),
    minY: +min[1].toFixed(3),
  };
}

const LOD = /-(high|balanced|compact)-[0-9a-f]{8,16}\.glb$/;

/** group: catalog prefix; dir: under public/models/hegemony; pick: filename filter; slug: id from filename. */
const SELECTIONS = [
  // Environment trees: 22 species, three LODs each.
  { prefix: 'tree', dir: 'environment/trees', pick: (f) => f.startsWith('hegemony-tree-'), slug: (f) => f.replace(/^hegemony-tree-/, '').replace(LOD, '') },
  // Inner Keep ornamental trees.
  { prefix: 'tree', dir: 'inner-keep/trees', pick: () => true, slug: (f) => 'ik-' + f.replace(/^inner-keep-/, '').replace(LOD, '') },
  // Gathering-node sites.
  { prefix: 'node', dir: 'gathering-nodes/stone-quarry', pick: () => true, slug: (f) => 'stone-quarry' },
  { prefix: 'node', dir: 'gathering-nodes/logging-camp', pick: () => true, slug: (f) => 'logging-camp' },
  { prefix: 'node', dir: 'gathering-nodes/wheat-farm', pick: (f) => /balanced|compact/.test(f), slug: (f) => 'wheat-farm' },
  // Buildings.
  { prefix: 'building', dir: 'inner-keep/buildings', pick: (f) => /city-mill|city-stoneworks|lumber-camp/.test(f), slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  { prefix: 'building', dir: 'inner-keep/landmarks', pick: (f) => /city-barracks/.test(f) && /balanced|compact/.test(f), slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  // Ruins and stonework.
  { prefix: 'stone', dir: 'inner-keep/stone', pick: () => true, slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  // Palisade kit.
  { prefix: 'palisade', dir: 'inner-keep/palisade', pick: () => true, slug: (f) => f.replace(/^inner-keep-palisade-/, '').replace(LOD, '') },
  // Town props.
  { prefix: 'prop', dir: 'inner-keep/town-items', pick: (f) => !/processional-standard/.test(f), slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  // People: balanced = rigged, compact = static.
  { prefix: 'citizen', dir: 'inner-keep/population/citizen', pick: () => true, slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  { prefix: 'unit', dir: 'inner-keep/population/infantry', pick: () => true, slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  { prefix: 'unit', dir: 'inner-keep/population/ranged', pick: (f) => /dusk-ranger|longbow-warden/.test(f), slug: (f) => f.replace(/^inner-keep-/, '').replace(LOD, '') },
  // Wildlife.
  { prefix: 'wildlife', dir: 'inner-keep/wildlife/rabbit', pick: () => true, slug: (f) => 'rabbit' },
  { prefix: 'wildlife', dir: 'environment/wildlife/rabbit', pick: () => true, slug: (f) => 'rabbit-shared' },
];

fs.rmSync(out, { recursive: true, force: true });
const entries = [];
for (const sel of SELECTIONS) {
  const dir = path.join(models, sel.dir);
  if (!fs.existsSync(dir)) {
    console.error(`missing ${sel.dir}`);
    continue;
  }
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith('.glb') || !sel.pick(f)) continue;
    const m = f.match(LOD);
    const lod = m ? m[1] : 'compact';
    const id = `${sel.prefix}.${sel.slug(f)}`;
    const destDir = path.join(out, sel.prefix);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(path.join(dir, f), path.join(destDir, f));
    const s = summarize(path.join(dir, f));
    entries.push({ id, lod, file: `${sel.prefix}/${f}`, source: `public/models/hegemony/${sel.dir}/${f}`, ...s });
  }
}

const byId = new Map();
for (const e of entries) {
  if (!byId.has(e.id)) byId.set(e.id, { id: e.id, lods: {} });
  const g = byId.get(e.id);
  if (g.lods[e.lod]) throw new Error(`duplicate ${e.id} ${e.lod}`);
  g.lods[e.lod] = { file: e.file, bytes: e.bytes, sha256: e.sha256, triangles: e.triangles, skinned: e.skinned, animations: e.animations, size: e.size, minY: e.minY, source: e.source };
}

const manifest = {
  schema: 1,
  generatedBy: 'tools/import-warpkeep-assets.mjs',
  source: {
    repository: 'https://github.com/ael-dev3/Warpkeep',
    commit: sourceCommit,
    note: 'Byte-exact copies of runtime GLBs from public/models/hegemony/. Nothing is transformed.',
  },
  terms: {
    status: 'LicenseRef-Warpkeep-Provenance-Required',
    summary:
      "Used in Tervain on the project owner's instruction (2026-09-29). Warpkeep's ASSETS-LICENSE.md records these files as use-authorised runtime assets, not as an open-content licence; per-set provenance is in Warpkeep-Assets. Redistribution beyond the owner's own projects is not granted by this repository.",
    ledger: 'https://github.com/ael-dev3/Warpkeep/blob/main/ASSETS-LICENSE.md',
    archive: 'https://github.com/ael-dev3/Warpkeep-Assets',
  },
  totals: {
    files: entries.length,
    bytes: entries.reduce((a, e) => a + e.bytes, 0),
    assets: byId.size,
  },
  assets: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
};
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`copied ${manifest.totals.files} files (${(manifest.totals.bytes / 1e6).toFixed(1)} MB), ${manifest.totals.assets} assets, source ${sourceCommit.slice(0, 7)}`);
