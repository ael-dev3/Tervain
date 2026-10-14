import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { RANK_HEADROOM, TileLayer, tileHorizontalDistance, type TileBuffers } from '../../src/presentation/ground/tileStream';
import { GRASS_CLUMP, GRASS_MAX_SCALE, GRASS_QUALITY, grassReach } from '../../src/presentation/grass/grassField';
import { smoothstep } from '../../src/world/noise';

const SIZE = 16, END = 48, POWER = GRASS_QUALITY.high.far.fade.power;
function fixture(height = 0, band?: { start: number; end: number }) {
  const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 0, 0, 1, 1], 3));
  const material = new THREE.MeshLambertMaterial();
  const generate = vi.fn((tx: number, tz: number, out: TileBuffers) => {
    for (let i = 0; i < 8; i++) {
      out.base.set([tx * SIZE + 0.25 + i * 2, height, tz * SIZE + 0.25 + i * 2, i / 8], i * 4);
      out.shape.set([0, 1, 1, 0], i * 4);
      out.tint.set([1, 1, 1, 1], i * 4);
      out.slope.set([0.1, -0.2, 0.5, 0.1], i * 4);
    }
    out.ymin = out.ymax = height;
    return 8;
  });
  const layer = new TileLayer({ name: 'test', tileSize: SIZE, capacity: 8, geometry, material, fadeStart: 12, fadeEnd: END,
    power: POWER, maxHeight: 3, maxRadius: 3, receiveShadow: false, band, generate });
  return { layer, generate, geometry, material };
}

function tiles(layer: TileLayer): Map<string, THREE.Mesh<THREE.InstancedBufferGeometry>> {
  const found = new Map<string, THREE.Mesh<THREE.InstancedBufferGeometry>>();
  for (const child of layer.group.children) {
    const mesh = child as THREE.Mesh<THREE.InstancedBufferGeometry>;
    const base = mesh.geometry.getAttribute('aBase');
    // Released pooled tiles retain old attributes but are never visible or drawn.
    if (mesh.visible || mesh.geometry.instanceCount > 0) found.set(`${Math.floor(base.getX(0) / SIZE)}:${Math.floor(base.getZ(0) / SIZE)}`, mesh);
  }
  return found;
}

describe('Ground vegetation visibility', () => {
  it('skips sphere-only horizontal false positives and restores caller counts across camera changes', () => {
    const { layer } = fixture();layer.update(new THREE.Vector3(0,1,0));
    const mesh = layer.group.children.find(o => (o as THREE.Mesh<THREE.InstancedBufferGeometry>).geometry.instanceCount > 0) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    mesh.updateMatrixWorld();const sphere = mesh.geometry.boundingSphere!, centre = sphere.center.clone(), count = mesh.geometry.instanceCount;
    const camera = new THREE.PerspectiveCamera(45,1,.1,200), scene = new THREE.Scene(), renderer = {} as THREE.WebGLRenderer;
    const before = () => mesh.onBeforeRender(renderer,scene,camera,mesh.geometry,mesh.material as THREE.Material,{} as THREE.Group);
    const after = () => mesh.onAfterRender(renderer,scene,camera,mesh.geometry,mesh.material as THREE.Material,{} as THREE.Group);
    const inside = () => { camera.position.copy(centre).add(new THREE.Vector3(0,0,30));camera.lookAt(centre);camera.updateMatrixWorld(); };
    camera.position.copy(centre).add(new THREE.Vector3(SIZE/2+3+1,0,0));camera.lookAt(camera.position.clone().add(new THREE.Vector3(1,0,0)));camera.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    expect(frustum.intersectsSphere(sphere)).toBe(true);before();expect(mesh.geometry.instanceCount).toBe(0);after();expect(mesh.geometry.instanceCount).toBe(count);
    // A capture camera thins by its own distance (#446), never beyond the population, and the caller's count returns.
    inside();before();const captured = mesh.geometry.instanceCount;expect(captured).toBeGreaterThan(0);expect(captured).toBeLessThanOrEqual(count);
    after();expect(mesh.geometry.instanceCount).toBe(count);
    // Shader preparation may temporarily request fewer instances than the layer's population; that request comes back too.
    mesh.geometry.instanceCount=1;before();after();expect(mesh.geometry.instanceCount).toBe(1);
    layer.dispose();
  });

  it('preloads outside the fade and completes every newly visible tile even when a move outruns its build quota', () => {
    const { layer } = fixture();
    layer.buildRate = 0.01;
    const camera = new THREE.Vector3(0, 1, 0);
    layer.update(camera);
    expect(layer.activeTiles).toBeGreaterThan(layer.drawCalls);
    const buffers = layer.group.children.map((child) => (child as THREE.Mesh).geometry);
    camera.set(352, 1, -224); // A saved-position restore is much larger than the preload window.
    layer.update(camera);
    const active = tiles(layer);
    for (let tz = -18; tz <= -10; tz++) for (let tx = 18; tx <= 26; tx++) {
      if (tileHorizontalDistance(tx * SIZE, tz * SIZE, SIZE, camera) < END - 1) expect(active.has(`${tx}:${tz}`)).toBe(true);
    }
    // The distant initial tiles were reused; the teleport did not allocate another complete GPU window.
    expect(layer.group.children.length).toBe(buffers.length);
    expect(layer.group.children.every((child) => buffers.includes((child as THREE.Mesh).geometry))).toBe(true);
    layer.dispose();
  });

  it('only forces tiles inside the drawable band when streaming outruns the quota', () => {
    const { layer, generate } = fixture(0, { start: -2, end: 21 });
    layer.buildRate = 0.01;
    const camera = new THREE.Vector3(0, 1, 0);
    layer.update(camera);
    generate.mockClear();
    camera.set(352, 1, -224);
    layer.update(camera);
    const outside = generate.mock.calls.filter(([tx, tz]) =>
      tileHorizontalDistance(tx * SIZE, tz * SIZE, SIZE, camera) >= 21);
    expect(outside.length).toBeLessThanOrEqual(1);
    for (let tz = -16; tz <= -12; tz++) for (let tx = 20; tx <= 24; tx++) {
      if (tileHorizontalDistance(tx * SIZE, tz * SIZE, SIZE, camera) < 20)
        expect(tiles(layer).has(`${tx}:${tz}`)).toBe(true);
    }
    layer.dispose();
  });

  it('limits nine catch-up updates to one reserve quota rather than nine quotas', () => {
    const run = (shared: boolean) => {
      const a = fixture(), b = fixture(), camera = new THREE.Vector3(0, 1, 0);
      a.layer.update(camera); b.layer.update(camera);
      a.generate.mockClear(); b.generate.mockClear(); camera.x += SIZE;
      const reserve = { remaining: 2 };
      for (let i = 0; i < 9; i++) {
        const quota = shared ? reserve : { remaining: 2 };
        a.layer.update(camera, quota); b.layer.update(camera, quota);
      }
      const count = a.generate.mock.calls.length + b.generate.mock.calls.length;
      a.layer.dispose(); b.layer.dispose(); return count;
    };
    expect(run(false)).toBe(18);
    expect(run(true)).toBe(2);
  });

  it('shares reserve generation across layers without deferring visible tiles', () => {
    const a = fixture(), b = fixture();
    const camera = new THREE.Vector3(0, 1, 0);
    a.layer.update(camera); b.layer.update(camera);
    a.generate.mockClear(); b.generate.mockClear();
    camera.x += SIZE;
    const reserve = { remaining: 2 };
    a.layer.update(camera, reserve); b.layer.update(camera, reserve);
    expect(a.generate.mock.calls.length + b.generate.mock.calls.length).toBe(2);
    camera.set(352, 1, -224);
    const noReserve = { remaining: 0 };
    a.layer.update(camera, noReserve); b.layer.update(camera, noReserve);
    for (const layer of [a.layer, b.layer]) {
      const active = tiles(layer);
      for (let tz = -18; tz <= -10; tz++) for (let tx = 18; tx <= 26; tx++) {
        if (tileHorizontalDistance(tx * SIZE, tz * SIZE, SIZE, camera) < END - 1)
          expect(active.has(`${tx}:${tz}`)).toBe(true);
      }
      layer.dispose();
    }
  });

  it('stops unseen generation across layers after one costly tile without leaving visible holes', () => {
    const a = fixture(), b = fixture(), camera = new THREE.Vector3(0, 1, 0);
    let clock = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => clock);
    try {
      // Loading still completes both initial windows even with an expired deadline.
      a.layer.update(camera, { remaining: 0, deadline: -1 });
      b.layer.update(camera, { remaining: 0, deadline: -1 });
      for (const f of [a, b]) {
        const generate = f.generate.getMockImplementation()!;
        f.generate.mockImplementation((...args) => { const n = generate(...args); clock += 3; return n; });
        f.generate.mockClear();
      }
      camera.x += SIZE;
      clock = 0;
      const reserve = { remaining: 2, deadline: 2 };
      a.layer.update(camera, reserve); b.layer.update(camera, reserve);
      expect(a.generate.mock.calls.length + b.generate.mock.calls.length).toBe(1);
      expect(reserve.remaining).toBe(1);
      // An expired reserve deadline must still let a teleport fill all visible tiles.
      camera.set(352, 1, -224);
      for (const f of [a, b]) {
        f.layer.update(camera, { remaining: 2, deadline: 0 });
        const active = tiles(f.layer);
        for (let tz = -18; tz <= -10; tz++) for (let tx = 18; tx <= 26; tx++) {
          if (tileHorizontalDistance(tx * SIZE, tz * SIZE, SIZE, camera) < END - 1)
            expect(active.has(`${tx}:${tz}`)).toBe(true);
        }
      }
    } finally { now.mockRestore(); a.layer.dispose(); b.layer.dispose(); }
  });

  it('does not regenerate the same horizontally nearby high-ground tiles every frame', () => {
    const { layer, generate } = fixture(1000);
    const camera = new THREE.Vector3(0, 1, 0);
    layer.update(camera);
    const calls = generate.mock.calls.length;
    layer.update(camera);
    layer.update(camera);
    expect(generate).toHaveBeenCalledTimes(calls);
    expect(layer.visibleInstances).toBe(0);
    layer.dispose();
  });

  it('retains every shader-visible patch in the submitted rank prefix throughout its distance fade', () => {
    const { layer } = fixture();
    for (const camera of [new THREE.Vector3(0, 2, 0), new THREE.Vector3(7.5, 7, 9.5), new THREE.Vector3(24.1, 15, -13.4)]) {
      layer.update(camera);
      let missing = 0;
      for (const child of layer.group.children) {
        const mesh = child as THREE.Mesh<THREE.InstancedBufferGeometry>;
        const base = mesh.geometry.getAttribute('aBase');
        for (let i = 0; i < 8; i++) {
          const distance = Math.hypot(base.getX(i) - camera.x, base.getY(i) - camera.y, base.getZ(i) - camera.z);
          const q = (1 - smoothstep(12, END, distance)) ** POWER;
          // The shader keeps a clump while its rank is under q times the headroom (see grassMaterial.ts).
          if (q * RANK_HEADROOM > base.getW(i) && (!mesh.visible || i >= mesh.geometry.instanceCount)) missing++;
        }
      }
      expect(missing).toBe(0);
    }
    layer.dispose();
  });

  it('does not submit the zero-coverage rank tail or inflate the anchor interval by blade height', () => {
    const { layer } = fixture();
    const camera = new THREE.Vector3(7.5, 7, 9.5);
    layer.update(camera);
    let tested = 0;
    for (const child of layer.group.children) {
      const mesh = child as THREE.Mesh<THREE.InstancedBufferGeometry>;
      const base = mesh.geometry.getAttribute('aBase');
      const x0 = Math.floor(base.getX(0) / SIZE) * SIZE, z0 = Math.floor(base.getZ(0) / SIZE) * SIZE;
      const nearest = Math.hypot(tileHorizontalDistance(x0, z0, SIZE, camera), camera.y);
      const q = (1 - smoothstep(12, END, nearest)) ** POWER;
      const expected = q <= 0 ? 0 : Array.from({ length: 8 }, (_, i) => base.getW(i)).filter((rank) => rank < q * RANK_HEADROOM + 1e-6).length;
      expect(mesh.geometry.instanceCount).toBe(expected);
      tested++;
    }
    expect(tested).toBeGreaterThan(30);
    layer.dispose();
  });

  it('bounds the whole tile including the furthest displaced blades instead of the anchors alone', () => {
    const { layer } = fixture();
    layer.update(new THREE.Vector3(0, 1, 0));
    let minClearance = Infinity;
    for (const child of layer.group.children) {
      const mesh = child as THREE.Mesh<THREE.InstancedBufferGeometry>;
      const base = mesh.geometry.getAttribute('aBase');
      const x0 = Math.floor(base.getX(0) / SIZE) * SIZE, z0 = Math.floor(base.getZ(0) / SIZE) * SIZE;
      const sphere = mesh.geometry.boundingSphere!;
      for (const x of [x0 - 3, x0 + SIZE + 3]) for (const z of [z0 - 3, z0 + SIZE + 3]) for (const y of [0, 3]) {
        minClearance = Math.min(minClearance, sphere.radius - sphere.center.distanceTo(new THREE.Vector3(x, y, z)));
      }
    }
    expect(minClearance).toBeGreaterThanOrEqual(0.19);
    layer.dispose();
  });

  it('bounds the tallest, widest blade the grass shader can build at every preset', () => {
    for (const quality of ['low', 'medium', 'high'] as const) {
      for (const level of [GRASS_QUALITY[quality].near, GRASS_QUALITY[quality].far]) {
        const reach = grassReach(level);
        // Mirrors GRASS_BLADE_GLSL at its extremes: random length 0.5 + 0.55 + 0.3, a seed stem 1.32 times longer, the
        // outermost root (sqrt(frac) = 1, jitter 1.28) and the far level's widest compensated blade.
        const height = GRASS_CLUMP.height * GRASS_MAX_SCALE.height * (0.5 + 0.55 + 0.3) * 1.32;
        const root = GRASS_CLUMP.radius * GRASS_MAX_SCALE.radius * (0.72 + 0.56);
        const share = Math.max(level.farBlades, 0.3);
        const width = level.width * (0.6 + 0.75) * level.fade.sizeComp * (1 + (1 / share - 1) * 0.5);
        expect(reach.maxHeight).toBeGreaterThanOrEqual(height - 1e-9);
        // A blade keeps its length when it bends, so it can reach as far sideways as it is tall.
        expect(reach.maxRadius).toBeGreaterThanOrEqual(root + height + width / 2 - 1e-9);
      }
    }
  });

  it('draws nothing outside its distance band, so two levels of detail can hand over', () => {
    const { layer } = fixture(0, { start: 20, end: 30 });
    const camera = new THREE.Vector3(0, 1, 0);
    layer.update(camera);
    let near = 0, inside = 0;
    for (const child of layer.group.children) {
      const mesh = child as THREE.Mesh<THREE.InstancedBufferGeometry>;
      if (!mesh.visible) continue;
      const base = mesh.geometry.getAttribute('aBase');
      const x0 = Math.floor(base.getX(0) / SIZE) * SIZE, z0 = Math.floor(base.getZ(0) / SIZE) * SIZE;
      const nearest = tileHorizontalDistance(x0, z0, SIZE, camera);
      const farthest = Math.hypot(Math.max(Math.abs(x0 - camera.x), Math.abs(x0 + SIZE - camera.x)), Math.max(Math.abs(z0 - camera.z), Math.abs(z0 + SIZE - camera.z)), camera.y);
      expect(nearest).toBeLessThanOrEqual(30);
      expect(farthest).toBeGreaterThanOrEqual(20);
      if (nearest < 20) near++;
      inside++;
    }
    expect(inside).toBeGreaterThan(4);
    expect(near).toBeGreaterThan(0);
    // The slope attribute travels with the clumps.
    const first = layer.group.children.find((c) => (c as THREE.Mesh).visible) as THREE.Mesh<THREE.InstancedBufferGeometry>;
    expect(first.geometry.getAttribute('aSlope').getY(0)).toBeCloseTo(-0.2, 6);
    layer.dispose();
  });

  it('releases its pooled buffers and shared resources only once', () => {
    const { layer, geometry, material } = fixture();
    layer.update(new THREE.Vector3());
    const buffers = layer.group.children.map((child) => vi.spyOn((child as THREE.Mesh).geometry, 'dispose'));
    const geometryDispose = vi.spyOn(geometry, 'dispose'), materialDispose = vi.spyOn(material, 'dispose');
    layer.dispose(); layer.dispose(); layer.update(new THREE.Vector3());
    for (const dispose of buffers) expect(dispose).toHaveBeenCalledTimes(1);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(layer.group.children).toHaveLength(0);
  });
});
