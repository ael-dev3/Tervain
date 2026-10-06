import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ledger = JSON.parse(readFileSync(join(root, 'public/model-licenses.json'), 'utf8'));
const receiptBytes = readFileSync(join(root, 'docs/engineering/animal-assets.json'));
const receipt = JSON.parse(receiptBytes.toString('utf8'));
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
function glbs(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? glbs(path) : entry.name.endsWith('.glb') ? [relative(root, path)] : [];
  }).sort();
}

describe('distributed model credits follow the actual supplied assets', () => {
  it('inventories every original-game and historical archive GLB with its exact bytes and SHA-256', () => {
    const actual = [...glbs(join(root, 'public/models')), ...glbs(join(root, 'assets/warpkeep'))].sort();
    expect(ledger.assets.map((row: { file: string }) => row.file).sort()).toEqual(actual);
    expect(new Set(actual).size).toBe(ledger.assets.length);
    const publicRows = ledger.assets.filter((row: { file: string }) => row.file.startsWith('public/models/'));
    const archiveRows = ledger.assets.filter((row: { scope: string }) => row.scope === 'archive-only');
    expect(publicRows).toHaveLength(87);
    expect(archiveRows).toHaveLength(209);
    expect(ledger.summary.publicModelFiles).toBe(publicRows.length);
    expect(ledger.summary.publicModelBytes).toBe(publicRows.reduce((sum: number, row: { bytes: number }) => sum + row.bytes, 0));
    expect(ledger.summary.archivedWarpkeepFiles).toBe(archiveRows.length);
    expect(ledger.summary.hashesMatchedExistingSourceRecords).toBe(ledger.assets.length);
    for (const row of ledger.assets) {
      const data = readFileSync(join(root, row.file));
      expect(data.byteLength, row.file).toBe(row.bytes);
      expect(hash(data), row.file).toBe(row.sha256);
    }
  });

  it('retains distinct source and prepared records for exactly the 18 available animals without granting a new license', () => {
    const ready = receipt.assets.filter((row: { status: string }) => row.status === 'ready');
    const animals = ledger.assets.filter((row: { file: string }) => row.file.startsWith('public/models/animals/'));
    expect(animals).toHaveLength(18);
    expect(animals.map((row: { file: string }) => row.file).sort()).toEqual(ready.map((row: { asset: { url: string } }) => `public${row.asset.url}`).sort());
    expect(animals.some((row: { file: string }) => row.file.includes('boar-c'))).toBe(false);
    expect(ledger.supplementalModelAudit.sourceRecordSha256).toBe(hash(receiptBytes));
    for (const model of ready) {
      const row = animals.find((asset: { file: string }) => asset.file === `public${model.asset.url}`);
      const source = ledger.sources[row.sourceId];
      expect(row.sha256).toBe(model.asset.sha256);
      expect(row.sourceFilename).toBe(model.source.name);
      expect(row.sourceSha256).toBe(model.source.sha256);
      expect(source.filename).toBe(model.source.name);
      expect(source.sha256).toBe(model.source.sha256);
      expect(source.sourceRecord).toMatch(/\/docs\/engineering\/animal-assets\.json$/);
      expect(row.license).toEqual({ spdx: null, version: null, evidenceStatus: 'pending-source-classification' });
      expect(source.license.evidenceStatus).toBe('pending-source-classification');
      expect(source.license.spdx).toBeNull();
      expect(row.modified).toBe(true);
      expect(row.changes).toContain('procedurally authored');
      expect(row.changes).toContain('not source animation or motion capture');
      expect(row.triangles).toBe(model.asset.triangles);
      expect(row.animations).toEqual(model.animations.map((clip: { name: string }) => clip.name));
    }
    expect(ledger.licenseFreedomExceptions.ccBy4.url).toBe('https://creativecommons.org/licenses/by/4.0/');
    expect(ledger.licenseFreedomExceptions.cc0.url).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
  });

  it('publishes matching counts, animal changes and readable source and runtime hashes in static credits', () => {
    const page = readFileSync(join(root, 'public/model-licenses.html'), 'utf8');
    const notes = readFileSync(join(root, 'docs/engineering/model-licenses.md'), 'utf8');
    expect(page).toContain('87 public GLBs');
    expect(page).toContain('53 recorded Meshy source files');
    expect(page).toContain('All 296 inventoried files');
    expect(notes).toContain('| Original-game public model catalog | 87 | 534,690,544 |');
    for (const model of receipt.assets.filter((row: { status: string }) => row.status === 'ready')) {
      expect(page).toContain(model.source.name);
      expect(page).toContain(model.source.sha256);
      expect(page).toContain(model.asset.sha256);
      expect(page).toContain(`<code>public${model.asset.url}</code>`);
    }
  });
});
