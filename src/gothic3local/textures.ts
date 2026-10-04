import * as THREE from 'three';
import type { GothicArchives } from './archive';
import { readEntry } from './archive';
import { decodeLevel, parseImage, type G3Image } from './image';

/**
 * Images from the archives as WebGL textures. DXT images are uploaded as they are (S3TC) where the browser supports it,
 * and decoded in software otherwise. Textures are uploaded without colour-space conversion: lighting works on colours
 * as stored (see shading.ts), and one texture serves both colour and data uses.
 */
export class TextureCache {
  private readonly archives: GothicArchives;
  private readonly cache = new Map<string, Promise<THREE.Texture | null>>();
  readonly s3tc: boolean;
  readonly anisotropy: number;
  private placeholder: THREE.DataTexture | null = null;
  missing = new Set<string>();
  bytes = 0;

  constructor(renderer: THREE.WebGLRenderer, archives: GothicArchives) {
    this.archives = archives;
    this.s3tc = renderer.extensions.has('WEBGL_compressed_texture_s3tc');
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  /** A neutral texture for missing images (mid grey, opaque). */
  neutral(): THREE.Texture {
    if (!this.placeholder) {
      this.placeholder = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
      this.placeholder.needsUpdate = true;
    }
    return this.placeholder;
  }

  /** The compiled image for a material's image name (`X.tga`, `Data/…/X.tga`, `X.dds` all name `X.ximg`). */
  static imageName(name: string): string {
    const base = name.replace(/\\/g, '/').split('/').pop() ?? name;
    return base.replace(/\.[^.]+$/, '') + '.ximg';
  }

  get(name: string, clamp = false): Promise<THREE.Texture | null> {
    const key = `${TextureCache.imageName(name).toLowerCase()}|${clamp ? 'c' : 'r'}`;
    let p = this.cache.get(key);
    if (!p) {
      p = this.load(name, clamp);
      this.cache.set(key, p);
    }
    return p;
  }

  private async load(name: string, clamp: boolean): Promise<THREE.Texture | null> {
    const entry = this.archives.named(TextureCache.imageName(name));
    if (!entry) {
      this.missing.add(name);
      return null;
    }
    let image: G3Image;
    try {
      image = parseImage(await readEntry(entry));
    } catch {
      this.missing.add(name);
      return null;
    }
    const tex = this.toTexture(image);
    tex.name = name;
    tex.userData.format = image.format;
    tex.wrapS = tex.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    tex.anisotropy = this.anisotropy;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  private toTexture(image: G3Image): THREE.Texture {
    const face = image.faces[0]!;
    const levels = face.map((data, i) => ({ data, width: Math.max(1, image.width >> i), height: Math.max(1, image.height >> i) }));
    for (const l of levels) this.bytes += l.data.byteLength;
    if (image.format !== 'ARGB8' && this.s3tc) {
      const format = image.format === 'DXT1' ? THREE.RGBA_S3TC_DXT1_Format : image.format === 'DXT3' ? THREE.RGBA_S3TC_DXT3_Format : THREE.RGBA_S3TC_DXT5_Format;
      const tex = new THREE.CompressedTexture(levels as unknown as ImageData[], image.width, image.height, format);
      tex.minFilter = levels.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      return tex;
    }
    // Software path: decode every level to RGBA.
    const decoded = levels.map((l) => ({ data: decodeLevel(image.format, l.data, l.width, l.height), width: l.width, height: l.height }));
    const tex = new THREE.DataTexture(decoded[0]!.data, image.width, image.height, THREE.RGBAFormat);
    tex.mipmaps = decoded as unknown as ImageData[];
    tex.minFilter = decoded.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.flipY = false;
    return tex;
  }

  dispose(): void {
    for (const p of this.cache.values()) void p.then((t) => t?.dispose());
    this.cache.clear();
    this.placeholder?.dispose();
  }
}

/** For tools: is S3TC available to this renderer? */
export function supportsS3tc(renderer: THREE.WebGLRenderer): boolean {
  return renderer.extensions.has('WEBGL_compressed_texture_s3tc');
}
