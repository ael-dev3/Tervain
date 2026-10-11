import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error a plain .mjs tool without type declarations
import { readGlbParts, repairNormals } from '../../tools/repair-pine-normals.mjs';

describe('the solitary pine bark (A97)', () => {
  it('has no vertex normal pointing against its faces, on either close level', () => {
    for (const file of ['solitary-pine-under-10k.glb', 'solitary-pine-mid.glb']) {
      const { disagreeing, vertices } = repairNormals(readGlbParts(fs.readFileSync(`public/models/flora/${file}`)));
      expect(vertices, file).toBeGreaterThan(1000);
      expect(disagreeing, file).toBe(0);
    }
  });
});
