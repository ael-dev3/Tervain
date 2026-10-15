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

it.each(['open', 'unsupported', 'query', 'timeout', 'invalid'])('removes a stale PASS receipt when %s fails', failure => {
  const dir = mkdtempSync(join(tmpdir(), 'placement-stale-cli-'));
  try {
    writeFileSync(join(dir, 'audit-placement.mjs'), readFileSync('tools/audit-placement.mjs'));
    const out = join(dir, 'report.json');
    writeFileSync(out, JSON.stringify({complete:true,summary:{candidates:0}}));
    const ready = '{loaded:true,supported:true,ready:true}';
    const state = failure === 'unsupported' ? '{loaded:true,supported:false,ready:false}' : failure === 'timeout' ? '{loaded:true,supported:true,ready:false}' : ready;
    writeFileSync(join(dir, 'cdp.mjs'), `export async function openPage(){${failure==='open'?'throw Error("controlled open failure");':''}return {eval:async s=>{if(s.includes('auditPlacement('))throw Error('controlled query failure');return ${state}},wait:async()=>new Promise(r=>setTimeout(r,2)),close(){}}}`);
    const args = ['--out',out,...(failure==='timeout'?['--timeout','1']:failure==='invalid'?['--clearance','-1']:[])];
    const run = spawnSync(process.execPath, [join(dir,'audit-placement.mjs'),...args], {encoding:'utf8',timeout:10000});
    expect(run.error).toBeUndefined();expect(run.status).toBe(1);
    expect(existsSync(out)).toBe(false);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
