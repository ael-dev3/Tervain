import {spawnSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {rootAuditVerdict} from '../../tools/root-audit-verdict.mjs';
const good={complete:true,expectedRoots:2,furnitureReady:true,summary:{roots:2},checks:[{kind:'root',label:'tree:a',candidate:false},{kind:'root',label:'tree:b',candidate:true}]};
it('fails truncated or missing populations even with fewer candidates',()=>{
 expect(rootAuditVerdict({...good,complete:false},13).pass).toBe(false);
 expect(rootAuditVerdict({...good,checks:good.checks.slice(0,1)},13).pass).toBe(false);
 expect(rootAuditVerdict({...good,expectedRoots:undefined},13).pass).toBe(false);
 expect(rootAuditVerdict(null,13).pass).toBe(false);
});
it('requires loaded populations and consistent report counts',()=>{
 expect(rootAuditVerdict({...good,furnitureReady:false},13).pass).toBe(false);
 expect(rootAuditVerdict({...good,summary:{roots:0}},13).pass).toBe(false);
});
it('preserves complete population comparisons and rejects invalid references',()=>{
 expect(rootAuditVerdict(good,1).pass).toBe(true);
 expect(rootAuditVerdict(good,0).pass).toBe(false);
 expect(rootAuditVerdict(good,NaN).pass).toBe(false);
 expect(rootAuditVerdict(good).pass).toBe(true);
});

it('parses the actual gate CLI entry point',()=>{const check=spawnSync(process.execPath,['--check','tools/visual-gate.mjs'],{encoding:'utf8'});expect(check.status,check.stderr).toBe(0);});

it('rejects a newly affected root even when the aggregate count stays equal or falls',()=>{
 expect(rootAuditVerdict(good,1,['tree:a']).pass).toBe(false);
 expect(rootAuditVerdict(good,2,['tree:a','tree:c']).pass).toBe(false);
});
it('accepts the same candidate roots and genuine per-root improvements',()=>{
 expect(rootAuditVerdict(good,1,['tree:b']).pass).toBe(true);
 expect(rootAuditVerdict(good,2,['tree:b','tree:c']).pass).toBe(true);
 const clear={...good,checks:good.checks.map(c=>({...c,candidate:false}))};
 expect(rootAuditVerdict(clear,1,['tree:b']).pass).toBe(true);
 expect(rootAuditVerdict(clear,0,[]).pass).toBe(true);
});
it('rejects incomplete or inconsistent candidate-label baselines',()=>{
 for(const labels of [null,[],['tree:b','tree:b'],[''],[null]])
  expect(rootAuditVerdict(good,1,labels).pass).toBe(false);
 expect(rootAuditVerdict(good,undefined,['tree:b']).pass).toBe(false);
});
