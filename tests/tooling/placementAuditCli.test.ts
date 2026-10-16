import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('saves the served audit receipt and fails incomplete or unsupported builds without inventing a report', () => {
  const dir = mkdtempSync(join(tmpdir(), 'placement-audit-cli-'));
  try {
    writeFileSync(join(dir, 'audit-placement.mjs'), readFileSync('tools/audit-placement.mjs'));
    for (const complete of [true, false]) {
      const out = join(dir, 'report.json');
      const receipt = { revision: 'abcdef0', complete, summary: { roots: 2, props: 3, candidates: 1 } };
      writeFileSync(join(dir, 'cdp.mjs'), `export async function openPage(){return {eval: async s => s.includes('auditPlacement(') ? ${JSON.stringify(receipt)} : {loaded:true,supported:true,ready:true},close(){}}}`);
      const run = spawnSync(process.execPath, [join(dir, 'audit-placement.mjs'), '--out', out], { encoding: 'utf8', timeout: 10000 });
      expect(run.error).toBeUndefined(); expect(run.status).toBe(complete ? 0 : 2);
      expect(JSON.parse(readFileSync(out, 'utf8'))).toEqual(receipt);
      rmSync(out);
    }
    writeFileSync(join(dir, 'cdp.mjs'), 'export async function openPage(){return {eval:async()=>({loaded:true,supported:false,ready:false}),close(){}}}');
    const out = join(dir, 'missing.json');
    const unsupported = spawnSync(process.execPath, [join(dir, 'audit-placement.mjs'), '--out', out], { encoding: 'utf8', timeout: 10000 });
    expect(unsupported.status).toBe(1); expect(existsSync(out)).toBe(false);
    expect(unsupported.stderr).toContain('has no placement audit');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('forwards the selected LOD and rejects invalid levels before opening a browser', () => {
  const dir = mkdtempSync(join(tmpdir(), 'placement-lod-cli-'));
  try {
    writeFileSync(join(dir, 'audit-placement.mjs'), readFileSync('tools/audit-placement.mjs'));
    writeFileSync(join(dir, 'cdp.mjs'), `export async function openPage(){return {eval:async s=>{if(!s.includes('auditPlacement('))return {loaded:true,supported:true,ready:true};if(!s.includes('"lod":2'))throw Error('LOD not forwarded');return {complete:true,summary:{roots:2,props:0,candidates:0},lod:2};},close(){}}}`);
    const out = join(dir, 'report.json');
    const run = spawnSync(process.execPath, [join(dir, 'audit-placement.mjs'), '--kind', 'root', '--lod', '2', '--out', out], { encoding: 'utf8', timeout: 10000 });
    expect(run.status).toBe(0); expect(JSON.parse(readFileSync(out, 'utf8')).lod).toBe(2);
    rmSync(out);
    writeFileSync(join(dir, 'cdp.mjs'), `export async function openPage(){return {eval:async s=>s.includes('auditPlacement(')?{complete:true,summary:{roots:2,props:0,candidates:0}}:{loaded:true,supported:true,ready:true},close(){}}}`);
    const oldBuild = spawnSync(process.execPath, [join(dir, 'audit-placement.mjs'), '--lod', '2', '--out', out], { encoding: 'utf8', timeout: 10000 });
    expect(oldBuild.status).toBe(1); expect(oldBuild.stderr).toContain('does not confirm requested placement LOD'); expect(existsSync(out)).toBe(false);
    writeFileSync(join(dir, 'cdp.mjs'), `export async function openPage(){throw Error('Browser must not open');}`);
    for (const lod of ['-1', '.5', '3', 'NaN']) {
      const bad = spawnSync(process.execPath, [join(dir, 'audit-placement.mjs'), '--lod', lod, '--out', out], { encoding: 'utf8', timeout: 10000 });
      expect(bad.status).toBe(1); expect(bad.stderr).toContain('Invalid placement LOD'); expect(existsSync(out)).toBe(false);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
