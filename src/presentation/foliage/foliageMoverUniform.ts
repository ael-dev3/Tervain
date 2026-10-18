import type * as THREE from 'three';

type Source = THREE.IUniform<THREE.Vector4[]> & { needsUpdate?: boolean };
type View = THREE.IUniform<{ item: THREE.Vector4 }[]> & { needsUpdate?: boolean };
const views = new WeakMap<Source, View>();
const declaration = 'uniform vec4 uFoliageMovers[6];';

/** Struct members use Three's cached vec4 setter; a plain vec4 array always uploads.
 * Keep all six GPU vectors and the indexed loop, without allocating per draw.
 */
export function cacheFoliageMoverUniform(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string }): boolean {
  const source = shader.uniforms.uFoliageMovers as Source | undefined;
  if (!source || !Array.isArray(source.value) || source.value.length !== 6 || !shader.vertexShader.includes(declaration)) return false;
  let view = views.get(source);
  if (!view) {
    const slots = source.value.map(item => ({ item }));
    view = {
      get value() {
        for (let i = 0; i < slots.length; i++) slots[i]!.item = source.value[i]!;
        return slots;
      },
      get needsUpdate() { return source.needsUpdate; },
      set needsUpdate(value: boolean | undefined) { source.needsUpdate = value; },
    };
    views.set(source, view);
  }
  shader.uniforms.uFoliageMovers = view;
  shader.vertexShader = shader.vertexShader.replace(declaration,
    'struct TvFoliageMover { vec4 item; };\nuniform TvFoliageMover uFoliageMovers[6];')
    .replace('vec4 m = uFoliageMovers[i];', 'vec4 m = uFoliageMovers[i].item;');
  return true;
}
