import { describe, expect, it } from 'vitest';
import { GRASS_BLADE_GLSL } from '../../src/presentation/grass/grassMaterial';

// Evaluate the actual projected-width declaration against the geometry's across-blade span.
// This fails when the brightness estimate uses nominal clump width instead of the rendered width.
const declaration = (name: string) => {
  const expression = GRASS_BLADE_GLSL.match(new RegExp(`float ${name} = ([^;]+);`))?.[1];
  if (!expression) throw Error(`Missing shader declaration ${name}`);
  return expression.replace(/\bmin\(/g, 'Math.min(').replace(/\babs\(/g, 'Math.abs(');
};
const width = new Function('gW', 'gNear', 'gProfile', 'gPxPerM', 'gFaceDot', 'gSafeDist',
  // Include nominal inputs so the previous production declaration is evaluated rather than rejected syntactically.
  'uClump', 'gR3', 'gSizeComp', `return ${declaration('gBladePx')};`) as (...args: unknown[]) => number;
const head = new Function('gBladePx', 'gStem', 'gFlower', `return ${declaration('gHeadPx')};`) as (...args: number[]) => number;

describe('grass brightness footprint follows rendered geometry', () => {
  it.each([
    { name: 'resolved blade', presence: 1, near: 1, profile: 1, stem: 0 },
    { name: 'tapered tip', presence: 1, near: 1, profile: 0.01, stem: 0 },
    { name: 'LOD tail', presence: 0.01, near: 1, profile: 1, stem: 0 },
    { name: 'near-plane narrowing', presence: 1, near: 0.01, profile: 1, stem: 0 },
    { name: 'seed stalk', presence: 1, near: 1, profile: 0.22, stem: 1 },
    { name: 'seed head', presence: 1, near: 1, profile: 2.52, stem: 1 },
  ])('$name reports its actual projected span', ({ presence, near, profile, stem }) => {
    const nominal = 0.04, gW = nominal * presence * (1 - 0.72 * stem), pxPerM = 250;
    const edge = new Function('gEdge', 'gW', 'gNear', 'gProfile',
      `return ${GRASS_BLADE_GLSL.match(/gAcross \* \((gEdge \*[^;]+)\);/)?.[1] ?? 'NaN'};`) as (...a: number[]) => number;
    const span = edge(1, gW, near, profile) - edge(-1, gW, near, profile);
    const projected = width(gW, near, profile, pxPerM, 1, 1, { y: nominal }, 0, 1 / 0.6);
    expect(projected).toBeCloseTo(span * pxPerM, 10);
    if (stem) expect(head(projected, stem, 0)).toBeCloseTo(projected, 10);
    if (span * pxPerM < 0.8) expect(projected).toBeLessThan(0.8);
  });
});
