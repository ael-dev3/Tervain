import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { AnimalRig } from '../../src/presentation/animals/rig';
import { Terrain } from '../../src/world/terrain';

interface GLBJson {
  accessors: { count: number }[];
  nodes: { mesh?: number; name?: string }[];
  meshes: { primitives: { indices?: number; attributes: { POSITION: number; JOINTS_0?: number; WEIGHTS_0?: number } }[] }[];
  skins: { joints: number[]; inverseBindMatrices?: number }[];
  animations: { name: string; channels: { target: { node: number; path: string } }[] }[];
  materials?: unknown[];
  textures?: unknown[];
  images?: unknown[];
  samplers?: unknown[];
  extensionsUsed?: string[];
  extensionsRequired?: string[];
}

function file(id: string) {
  const bytes = readFileSync(new URL(`../../public/models/animals/${id}.glb`, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  return { bytes, jsonLength, json: JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as GLBJson };
}

/** Decode the actual delivered vertices, joints and curves; browser checks cover image pixels. */
async function withoutImages(id: string) {
  const { bytes, jsonLength, json } = file(id);
  json.materials = (json.materials ?? []).map(() => ({ pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: .8 } }));
  delete json.images; delete json.textures; delete json.samplers;
  json.extensionsUsed = (json.extensionsUsed ?? []).filter((name) => name !== 'EXT_texture_webp');
  json.extensionsRequired = (json.extensionsRequired ?? []).filter((name) => name !== 'EXT_texture_webp');
  const serialized = Buffer.from(JSON.stringify(json)), paddedLength = Math.ceil(serialized.length / 4) * 4;
  const binary = bytes.subarray(20 + jsonLength), decoded = Buffer.alloc(20 + paddedLength + binary.length);
  decoded.writeUInt32LE(0x46546c67, 0); decoded.writeUInt32LE(2, 4); decoded.writeUInt32LE(decoded.length, 8);
  decoded.writeUInt32LE(paddedLength, 12); decoded.writeUInt32LE(0x4e4f534a, 16);
  decoded.fill(0x20, 20, 20 + paddedLength); serialized.copy(decoded, 20); binary.copy(decoded, 20 + paddedLength);
  return new GLTFLoader().parseAsync(decoded.buffer.slice(decoded.byteOffset, decoded.byteOffset + decoded.byteLength) as ArrayBuffer, '');
}

describe('delivered animal GLBs', () => {
  for (const definition of ANIMALS.filter((animal) => animal.file)) it(`${definition.id} uses its own rigged native delivery within the 50k triangle budget`, () => {
    const { bytes, json } = file(definition.id);
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    let triangles = 0;
    for (const node of json.nodes) {
      if (node.mesh === undefined) continue;
      for (const primitive of json.meshes[node.mesh]!.primitives) {
        triangles += json.accessors[primitive.indices ?? primitive.attributes.POSITION]!.count / 3;
        expect(primitive.attributes.JOINTS_0).toBeDefined(); expect(primitive.attributes.WEIGHTS_0).toBeDefined();
      }
    }
    expect(triangles).toBeGreaterThan(1_000); expect(triangles).toBeLessThanOrEqual(50_000);
    expect(json.skins).toHaveLength(1); expect(json.skins[0]!.joints.length).toBeGreaterThanOrEqual(12);
    expect(json.skins[0]!.joints.length).toBeLessThanOrEqual(64); expect(json.skins[0]!.inverseBindMatrices).toBeDefined();
    const nativeNames = json.animations.map((animation) => animation.name);
    for (const name of ['Idle', 'Walk', 'Run', 'Call']) {
      expect(nativeNames).toContain(name);
      expect(json.animations.find((animation) => animation.name === name)!.channels.some((channel) => channel.target.path === 'rotation' && json.skins[0]!.joints.includes(channel.target.node))).toBe(true);
    }
  });

  it('plays actual native bone clips, deforms actual skinned vertices, and grounds the rig without accumulating support offsets', async () => {
    const definition = ANIMALS.find((animal) => animal.id === 'bear-a')!, model = await withoutImages('bear-a');
    const rig = new AnimalRig(definition, model);
    let mesh!: THREE.SkinnedMesh;
    model.scene.traverse((object) => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) mesh = object as THREE.SkinnedMesh; });
    const bone = model.scene.getObjectByName('FrontLeftUpper')!;
    const bind = bone.quaternion.clone();
    rig.animate(.3, 'walk', definition.walkSpeed, false);
    rig.ground({ heightAt: () => 3, walkable: () => true, carveAt: () => 0, seaDepth: () => 0 }, 20, -30, .5);
    expect(rig.activeClip).toBe('Walk'); expect(bone.quaternion.angleTo(bind)).toBeGreaterThan(.01);
    const joint = mesh.skeleton.bones.indexOf(bone as THREE.Bone);
    const index = mesh.geometry.attributes.skinIndex!, weights = mesh.geometry.attributes.skinWeight!;
    let vertex = -1, influence = 0;
    for (let i = 0; i < index.count; i++) for (let k = 0; k < 4; k++) if (index.getComponent(i, k) === joint && weights.getComponent(i, k) > influence) { vertex = i; influence = weights.getComponent(i, k); }
    expect(vertex).toBeGreaterThanOrEqual(0);
    expect(influence).toBeGreaterThan(.02);
    const posed = mesh.getVertexPosition(vertex, new THREE.Vector3());
    const stored = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position!, vertex);
    expect(posed.distanceTo(stored)).toBeGreaterThan(.005);
    expect(rig.root.position.y).toBeGreaterThanOrEqual(3.012);
    expect(rig.root.position.y).toBeLessThan(3.08);
    const feet = ['FrontLeftFoot', 'FrontRightFoot', 'BackLeftFoot', 'BackRightFoot'].map((name) => model.scene.getObjectByName(name)!);
    for (const foot of feet) expect(foot.getWorldPosition(new THREE.Vector3()).y).toBeGreaterThanOrEqual(2.99);
    rig.animate(.1, 'call', 0, false); rig.ground({ heightAt: () => 3, walkable: () => true, carveAt: () => 0, seaDepth: () => 0 }, 20, -30, .5);
    expect(rig.activeClip).toBe('Call');
    for (let tick = 0; tick < 60; tick++) { rig.animate(1 / 60, 'idle', 0, false); rig.ground({ heightAt: () => 3, walkable: () => true, carveAt: () => 0, seaDepth: () => 0 }, 20, -30, .5); }
    expect(rig.root.position.y).toBeGreaterThanOrEqual(3.012);
    expect(rig.root.position.y).toBeLessThan(3.08);
    expect(rig.triangles).toBeLessThanOrEqual(50_000); expect(rig.joints).toBeGreaterThanOrEqual(12);
    rig.dispose(); expect(rig.root.children).toHaveLength(0);
  });

  for (const id of ['bear-a', 'dog-a', 'deer-a']) it(`${id} keeps actual animated paw surfaces above authored and graded terrain`, async () => {
    const definition = ANIMALS.find((animal) => animal.id === id)!, terrain = new Terrain();
    const rig = new AnimalRig(definition, await withoutImages(id));
    const surfaces: { mesh: THREE.SkinnedMesh; vertex: number }[] = [];
    rig.asset.scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const position = mesh.geometry.attributes.position!;
      // Check every source vertex in the lowest 45 mm, independently of the runtime's sampled subset.
      // These vertices form the actual underside of the delivered paws, not their ankle bone origins.
      for (let vertex = 0; vertex < position.count; vertex++) if (position.getY(vertex) <= .045) surfaces.push({ mesh, vertex });
    });
    expect(surfaces.length).toBeGreaterThan(12); expect(rig.soleSampleCount).toBeGreaterThanOrEqual(16);
    expect(rig.soleSampleCount).toBeLessThanOrEqual(32);
    const point = new THREE.Vector3();
    let worstClearance = Infinity, maximumSupport = 0;
    for (const site of [definition.home, { x: -169, z: 17 }]) for (const gait of ['walk', 'flee'] as const) {
      const speed = gait === 'walk' ? definition.walkSpeed : definition.runSpeed;
      for (let frame = 0; frame < 24; frame++) {
        rig.animate(1 / 24, gait, speed, false);
        rig.ground(terrain, site.x, site.z, definition.yaw);
        let clearance = Infinity;
        for (const surface of surfaces) {
          surface.mesh.getVertexPosition(surface.vertex, point); surface.mesh.localToWorld(point);
          clearance = Math.min(clearance, point.y - terrain.heightAt(point.x, point.z));
        }
        worstClearance = Math.min(worstClearance, clearance);
        maximumSupport = Math.max(maximumSupport, rig.root.position.y - terrain.heightAt(site.x, site.z) - .012);
        expect(clearance, `${id} ${gait} pose ${frame} terrain ${site.x},${site.z}`).toBeGreaterThanOrEqual(-.015);
      }
    }
    expect(maximumSupport).toBeLessThan(.3);
    expect(worstClearance).toBeGreaterThanOrEqual(-.015);
    rig.dispose();
  });

  for (const id of ['deer-a', 'stag', 'deer-mount']) it(`${id} preserves rigid antler edges across native Call and Graze poses`, async () => {
    const model = await withoutImages(id), meshList: THREE.SkinnedMesh[] = [];
    model.scene.traverse((object) => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) meshList.push(object as THREE.SkinnedMesh); });
    const crown = meshList.map((mesh) => {
      const position = mesh.geometry.attributes.position!, indices = mesh.geometry.index!;
      let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let vertex = 0; vertex < position.count; vertex++) {
        minY = Math.min(minY, position.getY(vertex)); maxY = Math.max(maxY, position.getY(vertex));
        minZ = Math.min(minZ, position.getZ(vertex)); maxZ = Math.max(maxZ, position.getZ(vertex));
      }
      const height = maxY - minY, threshold = minY + height * .78;
      const inCrown = (vertex: number) => position.getY(vertex) > threshold || id === 'deer-mount' &&
        position.getY(vertex) > minY + height * .64 && position.getZ(vertex) < maxZ - (maxZ - minZ) * .35;
      const seen = new Set<string>(), edges: { a: number; b: number; length: number; rigid: boolean }[] = [];
      for (let triangle = 0; triangle < indices.count; triangle += 3) for (const [first, second] of [[0, 1], [1, 2], [2, 0]]) {
        const a = indices.getX(triangle + first!), b = indices.getX(triangle + second!);
        if (!inCrown(a) || !inCrown(b)) continue;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (seen.has(key)) continue; seen.add(key);
        const length = new THREE.Vector3().fromBufferAttribute(position, a).distanceTo(new THREE.Vector3().fromBufferAttribute(position, b));
        if (length > height * 1e-5) edges.push({ a, b, length, rigid: position.getY(a) > threshold && position.getY(b) > threshold });
      }
      // Selection depends only on source geometry, including antlers curling behind the torso.
      // The mount's high saddle/neck surfaces also retain short-edge continuity; they may flex.
      // It does not depend on which joints/weights the current skinning pipeline assigned.
      return { mesh, edges, vertices: [...new Set(edges.flatMap((edge) => [edge.a, edge.b]))], points: new Float64Array(position.count * 3) };
    });
    expect(crown.reduce((count, item) => count + item.edges.length, 0)).toBeGreaterThan(100);
    if (id === 'deer-mount') expect(crown.reduce((count, item) => count + item.edges.filter((edge) => !edge.rigid).length, 0)).toBeGreaterThan(20);
    const mixer = new THREE.AnimationMixer(model.scene);
    for (const name of ['Call', 'Graze']) {
      const clip = model.animations.find((animation) => animation.name === name)!;
      expect(clip).toBeDefined();
      const action = mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play(); action.clampWhenFinished = true;
      const point = new THREE.Vector3();
      for (let sample = 0; sample <= 32; sample++) {
        mixer.setTime(clip.duration * sample / 32); model.scene.updateMatrixWorld(true);
        let worst = 0, worstEdge = '';
        for (const { mesh, edges, vertices, points } of crown) {
          for (const vertex of vertices) {
            mesh.getVertexPosition(vertex, point); mesh.localToWorld(point);
            points[vertex * 3] = point.x; points[vertex * 3 + 1] = point.y; points[vertex * 3 + 2] = point.z;
          }
          for (const edge of edges) {
            const a = edge.a * 3, b = edge.b * 3;
            const posed = Math.hypot(points[a]! - points[b]!, points[a + 1]! - points[b + 1]!, points[a + 2]! - points[b + 2]!);
            const tolerance = edge.rigid ? Math.max(.0005, edge.length * .04) : Math.max(.005, edge.length * .75);
            const error = Math.abs(posed - edge.length) / tolerance;
            if (error > worst) { worst = error; worstEdge = `${edge.a},${edge.b}`; }
          }
        }
        expect(worst, `${id} ${name} crown edge ${worstEdge} phase ${sample}/32`).toBeLessThanOrEqual(1);
      }
      mixer.stopAllAction();
    }
    mixer.uncacheRoot(model.scene);
    new AnimalRig(ANIMALS.find((animal) => animal.id === id)!, model).dispose();
  });

  it('cat-a preserves lower belly surface continuity across native Walk and Run poses', async () => {
    const model = await withoutImages('cat-a'), meshList: THREE.SkinnedMesh[] = [];
    model.scene.traverse((object) => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) meshList.push(object as THREE.SkinnedMesh); });
    const belly = meshList.map((mesh) => {
      const position = mesh.geometry.attributes.position!, indices = mesh.geometry.index!;
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox!, size = bounds.getSize(new THREE.Vector3());
      const centerX = (bounds.min.x + bounds.max.x) / 2;
      // Select the low middle of the torso on both flanks from rest geometry alone.
      // Paw tips and the head/tail ends are outside this soft belly region.
      const inBelly = (vertex: number) => position.getY(vertex) > bounds.min.y + size.y * .1 &&
        position.getY(vertex) < bounds.min.y + size.y * .25 &&
        position.getZ(vertex) > bounds.min.z + size.z * .35 && position.getZ(vertex) < bounds.min.z + size.z * .6 &&
        Math.abs(position.getX(vertex) - centerX) < size.x * .4;
      const seen = new Set<string>(), edges: { a: number; b: number; length: number }[] = [];
      const first = new THREE.Vector3(), second = new THREE.Vector3();
      for (let triangle = 0; triangle < indices.count; triangle += 3) for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) {
        const a = indices.getX(triangle + i!), b = indices.getX(triangle + j!);
        if (!inBelly(a) || !inBelly(b)) continue;
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        if (seen.has(key)) continue; seen.add(key);
        const length = first.fromBufferAttribute(position, a).distanceTo(second.fromBufferAttribute(position, b));
        if (length > size.y * 1e-5) edges.push({ a, b, length });
      }
      return { mesh, edges, vertices: [...new Set(edges.flatMap((edge) => [edge.a, edge.b]))], points: new Float64Array(position.count * 3) };
    });
    expect(belly.reduce((count, item) => count + item.edges.length, 0)).toBeGreaterThan(100);
    const mixer = new THREE.AnimationMixer(model.scene), point = new THREE.Vector3();
    for (const name of ['Walk', 'Run']) {
      const clip = model.animations.find((animation) => animation.name === name)!;
      expect(clip).toBeDefined();
      const action = mixer.clipAction(clip).reset().setLoop(THREE.LoopOnce, 1).play(); action.clampWhenFinished = true;
      for (let sample = 0; sample <= 32; sample++) {
        mixer.setTime(clip.duration * sample / 32); model.scene.updateMatrixWorld(true);
        let worst = 0, worstEdge = '';
        for (const { mesh, edges, vertices, points } of belly) {
          for (const vertex of vertices) {
            mesh.getVertexPosition(vertex, point); mesh.localToWorld(point);
            points[vertex * 3] = point.x; points[vertex * 3 + 1] = point.y; points[vertex * 3 + 2] = point.z;
          }
          for (const edge of edges) {
            const a = edge.a * 3, b = edge.b * 3;
            const posed = Math.hypot(points[a]! - points[b]!, points[a + 1]! - points[b + 1]!, points[a + 2]! - points[b + 2]!);
            // Modest soft-skin flex is allowed; short adjacent belly edges must stay continuous.
            const error = Math.abs(posed - edge.length) / Math.max(.004, edge.length * .75);
            if (error > worst) { worst = error; worstEdge = `${edge.a},${edge.b}`; }
          }
        }
        expect(worst, `cat-a ${name} belly edge ${worstEdge} phase ${sample}/32`).toBeLessThanOrEqual(1);
      }
      mixer.stopAllAction();
    }
    mixer.uncacheRoot(model.scene);
    new AnimalRig(ANIMALS.find((animal) => animal.id === 'cat-a')!, model).dispose();
  });
});
