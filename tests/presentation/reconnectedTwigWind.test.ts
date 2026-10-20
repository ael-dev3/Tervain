import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import * as C from '../../src/presentation/canopy';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplates } from './meshyTreeFixture';

it('keeps a reconnected birch graft on its supporting limb while preserving tip motion', async () => {
  const templates = await meshyTreeTemplates(['verdant-sentinel']);
  const real = C.growTwigs, abandoned = new THREE.Vector3(-5.0707892141, 6.6291712046, -2.0677109921);
  let checked = false;
  const spy = vi.spyOn(C, 'growTwigs').mockImplementation((wood, twigs, reconnect) => {
    const built = real(wood, twigs, reconnect);
    const target = twigs.findIndex(t => t.from.distanceTo(abandoned) < 1e-6);
    if (!reconnect || target < 0) return built;
    const ringVertices = wood.hasAttribute('uv') || wood.hasAttribute('tangent') ? 4 : 3;
    let vertex = wood.getAttribute('position').count, index = wood.index!.count;
    for (let i = 0; i < target; i++) {
      if (twigs[i]!.from.distanceTo(twigs[i]!.to) <= 1e-3) continue;
      const segments = C.twigTriangles([twigs[i]!]) / 6;
      vertex += (segments + 1) * ringVertices; index += segments * 18;
    }
    const segments = C.twigTriangles([twigs[target]!]) / 6, tip = vertex + segments * ringVertices;
    const position = built.getAttribute('position'), centre = new THREE.Vector3();
    for (let k = 0; k < 3; k++) centre.add(new THREE.Vector3().fromBufferAttribute(position, vertex + k));
    centre.divideScalar(3);
    // Find the rendered support, excluding this twig, rather than assuming the
    // abandoned root's nearest source vertex still names the supporting limb.
    const triangle = new THREE.Triangle(), point = new THREE.Vector3();
    let distance = Infinity, supportVertex = -1;
    for (let i = 0; i < built.index!.count; i += 3) {
      if (i >= index && i < index + segments * 18) continue;
      const ids = [0, 1, 2].map(k => built.index!.getX(i + k));
      triangle.a.fromBufferAttribute(position, ids[0]!); triangle.b.fromBufferAttribute(position, ids[1]!); triangle.c.fromBufferAttribute(position, ids[2]!);
      triangle.closestPointToPoint(centre, point);
      const d = point.distanceToSquared(centre);
      if (d < distance) { distance = d; supportVertex = ids[0]!; }
    }
    expect(Math.sqrt(distance)).toBeLessThan(0.12);
    const sourcePosition = wood.getAttribute('position');
    let oldVertex = -1, oldDistance = Infinity;
    for (let i = 0; i < sourcePosition.count; i++) {
      const d = new THREE.Vector3().fromBufferAttribute(sourcePosition, i).distanceToSquared(abandoned);
      if (d < oldDistance) { oldDistance = d; oldVertex = i; }
    }
    for (const name of ['_wind', '_pivot']) {
      const attribute = built.getAttribute(name), original = wood.getAttribute(name);
      for (let k = 0; k < ringVertices; k++) for (let c = 0; c < attribute.itemSize; c++) {
        expect(attribute.getComponent(vertex + k, c)).toBe(attribute.getComponent(supportVertex, c));
        expect(attribute.getComponent(tip + k, c)).toBe(original.getComponent(oldVertex, c));
      }
    }
    checked = true;
    return built;
  });
  const forest = createMeshyForest(templates);
  try {
    const variant = forest.variant('birch', 0, 'verdant-sentinel');
    expect(checked).toBe(true); expect(variant.lods[0].wood!.hasAttribute('_wind')).toBe(true);
  } finally { forest.dispose(); spy.mockRestore(); }
}, 120000);
