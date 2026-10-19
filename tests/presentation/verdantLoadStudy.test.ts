import fs from 'node:fs';
import {it,vi,expect} from 'vitest';
import * as C from '../../src/presentation/canopy';
import {createMeshyForest} from '../../src/presentation/meshyTrees';
import {meshyTreeTemplates} from './meshyTreeFixture';
// Measurement-only fixture on the proof branch; not a frame-time or throughput gate.
it('records construction-only repair cost',async()=>{
 const templates=await meshyTreeTemplates(['verdant-sentinel']),real=C.reconnectGrownTwigRoots,rows:{run:number,mode:string,totalMs:number,repairMs:number,calls:number}[]=[];
 let enabled=false,cost=0,calls=0;
 const spy=vi.spyOn(C,'reconnectGrownTwigRoots').mockImplementation((g,p,t,max)=>{if(!enabled)return g;const start=performance.now();const result=real(g,p,t,max);cost+=performance.now()-start;calls++;return result;});
 try{for(let run=0;run<4;run++)for(const mode of run%2?['after','before']:['before','after']){
  enabled=mode==='after';cost=0;calls=0;const forest=createMeshyForest(templates),start=performance.now();forest.variant('oak',0,'verdant-sentinel');rows.push({run,mode,totalMs:performance.now()-start,repairMs:cost,calls});forest.dispose();
 }}finally{spy.mockRestore();}
 fs.writeFileSync(process.env.VERDANT_COST_OUT??'verdant-construction-cost.json',JSON.stringify({rows,scope:'Node source-template factory construction only; not a browser frame-time or hardware GPU benchmark. Alternating order; first pair cold.'},null,2));expect(rows).toHaveLength(8);
},180000);
