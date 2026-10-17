import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import { liveProofPage } from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'bark-normal-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/treeTextures.ts',read=ref=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
const sources={before:read('421d34b'),after:read(args['candidate-ref'])},modules={env:"export * as THREE from 'three';"};
for(const[mode,source]of Object.entries(sources)){
 const marker='function heightToNormal(h: Float32Array, n: number, k: number): Uint8Array {';
 if(source.split(marker).length!==2)throw Error('Normal producer changed');
 const code='export const proofStats={normalPixels:0};\n'+source.replace(marker,marker+'proofStats.normalPixels+=n*n;');
 modules[mode]=(await transformWithOxc(code,file)).code.replaceAll('"../world/noise"','"/src/world/noise"').replaceAll('"./procTex"','"/src/presentation/procTex"');
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'bark-normal-proof-')),server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'bark-normal-proof',resolveId(id){if(id.startsWith('/@bark-normal-'))return '\0'+id;},load(id){if(id.startsWith('\0/@bark-normal-'))return modules[id.slice('\0/@bark-normal-'.length)];}}]});let page;
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
 const {THREE}=await import(${JSON.stringify(origin)}+'/@bark-normal-env'),M={};for(const mode of ['before','after'])M[mode]=await import(${JSON.stringify(origin)}+'/@bark-normal-'+mode);
 const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const rows={},textures={before:{},after:{}};
 for(const mode of ['before','after']){rows[mode]={};for(const kind of ['oak','pine','dead']){
  const start=M[mode].proofStats.normalPixels,t=M[mode].barkTextures(kind,1024);textures[mode][kind]=t;
  rows[mode][kind]={normalPixelsAtDetailUse:M[mode].proofStats.normalPixels-start,mapSha256:await hash(t.map.image.data),surfaceSha256:await hash(t.surface.image.data)};
 }}
 const native=[],seen=new Set();let fixture;
 F.group.traverse(mesh=>{if(!mesh.isInstancedMesh||!mesh.name.endsWith(':wood')||seen.has(mesh.material))return;seen.add(mesh.material);const shader={uniforms:THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms),vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader,T.renderer);if(shader.uniforms.tvBarkColour?.value?.image?.width===1024)native.push({mesh,shader});});
 const nativeKinds=new Set(),nativeRows=[];
 for(const {mesh,shader}of native){const map=await hash(shader.uniforms.tvBarkColour.value.image.data),surface=await hash(shader.uniforms.tvBarkSurface.value.image.data),kind=Object.keys(rows.before).find(k=>rows.before[k].mapSha256===map&&rows.before[k].surfaceSha256===surface);if(!kind)throw Error('Unmatched native detail textures');nativeKinds.add(kind);nativeRows.push({name:mesh.name,kind,mapSha256:map,surfaceSha256:surface});if(!fixture&&kind==='oak')fixture=mesh;}
 if(!fixture||!nativeKinds.size)throw Error('Native bark fixture missing');
 const target=F.canopyAuditTargets(0).find(t=>t.label==='tree:wild:40:42');if(!target?.wood)throw Error('Native oak placement missing');F.group.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.geometry===target.wood)fixture=mesh;});
 const oldVisible=F.group.visible,oldPosition=T.cam.camera.position.clone(),oldQuaternion=T.cam.camera.quaternion.clone(),mesh=fixture.clone(),images={},cost={};mesh.geometry=fixture.geometry.clone();const coverage=mesh.geometry.getAttribute('aDistanceCoverage');if(coverage)coverage.setXY(0,0,1);mesh.count=1;mesh.visible=true;mesh.frustumCulled=false;mesh.setMatrixAt(0,target.matrix);mesh.instanceMatrix.needsUpdate=true;T.world.scene.add(mesh);
 try{F.group.visible=false;const e=target.matrix.elements;T.cam.camera.position.set(e[12]+3.5,e[13]+6,e[14]-2);T.cam.camera.lookAt(e[12],e[13]+5.8,e[14]);T.cam.camera.updateMatrixWorld(true);
 for(const mode of ['before','after']){const material=fixture.material.clone(),hook=fixture.material.onBeforeCompile;material.onBeforeCompile=function(shader,renderer){hook.call(this,shader,renderer);shader.uniforms.tvBarkColour.value=textures[mode].oak.map;shader.uniforms.tvBarkSurface.value=textures[mode].oak.surface;};material.customProgramCacheKey=()=>fixture.material.customProgramCacheKey()+'|normal-work-'+mode;mesh.material=material;T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images[mode]=T.renderer.domElement.toDataURL('image/png');cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};material.dispose();}
 }finally{mesh.removeFromParent();mesh.geometry.dispose();mesh.dispose();F.group.visible=oldVisible;T.cam.camera.position.copy(oldPosition);T.cam.camera.quaternion.copy(oldQuaternion);T.cam.camera.updateMatrixWorld(true);}
 for(const mode of ['before','after']){for(const kind of ['oak','pine','dead']){const t=textures[mode][kind],start=M[mode].proofStats.normalPixels;rows[mode][kind].requestedNormalSha256=await hash(t.normal.image.data);rows[mode][kind].normalPixelsOnRequest=M[mode].proofStats.normalPixels-start;}
 M[mode].disposeTreeTextures();const start=M[mode].proofStats.normalPixels;M[mode].barkTextures('oak',32);const generated=M[mode].proofStats.normalPixels-start;M[mode].disposeTreeTextures();rows[mode].unusedDisposal={generatedPixels:generated,pixelsDuringDisposal:M[mode].proofStats.normalPixels-start-generated};}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),nativeKinds:[...nativeKinds],nativeRows,rows,images,cost};
 `);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['before','after'].map(async mode=>(await import('sharp')).default(path.join(out,mode+'.png')).raw().toBuffer()));report.changedChannels=pixels[0].reduce((n,v,i)=>n+Number(v!==pixels[1][i]),0);
 report.normalPixelsAtNativeDetailUse=Object.fromEntries(['before','after'].map(mode=>[mode,report.nativeKinds.reduce((n,k)=>n+report.rows[mode][k].normalPixelsAtDetailUse,0)]));
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Native published 1024px bark colour/relief textures identify the kinds in actual forest materials. Source modules count height-to-normal texel visits for each kind. A fixed native oak placement and unchanged native material hook render with the generated colour/relief pair through native post/MSAA. Requested normal maps are also byte-compared. Not hardware timing, GPU upload savings or a net heap saving: unused normals retain their Float32 source heights instead of generating RGBA normal bytes.';
 report.pass=report.nativeKinds.length>0&&report.normalPixelsAtNativeDetailUse.before>0&&report.normalPixelsAtNativeDetailUse.after===0&&report.changedChannels===0&&report.cost.before.drawCalls===report.cost.after.drawCalls&&report.cost.before.triangles===report.cost.after.triangles&&['oak','pine','dead'].every(k=>['mapSha256','surfaceSha256','requestedNormalSha256'].every(key=>report.rows.before[k][key]===report.rows.after[k][key])&&report.rows.after[k].normalPixelsOnRequest===1024*1024)&&report.rows.after.unusedDisposal.generatedPixels===0&&report.rows.after.unusedDisposal.pixelsDuringDisposal===0;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
