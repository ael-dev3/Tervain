import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { NPC_NORMAL_FORWARD_FLOOR, NPC_SCULPT_NORMAL_STRENGTH, repairNpcSurfaceGeometry, repairNpcSurfaceMaterial } from '../../src/presentation/npcSurface';

/** Two connected original facets with split UV vertices; no source-game or downloaded model data. */
function facets(second = [-1, 0, 1], secondNormal = [0, 0, 1]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, ...second], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, ...secondNormal, ...secondNormal, ...secondNormal], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0.5, 0, 0.5, 1, 1, 0], 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(24), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
  geometry.setAttribute('tangent', new THREE.Float32BufferAttribute(Array.from({ length: 6 }, () => [0, 0, 1, 1]).flat(), 4));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

const at = (geometry: THREE.BufferGeometry, vertex: number) => new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), vertex);

describe('owned NPC shading repair', () => {
  it('replaces stale sculpt normals with coherent geometry while retaining UV-seam continuity and all geometry/skin data', () => {
    const geometry = facets(), retained = new Map(['position', 'uv', 'skinIndex', 'skinWeight'].map(key => [key, { attribute: geometry.getAttribute(key), bytes: Array.from(geometry.getAttribute(key).array) }]));
    const index = geometry.index, indices = Array.from(index!.array), box = geometry.boundingBox!.clone(), sphere = geometry.boundingSphere!.clone();
    const report = repairNpcSurfaceGeometry(geometry);
    expect(report.seamVertices).toBe(4); expect(report.normalGroups).toBe(4);
    expect(at(geometry, 0).distanceTo(at(geometry, 3))).toBe(0);
    expect(at(geometry, 2).distanceTo(at(geometry, 4))).toBe(0);
    expect(at(geometry, 0).x).toBeGreaterThan(0.3); expect(at(geometry, 0).z).toBeGreaterThan(0.85);
    expect(at(geometry, 5).toArray()).toEqual([Math.SQRT1_2, 0, Math.SQRT1_2].map(Math.fround));
    for (const [name, data] of retained) { expect(geometry.getAttribute(name)).toBe(data.attribute); expect(Array.from(data.attribute.array)).toEqual(data.bytes); }
    expect(geometry.index).toBe(index); expect(Array.from(geometry.index!.array)).toEqual(indices);
    expect(geometry.boundingBox!.equals(box)).toBe(true); expect(geometry.boundingSphere!.equals(sphere)).toBe(true);
  });

  it('retains real hard-crease islands and never averages oppositely facing coincident surfaces', () => {
    const crease = facets([0, 0, 1], [1, 0, 0]); repairNpcSurfaceGeometry(crease);
    expect(at(crease, 0).toArray()).toEqual([0, 0, 1]); expect(at(crease, 3).toArray()).toEqual([1, 0, 0]);
    const opposing = facets([1, 0, 0], [0, 0, -1]); repairNpcSurfaceGeometry(opposing);
    expect(at(opposing, 0).toArray()).toEqual([0, 0, 1]); expect(at(opposing, 3).toArray()).toEqual([0, 0, -1]);
  });

  it('does not smooth through exact-position vertices with different skin bindings or near-position vertices', () => {
    const skin = facets(); skin.getAttribute('skinIndex').setX(3, 1); repairNpcSurfaceGeometry(skin);
    expect(at(skin, 0).toArray()).toEqual([0, 0, 1]); expect(at(skin, 3).x).toBeGreaterThan(0.7);
    const nearby = facets(); nearby.getAttribute('position').setX(3, 1e-8); repairNpcSurfaceGeometry(nearby);
    expect(at(nearby, 0).toArray()).toEqual([0, 0, 1]); expect(at(nearby, 3).x).toBeGreaterThan(0.7);
  });

  it('does not allow a reversed collapsed fold to cancel the outward normal and keeps degenerate geometry finite', () => {
    const geometry = facets([1, 0, 0]);
    const report = repairNpcSurfaceGeometry(geometry);
    expect(report.opposedCorners).toBe(3);
    for (let vertex = 0; vertex < 6; vertex++) expect(at(geometry, vertex).toArray()).toEqual([0, 0, 1]);
    const degenerate = facets([0, 0, 0]);
    expect(repairNpcSurfaceGeometry(degenerate).degenerateTriangles).toBe(1);
    expect(Array.from(degenerate.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
  });

  it('rebuilds finite unit orthogonal tangents while retaining the authored Blender handedness, even across inverted glTF UVs', () => {
    const geometry = facets(), uv = geometry.getAttribute('uv');
    const inputTangents = geometry.getAttribute('tangent');
    for (let vertex = 0; vertex < 6; vertex++) inputTangents.setW(vertex, vertex % 2 ? -1 : 1);
    for (let vertex = 0; vertex < 3; vertex++) uv.setXY(vertex, 0.5, 0.5);
    expect(repairNpcSurfaceGeometry(geometry).rebuiltTangents).toBe(true);
    const tangent = geometry.getAttribute('tangent');
    for (let vertex = 0; vertex < 6; vertex++) {
      const t = new THREE.Vector3().fromBufferAttribute(tangent, vertex);
      expect(t.length()).toBeCloseTo(1, 6); expect(t.dot(at(geometry, vertex))).toBeCloseTo(0, 6);
      expect(tangent.getW(vertex)).toBe(vertex % 2 ? -1 : 1);
    }
  });

  it('conditions backward bake Z before THREE uses it, preserves prior shader/environment hooks and immutable map payloads', () => {
    const image = { width: 1, height: 1 }, map = new THREE.Texture(image), normal = new THREE.Texture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map, normalMap: normal });
    const previous = vi.fn((shader: Parameters<typeof material.onBeforeCompile>[0]) => { shader.uniforms.uPriorEnvironment = { value: 0.75 }; shader.fragmentShader += '\n// prior sky patch'; });
    material.onBeforeCompile = previous; material.customProgramCacheKey = () => 'prior-environment-v3';
    repairNpcSurfaceMaterial(material); repairNpcSurfaceMaterial(material);
    expect(material.normalScale.toArray()).toEqual([NPC_SCULPT_NORMAL_STRENGTH, NPC_SCULPT_NORMAL_STRENGTH]);
    const shader = { fragmentShader: '#include <normal_fragment_maps>', vertexShader: '', uniforms: {} } as Parameters<typeof material.onBeforeCompile>[0];
    material.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    expect(previous).toHaveBeenCalledOnce(); expect(shader.uniforms.uPriorEnvironment?.value).toBe(0.75);
    expect(shader.fragmentShader).toContain('// prior sky patch');
    expect(shader.fragmentShader).toContain(`mapN.z = max( mapN.z, ${NPC_NORMAL_FORWARD_FLOOR.toFixed(6)} );`);
    expect(shader.fragmentShader.indexOf('mapN.z = max')).toBeLessThan(shader.fragmentShader.indexOf('mapN.xy *= normalScale;'));
    expect(shader.fragmentShader.indexOf('mapN.xy *= normalScale;')).toBeLessThan(shader.fragmentShader.indexOf('normal = normalize( tbn * mapN );'));
    expect(material.customProgramCacheKey()).toBe('prior-environment-v3|tervain-npc-forward-normal-v1');
    expect(material.map).toBe(map); expect(material.normalMap).toBe(normal); expect(normal.image).toBe(image); expect(map.colorSpace).toBe(THREE.SRGBColorSpace);
    // Safety property for encoded extremes, including black/missed bake pixels and a true zero-strength normal.
    for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) for (const strength of [0, NPC_SCULPT_NORMAL_STRENGTH, 1]) {
      const conditioned = new THREE.Vector3(x * strength, y * strength, Math.max(z, NPC_NORMAL_FORWARD_FLOOR)).normalize();
      expect(conditioned.z).toBeGreaterThan(0); expect(conditioned.length()).toBeCloseTo(1, 12);
      if (strength === 0) expect(conditioned.distanceTo(new THREE.Vector3(0, 0, 1))).toBe(0);
    }
  });

  it('keeps distinct inherited shader-hook cache identities after adding the common normal repair', () => {
    const left = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture() });
    const right = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture() });
    const called: string[] = [];
    left.onBeforeCompile = shader => { called.push('left'); shader.uniforms.uLeftSky = { value: 0.2 }; };
    right.onBeforeCompile = shader => { called.push('right'); shader.uniforms.uRightSky = { value: 0.6 }; };
    const leftKey = left.customProgramCacheKey(), rightKey = right.customProgramCacheKey();
    expect(leftKey).not.toBe(rightKey);
    repairNpcSurfaceMaterial(left); repairNpcSurfaceMaterial(right);
    expect(left.customProgramCacheKey()).not.toBe(right.customProgramCacheKey());
    expect(left.customProgramCacheKey()).toContain(leftKey); expect(right.customProgramCacheKey()).toContain(rightKey);
    const shader = () => ({ fragmentShader: '#include <normal_fragment_maps>', vertexShader: '', uniforms: {} }) as Parameters<typeof left.onBeforeCompile>[0];
    const one = shader(), two = shader();
    left.onBeforeCompile(one, {} as THREE.WebGLRenderer); right.onBeforeCompile(two, {} as THREE.WebGLRenderer);
    expect(called).toEqual(['left', 'right']);
    expect(one.uniforms.uLeftSky?.value).toBe(0.2); expect(two.uniforms.uRightSky?.value).toBe(0.6);
    expect(one.fragmentShader).toContain('mapN.z = max'); expect(two.fragmentShader).toContain('mapN.z = max');
  });

  it('keeps a custom cache key live with its material receiver instead of freezing its initial variant', () => {
    const material = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture(), roughness: 0.6 });
    material.customProgramCacheKey = function(this: THREE.MeshStandardMaterial) { return `coat-${this.roughness}`; };
    repairNpcSurfaceMaterial(material);
    expect(material.customProgramCacheKey()).toBe('coat-0.6|tervain-npc-forward-normal-v1');
    material.roughness = 0.85;
    expect(material.customProgramCacheKey()).toBe('coat-0.85|tervain-npc-forward-normal-v1');
  });

  it('leaves untextured/object-space materials unchanged and fails explicitly if a later shader no longer has the standard normal path', () => {
    const bare = new THREE.MeshStandardMaterial(), object = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture(), normalMapType: THREE.ObjectSpaceNormalMap });
    const beforeBare = bare.onBeforeCompile, beforeObject = object.onBeforeCompile;
    repairNpcSurfaceMaterial(bare); repairNpcSurfaceMaterial(object);
    expect(bare.onBeforeCompile).toBe(beforeBare); expect(object.onBeforeCompile).toBe(beforeObject);
    const normal = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture() }); repairNpcSurfaceMaterial(normal);
    const changed = { fragmentShader: 'changed shader', vertexShader: '', uniforms: {} } as Parameters<typeof normal.onBeforeCompile>[0];
    expect(() => normal.onBeforeCompile(changed, {} as THREE.WebGLRenderer)).toThrow(/cannot find/);
  });
});
