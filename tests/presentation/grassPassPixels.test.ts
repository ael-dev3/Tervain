import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createGrassMaterial } from '../../src/presentation/grass/grassMaterial';
import { GrassWind } from '../../src/presentation/grass/wind';

it('uses physical pass viewport height for projected blade/head coverage', () => {
  const wind = new GrassWind({ direction: [1, 0], steady: 0, gust: 0, speed: 0 });
  const grass = createGrassMaterial({ wind, look: { rootShade: .3, tipLift: .3, translucency: 1, sheen: .3, transTint: new THREE.Color(1, 1, 1) },
    farBlades: 1, clump: { radius: .3, width: .04, height: .8, blades: 6 }, fade: { start: 0, end: 100, sizeComp: 1, power: 1 } });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), geometry = new THREE.PlaneGeometry(), object = new THREE.Mesh(geometry);
  let height = 256;
  const renderer = { getDrawingBufferSize: (v: THREE.Vector2) => v.set(2880, 1800), getCurrentViewport: (v: THREE.Vector4) => v.set(0, 0, height, height) } as unknown as THREE.WebGLRenderer;
  try {
    for (const passHeight of [256, 128, 1800, 512]) {
      height = passHeight;
      grass.material.onBeforeRender(renderer, scene, camera, geometry, object, {} as THREE.Group);
      expect(grass.uniforms.uGrassPx.value).toBe(passHeight);
    }
  } finally { geometry.dispose(); grass.material.dispose(); wind.dispose(); }
});
