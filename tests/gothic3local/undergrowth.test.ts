import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { TextureCache } from '../../src/gothic3local/textures';
import { Undergrowth } from '../../src/gothic3local/undergrowth';
import type { Vegetation, VegetationMesh } from '../../src/gothic3local/vegetation';

const textures = { get: async () => null, neutral: () => new THREE.Texture() } as unknown as TextureCache;
const options = { time: { value: 0 }, overbright: { value: 1 }, detailBox: { value: new THREE.Vector4() } };

function kind(index: number, name: string): VegetationMesh {
  return {
    index,
    name,
    texture: 'G3_Nature_Plant_Herbs_Composit_01_Diffuse_S1.dds',
    box: new Float32Array([-10, 0, -10, 10, 50, 10]),
    positions: new Float32Array([-10, 0, 0, 10, 0, 0, 10, 50, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 1, 1, 1, 1, 0]),
    indices: new Uint32Array([0, 1, 2]),
    shading: 1,
    wind: 0.3,
    doubleSided: true,
  };
}

/** One cell's vegetation: a 10 m node every 10 m along X, two tufts in each, at centimetre positions. */
function cell(nodes: number): Vegetation {
  const count = nodes * 2;
  const v: Vegetation = {
    viewRange: 5000,
    fadeStart: 2500,
    meshes: [kind(0, 'Grass.xcmsh'), kind(1, 'Herb.xcmsh')],
    nodes: [],
    mesh: new Uint16Array(count),
    position: new Float32Array(count * 3),
    rotation: new Float32Array(count * 4),
    scale: new Float32Array(count * 2).fill(1),
    tint: new Uint32Array(count).fill(0xff808080),
  };
  for (let n = 0; n < nodes; n++) {
    v.nodes.push({ box: new Float32Array([n * 1000, 0, 0, n * 1000 + 1000, 100, 1000]), first: n * 2, count: 2 });
    for (let k = 0; k < 2; k++) {
      const i = n * 2 + k;
      v.mesh[i] = k;
      v.position.set([n * 1000 + 500, 0, 500], i * 3);
      v.rotation.set([0, 0, 0, 1], i * 4);
    }
  }
  return v;
}

describe('ground vegetation near the camera', () => {
  it('draws only the nodes within the view range and refills as the camera moves', async () => {
    const u = new Undergrowth(textures, options);
    u.add(cell(20));
    await u.prepare();
    expect(u.instances).toBe(40);
    // The camera in Three.js metres: x 0..200 m along the row of nodes, which lie at z −0..−10 m.
    u.update(new THREE.Vector3(0, 1, -5));
    // Nodes whose box is within 50 m: the first six (0–60 m, the sixth's edge at 50 m).
    expect(u.visible).toBe(12);
    const meshes = u.group.children as THREE.InstancedMesh[];
    expect(meshes.map((m) => m.count)).toEqual([6, 6]);
    // From 100 m: the nodes from 40–50 m to 150–160 m.
    u.update(new THREE.Vector3(100, 1, -5));
    expect(u.visible).toBe(24);
    // A small move does not refill (half a metre on, the 40–50 m node would drop out).
    u.update(new THREE.Vector3(100.5, 1, -5));
    expect(u.visible).toBe(24);
    u.update(new THREE.Vector3(1000, 1, -5));
    expect(u.visible).toBe(0);
    expect(meshes.every((m) => !m.visible)).toBe(true);
  });

  it('shares one kind across cells and makes room when more cells arrive', async () => {
    const u = new Undergrowth(textures, options);
    u.add(cell(2));
    await u.prepare();
    u.add(cell(3));
    await u.prepare();
    expect(u.group.children).toHaveLength(2);
    u.update(new THREE.Vector3(10, 1, -5));
    expect(u.visible).toBe(10);
    // Instances carry the world's matrix (position, rotation, both scales) and tint.
    const grass = u.group.children[0] as THREE.InstancedMesh;
    const m = new THREE.Matrix4();
    grass.getMatrixAt(0, m);
    expect(new THREE.Vector3().setFromMatrixPosition(m).toArray()).toEqual([500, 0, 500]);
    const tint = grass.geometry.getAttribute('g3tint');
    expect(tint.getX(0)).toBeCloseTo(128 / 255, 5);
  });
});
