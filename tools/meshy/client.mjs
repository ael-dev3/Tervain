/**
 * The small Meshy API client the Meshy tools share. The key is read from MESHY_API_KEY and is never written or printed;
 * every request that creates a task spends Meshy credits.
 */
import fs from 'node:fs';
import path from 'node:path';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`); };
/** Whether a saved task record (or the task `pick` finds in it) succeeded. */
export const succeeded = (file, pick = (record) => record) => fs.existsSync(file) && pick(read(file))?.status === 'SUCCEEDED';
export const day = (ms) => new Date(ms).toISOString().slice(0, 10);

export async function meshy(method, route, body) {
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
export async function settled(route) {
  for (let i = 0; i < 360; i++) {
    const task = await meshy('GET', route);
    if (['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status)) return task;
    await sleep(5000);
  }
  throw new Error(`${route}: still running after half an hour`);
}

export async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download: ${response.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
}

export function report(label, task) {
  console.log(`${label}: ${task.status}${task.task_error?.message ? ` (${task.task_error.message})` : ''}`);
  if (task.status !== 'SUCCEEDED') process.exitCode = 1;
}
