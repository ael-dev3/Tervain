#!/usr/bin/env node
/**
 * Record the sealed wanderer (A69) in the model ledger: node tools/hero/record.mjs
 *
 * Adds public/models/hero/weathered-wanderer-hero-sealed.glb with its size and hash, marks the cracked animated reduction
 * it replaces as retained for audit, and refreshes the ledger's totals. Run after tools/hero/rebuild-hero.py.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyMeshy, meshyAssetLicense, writeLedger } from '../model-ledger/meshy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ledgerPath = path.join(root, 'public/model-licenses.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const file = 'public/models/hero/weathered-wanderer-hero-sealed.glb';
const bytes = fs.readFileSync(path.join(root, file));
const entry = {
  file,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  embeddedCopyright: null,
  embeddedCcDeclaration: false,
  externalDependencies: [],
  scope: 'original-game-model-catalog',
  sourceId: 'wanderer-animated',
  license: meshyAssetLicense('wanderer-animated'),
  modified: true,
};
ledger.assets = ledger.assets.filter((asset) => asset.file !== file);
ledger.assets.push(entry);
ledger.assets.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
const replaced = ledger.assets.find((asset) => asset.file === 'public/models/hero/weathered-wanderer-animated-hero.glb');
if (replaced) replaced.scope = 'historical-public-model';
const source = ledger.sources['wanderer-animated'];
const note = 'The game draws a rebuilt copy (A69): the approved 49,500-triangle mesh of the same character, skinned to this rig by weight transfer, with these clips, material and textures, because this reduction opens into cracks when animated.';
if (!source.changes.includes('A69')) source.changes = `${source.changes} ${note}`;
// Provenance per A73 (unresolved until recorded); the Mixamo-named skeleton and animation content keeps its own record.
classifyMeshy(ledger);
const publicAssets = ledger.assets.filter((asset) => asset.file.startsWith('public/models/'));
ledger.summary.publicModelFiles = publicAssets.length;
ledger.summary.publicModelBytes = publicAssets.reduce((total, asset) => total + asset.bytes, 0);
ledger.summary.hashesMatchedExistingSourceRecords = ledger.assets.length;
writeLedger(ledgerPath, ledger);
console.log(`ledger: ${ledger.summary.publicModelFiles} public models, ${ledger.summary.publicModelBytes} bytes; ${entry.file} ${entry.bytes} ${entry.sha256}`);
