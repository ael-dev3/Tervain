import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';

const ref='9ab40b387',output=process.argv[2]??'prop-motion-buffer.json';
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/world/physics.ts`],{encoding:'utf8'}),'baseline.ts')).code
  .replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/world',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{
  name:'baseline',resolveId(id){if(id==='/@baseline')return '\0baseline';},load(id){if(id==='\0baseline')return baseline;},
}],server:{middlewareMode:true,hmr:false,ws:false}});
let before,after;
try {
 const {RealmPhysics,initializePhysics}=await server.ssrLoadModule('/src/world/physics.ts');
 const {RealmPhysics:Old}=await server.ssrLoadModule('/@baseline');
 const {Terrain}=await server.ssrLoadModule('/src/world/terrain.ts');
 const {Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');
 await initializePhysics();const terrain=new Terrain();
 before=new Old(terrain,new Colliders());after=new RealmPhysics(terrain,new Colliders());
 const buffer=[],arraysBefore=new Set(),arraysAfter=new Set(),recordsBefore=new Set(),recordsAfter=new Set();
 const retained=after.motions(),retainedJson=JSON.stringify(retained);
 let sleepingSamples=0,comparedRecords=0,heldSamples=0;
 for(let frame=0;frame<600;frame++) {
  for(const world of [before,after]) {
   if(frame===20||frame===180){world.props[0].body.applyImpulse({x:1.2,y:3,z:-.6},true);world.props[0].body.applyTorqueImpulse({x:.25,y:.7,z:.3},true);}
   if(frame===110)world.throw(.4,-.2);
   if(frame===200){const saved=world.snapshot();saved[2].position.y+=.8;world.restore(saved);}
   if(frame===300)world.reset();
   world.step([1/60,1/120,1/30,0,.05][frame%5],{x:0,y:terrain.heightAt(0,0),z:0},.3,.2);
   if(frame===100)assert.equal(world.grab(world.props[1].spec.id),true);
   if(frame===450)for(const p of world.props)p.body.sleep();
  }
  const a=before.motions(),b=after.motions(buffer);
  assert.equal(b,buffer);assert.deepEqual(b,a);comparedRecords+=a.length;
  arraysBefore.add(a);arraysAfter.add(b);for(const m of a)recordsBefore.add(m);for(const m of b)recordsAfter.add(m);
  sleepingSamples+=after.props.filter(p=>p.body.isSleeping()).length;heldSamples+=b.filter(m=>m.held).length;
  assert.equal(JSON.stringify(retained),retainedJson);
 }
 assert.ok(sleepingSamples>0);assert.ok(heldSamples>0);
 assert.equal(arraysBefore.size,600);assert.equal(arraysAfter.size,1);
 assert.equal(recordsBefore.size,600*after.props.length);assert.equal(recordsAfter.size,after.props.length);
 buffer.push({...buffer[0]});after.motions(buffer);assert.equal(buffer.length,after.props.length);
 for(const p of after.props)p.body.sleep();
 for(const m of after.motions(buffer))assert.deepEqual([m.vx,m.vy,m.vz],[0,0,0]);
 const report={baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),
 scope:'Plain output arrays and motion records for one grass caller, counted by retained object identity. Rapier return wrappers, total heap allocations and frame times are not measured.',
 updates:600,props:after.props.length,comparedRecords,sleepingSamples,heldSamples,
 beforeArrays:arraysBefore.size,afterArrays:arraysAfter.size,beforeMotionRecords:recordsBefore.size,afterMotionRecords:recordsAfter.size,
 exactMotionValues:true,defaultSnapshotsUnchanged:true,truncatesOutput:true,sleepClearsVelocity:true,pass:true};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {before?.dispose();after?.dispose();await server.close();}
