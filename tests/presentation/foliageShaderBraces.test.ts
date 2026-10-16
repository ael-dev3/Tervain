import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('foliage shader source', () => {
  it('keeps every GLSL template block-balanced so a merge cannot leave a leaf program uncompilable', () => {
    const source = readFileSync('src/presentation/foliage/foliageMaterial.ts', 'utf8');
    const templates = [...source.matchAll(/\/\* glsl \*\/ `([\s\S]*?)`;/g)].map((m) => m[1]!.replace(/\/\/[^\n]*/g, ''));
    expect(templates.length).toBeGreaterThan(3);
    for (const body of templates) {
      const open = (body.match(/\{/g) ?? []).length, close = (body.match(/\}/g) ?? []).length;
      expect(open, body.slice(0, 60)).toBe(close);
    }
  });
});
