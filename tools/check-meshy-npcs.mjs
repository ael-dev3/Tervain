/** Independent binary audit of shipped NPC GLBs. Does not import preparation/runtime code. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const JOINT_NAMES = ['hips', 'torso', 'head', 'armL', 'elbowL', 'armR', 'elbowR', 'legL', 'kneeL', 'legR', 'kneeR'];
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPES = { 5120: ['readInt8', 1, 127], 5121: ['readUInt8', 1, 255], 5122: ['readInt16LE', 2, 32767], 5123: ['readUInt16LE', 2, 65535], 5125: ['readUInt32LE', 4, 4294967295], 5126: ['readFloatLE', 4, null] };
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function need(condition, message) { if (!condition) throw new Error(message); }
function integer(value, name, maximum = Number.MAX_SAFE_INTEGER) { need(Number.isSafeInteger(value) && value >= 0 && value <= maximum, `${name}: invalid integer`); return value; }
function product(a, b) { return Array.from({ length: 16 }, (_, index) => { const column = Math.floor(index / 4); const row = index % 4; return [0, 1, 2, 3].reduce((sum, k) => sum + a[k * 4 + row] * b[column * 4 + k], 0); }); }
function nodeMatrix(node) {
  if (node.matrix) { need(node.matrix.length === 16 && node.matrix.every(Number.isFinite), 'invalid node matrix'); return node.matrix; }
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]; const [sx, sy, sz] = node.scale ?? [1, 1, 1]; const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const matrix = [(1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y + 2 * z * w) * sx, (2 * x * z - 2 * y * w) * sx, 0,
    (2 * x * y - 2 * z * w) * sy, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z + 2 * x * w) * sy, 0,
    (2 * x * z + 2 * y * w) * sz, (2 * y * z - 2 * x * w) * sz, (1 - 2 * x * x - 2 * y * y) * sz, 0, tx, ty, tz, 1];
  need(matrix.every(Number.isFinite), 'nonfinite node transform'); return matrix;
}
function imageDimensions(bytes) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { format: 'PNG', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes[0] === 255 && bytes[1] === 216) {
    let at = 2;
    while (at + 4 <= bytes.length) {
      if (bytes[at++] !== 255) continue;
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if ([216, 217, 1].includes(marker) || marker >= 208 && marker <= 215) continue;
      need(at + 2 <= bytes.length, 'truncated JPEG'); const size = bytes.readUInt16BE(at);
      need(size >= 2 && at + size <= bytes.length, 'truncated JPEG marker');
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) { need(size >= 8, 'invalid JPEG dimensions'); return { format: 'JPEG', width: bytes.readUInt16BE(at + 5), height: bytes.readUInt16BE(at + 3) }; }
      at += size;
    }
  }
  throw new Error('image is not a supported embedded PNG/JPEG');
}

export function auditNpcGlb(data, { label = 'NPC GLB', triangleBudget = 50000, textureDimensionCap = 2048, surfaceBake } = {}) {
  need(surfaceBake === undefined || surfaceBake === 'geometry-only-v1', 'unsupported surface bake contract');
  need(data.length >= 20 && data.readUInt32LE(0) === 0x46546c67 && data.readUInt32LE(4) === 2 && data.readUInt32LE(8) === data.length, `${label}: invalid GLB header`);
  let doc; let binary; let at = 12;
  while (at < data.length) {
    need(at + 8 <= data.length, `${label}: truncated chunk header`);
    const length = data.readUInt32LE(at); const type = data.readUInt32LE(at + 4); at += 8;
    need(length % 4 === 0 && at + length <= data.length, `${label}: invalid chunk bounds`);
    if (type === 0x4e4f534a) { need(!doc, 'duplicate JSON chunk'); doc = JSON.parse(data.subarray(at, at + length).toString('utf8')); }
    if (type === 0x004e4942) { need(!binary, 'duplicate BIN chunk'); binary = data.subarray(at, at + length); }
    at += length;
  }
  need(doc?.asset?.version === '2.0' && binary, `${label}: missing glTF2 JSON/BIN`);
  need((doc.extensionsRequired ?? []).length === 0, `${label}: unsupported required extensions`);
  need(doc.buffers?.length === 1 && !doc.buffers[0].uri && integer(doc.buffers[0].byteLength, 'buffer byteLength') <= binary.length, `${label}: external/unbounded buffer`);
  const accessors = doc.accessors ?? []; const views = doc.bufferViews ?? []; const cache = new Map();
  function view(index) {
    const v = views[integer(index, 'bufferView index', views.length - 1)]; need((v.buffer ?? 0) === 0, 'external buffer view');
    const start = integer(v.byteOffset ?? 0, 'view offset'); const size = integer(v.byteLength, 'view length'); need(start + size <= doc.buffers[0].byteLength, 'buffer view outside declared buffer');
    return { ...v, start, size };
  }
  function decode(index) {
    if (cache.has(index)) return cache.get(index);
    const a = accessors[integer(index, 'accessor index', accessors.length - 1)]; const type = TYPES[a.componentType]; const parts = COMPONENTS[a.type];
    need(type && parts, 'unsupported accessor layout'); const [read, componentBytes, divisor] = type; const count = integer(a.count, 'accessor count');
    const rows = Array.from({ length: count }, () => Array(parts).fill(0));
    function fill(v, offset, rowCount, stride, targetIndices) {
      need(offset + (rowCount ? (rowCount - 1) * stride + parts * componentBytes : 0) <= v.size, 'accessor outside its buffer view');
      for (let i = 0; i < rowCount; i++) for (let c = 0; c < parts; c++) {
        let value = binary[read](v.start + offset + i * stride + c * componentBytes);
        if (a.normalized && divisor) value = Math.max(-1, value / divisor);
        rows[targetIndices ? targetIndices[i] : i][c] = value;
      }
    }
    if (a.bufferView !== undefined) { const v = view(a.bufferView); const stride = v.byteStride ?? parts * componentBytes; need(stride >= parts * componentBytes && stride % componentBytes === 0, 'invalid accessor stride'); fill(v, integer(a.byteOffset ?? 0, 'accessor offset'), count, stride); }
    else need(a.sparse, 'accessor has no backing data');
    if (a.sparse) {
      const sparseCount = integer(a.sparse.count, 'sparse count', count); const indices = a.sparse.indices; const indexType = TYPES[indices.componentType]; need([5121, 5123, 5125].includes(indices.componentType), 'invalid sparse index type');
      const v = view(indices.bufferView); const offset = integer(indices.byteOffset ?? 0, 'sparse index offset'); need(offset + sparseCount * indexType[1] <= v.size, 'sparse indices outside buffer view');
      const targets = Array.from({ length: sparseCount }, (_, i) => binary[indexType[0]](v.start + offset + i * indexType[1]));
      need(targets.every((n, i) => n < count && (i === 0 || n > targets[i - 1])), 'invalid sparse index order');
      fill(view(a.sparse.values.bufferView), integer(a.sparse.values.byteOffset ?? 0, 'sparse value offset'), sparseCount, parts * componentBytes, targets);
    }
    need(rows.every((row) => row.every(Number.isFinite)), 'nonfinite accessor data'); cache.set(index, rows); return rows;
  }
  for (let i = 0; i < views.length; i++) view(i);
  const images = (doc.images ?? []).map((image, index) => {
    need(image.bufferView !== undefined && !image.uri, 'external image dependency'); const v = view(image.bufferView); const bytes = binary.subarray(v.start, v.start + v.size); const dimensions = imageDimensions(bytes);
    need(dimensions.width > 0 && dimensions.height > 0 && dimensions.width <= textureDimensionCap && dimensions.height <= textureDimensionCap, `image${index}: exceeds ${textureDimensionCap}px cap`);
    need(['image/png', 'image/jpeg'].includes(image.mimeType), 'unsupported image MIME');
    return { index, name: image.name ?? null, mimeType: image.mimeType, ...dimensions, bytes: bytes.length, sha256: sha256(bytes) };
  });
  const textureImage = (index) => { const texture = doc.textures?.[integer(index, 'texture index', (doc.textures?.length ?? 0) - 1)]; integer(texture?.source, 'texture image index', images.length - 1); return texture.source; };
  const materials = (doc.materials ?? []).map((material, index) => {
    const pbr = material.pbrMetallicRoughness ?? {}; need(pbr.baseColorTexture && material.normalTexture, 'missing baked basecolor/normal material maps');
    need((material.alphaMode ?? 'OPAQUE') === 'OPAQUE', 'NPC material must be opaque');
    const maps = Object.fromEntries([['baseColor', pbr.baseColorTexture], ['normal', material.normalTexture], ['metallicRoughness', pbr.metallicRoughnessTexture], ['occlusion', material.occlusionTexture], ['emissive', material.emissiveTexture]].filter(([, entry]) => entry).map(([role, entry]) => { need((entry.texCoord ?? 0) === 0, 'material references unsupported UV set'); return [role, textureImage(entry.index)]; }));
    need((pbr.roughnessFactor ?? 1) >= 0 && (pbr.roughnessFactor ?? 1) <= 1 && (pbr.metallicFactor ?? 1) >= 0 && (pbr.metallicFactor ?? 1) <= 1, 'material factor outside PBR range');
    return { index, name: material.name ?? null, alphaMode: material.alphaMode ?? 'OPAQUE', doubleSided: material.doubleSided ?? false, metallicFactor: pbr.metallicFactor ?? 1, roughnessFactor: pbr.roughnessFactor ?? 1, maps };
  });
  need(images.length > 0 && materials.length > 0, 'no baked material resources');
  const meshes = doc.meshes ?? []; const primitiveData = new Map(); let uniqueTriangles = 0; let vertices = 0; let maximumWeightSumError = 0; let zeroAreaTriangles = 0;
  let maximumNormalLengthError = 0, maximumTangentLengthError = 0, maximumTangentNormalDot = 0, retainedSourceUvPrimitives = 0;
  meshes.forEach((mesh, meshIndex) => mesh.primitives.forEach((primitive, primitiveIndex) => {
    need((primitive.mode ?? 4) === 4 && !primitive.extensions?.KHR_draco_mesh_compression, 'unsupported primitive mode/compression');
    integer(primitive.material, 'primitive material', materials.length - 1); const attr = primitive.attributes;
    for (const semantic of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']) need(attr?.[semantic] !== undefined, `missing ${semantic}`);
    need(attr.JOINTS_1 === undefined && attr.WEIGHTS_1 === undefined, 'unsupported additional skin influences');
    const positions = decode(attr.POSITION); const normals = decode(attr.NORMAL); const uvs = decode(attr.TEXCOORD_0); const joints = decode(attr.JOINTS_0); const weights = decode(attr.WEIGHTS_0);
    const tangents = attr.TANGENT === undefined ? undefined : decode(attr.TANGENT);
    if (surfaceBake) need(tangents && accessors[attr.TANGENT].type === 'VEC4' && tangents.length === positions.length, 'rebaked NPC is missing a complete tangent basis');
    if (surfaceBake) {
      need(attr.TEXCOORD_1 !== undefined && accessors[attr.TEXCOORD_1]?.type === 'VEC2', 'rebuilt NPC is missing its retained source UV set');
      need(decode(attr.TEXCOORD_1).length === positions.length, 'retained source UV count differs from the rebuilt vertices');
      retainedSourceUvPrimitives++;
    }
    need(accessors[attr.POSITION].type === 'VEC3' && accessors[attr.NORMAL].type === 'VEC3' && accessors[attr.TEXCOORD_0].type === 'VEC2' && accessors[attr.JOINTS_0].type === 'VEC4' && accessors[attr.WEIGHTS_0].type === 'VEC4', 'incorrect vertex attribute type');
    need([normals, uvs, joints, weights].every((rows) => rows.length === positions.length), 'vertex attribute count mismatch');
    need([5121, 5123].includes(accessors[attr.JOINTS_0].componentType) && !accessors[attr.JOINTS_0].normalized, 'invalid joint index encoding');
    const indices = primitive.indices === undefined ? positions.map((_, i) => i) : decode(primitive.indices).map((row) => row[0]);
    if (primitive.indices !== undefined) need(accessors[primitive.indices].type === 'SCALAR' && [5121, 5123, 5125].includes(accessors[primitive.indices].componentType) && !accessors[primitive.indices].normalized, 'invalid primitive index encoding');
    need(indices.length % 3 === 0 && indices.every((index) => Number.isInteger(index) && index >= 0 && index < positions.length), 'invalid triangle indices');
    for (let i = 0; i < weights.length; i++) {
      need(weights[i].every((w) => w >= 0 && w <= 1), 'negative/oversized skin weight'); const error = Math.abs(weights[i].reduce((a, b) => a + b, 0) - 1); maximumWeightSumError = Math.max(maximumWeightSumError, error); need(error <= 0.001, 'skin weights do not sum to one');
      const normalError = Math.abs(Math.hypot(...normals[i]) - 1);
      maximumNormalLengthError = Math.max(maximumNormalLengthError, normalError);
      need(normalError <= 0.02, 'nonunit vertex normal');
      if (tangents) {
        const tangent = tangents[i]; need(tangent?.length === 4, 'incomplete vertex tangent');
        const tangentError = Math.abs(Math.hypot(...tangent.slice(0, 3)) - 1);
        const dot = Math.abs(normals[i].reduce((sum, value, k) => sum + value * tangent[k], 0));
        maximumTangentLengthError = Math.max(maximumTangentLengthError, tangentError);
        maximumTangentNormalDot = Math.max(maximumTangentNormalDot, dot);
        if (surfaceBake) need(normalError <= 0.0001 && tangentError <= 0.0001 && dot <= 0.0001 && Math.abs(tangent[3]) === 1, 'rebaked NPC has an invalid normal/tangent basis');
      }
    }
    for (let i = 0; i < indices.length; i += 3) { const a = positions[indices[i]]; const b = positions[indices[i + 1]]; const c = positions[indices[i + 2]]; const u = b.map((n, k) => n - a[k]); const v = c.map((n, k) => n - a[k]); if (Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]) <= 1e-12) zeroAreaTriangles++; }
    const triangles = indices.length / 3; uniqueTriangles += triangles; vertices += positions.length; primitiveData.set(`${meshIndex}:${primitiveIndex}`, { triangles, joints, positions });
  }));
  const nodes = doc.nodes ?? []; const scene = doc.scenes?.[integer(doc.scene ?? 0, 'default scene index', (doc.scenes?.length ?? 0) - 1)]; need(scene, 'missing default scene');
  const visited = new Set(); const worlds = new Map(); const parents = new Map(); const instances = []; let sceneTriangles = 0;
  function visit(index, parent, parentIndex = null) {
    integer(index, 'scene node index', nodes.length - 1); need(!visited.has(index), 'scene node cycle/multiple parents'); visited.add(index); parents.set(index, parentIndex);
    const node = nodes[index]; const world = product(parent, nodeMatrix(node)); worlds.set(index, world);
    if (node.mesh !== undefined) {
      const mesh = meshes[integer(node.mesh, 'node mesh index', meshes.length - 1)]; integer(node.skin, 'node skin index', (doc.skins?.length ?? 0) - 1);
      let count = 1; const instancing = node.extensions?.EXT_mesh_gpu_instancing;
      if (instancing) { const attributes = Object.values(instancing.attributes ?? {}); need(attributes.length > 0, 'empty instancing extension'); count = accessors[attributes[0]]?.count; need(attributes.every((i) => accessors[i]?.count === count) && Number.isInteger(count) && count >= 1, 'invalid instance attributes'); attributes.forEach(decode); }
      const triangles = mesh.primitives.reduce((sum, _, primitiveIndex) => sum + primitiveData.get(`${node.mesh}:${primitiveIndex}`).triangles, 0) * count;
      instances.push({ node: index, mesh: node.mesh, skin: node.skin, instances: count, triangles }); sceneTriangles += triangles;
    }
    (node.children ?? []).forEach((child) => visit(child, world, index));
  }
  (scene.nodes ?? []).forEach((index) => visit(index, IDENTITY));
  need(instances.length > 0 && sceneTriangles > 0, 'default scene has no skinned triangles');
  need(sceneTriangles <= triangleBudget && uniqueTriangles <= triangleBudget, `${label}: ${sceneTriangles} scene triangles / ${uniqueTriangles} stored triangles exceed ${triangleBudget} cap`);
  const skins = (doc.skins ?? []).map((skin) => {
    need(skin.joints?.length === JOINT_NAMES.length, 'incorrect procedural joint count'); const names = skin.joints.map((index) => nodes[integer(index, 'skin joint node', nodes.length - 1)]?.name); need(names.every((name, index) => name === JOINT_NAMES[index]), 'incorrect procedural joint names/order');
    need(new Set(skin.joints).size === skin.joints.length, 'duplicate joint');
    const expectedParents = [null, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9];
    skin.joints.forEach((node, index) => {
      need(index === 0 || parents.get(node) === skin.joints[expectedParents[index]], 'incorrect procedural bone hierarchy');
      const matrix = worlds.get(node); need(matrix, 'joint outside default scene');
      need([0, 1, 2, 4, 5, 6, 8, 9, 10].every((k) => Math.abs(matrix[k] - IDENTITY[k]) <= 0.00001), 'procedural rest axes are not identity');
    });
    const matrices = decode(skin.inverseBindMatrices); need(accessors[skin.inverseBindMatrices].type === 'MAT4' && matrices.length === skin.joints.length, 'invalid inverse bind matrices');
    let neutralBindMaximumError = 0;
    skin.joints.forEach((node, index) => { need(worlds.has(node), 'joint outside default scene'); const neutral = product(worlds.get(node), matrices[index]); neutralBindMaximumError = Math.max(neutralBindMaximumError, ...neutral.map((n, k) => Math.abs(n - IDENTITY[k]))); });
    need(neutralBindMaximumError <= 0.00001, 'skin is not neutral in authored rest pose'); return { name: skin.name ?? null, joints: names, neutralBindMaximumError };
  });
  instances.forEach((instance) => meshes[instance.mesh].primitives.forEach((_, i) => { const primitive = primitiveData.get(`${instance.mesh}:${i}`); need(primitive.joints.every((row) => row.every((j) => Number.isInteger(j) && j >= 0 && j < skins[instance.skin].joints.length)), 'joint index outside skin'); }));
  need((doc.animations ?? []).length === 0, 'unexpected embedded animation clips: this pipeline uses the procedural poser');
  return { label, bytes: data.length, sha256: sha256(data), storedTriangles: uniqueTriangles, sceneTriangles, vertices, meshCount: meshes.length, sceneMeshInstances: instances, skins, animationCount: 0, materialCount: materials.length, materials, images, maximumWeightSumError, zeroAreaTriangles, maximumNormalLengthError, maximumTangentLengthError, maximumTangentNormalDot, retainedSourceUvPrimitives, surfaceBake: surfaceBake ?? null, triangleBudget, textureDimensionCap };
}

function main() {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..'); const args = process.argv.slice(2); let only; let jsonOutput;
  for (let i = 0; i < args.length; i++) { if (args[i] === '--only') only = args[++i]?.split(','); else if (args[i] === '--json') jsonOutput = resolve(args[++i]); else throw new Error(`Unknown argument ${args[i]}`); }
  const configBytes = readFileSync(resolve(repo, 'tools/meshy-npc-sources.json')); const config = JSON.parse(configBytes); need(config.maxTriangles === 50000, 'NPC manifest changes the owner-established 50k cap'); const provenancePath = resolve(repo, 'docs/engineering/meshy-npc-assets.json'); const provenance = JSON.parse(readFileSync(provenancePath, 'utf8'));
  need(provenance.selection.sha256 === sha256(configBytes), 'stale role-selection provenance');
  const runtimeManifest = JSON.parse(readFileSync(resolve(repo, 'public/models/npcs/manifest.json'), 'utf8'));
  need(runtimeManifest.schema === 1 && runtimeManifest.maxTriangles === config.maxTriangles && runtimeManifest.assets?.length === config.assets.length, 'incompatible public NPC manifest');
  need(new Set(runtimeManifest.assets.map(entry => entry.id)).size === config.assets.length, 'duplicate public NPC manifest entry');
  need(new Set(runtimeManifest.assets.map(entry => entry.file)).size === config.assets.length
    && runtimeManifest.assets.every(entry => config.assets.some(row => row.id === entry.id && entry.file === `${row.id}.glb`))
    && Object.keys(runtimeManifest.roles ?? {}).length === config.assets.length
    && config.assets.every(row => runtimeManifest.roles[row.role] === row.id), 'public NPC assignments differ from the source selection');
  const selected = config.assets.filter((asset) => !only || only.includes(asset.id)); need(selected.length > 0 && (!only || selected.length === new Set(only).size), 'unknown/empty --only selection');
  const known = new Set(config.assets.map((asset) => `${asset.id}.glb`)); const directory = resolve(repo, 'public/models/npcs');
  function glbs(folder, prefix = '') { return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => { need(!entry.isSymbolicLink(), 'NPC asset folder contains a symlink'); const name = prefix + entry.name; return entry.isDirectory() ? glbs(resolve(folder, entry.name), name + '/') : name.endsWith('.glb') ? [name] : []; }); }
  const unexpected = glbs(directory).filter((file) => !known.has(file)); need(unexpected.length === 0, `unregistered NPC GLBs: ${unexpected.join(', ')}`);
  const assets = selected.map((assignment) => {
    const served = runtimeManifest.assets.find(entry => entry.id === assignment.id);
    need(served?.file === `${assignment.id}.glb` && runtimeManifest.roles?.[assignment.role] === assignment.id, `${assignment.id}: missing/incorrect public role assignment`);
    const path = resolve(directory, `${assignment.id}.glb`); const actual = auditNpcGlb(readFileSync(path), { label: relative(repo, path), triangleBudget: config.maxTriangles, surfaceBake: served.surfaceBake });
    need(served.sha256 === actual.sha256 && served.bytes === actual.bytes && served.triangles === actual.sceneTriangles, `${assignment.id}: stale public manifest`);
    const recorded = provenance.assignments.find((entry) => entry.id === assignment.id); need(recorded?.status === 'prepared' && recorded.runtime?.sha256 === actual.sha256 && recorded.runtime.bytes === actual.bytes && recorded.runtime.triangles === actual.sceneTriangles, `${assignment.id}: missing/stale runtime provenance`);
    need(Number.isFinite(served.height) && Math.abs(served.height - recorded.runtime.height) <= 0.000001, `${assignment.id}: stale public model height`);
    need(recorded.role === assignment.role && recorded.pose === assignment.pose && recorded.surface === assignment.surface && JSON.stringify(recorded.palette) === JSON.stringify(assignment.palette), `${assignment.id}: role/material selection provenance mismatch`);
    need(recorded.source.filename === assignment.sourceFilename && recorded.source.id === assignment.sourceId && recorded.source.sha256 === recorded.receipt.sourceSha256, `${assignment.id}: source provenance mismatch`);
    need(recorded.receipt.id === assignment.id && recorded.receipt.role === assignment.role && recorded.receipt.sourceFilename === assignment.sourceFilename && recorded.receipt.runtime.sha256 === actual.sha256 && recorded.receipt.runtime.bytes === actual.bytes && recorded.receipt.runtime.triangles === actual.sceneTriangles, `${assignment.id}: preparation receipt mismatch`);
    if (served.surfaceBake) need(recorded.surfaceRebake?.contract === served.surfaceBake && recorded.surfaceRebake.candidate?.sha256 === actual.sha256 && recorded.surfaceRebake.source?.sha256 === recorded.source.sha256, `${assignment.id}: missing/stale surface rebake evidence`);
    return { id: assignment.id, role: assignment.role, ...actual };
  });
  const report = { schemaVersion: 1, verifiedUTC: new Date().toISOString(), scope: only ? 'selected assets only; not complete pack acceptance' : `all${config.assets.length} assignments and all registered public NPC GLBs`, assetCount: assets.length, sumPerModelSceneTriangles: assets.reduce((sum, asset) => sum + asset.sceneTriangles, 0), assets };
  if (jsonOutput) writeFileSync(jsonOutput, JSON.stringify(report, null, 2) + '\n');
  assets.forEach((asset) => console.log(`${asset.id}: ${asset.sceneTriangles.toLocaleString()} scene triangles; ${asset.bytes.toLocaleString()} bytes; ${asset.skins[0].joints.length} joints; weights/bind/maps/hash verified`));
  console.log(`${assets.length} NPC GLBs verified. This is a file audit, not an in-game performance/deformation result.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
