import {expect,it} from 'vitest';
import {rootAuditVerdict} from '../../tools/root-audit-verdict.mjs';
const good={complete:true,expectedRoots:2,furnitureReady:true,summary:{roots:2},checks:[{kind:'root',candidate:false},{kind:'root',candidate:true}]};
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
