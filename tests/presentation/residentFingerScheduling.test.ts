import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { planResidentFingersSteps } from '../../src/presentation/npc/residentFingers';
import { loadResident, loadResidentRigData, residentMesh } from './residentFixtures';

it('bounds surface triangle reads per resume while preserving the complete shipped finger plan', async () => {
  for (const id of ['quarry-foreman', 'maintenance-worker']) {
    const { source } = await loadResident(id), data = await loadResidentRigData(id);
    const geometry = residentMesh(source.scene).geometry, raw = geometry.index!.array;
    let reads = 0, largest = 0;
    const index = new Proxy(raw, { get(target, key) {
      if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
      return Reflect.get(target, key, target);
    } });
    const steps = planResidentFingersSteps(data, geometry.getAttribute('position').array, index);
    for (;;) {
      reads = 0;
      const next = steps.next(); largest = Math.max(largest, reads);
      if (!next.done) continue;
      const digest = createHash('sha256').update(JSON.stringify(next.value.hands))
        .update(new Uint8Array(next.value.joints.buffer)).update(new Uint8Array(next.value.weights.buffer)).digest('hex');
      expect(digest).toBe(id === 'quarry-foreman'
        ? '46ad58308adb4b6af328d8cbb937904651129cc177af184a214b13cfb09cb401'
        : 'cf9efbca20dc232accd55db03291458584245929667f14eba5065f8fd81cc96b');
      expect.soft(largest).toBeLessThanOrEqual(1536);
      break;
    }
  }
}, 120_000);
