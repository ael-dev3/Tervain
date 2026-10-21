import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { repairHeadWeights, repairHeadWeightsSteps } from '../../src/presentation/npc/headWeights';
import { loadResident, loadResidentRigData, residentMesh } from './residentFixtures';

it('limits each head-repair resume and preserves complete shipped skin weights', async () => {
  for (const id of ['quarry-foreman', 'maintenance-worker']) {
    const { source } = await loadResident(id), data = await loadResidentRigData(id);
    const position = residentMesh(source.scene).geometry.getAttribute('position');
    let reads = 0, largest = 0;
    const original = position.getX.bind(position);
    position.getX = v => { reads++; return original(v); };
    const steps = repairHeadWeightsSteps(data, position);
    for (;;) {
      reads = 0;
      const n = steps.next(); largest = Math.max(largest, reads);
      if (!n.done) continue;
      const digest = createHash('sha256').update(n.value.joints).update(n.value.weights).digest('hex');
      expect(digest).toBe(id === 'quarry-foreman'
        ? '998cf01b014d487f38aea01c996950fb16d5c81e6dcf8dfb1272aeaa3baa926e'
        : 'bea4210ca3e342dbcb62a2ad66997df661ff90e220131483ecfd938b263b0c79');
      expect(largest).toBeLessThanOrEqual(512);
      expect(repairHeadWeights(data, position)).toBe(n.value);
      break;
    }
  }
}, 120_000);

it('does not cache or mutate a partially repaired skin', async () => {
  const { source } = await loadResident('maintenance-worker'), data = await loadResidentRigData('maintenance-worker');
  const position = residentMesh(source.scene).geometry.getAttribute('position');
  const joints = data.joints.slice(), weights = data.weights.slice();
  const interrupted = repairHeadWeightsSteps(data, position);
  expect(interrupted.next().done).toBe(false);
  interrupted.return(data);
  expect(data.joints).toEqual(joints); expect(data.weights).toEqual(weights);
  const complete = repairHeadWeights(data, position);
  expect(complete.vertices).toBe(data.vertices);
  expect(complete.weights).not.toEqual(weights);
});

it('shares the completed repair when two iterators start before either finishes', async () => {
  const { source } = await loadResident('quarry-foreman'), data = await loadResidentRigData('quarry-foreman');
  const position = residentMesh(source.scene).geometry.getAttribute('position');
  const first = repairHeadWeightsSteps(data, position), second = repairHeadWeightsSteps(data, position);
  expect(first.next().done).toBe(false); expect(second.next().done).toBe(false);
  let a, b;
  for (;;) { const n = first.next(); if (n.done) { a = n.value; break; } }
  for (;;) { const n = second.next(); if (n.done) { b = n.value; break; } }
  expect(b).toBe(a);
});
