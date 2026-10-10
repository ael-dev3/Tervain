import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { bladeRow, clumpTriangles, createGrassClump } from '../../src/presentation/grass/bladeGeometry';
import { GUST_SPAN, GUST_TEXELS, GrassWind, gustField } from '../../src/presentation/grass/wind';
import { GrassTrample, TRAMPLE_MAX_MOVERS, TRAMPLE_RECOVERY, type GrassMover } from '../../src/presentation/grass/trample';
import { createGrassMaterial, type GrassMaterialOptions } from '../../src/presentation/grass/grassMaterial';
import { createGrassField, GRASS_CLUMP, GRASS_MAX_SCALE, GRASS_QUALITY } from '../../src/presentation/grass/grassField';
import { Habitat } from '../../src/presentation/ground/habitat';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { ARRIVAL_ROUTE } from '../../src/world/layout';

const WIND = { direction: [0.6, 0.8] as [number, number], steady: 0.2, gust: 0.5, speed: 4 };
const look = { rootShade: 0.3, tipLift: 0.3, translucency: 1, sheen: 0.5, transTint: new THREE.Color(1, 1, 0.5) };

function materialOptions(wind: GrassWind, extra: Partial<GrassMaterialOptions> = {}): GrassMaterialOptions {
  return {
    wind, look, farBlades: 0.5,
    clump: { radius: 0.3, width: 0.04, height: 0.5, blades: 12 },
    fade: { start: 20, end: 60, sizeComp: 2, power: 1.3 },
    ...extra,
  };
}

function lambertShader() {
  return { vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader, uniforms: {} } as Parameters<THREE.Material['onBeforeCompile']>[0];
}

describe('grass blade clumps', () => {
  it('encodes each blade as rows of edge pairs narrowing to one tip, indexed into triangles', () => {
    for (const spec of [{ blades: 1, segments: 1 }, { blades: 18, segments: 4 }, { blades: 24, segments: 5 }]) {
      const g = createGrassClump(spec);
      const position = g.getAttribute('position');
      const perBlade = spec.segments * 2 + 1;
      expect(position.count).toBe(spec.blades * perBlade);
      expect(g.index!.count).toBe(clumpTriangles(spec) * 3);
      expect(Array.from(g.index!.array).every((i) => i >= 0 && i < position.count)).toBe(true);
      for (let b = 0; b < spec.blades; b++) {
        let lastT = -1;
        for (let k = 0; k < perBlade; k++) {
          const v = b * perBlade + k;
          expect(position.getX(v)).toBe(b);
          const t = position.getY(v), edge = position.getZ(v);
          expect(t).toBeGreaterThanOrEqual(0);
          expect(t).toBeLessThanOrEqual(1);
          if (k === perBlade - 1) {
            expect([t, edge]).toEqual([1, 0]);
          } else {
            expect(Math.abs(edge)).toBe(1);
            if (k % 2 === 0) { expect(t).toBeGreaterThan(lastT); lastT = t; }
          }
        }
      }
      g.dispose();
    }
    expect(bladeRow(0, 4)).toBe(0);
    expect(bladeRow(4, 4)).toBe(1);
    // Rows bunch toward the tip, where a bending blade curves most.
    expect(bladeRow(3, 4) - bladeRow(2, 4)).toBeLessThan(bladeRow(1, 4) - bladeRow(0, 4));
    expect(() => createGrassClump({ blades: 0, segments: 3 })).toThrow(RangeError);
    expect(() => createGrassClump({ blades: 4, segments: 0 })).toThrow(RangeError);
    expect(() => createGrassClump({ blades: 2.5, segments: 3 })).toThrow(RangeError);
  });
});

describe('grass wind', () => {
  it('reads the same gust field on the CPU as the shader samples, tiling seamlessly', () => {
    const wind = new GrassWind(WIND);
    const data = gustField();
    expect(data).toBe(gustField());
    expect(data.length).toBe(GUST_TEXELS * GUST_TEXELS * 4);
    // At a texel centre the bilinear lookup is that texel (the shader's LinearFilter with RepeatWrapping).
    for (const [i, j] of [[0, 0], [17, 90], [127, 64]] as const) {
      const x = ((i + 0.5) / GUST_TEXELS) * GUST_SPAN, z = ((j + 0.5) / GUST_TEXELS) * GUST_SPAN;
      expect(wind.gustAt(x, z)).toBeCloseTo(data[(j * GUST_TEXELS + i) * 4]! / 255, 6);
      expect(wind.gustAt(x + GUST_SPAN, z - 3 * GUST_SPAN)).toBeCloseTo(wind.gustAt(x, z), 6);
    }
    let lo = 1, hi = 0;
    for (let x = 0; x < GUST_SPAN; x += 0.7) for (let z = 0; z < GUST_SPAN; z += 0.7) {
      const g = wind.gustAt(x, z);
      lo = Math.min(lo, g); hi = Math.max(hi, g);
    }
    // Calm troughs and full gusts both occur.
    expect(lo).toBeLessThan(0.2);
    expect(hi).toBeGreaterThan(0.8);
    wind.dispose();
  });

  it('carries gust fronts downwind at the wind speed', () => {
    const wind = new GrassWind(WIND);
    wind.update(0);
    const before = [[3, 4], [20, -11], [-7, 30]].map(([x, z]) => wind.gustAt(x!, z!));
    for (let i = 0; i < 30; i++) wind.update(1 / 30);
    const [dx, dz] = wind.direction;
    [[3, 4], [20, -11], [-7, 30]].forEach(([x, z], k) => {
      expect(wind.gustAt(x! + dx * WIND.speed, z! + dz * WIND.speed)).toBeCloseTo(before[k]!, 1);
    });
    const push = wind.pushAt(5, 5);
    expect(push).toBeGreaterThanOrEqual(WIND.steady - 1e-9);
    expect(push).toBeLessThanOrEqual(WIND.steady + WIND.gust + 1e-9);
    wind.dispose();
  });

  it('eases strength changes, and keeps only a faint still lean in reduced motion', () => {
    const wind = new GrassWind(WIND);
    wind.update(0.1);
    const time = wind.uniforms.uGrassTime.value;
    const scroll = wind.uniforms.uGustScroll.value.clone();
    wind.update(0.1, { reducedMotion: true });
    expect(wind.uniforms.uGrassTime.value).toBe(time);
    expect(wind.uniforms.uGustScroll.value.equals(scroll)).toBe(true);
    expect(wind.uniforms.uWindDir.value.w).toBe(0);
    expect(wind.uniforms.uWindDir.value.z).toBeLessThan(WIND.steady * 0.4);
    wind.update(0.1, { strength: 0 });
    // Air has inertia: a calm does not fall at once.
    expect(wind.uniforms.uWindDir.value.z).toBeGreaterThan(WIND.steady * 0.8);
    for (let i = 0; i < 100; i++) wind.update(0.1, { strength: 0 });
    expect(wind.uniforms.uWindDir.value.z).toBeLessThan(WIND.steady * 0.01);
    wind.update(Number.NaN, { strength: Number.NaN });
    expect([...wind.uniforms.uWindDir.value.toArray(), ...wind.uniforms.uGustScroll.value.toArray()].every(Number.isFinite)).toBe(true);
    // The direction veers, but only a few degrees from the prevailing wind.
    for (let i = 0; i < 2000; i++) wind.update(0.1);
    const [x, z] = wind.direction;
    expect(Math.acos(x * 0.6 + z * 0.8)).toBeLessThan(0.25);
    const dispose = vi.spyOn(wind.uniforms.tGust.value, 'dispose');
    wind.dispose(); wind.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('grass trample field', () => {
  it('keeps the nearest movers it can hold and drops ones that are not real bodies', () => {
    const trample = new GrassTrample(64, 32);
    const movers: GrassMover[] = [];
    for (let i = 0; i < 80; i++) movers.push({ x: i, z: 0, radius: 0.5 });
    movers.push({ x: Number.NaN, z: 0, radius: 1 }, { x: 1, z: 1, radius: 0 }, { x: 1, z: 1, radius: -2 });
    trample.setMovers(movers, 79, 0);
    const held = (trample as unknown as { movers: GrassMover[] }).movers;
    expect(held).toHaveLength(TRAMPLE_MAX_MOVERS);
    expect(Math.min(...held.map((m) => m.x))).toBe(80 - TRAMPLE_MAX_MOVERS);
    // A field that follows the focus holds no data until it has been placed.
    expect(trample.activeMovers).toBe(0);
    expect(trample.uniforms.uTrample.value.w).toBe(0);
    trample.dispose(); trample.dispose();
  });

  it('counts only movers inside a fixed field, and recovers bends before flattening', () => {
    const trample = new GrassTrample(64, 20, { x: 0, z: 0 });
    trample.setMovers([{ x: 0, z: 0, radius: 1 }, { x: 10.5, z: 0, radius: 0.6 }, { x: 30, z: 0, radius: 1 }]);
    expect(trample.activeMovers).toBe(2);
    expect(TRAMPLE_RECOVERY.flat).toBeGreaterThan(TRAMPLE_RECOVERY.push * 4);
    trample.dispose();
  });

  it('never touches the renderer once disposed', () => {
    const trample = new GrassTrample(16, 8, { x: 0, z: 0 });
    trample.dispose();
    const renderer = { getRenderTarget: vi.fn(), setRenderTarget: vi.fn(), render: vi.fn(), clear: vi.fn() };
    trample.update(renderer as unknown as THREE.WebGLRenderer, 0, 0, 1 / 30);
    expect(renderer.render).not.toHaveBeenCalled();
    expect(trample.uniforms.tTrample.value).toBeNull();
  });
});

describe('grass material', () => {
  it('builds the blade in the actual Lambert chunks and lights it as a thin leaf', () => {
    const wind = new GrassWind(WIND);
    const trample = new GrassTrample(16, 8, { x: 0, z: 0 });
    const patch = vi.fn();
    const grass = createGrassMaterial(materialOptions(wind, { trample, patch, patchKey: 'wisp4' }));
    const shader = lambertShader();
    grass.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(grass.ok()).toBe(true);
    expect(patch).toHaveBeenCalledWith(shader);
    expect(shader.vertexShader).toContain('float gBlade = position.x;');
    expect(shader.vertexShader).toContain('vec3 transformed = gBladePos;');
    expect(shader.vertexShader).not.toContain('#include <beginnormal_vertex>');
    expect(shader.fragmentShader).toContain('#define RE_Direct RE_Direct_Grass');
    // Declared after Lambert's own light functions and in force before the light loop uses RE_Direct.
    const f = shader.fragmentShader;
    expect(f.indexOf('void RE_Direct_Grass')).toBeGreaterThan(f.indexOf('#include <lights_lambert_pars_fragment>'));
    expect(f.indexOf('#define RE_Direct RE_Direct_Grass')).toBeLessThan(f.indexOf('#include <lights_fragment_begin>'));
    // Blades are lit from the side facing the viewer; the double-sided flip would darken every back face.
    expect(shader.fragmentShader).not.toContain('normal *= faceDirection;');
    expect(shader.fragmentShader).toContain('diffuseColor.rgb = vGCol * ( 0.8 + 0.28 * ( 1.0 - abs( vGInfo.y ) ) );');
    expect(shader.vertexShader).not.toMatch(/\b(?:NaN|Infinity|undefined)\b/);
    // Shared uniforms are the live objects, so wind and trample updates reach every compiled program.
    expect(shader.uniforms.uGrassTime).toBe(wind.uniforms.uGrassTime);
    expect(shader.uniforms.tGust).toBe(wind.uniforms.tGust);
    expect(shader.uniforms.tTrample).toBe(trample.uniforms.tTrample);
    expect(shader.uniforms.uBand).toBe(grass.uniforms.uBand);
    expect(grass.material.customProgramCacheKey()).toContain('wisp4');
    grass.setBand({ inStart: 1, inEnd: 2, outStart: 3, outEnd: 4 });
    expect(grass.uniforms.uBand.value.toArray()).toEqual([1, 2, 3, 4]);
    expect(grass.material.side).toBe(THREE.DoubleSide);
    expect(grass.material.userData.preparationTextures).toEqual([wind.uniforms.tGust.value]);
    grass.material.dispose(); trample.dispose(); wind.dispose();
  });

  it('hides itself rather than drawing garbage if Three changes the chunks it relies on', () => {
    const wind = new GrassWind(WIND);
    const grass = createGrassMaterial(materialOptions(wind));
    const shader = lambertShader();
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    grass.material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(grass.ok()).toBe(false);
    expect(shader.fragmentShader).toContain('discard');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    grass.material.dispose(); wind.dispose();
  });
});

describe('realm grass field', () => {
  it('sows clumps on open ground along the arrival route, anchored to the terrain and clear of solid things', () => {
    const terrain = new Terrain(), colliders = new Colliders(), excl = new Exclusions(terrain);
    const habitat = new Habitat({ terrain, colliders, excl, plantedCrowns: { coverAt: () => 0, broadleafAt: () => 0 } });
    const wind = new GrassWind(WIND);
    const field = createGrassField(terrain, habitat, 'low', wind, null);
    let found = 0, checked = 0;
    for (const p of ARRIVAL_ROUTE.slice(0, 6)) {
      const camera = new THREE.Vector3(p.x, terrain.heightAt(p.x, p.z) + 1.7, p.z);
      field.update(camera);
      const stats = field.stats();
      found += stats.instances;
      expect(stats.triangles).toBeGreaterThanOrEqual(stats.instances * clumpTriangles(GRASS_QUALITY.low.far.clump));
      for (const layer of field.layers) for (const child of layer.group.children) {
        const mesh = child as THREE.Mesh<THREE.InstancedBufferGeometry>;
        if (!mesh.visible) continue;
        const base = mesh.geometry.getAttribute('aBase'), shape = mesh.geometry.getAttribute('aShape'), slope = mesh.geometry.getAttribute('aSlope');
        for (let i = 0; i < mesh.geometry.instanceCount; i += 7) {
          const x = base.getX(i), z = base.getZ(i);
          expect(base.getY(i)).toBeCloseTo(terrain.heightAt(x, z) - 0.02, 4);
          expect(habitat.hardBlocked(x, z, GRASS_CLUMP.radius * shape.getY(i))).toBe(false);
          expect(shape.getZ(i)).toBeLessThanOrEqual(GRASS_MAX_SCALE.height + 1e-6);
          expect(shape.getY(i)).toBeLessThanOrEqual(GRASS_MAX_SCALE.radius + 1e-6);
          const gx = (terrain.heightAt(x + 0.35, z) - terrain.heightAt(x - 0.35, z)) / 0.7;
          expect(slope.getX(i)).toBeCloseTo(gx, 4);
          expect(slope.getW(i)).toBeLessThanOrEqual(0.2 + 1e-6);
          checked++;
        }
      }
    }
    expect(found).toBeGreaterThan(500);
    expect(checked).toBeGreaterThan(100);
    // A material whose chunks failed hides the whole field rather than drawing broken blades.
    (field.materials[0] as unknown as { ok: () => boolean }).ok = () => false;
    field.update(new THREE.Vector3(ARRIVAL_ROUTE[2]!.x, 5, ARRIVAL_ROUTE[2]!.z));
    expect(field.stats().instances).toBe(0);
    field.dispose();
    wind.dispose();
  });
});
