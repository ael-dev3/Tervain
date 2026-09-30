import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuScene } from '../../src/presentation/menuScene';

/** No WebGL or DOM renderer: the canvas mock records authored drawing calls only. */
function canvasContext() {
  const gradient = () => ({ addColorStop: vi.fn() });
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    fillRect: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
    moveTo: vi.fn(), lineTo: vi.fn(), bezierCurveTo: vi.fn(), stroke: vi.fn(),
    setLineDash: vi.fn(), save: vi.fn(), restore: vi.fn(), drawImage: vi.fn(),
    createLinearGradient: vi.fn(gradient), createRadialGradient: vi.fn(gradient),
  };
}

class CanvasMock {
  width = 0;
  height = 0;
  readonly context = canvasContext();
  getContext() { return this.context; }
}

class ImageMock {
  src = '';
  naturalWidth = 1254;
  naturalHeight = 1254;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

function renderables(scene: THREE.Scene) {
  const result: (THREE.Mesh | THREE.Points)[] = [];
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) result.push(object);
  });
  return result;
}

function resources(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  for (const object of renderables(scene)) {
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  }
  return { geometries, materials, textures };
}

function pose(menu: MenuScene) {
  const transforms: number[][] = [], lights: number[] = [];
  menu.scene.traverse((object) => {
    transforms.push([...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()]);
    if (object instanceof THREE.Light) lights.push(object.intensity);
  });
  return {
    transforms, lights,
    geometry: renderables(menu.scene).map((object) => ({
      position: Array.from(object.geometry.getAttribute('position').array),
      normal: object.geometry.getAttribute('normal') ? Array.from(object.geometry.getAttribute('normal').array) : [],
    })),
    camera: [...menu.camera.position.toArray(), ...menu.camera.quaternion.toArray(), ...menu.camera.projectionMatrix.elements],
  };
}

describe('native desert menu scene', () => {
  let canvases: CanvasMock[], images: ImageMock[], menus: MenuScene[];
  let createElement: ReturnType<typeof vi.fn>;
  const fixture = () => {
    const menu = new MenuScene();
    menus.push(menu);
    return menu;
  };

  beforeEach(() => {
    canvases = []; images = []; menus = [];
    createElement = vi.fn((name: string) => {
      if (name !== 'canvas') throw new Error(`MenuScene attempted to create a DOM control: ${name}`);
      const canvas = new CanvasMock();
      canvases.push(canvas);
      return canvas;
    });
    vi.stubGlobal('document', { createElement });
    vi.stubGlobal('Image', class extends ImageMock { constructor() { super(); images.push(this); } });
  });

  afterEach(() => {
    for (const menu of menus) menu.dispose();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('constructs finite real geometry within a bounded menu budget, with joined palm ribbon fans', () => {
    const menu = fixture();
    const meshes = renderables(menu.scene).filter((object): object is THREE.Mesh => object instanceof THREE.Mesh);
    const triangles = meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0);
    expect(triangles).toBeGreaterThan(5000);
    expect(triangles).toBeLessThanOrEqual(40000);
    expect(meshes.length).toBeLessThanOrEqual(80);
    expect(menu.stats.clothPanels).toBeGreaterThanOrEqual(5);
    expect(menu.stats.palmFronds).toBeGreaterThanOrEqual(20);
    for (const object of renderables(menu.scene)) {
      const geometry = object.geometry;
      expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
      const normal = geometry.getAttribute('normal');
      if (normal) expect(Array.from(normal.array).every(Number.isFinite)).toBe(true);
      if (object.name === 'Crown_Connected_Palm_Fronds') {
        const position = geometry.getAttribute('position'), index = geometry.index!;
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let i = 0; i < normal.count; i++) expect(a.fromBufferAttribute(normal, i).length()).toBeCloseTo(1, 5);
        for (let i = 0; i < index.count; i += 3) {
          a.fromBufferAttribute(position, index.getX(i)); b.fromBufferAttribute(position, index.getX(i + 1)); c.fromBufferAttribute(position, index.getX(i + 2));
          expect(b.sub(a).cross(c.sub(a)).lengthSq()).toBeGreaterThan(1e-14);
        }
      }
    }
  });

  it('keeps cloth suspension and palm roots attached while their free vertices flex', () => {
    const menu = fixture();
    const moving = renderables(menu.scene).filter((mesh) => mesh.name.includes('Silk') || mesh.name === 'Crown_Connected_Palm_Fronds');
    expect(moving.length).toBeGreaterThanOrEqual(7);
    const fixed = moving.map((mesh) => {
      const position = mesh.geometry.getAttribute('position'), uv = mesh.geometry.getAttribute('uv');
      const weight = mesh.geometry.getAttribute('windWeight');
      const vertices = Array.from({ length: position.count }, (_value, i) => i).filter((i) => weight ? weight.getX(i) === 0 : uv.getY(i) === 1);
      expect(vertices.length).toBeGreaterThan(0);
      if (weight) {
        // Every frond starts at the same crown origin, surrounded by the actual trunk cap.
        for (const i of vertices) expect(new THREE.Vector3().fromBufferAttribute(position, i).length()).toBeLessThan(1e-6);
        const origin = mesh.getWorldPosition(new THREE.Vector3());
        const ray = new THREE.Raycaster(origin.clone().add(new THREE.Vector3(0, 0, 0.7)), new THREE.Vector3(0, 0, -1), 0, 1);
        const hit = ray.intersectObjects(renderables(menu.scene).filter((object) => object.name === 'Batched_Desert_Market_Geometry'))[0];
        expect(hit).toBeDefined();
        expect(hit!.point.distanceTo(origin)).toBeLessThan(0.6);
      }
      return { mesh, vertices, initial: Array.from(position.array) };
    });
    for (let frame = 0; frame < 30; frame++) menu.update(0.04, false);
    let flexing = 0;
    for (const { mesh, vertices, initial } of fixed) {
      const position = mesh.geometry.getAttribute('position');
      for (const i of vertices) for (let component = 0; component < 3; component++) expect(position.array[i * 3 + component]).toBe(initial[i * 3 + component]);
      if (Array.from(position.array).some((value, i) => value !== initial[i])) flexing++;
    }
    expect(flexing).toBe(fixed.length);
  });

  it('freezes the exact current geometry, flames and camera, then resumes the same clock without a reset', () => {
    const menu = fixture(), reference = fixture();
    for (let frame = 0; frame < 4; frame++) { menu.update(0.04, false); reference.update(0.04, false); }
    const current = pose(menu);
    for (const dt of [0.04, 50, Number.NaN]) menu.update(dt, true);
    expect(pose(menu)).toEqual(current);
    menu.update(0.03, false); reference.update(0.03, false);
    expect(pose(menu)).toEqual(pose(reference));
    expect(pose(menu)).not.toEqual(current);
  });

  it('keeps the camera steady, central cloth height consistent, and narrow-screen cloth within the viewport on repeated resize', () => {
    const menu = fixture();
    const cloth = menu.scene.getObjectByName('Merchant_Central_Woven_Silk') as THREE.Mesh;
    const originalCamera = [...menu.camera.position.toArray(), ...menu.camera.quaternion.toArray()];
    const projected = () => {
      menu.scene.updateMatrixWorld(true); menu.camera.updateMatrixWorld(true);
      const points = new THREE.Box3(), position = cloth.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) points.expandByPoint(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(cloth.matrixWorld).project(menu.camera));
      return points;
    };
    let height: number | null = null;
    for (const [w, h] of [[1920, 1080], [1280, 800], [355, 711], [320, 640], [1920, 1080]]) {
      menu.resize(w!, h!);
      expect(menu.camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
      expect(menu.camera.projectionMatrixInverse.elements.every(Number.isFinite)).toBe(true);
      expect(menu.camera.aspect).toBeCloseTo(w! / h!, 6);
      expect([...menu.camera.position.toArray(), ...menu.camera.quaternion.toArray()]).toEqual(originalCamera);
      expect(cloth.parent!.scale.y).toBe(1); expect(cloth.parent!.scale.z).toBe(1);
      const bounds = projected(), span = bounds.max.y - bounds.min.y;
      expect(span).toBeGreaterThan(1.5); expect(span).toBeLessThan(2.1);
      if (height === null) height = span; else expect(span).toBeCloseTo(height, 6);
      if (w! / h! < 0.7) {
        const widthFraction = (bounds.max.x - bounds.min.x) / 2;
        expect(widthFraction).toBeGreaterThan(0.5); expect(widthFraction).toBeLessThan(0.9);
        expect(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x))).toBeLessThan(1);
      }
    }
  });

  it('disposes every owned resource once and safely ignores a queued emblem completion after teardown', () => {
    const menu = fixture(), image = images[0]!;
    const lateLoad = image.onload!;
    const { geometries, materials, textures } = resources(menu.scene);
    const geometryDisposals = [...geometries].map((geometry) => vi.spyOn(geometry, 'dispose'));
    const materialDisposals = [...materials].map((material) => vi.spyOn(material, 'dispose'));
    const textureDisposals = [...textures].map((texture) => vi.spyOn(texture, 'dispose'));
    const versions = [...textures].map((texture) => texture.version);
    const draws = canvases.map((canvas) => canvas.context.drawImage.mock.calls.length);
    menu.dispose(); menu.dispose();
    for (const dispose of [...geometryDisposals, ...materialDisposals, ...textureDisposals]) expect(dispose).toHaveBeenCalledTimes(1);
    expect(menu.scene.children).toHaveLength(0);
    expect(image.onload).toBeNull(); expect(image.onerror).toBeNull(); expect(image.src).toBe('');
    expect(() => lateLoad()).not.toThrow();
    expect([...textures].map((texture) => texture.version)).toEqual(versions);
    expect(canvases.map((canvas) => canvas.context.drawImage.mock.calls.length)).toEqual(draws);
    expect(() => menu.update(0.04, false)).not.toThrow();
  });

  it('prints a successfully loaded emblem into the cloth UVs and keeps the native scene usable if the image fails', () => {
    const loaded = fixture(), loadedImage = images[0]!;
    const maps = [...resources(loaded.scene).textures].filter((texture) => (texture.image as CanvasMock).width === 512);
    const versions = maps.map((texture) => texture.version);
    loadedImage.onload!();
    expect(maps.length).toBeGreaterThan(0);
    const printed = maps.filter((texture) => (texture.image as CanvasMock).context.drawImage.mock.calls.length > 0);
    expect(printed).toHaveLength(1);
    for (const texture of maps) {
      const draws = (texture.image as CanvasMock).context.drawImage.mock.calls.length;
      expect(draws).toBeLessThanOrEqual(1);
      expect(texture.version > versions[maps.indexOf(texture)]!).toBe(draws === 1);
    }
    const central = loaded.scene.getObjectByName('Merchant_Central_Woven_Silk') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    expect(printed).not.toContain(central.material.map);
    const banner = loaded.scene.getObjectByName('Hegemony_Post_Banner_Silk') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    expect(printed).toContain(banner.material.map);
    expect(banner.parent!.name).toBe('Hegemony_Banner_Post');
    expect(renderables(loaded.scene).filter(mesh => (mesh as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.map === printed[0])).toEqual([banner]);
    const fallback = fixture(), failedImage = images[1]!;
    failedImage.onerror!();
    expect(failedImage.onload).toBeNull(); expect(failedImage.onerror).toBeNull();
    expect(() => { fallback.resize(355, 711); fallback.update(0.04, false); }).not.toThrow();
    expect(fallback.scene.children.length).toBeGreaterThan(0);
    // Emblem loading never creates, hides, disables or replaces the separate native menu controls.
    expect(createElement.mock.calls.every(([name]) => name === 'canvas')).toBe(true);
  });
});
