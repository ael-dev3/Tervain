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

  it('gives every Meshy source exactly one evidenced provenance classification, and its files the matching license', () => {
    type Source = { generationService: string; creator: string; license: Record<string, unknown>;
      provenance: { classification: string; evidence: string; creator?: string; listingUrl?: string | null } };
    const sources = ledger.sources as Record<string, Source>;
    const meshy = Object.entries(sources).filter(([, source]) => source.generationService === 'Meshy');
    expect(meshy.length).toBeGreaterThan(0);
    const status: Record<string, string> = {
      'ael-generated-meshy-pro': 'meshy-paid-plan-output',
      'meshy-community-download': 'meshy-community-cc0',
      unresolved: 'unresolved-meshy-provenance',
    };
    for (const [id, source] of meshy) {
      const { classification, evidence } = source.provenance;
      expect(Object.keys(status), id).toContain(classification);
      expect(evidence, id).toMatch(/\S{20,}|\w+ \w+ \w+/);
      expect(source.license.evidenceStatus, id).toBe(status[classification]);
      expect(source.license.terms, id).toMatch(/meshy\.ai\/terms-of-use.*2026-09-19/);
      if (classification === 'ael-generated-meshy-pro') {
        expect(source.license.plan, id).toBe('Meshy Pro (paid)');
        expect(evidence, id).toMatch(/task id/);
      }
      if (classification === 'meshy-community-download') {
        expect(source.license.spdx, id).toBe('CC0-1.0');
        expect(typeof source.license.creator, id).toBe('string');
        expect(source.license.creator, id).toBeTruthy();
        expect(source.license, id).toHaveProperty('listingUrl');
        expect(source.creator, id).toBe(source.license.creator);
      }
      if (classification === 'unresolved') {
        expect(source.license.spdx, id).toBeNull();
        expect(source.license.creator, id).toBe('creator not recorded');
        expect(ledger.toConfirm.map((item: { sourceId: string }) => item.sourceId), id).toContain(id);
      }
    }
    // Only output with task ids from the project's own Meshy calls is project-generated.
    const generated = meshy.filter(([, source]) => source.provenance.classification === 'ael-generated-meshy-pro').map(([id]) => id).sort();
    expect(generated.every(id => id.startsWith('furniture-') || id === 'resident-rigs' || id === 'resident-motion')).toBe(true);
    expect(generated).toEqual(expect.arrayContaining(['resident-motion', 'resident-rigs', 'furniture-bed']));
    const publicFiles = ledger.assets.filter((asset: { file: string }) => asset.file.startsWith('public/models/'));
    for (const asset of publicFiles) {
      const source = sources[asset.sourceId];
      expect(source?.generationService, asset.file).toBe('Meshy');
      expect(asset.license.evidenceStatus, asset.file).toBe(status[source!.provenance.classification]);
    }
    for (const rig of ledger.generatedRigs) expect(sources[rig.sourceId]!.provenance.classification, rig.file).toBe('ael-generated-meshy-pro');
    expect(ledger.toConfirm.length).toBe(meshy.filter(([, source]) => source.provenance.classification === 'unresolved').length);
    expect(ledger.serviceRules).toMatchObject({ termsUpdated: '2026-09-19' });
    expect(ledger.serviceRules.communityOutput).toMatch(/Creative Commons Zero \(CC0\) 1\.0.*Attribution-NonCommercial 4\.0/);
    expect(ledger.serviceRules.sections).toEqual(expect.arrayContaining(['3.1', '3.2', '3.3', '7.2']));
  });

  it('keeps the records the Meshy plan does not cover separate and unresolved', () => {
    const hero = ledger.sources['wanderer-animated'];
    expect(hero.separateRights).toEqual([expect.objectContaining({ evidenceStatus: 'pending-source-rights', component: expect.stringMatching(/Mixamo/) })]);
    const archive = ledger.assets.filter((asset: { file: string }) => asset.file.startsWith('assets/warpkeep/'));
    expect(archive.length).toBe(ledger.summary.archivedWarpkeepFiles);
    for (const asset of archive) {
      expect(asset.license.spdx, asset.file).toBe('LicenseRef-Warpkeep-Provenance-Required');
      expect(asset.license.evidenceStatus, asset.file).not.toBe('meshy-paid-plan-output');
    }
    expect(ledger.resolutionRequired.join(' ')).toMatch(/unresolved supplied Meshy sources.*Mixamo.*Warpkeep/s);
  });

  it('credits Meshy Community creators and makes no blanket Meshy Pro claim in every distributed credit', () => {
    for (const file of ['public/model-licenses.html', 'public/third-party-notices.txt', 'NOTICE', 'docs/engineering/model-licenses.md']) {
      const text = readFileSync(join(root, file), 'utf8').replace(/\s+/g, ' ');
      expect(text, file).toMatch(/Meshy Community/);
      expect(text, file).toMatch(/creator not recorded/i);
      expect(text, file).toMatch(/CC0/);
      expect(text, file).toMatch(/CC BY-NC 4\.0/);
      expect(text, file).toMatch(/clearance is unsettled/i);
      expect(text, file).not.toMatch(/all Meshy output in the project was generated under Meshy Pro|every Meshy-generated asset in the project .{0,120}Meshy Pro|Community CC0 branches do not apply/is);
    }
    expect(readFileSync(join(root, 'public/model-licenses.html'), 'utf8')).toContain('created with <a href="https://www.meshy.ai/">Meshy</a>');
    expect(ledger.credit).toMatch(/^Original-game imported models created with Meshy/);
    expect(ledger.credit).toMatch(/Meshy Community/);
    expect(ledger.credit).not.toMatch(/under a Meshy Pro paid plan/);
  });

  it('makes no commercial-clearance claim in the distributed credits', () => {
    for (const file of ['public/model-licenses.html', 'public/model-licenses.json', 'public/third-party-notices.txt', 'NOTICE', 'docs/engineering/model-licenses.md']) {
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
