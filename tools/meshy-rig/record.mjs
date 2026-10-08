#!/usr/bin/env node
/**
 * Records the residents' rigs and motion library where the game and the audits read them: each rig file's hash in the
 * resident manifest (public/models/npcs/manifest.json), the motion library's file, size and hash there too, and the
 * library in the distributed model ledger (public/model-licenses.json) with its source record.
 *
 *   node tools/meshy-rig/record.mjs        after extract-rig.mjs and build-motion.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NPCS = path.join(ROOT, 'public/models/npcs');
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
/** Written as the files are kept: two-space indents, and characters beyond ASCII escaped. */
const writeJson = (file, value) => fs.writeFileSync(file,
  `${JSON.stringify(value, null, 2).replace(/[\u0080-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`);

const manifestFile = path.join(NPCS, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
for (const asset of manifest.assets) {
  const file = path.join(NPCS, 'rigs', `${asset.id}.json`);
  if (!fs.existsSync(file)) { delete asset.rig; continue; }
  const rig = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (rig.model.sha256 !== asset.sha256) throw new Error(`${asset.id}: its rig was made for another model`);
  asset.rig = { file: `rigs/${asset.id}.json`, bytes: fs.statSync(file).size, sha256: sha256(file) };
}
const motionFile = path.join(NPCS, 'motion/residents.glb');
manifest.motion = { file: 'motion/residents.glb', bytes: fs.statSync(motionFile).size, sha256: sha256(motionFile) };
writeJson(manifestFile, manifest);

const ledgerFile = path.join(ROOT, 'public/model-licenses.json');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
const clips = JSON.parse(fs.readFileSync(path.join(NPCS, 'motion/clips.json'), 'utf8'));
ledger.sources['resident-motion'] = {
  filename: 'models/npcs/motion/residents.glb',
  sha256: manifest.motion.sha256,
  sourceRecord: 'https://github.com/ael-dev3/Tervain/blob/main/public/models/npcs/motion/clips.json',
  sourceAssetUrl: null,
  recordedSupplier: 'Ael',
  creator: 'Generated with the Meshy API (animation library and text to motion) on the owner\'s account',
  generationService: 'Meshy',
  license: {
    spdx: null, version: null, evidenceStatus: 'pending-source-classification',
    reason: 'The API responses do not record the account plan at generation time.',
  },
  credit: `Resident motion: ${clips.clips.length} clips from Meshy's animation library and text to motion, on a Meshy auto-rig of an owner-supplied resident; two of them also move the wanderer's swimming.`,
  changes: 'Clips packed into one skeleton-only library: meshes, textures and scale channels removed, centimetres converted to metres, rotations stored as normalized 16-bit quaternions (tools/meshy-rig/build-motion.mjs). Each clip is retargeted to every resident\'s own rig, and the two swim clips to the wanderer\'s, at load time.',
  rightsBoundary: 'Project-specific Tervain use is recorded. This is not proof of ownership or a general content license.',
};
const entry = {
  file: 'public/models/npcs/motion/residents.glb', bytes: manifest.motion.bytes, sha256: manifest.motion.sha256,
  embeddedCopyright: null, embeddedCcDeclaration: false, externalDependencies: [], scope: 'original-game-model-catalog',
  sourceId: 'resident-motion', license: { spdx: null, version: null, evidenceStatus: 'pending-source-classification' }, modified: true,
};
ledger.assets = ledger.assets.filter((asset) => asset.file !== entry.file);
ledger.assets.push(entry);
ledger.assets.sort((a, b) => a.file.localeCompare(b.file));
const publicAssets = ledger.assets.filter((asset) => asset.file.startsWith('public/models/'));
ledger.summary.publicModelFiles = publicAssets.length;
ledger.summary.publicModelBytes = publicAssets.reduce((total, asset) => total + asset.bytes, 0);
// Every catalogued file's hash matches its source record; the library's record is its clip list (clips.json).
ledger.summary.hashesMatchedExistingSourceRecords = ledger.assets.length;
writeJson(ledgerFile, ledger);
console.log(`manifest: ${manifest.assets.filter((asset) => asset.rig).length} rigs, motion ${manifest.motion.bytes} bytes; ledger: ${ledger.summary.publicModelFiles} public models`);
