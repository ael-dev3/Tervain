import fs from 'node:fs';import path from 'node:path';import {tmpdir}from'node:os';
import {execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{createServer,transformWithOxc}from'vite';import sharp from'sharp';
import{liveProofPage}from'./live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'raised-lod-root-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/treeGrounding.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources))modules[mode]=(await transformWithOxc(source,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
const cache=fs.mkdtempSync(path.join(tmpdir(),'raised-lod-root-')),server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'root-proof',resolveId(id){if(id.startsWith('/@root-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@root-proof-'))return modules[id.slice('\0/@root-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,label='tree:wild:40:42',targets=[0,1,2].map(lod=>F.canopyAuditTargets(lod).find(t=>t.label===label));if(targets.some(t=>!t?.wood))throw Error('Native woody LOD fixture missing');
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const geometryHash=()=>hash(targets.map(t=>({position:Array.from(t.wood.getAttribute('position').array),index:t.wood.index?Array.from(t.wood.index.array):null})));
 const originalHash=await geometryHash(),m=targets[0].matrix,e=m.elements,tree={x:e[12],z:e[14],s:Math.hypot(e[0],e[2]),yaw:Math.atan2(e[8],e[0])},variant={species:targets[0].species,lods:targets.map(t=>({wood:t.wood,leaf:t.leaves}))},models={},rows={};
 for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@root-proof-'+mode);
 const planted=models.before.groundedTreeY(T.world.terrain,tree,variant);
 for(const mode of ['before','after']){const y=models[mode].groundedTreeFlareY(T.world.terrain,tree,variant,planted),levels=[];
  for(let lod=0;lod<3;lod++){const g=targets[lod].wood,p=g.getAttribute('position');g.computeBoundingBox();const points=[];for(let i=0;i<p.count;i++)if(p.getY(i)<=g.boundingBox.min.y+.35){const v=T.player.group.position.clone().fromBufferAttribute(p,i).applyMatrix4(m);v.y+=y-e[13];points.push({world:v.toArray(),gap:v.y-T.world.terrain.heightAt(v.x,v.z)});}levels.push({lod,minLocalY:g.boundingBox.min.y,samples:points.length,maxGap:Math.max(...points.map(p=>p.gap)),worst:points.reduce((a,b)=>a.gap>b.gap?a:b)});}
  rows[mode]={y,deltaFromNative:y-e[13],levels,geometrySha256:await geometryHash()};
 }
 const nativeY=e[13],originalVisible=F.group.visible,created=[],images={},cost={};
 try{F.group.visible=false;const g=targets[2].wood;let source;F.group.traverse(o=>{if(o.isInstancedMesh&&o.geometry===g)source=o;});if(!source)throw Error('Native far wood mesh missing');
  const mesh=source.clone();mesh.geometry=g.clone();const coverage=mesh.geometry.getAttribute('aDistanceCoverage');if(coverage)coverage.setXY(0,0,1);mesh.count=1;mesh.visible=true;mesh.frustumCulled=false;mesh.name='root-proof-wood';T.world.scene.add(mesh);created.push(mesh);
  const worst=rows.before.levels[2].worst.world,ground=T.world.terrain.heightAt(worst[0],worst[2]),dx=worst[0]-tree.x,dz=worst[2]-tree.z,len=Math.hypot(dx,dz)||1;
  T.cam.camera.position.set(worst[0]+dx/len*3,ground+.55,worst[2]+dz/len*3);T.cam.camera.lookAt(worst[0],ground+.04,worst[2]);T.cam.camera.updateMatrixWorld(true);
  for(const mode of ['before','after']){const matrix=m.clone();matrix.elements[13]=rows[mode].y;mesh.setMatrixAt(0,matrix);mesh.instanceMatrix.needsUpdate=true;T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};images[mode]=T.renderer.domElement.toDataURL('image/png');}
 }finally{for(const mesh of created){mesh.removeFromParent();mesh.geometry.dispose();mesh.dispose();}F.group.visible=originalVisible;}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),label,species:targets[0].species,tree,nativeY,planted,originalGeometrySha256:originalHash,rows,images,cost};`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.changedChannels=pixels[0].reduce((n,v,i)=>n+Number(v!==pixels[1][i]),0);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.scope='Native published oak, all three original woody LODs, actual terrain and source grounding functions. Only whole-tree Y seating changes. Root inspection isolates its far wood on native terrain through post/MSAA; not a full forest clearance or hardware performance claim. Rest-geometry basal-band vertex gaps are reported, not a video/art score.';
 const a=report.rows.before,b=report.rows.after;report.pass=Math.abs(a.deltaFromNative)<1e-6&&a.levels[2].maxGap>.08&&b.levels[2].maxGap<=-.059999&&b.y<a.y&&a.geometrySha256===report.originalGeometrySha256&&b.geometrySha256===report.originalGeometrySha256&&report.changedChannels>0&&report.cost.before.drawCalls===report.cost.after.drawCalls&&report.cost.before.triangles===report.cost.after.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
