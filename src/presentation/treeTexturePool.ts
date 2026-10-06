import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface EmbeddedImages {
  textures?: { source?: number }[];
  images?: { bufferView?: number; mimeType?: string; uri?: string }[];
  bufferViews?: { buffer?: number; byteOffset?: number; byteLength: number }[];
}
/** Immutable page-lifetime templates share content; each world still owns its cloned GPU handles. */
const pool = new Map<string, THREE.Texture>();
const installed = new WeakSet<GLTF>();

function embeddedImages(buffer: ArrayBuffer): { json: EmbeddedImages; binary: Uint8Array } {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength) {
    throw new Error('Tree textures require a complete GLB 2 file.');
  }
  let json: EmbeddedImages | undefined, binary: Uint8Array | undefined;
  for (let offset = 12; offset + 8 <= buffer.byteLength;) {
    const length = view.getUint32(offset, true), kind = view.getUint32(offset + 4, true);
    if (length % 4 || offset + 8 + length > buffer.byteLength) throw new Error('Tree image chunk is incomplete.');
    if (kind === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, offset + 8, length))) as EmbeddedImages;
    else if (kind === 0x004e4942) binary = new Uint8Array(buffer, offset + 8, length);
    offset += 8 + length;
  }
  if (!json || !binary) throw new Error('Tree textures require embedded model JSON and image bytes.');
  return { json, binary };
}

function textureSignature(texture: THREE.Texture): string {
  // Effective transforms are read without mutating source Texture.matrix or renderer state.
  const matrix = texture.matrixAutoUpdate
    ? new THREE.Matrix3().setUvTransform(texture.offset.x, texture.offset.y, texture.repeat.x, texture.repeat.y, texture.rotation, texture.center.x, texture.center.y)
    : texture.matrix;
  const values = [texture.colorSpace, texture.channel, texture.wrapS, texture.wrapT, texture.magFilter, texture.minFilter,
    texture.anisotropy, texture.format, texture.type, texture.internalFormat, texture.generateMipmaps, texture.flipY,
    texture.premultiplyAlpha, texture.unpackAlignment, texture.matrixAutoUpdate, ...matrix.elements];
  if (values.some(value => typeof value === 'number' && !Number.isFinite(value))) throw new Error('Tree texture has invalid sampling or UV transforms.');
  return JSON.stringify(values);
}

function materialTextureFields(gltf: GLTF): { fields: Record<string, unknown>; key: string; texture: THREE.Texture }[] {
  const result: { fields: Record<string, unknown>; key: string; texture: THREE.Texture }[] = [], materials = new Set<THREE.Material>();
  for (const scene of new Set([gltf.scene, ...gltf.scenes])) scene.traverse(object => {
    const mesh = object as THREE.Mesh; if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
  });
  for (const material of materials) for (const [key, value] of Object.entries(material)) if ((value as THREE.Texture | null)?.isTexture) {
    result.push({ fields: material as unknown as Record<string, unknown>, key, texture: value as THREE.Texture });
  }
  return result;
}

/**
 * Deduplicate independently decoded embedded LOD images after the caller validates
 * all source parts. Only public material fields change; parser caches remain intact.
 * Validate/hash every used image before adopting any new canonical texture, so a
 * malformed input cannot leave a partially installed pool or material replacement.
 */
export async function deduplicateTreeTextures(gltf: GLTF, buffer: ArrayBuffer): Promise<void> {
  if (installed.has(gltf)) return;
  const refs = materialTextureFields(gltf), textures = [...new Set(refs.map(ref => ref.texture))];
  if (!textures.length) return;
  const { json, binary } = embeddedImages(buffer), digests = new Map<number, Promise<string>>();
  const plans = await Promise.all(textures.map(async texture => {
    const textureIndex = gltf.parser.associations.get(texture)?.textures;
    if (!Number.isInteger(textureIndex) || textureIndex! < 0) throw new Error('Tree texture has no valid embedded source association.');
    const source = json.textures?.[textureIndex!]?.source;
    if (!Number.isInteger(source) || source! < 0) throw new Error('Tree texture has no embedded image.');
    const image = json.images?.[source!], imageView = image && Number.isInteger(image.bufferView) ? json.bufferViews?.[image.bufferView!] : undefined;
    if (!image || image.uri || !imageView || (imageView.buffer ?? 0) !== 0) throw new Error('Tree texture must use embedded image bytes.');
    const offset = imageView.byteOffset ?? 0, length = imageView.byteLength;
    if (!Number.isInteger(offset) || !Number.isInteger(length) || offset < 0 || length <= 0 || offset + length > binary.byteLength) {
      throw new Error('Tree embedded image exceeds its binary buffer.');
    }
    let digest = digests.get(source!);
    if (!digest) {
      digest = crypto.subtle.digest('SHA-256', binary.slice(offset, offset + length)).then(value =>
        Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join(''));
      digests.set(source!, digest);
    }
    return { texture, key: `${image.mimeType ?? ''}:${await digest}:${textureSignature(texture)}` };
  }));
  const replacements = new Map<THREE.Texture, THREE.Texture>();
  for (const plan of plans) {
    const canonical = pool.get(plan.key);
    if (canonical) replacements.set(plan.texture, canonical);
    else pool.set(plan.key, plan.texture);
  }
  for (const ref of refs) ref.fields[ref.key] = replacements.get(ref.texture) ?? ref.texture;

  const retainedImages = new Set<unknown>();
  const recordImage = (image: unknown) => {
    if (Array.isArray(image)) image.forEach(recordImage); else retainedImages.add(image);
  };
  for (const texture of pool.values()) recordImage(texture.image);
  for (const ref of materialTextureFields(gltf)) recordImage(ref.texture.image);
  const retiredImages = new Set<unknown>();
  for (const [texture, canonical] of replacements) if (texture !== canonical) {
    texture.dispose();
    const collectImage = (image: unknown) => {
      if (Array.isArray(image)) image.forEach(collectImage); else retiredImages.add(image);
    };
    collectImage(texture.image);
  }
  // Several maps or sampler views can share one ImageBitmap. Close only fully retired image identities.
  for (const image of retiredImages) if (!retainedImages.has(image) && typeof (image as { close?: unknown } | null)?.close === 'function') {
    (image as { close(): void }).close();
  }
  installed.add(gltf);
}
