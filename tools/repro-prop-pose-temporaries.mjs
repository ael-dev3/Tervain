import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer, transformWithOxc} from 'vite';
const ref='0b45a36';
const oldSource=execFileSync('git',['show',`${ref}:src/world/physics.ts`],{encoding:'utf8'});
const baseline=(await transformWithOxc(oldSource,'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/world',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline',resolveId(id){if(id==='/@baseline')return '\0baseline';},load(id){if(id==='\0baseline')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
let world;
try {
 const {RealmPhysics,initializePhysics,PHYSICAL_PROPS}=await server.ssrLoadModule('/src/world/physics.ts');
 const {RealmPhysics:Old}=await server.ssrLoadModule('/@baseline');
 const {Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');
 await initializePhysics();
 const floor={nx:10,nz:10,vertexX:i=>i*2-10,vertexZ:i=>i*2-10,vertexHeight:()=>0,heightAt:()=>0,groundAt:()=>0};
 world=new RealmPhysics(floor,new Colliders(),PHYSICAL_PROPS.map((p,i)=>({...p,x:i%5*1.5-3,z:Math.floor(i/5)*1.5-3})));
 for(let i=0;i<world.props.length;i++){
  const body=world.props[i].body;body.setTranslation({x:i%5*1.5-3,y:2+i*.1,z:Math.floor(i/5)*1.5-3},true);
  body.setAngvel({x:.3,y:.7,z:-.2},true);
 }
 const poseOf=world.poseOf.bind(world);let calls=0;world.poseOf=(...args)=>{calls++;return poseOf(...args);};
 let beforeCalls=0,afterCalls=0,samples=0;const player={x:8,y:0,z:8};
 for(let frame=0;frame<240;frame++){
  world.beginCharacter(player);world.step([1/120,1/60,1/40][frame%3],player,0,0);
  for(const interpolate of [true,false]){
   calls=0;const before=Old.prototype.poses.call(world,interpolate);beforeCalls+=calls;
   calls=0;const after=world.poses(interpolate);afterCalls+=calls;
   assert.deepEqual(after,before);samples+=after.length;
   for(const pose of after){assert.equal(Object.getPrototypeOf(pose.position),Object.prototype);assert.equal(Object.getPrototypeOf(pose.rotation),Object.prototype);}
   // Returned poses must remain independent of physics state and later results.
   const saved=structuredClone(after);after[0].position.y=999;after[0].rotation.w=999;
   assert.deepEqual(world.poses(interpolate),saved);
  }
 }
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),scope:'Actual Rapier props, 240 variable-cadence updates, both interpolation modes. Counts cover three temporary plain records created by poseOf, excluding Rapier-returned objects and final output records; not measured heap bytes or frame timing.',props:world.props.length,comparedPoses:samples,beforeTemporaryRecords:beforeCalls*3,afterTemporaryRecords:afterCalls*3,exactValues:true,independentPlainOutputs:true,pass:beforeCalls===samples&&afterCalls===0};
 assert.equal(report.pass,true);fs.writeFileSync(process.argv[2]??'prop-pose-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{world?.dispose();await server.close();}
