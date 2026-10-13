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
 const {RealmPhysics,initializePhysics}=await server.ssrLoadModule('/src/world/physics.ts'),{RealmPhysics:Old}=await server.ssrLoadModule('/@baseline');
 const {Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');const {default:R}=await server.ssrLoadModule('@dimforge/rapier3d-compat');await initializePhysics();
 const floor={nx:10,nz:10,vertexX:i=>i*2-10,vertexZ:i=>i*2-10,vertexHeight:()=>0,heightAt:()=>0,groundAt:()=>0};
 const actor={id:'animal:1005232644',x:0,y:0,z:0,radius:.25,height:1.8,active:true};
 for(const Class of [Old,RealmPhysics]){const world=new Class(floor,new Colliders(),[]);worlds.push(world);world.syncActors([actor]);}
 const handles=worlds.map(w=>w.actors.get(actor.id).collider.handle),rows=[],shapeWrites=[0,0];
 for(let i=0;i<2;i++){const collider=worlds[i].actors.get(actor.id).collider,set=collider.setShape.bind(collider);collider.setShape=(shape)=>{shapeWrites[i]++;return set(shape);};}
 for(const [label,radius,height,active]of [['unchanged',.25,1.8,true],['shorter',.2,.4,true],['wider',.6,1.8,true],['inactive-resize',.3,1.2,false],['reactivated',.3,1.2,true]]){
  const input={...actor,radius,height,active},row={label,radius,height,active};
  for(let i=0;i<2;i++){
   const world=worlds[i];world.syncActors([input]);world.beginCharacter({x:8,y:0,z:8});world.step(1/60,{x:8,y:0,z:8},0,0);const collider=world.actors.get(actor.id).collider,shape=collider.shape;
   assert.equal(collider.handle,handles[i]);
   row[i?'after':'before']={radius:shape.radius,halfHeight:shape.halfHeight,enabled:world.actors.get(actor.id).body.isEnabled(),rayAtY095:collider.castRay(new R.Ray({x:-3,y:.95,z:0},{x:1,y:0,z:0}),6,true)};
  }
  rows.push(row);
 }
 assert.deepEqual(rows[0].before,rows[0].after);assert.ok(rows[1].before.rayAtY095>=0&&rows[1].after.rayAtY095<0);assert.equal(shapeWrites[1],3);
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/physics.ts')).digest('hex'),beforeShapeWrites:shapeWrites[0],afterShapeWrites:shapeWrites[1],scope:'Actual synchronized Rapier actor collider dimensions and direct shape ray query. Controlled dimensions, no visual or hardware timing claim.',rows,handlesRetained:true,pass:rows.every(r=>r.after.radius===r.radius&&r.after.halfHeight===Math.max(0,r.height/2-r.radius)&&r.after.enabled===r.active)};
 fs.writeFileSync(process.argv[2]??'actor-capsule-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{for(const world of worlds)world.dispose();await server.close();}
