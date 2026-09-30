import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuScene, type MenuResources } from '../../src/presentation/menuScene';
import type { MatKey } from '../../src/presentation/regions';

/** A 2D context stand-in that records nothing and returns inert objects; enough for the banner painters. */
function contextStub() {
  const gradient = () => ({ addColorStop: vi.fn() });
  return new Proxy(
    {
      createLinearGradient: vi.fn(gradient),
      createRadialGradient: vi.fn(gradient),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })),
    } as Record<string | symbol, unknown>,
    {
      get(target, key) {
        if (key in target) return target[key];
        const fn = vi.fn();
        target[key] = fn;
        return fn;
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      },
    },
  );
}

class CanvasStub {
  width = 0;
  height = 0;
  private readonly ctx = contextStub();
  getContext() {
    return this.ctx;
  }
}

interface Fixture {
  menu: MenuScene;
  resolveEmblem(img: unknown): void;
}

function resources(): { res: MenuResources; resolveEmblem(img: unknown): void; materials: Map<MatKey, THREE.Material> } {
  const materials = new Map<MatKey, THREE.Material>();
  let resolveEmblem: (img: unknown) => void = () => {};
  const res: MenuResources = {
    noise: () => new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4),
    materials: () => ({
      get: (key: MatKey) => {
        let m = materials.get(key);
        if (!m) {
          m = key === 'glow' || key === 'pane' ? new THREE.MeshBasicMaterial() : new THREE.MeshStandardMaterial({ vertexColors: true });
          materials.set(key, m);
        }
        return m;
      },
      dispose: () => {
        for (const m of materials.values()) m.dispose();
      },
    }),
    terrain: async () => null,
    bark: () => ({ map: new THREE.Texture(), normal: new THREE.Texture() }),
    leaf: () => new THREE.Texture(),
    canvas: {
      canvas: (w, h) => Object.assign(new CanvasStub(), { width: w, height: h }) as unknown as HTMLCanvasElement,
      image: () => new Promise((r) => (resolveEmblem = r as (img: unknown) => void)),
    },
    emblemUrl: 'emblem.png',
  };
  return { res, resolveEmblem: (img) => resolveEmblem(img), materials };
}

const built: MenuScene[] = [];
function fixture(quality: 'low' | 'medium' | 'high' = 'high'): Fixture {
  const r = resources();
  const menu = new MenuScene({ quality, resources: r.res });
  built.push(menu);
  return { menu, resolveEmblem: r.resolveEmblem };
}

function meshes(scene: THREE.Scene) {
  const out: (THREE.Mesh | THREE.Points)[] = [];
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) out.push(o);
  });
  return out;
}

/** Everything that animates, as numbers: transforms, uniforms named uTime/uSkyTime, and every mesh's positions. */
function snapshot(menu: MenuScene) {
  const out: number[] = [];
  menu.scene.traverse((o) => {
    out.push(...o.position.toArray(), ...o.quaternion.toArray(), ...o.scale.toArray());
    if (o instanceof THREE.Light) out.push(o.intensity);
    const m = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
    if (m && 'uniforms' in m && m.uniforms) for (const k of ['uTime', 'uSkyTime']) if (m.uniforms[k]) out.push(Number(m.uniforms[k]!.value));
    if (o instanceof THREE.Mesh && o.name === 'Menu_Hegemony_Standard_Cloth') out.push(...Array.from(o.geometry.getAttribute('position').array as Float32Array));
  });
  out.push(...menu.camera.position.toArray(), ...menu.camera.quaternion.toArray());
  return out;
}

describe('menu vigil scene', () => {
  afterEach(() => {
    for (const m of built.splice(0)) m.dispose();
  });

  it('builds finite geometry within a bounded budget on every preset', () => {
    for (const q of ['low', 'medium', 'high'] as const) {
      const { menu } = fixture(q);
      const all = meshes(menu.scene);
      expect(all.length).toBeLessThan(90);
      expect(menu.stats.triangles).toBeGreaterThan(20000);
      expect(menu.stats.triangles).toBeLessThan(q === 'low' ? 450000 : q === 'medium' ? 650000 : 900000);
      for (const o of all) {
        const pos = o.geometry.getAttribute('position');
        expect(Array.from(pos.array).every(Number.isFinite), o.name).toBe(true);
        const n = o.geometry.getAttribute('normal');
        if (n) expect(Array.from(n.array).every(Number.isFinite), o.name).toBe(true);
      }
    }
  });

  it('flies exactly one Hegemony standard (A24), on a grounded pole', () => {
    const { menu } = fixture();
    const cloths = meshes(menu.scene).filter((o) => o.name === 'Menu_Hegemony_Standard_Cloth');
    expect(cloths).toHaveLength(1);
    expect(menu.stats.banners).toBe(1);
    const pole = menu.scene.getObjectByName('Menu_Hegemony_Standard')!;
    expect(pole.position.y).toBeLessThan(1);
  });

  it('flies the crows round the headland outside the tree crown', () => {
    const { menu } = fixture('low');
    const crows = menu.scene.getObjectByName('Menu_Crows') as THREE.Mesh;
    const path = crows.geometry.getAttribute('aPath');
    const params = crows.geometry.getAttribute('aParams');
    const leaves = menu.scene.getObjectByName('Menu_Ancient_Tree_Leaves') as THREE.Mesh;
    const lp = leaves.geometry.getAttribute('position');
    const pts = Array.from({ length: lp.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(lp, i).applyMatrix4(leaves.matrixWorld));
    expect(path.count).toBeGreaterThan(3);
    let nearest = Infinity;
    for (let c = 0; c < path.count; c++) {
      const [cx, cz, r, y] = [path.getX(c), path.getY(c), path.getZ(c), params.getX(c)];
      for (let k = 0; k < 48; k++) {
        const a = (k / 48) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r * 0.7;
        // The flight path bobs 0.8 m and a leaf card is up to two metres across.
        for (const p of pts) if (Math.abs(p.y - y) < 2.8) nearest = Math.min(nearest, Math.hypot(p.x - x, p.z - z));
      }
    }
    expect(nearest).toBeGreaterThan(1.5);
  });

  it('keeps the camera still across resizes and widens the view on narrow screens', () => {
    const { menu } = fixture();
    const before = [...menu.camera.position.toArray(), ...menu.camera.quaternion.toArray()];
    for (const [w, h] of [[1920, 1080], [1280, 720], [355, 711], [888, 356], [1920, 1080]] as const) {
      menu.resize(w, h);
      expect([...menu.camera.position.toArray(), ...menu.camera.quaternion.toArray()]).toEqual(before);
      expect(menu.camera.projectionMatrix.elements.every(Number.isFinite)).toBe(true);
      const hfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(menu.camera.fov) / 2) * menu.camera.aspect));
      expect(menu.camera.fov).toBeLessThanOrEqual(MenuScene.MAX_FOV);
      // At least 64 degrees across wherever the vertical limit allows; portrait phones get the widest allowed view.
      if (menu.camera.fov < MenuScene.MAX_FOV) expect(hfov).toBeGreaterThanOrEqual(63.9);
      else expect(hfov).toBeGreaterThan(40);
    }
  });

  it('freezes completely in reduced motion and resumes on the same clock', () => {
    const a = fixture().menu;
    const b = fixture().menu;
    for (let i = 0; i < 5; i++) {
      a.update(0.04, false);
      b.update(0.04, false);
    }
    const held = snapshot(a);
    for (const dt of [0.04, 30, Number.NaN]) a.update(dt, true);
    expect(snapshot(a)).toEqual(held);
    a.update(0.03, false);
    b.update(0.03, false);
    expect(snapshot(a)).toEqual(snapshot(b));
    expect(snapshot(a)).not.toEqual(held);
  });

  it('prints the emblem when it arrives and stays usable when it never does', async () => {
    const ok = fixture();
    const missing = fixture();
    ok.resolveEmblem({ naturalWidth: 64, naturalHeight: 64 });
    missing.resolveEmblem(null);
    await new Promise((r) => setTimeout(r, 0));
    const banner = (m: MenuScene) => (m as unknown as { banner: { printed(): boolean } }).banner;
    expect(banner(ok.menu).printed()).toBe(true);
    expect(banner(missing.menu).printed()).toBe(false);
    missing.menu.update(0.05, false);
    expect(snapshot(missing.menu).every(Number.isFinite)).toBe(true);
  });

  it('disposes once, ignores a late emblem, and stops updating', async () => {
    const f = fixture();
    const geos = new Set<THREE.BufferGeometry>();
    for (const o of meshes(f.menu.scene)) geos.add(o.geometry);
    const spies = [...geos].map((g) => vi.spyOn(g, 'dispose'));
    f.menu.dispose();
    f.menu.dispose();
    for (const s of spies) expect(s.mock.calls.length).toBeLessThanOrEqual(1);
    expect(spies.filter((s) => s.mock.calls.length === 1).length).toBeGreaterThan(geos.size * 0.9);
    f.resolveEmblem({ naturalWidth: 8, naturalHeight: 8 });
    await new Promise((r) => setTimeout(r, 0));
    expect(() => f.menu.update(0.1, false)).not.toThrow();
    expect(f.menu.scene.children).toHaveLength(0);
  });
});
