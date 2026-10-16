import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-uniform-prefix-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/grass/trample.ts',sources={original:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),before:execFileSync('git',['show','bd34643b1:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source;
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/grass',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id==='\0/@floor-proof-env')return "export * as THREE from 'three';export {GRASS_QUALITY} from '/src/presentation/grass/grassField.ts';";if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="groundcover").module.prepare',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this&&Array.isArray(this.targets)&&this.targets.length===2&&typeof this.stampPass==="function"&&this.uniforms?.uTrample)window.__nativeTrample=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const {THREE,GRASS_QUALITY}=await import(${JSON.stringify(origin)}+'/@floor-proof-env'),T=window.tervain,R=T.renderer,native=window.__nativeTrample;if(!native)throw Error('Native trample missing');
const models={native:{GrassTrample:native.constructor}};for(const mode of ['original','before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const x=18,z=20,y=T.world.terrain.heightAt(x,z),focus=new THREE.Vector3(x,y,z);T.cam.camera.position.set(x,y+1.8,z-3);T.cam.camera.lookAt(x,y+.3,z+4);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,focus,T.settings,11,T.cam.camera,false);T.lastFrameDt=0;for(let i=0;i<3;i++)T.renderWorld();
const gl=R.getContext(),locations=new WeakMap(),getLocation=gl.getUniformLocation,upload4=gl.uniform4fv,upload2=gl.uniform2fv;let activeUploads=null;
const nativeProperties=R.properties.get(native.stepMaterial);for(const program of new Set([nativeProperties.currentProgram,...(nativeProperties.programs?.values()??[])])){if(!program)continue;const map=program.getUniforms().map;for(const name of ['uMovers','uMoverVel'])if(map[name]?.addr)locations.set(map[name].addr,name);}
gl.getUniformLocation=function(program,name){const loc=getLocation.call(this,program,name);if(loc)locations.set(loc,name);return loc;};
const bytes=(data,offset=0,length)=>4*(length??data.length-offset);
gl.uniform4fv=function(loc,data,...rest){if(activeUploads&&/^uMovers(?:\\[0\\])?$/.test(locations.get(loc)??'')){activeUploads.moverBytes+=bytes(data,...rest);activeUploads.calls++;}return upload4.call(this,loc,data,...rest);};
gl.uniform2fv=function(loc,data,...rest){if(activeUploads&&/^uMoverVel(?:\\[0\\])?$/.test(locations.get(loc)??'')){activeUploads.velocityBytes+=bytes(data,...rest);activeUploads.calls++;}return upload2.call(this,loc,data,...rest);};
const bodies=native.movers.map(m=>({...m}));if(!bodies.length||bodies.some(m=>!(m.radius>0)))throw Error('Native movers missing');const oldTexture=native.uniforms.tTrample.value,oldField=native.uniforms.uTrample.value.clone(),oldTarget=R.getRenderTarget(),rows={},counts={},images={};let nativePassHash,nativePixelsHash;
try{for(const mode of ['native','before','after']){const field=new models[mode].GrassTrample(native.size,native.extent),passes=[],pixels=[],oldPass=field.pass;
if(mode==='native'){const original=new models.original.GrassTrample(native.size,native.extent);try{if(original.stepMaterial.fragmentShader!==native.stepMaterial.fragmentShader)throw Error('Native step shader differs');}finally{original.dispose();}}
field.pass=function(renderer,material,target){passes.push({shift:material.uniforms.uShift.value.toArray(),count:material.uniforms.uMoverCount?.value??null,keep:material.uniforms.uKeep?.value.toArray()??null});return oldPass.call(this,renderer,material,target);};
try{
const uploads={moverBytes:0,velocityBytes:0,calls:0};activeUploads=uploads;
for(let frame=0;frame<60;frame++){const px=x+frame*.08,pz=z+Math.sin(frame*.06);field.setMovers([{...bodies[0],x:px,z:pz,vx:4.8,vz:Math.cos(frame*.06)*3.6},...bodies.slice(1)],px,pz);if(frame===20)field.queueStamps(Array.from({length:103},(_,i)=>({x:px+(i%10)*.12,z:pz+Math.floor(i/10)*.12,radius:.45,weight:.4})));field.update(R,px,pz,frame===35?.1:1/60);const data=new Uint16Array(field.size*field.size*4);R.readRenderTargetPixels(field.targets[0],0,0,field.size,field.size,data);for(const v of data)pixels.push(v);}
activeUploads=null;
const passHash=await hash(passes.map(({shift,keep})=>({shift,keep}))),pixelsHash=await hash(pixels);if(mode==='native'){nativePassHash=passHash;nativePixelsHash=pixelsHash;}if(passHash!==nativePassHash||pixelsHash!==nativePixelsHash)throw Error('Field replay differs: '+mode);if(!pixels.some((v,i)=>i%4!==3&&v!==0))throw Error('Empty interaction field');rows[mode]={uploads,activeCounts:passes.filter(p=>p.count!==null).map(p=>p.count),updates:60,passes:passes.length,shiftPasses:passes.filter(p=>p.keep===null).length,moverRecords:passes.reduce((n,p)=>n+(p.count??0),0),maxMovers:passes.reduce((n,p)=>Math.max(n,p.count??0),0),passSequenceSha256:passHash,allFrameFieldSha256:pixelsHash};
if(${args.images!=='0'}){native.uniforms.tTrample.value=field.uniforms.tTrample.value;native.uniforms.uTrample.value.copy(field.uniforms.uTrample.value);const oldPrepare=T.world.prepareGrass;try{T.world.prepareGrass=()=>{};T.grade.render(T.world.scene,T.cam.camera,0);R.info.reset();T.grade.render(T.world.scene,T.cam.camera,0);if(native.uniforms.tTrample.value!==field.uniforms.tTrample.value)throw Error('Replay field overwritten');rows[mode].drawCalls=R.info.render.calls;rows[mode].triangles=R.info.render.triangles;images[mode]=R.domElement.toDataURL('image/png');}finally{T.world.prepareGrass=oldPrepare;}}
}finally{activeUploads=null;native.uniforms.tTrample.value=oldTexture;native.uniforms.uTrample.value.copy(oldField);field.dispose();}}
for(const n of [0,1,48]){counts[n]={};for(const mode of ['before','after']){const field=new models[mode].GrassTrample(native.size,native.extent);try{const inputs=Array.from({length:n},(_,i)=>({x:x+i*.01,z,radius:.55,weight:.75,vx:.2,vz:.1}));field.setMovers(inputs,x,z);activeUploads={moverBytes:0,velocityBytes:0,calls:0};field.update(R,x,z,1/30);const uploads=activeUploads;activeUploads=null;const data=new Uint16Array(field.size*field.size*4);R.readRenderTargetPixels(field.targets[0],0,0,field.size,field.size,data);counts[n][mode]={submittedMovers:field.stepMaterial.uniforms.uMoverCount.value,uploads,fieldSha256:await hash(Array.from(data))};}finally{activeUploads=null;field.dispose();}}}
}finally{activeUploads=null;gl.getUniformLocation=getLocation;gl.uniform4fv=upload4;gl.uniform2fv=upload2;native.uniforms.tTrample.value=oldTexture;native.uniforms.uTrample.value.copy(oldField);R.setRenderTarget(oldTarget);}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),quality:'low',position:{x,y,z},size:native.size,extent:native.extent,nativeMoverCount:bodies.length,rows,counts,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;report.changedChannels={};if(args.images!=='0'){const p=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));for(const [i,k]of [[1,'before'],[2,'after']])report.changedChannels[k]=p[0].reduce((n,v,j)=>n+Number(v!==p[i][j]),0);}
report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));report.scope='Published native mover snapshot and field; native original, parent and candidate replay 60 updates including walking, scrolling, a 103-stamp burst and catch-up. Exact half-float fields and pass sequence must match. Intercept actual WebGL uniform4fv/uMovers and uniform2fv/uMoverVel payloads for the source-model passes; Cached published-program uniform locations are seeded from the native material, so native-original payloads are tracked too. Controlled 0/1/48-mover cases check both empty and full capacity. Bytes are WebGL API uniform payload bytes, not driver memory traffic or hardware time.';
const a=report.rows.before,b=report.rows.after;
report.pass=report.rows.native.uploads.moverBytes>0&&report.rows.native.uploads.velocityBytes>0&&a.uploads.moverBytes>0&&a.uploads.velocityBytes>0&&b.uploads.moverBytes<a.uploads.moverBytes&&b.uploads.velocityBytes<a.uploads.velocityBytes&&a.uploads.calls===b.uploads.calls&&JSON.stringify(a.activeCounts)===JSON.stringify(b.activeCounts)&&b.shiftPasses>0&&['before','after'].every(k=>report.rows[k].allFrameFieldSha256===report.rows.native.allFrameFieldSha256&&report.rows[k].passSequenceSha256===report.rows.native.passSequenceSha256)&&Object.entries(report.counts).every(([n,p])=>p.before.submittedMovers===Number(n)&&p.after.submittedMovers===Number(n)&&p.before.fieldSha256===p.after.fieldSha256&&p.before.uploads.moverBytes+p.before.uploads.velocityBytes===48*24&&p.after.uploads.moverBytes+p.after.uploads.velocityBytes===Math.max(1,Number(n))*24)&&(args.images==='0'||Object.values(report.changedChannels).every(n=>n===0)&&['before','after'].every(k=>report.rows[k].drawCalls===report.rows.native.drawCalls&&report.rows[k].triangles===report.rows.native.triangles));
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
