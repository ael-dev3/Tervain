import * as THREE from 'three';
import { expect, it } from 'vitest';
import { growTwigs, twigTriangles, woodAnchor } from '../../src/presentation/canopy';

it('reconnects an orphaned child root without changing its planned triangle budget or target', () => {
  const wood = new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2);
  const twig = { from: new THREE.Vector3(3, 3, 0), to: new THREE.Vector3(4, 3, 0) };
  const original = [twig.from.toArray(), twig.to.toArray()];
  const before = growTwigs(wood, [twig]), after = growTwigs(wood, [twig], true);
  try {
    expect(before.index!.array).toEqual(after.index!.array);
    expect(after.index!.count - wood.index!.count).toBe(twigTriangles([twig]) * 3);
    const base = wood.getAttribute('position').count;
    const centre = (g: THREE.BufferGeometry) => new THREE.Vector3().add(new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), base))
      .add(new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), base + 1))
      .add(new THREE.Vector3().fromBufferAttribute(g.getAttribute('position'), base + 2)).divideScalar(3);
    const anchor = woodAnchor(wood), hit = new THREE.Vector3();
    expect(anchor(centre(before), hit)).toBeGreaterThan(3);
    expect(anchor(centre(after), hit)).toBeLessThan(.12);
    expect([twig.from.toArray(), twig.to.toArray()]).toEqual(original);
    const position = after.getAttribute('position');
    // The target ring retains its original centre even when the graft becomes longer than the bend threshold.
    const target = new THREE.Vector3();
    for (let i = 0; i < 3; i++) target.add(new THREE.Vector3().fromBufferAttribute(position, base + 4 + i));
    expect(target.divideScalar(3).distanceTo(twig.to)).toBeLessThan(1e-6);
  } finally { wood.dispose(); before.dispose(); after.dispose(); }
});

it('preserves supported plans exactly and never turns a skipped zero-length plan into new triangles', () => {
  const wood = new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2);
  const plans = [{ from: new THREE.Vector3(0, 0, 0), to: new THREE.Vector3(1, 1, 0) },
    { from: new THREE.Vector3(4, 4, 0), to: new THREE.Vector3(4, 4, 0) }];
  const before = growTwigs(wood, plans), after = growTwigs(wood, plans, true);
  try {
    expect(before.index!.array).toEqual(after.index!.array);
    for (const name of Object.keys(before.attributes)) expect(before.getAttribute(name).array).toEqual(after.getAttribute(name).array);
  } finally { wood.dispose(); before.dispose(); after.dispose(); }
});
