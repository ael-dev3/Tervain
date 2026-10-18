import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { FOLIAGE_MAX_MOVERS, FOLIAGE_MAX_SHAKES, FOLIAGE_RESPONSE, createFoliageField, expireFoliageShakes, patchFloorPlantVertex, patchFoliageVertex, foliageUniforms } from '../../src/presentation/foliage/foliageWind';
import { FOLIAGE_FOCUS, FOLIAGE_LOOK, crownOf, installFoliage, installFoliageShadow } from '../../src/presentation/foliage/foliageMaterial';
import { installShadowOnlyGroup, shadowDepthMaterial, shadowGeometry } from '../../src/presentation/foliage/shadowCasters';
import { LEAF_BURST_POOL, createLeafBurst } from '../../src/presentation/foliage/leafBurst';
import { GrassWind } from '../../src/presentation/grass/wind';
import { attachInstanceDistanceVisibility } from '../../src/presentation/distanceVisibility';
import { FLORA_SHADOW_LOD, buildFlora, floraShadowLod, floraShadowWeights, foliageResponse } from '../../src/presentation/flora';
import { SHRUB_LOD_BANDS, createFloraPopulation, floraLodWeights, floraLodWeightsFor, registerFloraColliders, type FloraTree } from '../../src/presentation/floraPopulation';
import { groundedTreeY, treeWoodCollisionRadius } from '../../src/presentation/treeGrounding';
import { createPineForest, isPineSpecies, type PineTemplates } from '../../src/presentation/solitaryPine';
import { buildTreeVariant, type TreeVariant } from '../../src/presentation/treeGen';
import { pineTemplates } from './pineFixture';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import type { FrameContext } from '../../src/presentation/context';
import { worldView } from '../../src/game/worldView';
import { createInitialState } from '../../src/game/state';
import { REALM_WIND } from '../../src/presentation/realmWind';

vi.mock('../../src/presentation/forestFloor', () => ({ buildForestFloor: () => ({ group: new THREE.Group(), update() {}, dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', () => ({
  woodMaterial: () => new THREE.MeshStandardMaterial(), leafMaterial: () => new THREE.MeshStandardMaterial(), installBarkDetail() {}, disposeTreeMaterials() {},
}));
vi.mock('../../src/presentation/treeTextures', () => ({ barkTextures: () => ({ map: new THREE.DataTexture(), surface: new THREE.DataTexture() }), disposeTreeTextures() {} }));

type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];
const lib = (name: 'standard' | 'physical' | 'depth' | 'distance' | 'lambert'): Shader =>
  ({ uniforms: {}, vertexShader: THREE.ShaderLib[name].vertexShader, fragmentShader: THREE.ShaderLib[name].fragmentShader } as Shader);
const field = () => createFoliageField(new GrassWind(REALM_WIND));

describe('foliage wind', () => {
  it('shares one wind with the grass and starts still and untouched', () => {
    const wind = new GrassWind(REALM_WIND), f = createFoliageField(wind);
    expect(f.wind).toBe(wind);
    expect(f.strength.value).toBe(1);
    expect(f.movers.value).toHaveLength(FOLIAGE_MAX_MOVERS);
    expect(f.moverCount.value).toBe(0);
    expect(f.shakes.value).toHaveLength(FOLIAGE_MAX_SHAKES);
    expect(f.shakes.value.every((s) => s.w === 0)).toBe(true);
    expect(f.trample.uTrample.value.w).toBe(0);
    const u = foliageUniforms(f, FOLIAGE_RESPONSE.conifer);
    // The live objects, so each wind update reaches every compiled tree program.
    expect(u.uGrassTime).toBe(wind.uniforms.uGrassTime);
    expect(u.tGust).toBe(wind.uniforms.tGust);
    expect(u.uFoliageWind).toBe(f.strength);
    expect(u.uFoliageMovers).toBe(f.movers);
    expect(u.uFoliage.value.toArray()).toEqual([0.7, 0.75, 0.45, 16]);
    wind.dispose();
  });

  it('keeps fresh strikes across the clock wrap, then retires them permanently', () => {
    const f = field(), slot = f.shakes.value[0]!;
    slot.set(10, 20, 16383.75, 1);
    f.wind.uniforms.uGrassTime.value = 0.25;
    expireFoliageShakes(f);
    expect(slot.w).toBe(1);
    f.wind.uniforms.uGrassTime.value = 2.75; // Exactly three seconds remains drawable.
    expireFoliageShakes(f);
    expect(slot.w).toBe(1);
    f.wind.uniforms.uGrassTime.value = 2.875;
    expireFoliageShakes(f);
    expect(slot.w).toBe(0);
    f.wind.uniforms.uGrassTime.value = 0.25; // A later cycle cannot replay the old hit.
    expireFoliageShakes(f);
    expect(slot.w).toBe(0);
    f.wind.dispose();
  });

  it('moves vertices in the actual standard and depth chunks, in world space and back, and pins weighted vertices', () => {
    const f = field();
    for (const name of ['standard', 'depth', 'distance'] as const) {
      const shader = lib(name);
      expect(patchFoliageVertex(shader, foliageUniforms(f, FOLIAGE_RESPONSE.broadleaf), true)).toBe(true);
      expect(shader.vertexShader).toContain('vec3 tvFoliageOffset(vec3 p, vec3 o, float leaf, float s)');
      expect(shader.vertexShader).toContain('tvW = modelMatrix * instanceMatrix;');
      expect(shader.vertexShader).toContain('transformed += (transpose(mat3(tvW)) * tvOff) / tvS2;');
      expect(shader.vertexShader.indexOf('tvFoliageOffset(tvWorld')).toBeGreaterThan(shader.vertexShader.indexOf('#include <begin_vertex>'));
      expect(shader.vertexShader).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
    }
    const weighted = lib('standard');
    expect(patchFoliageVertex(weighted, foliageUniforms(f, FOLIAGE_RESPONSE.broadleaf), true, 'menuCrownWindWeight')).toBe(true);
    expect(weighted.vertexShader).toContain('attribute float menuCrownWindWeight;');
    expect(weighted.vertexShader).toContain('/ tvS2 * menuCrownWindWeight;');
    // A name that is not an identifier never reaches the shader.
    const hostile = lib('standard'), before = hostile.vertexShader;
    expect(patchFoliageVertex(hostile, {}, true, 'w; discard')).toBe(false);
    expect(hostile.vertexShader).toBe(before);
    expect(patchFoliageVertex({ uniforms: {}, vertexShader: 'void main() {}' }, {}, false)).toBe(false);
    f.wind.dispose();
  });

  it('holds trees still, shakes and touches included, when the strength is zero', () => {
    const shader = lib('standard'), f = field();
    patchFoliageVertex(shader, foliageUniforms(f, FOLIAGE_RESPONSE.broadleaf), true);
    const body = shader.vertexShader.slice(shader.vertexShader.indexOf('vec3 tvFoliageOffset'));
    // Every moving term carries the strength: lean, sway, branches, flutter, movers and shakes.
    expect(body).toMatch(/float push = \(uWindDir\.z \+ uWindDir\.w \* gust\) \* uFoliageWind;/);
    expect(body).toMatch(/sway \* \(0\.05 \+ 0\.22 \* push\) \* uFoliageWind/);
    expect(body).toMatch(/bSwing = sin\([^;]*\) \* \(0\.25 \+ push\) \* uFoliageWind;/);
    expect(body).toMatch(/uFoliage\.z \* leaf \* uFoliageWind;/);
    expect(body).toMatch(/\(0\.3 \+ 0\.7 \* leaf\) \* uFoliageWind;/);
    expect(body).toMatch(/float decay = exp\(-age \* 2\.2\) \* s\.w \* uFoliageWind;/);
    f.wind.dispose();
  });

  it('lets forest-floor plants answer the wind and the grass trample field', () => {
    const shader = lib('standard'), f = field();
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aLeafDetail;');
    expect(patchFloorPlantVertex(shader, f)).toBe(true);
    expect(shader.uniforms.tTrample).toBe(f.trample.tTrample);
    expect(shader.uniforms.uTrample).toBe(f.trample.uTrample);
    expect(shader.vertexShader).toContain('uniform sampler2D tTrample;');
    expect(shader.vertexShader).toContain('tvFoliageOffset(tvWorld, tvRoot, aLeafDetail.z, tvS) * tvRise');
    expect(shader.uniforms.uFoliage!.value.toArray()).toEqual([0.6, 1.3, 1.2, 0.8]);
    f.wind.dispose();
  });

  it('answers by kind and size: conifers stiffer, shrubs short, dead wood without leaves', () => {
    expect(foliageResponse({ species: 'fir', height: 24 })).toEqual({ ...FOLIAGE_RESPONSE.conifer, height: 24 });
    expect(foliageResponse({ species: 'pine', height: 25 }).trunk).toBeLessThan(foliageResponse({ species: 'oak', height: 18 }).trunk);
    expect(foliageResponse({ species: 'shrub', height: 1.5 })).toEqual({ ...FOLIAGE_RESPONSE.shrub, height: 1.5 });
    expect(foliageResponse({ species: 'dead', height: 13 }).flutter).toBe(0);
    expect(foliageResponse({ species: 'palm', height: 14 }).branch).toBeGreaterThan(1);
    expect(foliageResponse({ species: 'oak', height: 0 }).height).toBeGreaterThan(0);
  });
});

describe('foliage look', () => {
  it('lights leaves as thin crowns in the actual physical chunks, chaining earlier patches and keys', () => {
    const f = field();
    for (const make of [() => new THREE.MeshStandardMaterial(), () => new THREE.MeshPhysicalMaterial()]) {
      const material = make();
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), material, 2);
      attachInstanceDistanceVisibility(mesh);
      const crown = crownOf(new THREE.BoxGeometry(6, 4, 8).translate(0, 9, 0));
      expect(crown.centre.toArray()).toEqual([0, 9, 0]);
      expect([crown.horizontal, crown.vertical]).toEqual([4, 2]);
      const installed = installFoliage(material, { field: f, response: FOLIAGE_RESPONSE.broadleaf, leaf: true, crown });
      expect(installFoliage(material, { field: f, response: FOLIAGE_RESPONSE.conifer, leaf: true })).toBe(installed);
      const shader = lib((material as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial ? 'physical' : 'standard');
      material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
      expect(installed.ok()).toBe(true);
      // The distance dither still applies, then the foliage.
      expect(shader.fragmentShader).toContain('tvDistanceNoise((-vViewPosition');
      expect(material.customProgramCacheKey()).toMatch(/\|tervain-distance-dither-v3-full\|tervain-foliage-v6-leaf-focus-world1-gap1-mip1\|foliage-options:\[null,null\]$/);
      const frag = shader.fragmentShader;
      // Cubic alpha and the coverage lift share one UV footprint/logarithm.
      expect(frag.match(/float tvLod = .*log2/g)).toHaveLength(1);
      expect(frag).not.toContain('vec2 tvTexels =');
      expect(frag).toContain('tvMip = max( 0.0, tvLod );');
      // GLSL leaves smoothstep undefined when edge0 >= edge1, including decreasing opacity ramps.
      const ramps = [...frag.matchAll(/smoothstep\(\s*(-?[\d.]+),\s*(-?[\d.]+),/g)];
      expect(ramps.length).toBeGreaterThan(0);
      for (const ramp of ramps) expect(Number(ramp[1]), ramp[0]).toBeLessThan(Number(ramp[2]));
      expect(frag).toContain('#define RE_Direct RE_Direct_Foliage');
      expect(frag.indexOf('void RE_Direct_Foliage')).toBeGreaterThan(frag.indexOf('#include <lights_physical_pars_fragment>'));
      // A69: each face keeps its own normal (not turned toward the eye) under the crown's, and the cut-out is centred on
      // the cut-off and lifted with the mip level, with the distance dither still after it.
      expect(frag).toContain('normal = normalize( mix( normal * faceDirection, vCrownN, uFoliageLook.x ) );');
      expect(frag).not.toContain('#include <alphatest_fragment>');
      // A107: about two pixels inside the crown, widening to about three and a half on its outer shell.
      expect(frag).toContain('float tvRamp = 2.0 * mix( 1.0, 1.8, smoothstep( 0.55, 0.95, vCrownDepth ) );');
      expect(frag).toContain('float tvCov = ( tvA - alphaTest ) / max( tvRamp * fwidth( tvA ), 1e-4 ) + 0.5;');
      // A133: a stable quarter-step dither inside the ramp only; a fixed-grid dithered cut without multisampling.
      expect(frag).toContain('diffuseColor.a = clamp( tvCov + ( tvIgn - 0.5 ) * 0.25 * tvInRamp, 0.0, 1.0 );');
      expect(frag).toContain('if ( tvLowCov <= tvIgn ) discard;');
      expect(frag).toContain('if ( uFoliageMsaa > 0.5 ) {');
      expect(frag.indexOf('tvCoverageSample <')).toBeGreaterThan(frag.indexOf('tvA *= 1.0 + 0.22 * tvMip;'));
      // Each light's colour is noted before its shadow, so some light still passes through a shaded leaf.
      expect(frag).not.toContain('#include <lights_fragment_begin>');
      expect(frag).toMatch(/getDirectionalLightInfo\( directionalLight, directLight \);\n\t\ttvLitColour = directLight\.color;/);
      expect(frag).toContain('max( directLight.color, tvLitColour * uFoliageShadeThrough )');
      expect(frag).toContain('reflectedLight.indirectDiffuse *= mix( uFoliageLook.z, 1.0, smoothstep( 0.15, 1.0, vCrownDepth ) );');
      expect(frag).toContain('hemisphereLights[ 0 ].skyColor');
      expect(frag).toContain('tvKeep = uFoliageSaturation');
      expect(shader.vertexShader).toContain('vCrownN = normalize((viewMatrix * vec4(tvN, 0.0)).xyz);');
      expect(shader.uniforms.uCrownRadii!.value.toArray()).toEqual([4, 2]);
      expect(shader.uniforms.uFoliageLook!.value.toArray()).toEqual([FOLIAGE_LOOK.crownNormal, FOLIAGE_LOOK.translucency, FOLIAGE_LOOK.innerShade, FOLIAGE_LOOK.variation]);
      // Shadows sway with the leaves and share the material's own response.
      const depth = mesh.customDepthMaterial as THREE.MeshDepthMaterial;
      installFoliageShadow(depth, { field: f, response: FOLIAGE_RESPONSE.broadleaf, leaf: true }, installed);
      const depthShader = lib('depth');
      depth.onBeforeCompile(depthShader, {} as THREE.WebGLRenderer);
      expect(depthShader.vertexShader).toContain('tvFoliageOffset');
      expect(depthShader.uniforms.uFoliage).toBe(installed.uniforms.uFoliage);
      expect(depthShader.fragmentShader).toContain('tvDistanceNoise');
      material.dispose(); mesh.geometry.dispose(); depth.dispose();
    }
    f.wind.dispose();
  });

  it('lets leaves near the lens, and between it and the followed wanderer, give way; off unless a focus is set (A84)', () => {
    const f = field(), leaf = new THREE.MeshStandardMaterial({ alphaTest: 0.5 });
    installFoliage(leaf, { field: f, response: FOLIAGE_RESPONSE.broadleaf, leaf: true });
    const shader = lib('standard');
    shader.defines = { ...(shader.defines ?? {}), USE_ALPHATEST: '' };
    leaf.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.uniforms.uFoliageFocus).toBe(FOLIAGE_FOCUS);
    const focusPosition = shader.vertexShader.indexOf('vTvWorld = (tvFocusWorld * vec4(transformed, 1.0)).xyz;');
    // Clearance follows the rendered leaf after wind; crown lighting and noise stay in rest space.
    expect(focusPosition).toBeGreaterThan(shader.vertexShader.indexOf('transformed += (transpose(mat3(tvW)) * tvOff) / tvS2;'));
    expect(focusPosition).toBeLessThan(shader.vertexShader.indexOf('#include <project_vertex>'));
    expect(shader.vertexShader.indexOf('vTvLeafP =')).toBeLessThan(shader.vertexShader.indexOf('transformed += (transpose(mat3(tvW)) * tvOff) / tvS2;'));
    expect(shader.fragmentShader).toContain('if ( uFoliageFocus.w > 0.0 ) tvNearEnd = clamp(');
    expect(shader.fragmentShader).toContain('smoothstep( 0.6, tvNearEnd, length( vViewPosition ) )');
    expect(FOLIAGE_FOCUS.value.w).toBe(0);
    f.wind.dispose();
  });

  it('gives wood the wind and an in-crown ambient lift only, and keeps its old look if Three changes a chunk', () => {
    const f = field(), wood = new THREE.MeshStandardMaterial();
    installFoliage(wood, { field: f, response: FOLIAGE_RESPONSE.broadleaf, leaf: false });
    const shader = lib('standard');
    wood.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(shader.vertexShader).toContain('tvFoliageOffset(tvWorld, tvOrigin, 0.0');
    expect(shader.fragmentShader).not.toContain('RE_Direct_Foliage');
    expect(wood.customProgramCacheKey()).toMatch(/tervain-foliage-v6-wood-fill1\|foliage-options:\[null,null\]$/);
    const leaf = new THREE.MeshStandardMaterial(), installed = installFoliage(leaf, { field: f, response: FOLIAGE_RESPONSE.broadleaf, leaf: true });
    const broken = lib('standard');
    broken.fragmentShader = broken.fragmentShader.replace('#include <aomap_fragment>', '');
    leaf.onBeforeCompile(broken, {} as THREE.WebGLRenderer);
    expect(installed.ok()).toBe(false);
    expect(broken.fragmentShader).not.toContain('RE_Direct_Foliage');
    f.wind.dispose();
  });
});

describe('shadow-only casters', () => {
  it('shows a group only for the sun shadow pass and restores both hooks', () => {
    const scene = new THREE.Scene(), light = new THREE.DirectionalLight(), group = new THREE.Group();
    const order: string[] = [];
    scene.onBeforeRender = () => order.push('scene');
    const remove = installShadowOnlyGroup(scene, light, group);
    expect(group.visible).toBe(false);
    group.visible = true;
    scene.onBeforeRender({} as THREE.WebGLRenderer, scene, new THREE.Camera(), new THREE.BufferGeometry(), new THREE.Material(), new THREE.Group());
    expect(group.visible).toBe(false);
    expect(order).toEqual(['scene']);
    light.shadow.updateMatrices(light);
    expect(group.visible).toBe(true);
    remove(); remove();
    expect(Object.prototype.hasOwnProperty.call(light.shadow, 'updateMatrices')).toBe(false);
    group.visible = true;
    scene.onBeforeRender({} as THREE.WebGLRenderer, scene, new THREE.Camera(), new THREE.BufferGeometry(), new THREE.Material(), new THREE.Group());
    expect(group.visible).toBe(true);
    expect(order).toEqual(['scene', 'scene']);
  });

  it('shares the source buffers but not the colour mesh visibility data, and keeps the leaf cut-out', () => {
    const source = new THREE.PlaneGeometry(1, 1, 2, 2);
    const mesh = new THREE.InstancedMesh(source, new THREE.MeshStandardMaterial(), 3);
    attachInstanceDistanceVisibility(mesh);
    const copy = shadowGeometry(source);
    expect(copy.getAttribute('position')).toBe(source.getAttribute('position'));
    expect(copy.index).toBe(source.index);
    expect(copy.hasAttribute('aDistanceCoverage')).toBe(false);
    const map = new THREE.Texture(), leaf = new THREE.MeshStandardMaterial({ map, alphaTest: 0.35, side: THREE.DoubleSide });
    const depth = shadowDepthMaterial(leaf);
    expect([depth.map, depth.alphaTest, depth.side, depth.depthPacking]).toEqual([map, 0.35, THREE.DoubleSide, THREE.RGBADepthPacking]);
  });

  it('reuses caller-owned shadow weights across both bands and species without mutating retained default results', () => {
    const retained = floraShadowWeights(14, false);
    const independent = floraShadowWeights(14, false);
    expect(retained).not.toBe(independent);
    const out: [number, number, number] = [99, 99, 99];
    for (const [distance, pine, expected] of [
      [200, true, [0, 1, 0]], [200, false, [0, 0, 1]],
      [64, false, [0, 0.5, 0.5]], [14, false, [0.5, 0.5, 0]],
      [0, false, [1, 0, 0]], [16, true, [0, 1, 0]],
    ] as const) {
      expect(floraShadowWeights(distance, pine, out)).toBe(out);
      expect(out).toEqual(expected);
      expect(retained).toEqual([0.5, 0.5, 0]);
    }
  });

  it('casts with the full model near the camera and lighter source models beyond, the Pine never from its crossed planes', () => {
    expect(floraShadowLod(0, false)).toBe(0);
    expect(floraShadowLod(FLORA_SHADOW_LOD.full - 0.01, false)).toBe(0);
    expect(floraShadowLod(FLORA_SHADOW_LOD.full, false)).toBe(1);
    expect(floraShadowLod(FLORA_SHADOW_LOD.middle, false)).toBe(2);
    expect(floraShadowLod(FLORA_SHADOW_LOD.middle + 200, true)).toBe(1);
  });
});

describe('low shrubs fade to their own lighter models', () => {
  it('cross-fades shrubs on every preset while trees keep their rules', () => {
    for (const quality of ['low', 'medium', 'high'] as const) {
      for (let d = 0; d <= 200; d += 0.5) {
        const w = floraLodWeightsFor('shrub', quality, d);
        expect(w[0] + w[1] + w[2]).toBeCloseTo(1, 9);
        expect(Math.min(...w)).toBeGreaterThanOrEqual(-1e-9);
        // Adjacent levels only: never the full and the far model at once.
        expect(w[0] > 1e-9 && w[2] > 1e-9).toBe(false);
        expect(floraLodWeightsFor('oak', quality, d)).toEqual(floraLodWeights(quality, d));
      }
      expect(floraLodWeightsFor('shrub', quality, SHRUB_LOD_BANDS.middle[1] + 1)).toEqual([0, 0, 1]);
    }
    expect(floraLodWeightsFor('shrub', 'high', 0)).toEqual([1, 0, 0]);
    expect(floraLodWeightsFor('shrub', 'low', 0)[0]).toBe(0);
    expect(floraLodWeightsFor('pine', 'high', 900)).toEqual([1, 0, 0]);
  });
});

describe('leaves knocked loose', () => {
  it('stops falling leaves when an edge reaches terrain, before their centres sink', () => {
    const ground = (x: number, z: number) => x * 0.3 + z * 0.2;
    let queries = 0;
    const burst = createLeafBurst({ heightAt(x, z) { queries++; return ground(x, z); } }, null);
    const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3();
    let checked = 0;
    try {
      burst.release(0, 0.4, 0, 0.2, LEAF_BURST_POOL);
      for (let frame = 0; frame < 180; frame++) {
        burst.update(1 / 60, false);
        const held = burst.mesh.instanceMatrix.array.slice(), before = queries;
        burst.update(0, true);
        expect(burst.mesh.instanceMatrix.array).toEqual(held);
        expect(queries - before).toBe(0);
        for (let i = 0; i < burst.mesh.count; i++) {
          burst.mesh.getMatrixAt(i, matrix);
          if (matrix.elements[0] === 0 && matrix.elements[1] === 0 && matrix.elements[2] === 0) continue;
          const positions = burst.mesh.geometry.getAttribute('position');
          for (let v = 0; v < positions.count; v++) {
            vertex.fromBufferAttribute(positions, v).applyMatrix4(matrix);
            expect(vertex.y - ground(vertex.x, vertex.z)).toBeGreaterThanOrEqual(-1e-5);
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(1000);
    } finally { burst.dispose(); }
  });

  it('fall, drift downwind, settle on the ground and fade, within a fixed pool, and hold still in Reduced Motion', () => {
    const wind = new GrassWind(REALM_WIND), terrain = { heightAt: (x: number) => x * 0.05 };
    const burst = createLeafBurst(terrain, wind);
    expect(burst.release(0, 12, 0, 2, 10)).toBe(10);
    expect(burst.release(0, 12, 0, 2, 100)).toBe(LEAF_BURST_POOL - 10);
    expect(burst.release(Number.NaN, 12, 0, 2, 5)).toBe(0);
    burst.update(0.05, false);
    expect(burst.active).toBe(LEAF_BURST_POOL);
    const m = new THREE.Matrix4(), first = new THREE.Vector3(), later = new THREE.Vector3();
    burst.mesh.getMatrixAt(0, m); first.setFromMatrixPosition(m);
    const held = burst.mesh.instanceMatrix.array.slice();
    burst.update(0.5, true);
    expect(burst.mesh.instanceMatrix.array).toEqual(held);
    for (let i = 0; i < 40; i++) burst.update(0.1, false);
    burst.mesh.getMatrixAt(0, m); later.setFromMatrixPosition(m);
    expect(later.y).toBeLessThan(first.y);
    // Carried downwind on average.
    let drift = 0, n = 0;
    for (let i = 0; i < LEAF_BURST_POOL; i++) {
      burst.mesh.getMatrixAt(i, m); const p = new THREE.Vector3().setFromMatrixPosition(m);
      drift += p.x * REALM_WIND.direction[0] + p.z * REALM_WIND.direction[1]; n++;
    }
    expect(drift / n).toBeGreaterThan(0.5);
    for (let i = 0; i < 400; i++) burst.update(0.1, false);
    expect(burst.active).toBe(0);
    expect(burst.mesh.visible).toBe(false);
    burst.dispose(); burst.dispose();
    wind.dispose();
  });
  it('keeps grounded struck-leaf vertices clear of slopes while they settle', () => {
    let queries = 0;
    const ground = (x: number, z: number) => x * 0.3 + z * 0.2;
    const burst = createLeafBurst({ heightAt(x, z) { queries++; return ground(x, z); } }, null);
    const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3();
    const previous = Array.from({ length: LEAF_BURST_POOL }, () => new THREE.Vector3(Infinity, Infinity, Infinity));
    let grounded = 0;
    try {
      burst.release(0, 0.4, 0, 0.2, LEAF_BURST_POOL);
      for (let frame = 0; frame < 240; frame++) {
        burst.update(1 / 60, false);
        for (let i = 0; i < burst.mesh.count; i++) {
          burst.mesh.getMatrixAt(i, matrix);
          if (matrix.elements[0] === 0 && matrix.elements[1] === 0 && matrix.elements[2] === 0) continue;
          const p = previous[i]!, e = matrix.elements;
          if (p.x === e[12] && p.z === e[14]) {
            grounded++;
            const positions = burst.mesh.geometry.getAttribute('position');
            for (let v = 0; v < positions.count; v++) {
              vertex.fromBufferAttribute(positions, v).applyMatrix4(matrix);
              expect(vertex.y - ground(vertex.x, vertex.z)).toBeGreaterThanOrEqual(0.012 - 1e-5);
            }
          }
          p.set(e[12], e[13], e[14]);
        }
      }
      expect(grounded).toBeGreaterThan(100);
      const before = queries;
      for (let i = 0; i < 120; i++) burst.update(0, false);
      expect(queries - before).toBe(0);
    } finally { burst.dispose(); }
  });

});

let templates: PineTemplates, terrain: Terrain, excl: Exclusions, population: FloraTree[];
beforeAll(async () => {
  templates = await pineTemplates();
  terrain = new Terrain(); excl = new Exclusions(terrain);
  const source = createPineForest(templates), variants = new Map<string, TreeVariant>();
  const variantFor = (tree: Pick<FloraTree, 'sp' | 'v'>): TreeVariant => {
    const key = `${tree.sp}:${tree.v}`;
    let variant = variants.get(key);
    if (!variant) { variant = isPineSpecies(tree.sp) ? source.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1); variants.set(key, variant); }
    return variant;
  };
  population = createFloraPopulation(terrain, excl, (tree, footprint) => isPineSpecies(tree.sp)
    ? source.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : footprint > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : footprint,
  tree => groundedTreeY(terrain, tree, variantFor(tree)));
  registerFloraColliders(population, new Colliders());
  source.dispose();
  for (const variant of variants.values()) if (!isPineSpecies(variant.species)) for (const lod of variant.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); }
});

describe('the forest with wind, shadow-only casters and strikes', () => {
  it('casts shadows only from casters inside the sun volume, hides empty meshes, and shakes a struck tree', () => {
    vi.stubGlobal('location', { search: '' });
    const quality = 'high', f = field();
    const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } }, foliage: f }, templates);
    for (const lod of [0, 1, 2]) {
      const targets = forest.canopyAuditTargets!(lod);
      expect(targets.length).toBeLessThanOrEqual(forest.counts.trees);
      if (lod === 0) expect(targets).toHaveLength(forest.counts.trees);
      const counts: Record<string, number> = {};
      for (const target of targets) {
        expect(target.lod).toBe(lod);
        counts[target.species!] = (counts[target.species!] ?? 0) + 1;
      }
      if (lod === 0) {
        expect(counts).toEqual(forest.counts.species);
        expect(counts.pine).toBeGreaterThan(0);
        expect(targets.some(target => target.species === 'pine' && target.leaves)).toBe(true);
      } else {
        // Billboard LODs can omit wood; their populations must not be claimed as audited.
        for (const [species, count] of Object.entries(counts)) expect(count).toBeLessThanOrEqual(forest.counts.species[species]!);
      }
    }
    expect(() => forest.canopyAuditTargets!(-1)).toThrow(/LOD/);
    const rootTargets = forest.placementAuditTargets!();
    expect(rootTargets).toHaveLength(forest.counts.trees);
    expect(rootTargets.every(target => target.kind === 'root' && target.matrix.elements.every(Number.isFinite))).toBe(true);
    const colour = forest.group.children.filter((o) => (o as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
    const casters = forest.shadowCasters.children as THREE.InstancedMesh[];
    expect(casters.length).toBeGreaterThan(0);
    expect(colour.every((m) => !m.castShadow)).toBe(true);
    expect(casters.every((m) => !m.frustumCulled && m.castShadow && m.name.endsWith(':shadow') && m.customDepthMaterial)).toBe(true);
    expect(forest.shadowCasters.visible).toBe(false);
    // Every tree material carries the wind; leaves the foliage look.
    for (const m of colour.filter((m) => /solitary-pine/.test(m.name))) {
      expect((m.material as THREE.Material).customProgramCacheKey()).toMatch(/:foliage(:depth)?$/.test(m.name) ? /tervain-foliage-v6-leaf-focus-world1-gap1-mip1\|foliage-options:\[null,null\](\|leaf-(shade|depth))?$/ : /tervain-foliage-v6-wood-fill1\|foliage-options:\[null,null\]$/);
    }
    const tree = population.find((t) => t.sp === 'pine' && t.collisionId)!;
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1400);
    camera.position.set(tree.x, tree.y + 3, tree.z + 12); camera.lookAt(tree.x, tree.y + 6, tree.z); camera.updateMatrixWorld();
    const shadowCamera = new THREE.OrthographicCamera(-70, 70, 70, -70, 0.1, 400);
    shadowCamera.position.set(tree.x, tree.y + 150, tree.z); shadowCamera.lookAt(tree.x, tree.y, tree.z); shadowCamera.updateMatrixWorld();
    const shadow = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse));
    const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), shadowFrustum: shadow, reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    forest.update(0.1, frame);
    const assertCaptureBounds = () => {
      const corner = new THREE.Vector3(), instance = new THREE.Matrix4();
      for (const mesh of colour.filter(m => m.geometry.hasAttribute('aDistanceCoverage') && m.count > 0)) {
        expect(mesh.frustumCulled).toBe(true);
        expect(mesh.boundingSphere).not.toBeNull();
        mesh.geometry.computeBoundingBox();
        const box = mesh.geometry.boundingBox!;
        for (const slot of new Set([0, mesh.count - 1])) {
          mesh.getMatrixAt(slot, instance);
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            corner.set(x, y, z).applyMatrix4(instance);
            expect(mesh.boundingSphere!.distanceToPoint(corner)).toBeLessThan(0);
          }
        }
        const depth = colour.find(other => other !== mesh && other.instanceMatrix === mesh.instanceMatrix);
        if (depth) {
          expect(depth.frustumCulled).toBe(true);
          expect(depth.boundingSphere).toBe(mesh.boundingSphere);
        }
      }
    };
    assertCaptureBounds();
    const stats = forest.stats!();
    expect(stats.shadowTrees).toBeGreaterThan(0);
    expect(stats.shadowTris).toBeGreaterThan(0);
    // Outdoors, off-screen casters whose shadow cannot reach the view are left out; trees in view still cast.
    forest.update(0.1, { ...frame, shadowsForViewOnly: true });
    const viewOnly = forest.stats!();
    expect(viewOnly.shadowTrees).toBeLessThan(stats.shadowTrees!);
    expect(viewOnly.shadowTrees).toBeGreaterThan(0);
    forest.update(0.1, frame);
    expect(forest.stats!().shadowTrees).toBe(stats.shadowTrees);
    for (const m of [...colour, ...casters]) expect(m.visible).toBe(m.count > 0);
    // The nearest tree casts from its full model; trees across the volume from lighter ones.
    const near = casters.filter((m) => m.name.startsWith('solitary-pine:0:') && m.count > 0);
    expect(near.length).toBeGreaterThan(0);
    // The water's reflection draws the full-detail trees with their middle models, same instances, and gives them back (A76).
    const staticMeshes = [...colour, ...casters];
    const staticBefore = staticMeshes.map(m => ({ count: m.count, data: m.instanceMatrix.array.slice(), version: m.instanceMatrix.version,
      colourVersion: m.instanceColor?.version }));
    const coverageMeshes = colour.filter(m => m.geometry.hasAttribute('aDistanceCoverage'));
    const coverageBefore = coverageMeshes.map(m => {
      const attribute = m.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
      return { count: m.count, version: attribute.version, data: attribute.array.slice() };
    });
    const unions = vi.spyOn(THREE.Sphere.prototype, 'union');
    camera.position.x += 0.006;
    camera.updateMatrixWorld();
    forest.update(1 / 60, frame);
    const rebuiltBounds = new Set(unions.mock.contexts);
    unions.mockRestore();
    let unchanged = 0, savedBytes = 0;
    staticMeshes.forEach((m, i) => {
      const old = staticBefore[i]!;
      if (m.count === 0 || m.count !== old.count || m.instanceMatrix.array.some((v, k) => v !== old.data[k])) return;
      unchanged++;
      savedBytes += m.count * (64 + (m.instanceColor ? 12 : 0));
      expect(m.instanceMatrix.version).toBe(old.version);
      if (m.geometry.hasAttribute('aDistanceCoverage')) expect(rebuiltBounds.has(m.boundingSphere!)).toBe(false);
      if (m.instanceColor) expect(m.instanceColor.version).toBe(old.colourVersion);
    });
    let unchangedCoverage = 0, coverageBytes = 0;
    coverageMeshes.forEach((m, i) => {
      const old = coverageBefore[i]!;
      const attribute = m.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
      if (!m.count || m.count !== old.count || attribute.array.some((v, k) => v !== old.data[k])) return;
      unchangedCoverage++;
      coverageBytes += m.count * attribute.itemSize * 4;
      expect(attribute.version).toBe(old.version);
    });
    expect(unchangedCoverage).toBeGreaterThan(5);
    process.stdout.write(`unchanged forest coverage source bytes avoided: ${coverageBytes}\n`);
    expect(unchanged).toBeGreaterThan(5);
    process.stdout.write(`unchanged forest matrix/color source bytes avoided: ${savedBytes}\n`);
    // Growing back into unchanged CPU values still needs an upload: hidden tails may be stale on the GPU.
    camera.position.z += 10000; camera.updateMatrixWorld(); forest.update(1 / 60, frame);
    const hiddenCoverage = coverageMeshes.map(m => {
      const attribute = m.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
      return { count: m.count, version: attribute.version, data: attribute.array.slice() };
    });
    camera.position.z -= 10000; camera.updateMatrixWorld(); forest.update(1 / 60, frame);
    let grownUnchanged = 0;
    coverageMeshes.forEach((m, i) => {
      const old = hiddenCoverage[i]!;
      const attribute = m.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
      if (m.count <= old.count || attribute.array.some((v, k) => v !== old.data[k])) return;
      grownUnchanged++;
      expect(attribute.version).toBeGreaterThan(old.version);
    });
    expect(grownUnchanged).toBeGreaterThan(0);
    const packedPosition = camera.position.clone();
    camera.position.z += 10000; camera.updateMatrixWorld(); forest.update(1 / 60, frame);
    for (const mesh of colour.filter(m => m.geometry.hasAttribute('aDistanceCoverage'))) {
      expect(mesh.count).toBe(0);
      expect(mesh.boundingSphere!.isEmpty()).toBe(true);
    }
    camera.position.copy(packedPosition); camera.updateMatrixWorld(); forest.update(1 / 60, frame);
    assertCaptureBounds();
    const full = colour.filter((m) => /:0:(wood|foliage)$/.test(m.name) && m.count > 0);
    expect(full.length).toBeGreaterThan(0);
    const before = full.map((m) => m.geometry);
    const beforeMaterials = full.map((m) => m.material);
    const restore = forest.lighterForReflection();
    for (const [i, m] of full.entries()) {
      const middles = colour.filter((o) => o.name === m.name.replace(':0:', ':1:'));
      expect(m.geometry).not.toBe(before[i]);
      expect(middles.some((o) => o.geometry.index === m.geometry.index && o.geometry.getAttribute('position') === m.geometry.getAttribute('position'))).toBe(true);
      expect(m.geometry.getAttribute('aDistanceCoverage')).toBe(before[i]!.getAttribute('aDistanceCoverage'));
      if (m.name.endsWith(':wood')) expect(middles.some(o => o.material === m.material)).toBe(true);
      else expect(m.material).toBe(beforeMaterials[i]);
    }
    assertCaptureBounds();
    const proxies = full.map((m) => m.geometry);
    const captureMaterials = full.map(m => m.material);
    const restoreNested = forest.lighterForReflection();
    restoreNested();
    full.forEach((m, i) => { expect(m.geometry).toBe(proxies[i]); expect(m.material).toBe(captureMaterials[i]); });
    restore();
    full.forEach((m, i) => { expect(m.geometry).toBe(before[i]); expect(m.material).toBe(beforeMaterials[i]); });
    const pairs = new Set<unknown>(), push = Array.prototype.push;
    Array.prototype.push = function(this: unknown[], ...values: unknown[]) {
      for (const value of values) if (Array.isArray(value) && value.length === 2
        && (value[0] as THREE.InstancedMesh)?.isInstancedMesh && (value[1] as THREE.BufferGeometry)?.isBufferGeometry) pairs.add(value);
      return push.apply(this, values);
    };
    try { for (let i = 0; i < 12; i++) forest.lighterForReflection()(); }
    finally { Array.prototype.push = push; }
    expect(pairs.size).toBe(0);
    const outer = forest.lighterForReflection(), inner = forest.lighterForReflection();
    inner(); full.forEach((mesh, i) => expect(mesh.geometry).toBe(proxies[i]));
    outer(); full.forEach((mesh, i) => expect(mesh.geometry).toBe(before[i]));
    const next = forest.lighterForReflection();
    outer(); full.forEach((mesh, i) => expect(mesh.geometry).toBe(proxies[i]));
    next(); next(); full.forEach((mesh, i) => expect(mesh.geometry).toBe(before[i]));
    // An arrow in the trunk shakes it and knocks leaves loose; one in open air hits nothing.
    const ground = terrain.heightAt(tree.x, tree.z);
    expect(forest.strike(tree.x + 0.1, ground + 1.5, tree.z, 1, tree.collisionId!)).toBe(true);
    const slot = f.shakes.value.find((s) => s.w > 0)!;
    expect([slot.x, slot.y]).toEqual([tree.x, tree.z]);
    expect(slot.w).toBeGreaterThan(0.1);
    expect(slot.w).toBeLessThanOrEqual(1.2);
    forest.update(0.1, frame);
    expect(forest.stats!().struckLeaves).toBeGreaterThan(0);
    expect(forest.strike(tree.x + 40, ground + 1.5, tree.z + 40, 1, tree.collisionId!)).toBe(false);
    expect(forest.strike(tree.x, ground + 400, tree.z, 1, tree.collisionId!)).toBe(false);
    expect(forest.strike(Number.NaN, 0, 0)).toBe(false);
    // Four slots: the oldest strike makes way.
    for (let i = 0; i < 6; i++) forest.strike(tree.x, ground + 1, tree.z, 1, tree.collisionId!);
    expect(f.shakes.value.filter((s) => s.w > 0)).toHaveLength(FOLIAGE_MAX_SHAKES);
    // Across the shader clock's wrap the slot struck longest ago still makes way, not the one just written (A95 scout).
    f.shakes.value.forEach((slot, i) => { slot.z = 16370 + i; });
    f.wind.uniforms.uGrassTime.value = 5;
    forest.strike(tree.x, ground + 1, tree.z, 1, tree.collisionId!);
    expect(f.shakes.value.map((slot) => slot.z)).toEqual([5, ...Array.from({ length: FOLIAGE_MAX_SHAKES - 1 }, (_, i) => 16371 + i)]);
    forest.strike(tree.x, ground + 1, tree.z, 1, tree.collisionId!);
    expect(f.shakes.value.map((slot) => slot.z)).toEqual([5, 5, ...Array.from({ length: FOLIAGE_MAX_SHAKES - 2 }, (_, i) => 16372 + i)]);
    const shared = full.map((m) => m.geometry.getAttribute('position'));
    forest.dispose!();
    // The reflection stand-ins are let go with the world, without taking the shared vertex buffers along (A95 scout).
    for (const proxy of proxies) expect(Object.keys(proxy.attributes)).toHaveLength(0);
    for (const position of shared) expect(position).toBeDefined();
    f.wind.dispose();
    vi.unstubAllGlobals();
  });

  it('excludes empty lateral regions of tall-tree spheres from narrow views', () => {
    vi.stubGlobal('location', { search: '' });
    const f = field(), quality = 'high';
    const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } }, foliage: f }, templates);
    try {
      // Independent reference: collect every detail level by placement before inspecting packed draws.
      const source = new Map<string, { matrix: THREE.Matrix4; local: THREE.Box3; world?: THREE.Box3 }>();
      for (const lod of [0, 1, 2]) for (const target of forest.canopyAuditTargets!(lod)) {
        let record = source.get(target.label);
        if (!record) { record = { matrix: target.matrix, local: new THREE.Box3() }; source.set(target.label, record); }
        for (const geometry of [target.wood, target.leaves]) {
          if (!geometry) continue;
          geometry.computeBoundingBox(); record.local.union(geometry.boundingBox!);
        }
      }
      for (const record of source.values()) record.world = record.local.clone().applyMatrix4(record.matrix).expandByScalar(2);
      const tree = population.find(t => t.sp === 'pine' && t.collisionId)!;
      const camera = new THREE.PerspectiveCamera(20, 1, .1, 400);
      const matrix = new THREE.Matrix4(), view = new THREE.Frustum(), records = [...source.values()];
      let checked = 0;
      for (const yaw of [0, .7, 1.4]) {
        camera.position.set(tree.x, tree.y + 8, tree.z + 12);
        camera.lookAt(camera.position.x + Math.sin(yaw) * 20, camera.position.y, camera.position.z - Math.cos(yaw) * 20);
        camera.updateMatrixWorld(true);
        const frame: FrameContext = { camera, quality, time: 1, focus: camera.position, nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), reducedMotion: true, hour: 11, view: worldView(createInitialState()) };
        forest.update(.1, frame);
        view.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        for (const child of forest.group.children) {
          const mesh = child as THREE.InstancedMesh;
          if (!mesh.isInstancedMesh || !/:wood$|:foliage$/.test(mesh.name)) continue;
          for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, matrix);
            const record = records.find(r => r.matrix.elements.every((v, j) => Math.abs(v - matrix.elements[j]!) < .001));
            expect(record, 'packed tree must identify an authored placement').toBeDefined();
            expect(view.intersectsBox(record!.world!), 'a packed tree must have source bounds in the guarded view').toBe(true);
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(0);
    } finally { forest.dispose!(); f.wind.dispose(); vi.unstubAllGlobals(); }
  });

  it('builds no casters on Low and keeps the colour pass unchanged without a shared wind', () => {
    vi.stubGlobal('location', { search: '' });
    const low = buildFlora({ terrain, excl, colliders: new Colliders(), quality: 'low', settings: { ...defaultSettings(), quality: 'low' }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } }, foliage: field() }, templates);
    expect(low.shadowCasters.children).toHaveLength(0);
    const lowLeaves = low.group.children.filter(o => (o as THREE.Mesh).isMesh && o.name.endsWith(':foliage')) as THREE.Mesh[];
    const maskedLow = lowLeaves.filter(o => (o.material as THREE.Material).alphaTest > 0);
    expect(maskedLow.length).toBeGreaterThan(0);
    expect(maskedLow.every(o => !(o.material as THREE.Material).alphaToCoverage)).toBe(true);
    low.dispose!();
    const plain = buildFlora({ terrain, excl, colliders: new Colliders(), quality: 'medium', settings: { ...defaultSettings(), quality: 'medium' }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    const leaf = plain.group.children.find((o) => o.name.endsWith(':0:foliage')) as THREE.InstancedMesh;
    expect((leaf.material as THREE.Material).customProgramCacheKey()).not.toContain('tervain-foliage');
    const maskedMedium = plain.group.children.filter(o => (o as THREE.Mesh).isMesh && o.name.endsWith(':foliage') && ((o as THREE.Mesh).material as THREE.Material).alphaTest > 0) as THREE.Mesh[];
    expect(maskedMedium.length).toBeGreaterThan(0);
    expect(maskedMedium.every(o => (o.material as THREE.Material).alphaToCoverage)).toBe(true);
    expect(plain.strike(0, 0, 0)).toBe(false);
    plain.dispose!();
    vi.unstubAllGlobals();
  });
});
