#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36',baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/app.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',define:{__GAME_VERSION__:JSON.stringify(JSON.parse(fs.readFileSync('package.json','utf8')).version)},plugins:[{name:'baseline-app',resolveId(id){if(id==='/@baseline-app')return '\0baseline-app';},load(id){if(id==='\0baseline-app')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try {
 const {App}=await server.ssrLoadModule('/src/app.ts'),{App:OldApp}=await server.ssrLoadModule('/@baseline-app');
 const make=Class=>Object.assign(Object.create(Class.prototype),{residentContactRecords:new WeakMap(),enemyContactRecords:new WeakMap(),game:{state:{npcs:{}}}}),a=make(OldApp),b=make(App),before=new Set(),after=new Set();
 const residents=Array.from({length:20},(_,i)=>({id:`resident_${i}`,x:i,y:0,z:i,solid:true,rig:{height:1.8}})),enemies=Array.from({length:12},(_,i)=>({id:`enemy_${i}`,x:i,y:0,z:i,alive:true,radius:.35,rig:{height:1.8}}));
 let mismatches=0;
 for(let step=0;step<600;step++)for(let pass=0;pass<3;pass++){
  for(const n of residents){n.x=step*.01+pass*.1;n.y=step%5;n.z=-pass;n.solid=(step+pass)%7!==0;n.rig.height=step%2?1.6:1.9;a.game.state.npcs[n.id]=b.game.state.npcs[n.id]={available:step%9!==0};const old=a.residentContact(n),now=b.residentContact(n);before.add(old);after.add(now);mismatches+=Number(JSON.stringify(old)!==JSON.stringify(now));}
  for(const e of enemies){e.x=step*.02;e.y=step%3;e.z=pass;e.alive=step%8!==0;e.radius=step%2?.32:.4;e.rig.height=step%2?1.7:2;const old=a.enemyContact(e),now=b.enemyContact(e);before.add(old);after.add(now);mismatches+=Number(JSON.stringify(old)!==JSON.stringify(now));}
 }
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/app.ts')).digest('hex'),scope:'Actual App contact producers, without constructing renderer/UI. Controlled actor samples updated three times per simulated frame; counts returned records only, not total allocations or frame timing.',steps:600,residents:20,enemies:12,beforeRecords:before.size,afterRecords:after.size,mismatches,pass:mismatches===0&&before.size===57600&&after.size===32};const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
