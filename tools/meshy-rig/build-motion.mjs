#!/usr/bin/env node
/**
 * Builds the residents' motion library from Meshy animation results: one small GLB holding the reference skeleton
 * (the rig every clip was generated on) at rest and every clip, with nothing else. Meshy returns each result as the
 * full skinned character in centimetres under a scaled armature; the library keeps the bones in metres, each clip's
 * rotations for the 22 joints that move the skin (as normalized 16-bit quaternions) and the hips' translation, and
 * drops meshes, textures, scale channels and the constant joint offsets.
 *
 *   node tools/meshy-rig/build-motion.mjs <sources.json>    writes public/models/npcs/motion/residents.glb
 *
 * sources.json lists the downloaded results: [{ "file": "...glb", "clips": { "<clip name in file>": "<library name>" } }]
 * plus, per clip, where it came from (recorded in public/models/npcs/motion/clips.json).
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGlb } from './glb.mjs';
import { MESHY_JOINTS } from './extract-rig.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public/models/npcs/motion');
/** Joints with no skin influence: kept in the skeleton, not animated. */
const STILL = new Set(['head_end', 'headfront']);

class Writer {
  constructor() { this.chunks = []; this.length = 0; this.json = { asset: { version: '2.0', generator: 'Tervain build-motion' }, buffers: [{ byteLength: 0 }], bufferViews: [], accessors: [] }; }
  view(bytes) {
    while (this.length % 4) { this.chunks.push(Buffer.alloc(1)); this.length++; }
    this.chunks.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    this.json.bufferViews.push({ buffer: 0, byteOffset: this.length, byteLength: bytes.byteLength });
    this.length += bytes.byteLength;
    return this.json.bufferViews.length - 1;
  }
  accessor(typed, type, extra = {}) {
    const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[type];
    const componentType = typed instanceof Float32Array ? 5126 : 5122;
    this.json.accessors.push({ bufferView: this.view(typed), componentType, count: typed.length / n, type, ...extra });
    return this.json.accessors.length - 1;
  }
  write(file) {
    while (this.length % 4) { this.chunks.push(Buffer.alloc(1)); this.length++; }
    this.json.buffers[0].byteLength = this.length;
    let json = Buffer.from(JSON.stringify(this.json), 'utf8');
    json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
    const bin = Buffer.concat(this.chunks);
    const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
    header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
    jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
    fs.writeFileSync(file, Buffer.concat([header, jh, json, bh, bin]));
  }
}

export function buildMotion(sources) {
  const w = new Writer();
  let skeleton = null;
  const clips = [];
  for (const source of sources) {
    const glb = readGlb(source.file);
    const { json } = glb;
    const byName = new Map(json.nodes.map((node, i) => [node.name, i]));
    const armature = json.nodes[byName.get('Armature')];
    const unit = armature?.scale?.[0] ?? 1;
    // The reference skeleton at rest, in metres (identical in every result: they share one rig).
    const rest = MESHY_JOINTS.map((name) => {
      const node = json.nodes[byName.get(name)];
      if (!node) throw new Error(`${source.file}: no joint ${name}`);
      return { name, translation: (node.translation ?? [0, 0, 0]).map((v) => v * unit), rotation: node.rotation ?? [0, 0, 0, 1] };
    });
    if (!skeleton) skeleton = rest;
    else for (const [i, bone] of rest.entries()) {
      const d = Math.max(...bone.translation.map((v, k) => Math.abs(v - skeleton[i].translation[k])), ...bone.rotation.map((v, k) => Math.abs(v - skeleton[i].rotation[k])));
      if (d > 1e-4) throw new Error(`${source.file}: joint ${bone.name} differs from the reference rig (${d})`);
    }
    for (const animation of json.animations) {
      const name = source.clips[animation.name];
      if (!name) continue;
      // Channels keep their own keyframe times (a still joint may have only two); identical time bases are shared.
      let start = Infinity, end = 0, frames = 0;
      for (const channel of animation.channels) {
        const t = glb.accessor(animation.samplers[channel.sampler].input).array;
        start = Math.min(start, t[0]); end = Math.max(end, t[t.length - 1]); frames = Math.max(frames, t.length);
      }
      const inputs = new Map();
      const inputOf = (accessorIndex) => {
        const t = glb.accessor(accessorIndex).array;
        const key = `${t.length}:${t[0]}:${t[t.length - 1]}`;
        if (!inputs.has(key)) {
          const shifted = Float32Array.from(t, (v) => v - start);
          inputs.set(key, w.accessor(shifted, 'SCALAR', { min: [shifted[0]], max: [shifted[shifted.length - 1]] }));
        }
        return inputs.get(key);
      };
      const samplers = [], channels = [];
      for (const channel of animation.channels) {
        const joint = json.nodes[channel.target.node].name;
        if (!MESHY_JOINTS.includes(joint) || STILL.has(joint)) continue;
        const sampler = animation.samplers[channel.sampler];
        const values = glb.accessor(sampler.output).array;
        let output;
        if (channel.target.path === 'rotation') {
          const q = new Int16Array(values.length);
          for (let i = 0; i < values.length; i += 4) {
            // Keep each quaternion in the same hemisphere as the one before, so interpolation takes the short way.
            let [x, y, z, s] = [values[i], values[i + 1], values[i + 2], values[i + 3]];
            const n = Math.hypot(x, y, z, s) || 1;
            [x, y, z, s] = [x / n, y / n, z / n, s / n];
            if (i && x * q[i - 4] + y * q[i - 3] + z * q[i - 2] + s * q[i - 1] < 0) [x, y, z, s] = [-x, -y, -z, -s];
            q.set([x, y, z, s].map((v) => Math.round(v * 32767)), i);
          }
          output = w.accessor(q, 'VEC4', { normalized: true });
        } else if (channel.target.path === 'translation' && joint === 'Hips') {
          output = w.accessor(Float32Array.from(values, (v) => v * unit), 'VEC3');
        } else continue;
        samplers.push({ input: inputOf(sampler.input), output, interpolation: 'LINEAR' });
        channels.push({ sampler: samplers.length - 1, target: { node: 1 + MESHY_JOINTS.indexOf(joint), path: channel.target.path } });
      }
      (w.json.animations ??= []).push({ name, samplers, channels });
      clips.push({ name, duration: Math.round((end - start) * 1e4) / 1e4, frames, ...source.meta?.[animation.name] });
    }
  }
  // Nodes: an unscaled armature, then the joints in the library order, parented as in the rig.
  const parents = { Hips: 'Armature', Spine02: 'Hips', Spine01: 'Spine02', Spine: 'Spine01', neck: 'Spine', Head: 'neck', head_end: 'Head', headfront: 'Head',
    LeftShoulder: 'Spine', LeftArm: 'LeftShoulder', LeftForeArm: 'LeftArm', LeftHand: 'LeftForeArm',
    RightShoulder: 'Spine', RightArm: 'RightShoulder', RightForeArm: 'RightArm', RightHand: 'RightForeArm',
    LeftUpLeg: 'Hips', LeftLeg: 'LeftUpLeg', LeftFoot: 'LeftLeg', LeftToeBase: 'LeftFoot',
    RightUpLeg: 'Hips', RightLeg: 'RightUpLeg', RightFoot: 'RightLeg', RightToeBase: 'RightFoot' };
  const nodes = [{ name: 'Armature', children: [] }, ...skeleton.map((bone) => ({ name: bone.name, translation: bone.translation, rotation: bone.rotation, children: [] }))];
  const index = (name) => name === 'Armature' ? 0 : 1 + MESHY_JOINTS.indexOf(name);
  for (const name of MESHY_JOINTS) nodes[index(parents[name])].children.push(index(name));
  for (const node of nodes) if (!node.children.length) delete node.children;
  w.json.nodes = nodes;
  w.json.scenes = [{ nodes: [0] }];
  w.json.scene = 0;
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'residents.glb');
  w.write(file);
  return { file, clips, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex'), bytes: fs.statSync(file).size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const result = buildMotion(spec.sources);
  fs.writeFileSync(path.join(OUT, 'clips.json'), `${JSON.stringify({ schema: 1, file: 'residents.glb', sha256: result.sha256, bytes: result.bytes, rig: spec.rig, clips: result.clips }, null, 2)}\n`);
  console.log(`${path.relative(ROOT, result.file)}: ${result.clips.length} clips, ${(result.bytes / 1024).toFixed(0)} KiB`);
}
