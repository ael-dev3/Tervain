import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';

const ref='9ab40b387',output=process.argv[2]??'prop-history-reuse.json';
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
  let beforeFactories=0,afterFactories=0,measure=false;
  for(const [name,world]of [['before',before],['after',after]]) {
    const pose=world.poseOf.bind(world);world.poseOf=(...args)=>{
      if(measure){if(name==='before')beforeFactories++;else afterFactories++;}return pose(...args);
    };
  }
  const retained=after.snapshot(),retainedJson=JSON.stringify(retained),cadence=[1/60,1/120,1/30,0,.05];
  let comparedPoses=0,fixedSteps=0,sleepingSamples=0;
  for(let frame=0;frame<500;frame++) {
    for(const world of [before,after]) {
      if(frame===20||frame===180){world.props[0].body.applyImpulse({x:1.2,y:3,z:-.6},true);world.props[0].body.applyTorqueImpulse({x:.25,y:.7,z:.3},true);}
      if(frame===100){world.grab(world.props[1].spec.id);world.throw(.4,-.2);}
      if(frame===200){const saved=world.snapshot();saved[2].position.y+=.8;world.restore(saved);}
      if(frame===300)world.reset();
    }
    const histories=after.props.map(p=>({pose:p.previous,position:p.previous.position,rotation:p.previous.rotation}));
    const n=before.stats().steps;measure=true;
    before.step(cadence[frame%cadence.length],{x:0,y:terrain.heightAt(0,0),z:0},.3,.2);
    after.step(cadence[frame%cadence.length],{x:0,y:terrain.heightAt(0,0),z:0},.3,.2);
    measure=false;fixedSteps+=before.stats().steps-n;
    assert.equal(after.stats().steps,before.stats().steps);
    for(const [i,p]of after.props.entries()) {
      assert.equal(p.previous,histories[i].pose);assert.equal(p.previous.position,histories[i].position);assert.equal(p.previous.rotation,histories[i].rotation);
      assert.deepEqual(p.previous,before.props[i].previous);
    }
    for(const interpolate of [false,true]) {
      const a=before.poses(interpolate),b=after.poses(interpolate);assert.deepEqual(b,a);comparedPoses+=a.length;sleepingSamples+=b.filter(p=>p.sleeping).length;
    }
    assert.equal(JSON.stringify(retained),retainedJson);
  }
  assert.ok(sleepingSamples>0);assert.equal(beforeFactories,fixedSteps*before.props.length);assert.equal(afterFactories,0);
  const report={baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),
    scope:'Two native Rapier worlds with identical scripted impulses, throw, restore/reset and variable display cadence. Counts cover plain records constructed by the private pose-history factory during fixed steps, not Rapier return wrappers, total heap allocations or frame times.',
    updates:500,fixedSteps,props:after.props.length,comparedPoses,sleepingSamples,beforeHistoryFactories:beforeFactories,afterHistoryFactories:afterFactories,
    beforePlainHistoryRecords:beforeFactories*3,afterPlainHistoryRecords:0,exactHistoryAndInterpolatedPoses:true,retainedSnapshotsUnchanged:true,
    controls:['variable-cadence','zero-dt','impulse-and-tumble','throw','sleep','restore','reset','interpolated-and-current-poses'],pass:true};
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} finally {before?.dispose();after?.dispose();await server.close();}
