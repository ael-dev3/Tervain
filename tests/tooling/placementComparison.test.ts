import {expect,it} from 'vitest';
import {summarizePlacementComparison} from '../../tools/placement-comparison.mjs';
function report(kind='prop',candidate=false){return{kind,complete:true,truncated:false,invalid:0,skipped:[],clearance:.08,maxVertices:100000,furnitureReady:true,summary:{checks:1,props:kind==='prop'?1:0,roots:kind==='root'?1:0,candidates:Number(candidate)},checks:[{label:'fixture',component:0,kind,position:[-2,1,37],samples:kind==='root'?16:4,minGap:candidate?.1:0,maxGap:.2,candidate}]};}
const roots=()=>({expectedRoots:1,before:report('root'),after:report('root')});
it('compares retained candidates and root/route denominators without treating candidates as quality failures',()=>{
 const result=summarizePlacementComparison(report(),report('prop',true),roots());
 expect(result.changes.candidateChanges).toHaveLength(1);expect(result.changes.removed).toHaveLength(0);
 expect(result.regions[0]).toMatchObject({before:{checks:1,candidates:0},after:{checks:1,candidates:1}});
 expect(result.rootSummary).toMatchObject({expectedRoots:1,before:{rootsWithProbeGapOverClearance:1}});
});
it('rejects incomplete, unready, inconsistent or duplicate records rather than producing a complete comparison',()=>{
 for(const bad of [{...report(),complete:false},{...report(),furnitureReady:false},{...report(),checks:[]},{...report(),checks:[...report().checks,...report().checks],summary:{checks:2,props:2,roots:0,candidates:0}}])expect(()=>summarizePlacementComparison(bad,report(),roots())).toThrow();
 expect(()=>summarizePlacementComparison(report(),report(),{...roots(),expectedRoots:2})).toThrow(/Root population/);
});
