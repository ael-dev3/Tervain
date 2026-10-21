import * as THREE from 'three';
import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { createMeshyNpcRig } from '../../src/presentation/meshynpcs';
import { residentMotionLibrary } from '../../src/presentation/npc/residentMotion';
import { loadResident, loadResidentMotion, loadResidentRigData } from './residentFixtures';

it.each([
  ['rillford-reeve', '5e817e9e3aaec2049efedb1da2581af786d5c1ea0f21eee39264a810199fb831'],
  ['ash-recorder', 'ede40f8605065bcc16448bfcf1dd3165dabb2ec91d8c3af2f049e024373661d5'],
])('avoids repeat hand-support projections while preserving %s contacts', async (id, hash) => {
  const { source, entry } = await loadResident(id), data = await loadResidentRigData(id);
  const library = residentMotionLibrary(await loadResidentMotion());
  const counts = new Map<THREE.Vector3, number>(), dot = THREE.Vector3.prototype.dot;
  const spy = vi.spyOn(THREE.Vector3.prototype, 'dot').mockImplementation(function(this: THREE.Vector3, direction: THREE.Vector3) {
    counts.set(direction, (counts.get(direction) ?? 0) + 1);
    return dot.call(this, direction);
  });
  try {
    const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, {}, { data, library, build: 'man', seed: 7, fighter: false });
    const hands = (rig.resident as unknown as { options: { contacts: { hands: unknown } } }).options.contacts.hands;
    // Golden contacts include every retained vertex, centre, finger axis and palm axis from the original assets.
    expect(createHash('sha256').update(JSON.stringify(hands)).digest('hex')).toBe(hash);
    // A native hand scans up to 676,320 candidate/direction pairs, not twice that many projections.
    expect(Math.max(...counts.values())).toBeLessThan(750_000);
    rig.root.traverse(object => {
      const mesh = object as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) { mesh.geometry.dispose(); mesh.skeleton.dispose(); }
    });
  } finally { spy.mockRestore(); }
}, 20_000);
