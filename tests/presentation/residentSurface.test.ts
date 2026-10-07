import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { patchDualQuaternionMaterial } from '../../src/presentation/npc/dualQuaternionSkinning';
import {
  HIDDEN_YIELD, installResidentSurface, patchResidentShadow, RESIDENT_LOOK, RESIDENT_SHADOW_KEY, RESIDENT_SURFACE_KEY, residentHiddenLayers, residentSkinPrior,
} from '../../src/presentation/npc/residentSurface';
import { repairNpcSurfaceMaterial } from '../../src/presentation/npcSurface';

const NAMES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'legR', 'kneeR'];

function points(rows: [number, number, number][]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(rows.flatMap(([, y]) => [0, y, 0]), 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(rows.flatMap(([joint]) => [joint, 0, 0, 0]), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(rows.flatMap(([, , w]) => [w, 1 - w, 0, 0]), 4));
  return geometry;
}

/** A closed box (outward faces, subdivided so each face has interior points), bound wholly to one joint. */
function box(width: number, height: number, depth: number, x: number, y: number, z: number, joint = 0) {
  const geometry = new THREE.BoxGeometry(width, height, depth, 4, 4, 4).translate(x, y, z);
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(count).fill([joint, 0, 0, 0]).flat(), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(count).fill([1, 0, 0, 0]).flat(), 4));
  geometry.deleteAttribute('uv');
  return geometry;
}

/** The value at the vertex nearest `at` with normal `facing`. */
function sideAt(geometry: THREE.BufferGeometry, values: Float32Array, at: THREE.Vector3, facing: THREE.Vector3) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  let best = -1, distance = Infinity;
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (new THREE.Vector3().fromBufferAttribute(normal, vertex).dot(facing) < 0.99) continue;
    const d = new THREE.Vector3().fromBufferAttribute(position, vertex).distanceTo(at);
    if (d < distance) { distance = d; best = vertex; }
  }
  expect(distance).toBeLessThan(0.002);
  return values[best];
}

describe('resident surface', () => {
  it('lets only the head, neck, forearms, hands and an open collar be bare skin', () => {
    const prior = residentSkinPrior(points([[2, 1.6, 1], [4, 1.0, 1], [3, 1.3, 1], [1, 1.2, 1], [1, 1.45, 1], [7, 0.6, 1], [0, 0.95, 1]]), NAMES);
    expect(prior[0]).toBe(1); expect(prior[1]).toBe(1);
    expect(prior[2]).toBeCloseTo(0.75, 6);
    expect(prior[3]).toBe(0); expect(prior[4]).toBeCloseTo(0.8, 6);
    expect(prior[5]).toBe(0); expect(prior[6]).toBe(0);
  });

  it('composes with the normal-bake repair and dual-quaternion skinning in Three\'s own shader, and samples anisotropically', () => {
    const map = new THREE.Texture(), normalMap = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.89 });
    repairNpcSurfaceMaterial(material);
    patchDualQuaternionMaterial(material, 44);
    const geometry = points([[2, 1.6, 1]]);
    const prior = residentSkinPrior(geometry, NAMES);
    const installed = installResidentSurface(material, geometry, prior, { metal: true });
    installResidentSurface(material, geometry, prior, { metal: true });
    expect(geometry.getAttribute('aTvSkin').array).toBe(prior);
    expect(map.anisotropy).toBe(RESIDENT_LOOK.anisotropy); expect(normalMap.anisotropy).toBe(RESIDENT_LOOK.anisotropy);
    expect(installed.uniforms.uTvLook!.value.w).toBe(1);
    const shader = { vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    const fragment = shader.fragmentShader, vertex = shader.vertexShader;
    expect(vertex).toContain('vTvBind = position;'); expect(vertex).toContain('#define TV_DQ_BASE 44');
    expect(fragment).toContain('#define RE_Direct RE_Direct_Resident');
    expect(fragment).toContain('mapN.z = max( mapN.z, 0.650000 );');
    // Classification follows the albedo; roughness and metalness follow the classification; grain bends the final normal.
    expect(fragment.indexOf('float tvSkin =')).toBeGreaterThan(fragment.indexOf('#include <map_fragment>'));
    expect(fragment.indexOf('roughnessFactor = mix( roughnessFactor, uTvRough.x')).toBeGreaterThan(fragment.indexOf('#include <roughnessmap_fragment>'));
    expect(fragment.indexOf('mapN.xy *= mix( 1.0, uTvRough.w')).toBeGreaterThan(fragment.indexOf('mapN.xy *= normalScale;'));
    expect(fragment.indexOf('normal = tvBump(')).toBeLessThan(fragment.indexOf('#include <clearcoat_normal_fragment_begin>'));
    expect(fragment).toContain('reflectedLight.directDiffuse *= tvCavity;');
    expect(material.customProgramCacheKey()).toContain('tervain-npc-forward-normal-v1');
    expect(material.customProgramCacheKey()).toContain('tervain-npc-dq-skinning-v1-44');
    expect(material.customProgramCacheKey().endsWith(`|${RESIDENT_SURFACE_KEY}`)).toBe(true);
  });

  it('finds the covered layers: an apron\'s lining, the skirt under it and that skirt\'s own lining, never the apron\'s face or an arm', () => {
    // Front to back: apron face (z .18) and lining (.17), skirt face (.15) and lining (.14), and a body whose front lies
    // 9 cm behind the skirt; an arm hangs 3 cm beside the body. The skeleton's spine runs up the middle.
    const geometry = mergeGeometries([
      box(0.4, 0.8, 0.2, 0, 0.6, -0.05), box(0.34, 0.5, 0.01, 0, 0.5, 0.145), box(0.24, 0.4, 0.01, 0, 0.5, 0.175), box(0.08, 0.6, 0.08, 0.27, 0.7, -0.05, 3),
    ])!;
    const hidden = residentHiddenLayers(geometry, NAMES, [[new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.5, 0)]]);
    const front = new THREE.Vector3(0, 0, 1), back = new THREE.Vector3(0, 0, -1);
    expect(sideAt(geometry, hidden, new THREE.Vector3(0, 0.5, 0.18), front)).toBe(0);
    expect(sideAt(geometry, hidden, new THREE.Vector3(0, 0.5, 0.17), back)).toBe(1);
    expect(sideAt(geometry, hidden, new THREE.Vector3(0, 0.5, 0.15), front)).toBe(1);
    // Nothing lies within reach in front of the skirt's lining; it is covered as the back of a covered face.
    expect(sideAt(geometry, hidden, new THREE.Vector3(0, 0.5, 0.14), back)).toBe(1);
    // Where the apron does not reach, the skirt is its own outer face.
    expect(sideAt(geometry, hidden, new THREE.Vector3(0, 0.25, 0.15), front)).toBe(0);
    // An arm neither counts as covered nor covers the body beside it.
    expect(sideAt(geometry, hidden, new THREE.Vector3(0.23, 0.7, -0.05), new THREE.Vector3(-1, 0, 0))).toBe(0);
    expect(sideAt(geometry, hidden, new THREE.Vector3(0.2, 0.6, -0.05), new THREE.Vector3(1, 0, 0))).toBe(0);
    expect(sideAt(geometry, hidden, new THREE.Vector3(0, 0.6, -0.15), back)).toBe(0);
  });

  it('lets covered layers yield depth to their cover and drops their backs, in the colour pass and the shadow passes', () => {
    const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture(), normalMap: new THREE.Texture() });
    patchDualQuaternionMaterial(material, 44);
    const geometry = points([[0, 0.9, 1], [0, 0.95, 1]]);
    installResidentSurface(material, geometry, new Float32Array(2), { hidden: new Float32Array([1, 0]) });
    expect(Array.from(geometry.getAttribute('aTvHidden').array)).toEqual([1, 0]);
    const colour = { vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader, uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
    material.onBeforeCompile(colour, {} as THREE.WebGLRenderer);
    expect(colour.uniforms.uTvYield!.value).toBe(HIDDEN_YIELD);
    // The yield follows the projection, so a covered layer keeps its place on screen.
    expect(colour.vertexShader.indexOf('float tvZ = mvPosition.z - uTvYield;')).toBeGreaterThan(colour.vertexShader.indexOf('#include <project_vertex>'));
    expect(colour.fragmentShader.indexOf('if ( ! gl_FrontFacing && vTvHidden > 0.5 ) discard;')).toBeGreaterThan(colour.fragmentShader.indexOf('#include <clipping_planes_fragment>'));
    for (const shadow of [new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), new THREE.MeshDistanceMaterial()]) {
      patchDualQuaternionMaterial(shadow, 44);
      patchResidentShadow(shadow); patchResidentShadow(shadow);
      const lib = shadow instanceof THREE.MeshDistanceMaterial ? THREE.ShaderLib.distance : THREE.ShaderLib.depth;
      const pass = { vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
      shadow.onBeforeCompile(pass, {} as THREE.WebGLRenderer);
      expect(pass.vertexShader).toContain('#define TV_DQ_BASE 44');
      expect(pass.vertexShader).toContain('vTvHidden = aTvHidden;');
      expect(pass.fragmentShader.match(/vTvHidden > 0\.5 \) discard;/g)).toHaveLength(1);
      expect(shadow.customProgramCacheKey().endsWith(`-44|${RESIDENT_SHADOW_KEY}`)).toBe(true);
    }
  });

  it('fails loudly if a future shader no longer has the chunks it shades through', () => {
    const material = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture() });
    installResidentSurface(material, points([[2, 1.6, 1]]), new Float32Array(1));
    const shader = { vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: 'void main() {}', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms;
    expect(() => material.onBeforeCompile(shader, {} as THREE.WebGLRenderer)).toThrow(/cannot find/);
  });
});
