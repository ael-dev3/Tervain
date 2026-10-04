import * as THREE from 'three';
import { RealmPhysics } from '../world/physics';
import { mulberry32 } from '../world/noise';
import { makeTexPair } from './buildingTextures';
import { Ctx } from './buildKit';
import { Region, disposeGroup, type MatKey } from './regions';
import { barrel, crate } from './structures';

/** Existing complete native closed props, with their transforms now owned by rigid bodies. */
export function buildPhysicalProps(physics: RealmPhysics, quality: 'low' | 'medium' | 'high') {
  const group = new THREE.Group(); group.name = 'physical work supplies';
  const materials = new Map<MatKey, THREE.Material>();
  const textures: THREE.Texture[] = [];
  for (const key of ['planks', 'timber'] as const) {
    const pair = makeTexPair(key, quality === 'high' ? 1024 : quality === 'medium' ? 512 : 256, 12);
    textures.push(pair.map, pair.normal);
    materials.set(key, new THREE.MeshStandardMaterial({ map: pair.map, normalMap: pair.normal, vertexColors: true, roughness: .86 }));
  }
  materials.set('metal', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .57, metalness: .6 }));
  const meshes = new Map<string, THREE.Group>();
  for (const [i, p] of physics.props.entries()) {
    const spec = p.spec, region = new Region(spec.id, new Ctx()), rnd = mulberry32(6100 + i);
    if (spec.kind === 'barrel') barrel(region, rnd, 0, -spec.height / 2, 0, spec.height);
    else crate(region, rnd, 0, -(spec.height - .02) / 2, 0, spec.width - .06, spec.height - .02, spec.depth - .02);
    const mesh = region.toGroup({ get: key => materials.get(key)! });
    meshes.set(spec.id, mesh); group.add(mesh);
  }
  const update = () => {
    for (const pose of physics.poses()) {
      const mesh = meshes.get(pose.id)!;
      mesh.position.set(pose.position.x, pose.position.y, pose.position.z);
      mesh.quaternion.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
    }
  };
  update();
  return { group, update, stats: () => { const s = physics.stats(); return { hz: s.hz, bodies: s.bodies, awake: s.awake, held: s.held ? 1 : 0, steps: s.steps }; }, dispose() {
    disposeGroup(group); for (const m of materials.values()) m.dispose(); for (const t of textures) t.dispose();
  } };
}
