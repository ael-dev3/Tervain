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

it('rejects duplicate root records even when totals match expected population',()=>{
 const duplicate={...good,checks:[good.checks[0]!,{...good.checks[0]!}]};
 expect(rootAuditVerdict(duplicate,1).pass).toBe(false);
 expect(rootAuditVerdict(duplicate).reason).toBe('incomplete-root-coverage');
});
it('requires nonempty root labels rather than accepting anonymous coverage',()=>{
 for(const label of [undefined,'','  ']){
  const bad={...good,checks:[{...good.checks[0]!,label},good.checks[1]!]};
  expect(rootAuditVerdict(bad,1).pass).toBe(false);
 }
});
it('accepts reordered unique roots and ignores prop labels for root coverage',()=>{
 const reordered={...good,checks:[good.checks[1]!,{kind:'prop',label:'tree:a',candidate:true},good.checks[0]!]};
 expect(rootAuditVerdict(reordered,1).pass).toBe(true);
 expect(rootAuditVerdict(reordered,0).pass).toBe(false);
});
