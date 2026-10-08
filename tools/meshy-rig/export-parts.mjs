#!/usr/bin/env node
/**
 * Exports each resident model's skin as the game repairs it (eleven joints, A55 and A63) from the resident lab: the
 * body-part map extract-rig.mjs keeps Meshy's weights within. Needs `npm run dev` and Chrome or Edge (tools/cdp.mjs).
 *
 *   node tools/meshy-rig/export-parts.mjs <dir> [id,...]    writes <dir>/parts/<id>.json
 *
 * The lab URL is $TERVAIN_URL/tools/npc-lab.html (default http://127.0.0.1:5173).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [dir, only] = process.argv.slice(2);
if (!dir) throw new Error('usage: node tools/meshy-rig/export-parts.mjs <dir> [id,...]');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/models/npcs/manifest.json'), 'utf8'));
// The first role each model plays.
const roleOf = new Map();
for (const [role, id] of Object.entries(manifest.roles)) if (!roleOf.has(id)) roleOf.set(id, role);
const base = (process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, '');
fs.mkdirSync(path.join(dir, 'parts'), { recursive: true });
const page = await openPage(`${base}/tools/npc-lab.html`, { w: 400, h: 400 });
try {
  for (let i = 0; i < 240; i++) { try { if (await page.eval('return !!window.lab')) break; } catch { /* still loading */ } await page.wait(250); }
  for (const asset of manifest.assets.filter((entry) => !only || only.split(',').includes(entry.id))) {
    // The procedural poser's skin, before any rig of its own replaces it.
    await page.eval(`return window.lab.load(${JSON.stringify(roleOf.get(asset.id))}, { authoredMotion: false }).then(() => true)`);
    const parts = await page.eval('return window.lab.parts()');
    fs.writeFileSync(path.join(dir, 'parts', `${asset.id}.json`), JSON.stringify(parts));
    console.log(`${asset.id}: ${parts.vertices} vertices, ${parts.names.length} joints`);
  }
} finally { page.close(); }
