#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36',baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/actors.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-actors',resolveId(id){if(id==='/@baseline-actors')return '\0baseline-actors';},load(id){if(id==='\0baseline-actors')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try {
 const {NpcActor}=await server.ssrLoadModule('/src/presentation/actors.ts'),{NpcActor:OldNpcActor}=await server.ssrLoadModule('/@baseline-actors'),{NPCS}=await server.ssrLoadModule('/src/content/npcs.ts'),{createInitialState}=await server.ssrLoadModule('/src/game/state.ts'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');
 const makeContext=()=>({terrain:{groundAt:()=>0,heightAt:()=>0,walkable:()=>true},colliders:new Colliders(),nav:{findPath:(_from,to)=>[{...to}]},state:createInitialState(),hour:23,player:{x:1000,y:0,z:1000},reducedMotion:false,onBark:()=>false});
 const a=new OldNpcActor(NPCS.trail_hunter),b=new NpcActor(NPCS.trail_hunter),ac=makeContext(),bc=makeContext();a.snapToGoal(ac);b.snapToGoal(bc);
 const listBefore=new Set(),listAfter=new Set(),playersBefore=new Set(),playersAfter=new Set();let unequalContacts=0,unequalPoses=0;
 const pose=actor=>{const transforms=[];actor.rig.root.traverse(o=>transforms.push([...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray(),o.visible]));return JSON.stringify({x:actor.x,y:actor.y,z:actor.z,yaw:actor.yaw,mode:actor.mode,transforms});};
 for(let i=0;i<720;i++){
  for(const[actor,ctx]of [[a,ac],[b,bc]]){ctx.hour=i<360?7:23;ctx.player={x:actor.x+(i%90<40?.6:5),z:actor.z+.1,y:i%120<60?0:3};ctx.wildlifeContacts=[{id:'animal',kind:'circle',x:actor.x-1,z:actor.z,r:.4,active:i%60<30,minY:0,maxY:1.5}];ctx.residentContacts=[{id:'person:trail_hunter',kind:'circle',x:actor.x,z:actor.z,r:.4,active:true},{id:'person:other',kind:'circle',x:actor.x+1,z:actor.z,r:.4,active:i%45<20,minY:0,maxY:2}];}
  const old=a.contacts(ac),now=b.contacts(bc);listBefore.add(old);listAfter.add(now);playersBefore.add(old.find(c=>c.id==='player'));playersAfter.add(now.find(c=>c.id==='player'));unequalContacts+=Number(JSON.stringify(old)!==JSON.stringify(now));
  a.update(1/60,ac);b.update(1/60,bc);unequalPoses+=Number(pose(a)!==pose(b));
 }
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/actors.ts')).digest('hex'),scope:'Actual resident updates and rig poses with controlled terrain/navigation, moving player heights and changing wildlife/resident activation. Counts distinct returned contact lists/player records only, not total allocations or frame timing.',steps:720,before:{contactLists:listBefore.size,playerRecords:playersBefore.size},after:{contactLists:listAfter.size,playerRecords:playersAfter.size},unequalContacts,unequalPoses,pass:unequalContacts===0&&unequalPoses===0&&listAfter.size===1&&playersAfter.size===1&&listBefore.size===720&&playersBefore.size===720};
 const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
