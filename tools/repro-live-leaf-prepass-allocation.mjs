import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'leaf-prepass-allocation-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/foliage/leafPrepass.ts',read=ref=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
const sources={before:read('421d34b'),after:read(args['candidate-ref'])};
// Only the allocation is under test; later target-coverage hooks must be shared by both variants.
sources.before=sources.after.replace('new THREE.InstancedMesh(leaf.geometry, material, 0)','new THREE.InstancedMesh(leaf.geometry, material, leaf.instanceMatrix.count)');
if(!read('421d34b').includes('new THREE.InstancedMesh(leaf.geometry, material, leaf.instanceMatrix.count)'))throw Error('Published allocation changed');
const modules={env:`export * from 'three';import {InstancedMesh as Native} from 'three';export let bytes=0,writes=0;export class InstancedMesh extends Native{constructor(g,m,n){super(g,m,n);bytes+=n*64;}setMatrixAt(i,m){writes++;super.setMatrixAt(i,m);}}`};
for(const[mode,source]of Object.entries(sources))modules[mode]=(await transformWithOxc(source,file)).code.replace("from 'three'","from '/@prepass-proof-env'").replace('from "three"','from "/@prepass-proof-env"')+'\nexport function proofStats(){return {bytes:THREE.bytes,writes:THREE.writes};}';
const cache=fs.mkdtempSync(path.join(tmpdir(),'prepass-proof-')),server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'prepass-proof',resolveId(id){if(id.startsWith('/@prepass-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@prepass-proof-'))return modules[id.slice('\0/@prepass-proof-'.length)];}}]});let page;
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
 const E=await import(${JSON.stringify(origin)}+'/@prepass-proof-env'),M={};for(const mode of ['before','after'])M[mode]=await import(${JSON.stringify(origin)}+'/@prepass-proof-'+mode);
 const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,geometries=new Set();for(let l=0;l<3;l++)for(const t of F.canopyAuditTargets(l))if(t.leaves)geometries.add(t.leaves);
 let maxId=0;T.world.scene.traverse(o=>maxId=Math.max(maxId,o.id));while(new E.Object3D().id<=maxId){}
 const inputs=[];F.group.traverse(m=>{if(m.isInstancedMesh&&geometries.has(m.geometry)&&m.name.endsWith(':foliage'))inputs.push(m);});if(!inputs.length)throw Error('No native leaf batches');
 const rows={},images={},saved=inputs.map(m=>({m,material:m.material,visible:m.visible}));T.lastFrameDt=0;
 try{for(const mode of ['before','after']){let {bytes,writes}=M[mode].proofStats();const depths=[],materials=[];let shared=true,capacity=0;
  try{for(const {m,material} of saved){m.material=material.clone();m.material.onBeforeCompile=material.onBeforeCompile;m.material.onBeforeRender=material.onBeforeRender;m.material.customProgramCacheKey=material.customProgramCacheKey;materials.push(m.material);const d=M[mode].splitLeafPrepass(m);if(!d)throw Error('No cutout depth pass');depths.push(d);capacity+=m.instanceMatrix.count;shared&&=d.instanceMatrix===m.instanceMatrix&&d.instanceColor===m.instanceColor&&d.count===0&&!d.visible;d.count=m.count;d.visible=m.visible;d.frustumCulled=m.frustumCulled;d.boundingSphere=m.boundingSphere;d.position.copy(m.position);d.quaternion.copy(m.quaternion);d.scale.copy(m.scale);m.parent.add(d);}
   const construction={discardedMatrixBytes:M[mode].proofStats().bytes-bytes,identityMatrixWrites:M[mode].proofStats().writes-writes,shared,capacity,batches:inputs.length};
   T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images[mode]=T.renderer.domElement.toDataURL('image/png');rows[mode]={...construction,drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures};
  }finally{for(const d of depths){d.removeFromParent();d.dispose();d.material.dispose();}for(let i=0;i<saved.length;i++)saved[i].m.material=saved[i].material;for(const m of materials)m.dispose();}}
  for(const {m}of saved)m.visible=false;T.renderWorld();images.empty=T.renderer.domElement.toDataURL('image/png');
  return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,images};
 }finally{for(const {m,material,visible}of saved){m.material=material;m.visible=visible;}}
 `);
 const pixels={};for(const[mode,data]of Object.entries(report.images)){fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));pixels[mode]=await sharp(path.join(out,mode+'.png')).raw().toBuffer();}delete report.images;
 report.changedChannels={beforeAfter:pixels.before.reduce((n,v,i)=>n+Number(v!==pixels.after[i]),0),beforeEmpty:pixels.before.reduce((n,v,i)=>n+Number(v!==pixels.empty[i]),0)};
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 const{before:b,after:a}=report.rows;report.pass=b.shared&&a.shared&&b.discardedMatrixBytes>0&&a.discardedMatrixBytes===0&&b.identityMatrixWrites>0&&a.identityMatrixWrites===0&&b.capacity===a.capacity&&b.drawCalls===a.drawCalls&&b.triangles===a.triangles&&b.textures===a.textures&&report.changedChannels.beforeAfter===0&&report.changedChannels.beforeEmpty>0;
 report.scope='Published forest batch capacities replayed through original/candidate depth-pass constructors. Current target-coverage hooks shared by both variants. Low world uses a controlled split-depth pipeline for this comparison. Counts discarded CPU matrix payload and actual identity writes, not total heap, GPU traffic, timings or FPS. Full-scene software-rendered output must match, with a hidden-foliage control.';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
