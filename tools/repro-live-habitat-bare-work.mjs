import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'habitat-bare-proof',file='src/presentation/ground/habitat.ts';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const read=ref=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8'),sources={before:read('3c5f95b30'),after:read(args['candidate-ref'])},modules={};
for(const[mode,source]of Object.entries(sources)){
 let s=source.replace('    const terrain = this.terrain;', '    window.__bareWork.nodes++;\n    const terrain = this.terrain;')
 .replace('const d = Math.hypot(x - c.x, z - c.z) - c.hard;', 'window.__bareWork.softChecks++; if(open===0)window.__bareWork.zeroSoftChecks++; const d = Math.hypot(x - c.x, z - c.z) - c.hard;')
 .replace('const dx = x - f.x;', 'window.__bareWork.fieldChecks++; if(open===0)window.__bareWork.zeroFieldChecks++; const dx = x - f.x;');
 if(!s.includes('window.__bareWork.nodes++')||!s.includes('window.__bareWork.softChecks++')||!s.includes('window.__bareWork.fieldChecks++'))throw Error('Instrumentation anchors missing');
 modules[mode]=(await transformWithOxc(s,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'habitat-bare-')),server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'habitat-bare',resolveId(id){if(id.startsWith('/@habitat-bare-'))return '\0'+id;},load(id){if(id==='\0/@habitat-bare-env')return "export * as THREE from 'three';";if(id.startsWith('\0/@habitat-bare-'))return modules[id.slice('\0/@habitat-bare-'.length)];}}]});let page;
async function expose(expression,predicate){
 const fn=(await page.cdp('Runtime.evaluate',{expression,returnByValue:false})).result.result.objectId,props=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result,scopesId=props.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopesId)throw Error('Native closure scopes missing');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopesId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;for(const v of variables){if(!v.value?.objectId)continue;const found=await page.cdp('Runtime.callFunctionOn',{objectId:v.value.objectId,functionDeclaration:predicate,returnByValue:true});if(found.result?.result?.value===true)return;}}
 throw Error('Native context not found');
}
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 await expose('window.tervain.world.groundcover.update','function(){if(Array.isArray(this?.layers)&&this.layers.length===2&&this.layers.every(l=>typeof l.o?.generate==="function")){window.__bareField=this;return true;}return false;}');
 await expose('window.__bareField.layers[0].o.generate','function(){if(typeof this?.sample==="function"&&typeof this.hardBlocked==="function"&&this.tiles instanceof Map&&this.softCircleHash instanceof Map){window.__bareHabitat=this;return true;}return false;}');
 const report=await page.eval(`
 const{THREE}=await import(${JSON.stringify(origin)}+'/@habitat-bare-env'),models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@habitat-bare-'+mode);
 const T=window.tervain,R=T.renderer,G=T.world.groundcover,F=window.__bareField,H=window.__bareHabitat,camera=T.cam.camera,x=46,z=68,y=T.world.terrain.heightAt(x,z),focus=new THREE.Vector3(x,y,z);T.lastFrameDt=0;camera.position.set(x,y+2,z-5);camera.lookAt(x,y+.4,z+8);camera.updateMatrixWorld(true);G.update(0,{camera,focus,reducedMotion:true});T.renderWorld();T.renderWorld();
 const nativeEval=H.evalNode,ownEval=Object.hasOwn(H,'evalNode'),oldTiles=H.tiles,tiles=F.layers.flatMap(l=>Array.from(l.tiles.values()).map(t=>({layer:l,tile:t,saved:t.attrs.map(a=>new Float32Array(a.array))}))),rows={},images={},points=[];
 for(const[px,pz]of [[-2,37],[-12.3,44.8],[-4,46],[-268,27]])for(let dz=-16;dz<=16;dz+=4)for(let dx=-16;dx<=16;dx+=4)points.push([px+dx,pz+dz]);
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join(''),words=a=>Array.from(new Uint32Array(a.buffer,a.byteOffset,a.length)),originalPacked=await hash(tiles.map(({tile:t})=>t.attrs.map(a=>words(a.array.subarray(0,t.count*4)))));
 try{for(const mode of ['native','before','after']){
  H.evalNode=mode==='native'?nativeEval:models[mode].Habitat.prototype.evalNode;H.tiles=new Map();window.__bareWork={nodes:0,softChecks:0,zeroSoftChecks:0,fieldChecks:0,zeroFieldChecks:0};const samples=[],packed=[];let clumps=0;
  for(const[px,pz]of points){const s={open:0,wet:0,dry:0,wood:0,slope:0};H.sample(px,pz,s);samples.push(s);}
  for(const {layer,tile:t}of tiles){const n=layer.o.capacity,b={base:new Float32Array(n*4),shape:new Float32Array(n*4),tint:new Float32Array(n*4),slope:new Float32Array(n*4),ymin:Infinity,ymax:-Infinity};for(const a of [b.base,b.shape,b.tint,b.slope])a.fill(NaN);const accepted=layer.o.generate(t.tx,t.tz,b);if(accepted!==t.count)throw Error('Native tile population changed');const data=[b.base,b.shape,b.tint,b.slope];for(let a=0;a<4;a++){const prefix=data[a].subarray(0,accepted*4);if(Array.from(prefix).some(v=>!Number.isFinite(v)))throw Error('Incomplete native tile output');t.attrs[a].array.set(prefix);t.attrs[a].needsUpdate=true;}packed.push(data.map(a=>words(a.subarray(0,accepted*4))));clumps+=accepted;}
  const raster=Array.from(H.tiles.entries()).sort((a,b)=>a[0]-b[0]).map(([key,a])=>[key,words(a)]);
  rows[mode]={...window.__bareWork,samples:points.length,rasterTiles:H.tiles.size,rasterWords:raster.reduce((n,r)=>n+r[1].length,0),clumps,packedSha256:await hash(packed),rasterSha256:await hash(raster),samplesSha256:await hash(samples)};
  if(${args.images!=='0'}){T.renderWorld();R.info.reset();T.renderWorld();rows[mode].drawCalls=R.info.render.calls;rows[mode].triangles=R.info.render.triangles;images[mode]=R.domElement.toDataURL('image/png');}
 }}finally{if(ownEval)H.evalNode=nativeEval;else delete H.evalNode;H.tiles=oldTiles;for(const {tile:t,saved}of tiles)for(let i=0;i<t.attrs.length;i++){t.attrs[i].array.set(saved[i]);t.attrs[i].needsUpdate=true;}delete window.__bareWork;}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),quality:'low',position:{x,y,z},originalPacked,rows,images};
 `);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;report.changedChannels={};if(args.images!=='0'){const native=await sharp(path.join(out,'native.png')).raw().toBuffer();for(const mode of ['before','after']){const pixels=await sharp(path.join(out,mode+'.png')).raw().toBuffer();report.changedChannels[mode]=native.reduce((n,v,i)=>n+Number(v!==pixels[i]),0);}}
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));report.scope='Actual published habitat, terrain, planted-crown field, exclusions and native grass generators. Swap only the raster evalNode method, rebuild caches and regenerate existing native tiles. Native-original output is the independent control. Instrumented source counts soft-circle hypot calls and field rectangle evaluations, not CPU/GPU timings or hardware stall attribution. Scene captures use the regenerated native attributes and native post rendering.';
 const n=report.rows.native,b=report.rows.before,a=report.rows.after;report.pass=report.originalPacked===n.packedSha256&&['packedSha256','rasterSha256','samplesSha256','rasterWords','rasterTiles','clumps'].every(k=>n[k]===b[k]&&b[k]===a[k])&&b.nodes===a.nodes&&b.zeroSoftChecks+b.zeroFieldChecks>0&&a.zeroSoftChecks===0&&a.zeroFieldChecks===0&&a.softChecks<b.softChecks&&a.fieldChecks<b.fieldChecks&&(args.images==='0'||report.changedChannels.before===0&&report.changedChannels.after===0&&n.drawCalls===a.drawCalls&&n.triangles===a.triangles);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
