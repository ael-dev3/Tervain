#!/usr/bin/env node
/**
 * Meshy multi-image-to-3D from the wanderer's reference views (tools/hero/views.mjs). `create` spends 35 credits (30, and
 * 5 for 2k geometry); `get` only reads. The key comes from MESHY_API_KEY and is never written or printed.
 *   node tools/hero/mi3d.mjs create [views-dir] [out-dir]
 *   node tools/hero/mi3d.mjs get <task-id> [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { download, meshy, report, settled } from '../meshy/client.mjs';

const [command, arg, outArg] = process.argv.slice(2);
const route = '/openapi/v1/multi-image-to-3d';
const out = outArg ?? 'shots/hero-meshy';
let id = arg;
if (command === 'create') {
  const views = arg ?? 'shots/hero-views';
  const uri = (name) => `data:image/png;base64,${fs.readFileSync(path.join(views, `${name}.png`)).toString('base64')}`;
  id = (await meshy('POST', route, {
    image_urls: [uri('front'), uri('side'), uri('back')],
    ai_model: 'meshy-7.1', geometry_resolution: '2k', should_texture: true, enable_pbr: true, texture_resolution: '4k',
    pose_mode: 'a-pose', image_enhancement: false, remove_lighting: true, should_remesh: false,
    target_formats: ['glb'], multi_view_thumbnails: true,
  })).result;
  console.log('task', id);
} else if (command !== 'get' || !id) {
  console.error('usage: mi3d.mjs create [views-dir] [out-dir] | mi3d.mjs get <task-id> [out-dir]');
  process.exit(2);
}
const task = await settled(`${route}/${id}`);
report(`multi-image ${id}`, task);
console.log(`credits consumed: ${task.consumed_credits ?? 'not reported'}`);
if (task.status === 'SUCCEEDED') {
  const tag = `hero-${task.id.slice(0, 8)}`;
  if (task.model_urls?.glb) await download(task.model_urls.glb, path.join(out, `${tag}.glb`));
  for (const [name, url] of Object.entries(task.thumbnail_urls ?? {})) await download(url, path.join(out, `${tag}-${name}.png`));
  if (task.thumbnail_url) await download(task.thumbnail_url, path.join(out, `${tag}.png`));
}
