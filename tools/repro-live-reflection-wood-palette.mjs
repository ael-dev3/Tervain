import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'reflection-wood-palette-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/flora.ts',read=ref=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8'),sources={before:read('3a4d5316c'),after:read(args['candidate-ref'])},modules={env:"export * as THREE from 'three';"};
for(const[mode,source]of Object.entries(sources)){
 const body=source.match(/    lighterForReflection\(\) \{([\s\S]*?)\n    \},\n    stats:/)?.[1];if(!body)throw Error('Reflection method missing');
 modules[mode]=(await transformWithOxc("import * as THREE from 'three';export function make(batches,reflectionProxies){return function(){"+body+'};}',file)).code;
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'reflection-palette-proof-')),server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'reflection-palette-proof',resolveId(id){if(id.startsWith('/@reflection-palette-'))return '\0'+id;},load(id){if(id.startsWith('\0/@reflection-palette-'))return modules[id.slice('\0/@reflection-palette-'.length)];}}]});let page;
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
 const {THREE}=await import(${JSON.stringify(origin)}+'/@reflection-palette-env'),M={};for(const mode of ['before','after'])M[mode]=await import(${JSON.stringify(origin)}+'/@reflection-palette-'+mode);
 const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const pixels=t=>{const image=t?.image;if(!image)throw Error('Texture missing');if(image.data)return image.data;const canvas=new OffscreenCanvas(image.width,image.height),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,image.width,image.height).data;};
 const target=F.canopyAuditTargets(0).find(t=>t.species==='pine'&&t.wood),middle=F.canopyAuditTargets(1).find(t=>t.label===target?.label);if(!middle?.wood)throw Error('Native pine fixture missing');let near,mid;F.group.traverse(mesh=>{if(!mesh.isInstancedMesh)return;if(mesh.geometry===target.wood)near=mesh;if(mesh.geometry===middle.wood)mid=mesh;});if(!near||!mid)throw Error('Native LOD meshes missing');
 const nearGeometry=near.geometry,nearMaterial=near.material,nearCount=near.count,midMaterial=mid.material,oldVisible=F.group.visible,oldPosition=T.cam.camera.position.clone(),oldQuaternion=T.cam.camera.quaternion.clone();
 const atlasHashes={near:await hash(pixels(nearMaterial.map)),middle:await hash(pixels(midMaterial.map))};if(atlasHashes.near===atlasHashes.middle)throw Error('Fixture has no distinct baked atlases');
 const geometryHash=async g=>{const values={};for(const key of ['position','normal','uv'])values[key]=await hash(g.getAttribute(key).array);values.index=await hash(g.index.array);return values;};
 const originalGeometry=await geometryHash(nearGeometry),images={},rows={};
 const capture=async(mode,geometry,material)=>{const owned=geometry.clone(),coverage=owned.getAttribute('aDistanceCoverage');if(coverage)coverage.setXY(0,0,1);const mat=material.clone();mat.onBeforeCompile=material.onBeforeCompile;mat.onBeforeRender=material.onBeforeRender;mat.customProgramCacheKey=function(){return material.customProgramCacheKey.call(this)+'|palette-proof-'+mode;};const mesh=new THREE.InstancedMesh(owned,mat,1);mesh.setMatrixAt(0,target.matrix);mesh.setColorAt(0,new THREE.Color(1,1,1));mesh.frustumCulled=false;T.world.scene.add(mesh);try{T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images[mode]=T.renderer.domElement.toDataURL('image/png');rows[mode]={geometry:await geometryHash(geometry),mapSha256:await hash(pixels(material.map)),usesMiddleMaterial:material===midMaterial,drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};}finally{mesh.removeFromParent();owned.dispose();mesh.dispose();mat.dispose();}};
 try{F.group.visible=false;const e=target.matrix.elements;T.cam.camera.position.set(e[12]+3,e[13]+4,e[14]+3);T.cam.camera.lookAt(e[12],e[13]+3.7,e[14]);T.cam.camera.updateMatrixWorld(true);
 await capture('mainBefore',nearGeometry,nearMaterial);
 near.count=1;const restoreNative=F.lighterForReflection();try{await capture('native',near.geometry,near.material);}finally{restoreNative();}
 for(const mode of ['before','after']){const node=new THREE.InstancedMesh(nearGeometry,nearMaterial,1),proxies=new Map(),restore=M[mode].make([{meshes:[{wood:node,leaf:null},{wood:mid,leaf:null}]}],proxies)();try{await capture(mode,node.geometry,node.material);}finally{restore();if(node.geometry!==nearGeometry||node.material!==nearMaterial)throw Error('Main LOD not restored');node.dispose();for(const p of proxies.values()){for(const name of Object.keys(p.attributes))p.deleteAttribute(name);p.setIndex(null);p.dispose();}}}
 await capture('reference',mid.geometry,midMaterial);await capture('mainAfter',near.geometry,near.material);
 }finally{near.count=nearCount;F.group.visible=oldVisible;T.cam.camera.position.copy(oldPosition);T.cam.camera.quaternion.copy(oldQuaternion);T.cam.camera.updateMatrixWorld(true);}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),label:target.label,species:target.species,atlasHashes,rows,images,mainRestored:near.geometry===nearGeometry&&near.material===nearMaterial&&near.count===nearCount,originalGeometry,finalGeometry:await geometryHash(nearGeometry)};
 `);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const frames={};for(const mode of ['native','before','after','reference','mainBefore','mainAfter'])frames[mode]=await sharp(path.join(out,mode+'.png')).raw().toBuffer();const diff=(a,b)=>frames[a].reduce((n,v,i)=>n+Number(v!==frames[b][i]),0);
 report.changedChannels={nativeVsBefore:diff('native','before'),beforeVsReference:diff('before','reference'),afterVsReference:diff('after','reference'),mainRestored:diff('mainBefore','mainAfter')};
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Published native pine geometry, textures, placement and material hooks. Invoke the native lighterForReflection method and source-extracted original/candidate methods, then inspect their wood through the native post-render path at a fixed camera with one controlled white instance tint. The reference is the native middle geometry with its own material. This isolates the exact substitution used by water/window captures; it is not a full-water visual score or a hardware timing claim.';
 report.pass=report.mainRestored&&JSON.stringify(report.originalGeometry)===JSON.stringify(report.finalGeometry)&&report.changedChannels.nativeVsBefore===0&&report.changedChannels.beforeVsReference>0&&report.changedChannels.afterVsReference===0&&report.changedChannels.mainRestored===0&&!report.rows.native.usesMiddleMaterial&&report.rows.after.usesMiddleMaterial&&['native','before','after'].every(k=>JSON.stringify(report.rows[k].geometry)===JSON.stringify(report.rows.reference.geometry)&&report.rows[k].drawCalls===report.rows.reference.drawCalls&&report.rows[k].triangles===report.rows.reference.triangles);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
