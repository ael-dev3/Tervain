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

  it('gives every shipped GLB a ledger entry with a recorded source, regardless of its current bytes', () => {
    const recorded = new Map<string, { sourceId?: string }>(ledger.assets.map((asset: { file: string }) => [asset.file, asset]));
    for (const file of glbs('public/models')) {
      const sourceId = recorded.get(file)?.sourceId;
      expect(sourceId, `${file} has no ledger entry`).toBeTruthy();
      expect(ledger.sources[sourceId!], file).toBeDefined();
      expect(ledger.sources[sourceId!].license, file).toBeDefined();
    }
  });

  it('records every generated resident rig with its Meshy task', () => {
    const rigs = readdirSync(join(root, 'public/models/npcs/rigs')).filter(name => name.endsWith('.json'))
      .map(name => `public/models/npcs/rigs/${name}`).sort();
    expect(ledger.generatedRigs.map((rig: { file: string }) => rig.file).sort()).toEqual(rigs);
    for (const rig of ledger.generatedRigs) {
      const record = JSON.parse(readFileSync(join(root, rig.file), 'utf8'));
      expect(rig.meshyRigTask, rig.file).toBe(record.meshy.rigTask);
      expect(rig.model, rig.file).toBe(`public/models/npcs/${record.model.file}`);
      expect(ledger.sources[rig.sourceId]?.generationService, rig.file).toBe('Meshy');
    }
  });

  it('makes no commercial-clearance claim in the distributed credits', () => {
    for (const file of ['public/model-licenses.html', 'public/model-licenses.json', 'public/third-party-notices.txt', 'NOTICE']) {
      const text = readFileSync(join(root, file), 'utf8');
      expect(text, file).not.toMatch(/cleared for commercial|commercially cleared|commercial clearance (is )?(granted|established|confirmed)\b(?! is not)/i);
    }
  });

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
