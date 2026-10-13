import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36';
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/world/physics.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/world',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline',resolveId(id){if(id==='/@baseline')return '\0baseline';},load(id){if(id==='\0baseline')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
const worlds=[];
try{
 const {RealmPhysics,initializePhysics}=await server.ssrLoadModule('/src/world/physics.ts'),{RealmPhysics:Old}=await server.ssrLoadModule('/@baseline'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');await initializePhysics();
 const floor={nx:10,nz:10,vertexX:i=>i*2-10,vertexZ:i=>i*2-10,vertexHeight:()=>0,heightAt:()=>0,groundAt:()=>0};
 const spec={id:'crate',kind:'crate',name:'Crate',x:0,z:0,width:.8,height:.6,depth:.6,yaw:0,mass:12};
 const people=Array.from({length:32},(_,i)=>({id:`person:${i}`,x:(i%8)*.9-3,y:0,z:Math.floor(i/8)*1.3-2,radius:.25,height:1.8,active:true}));
 const counts=[0,0],teleports=[0,0];
 for(const [i,Class]of [Old,RealmPhysics].entries()){
  const world=new Class(floor,new Colliders(),[spec]);worlds.push(world);world.syncActors(people);
  for(const actor of world.actors.values()){
   const read=actor.body.translation.bind(actor.body),write=actor.body.setTranslation.bind(actor.body);
   actor.body.translation=(...args)=>{counts[i]++;return read(...args);};
   actor.body.setTranslation=(...args)=>{teleports[i]++;return write(...args);};
  }
 }
 let comparedActors=0;const player={x:8,y:0,z:8};
 for(let frame=0;frame<180;frame++){
  const input=people.map((p,i)=>({...p,x:p.x+Math.sin(frame*.025)*.3+(frame>=80&&i===0?3.1415926535:0),z:p.z+Math.cos(frame*.03)*.2,active:i!==1||frame<40||frame>=60})).filter((_,i)=>i!==2||frame<100||frame>=120);
  for(const world of worlds){world.syncActors(input);world.beginCharacter(player);world.step(1/60,player,0,0);}
  for(const [id,a]of worlds[0].actors){const b=worlds[1].actors.get(id);assert.deepEqual({from:b.from,target:b.target,active:b.active},{from:a.from,target:a.target,active:a.active});assert.deepEqual(b.body.translation(),a.body.translation());comparedActors++;}
  assert.deepEqual(worlds[1].poses(false),worlds[0].poses(false));
 }
 // Subtract explicit comparison reads, which are outside synchronization.
 for(let i=0;i<2;i++)counts[i]-=comparedActors;
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),scope:'Actual Rapier actor synchronization and fixed-step physics, 32 controlled actors over 180 frames. Translation calls are counted at the body API boundary; no hardware frame-time claim.',comparedActorStates:comparedActors,beforeTranslationCalls:counts[0],afterTranslationCalls:counts[1],beforeTeleports:teleports[0],afterTeleports:teleports[1],exactActorAndPropStates:true,pass:counts[1]<counts[0]&&teleports[0]===teleports[1]};assert.equal(report.pass,true);fs.writeFileSync(process.argv[2]??'actor-translation-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{for(const world of worlds)world.dispose();await server.close();}
