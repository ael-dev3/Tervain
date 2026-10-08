#!/usr/bin/env node
/**
 * Asks the Meshy API for the residents' rigs and motion (A65) and downloads the results into a working folder outside
 * the repository, where extract-rig.mjs and build-motion.mjs turn them into the files the game ships. Every request
 * spends Meshy credits, and Meshy keeps results for three days. The key is read from MESHY_API_KEY and is never written
 * or printed.
 *
 *   node tools/meshy-rig/meshy.mjs rig <dir> [id,...]    each resident model rigged at its own height: <dir>/rigs/<id>.json, .glb
 *   node tools/meshy-rig/meshy.mjs library <dir>         motion-plan.json's library clips on the reference rig, ten a request
 *   node tools/meshy-rig/meshy.mjs motion <dir> <name>   one of the plan's text-to-motion clips, applied to the reference rig
 *   node tools/meshy-rig/meshy.mjs sources <dir>         <dir>/sources.json for build-motion.mjs, from what was downloaded
 *
 * Requests already completed in <dir> are not repeated. Text to motion differs on every run; the takes the game ships
 * are recorded in public/models/npcs/motion/clips.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
/** Meshy reads each model from the public repository. */
const MODELS = 'https://raw.githubusercontent.com/ael-dev3/Tervain/main/public/models/npcs/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`); };
const succeeded = (file, pick = (record) => record) => fs.existsSync(file) && pick(read(file))?.status === 'SUCCEEDED';
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

async function meshy(method, route, body) {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error('Set MESHY_API_KEY.');
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(`https://api.meshy.ai${route}`, {
      method, headers: { Authorization: `Bearer ${key}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 429 || response.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }
  throw new Error(`${method} ${route}: no answer after six tries`);
}

/** Wait for a task to end, and return it. */
async function settled(route) {
  for (let i = 0; i < 360; i++) {
    const task = await meshy('GET', route);
    if (['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status)) return task;
    await sleep(5000);
  }
  throw new Error(`${route}: still running after half an hour`);
}

async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download: ${response.status}`);
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

function report(label, task) {
  console.log(`${label}: ${task.status}${task.task_error?.message ? ` (${task.task_error.message})` : ''}`);
  if (task.status !== 'SUCCEEDED') process.exitCode = 1;
}

const plan = read(path.join(HERE, 'motion-plan.json'));
const manifest = read(path.join(ROOT, 'public/models/npcs/manifest.json'));
const referenceRig = (dir) => {
  const file = path.join(dir, 'rigs', `${plan.reference}.json`);
  if (!succeeded(file)) throw new Error(`Rig the reference model (${plan.reference}) first.`);
  return read(file).id;
};

/** Apply library actions or a motion to the reference rig; returns the finished animation task. */
async function animate(dir, body, glb) {
  const created = await meshy('POST', '/openapi/v1/animations', { rig_task_id: referenceRig(dir), ...body });
  const task = await settled(`/openapi/v1/animations/${created.result}`);
  if (task.status === 'SUCCEEDED') await download(task.result.animation_glb_url, glb);
  return task;
}

const commands = {
  async rig(dir, only) {
    const wanted = only ? only.split(',') : null;
    for (const entry of manifest.assets.filter((asset) => !wanted || wanted.includes(asset.id))) {
      const record = path.join(dir, 'rigs', `${entry.id}.json`);
      if (succeeded(record)) continue;
      const created = await meshy('POST', '/openapi/v1/rigging', { model_url: MODELS + entry.file, height_meters: Math.round(entry.height * 100) / 100 });
      const task = await settled(`/openapi/v1/rigging/${created.result}`);
      write(record, task);
      if (task.status === 'SUCCEEDED') await download(task.result.rigged_character_glb_url, path.join(dir, 'rigs', `${entry.id}.glb`));
      report(entry.id, task);
    }
  },
  async library(dir) {
    const actions = path.join(dir, 'library', 'actions.json');
    if (!fs.existsSync(actions)) write(actions, await meshy('GET', '/openapi/v1/animations/library'));
    const ids = Object.values(plan.library);
    for (let start = 0, batch = 1; start < ids.length; start += 10, batch++) {
      const record = path.join(dir, 'library', `batch-${batch}.json`);
      const request = { action_ids: ids.slice(start, start + 10) };
      if (succeeded(record, (r) => r.task) && JSON.stringify(read(record).request) === JSON.stringify(request)) continue;
      const task = await animate(dir, request, path.join(dir, 'library', `batch-${batch}.glb`));
      write(record, { request, task });
      report(`batch ${batch}`, task);
    }
  },
  async motion(dir, name) {
    const wanted = plan.motions[name];
    if (!wanted) throw new Error(`motion-plan.json has no motion ${name}.`);
    const record = path.join(dir, 'motion', `${name}.json`);
    if (succeeded(record, (r) => r.animation)) return;
    const created = await meshy('POST', '/openapi/v1/text-to-motion', { prompt: wanted.prompt, mode: 'prime', duration: wanted.seconds });
    const motion = await settled(`/openapi/v1/text-to-motion/${created.result}`);
    report(`${name} motion`, motion);
    if (motion.status !== 'SUCCEEDED') return write(record, { ...wanted, motion });
    const animation = await animate(dir, { motion_task_id: motion.id }, path.join(dir, 'motion', `${name}.glb`));
    write(record, { ...wanted, motion, animation });
    report(`${name} animation`, animation);
  },
  async sources(dir) {
    const listing = read(path.join(dir, 'library', 'actions.json'));
    const actions = Array.isArray(listing) ? listing : listing.result ?? listing.data ?? [];
    const nameOf = new Map(Object.entries(plan.library).map(([name, id]) => [id, name]));
    const sources = [];
    for (let batch = 1; fs.existsSync(path.join(dir, 'library', `batch-${batch}.json`)); batch++) {
      const { request, task } = read(path.join(dir, 'library', `batch-${batch}.json`));
      const clips = {}, meta = {};
      for (const id of request.action_ids) {
        const action = actions.find((candidate) => candidate.action_id === id);
        if (!action) throw new Error(`Meshy's library listing has no action ${id}.`);
        clips[action.key] = nameOf.get(id);
        meta[action.key] = { source: 'meshy-animation-library', actionId: id, key: action.key, title: action.name, task: task.id, created: day(task.created_at) };
      }
      sources.push({ file: path.resolve(dir, 'library', `batch-${batch}.glb`), clips, meta });
    }
    for (const name of Object.keys(plan.motions)) {
      const { prompt, seconds, motion, animation } = read(path.join(dir, 'motion', `${name}.json`));
      // A text-to-motion result holds its one clip under this name.
      sources.push({ file: path.resolve(dir, 'motion', `${name}.glb`), clips: { retarget_clip: name },
        meta: { retarget_clip: { source: 'meshy-text-to-motion', mode: 'prime', prompt, seconds, motionTask: motion.id, task: animation.id, created: day(animation.created_at) } } });
    }
    write(path.join(dir, 'sources.json'), { rig: { model: plan.reference, rigTask: referenceRig(dir) }, sources });
    console.log(`${path.join(dir, 'sources.json')}: ${sources.reduce((n, source) => n + Object.keys(source.clips).length, 0)} clips`);
  },
};

const [command, dir, arg] = process.argv.slice(2);
if (!commands[command] || !dir) {
  console.error('usage: node tools/meshy-rig/meshy.mjs rig|library|motion|sources <dir> [ids|name]');
  process.exitCode = 2;
} else await commands[command](path.resolve(dir), arg);
