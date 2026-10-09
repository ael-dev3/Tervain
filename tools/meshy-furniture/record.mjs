#!/usr/bin/env node
/**
 * Records the prepared furniture (A66) in the distributed model ledger (public/model-licenses.json): one source per
 * piece (the Meshy text-to-3D result it was prepared from) and the shipped file with its size and hash.
 *
 *   node tools/meshy-furniture/record.mjs        after tools/prepare-meshy-furniture.py
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MESHY_RIGHTS_BOUNDARY, meshyProAssetLicense, meshyProLicense, writeLedger } from '../model-ledger/meshy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/models/furniture/manifest.json'), 'utf8'));

const ledgerFile = path.join(ROOT, 'public/model-licenses.json');
const ledger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
for (const id of Object.keys(ledger.sources)) if (id.startsWith('furniture-')) delete ledger.sources[id];
ledger.assets = ledger.assets.filter((asset) => !asset.file.startsWith('public/models/furniture/'));
for (const piece of manifest.pieces) {
  const sourceId = `furniture-${piece.id}`;
  ledger.sources[sourceId] = {
    filename: `Meshy text-to-3D result ${piece.source.refineTask}.glb`,
    sha256: piece.source.sourceSha256,
    sourceRecord: 'https://github.com/ael-dev3/Tervain/blob/main/public/models/furniture/manifest.json',
    sourceAssetUrl: null,
    recordedSupplier: 'Ael',
    creator: 'Generated with the Meshy API (text to 3D) on the owner\'s account',
    generationService: 'Meshy',
    license: meshyProLicense(),
    credit: `Interior furniture (${piece.id}): Meshy text to 3D from a written description, prepared for Tervain.`,
    changes: 'Turned to face into the room, scaled to its size, centred on its footprint and stood on the floor; colour, normal and metal/roughness maps reduced and re-encoded, non-metal roughness raised (tools/prepare-meshy-furniture.py). Geometry and UVs otherwise as generated.',
    rightsBoundary: MESHY_RIGHTS_BOUNDARY,
  };
  ledger.assets.push({
    file: `public/models/furniture/${piece.file}`, bytes: piece.bytes, sha256: piece.sha256,
    embeddedCopyright: null, embeddedCcDeclaration: false, externalDependencies: [], scope: 'original-game-model-catalog',
    sourceId, license: meshyProAssetLicense(), modified: true,
  });
}
ledger.assets.sort((a, b) => a.file.localeCompare(b.file));
const publicAssets = ledger.assets.filter((asset) => asset.file.startsWith('public/models/'));
ledger.summary.publicModelFiles = publicAssets.length;
ledger.summary.publicModelBytes = publicAssets.reduce((total, asset) => total + asset.bytes, 0);
// Every catalogued file's hash matches its source record; the furniture's record is its manifest.
ledger.summary.hashesMatchedExistingSourceRecords = ledger.assets.length;
writeLedger(ledgerFile, ledger);
console.log(`ledger: ${manifest.pieces.length} furniture pieces; ${ledger.summary.publicModelFiles} public models, ${ledger.summary.publicModelBytes} bytes`);
