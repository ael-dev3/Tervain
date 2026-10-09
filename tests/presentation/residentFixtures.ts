import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MeshyNpcEntry, MeshyNpcManifest } from '../../src/presentation/meshynpcs';

/**
 * The delivered resident models, parsed on the CPU. Browser texture decoding alone is replaced by empty textures; the
 * geometry, inverse binds, skin weights and joints are the shipped bytes.
 */
export const residentManifest = JSON.parse(readFileSync(new URL('../../public/models/npcs/manifest.json', import.meta.url), 'utf8')) as MeshyNpcManifest;

const parsed = new Map<string, Promise<GLTF>>();

export function residentEntry(id: string): MeshyNpcEntry {
  const entry = residentManifest.assets.find(asset => asset.id === id);
  if (!entry) throw new Error(`No resident model ${id}.`);
  return entry;
}

export function loadResident(id: string): Promise<{ source: GLTF; entry: MeshyNpcEntry }> {
  const entry = residentEntry(id);
  let source = parsed.get(id);
  if (!source) {
    const bytes = readFileSync(new URL(`../../public/models/npcs/${entry.file}`, import.meta.url));
    const loader = new GLTFLoader();
    loader.register(() => ({ name: 'TERVAIN_RESIDENT_CPU_TEXTURES', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
    // WebP colour maps load through EXT_texture_webp, which would decode in a browser: give those empty textures too.
    loader.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
    source = loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
    parsed.set(id, source);
  }
  return source.then(gltf => ({ source: gltf, entry }));
}

/** The one skinned mesh of a resident rig. */
export function residentMesh(root: THREE.Object3D): THREE.SkinnedMesh {
  let mesh: THREE.SkinnedMesh | null = null;
  root.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh && !mesh) mesh = object as THREE.SkinnedMesh; });
  if (!mesh) throw new Error('No skinned mesh.');
  return mesh;
}

/** A resident's shipped rig file, parsed and checked as the game does. */
export function loadResidentRigData(id: string) {
  return import('../../src/presentation/npc/residentRig').then(({ parseResidentRig }) =>
    parseResidentRig(JSON.parse(readFileSync(new URL(`../../public/models/npcs/rigs/${id}.json`, import.meta.url), 'utf8'))));
}

let motion: Promise<GLTF> | null = null;
/** The shipped motion library. */
export function loadResidentMotion(): Promise<GLTF> {
  if (!motion) {
    const bytes = readFileSync(new URL('../../public/models/npcs/motion/residents.glb', import.meta.url));
    motion = new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
  }
  return motion;
}
