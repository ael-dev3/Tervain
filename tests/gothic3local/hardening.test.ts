import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { GothicArchives, MemorySource, readEntry, readPackIndex } from '../../src/gothic3local/archive';
import { IMAGE_MAX_SIDE, parseImage } from '../../src/gothic3local/image';
import { TextureCache } from '../../src/gothic3local/textures';
import { dxt1Block, pack, ximg } from './fixtures';

const text = (s: string) => new TextEncoder().encode(s);
const RED = 0xf800;
const setU32 = (bytes: Uint8Array, at: number, v: number) => new DataView(bytes.buffer).setUint32(at, v, true);

describe('the local viewer and damaged installation files (A92)', () => {
  it('rejects image headers with impossible sizes or level counts, and truncated image data', () => {
    const good = () => ximg(4, 4, 'DXT1', [Uint8Array.from(dxt1Block(RED))]);
    expect(parseImage(good()).width).toBe(4);
    const zero = good();
    setU32(zero, 0x2f, 0);
    expect(() => parseImage(zero)).toThrow(/out of range/);
    const huge = good();
    setU32(huge, 0x33, IMAGE_MAX_SIDE + 1);
    expect(() => parseImage(huge)).toThrow(/out of range/);
    // A 4×4 image has at most three levels (4, 2, 1).
    const deep = good();
    setU32(deep, 0x3f, 30);
    expect(() => parseImage(deep)).toThrow(/mip levels/);
    // Three levels claimed, one stored: short of a whole face.
    const short = good();
    setU32(short, 0x3f, 3);
    expect(() => parseImage(short)).toThrow(/truncated/);
  });

  it('reads an entry reaching past its file, or a stored entry of the wrong size, as an error', async () => {
    const entries = await readPackIndex(new MemorySource(pack([{ path: 'Meshes/A.xcmsh', data: text('stored entry') }]), 'Test.pak'));
    const e = entries[0]!;
    await expect(readEntry({ ...e, packed: e.packed + 4096, unpacked: e.unpacked + 4096 })).rejects.toThrow(/truncated/);
    await expect(readEntry({ ...e, unpacked: e.unpacked + 1 })).rejects.toThrow(/table says/);
    expect(new TextDecoder().decode(await readEntry(e))).toBe('stored entry');
  });

  it('counts an image that cannot become a texture as missing, instead of failing the load', async () => {
    const archives = new GothicArchives();
    archives.add(await readPackIndex(new MemorySource(pack([{ path: 'Images/Bark.ximg', data: ximg(4, 4, 'DXT1', [Uint8Array.from(dxt1Block(RED))]) }]), 'Img.pak')));
    const renderer = { extensions: { has: () => false }, capabilities: { getMaxAnisotropy: () => 1 } } as unknown as THREE.WebGLRenderer;
    const cache = new TextureCache(renderer, archives);
    expect(await cache.get('Bark.tga')).not.toBeNull();
    const spy = vi.spyOn(TextureCache.prototype as unknown as { toTexture: () => never }, 'toTexture').mockImplementation(() => {
      throw new Error('decode failed');
    });
    try {
      expect(await cache.get('Bark.tga', 1001 as THREE.Wrapping)).toBeNull();
      expect(cache.missing.has('Bark.tga')).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
