import * as THREE from 'three';
import { vi } from 'vitest';
import type { MenuResources } from '../../src/presentation/menuScene';
import type { MatKey } from '../../src/presentation/regions';

/** Inert bitmap painters only: every menu mesh and complete triangle receipt is real. */
export function menuResourceFixture(): MenuResources {
  const context = () => new Proxy({
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
  } as Record<string | symbol, unknown>, {
    get(target, key) { if (!(key in target)) target[key] = vi.fn(); return target[key]; },
    set(target, key, value) { target[key] = value; return true; },
  });
  const materials = new Map<MatKey, THREE.Material>();
  return {
    noise: () => new THREE.DataTexture(new Uint8Array(4 * 4 * 4), 4, 4),
    materials: () => ({
      get(key) {
        let material = materials.get(key);
        if (!material) {
          material = key === 'glow' || key === 'pane' ? new THREE.MeshBasicMaterial() : new THREE.MeshStandardMaterial({ vertexColors: true });
          materials.set(key, material);
        }
        return material;
      },
      dispose: () => materials.forEach(material => material.dispose()),
    }),
    terrain: async () => null,
    bark: () => ({ map: new THREE.Texture(), normal: new THREE.Texture() }),
    leaf: () => new THREE.Texture(),
    canvas: {
      canvas: (width, height) => ({ width, height, getContext: () => context() }) as unknown as HTMLCanvasElement,
      image: async () => null,
    },
    emblemUrl: 'emblem.png',
  };
}
