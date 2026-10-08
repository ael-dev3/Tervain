import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MODEL_FILES } from '../../src/presentation/assets/modelFiles';

const models = fileURLToPath(new URL('../../public/models/', import.meta.url));
const glbs = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? glbs(join(dir, entry.name)) : entry.name.endsWith('.glb') ? [join(dir, entry.name)] : []);

describe('the model file table (A68)', () => {
  it('lists every GLB under public/models with its exact size and SHA-256 (run `node tools/model-files.mjs` after changing a model)', () => {
    const files = glbs(models).map((file) => relative(models, file).split(sep).join('/')).sort();
    expect(Object.keys(MODEL_FILES).sort()).toEqual(files);
    for (const file of files) {
      const data = readFileSync(join(models, file));
      expect(MODEL_FILES[file], file).toEqual([createHash('sha256').update(data).digest('hex'), data.length]);
    }
  }, 120_000);
});
