#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {segmentTriangleHit} from './segment-triangle-hit.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'camera-hero-proof';fs.mkdirSync(out,{recursive:true});
const server=await createServer({root,configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,watch:null,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]}});
let blend;
try{const module=await server.ssrLoadModule('/src/presentation/npc/dualQuaternionSkinning.ts');if(module.NPC_DQ_SKINNING_KEY!=='tervain-npc-dq-skinning-v1')throw new Error('Unsupported skin layout');blend=module.blendDualQuaternions.toString();}finally{await server.close();}
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'low',settle:'1',hud:'0'}))url.searchParams.set(k,v);
const pose=args.pose??'idle',phase=Number(args.phase??0);if(!['idle','walk','run'].includes(pose)||!Number.isFinite(phase)||phase<0||phase>1)throw new Error('Expected idle/walk/run and phase in [0,1]');
let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;
 for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode==="play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const report=await page.eval(`
 const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;const W=T.world,P=T.player,C=T.cam;
 const DQ_FIELDS=8,blend=${blend},hit=${segmentTriangleHit.toString()};
 const pose=${JSON.stringify(pose)},phase=${phase},speed=pose==='run'?5.85:pose==='walk'?1.65:0;
 for(let i=0;i<120+Math.round(phase*60);i++)P.rig.hero.pose({mode:pose,time:i/60,speed:1,t:.45,amp:0,grounded:true,travel:speed/60,moveSpeed:speed},1/60,false);
 C.manual=null;C.mode='follow';P.group.updateMatrixWorld(true);const origin=P.rig.root.position.clone(),triangles=[],box={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let vertices=0;
 P.group.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const format=mesh.userData.npcDualQuaternion;if(!format||format.base!==mesh.skeleton.bones.length*4)throw new Error('Missing native DQ layout');
 if(mesh.morphTargetInfluences?.some(v=>Math.abs(v)>1e-8))throw new Error('Active morph targets unsupported');mesh.skeleton.update();const motions=mesh.skeleton.boneTexture.image.data.subarray(format.base*4,format.base*4+format.bones*8),g=mesh.geometry,pos=g.attributes.position,indices=g.attributes.skinIndex,weights=g.attributes.skinWeight,points=[],point=origin.clone();
 for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i);const joints=[0,1,2,3].map(k=>indices.getComponent(i,k)),influence=[0,1,2,3].map(k=>weights.getComponent(i,k));blend(motions,joints,influence,point);point.applyMatrix4(mesh.matrixWorld).sub(origin);const a=point.toArray();if(!a.every(Number.isFinite))throw new Error('Invalid posed vertex');points.push(a);for(let j=0;j<3;j++){box.min[j]=Math.min(box.min[j],a[j]);box.max[j]=Math.max(box.max[j],a[j]);}vertices++;}
 for(let i=0;i+2<(g.index?.count??pos.count);i+=3)triangles.push([0,1,2].map(j=>points[g.index?.getX(i+j)??i+j]));});
 function crossings(at){const camera=C.camera;camera.updateMatrixWorld();const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>origin.clone().set(x,y,-1).unproject(camera).sub(at).toArray()),min=[0,1,2].map(j=>Math.min(...corners.map(p=>p[j]))),max=[0,1,2].map(j=>Math.max(...corners.map(p=>p[j])));
 if([0,1,2].some(j=>max[j]<box.min[j]||min[j]>box.max[j]))return 0;
 const edges=[[0,1],[1,2],[2,3],[3,0],[0,2]],planes=[[corners[0],corners[1],corners[2]],[corners[0],corners[2],corners[3]]];let count=0;
 for(const[a,b,c]of triangles){if([0,1,2].some(j=>Math.max(a[j],b[j],c[j])<min[j]||Math.min(a[j],b[j],c[j])>max[j]))continue;
 if(edges.some(([i,j])=>hit(corners[i],corners[j],a,b,c))||[[a,b],[b,c],[c,a]].some(([p,q])=>planes.some(([u,v,w])=>hit(p,q,u,v,w))))count++;}return count;}
 C.crowns=null;C.reset();C.follow(1/60,origin.x,origin.y,origin.z,{groundAt:()=>origin.y},new W.colliders.constructor(),false,0);const clearCrossings=crossings(origin);
 let injectedCrossings=0;for(let i=0;i<12;i++){C.camera.position.copy(origin).add(origin.clone().set(0,1.25,(i-6)*.05));C.camera.lookAt(origin.clone().add(origin.clone().set(0,1.25,.5)));injectedCrossings=Math.max(injectedCrossings,crossings(origin));}
 const trees=W.colliders.all.filter(c=>c.active&&c.kind==='circle'&&c.id.startsWith('tree:')).sort((a,b)=>Math.hypot(a.x-46,a.z-68)-Math.hypot(b.x-46,b.z-68)).slice(0,6),candidates=[];let scenarios=0,samples=0,hiddenSamples=0,representative=null;
 C.crowns=(x,z,r)=>W.crownsNear?.(x,z,r)??[];
 for(const tree of trees)for(let side=0;side<4;side++){const a=side*Math.PI/2,r=tree.r+.46,x=tree.x+Math.cos(a)*r,z=tree.z+Math.sin(a)*r,y=W.terrain.groundAt(x,z);if(W.colliders.blocked(x,z,.4,{minY:y+.03,maxY:y+1.95}))continue;const at=origin.clone().set(x,y,z);
 for(let yaw=0;yaw<12;yaw++)for(const pitch of[-.65,-.3,0,.32]){C.reset();C.yaw=yaw*Math.PI/6;C.pitch=pitch;scenarios++;
 for(let frame=0;frame<60;frame++){C.follow(1/60,x,y,z,W.terrain,W.colliders,false,0);if(![0,3,10,30,59].includes(frame))continue;samples++;if(!C.bodyVisible){hiddenSamples++;continue;}const n=crossings(at),sample={tree:tree.id,x,y,z,yaw:C.yaw,pitch,frame,boom:C.curDist,nearPlaneTriangles:n,camera:C.camera.position.toArray(),quaternion:C.camera.quaternion.toArray()};if(!representative||sample.boom<representative.boom)representative=sample;if(n)candidates.push(sample);}}}
 candidates.sort((a,b)=>b.nearPlaneTriangles-a.nearPlaneTriangles);window.__cameraHeroRepro={candidates,origin,representative};
 return{schema:1,pose,phase,vertices,bodyBox:box,triangles:triangles.length,trees:trees.length,scenarios,samples,hiddenSamples,candidates:candidates.length,representative,worst:candidates.slice(0,8),controls:{clearCrossings,injectedCrossings},pass:vertices>0&&triangles.length>0&&scenarios>0&&clearCrossings===0&&injectedCrossings>0,qualityPass:null,scope:'Compiled CameraRig against real tree/crown colliders. CPU twin of production dual-quaternion skinning reads actual packed motions; near-plane triangle contacts are candidates requiring native screenshot review, not a calibrated visual or hardware timing verdict.'};
 `);
 report.build=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');
 if(report.representative){await page.eval(`const T=window.tervain,F=window.__cameraHeroRepro,c=F.candidates[0]??F.representative;T.player.x=c.x;T.player.y=c.y;T.player.z=c.z;T.player.rig.root.position.set(c.x,c.y,c.z);T.player.group.visible=true;T.cam.camera.position.fromArray(c.camera);T.cam.camera.quaternion.fromArray(c.quaternion);T.cam.camera.updateMatrixWorld();T.lastFrameDt=0;T.renderWorld();`);await page.shot(path.join(out,report.worst.length?'candidate.png':'representative.png'));}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
