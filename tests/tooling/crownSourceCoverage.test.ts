import {expect,it} from 'vitest';
import {canopySourceTargets,crownCoverageComplete} from '../../tools/crown-source-coverage.mjs';
const roots=[{label:'pine',wood:{near:true},leaves:{near:true},species:'pine',matrix:{identity:true}}];
const leaf={name:'pine:2:foliage',geometry:{farLeaf:true},material:{}};
it('retains leaf-only and wholly missing source levels in the registered population',()=>{
 for(const family of [[leaf],[]]){
  const result=canopySourceTargets(roots,[{...roots[0]!,lod:2}],new Map([['pine',family]]),2,()=>null);
  expect(result.targets).toHaveLength(1);
  expect(result.targets[0]).toMatchObject({label:'pine',lod:2,wood:null,leaves:family.length?leaf.geometry:null,species:'pine'});
  expect(result.missing).toEqual([{label:'pine',lod:2,leavesPresent:!!family.length}]);
 }
});
it('uses the actual selected geometry and matching native metadata without substituting the near model',()=>{
 const wood={name:'pine:2:wood',geometry:{farWood:true}},native=[{...roots[0]!,lod:2,species:'fir'}];
 const result=canopySourceTargets(roots,native,new Map([['pine',[wood,leaf]]]),2,()=>({mask:true}));
 expect(result.missing).toEqual([]);expect(result.targets[0]).toMatchObject({wood:wood.geometry,leaves:leaf.geometry,species:'fir',cutout:{mask:true}});
 const legacy=canopySourceTargets(roots,[{...roots[0]!,lod:0}],new Map([['pine',[wood,leaf]]]),2,()=>null);
 expect(legacy.targets[0]).toMatchObject({wood:wood.geometry,species:'pine',lod:2});
});
function complete(){return{expectedTrees:1,missing:[] as {label:string;lod:number;leavesPresent:boolean}[],transitionSamples:14,levels:[0,1,2].map(lod=>({lod,complete:true,expectedTrees:1,coveredTrees:1,summary:{trees:1}}))};}
it('rejects a dropped population even when the remaining audit and transition loop claim completion',()=>{
 const good=complete();expect(crownCoverageComplete(good)).toBe(true);
 for(const missing of [[],[{label:'pine',lod:2,leavesPresent:true}]]){
  const report=complete();report.missing=missing;report.levels[2]!.coveredTrees=0;report.levels[2]!.summary.trees=0;
  expect(crownCoverageComplete(report)).toBe(false);
 }
 const empty=complete();empty.expectedTrees=0;expect(crownCoverageComplete(empty)).toBe(false);
});
