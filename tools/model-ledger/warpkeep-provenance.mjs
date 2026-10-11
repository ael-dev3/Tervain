// Writes docs/engineering/warpkeep-provenance.json: one record per Warpkeep set in the archive, from the archive manifest
// and each GLB's own metadata. Facts only: what the files are, where they came from, what they say about themselves, and
// whether Tervain ships them. It grants and asserts no licence. Usage: node tools/model-ledger/warpkeep-provenance.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const dir = path.join(root, 'assets/warpkeep');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

function glbAsset(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32LE(0) !== 0x46546c67) return null;
  const len = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  return { asset: json.asset ?? {}, sha256: crypto.createHash('sha256').update(b).digest('hex'), bytes: b.length };
}

const shipped = fs.existsSync(path.join(root, 'public/models/warpkeep'));
const sets = new Map();
for (const entry of manifest.assets) {
  const set = entry.id.split('.')[0];
  const files = Object.entries(entry.lods).map(([lod, f]) => {
    const meta = glbAsset(path.join(dir, f.file));
    if (!meta) throw new Error(`not a GLB: ${f.file}`);
    if (meta.sha256 !== f.sha256 || meta.bytes !== f.bytes) throw new Error(`hash or size differs from the manifest: ${f.file}`);
    return {
      lod, file: `assets/warpkeep/${f.file}`, sha256: f.sha256, bytes: f.bytes, triangles: f.triangles,
      warpkeepPath: f.source,
      copyright: meta.asset.copyright ?? null, generator: meta.asset.generator ?? null,
    };
  });
  if (!sets.has(set)) sets.set(set, []);
  sets.get(set).push({ id: entry.id, files });
}

const records = [...sets].map(([set, assets]) => {
  const files = assets.flatMap((a) => a.files);
  const copyrights = [...new Set(files.map((f) => f.copyright).filter(Boolean))];
  const generators = [...new Set(files.map((f) => f.generator).filter(Boolean))];
  return {
    set,
    assets: assets.length,
    files: files.length,
    bytes: files.reduce((t, f) => t + f.bytes, 0),
    source: { repository: manifest.source.repository, commit: manifest.source.commit, paths: [...new Set(files.map((f) => path.posix.dirname(f.warpkeepPath)))] },
    embedded: { copyright: copyrights, generator: generators, filesWithCopyright: files.filter((f) => f.copyright).length },
    status: manifest.terms.status,
    tervainUse: shipped ? 'shipped' : 'archive-only (not under public/, never served or loaded by the game)',
    assetsList: assets,
  };
});

const out = {
  schema: 1,
  generatedBy: 'tools/model-ledger/warpkeep-provenance.mjs',
  archive: { manifest: 'assets/warpkeep/manifest.json', source: manifest.source, terms: manifest.terms, totals: manifest.totals },
  verified: 'Every file\'s SHA-256 and size were recomputed and match the archive manifest.',
  boundary: 'Provenance facts only. No open-content licence, commercial clearance or right beyond the recorded terms is asserted.',
  sets: records,
};
fs.writeFileSync(path.join(root, 'docs/engineering/warpkeep-provenance.json'), JSON.stringify(out, null, 2) + '\n');
for (const r of records) console.log(r.set.padEnd(9), String(r.assets).padStart(3), 'assets', String(r.files).padStart(3), 'files', r.embedded.filesWithCopyright, 'with ©', JSON.stringify(r.embedded.copyright), JSON.stringify(r.embedded.generator).slice(0, 80));
