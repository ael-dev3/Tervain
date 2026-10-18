import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { WebGLUniforms } from 'three/src/renderers/webgl/WebGLUniforms.js';
import { cacheFoliageShakeUniform, SHAKE_COLUMNS } from '../../src/presentation/foliage/foliageShakeUniform';
import { createFoliageField, FOLIAGE_RESPONSE, foliageUniforms, patchFoliageVertex, patchFloorPlantVertex } from '../../src/presentation/foliage/foliageWind';
import { GrassWind } from '../../src/presentation/grass/wind';
import { REALM_WIND } from '../../src/presentation/realmWind';

function gpu(matrix: boolean) {
  const writes: number[][] = [];
  const write = (data: Float32Array) => writes.push(Array.from(data));
  const gl = {
    ACTIVE_UNIFORMS: 0x8b86,
    getProgramParameter: () => 1,
    getActiveUniform: () => ({ name: matrix ? 'uFoliageShakes' : 'uFoliageShakes[0]', size: matrix ? 1 : 4, type: matrix ? 0x8b5c : 0x8b52 }),
    getUniformLocation: () => ({}),
    uniform4fv: (_location: unknown, data: Float32Array) => write(data),
    uniformMatrix4fv: (_location: unknown, transpose: boolean, data: Float32Array) => { expect(transpose).toBe(false); write(data); },
  };
  const uniforms = new WebGLUniforms(gl as unknown as WebGLRenderingContext, {} as ConstructorParameters<typeof WebGLUniforms>[1]) as unknown as {
    setValue(gl: unknown, name: string, value: unknown): void;
  };
  return { writes, upload: (value: unknown) => uniforms.setValue(gl, 'uFoliageShakes', value) };
}
const slots = () => Array.from({ length: SHAKE_COLUMNS }, (_, i) => new THREE.Vector4(i + .123456789, -i, 16383.75 - i, i ? 0 : .875));
function shader(source = { value: slots() }) {
  return { uniforms: { uFoliageShakes: source as THREE.IUniform }, vertexShader: 'uniform vec4 uFoliageShakes[4];\nvec4 slot(int i) { return uFoliageShakes[i]; }' };
}

describe('cached foliage shake columns', () => {
  it('uses real Three setters to skip unchanged uploads without changing any GPU word', () => {
    expect(SHAKE_COLUMNS).toBe(4);
    const source = { value: slots() }, s = shader(source), before = gpu(false), after = gpu(true);
    const body = s.vertexShader.split('\n')[1];
    expect(cacheFoliageShakeUniform(s)).toBe(true);
    expect(s.vertexShader.split('\n')[1]).toBe(body);
    for (let i = 0; i < 120; i++) { before.upload(source.value); after.upload(s.uniforms.uFoliageShakes.value); }
    expect(before.writes).toHaveLength(120); expect(after.writes).toHaveLength(1);
    expect(after.writes[0]).toEqual(before.writes[0]);
    expect(after.writes[0]).toHaveLength(16);
  });

  it('updates strikes, expiry and replacement slots in place using the same retained packed array', () => {
    const source = { value: slots() }, s = shader(source), before = gpu(false), after = gpu(true);
    cacheFoliageShakeUniform(s);
    const view = s.uniforms.uFoliageShakes.value;
    for (let i = 0; i < 5; i++) {
      source.value[i % 4]!.set(i * .12345, i * -4, .25 + i, i % 2 ? 0 : .7);
      if (i === 3) source.value = slots();
      expect(s.uniforms.uFoliageShakes.value).toBe(view);
      before.upload(source.value); after.upload(s.uniforms.uFoliageShakes.value);
      expect(after.writes.at(-1)).toEqual(before.writes.at(-1));
    }
    expect(after.writes).toHaveLength(5);
  });

  it('shares one packed view per field while retaining field and diagnostic records', () => {
    const source = { value: slots(), needsUpdate: false }, a = shader(source), b = shader(source), other = shader();
    const original = source.value;
    for (const s of [a, b, other]) expect(cacheFoliageShakeUniform(s)).toBe(true);
    expect(a.uniforms.uFoliageShakes).toBe(b.uniforms.uFoliageShakes);
    expect(a.uniforms.uFoliageShakes.value).not.toBe(other.uniforms.uFoliageShakes.value);
    expect(source.value).toBe(original);
    const record = a.uniforms.uFoliageShakes as THREE.IUniform & { needsUpdate?: boolean };
    expect(record.needsUpdate).toBe(false); record.needsUpdate = true; expect(source.needsUpdate).toBe(true);
    expect(cacheFoliageShakeUniform(a)).toBe(false);
    const unsupported = shader({ value: slots().slice(1) }), old = unsupported.uniforms.uFoliageShakes;
    expect(cacheFoliageShakeUniform(unsupported)).toBe(false); expect(unsupported.uniforms.uFoliageShakes).toBe(old);
  });

  it('reaches colour, shadow and floor wind hooks without changing the source field contract', () => {
    const field = createFoliageField(new GrassWind(REALM_WIND)), uniforms = foliageUniforms(field, FOLIAGE_RESPONSE.conifer);
    for (const type of ['standard', 'depth'] as const) {
      const s = { uniforms: {}, vertexShader: THREE.ShaderLib[type].vertexShader };
      expect(patchFoliageVertex(s, uniforms, true)).toBe(true);
      expect(s.vertexShader).toContain('uniform mat4 uFoliageShakes;');
    }
    const floor = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: THREE.ShaderLib.standard.vertexShader };
    expect(patchFloorPlantVertex(floor, field)).toBe(true);
    expect(floor.vertexShader).toContain('uniform mat4 uFoliageShakes;');
    expect(Array.isArray(uniforms.uFoliageShakes.value)).toBe(true);
    expect(uniforms.uFoliageShakes).toBe(field.shakes);
    field.wind.dispose();
  });
});
