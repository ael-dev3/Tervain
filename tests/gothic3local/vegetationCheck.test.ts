import { describe, expect, it } from 'vitest';
import { vegetationMeshProblem, type VegetationMesh } from '../../src/gothic3local/vegetation';

const mesh = (over: Partial<VegetationMesh>): VegetationMesh => ({
  index: 0, name: 'plant', texture: '', box: new Float32Array(6),
  positions: new Float32Array(12), normals: new Float32Array(12), uvs: new Float32Array(8), indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  shading: 0, wind: 0, doubleSided: false, ...over,
});

describe('twelfth scout fixes: plant meshes are checked (A105)', () => {
  it('accepts a whole plant and refuses streams that disagree with its vertices', () => {
    expect(vegetationMeshProblem(mesh({}))).toBeNull();
    expect(vegetationMeshProblem(mesh({ indices: new Uint32Array([0, 1, 9]) }))).toBe('index range');
    expect(vegetationMeshProblem(mesh({ uvs: new Float32Array(6) }))).toBe('uvs');
    expect(vegetationMeshProblem(mesh({ normals: new Float32Array(9) }))).toBe('normals');
    expect(vegetationMeshProblem(mesh({ indices: new Uint32Array([0, 1]) }))).toBe('indices');
  });
});
