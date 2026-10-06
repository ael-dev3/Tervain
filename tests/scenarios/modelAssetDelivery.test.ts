import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { artifactBytes, finalizePagesModelArtifact, omitPagesModelCopies, PAGES_SITE_BYTE_LIMIT, pagesModelArtifactTarget, productionModelAssetBase } from '../../tools/modelAssetDelivery';

const SHA = '0123456789abcdef0123456789abcdef01234567';

describe('hosted production model policy', () => {
  it('activates only for a production Actions build with a full immutable revision', () => {
    const env = { GITHUB_ACTIONS: 'true', GITHUB_SHA: SHA };
    expect(productionModelAssetBase('build', 'production', env)).toBe(`https://raw.githubusercontent.com/ael-dev3/Tervain/${SHA}/public/models/`);
    expect(productionModelAssetBase('build', 'production', { ...env, GITHUB_SHA: SHA.toUpperCase() })).toContain(SHA);
    for (const [command, mode, settings] of [
      ['serve', 'development', env], ['serve', 'production', env], ['build', 'development', env],
      ['build', 'production', { GITHUB_SHA: SHA }], ['build', 'production', { GITHUB_ACTIONS: 'false', GITHUB_SHA: SHA }],
    ] as const) expect(productionModelAssetBase(command, mode, settings)).toBe('');
  });

  it('fails before publishing models if the production SHA is missing or malformed', () => {
    for (const value of [undefined, '', 'main', SHA.slice(0, 7), `${SHA}0`, 'z'.repeat(40)]) {
      expect(() => productionModelAssetBase('build', 'production', { GITHUB_ACTIONS: 'true', GITHUB_SHA: value })).toThrow(/full 40-character GITHUB_SHA/);
    }
  });
});

describe('Pages model artifact scope', () => {
  let root = '';
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'tervain-model-delivery-'));
    for (const directory of ['public/models', 'dist/models', 'dist/gothic3', 'dist/assets']) fs.mkdirSync(path.join(root, directory), { recursive: true });
    fs.writeFileSync(path.join(root, 'public/models/source.glb'), Buffer.from([0, 1, 2, 3]));
    fs.writeFileSync(path.join(root, 'dist/models/source.glb'), Buffer.from([0, 1, 2, 3]));
    fs.writeFileSync(path.join(root, 'dist/gothic3/reference.bin'), Buffer.from([8, 9]));
    fs.writeFileSync(path.join(root, 'dist/assets/game.js'), 'original game');
  });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it('omits only copied models and leaves source bytes and separate study routes untouched', () => {
    const source = fs.readFileSync(path.join(root, 'public/models/source.glb'));
    const study = fs.readFileSync(path.join(root, 'dist/gothic3/reference.bin'));
    expect(finalizePagesModelArtifact(root, 'dist')).toEqual({ removed: 4, bytes: 15 });
    expect(fs.existsSync(path.join(root, 'dist/models'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'public/models/source.glb'))).toEqual(source);
    expect(fs.readFileSync(path.join(root, 'dist/gothic3/reference.bin'))).toEqual(study);
    expect(fs.readFileSync(path.join(root, 'dist/assets/game.js'), 'utf8')).toBe('original game');
    expect(omitPagesModelCopies(root, 'dist')).toBe(0);
  });

  it('rejects a source directory or an output outside this project before deleting anything', () => {
    for (const outDir of ['public', 'public/models', '..', '../dist', path.join(root, 'another-output')]) {
      expect(() => omitPagesModelCopies(root, outDir)).toThrow(/only in the project dist/);
    }
    expect(fs.readFileSync(path.join(root, 'public/models/source.glb'))).toEqual(Buffer.from([0, 1, 2, 3]));
    expect(fs.existsSync(path.join(root, 'dist/models/source.glb'))).toBe(true);
  });

  it('refuses a symlinked model directory which points back to source files', () => {
    fs.rmSync(path.join(root, 'dist/models'), { recursive: true });
    fs.symlinkSync(path.join(root, 'public/models'), path.join(root, 'dist/models'), 'dir');
    expect(() => pagesModelArtifactTarget(root, 'dist')).toThrow(/real dist\/models/);
    expect(fs.existsSync(path.join(root, 'public/models/source.glb'))).toBe(true);
  });

  it('refuses a symlinked output directory or symlinks inside the artifact', () => {
    fs.rmSync(path.join(root, 'dist'), { recursive: true });
    fs.symlinkSync(path.join(root, 'public'), path.join(root, 'dist'), 'dir');
    expect(() => omitPagesModelCopies(root, 'dist')).toThrow(/real project dist/);
    expect(() => artifactBytes(root)).toThrow(/must not contain symlinks/);
    expect(fs.existsSync(path.join(root, 'public/models/source.glb'))).toBe(true);
  });

  it('fails the size guard if the remaining artifact is still too large', () => {
    const sparse = path.join(root, 'dist/assets/oversize.bin');
    fs.closeSync(fs.openSync(sparse, 'w'));
    fs.truncateSync(sparse, PAGES_SITE_BYTE_LIMIT + 1);
    expect(() => finalizePagesModelArtifact(root, 'dist')).toThrow(/after model omission/);
    expect(fs.existsSync(path.join(root, 'public/models/source.glb'))).toBe(true);
  });
});
