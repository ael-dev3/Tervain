import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ANIMALS, type AnimalDefinition, type AnimalClip } from '../../src/presentation/animals/catalog';

/** Small skin for lifecycle/controller tests. Real delivered topology is checked separately. */
export function animalFixture(segments = 1): GLTF {
  const scene = new THREE.Group(), geometry = new THREE.BoxGeometry(0.6, 0.6, 1.2, segments, segments, segments); geometry.translate(0, 0.3, 0);
  const bones = ['body', 'neck', 'head', 'jaw', 'tail', 'frontUpperL', 'frontLowerL', 'frontPawL', 'frontUpperR', 'frontLowerR', 'frontPawR',
    'hindUpperL', 'hindLowerL', 'hindPawL', 'hindUpperR', 'hindLowerR', 'hindPawR'].map(name => { const bone = new THREE.Bone(); bone.name = name; return bone; });
  for (const bone of bones.slice(1)) bones[0]!.add(bone);
  scene.add(bones[0]!);
  const indices: number[] = [], weights: number[] = [], position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const name = `${position.getZ(i) > 0 ? 'front' : 'hind'}Paw${position.getX(i) > 0 ? 'R' : 'L'}`;
    indices.push(position.getY(i) < 0.08 ? bones.findIndex(bone => bone.name === name) : 2, 0, 0, 0); weights.push(1, 0, 0, 0);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4)); geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const skin = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial()); scene.add(skin); skin.bind(new THREE.Skeleton(bones));
  const names: AnimalClip[] = ['Idle', 'Walk', 'Run', 'Alert', 'Call', 'Graze', 'Groom', 'Sleep'];
  const animations = names.map((name, index) => new THREE.AnimationClip(name, name === 'Call' ? 2.4 : 2, [
    new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 0.5, 1, 2], [0, 0, 0, 1, 0, Math.sin(0.04 + index * 0.015), 0, Math.cos(0.04 + index * 0.015), 0, 0, 0, 1, 0, 0, 0, 1]),
  ]));
  scene.updateMatrixWorld(true);
  scene.userData.animal = { motionSpeeds: { Walk: 1, Run: 2.6 } };
  return { scene, scenes: [scene], animations, cameras: [], asset: { version: '2.0' }, parser: {}, userData: {} } as unknown as GLTF;
}

export function animalBinary(definition: AnimalDefinition) {
  const bytes = readFileSync(new URL(`../../public/models/animals/${definition.file}`, import.meta.url));
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
  return { bytes, json, length };
}

/** Preserve every skinned surface, bone and animation sample; texture/GPU appearance has a native acceptance gate. */
export async function animalTemplates(definitions: readonly AnimalDefinition[] = ANIMALS): Promise<ReadonlyMap<string, GLTF>> {
  const result = new Map<string, GLTF>();
  for (const definition of definitions) {
    const { bytes, json, length } = animalBinary(definition);
    for (const material of json.materials ?? []) {
      delete material.normalTexture; delete material.occlusionTexture; delete material.emissiveTexture;
      if (material.pbrMetallicRoughness) { delete material.pbrMetallicRoughness.baseColorTexture; delete material.pbrMetallicRoughness.metallicRoughnessTexture; }
    }
    delete json.images; delete json.textures; delete json.samplers;
    const text = Buffer.from(JSON.stringify(json)), padded = Math.ceil(text.length / 4) * 4, bin = bytes.subarray(20 + length), decoded = Buffer.alloc(20 + padded + bin.length);
    decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
    decoded.writeUInt32LE(padded, 12); decoded.writeUInt32LE(0x4e4f534a, 16); decoded.fill(32, 20, 20 + padded); text.copy(decoded, 20); bin.copy(decoded, 20 + padded);
    const template = await new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
    result.set(definition.id, template);
  }
  return result;
}
