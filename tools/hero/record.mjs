#!/usr/bin/env node
/**
 * Record the wanderer's Meshy 7.1 body (A74) in the model ledger: node tools/hero/record.mjs
 *
 * Adds the source record of the Meshy multi-image-to-3D result (wanderer-meshy71), points
 * public/models/hero/weathered-wanderer-hero-sealed.glb at it with its new size and hash, notes on the A45 animated
 * source that its skeleton and clips are what the file still carries, refreshes the ledger's totals, and then applies the
 * provenance classification (tools/model-ledger/classify-meshy.mjs; the evidence is in tools/model-ledger/meshy.mjs).
 * Run after tools/hero/rework-hero.mjs.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeLedger } from '../model-ledger/meshy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ledgerPath = path.join(root, 'public/model-licenses.json');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const file = 'public/models/hero/weathered-wanderer-hero-sealed.glb';
const bytes = fs.readFileSync(path.join(root, file));
const SOURCE_ID = 'wanderer-meshy71';

ledger.sources[SOURCE_ID] = {
  ...ledger.sources[SOURCE_ID],
  filename: 'hero-01a120c8.glb (Meshy multi-image to 3D result, task 01a120c8-22b6-72d4-8c60-2b2451b7edfd)',
  sha256: '04c507511c15e0db71ef87b24573a8969e18853ba2172d6dca65b9bc591886eb',
  sourceRecord: 'https://github.com/ael-dev3/Tervain/blob/main/docs/engineering/main-hero-assets.json',
  sourceAssetUrl: null,
  recordedSupplier: 'Ael',
  creator: 'Generated with Meshy (multi-image to 3D, meshy-7.1) on the owner\'s account',
  generationService: 'Meshy',
  credit: 'The Weathered Wanderer: Meshy 7.1 multi-image to 3D from renders of the previous wanderer, fitted to his rig for Tervain.',
  changes: 'Scaled to 1.899 m, stood on the floor and centred on the previous body; reduced from 435,562 to 149,974 triangles with UV seams kept; skinned to the A45 skeleton by transferring its weights from the nearest surface, with hands skinned from their finger chains and the skull held on the head joint; textures reduced to 2048 px (colour WebP), roughness floored at 0.7 (tools/hero/rework-hero.mjs).',
  separateRights: [{
    component: 'A45 Mixamo-named skeleton and animation clips the shipped file carries (source wanderer-animated)',
    evidenceStatus: 'pending-source-rights',
    note: 'Recorded under wanderer-animated; not covered by this source\'s generation record.',
  }],
};
const entry = {
  file,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  embeddedCopyright: null,
  embeddedCcDeclaration: false,
  externalDependencies: [],
  scope: 'original-game-model-catalog',
  sourceId: SOURCE_ID,
  license: null, // set by the classifier below
  modified: true,
};
const previous = ledger.assets.find((asset) => asset.file === file);
ledger.assets = ledger.assets.filter((asset) => asset.file !== file);
ledger.assets.push(entry);
ledger.assets.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
const animated = ledger.sources['wanderer-animated'];
animated.changes = animated.changes.replace(
  /The game draws a rebuilt copy \(A69\):.*$/,
  'Since A74 the game draws the Meshy 7.1 body (source wanderer-meshy71) skinned to this skeleton with these clips; from A69 until then it drew the approved 49,500-triangle mesh of the same character, because this reduction opens into cracks when animated.',
);
// The same file in place: the totals move by its change in size only.
ledger.summary.publicModelBytes += entry.bytes - (previous?.bytes ?? 0);
if (!previous) { ledger.summary.publicModelFiles++; ledger.summary.hashesMatchedExistingSourceRecords++; }
writeLedger(ledgerPath, ledger);
execFileSync(process.execPath, [path.join(root, 'tools/model-ledger/classify-meshy.mjs')], { stdio: 'inherit', cwd: root });
console.log(`ledger: ${ledger.summary.publicModelFiles} public models, ${ledger.summary.publicModelBytes} bytes; ${entry.file} ${entry.bytes} ${entry.sha256}`);
