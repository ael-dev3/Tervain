import type * as THREE from 'three';

export const SHAKE_COLUMNS = 4;
type ShakeSource = THREE.IUniform<THREE.Vector4[]> & { needsUpdate?: boolean };
type PackedShakes = THREE.IUniform<Float32Array> & { needsUpdate?: boolean };
type ShakeShader = { uniforms: Record<string, THREE.IUniform>; vertexShader: string };
const packed = new WeakMap<ShakeSource, PackedShakes>();
const declaration = `uniform vec4 uFoliageShakes[${SHAKE_COLUMNS}];`;

/** Four vec4 slots are exactly four mat4 columns; indexing and GPU words stay the same.
 * Unlike Three's vec4-array setter, its matrix setter skips unchanged values. Keep the
 * original field/diagnostic record and pack into one retained view per shared source.
 */
export function cacheFoliageShakeUniform(shader: ShakeShader): boolean {
  const source = shader.uniforms.uFoliageShakes as ShakeSource | undefined;
  if (!source || !Array.isArray(source.value) || source.value.length !== SHAKE_COLUMNS ||
      !shader.vertexShader.includes(declaration)) return false;
  let uniform = packed.get(source);
  if (!uniform) {
    const words = new Float32Array(SHAKE_COLUMNS * 4);
    uniform = {
      get value() {
        const slots = source.value;
        for (let i = 0; i < SHAKE_COLUMNS; i++) {
          const slot = slots[i]!, offset = i * 4;
          words[offset] = slot.x; words[offset + 1] = slot.y;
          words[offset + 2] = slot.z; words[offset + 3] = slot.w;
        }
        return words;
      },
      get needsUpdate() { return source.needsUpdate; },
      set needsUpdate(value: boolean | undefined) { source.needsUpdate = value; },
    };
    packed.set(source, uniform);
  }
  shader.uniforms.uFoliageShakes = uniform;
  shader.vertexShader = shader.vertexShader.replace(declaration, 'uniform mat4 uFoliageShakes;');
  return true;
}
