import fs from 'node:fs';
import R from '@dimforge/rapier3d-compat';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36',timingMode=process.argv.includes('--timings'),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/world/physics.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/world',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline',resolveId(id){if(id==='/@baseline')return '\0baseline';},load(id){if(id==='\0baseline')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});let world;
try{
 const {RealmPhysics,initializePhysics}=await server.ssrLoadModule('/src/world/physics.ts'),{RealmPhysics:Old}=await server.ssrLoadModule('/@baseline'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts'),{Terrain}=await server.ssrLoadModule('/src/world/terrain.ts');await initializePhysics();
 const terrain=new Terrain();world=new RealmPhysics(terrain,new Colliders());
 const before=Old.prototype.castContacts,after=RealmPhysics.prototype.castContacts,ball=new R.Ball(.35),capsule=new R.Capsule(.625,.35),queries=[];
 for(let z=-30;z<=65;z+=5)for(let x=-45;x<=35;x+=5){const y=terrain.heightAt(x,z);queries.push([ball,{x,y:y+1.15,z},{x:0,y:-1,z:0},120]);queries.push([capsule,{x,y:y+.975,z},{x:.5,y:0,z:.2},1]);}
 for(const prop of world.props){const p=prop.body.translation();for(const r of [.2,.35,.5,1])queries.push([new R.Ball(r),{x:p.x,y:p.y+2,z:p.z},{x:0,y:-1,z:0},4]);}
 const simplify=result=>result?{handle:result.contact.collider.handle,toi:result.hit.time_of_impact,normal:result.normal,witness:result.witness}:null;
 if(timingMode){
  const clustered=process.argv.includes('--clustered'),near=process.argv.includes('--near');
  if(clustered){const saved=world.snapshot();for(const pose of saved){pose.position={x:0,y:.5,z:0};pose.rotation={x:0,y:0,z:0,w:1};}world.restore(saved);queries.splice(0,queries.length,[ball,{x:0,y:3,z:0},{x:0,y:-1,z:0},10]);}
  else if(near)queries.splice(0,queries.length-world.props.length*4);
  const repeats=clustered?10000:near?300:20,run=method=>{let hits=0;for(let i=0;i<repeats;i++)for(const q of queries)hits+=Number(!!method.call(world,...q,undefined,false));return hits;};run(before);run(after);const rounds=[];
  for(let i=0;i<9;i++){const row={};for(const name of i%2?['after','before']:['before','after']){const start=performance.now(),hits=run(name==='before'?before:after);row[name]={ms:performance.now()-start,hits};}assert.equal(row.before.hits,row.after.hits);rounds.push(row);}
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),scope:'Uninstrumented alternating prop query batches, first pair discarded. Component CPU workload, not hardware frame timing.',corpus:clustered?'overlapping-props-stress':near?'near-authored-props':'authored-terrain-grid-and-props',queriesPerBatch:queries.length*repeats,beforeMedianMs:median(rounds.slice(1).map(r=>r.before.ms)),afterMedianMs:median(rounds.slice(1).map(r=>r.after.ms)),rounds,pass:true};fs.writeFileSync(output??'prop-cast-timings.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }else{
  let casts=0;for(const prop of world.props){const cast=prop.collider.castShape.bind(prop.collider);prop.collider.castShape=(...args)=>{casts++;return cast(...args);};}
  let beforeCasts=0,afterCasts=0,hits=0,compared=0;const compare=q=>{casts=0;const a=simplify(before.call(world,...q,undefined,false));beforeCasts+=casts;casts=0;const b=simplify(after.call(world,...q,undefined,false));afterCasts+=casts;assert.deepEqual(b,a);hits+=Number(!!a);compared++;return a;};
  for(const q of queries)compare(q);
  const prop=world.props[0],controls=[];
  for(const [label,shape] of [['cuboid',new R.Cuboid(1,2,3)],['cylinder',new R.Cylinder(2,.8)],['ball',new R.Ball(1.2)],['unbounded-fallback-cone',new R.Cone(2,.8)]]){
   prop.collider.setShape(shape);const saved=world.snapshot();saved[0].position={x:7.123456,y:4,z:6.98765};saved[0].rotation={x:.31,y:.51,z:.19,w:.77};world.restore(saved);
   for(let x=2;x<=12;x+=.5)for(const y of [3,4,5,6])compare([ball,{x,y,z:7},{x:0,y:-1,z:0},8]);controls.push(label);
  }
  prop.collider.setShape(new R.Ball(.5));const large=world.snapshot();large[0].position={x:1e6,y:.5,z:-1e6};large[0].rotation={x:0,y:0,z:0,w:1};world.restore(large);
  assert.ok(compare([new R.Ball(.33),{x:1e6+.834,y:.5,z:-1e6},{x:0,y:0,z:0},1]));controls.push('large-coordinate-float32-rounding');
  compare([new R.Cone(.5,.3),{x:1e6,y:2,z:-1e6},{x:0,y:-1,z:0},3]);controls.push('unknown-query-shape-fallback');
  const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),scope:'Actual Rapier casts for authored prop placements and terrain query coordinates, plus restored/rotated/replaced collider-shape controls. Counts are API calls, not heap bytes or hardware frame times.',props:world.props.length,comparedQueries:compared,hits,beforeCasts,afterCasts,shapeControls:controls,exactHitsNormalsWitnesses:true,pass:afterCasts<beforeCasts};fs.writeFileSync(output??'prop-cast-bounds.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
 }
}finally{world?.dispose();await server.close();}
