import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { planResidentFingers } from '../../src/presentation/npc/residentFingers';
import { loadResident, loadResidentRigData, residentMesh } from './residentFixtures';

it.each([
  ['village-baker', '6ff73a92ad67a3b8acb1d0e3b7abd89f09f0cab8dfa6069e113013432cd157c3'],
  ['ford-bandit-a', '90ae8159b54cb02b4c6c70c18ae608b1de057fadb6e4557f719ad3df0413b2a0'],
] as const)('scores %s hand components without repeated linear membership scans', async (id, expected) => {
  const { source } = await loadResident(id), data = await loadResidentRigData(id);
  const geometry = residentMesh(source.scene).geometry;
  const original = Array.prototype.includes;
  let numericQueries = 0;
  Array.prototype.includes = function(this: unknown[], value: unknown, fromIndex?: number) {
    if (typeof value === 'number') numericQueries++;
    return Reflect.apply(original, this, [value, fromIndex]) as boolean;
  };
  let plan;
  try { plan = planResidentFingers(data, geometry.getAttribute('position').array, geometry.index!.array); }
  finally { Array.prototype.includes = original; }
  const digest = createHash('sha256').update(JSON.stringify(plan.hands))
    .update(new Uint8Array(plan.joints.buffer)).update(new Uint8Array(plan.weights.buffer)).digest('hex');
  expect(digest).toBe(expected);
  expect(numericQueries).toBe(0);
});
