/**
 * Local numerical audit of actual manifest GLBs through the production NPC catalog and poser.
 * Run from any directory: node /path/to/repo/tools/audit-meshy-npc-runtime.mjs
 * Optional: --output /path/to/local/receipt.json --only asset-id,asset-id --prepare-only
 * The default receipt is in the repository's ignored outputs/ directory.
 *
 * Browser image decoding is replaced with neutral one-pixel DataTextures. Geometry,
 * skins, material bindings and role equipment are real; this is not visual, shader,
 * texture-paint, clipping, world-physics or hardware-performance acceptance. No browser,
 * listening server, external asset service or network access is required.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let output = path.join(repo, 'outputs', 'meshy-npc-runtime-audit.json');
let only = null, prepareOnly = false;
function valueAfter(index) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value after ${args[index]}`);
  return value;
}
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--output') { output = path.resolve(valueAfter(index)); index++; }
  else if (args[index] === '--only') { only = valueAfter(index).split(','); index++; }
  else if (args[index] === '--prepare-only') prepareOnly = true;
  else throw new Error(`Unknown argument ${args[index]}`);
}
const require = createRequire(path.join(repo, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const THREE = await import(pathToFileURL(path.join(path.dirname(require.resolve('three')), 'three.module.js')));
const { GLTFLoader } = await import(pathToFileURL(require.resolve('three/examples/jsm/loaders/GLTFLoader.js')));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const must = (condition, message) => { if (!condition) throw new Error(message); };
const bytesOf = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const meshes = root => { const result = []; root.traverse(object => { if (object.isMesh) result.push(object); }); return result; };
const geometrySnapshot = geometry => {
  const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [name, {
    count: attribute.count, itemSize: attribute.itemSize,
    sha256: digest(bytesOf(attribute.isInterleavedBufferAttribute ? attribute.data.array : attribute.array)),
  }]));
  return { attributes, index: geometry.index ? digest(bytesOf(geometry.index.array)) : null, userData: geometry.userData };
};
function templateSnapshot(asset) {
  const result = { geometries: [], joints: [], materials: [] };
  const seenGeometry = new Set(), seenMaterial = new Set();
  asset.scene.traverse(object => {
    if (object.isBone) result.joints.push({ name: object.name, position: object.position.toArray(),
      quaternion: object.quaternion.toArray(), scale: object.scale.toArray() });
    if (!object.isMesh) return;
    if (!seenGeometry.has(object.geometry)) { seenGeometry.add(object.geometry); result.geometries.push(geometrySnapshot(object.geometry)); }
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (seenMaterial.has(material)) continue;
      seenMaterial.add(material);
      result.materials.push({ name: material.name, color: material.color?.toArray(), roughness: material.roughness,
        metalness: material.metalness, normalScale: material.normalScale?.toArray(),
        textures: Object.fromEntries(Object.entries(material).filter(([, value]) => value?.isTexture).map(([name, value]) => [name, {
          uuid: value.uuid, colorSpace: value.colorSpace, minFilter: value.minFilter, magFilter: value.magFilter,
          pixelSha256: value.image?.data ? digest(bytesOf(value.image.data)) : null,
        }])) });
    }
  });
  return JSON.stringify(result);
}

/** Preserve actual GLB JSON/buffers/material bindings; synthetic textures cannot establish native paint or shader quality. */
async function decodeWithoutImagePixels(buffer) {
  const loader = new GLTFLoader();
  loader.register(parser => ({ name: 'TERVAIN_NUMERICAL_AUDIT_TEXTURES', loadTexture(index) {
    const definition = parser.json.textures[index];
    const normal = (parser.json.materials ?? []).some(material => material.normalTexture?.index === index);
    const texture = new THREE.DataTexture(new Uint8Array(normal ? [128, 128, 255, 255] : [128, 128, 128, 255]), 1, 1);
    texture.name = definition.name ?? `Numerical image stub ${index}`;
    texture.flipY = false;
    texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return Promise.resolve(texture);
  } }));
  return loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
}

const server = await createServer({ root: repo, configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const moduleFiles = ['src/presentation/meshynpcs.ts', 'src/presentation/characters.ts', 'src/presentation/npcSurface.ts',
    'src/presentation/disposeScene.ts', 'src/content/npcs.ts', 'src/presentation/npcStyle.ts', 'src/presentation/ambient.ts'];
  const moduleHashes = Object.fromEntries(await Promise.all(moduleFiles.map(async name => [name, digest(await fs.readFile(path.join(repo, name)))])));
  const [{ validateMeshyNpcManifest, validateMeshyNpcAsset, MeshyNpcCatalog }, { poseRig }, { NPCS }, { npcStyle },
    { AMBIENT_PEOPLE }, { disposeSceneResources }] = await Promise.all([
    server.ssrLoadModule('/src/presentation/meshynpcs.ts'), server.ssrLoadModule('/src/presentation/characters.ts'),
    server.ssrLoadModule('/src/content/npcs.ts'), server.ssrLoadModule('/src/presentation/npcStyle.ts'),
    server.ssrLoadModule('/src/presentation/ambient.ts'), server.ssrLoadModule('/src/presentation/disposeScene.ts'),
  ]);
  if (prepareOnly) {
    console.log(JSON.stringify({ ready: true, repo, scope: 'Module loading only; no final asset acceptance.',
      functions: ['validateMeshyNpcAsset', 'MeshyNpcCatalog.create', 'poseRig', 'disposeSceneResources'] }));
  } else {
    const started = performance.now();
    const manifestFile = path.join(repo, 'public/models/npcs/manifest.json');
    const manifestBytes = await fs.readFile(manifestFile), manifest = validateMeshyNpcManifest(JSON.parse(manifestBytes));
    const selected = manifest.assets.filter(entry => !only || only.includes(entry.id));
    must(selected.length && (!only || selected.length === new Set(only).size), 'Unknown/empty asset selection.');
    must(selected.every(entry => entry.surfaceBake === 'geometry-only-v1'), 'Selected final NPC pack is not fully rebaked yet.');
    const entries = [];
    const fixtures = [
      { mode: 'idle', time: 0.7, speed: 0, t: 0.5 },
      { mode: 'walk', time: 0.125, speed: 0.78, t: 0.5 },
      { mode: 'run', time: 0.375, speed: 1, t: 0.5 },
      { mode: 'work', time: 0.8, speed: 0, t: 0.5, workGesture: 'mending' },
      { mode: 'sit', time: 0.6, speed: 0, t: 0.5 },
      { mode: 'talk', time: 1.2, speed: 0, t: 0.5 },
      { mode: 'block', time: 0.3, speed: 0, t: 0.5 },
      { mode: 'strike', time: 0.7, speed: 0, t: 0.65 },
      { mode: 'dead', time: 0.7, speed: 0, t: 1 },
    ];
    let inspectedVertices = 0;
    for (const entry of selected) {
      const file = path.join(repo, 'public/models/npcs', entry.file), sourceBytes = await fs.readFile(file);
      must(sourceBytes.length === entry.bytes && digest(sourceBytes) === entry.sha256, `${entry.id}: Manifest differs from actual binary.`);
      const asset = await decodeWithoutImagePixels(sourceBytes);
      validateMeshyNpcAsset(asset, entry);
      const original = templateSnapshot(asset), sourceMeshes = meshes(asset.scene);
      const role = Object.entries(manifest.roles).find(([, id]) => id === entry.id)?.[0];
      must(role, `${entry.id}: Missing role.`);
      let heightScale = 1;
      if (role.startsWith('named:')) {
        const id = role.slice(6); heightScale = NPCS[id].look.height * (npcStyle(id).build === 'woman' ? 0.94 : 1);
      } else if (role.startsWith('ambient:')) {
        const spec = AMBIENT_PEOPLE.find(person => person.style.id === role.slice(8));
        must(spec, `${entry.id}: Unknown ambient role.`);
        heightScale = spec.look.height * (spec.style.build === 'woman' ? 0.94 : 1);
      } else if (role.startsWith('enemy:')) heightScale = 1.04 + (role === 'enemy:ford_bandit_b' ? 0.05 : 0);
      const catalog = new MeshyNpcCatalog(manifest, new Map([[entry.id, asset]]));
      const rig = catalog.create(role, heightScale, role.startsWith('enemy:') ? 'blade' : 'none');
      const ownMeshes = meshes(rig.root);
      let completeTriangles = 0;
      for (const mesh of ownMeshes) completeTriangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
      must(completeTriangles === rig.root.userData.meshyNpc.triangles && completeTriangles <= 50_000,
        `${entry.id}: Complete actor including hidden equipment exceeds/mismatches its cap.`);
      for (const source of sourceMeshes) {
        const sourceMaterial = Array.isArray(source.material) ? source.material : [source.material];
        for (const own of ownMeshes) {
          must(source.geometry !== own.geometry, `${entry.id}: Geometry clone is not private.`);
          if (source.isSkinnedMesh && own.isSkinnedMesh) {
            must(source.skeleton !== own.skeleton && own.skeleton.bones.every(bone => !source.skeleton.bones.includes(bone)), `${entry.id}: Skeleton clone is not private.`);
          }
          for (const material of Array.isArray(own.material) ? own.material : [own.material]) {
            must(!sourceMaterial.includes(material), `${entry.id}: Material clone is not private.`);
            for (const originalMaterial of sourceMaterial) for (const [name, texture] of Object.entries(material)) {
              if (!texture?.isTexture || !originalMaterial[name]?.isTexture) continue;
              must(texture !== originalMaterial[name], `${entry.id}: Texture GPU reference is shared with template.`);
            }
          }
        }
      }
      const sampleCount = rig.root.userData.meshyNpc.soleSamples;
      must(Number.isInteger(sampleCount) && sampleCount > 0 && sampleCount <= 64, `${entry.id}: Invalid cached sole count.`);
      rig.root.position.set(7, 3, -2); rig.root.rotation.y = 0.7;
      const rootPosition = rig.root.position.clone(), rootQuaternion = rig.root.quaternion.clone();
      const point = new THREE.Vector3();
      function scanPose(label) {
        rig.root.updateMatrixWorld(true);
        const bounds = new THREE.Box3();
        let vertexCount = 0;
        for (const mesh of ownMeshes) {
          if (mesh.isSkinnedMesh) mesh.skeleton.update();
          const count = mesh.geometry.attributes.position.count;
          for (let vertex = 0; vertex < count; vertex++) {
            mesh.getVertexPosition(vertex, point); mesh.localToWorld(point);
            must(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z), `${entry.id}/${label}: Nonfinite posed vertex ${vertex}.`);
            point.sub(rootPosition); bounds.expandByPoint(point); vertexCount++;
          }
        }
        inspectedVertices += vertexCount;
        must(rig.root.position.equals(rootPosition) && rig.root.quaternion.equals(rootQuaternion), `${entry.id}/${label}: Poser moved the physical root.`);
        const clearance = rig.root.userData.meshyNpc.soleClearance;
        must(Number.isFinite(clearance) && clearance >= 0 && clearance <= 0.1, `${entry.id}/${label}: Unbounded sole correction.`);
        return { pose: label, vertices: vertexCount, relativeBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() }, soleClearance: clearance };
      }
      const poses = [];
      for (const fixture of fixtures) {
        const pose = { amp: 1, ...fixture };
        for (let frame = 0; frame < 180; frame++) poseRig(rig, pose, 1 / 60);
        poses.push(scanPose(fixture.mode));
      }
      // A continuous two-cycle walk samples the whole gait rather than treating a single settled frame as gait acceptance.
      const walkSamples = [];
      for (let frame = 0; frame < 240; frame++) {
        const phase = frame / 120;
        poseRig(rig, { mode: 'walk', speed: 0.78, time: phase, t: 0, amp: 1 }, 1 / 60);
        if (frame >= 120 && frame % 15 === 0) walkSamples.push(scanPose(`walk-phase-${(phase % 1).toFixed(3)}`));
      }
      // Measure continuous task changes on the real private joints, not just finite settled screenshots.
      const transitions = [
        { mode: 'work', workGesture: 'mending' },
        { mode: 'idle', idle: { seed: 1103, clock: 3, force: 'arms crossed' } },
        { mode: 'idle', idle: { seed: 1103, clock: 3, force: 'scratch head' } },
        { mode: 'walk', speed: .78 }, { mode: 'sit' }, { mode: 'talk', seated: true },
        { mode: 'walk', speed: .78 }, { mode: 'work', workGesture: 'provisioning' }, { mode: 'idle' },
      ];
      const maxRates = { angular: 0, head: 0, hipLower: 0, soleRelease: 0 };
      const transitionPoses = [];
      let clock = 4, seatedSupport = null;
      for (const transition of transitions) {
        for (let frame = 0; frame < 180; frame++) {
          const prior = { ...rig.cur }, priorClearance = rig.root.userData.meshyNpc.soleClearance;
          clock += 1 / 60;
          poseRig(rig, { speed: 0, t: 0, amp: 1, ...transition, time: clock }, 1 / 60);
          for (const [key, value] of Object.entries(rig.cur)) {
            const rate = Math.abs(value - prior[key]) * 60;
            const category = key === 'lower' ? 'hipLower' : key.startsWith('head') ? 'head' : 'angular';
            const limit = category === 'hipLower' ? .72 : category === 'head' ? 1.5 : 4;
            maxRates[category] = Math.max(maxRates[category], rate);
            must(Number.isFinite(rate) && rate <= limit + 1e-8, `${entry.id}/${transition.mode}: Abrupt ${key} transition (${rate}).`);
          }
          const clearance = rig.root.userData.meshyNpc.soleClearance;
          maxRates.soleRelease = Math.max(maxRates.soleRelease, (priorClearance - clearance) * 60);
          must(Number.isFinite(clearance) && clearance >= 0 && clearance <= .1, `${entry.id}: Invalid transition sole fit.`);
          must(rig.root.position.equals(rootPosition) && rig.root.quaternion.equals(rootQuaternion), `${entry.id}: Transition moved physical root.`);
          if (transition.seated && seatedSupport) {
            for (const key of ['legL', 'legR', 'kneeL', 'kneeR', 'lower']) {
              must(Math.abs(rig.cur[key] - seatedSupport[key]) < .001, `${entry.id}: Seated speech abandoned ${key} support.`);
            }
          }
        }
        if (transition.mode === 'sit') seatedSupport = { ...rig.cur };
        transitionPoses.push(scanPose(`${transition.mode}${transition.seated ? '-seated' : ''}-transition`));
      }
      must(Math.abs(rig.cur.legL) < .001 && Math.abs(rig.cur.legR) < .001 && Math.abs(rig.cur.lower) < .001,
        `${entry.id}: Seated/working pose remained stuck after returning to idle.`);
      must(maxRates.soleRelease <= 1 + 1e-8, `${entry.id}: Abrupt visual sole release.`);
      must(templateSnapshot(asset) === original, `${entry.id}: Posing mutated a cached template's geometry, bones or materials.`);
      const scene = new THREE.Scene(); scene.add(rig.root); disposeSceneResources(scene, () => {});
      must(templateSnapshot(asset) === original, `${entry.id}: Actor disposal mutated its cached template.`);
      must(digest(await fs.readFile(file)) === entry.sha256, `${entry.id}: Binary changed during audit.`);
      entries.push({ id: entry.id, role, sha256: entry.sha256, bytes: entry.bytes, surfaceBake: entry.surfaceBake,
        heightScale, actualHeight: rig.height, triangles: entry.triangles, completeActorTriangles: completeTriangles,
        attachmentTriangles: completeTriangles - entry.triangles, cachedSoleSamples: sampleCount,
        garmentFits: ownMeshes.filter(mesh => mesh.geometry.userData.npcGarment).map(mesh => mesh.geometry.userData.npcGarment),
        templateUnchanged: true, ownedResourcesPrivate: true, poses, walkSamples,
        smoothTransitions: { frames: transitions.length * 180, maxRates, seatedSpeechSupported: true, returnsToStanding: true, transitionPoses } });
      console.log(`${entry.id}: ${completeTriangles.toLocaleString()} complete triangles; ${sampleCount} cached soles; ${poses.length + walkSamples.length + transitionPoses.length} finite full-geometry poses; ${transitions.length * 180} smooth transition frames`);
    }
    must(digest(await fs.readFile(manifestFile)) === digest(manifestBytes), 'Manifest changed during audit.');
    for (const [name, hash] of Object.entries(moduleHashes)) must(digest(await fs.readFile(path.join(repo, name))) === hash, `${name}: Runtime code changed during audit.`);
    const report = { schema: 1, passed: true, verifiedUTC: new Date().toISOString(),
      scope: only ? 'Selected assets only; not complete-pack acceptance.' : 'All final manifest assets and complete role equipment.',
      method: 'Actual GLB bytes/geometry/skin and production catalog/poser; private decoded skeletons at real role scales; 9 settled modes + 8 walking phases + 9 three-second task transitions; framewise joint/hip velocity and seated-speech support; original/template ownership checked before and after disposal.',
      limits: 'Only texture image decoding is synthetic. This does not validate source/baked paint pixels, native shaders/lighting, seam appearance, cloth stretch/penetration, physical world contacts, hardware timing, or every animation frame.',
      sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
      runtimeSourceHashes: moduleHashes, manifestSha256: digest(manifestBytes), assetCount: entries.length,
      threeRevision: THREE.REVISION, auditToolSha256: digest(await fs.readFile(fileURLToPath(import.meta.url))),
      totalModelTriangles: entries.reduce((sum, entry) => sum + entry.triangles, 0),
      totalCompleteActorTriangles: entries.reduce((sum, entry) => sum + entry.completeActorTriangles, 0),
      maximumCompleteActorTriangles: Math.max(...entries.map(entry => entry.completeActorTriangles)),
      cachedSoleRange: [Math.min(...entries.map(entry => entry.cachedSoleSamples)), Math.max(...entries.map(entry => entry.cachedSoleSamples))],
      inspectedVertices, elapsedSeconds: (performance.now() - started) / 1000, assets: entries };
    await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: true, assetCount: entries.length, inspectedVertices, output }));
  }
} finally { await server.close(); }
