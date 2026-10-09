import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BAKED_TEXTURE_ANISOTROPY, BAKED_TEXTURE_SIZE, loadBakedTextures, type BakedManifest } from '../../src/presentation/bakedTextures';
import { installBakedTextures, isBaked, makeTexPair, onBakedTextures, TEX_KEYS, TILE_M } from '../../src/presentation/buildingTextures';
import { MaterialSet } from '../../src/presentation/regions';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const manifest = JSON.parse(read('public/textures/buildings/manifest.json').toString('utf8')) as BakedManifest;

/** Width and height from a JPEG's frame header, without decoding it. */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.readUInt16BE(0)).toBe(0xffd8);
  for (let at = 2; at + 9 < bytes.length;) {
    const marker = bytes.readUInt16BE(at);
    if (marker >= 0xffc0 && marker <= 0xffc3) return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  throw new Error('The JPEG has no frame header.');
}

/** Enough of a 2D canvas for the window-pane texture a material set paints. */
function stubCanvas() {
  const context = new Proxy({}, { get: (_target, name) => name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
}

afterEach(() => vi.unstubAllGlobals());

describe('the baked building surfaces (A67)', () => {
  it('ships an albedo and a normal map for every texture, checked by size and hash, at its declared size', () => {
    expect(manifest.schema).toBe(1);
    expect(Object.keys(manifest.textures).sort()).toEqual([...TEX_KEYS].sort());
    let total = 0;
    for (const key of TEX_KEYS) {
      const entry = manifest.textures[key]!;
      expect([512, 1024], key).toContain(entry.size);
      for (const kind of ['albedo', 'normal'] as const) {
        const file = entry[kind];
        expect(file.file).toBe(`${key}-${kind}.jpg`);
        const bytes = read(`public/textures/buildings/${file.file}`);
        expect(bytes.length, file.file).toBe(file.bytes);
        expect(createHash('sha256').update(bytes).digest('hex'), file.file).toBe(file.sha256);
        expect(jpegSize(bytes), file.file).toEqual({ width: entry.size, height: entry.size });
        total += bytes.length;
      }
    }
    // Four times the texels of the generated set, for a download smaller than one resident model.
    expect(total).toBeLessThan(7_000_000);
    // Still the same repeats: the bake keeps every texture's metres, so geometry UVs are unchanged.
    expect(TILE_M.stone).toBe(2);
  });

  it('decodes fewer texels and fewer filter samples on the lighter presets', () => {
    expect(BAKED_TEXTURE_SIZE.high).toBe(1024);
    expect(BAKED_TEXTURE_SIZE.medium).toBeLessThan(BAKED_TEXTURE_SIZE.high);
    expect(BAKED_TEXTURE_SIZE.low).toBeLessThan(BAKED_TEXTURE_SIZE.medium);
    expect(BAKED_TEXTURE_ANISOTROPY.low).toBeLessThan(BAKED_TEXTURE_ANISOTROPY.high);
  });

  it('keeps the generated textures where no image decoder exists', async () => {
    expect(await loadBakedTextures('high')).toBe(0);
    expect(TEX_KEYS.some(isBaked)).toBe(false);
    expect(makeTexPair('stone', 32).map).toBeInstanceOf(THREE.DataTexture);
  });

  it('installs baked images unflipped in place of the generated ones, and a set made earlier adopts them', () => {
    stubCanvas();
    const set = new MaterialSet(32);
    const stone = set.get('stone') as THREE.MeshStandardMaterial, plaster = set.get('plaster') as THREE.MeshStandardMaterial;
    expect(stone.map).toBeInstanceOf(THREE.DataTexture);
    let heard = 0;
    const stop = onBakedTextures(() => heard++);
    const image = { width: 16, height: 16 } as unknown as ImageBitmap;
    installBakedTextures(new Map([['stone', { map: image, normal: image }]]), 16, 16);
    stop();
    expect(heard).toBe(1);
    expect(isBaked('stone')).toBe(true);
    const pair = makeTexPair('stone', 32, 8);
    expect(pair.map).not.toBeInstanceOf(THREE.DataTexture);
    expect(pair.map.image).toBe(image);
    expect(pair.map.flipY).toBe(false);
    expect(pair.normal.flipY).toBe(false);
    expect(pair.map.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(pair.normal.colorSpace).toBe(THREE.NoColorSpace);
    expect(pair.map.wrapS).toBe(THREE.RepeatWrapping);
    expect(pair.map.wrapT).toBe(THREE.RepeatWrapping);
    expect(pair.map.generateMipmaps).toBe(true);
    expect(pair.map.anisotropy).toBe(16);
    // Every caller shares one baked pair, whatever size it asked for.
    expect(makeTexPair('stone', 1024, 4)).toBe(pair);
    expect(stone.map).toBe(pair.map);
    expect(stone.normalMap).toBe(pair.normal);
    // A texture without baked images keeps its generated one.
    expect(plaster.map).toBeInstanceOf(THREE.DataTexture);
    // Another preset's decode replaces this one: the set moves on to it, then the old pair is released.
    const released = vi.fn();
    pair.map.addEventListener('dispose', released);
    const smaller = { width: 8, height: 8 } as unknown as ImageBitmap;
    installBakedTextures(new Map([['stone', { map: smaller, normal: smaller }]]), 8, 4);
    expect(stone.map!.image).toBe(smaller);
    expect(released).toHaveBeenCalledTimes(1);
    // The set does not release the shared baked pair it draws with.
    const kept = vi.fn();
    stone.map!.addEventListener('dispose', kept);
    set.dispose();
    expect(kept).not.toHaveBeenCalled();
  });
});

describe('surfaces after an outage (A70)', () => {
  it('fetches only what failed on a later world build, keeps what arrived, and installs the recovered set', async () => {
    vi.resetModules();
    let outage = true;
    const asked: string[] = [];
    vi.doMock('../../src/presentation/assets/download', () => ({
      downloadAsset: async (url: URL) => {
        const file = url.pathname.split('/').pop()!;
        asked.push(file);
        if (file === 'manifest.json') return new TextEncoder().encode(JSON.stringify(manifest)).buffer;
        // During the outage every image but the stone ones fails, after the downloader's own retries.
        if (outage && !file.startsWith('stone-')) throw new Error(`HTTP 503 for ${file}`);
        return new ArrayBuffer(8);
      },
    }));
    vi.stubGlobal('document', { baseURI: 'http://127.0.0.1/', createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
    vi.stubGlobal('createImageBitmap', async () => ({ width: 16, height: 16, close() {} }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadBakedTextures: load } = await import('../../src/presentation/bakedTextures');
    const { isBaked: baked } = await import('../../src/presentation/buildingTextures');
    expect(await load('low')).toBe(1);
    expect(baked('stone')).toBe(true);
    expect(baked('plaster')).toBe(false);
    outage = false;
    asked.length = 0;
    expect(await load('low')).toBe(TEX_KEYS.length);
    expect(baked('plaster')).toBe(true);
    // Only the missing files were asked for again; the manifest and the stone maps were kept.
    expect(asked).not.toContain('manifest.json');
    expect(asked.filter((file) => file.startsWith('stone-'))).toEqual([]);
    expect(asked.length).toBe((TEX_KEYS.length - 1) * 2);
    // Complete now: a further build asks for nothing.
    asked.length = 0;
    expect(await load('low')).toBe(TEX_KEYS.length);
    expect(asked).toEqual([]);
    warn.mockRestore();
    vi.doUnmock('../../src/presentation/assets/download');
  });

  it('stops asking again after a bounded number of failed passes', async () => {
    vi.resetModules();
    let asks = 0;
    vi.doMock('../../src/presentation/assets/download', () => ({
      downloadAsset: async (url: URL) => {
        const file = url.pathname.split('/').pop()!;
        if (file === 'manifest.json') return new TextEncoder().encode(JSON.stringify(manifest)).buffer;
        asks++;
        throw new Error(`HTTP 503 for ${file}`);
      },
    }));
    vi.stubGlobal('document', { baseURI: 'http://127.0.0.1/', createElement: () => ({ width: 0, height: 0, getContext: () => null }) });
    vi.stubGlobal('createImageBitmap', async () => ({ width: 16, height: 16, close() {} }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadBakedTextures: load } = await import('../../src/presentation/bakedTextures');
    for (let i = 0; i < 8; i++) expect(await load('medium')).toBe(0);
    // The first pass and three more, each asking for every image once.
    expect(asks).toBe(4 * TEX_KEYS.length * 2);
    warn.mockRestore();
    vi.doUnmock('../../src/presentation/assets/download');
  });
});
