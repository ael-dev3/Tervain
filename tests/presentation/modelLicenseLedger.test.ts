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

  it('classifies every Meshy source, derived GLB and generated rig as Meshy Pro paid-plan output', () => {
    const meshy = Object.entries(ledger.sources as Record<string, { generationService: string; license: Record<string, unknown> }>)
      .filter(([, source]) => source.generationService === 'Meshy');
    expect(meshy.length).toBeGreaterThan(0);
    for (const [id, source] of meshy) {
      expect(source.license.evidenceStatus, id).toBe('meshy-paid-plan-output');
      expect(source.license.plan, id).toBe('Meshy Pro (paid)');
      expect(source.license.confirmedAt, id).toBe('2026-10-09');
      expect(source.license.confirmation, id).toBe('Confirmed by the project owner, 9 October 2026: generated under Meshy Pro.');
      expect(source.license.terms, id).toMatch(/meshy\.ai\/terms-of-use.*2026-09-19.*section 3\.2/);
      expect(source.license.notApplicable, id).toMatch(/CC BY 4\.0.*CC0/);
      expect(source.license.spdx, id).toBeNull();
    }
    const meshyIds = new Set(meshy.map(([id]) => id));
    const publicFiles = ledger.assets.filter((asset: { file: string }) => asset.file.startsWith('public/models/'));
    for (const asset of publicFiles) {
      expect(meshyIds.has(asset.sourceId), asset.file).toBe(true);
      expect(asset.license.evidenceStatus, asset.file).toBe('meshy-paid-plan-output');
      expect(asset.license.plan, asset.file).toBe('Meshy Pro (paid)');
    }
    for (const rig of ledger.generatedRigs) expect(ledger.sources[rig.sourceId].license.evidenceStatus, rig.file).toBe('meshy-paid-plan-output');
    expect(JSON.stringify(ledger)).not.toContain('pending-source-classification');
    expect(ledger.serviceRules).toMatchObject({ termsUpdated: '2026-09-19', plan: 'Meshy Pro (paid)', confirmedAt: '2026-10-09' });
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
    expect(ledger.resolutionRequired.join(' ')).toMatch(/Mixamo.*Warpkeep/s);
  });

  it('states the Meshy Pro classification in every distributed credit', () => {
    for (const file of ['public/model-licenses.html', 'public/third-party-notices.txt', 'NOTICE', 'docs/engineering/model-licenses.md']) {
      const text = readFileSync(join(root, file), 'utf8');
      expect(text, file).toMatch(/Meshy Pro/);
      expect(text, file).toMatch(/9 October 2026/);
      expect(text, file).not.toMatch(/plan evidence is pending|classification (is )?(remains )?pending/i);
    }
    expect(readFileSync(join(root, 'public/model-licenses.html'), 'utf8')).toContain('created with <a href="https://www.meshy.ai/">Meshy</a>');
    expect(ledger.credit).toMatch(/^Original-game imported models created with Meshy/);
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
