import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const ledger = JSON.parse(readFileSync(join(root, 'public/model-licenses.json'), 'utf8'));
const glbs = (directory: string): string[] => readdirSync(join(root, directory), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? glbs(`${directory}/${entry.name}`)
    : entry.name.endsWith('.glb') ? [`${directory}/${entry.name}`] : []);

describe('distributed model source notices', () => {
  // Hashing every delivered model is bound by the disk, which other workers parsing the same models share.
  it('covers every original-game and archived GLB with an accurate binary fingerprint', () => {
    const actual = [...glbs('public/models'), ...glbs('assets/warpkeep')].sort();
    expect(ledger.assets.map((asset: { file: string }) => asset.file).sort()).toEqual(actual);
    for (const asset of ledger.assets) {
      const bytes = readFileSync(join(root, asset.file));
      expect(bytes.length, asset.file).toBe(asset.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), asset.file).toBe(asset.sha256);
      if (asset.file.startsWith('public/models/')) expect(ledger.sources[asset.sourceId], asset.file).toBeDefined();
    }
    expect(ledger.summary.publicModelFiles).toBe(glbs('public/models').length);
    expect(ledger.summary.archivedWarpkeepFiles).toBe(glbs('assets/warpkeep').length);
  }, 60_000);

  it('retains the supplied animals, their exact source records and modification credit', () => {
    const record = JSON.parse(readFileSync(join(root, 'docs/engineering/meshy-animal-assets.json'), 'utf8'));
    expect(record.animals).toHaveLength(19);
    for (const animal of record.animals) {
      const source = ledger.sources[`animal-${animal.id}`];
      expect(source?.filename).toBe(animal.sourceFilename);
      expect(source?.sha256).toBe(animal.sourceSha256);
      expect(source?.generationService).toBe('Meshy');
      expect(source?.changes).toMatch(/rig/i);
      const model = ledger.assets.find((asset: { file: string }) => asset.file === `public/models/animals/${animal.filename}`);
      expect(model?.sourceId).toBe(`animal-${animal.id}`);
      expect(model?.sha256).toBe(animal.outputSha256);
      expect(model?.modified).toBe(true);
    }
  });
});
