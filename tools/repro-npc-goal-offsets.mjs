#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36';const code=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/actors.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-actors',resolveId(id){if(id==='/@baseline-actors')return '\0baseline-actors';},load(id){if(id==='\0baseline-actors')return code;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try {
const {npcGoalPosition}=await server.ssrLoadModule('/src/presentation/actors.ts'),{npcGoalPosition:old}=await server.ssrLoadModule('/@baseline-actors'),{NPCS}=await server.ssrLoadModule('/src/content/npcs.ts'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');
const ctx={terrain:{groundAt:()=>0,walkable:()=>true},colliders:new Colliders()},inputs=[];for(let i=0;i<1000;i++)inputs.push([i%2?NPCS.estate_steward:NPCS.rillford_reeve,{anchor:i%2?'quarry_office':'village_square',activity:'stand'},1.6+(i%3)*.1]);
const run=fn=>{const sort=Array.prototype.sort,flatMap=Array.prototype.flatMap,values=Object.values;let sorts=0,rosters=0,offsetBatches=0;Array.prototype.flatMap=function(...args){offsetBatches++;return flatMap.apply(this,args);};Array.prototype.sort=function(...args){sorts++;return sort.apply(this,args);};Object.values=function(value){if(value===NPCS)rosters++;return values(value);};try{return{results:inputs.map(([def,goal,height])=>fn(def,goal,ctx,height)),sorts,rosters,offsetBatches};}finally{Array.prototype.sort=sort;Array.prototype.flatMap=flatMap;Object.values=values;}};
const before=run(old),after=run(npcGoalPosition),positionsIdentical=JSON.stringify(before.results)===JSON.stringify(after.results);
const first=npcGoalPosition(NPCS.rillford_reeve,inputs[0][1],ctx,1.8);ctx.colliders.circle('new-obstruction',first.x,first.z,.8);const expected=old(NPCS.rillford_reeve,inputs[0][1],ctx,1.8),actual=npcGoalPosition(NPCS.rillford_reeve,inputs[0][1],ctx,1.8);
const liveCollidersRespected=JSON.stringify(expected)===JSON.stringify(actual)&&Math.hypot(actual.x-first.x,actual.z-first.z)>.01;
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/actors.ts')).digest('hex'),scope:'Actual resident shared-goal placement function and authored rosters, flat terrain and live collider control. Numerical outputs and metadata work counts; not hardware timing or full-world play.',queries:inputs.length,beforeSorts:before.sorts,afterSorts:after.sorts,beforeRosterScans:before.rosters,afterRosterScans:after.rosters,beforeOffsetBatches:before.offsetBatches,afterOffsetBatches:after.offsetBatches,positionsIdentical,liveCollidersRespected,pass:positionsIdentical&&liveCollidersRespected&&after.offsetBatches<before.offsetBatches};
const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
