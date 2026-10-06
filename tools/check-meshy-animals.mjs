/** Independent complete-model, skin, surface and animation audit for the supplied wildlife. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const types = { 5121: ['readUInt8', 1], 5123: ['readUInt16LE', 2], 5125: ['readUInt32LE', 4], 5126: ['readFloatLE', 4] };
const parts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const pawNames = ['frontPawL', 'frontPawR', 'hindPawL', 'hindPawR'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const multiply = (a, b) => Array.from({ length: 16 }, (_, i) => { const r = i % 4, c = Math.floor(i / 4); return [0, 1, 2, 3].reduce((sum, k) => sum + a[k * 4 + r] * b[c * 4 + k], 0); });
function matrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]; const [sx, sy, sz] = node.scale ?? [1, 1, 1]; const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [(1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y + 2 * z * w) * sx, (2 * x * z - 2 * y * w) * sx, 0,
    (2 * x * y - 2 * z * w) * sy, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z + 2 * x * w) * sy, 0,
    (2 * x * z + 2 * y * w) * sz, (2 * y * z - 2 * x * w) * sz, (1 - 2 * x * x - 2 * y * y) * sz, 0, tx, ty, tz, 1];
}
export function auditAnimalGlb(bytes, { label = 'animal', triangleBudget = 50000, seated = false } = {}) {
  assert(bytes.length >= 28 && bytes.toString('ascii', 0, 4) === 'glTF' && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `${label}: invalid GLB header`);
  let doc, binary; let at = 12;
  while (at < bytes.length) {
    const n = bytes.readUInt32LE(at), type = bytes.readUInt32LE(at + 4); at += 8;
    assert(n % 4 === 0 && at + n <= bytes.length, `${label}: invalid chunk`);
    if (type === 0x4e4f534a) doc = JSON.parse(bytes.toString('utf8', at, at + n));
    if (type === 0x004e4942) binary = bytes.subarray(at, at + n);
    at += n;
  }
  assert(doc?.asset?.version === '2.0' && binary && doc.buffers?.length === 1 && !doc.buffers[0].uri, `${label}: external/missing data`);
  const cache = new Map();
  function decode(index) {
    if (cache.has(index)) return cache.get(index);
    const a = doc.accessors?.[index], view = doc.bufferViews?.[a?.bufferView];
    assert(a && view && !a.sparse && (view.buffer ?? 0) === 0, `${label}: unsupported/unbacked accessor`);
    const [reader, size] = types[a.componentType] ?? []; const count = parts[a.type];
    assert(reader && count && Number.isInteger(a.count) && a.count >= 0, `${label}: malformed accessor`);
    const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0), stride = view.byteStride ?? size * count;
    assert(offset >= 0 && (a.count ? offset + (a.count - 1) * stride + size * count : offset) <= binary.length && (a.byteOffset ?? 0) + (a.count ? (a.count - 1) * stride + size * count : 0) <= view.byteLength, `${label}: accessor outside buffer`);
    const rows = Array.from({ length: a.count }, (_, i) => Array.from({ length: count }, (_, c) => binary[reader](offset + i * stride + c * size)));
    assert(rows.every((r) => r.every(Number.isFinite)), `${label}: nonfinite data`); cache.set(index, rows); return rows;
  }
  for (let i = 0; i < doc.accessors.length; i++) decode(i);
  const images = (doc.images ?? []).map((image) => {
    const view = doc.bufferViews[image.bufferView]; assert(view && !image.uri && ['image/png', 'image/jpeg', 'image/webp'].includes(image.mimeType), `${label}: missing embedded image`);
    return { mimeType: image.mimeType, bytes: view.byteLength };
  });
  assert(images.length > 0 && doc.materials?.length > 0, `${label}: missing supplied surfaces`);
  for (const mat of doc.materials) assert(mat.pbrMetallicRoughness?.baseColorTexture, `${label}: missing supplied color texture`);
  const nodes = doc.nodes ?? []; const parents = new Map();
  nodes.forEach((node, index) => (node.children ?? []).forEach((child) => { assert(nodes[child] && !parents.has(child), `${label}: invalid/multiply parented skeleton`); parents.set(child, index); }));
  const worlds = new Map();
  function world(index, active = new Set()) {
    assert(!active.has(index), `${label}: skeleton cycle`); if (worlds.has(index)) return worlds.get(index);
    active.add(index); const local = matrix(nodes[index]); const out = parents.has(index) ? multiply(world(parents.get(index), active), local) : local; worlds.set(index, out); active.delete(index); return out;
  }
  const skins = doc.skins ?? []; assert(skins.length === 1 && skins[0].joints.length >= 25, `${label}: incomplete quadruped skin`);
  const skin = skins[0]; const inverse = decode(skin.inverseBindMatrices); assert(inverse.length === skin.joints.length, `${label}: inverse bind count mismatch`);
  skin.joints.forEach((joint, i) => {
    assert(nodes[joint], `${label}: missing bone`); const product = multiply(world(joint), inverse[i]); assert(product.every((v, k) => Math.abs(v - identity()[k]) < 0.00001), `${label}: bind pose does not preserve source geometry`);
  });
  const jointNames = skin.joints.map((i) => nodes[i].name); for (const name of ['animalRoot', 'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'tailBase', ...pawNames]) assert(jointNames.includes(name), `${label}: missing anatomical bone ${name}`);
  let antlerHeight = 0;
  if (doc.asset.extras?.species === 'deer') for (const mesh of doc.meshes) for (const p of mesh.primitives) for (const point of decode(p.attributes.POSITION)) antlerHeight = Math.max(antlerHeight, point[1]);
  const antlerHead = jointNames.indexOf('head');
  const antlerFloor = world(skin.joints[antlerHead])[13] + antlerHeight * .07;
  let completeTriangles = 0, renderedMeshes = 0, vertices = 0, maxWeightError = 0, multipleInfluenceVertices = 0;
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; const influenceCounts = new Map();
  const primitiveTriangles = new Map();
  for (const [mi, mesh] of doc.meshes.entries()) {
    let triangles = 0;
    for (const p of mesh.primitives) {
      assert((p.mode ?? 4) === 4 && p.indices !== undefined, `${label}: nontriangle/nonindexed primitive`);
      for (const semantic of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']) assert(p.attributes[semantic] !== undefined, `${label}: missing ${semantic}`);
      const pos = decode(p.attributes.POSITION), normal = decode(p.attributes.NORMAL), uv = decode(p.attributes.TEXCOORD_0), joints = decode(p.attributes.JOINTS_0), weights = decode(p.attributes.WEIGHTS_0), ix = decode(p.indices).map((r) => r[0]);
      assert([normal, uv, joints, weights].every((x) => x.length === pos.length), `${label}: mismatched skin/UV accessors`); assert(ix.length % 3 === 0 && ix.every((i) => Number.isInteger(i) && i >= 0 && i < pos.length), `${label}: bad triangle list`);
      assert(doc.accessors[p.attributes.JOINTS_0].type === 'VEC4' && doc.accessors[p.attributes.WEIGHTS_0].type === 'VEC4', `${label}: malformed skin attributes`);
      pos.forEach((point, i) => {
        point.forEach((v, k) => { lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); });
        assert(joints[i].every((j) => Number.isInteger(j) && j >= 0 && j < skin.joints.length), `${label}: invalid bone index`);
        assert(weights[i].every((w) => w >= 0 && w <= 1), `${label}: negative/oversized weight`);
        // Backward high antler branches must follow the head even above the torso.
        if (antlerHeight && point[1] > antlerFloor) {
          const headWeight = weights[i].reduce((sum, w, k) => sum + (joints[i][k] === antlerHead ? w : 0), 0);
          assert(headWeight > .999, `${label}: antler tine is not rigidly attached to the head`);
        }
        const err = Math.abs(weights[i].reduce((a, b) => a + b, 0) - 1); maxWeightError = Math.max(err, maxWeightError); assert(err < 0.00001, `${label}: unnormalized weights`);
        if (weights[i].filter((w) => w > .02).length > 1) multipleInfluenceVertices++;
        weights[i].forEach((w, k) => { if (w > .02) influenceCounts.set(jointNames[joints[i][k]], (influenceCounts.get(jointNames[joints[i][k]]) ?? 0) + 1); });
      });
      vertices += pos.length; triangles += ix.length / 3;
    }
    primitiveTriangles.set(mi, triangles);
  }
  nodes.forEach((n) => { if (n.mesh !== undefined) { assert(n.skin === 0, `${label}: rendered mesh is unskinned`); renderedMeshes++; completeTriangles += primitiveTriangles.get(n.mesh); } });
  assert(renderedMeshes > 0 && completeTriangles > 0 && completeTriangles <= triangleBudget, `${label}: complete animal ${completeTriangles} > ${triangleBudget} triangles`);
  assert(Math.abs(lo[1]) < .005 && hi[1] > .25 && hi[1] < 3.5, `${label}: ungrounded/implausible meter scale`);
  assert(multipleInfluenceVertices / vertices > .10, `${label}: rigid island skinning`);
  for (const name of ['hips', 'chest', 'head', ...pawNames]) assert((influenceCounts.get(name) ?? 0) > 5, `${label}: unused anatomical region ${name}`);
  const clips = [];
  // At authored30Hz, 0.8rad permits brisk articulation while rejecting IK branch flips.
  // Loop endpoints compare quaternion orientation (q and -q are equivalent).
  const angularStepLimit = .8;
  for (const animation of doc.animations ?? []) {
    const destinations = new Set(); let duration = 0, animatedBones = new Set(); let motionSamples = 0; let maxAngularStep = 0, maxLoopAngle = 0;
    for (const channel of animation.channels) {
      assert(skin.joints.includes(channel.target.node) && ['rotation', 'translation'].includes(channel.target.path), `${label}: animation targets outside rig`);
      const key = `${channel.target.node}:${channel.target.path}`; assert(!destinations.has(key), `${label}: duplicate channel`); destinations.add(key);
      const sampler = animation.samplers[channel.sampler]; assert(sampler.interpolation === 'LINEAR', `${label}: unsupported sampler`);
      const time = decode(sampler.input).map((r) => r[0]), values = decode(sampler.output); assert(time.length === values.length && time.length >= 20 && time[0] === 0 && time.every((v, i) => i === 0 || v > time[i - 1]), `${label}: invalid sampled animation`); duration = Math.max(duration, time.at(-1));
      if (channel.target.path === 'translation') { assert(nodes[channel.target.node].name === 'animalRoot' && values.every((r) => Math.abs(r[0]) < 1e-6 && Math.abs(r[2]) < 1e-6), `${label}: clip contains horizontal root motion`); }
      if (channel.target.path === 'rotation') {
        assert(values.every((q) => q.length === 4 && Math.abs(Math.hypot(...q) - 1) < .0001), `${label}: nonunit animated quaternion`);
        for (let i = 1; i < values.length; i++) {
          const dot = Math.abs(values[i].reduce((sum, v, k) => sum + v * values[i - 1][k], 0));
          const angle = 2 * Math.acos(Math.min(1, dot)); maxAngularStep = Math.max(maxAngularStep, angle);
          assert(angle <= angularStepLimit, `${label}: ${animation.name} ${nodes[channel.target.node].name} jumps ${angle.toFixed(3)}rad between authored frames (IK bend discontinuity)`);
        }
        if (['Idle', 'Walk', 'Run', 'Graze', 'Groom', 'Sleep'].includes(animation.name)) {
          const dot = Math.abs(values[0].reduce((sum, v, k) => sum + v * values.at(-1)[k], 0));
          const angle = 2 * Math.acos(Math.min(1, dot)); maxLoopAngle = Math.max(maxLoopAngle, angle);
          assert(angle < .002, `${label}: ${animation.name} ${nodes[channel.target.node].name} has a loop seam`);
        }
        if (values.some((q) => q.some((v, k) => Math.abs(v - values[0][k]) > .001))) animatedBones.add(nodes[channel.target.node].name);
        motionSamples += values.length;
      }
    }
    assert(duration > .3 && duration <= 6 && animatedBones.size >= 4, `${label}: empty/unarticulated clip ${animation.name}`);
    if (['Walk', 'Run'].includes(animation.name)) for (const leg of ['frontShoulderL', 'frontShoulderR', 'hindHipL', 'hindHipR']) assert(animatedBones.has(leg), `${label}: gait does not articulate ${leg}`);
    clips.push({ name: animation.name, duration, animatedBones: animatedBones.size, samples: motionSamples, maxAngularStep, maxLoopAngle });
  }
  const required = seated ? ['Idle', 'Alert', 'Call', 'Groom', 'Sleep'] : ['Idle', 'Walk', 'Run', 'Alert', 'Call'];
  for (const name of required) assert(clips.some((a) => a.name === name), `${label}: missing ${name}`);
  return { completeTriangles, renderedMeshes, vertices, bones: skin.joints.length, maxWeightError, multipleInfluenceVertices, bounds: { min: lo, max: hi }, embeddedImages: images, clips };
}
export function auditAnimalInventory() {
  const source = JSON.parse(readFileSync(resolve(root, 'tools/meshy-animal-sources.json'))); const metadata = JSON.parse(readFileSync(resolve(root, 'docs/engineering/meshy-animal-assets.json')));
  assert(metadata.animals.length === source.animals.length && source.animals.length === 19, 'animal inventory must contain all 19 supplied models');
  const report = source.animals.map((row) => {
    const file = `${row.species}-${row.id}.glb`; const bytes = readFileSync(resolve(root, 'public/models/animals', file)); const entry = metadata.animals.find((a) => a.id === row.id);
    assert(entry?.filename === file && entry.outputSha256 === hash(bytes), `${file}: stale/missing receipt`);
    const result = auditAnimalGlb(bytes, { label: file, triangleBudget: source.triangleBudget, seated: row.restPose === 'seated' }); assert(result.completeTriangles === entry.triangles, `${file}: incorrect triangle receipt`);
    return { id: row.id, species: row.species, filename: file, bytes: bytes.length, ...result };
  });
  return { models: report.length, totalTriangles: report.reduce((n, r) => n + r.completeTriangles, 0), totalBytes: report.reduce((n, r) => n + r.bytes, 0), animals: report };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = auditAnimalInventory();
  console.log(`All ${report.models} complete skinned animals pass: ${report.totalTriangles.toLocaleString()} aggregate triangles, ${(report.totalBytes / 1048576).toFixed(1)} MiB.`);
  for (const row of report.animals) console.log(`${row.filename}: ${row.completeTriangles} triangles; ${row.bones} bones; ${row.clips.map((c) => c.name).join(', ')}`);
}
