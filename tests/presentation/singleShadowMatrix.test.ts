import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WebGLUniforms } from 'three/src/renderers/webgl/WebGLUniforms.js';
import { installFoliage } from '../../src/presentation/foliage/foliageMaterial';
import { splitLeafPrepass } from '../../src/presentation/foliage/leafPrepass';
import { createFoliageField, FOLIAGE_RESPONSE } from '../../src/presentation/foliage/foliageWind';
import { GrassWind } from '../../src/presentation/grass/wind';
import { REALM_WIND } from '../../src/presentation/realmWind';
import { cacheSingleDirectionalShadowMatrix } from '../../src/presentation/foliage/singleShadowMatrix';

function setter(arraySize: number | null) {
  const writes: number[][] = [];
  const gl = {
    ACTIVE_UNIFORMS: 0x8b86,
    getProgramParameter: () => 1,
    getActiveUniform: () => ({ name: arraySize === null ? 'directionalShadowMatrix' : 'directionalShadowMatrix[0]', size: arraySize ?? 1, type: 0x8b5c }),
    getUniformLocation: () => ({}),
    uniformMatrix4fv: (_location: unknown, transpose: boolean, value: Float32Array) => {
      expect(transpose).toBe(false); writes.push(Array.from(value));
    },
  };
  const uniforms = new WebGLUniforms(gl as unknown as WebGLRenderingContext, {} as ConstructorParameters<typeof WebGLUniforms>[1]) as unknown as {
    setValue(gl: unknown, name: string, value: unknown): void;
  };
  return { writes, upload: (value: unknown) => uniforms.setValue(gl, 'directionalShadowMatrix', value) };
}

function shader() {
  const original = { value: [] as THREE.Matrix4[], needsUpdate: true };
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, uniforms: { directionalShadowMatrix: original as THREE.IUniform } };
  expect(cacheSingleDirectionalShadowMatrix(shader, THREE.ShaderChunk)).toBe(true);
  return { shader, original, uniform: shader.uniforms.directionalShadowMatrix };
}

describe('single directional shadow matrix uploads', () => {
  it('uses Three’s real matrix setters to remove unchanged array uploads, with identical GPU words', () => {
    const { uniform } = shader(), matrix = new THREE.Matrix4().makeTranslation(12.123456789, -7, 30);
    uniform.value = [matrix];
    const before = setter(1), after = setter(null);
    for (let frame = 0; frame < 120; frame++) { before.upload([matrix]); after.upload(uniform.value); }
    expect(before.writes).toHaveLength(120);
    expect(after.writes).toHaveLength(1);
    expect(after.writes[0]).toEqual(before.writes[0]);
  });

  it('detects in-place camera/light changes and forwards renderer replacements', () => {
    const { uniform, original } = shader(), a = new THREE.Matrix4(), b = new THREE.Matrix4().makeScale(2, 3, 4), gpu = setter(null);
    uniform.value = [a]; gpu.upload(uniform.value);
    a.elements[12] = 45; gpu.upload(uniform.value);
    uniform.value = [b]; gpu.upload(uniform.value);
    uniform.value = [a]; gpu.upload(uniform.value);
    expect(gpu.writes).toHaveLength(4);
    expect(gpu.writes[1]).toEqual(Array.from(new Float32Array(a.elements)));
    expect(original.value).toEqual([a]);
    expect((uniform as { needsUpdate?: boolean }).needsUpdate).toBe(true);
  });

  it('keeps empty and multiple-light arrays intact and does not patch twice', () => {
    const { shader: s, uniform } = shader(), matrices = [new THREE.Matrix4(), new THREE.Matrix4().makeTranslation(1, 2, 3)];
    uniform.value = matrices;
    expect(uniform.value).toBe(matrices);
    const gpu = setter(2); gpu.upload(uniform.value);
    expect(gpu.writes[0]).toEqual(matrices.flatMap(m => Array.from(new Float32Array(m.elements))));
    const empty: THREE.Matrix4[] = []; uniform.value = empty; expect(uniform.value).toBe(empty);
    expect(s.vertexShader).toContain('#if NUM_DIR_LIGHT_SHADOWS == 1');
    expect(s.vertexShader).toContain('directionalShadowMatrix[ i ] * shadowWorldPosition');
    expect(cacheSingleDirectionalShadowMatrix(s, THREE.ShaderChunk)).toBe(false);
  });

  it('reaches actual standard/physical foliage and the leaf-depth twin through their production hooks', () => {
    const field = createFoliageField(new GrassWind(REALM_WIND));
    for (const colour of [new THREE.MeshStandardMaterial({ alphaTest: .5 }), new THREE.MeshPhysicalMaterial({ alphaTest: .5 })]) {
      const installed = installFoliage(colour, { field, leaf: true, response: FOLIAGE_RESPONSE.conifer });
      const geometry = new THREE.PlaneGeometry(), mesh = new THREE.InstancedMesh(geometry, colour, 1), depth = splitLeafPrepass(mesh)!;
      for (const material of [colour, depth.material as THREE.Material]) {
        const lib = ('isMeshPhysicalMaterial' in colour && colour.isMeshPhysicalMaterial) ? THREE.ShaderLib.physical : THREE.ShaderLib.standard;
        const shader = { vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: THREE.UniformsUtils.clone(lib.uniforms) } as Parameters<THREE.Material['onBeforeCompile']>[0];
        material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
        const matrix = new THREE.Matrix4().makeTranslation(1, 2, 3);
        shader.uniforms.directionalShadowMatrix!.value = [matrix];
        expect(shader.uniforms.directionalShadowMatrix!.value).toBe(matrix);
        expect(shader.vertexShader).toContain('uniform mat4 directionalShadowMatrix;');
        expect(shader.vertexShader).toContain('tvFoliageOffset(');
        expect(installed.ok()).toBe(true);
      }
      colour.dispose(); (depth.material as THREE.Material).dispose(); geometry.dispose();
    }
    field.wind.dispose();
  });

  it('leaves unsupported hooks untouched rather than partially changing the uniform shape', () => {
    const s = { vertexShader: 'void main(){}', uniforms: { directionalShadowMatrix: { value: [] } } }, original = s.uniforms.directionalShadowMatrix;
    expect(cacheSingleDirectionalShadowMatrix(s, THREE.ShaderChunk)).toBe(false);
    expect(s.uniforms.directionalShadowMatrix).toBe(original);
    expect(s.vertexShader).toBe('void main(){}');
  });
});
