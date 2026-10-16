import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {rootAuditVerdict,rootBaselineLabels} from '../../tools/root-audit-verdict.mjs';
const current=fs.readFileSync('tools/visual-gate.mjs','utf8');
const legacy=execFileSync('git',['show','421d34b:tools/visual-gate.mjs'],{encoding:'utf8'});
const oldVerdict=new Function(execFileSync('git',['show','421d34b:tools/root-audit-verdict.mjs'],{encoding:'utf8'}).replaceAll('export ','')+';return rootAuditVerdict;')();
const audit=(labels:string[])=>({complete:true,furnitureReady:true,expectedRoots:labels.length,summary:{roots:labels.length},checks:labels.map(label=>({kind:'root',label,candidate:true,position:[0,0,0],minGap:2,maxGap:2}))});
function run(source:string,input:ReturnType<typeof audit>,baseline?:unknown,verdict:typeof rootAuditVerdict=rootAuditVerdict){
 const start=source.indexOf('const worst = (kind)'),end=source.indexOf('Object.assign(metrics.checks.placement, verdict);',start);
 if(start<0||end<0)throw Error('Root gate block missing');
 return new Function('audit','baseline','metrics','rootAuditVerdict','rootBaselineLabels',source.slice(start,end)+'Object.assign(metrics.checks.placement, verdict);return metrics.checks.placement;')(input,baseline,{checks:{}},verdict,rootBaselineLabels);
}
it('rejects the same-count exchanged root through the actual visual-gate block',()=>{
 const baseline={checks:{placement:{rootCandidates:1,rootCandidateLabels:['tree:a']}}},input=audit(['tree:b']);
 expect(run(legacy,input,baseline,oldVerdict).pass).toBe(true);
 expect(run(current,input,baseline).pass).toBe(false);
 expect(run(current,input,baseline).reason).toBe('new-root-candidate');
});
it('retains every candidate label even when the displayed worst roots are truncated',()=>{
 const input=audit(Array.from({length:10},(_,i)=>'tree:'+i)),metrics=run(current,input);
 expect(metrics.roots).toHaveLength(8);
 expect(metrics.rootCandidateLabels).toEqual(input.checks.map(c=>c.label));
});
it('accepts legacy zero-candidate baselines without making up positive candidate identities',()=>{
 const clear={...audit(['tree:a']),checks:[{...audit(['tree:a']).checks[0]!,candidate:false}]};
 expect(run(current,clear,{checks:{placement:{rootCandidates:0}}}).pass).toBe(true);
 expect(rootBaselineLabels({rootCandidates:0})).toEqual([]);
});
it('requires a fresh labelled baseline when a positive or missing reference has no identities',()=>{
 const input=audit(['tree:a']);
 expect(run(current,input,{checks:{placement:{rootCandidates:1}}}).reason).toBe('invalid-baseline');
 expect(run(current,input,{}).reason).toBe('invalid-baseline');
 expect(run(current,input).pass).toBe(true);
});
