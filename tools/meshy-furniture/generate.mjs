#!/usr/bin/env node
/**
 * Asks Meshy's text to 3D for the interior furniture in plan.json (A66) and downloads each piece into a working folder
 * outside the repository, where prepare.mjs turns it into the file the game ships. Each piece is a preview (the shape,
 * remeshed to the plan's triangle target) and a refine (its PBR textures). Every task spends Meshy credits; Meshy keeps
 * results for three days; the key is read from MESHY_API_KEY and never written or printed.
 *
 *   node tools/meshy-furniture/generate.mjs <dir> [id,...]    writes <dir>/<id>/{preview,refine}.json, <id>.glb, thumbnail.png
 *
 * Pieces already finished in <dir> are not asked for again; three are made at a time. Generation differs on every run:
 * the takes the game ships are recorded in public/models/furniture/manifest.json.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { download, meshy, read, report, settled, succeeded, write } from '../meshy/client.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const plan = read(path.join(HERE, 'plan.json'));
const [dir, only] = process.argv.slice(2);
if (!dir) throw new Error('usage: node tools/meshy-furniture/generate.mjs <dir> [id,...]');

async function piece(id) {
  const spec = plan.pieces[id], folder = path.resolve(dir, id);
  const previewFile = path.join(folder, 'preview.json'), refineFile = path.join(folder, 'refine.json');
  if (!succeeded(previewFile)) {
    const created = await meshy('POST', '/openapi/v2/text-to-3d', {
      mode: 'preview', prompt: `${spec.prompt} ${plan.style}`, ai_model: plan.model,
      should_remesh: true, topology: 'triangle', target_polycount: spec.polycount, target_formats: ['glb'],
    });
    const task = await settled(`/openapi/v2/text-to-3d/${created.result}`);
    write(previewFile, task);
    report(`${id} shape`, task);
    if (task.status !== 'SUCCEEDED') return;
  }
  if (!succeeded(refineFile)) {
    const created = await meshy('POST', '/openapi/v2/text-to-3d', {
      mode: 'refine', preview_task_id: read(previewFile).id, enable_pbr: true, texture_resolution: '2k', target_formats: ['glb'],
    });
    const task = await settled(`/openapi/v2/text-to-3d/${created.result}`);
    write(refineFile, task);
    report(`${id} textures`, task);
    if (task.status !== 'SUCCEEDED') return;
  }
  const refined = read(refineFile);
  await download(refined.model_urls.glb, path.join(folder, `${id}.glb`));
  if (refined.thumbnail_url) await download(refined.thumbnail_url, path.join(folder, 'thumbnail.png'));
}

const queue = Object.keys(plan.pieces).filter((id) => !only || only.split(',').includes(id));
await Promise.all([0, 1, 2].map(async () => {
  while (queue.length) {
    const id = queue.shift();
    await piece(id).catch((error) => { console.log(`${id}: ${error.message.slice(0, 300)}`); process.exitCode = 1; });
  }
}));
