import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-trample-distance-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/grass/trample.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
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
const models={native:{GrassTrample:native.constructor}};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const x=18,z=20,y=T.world.terrain.heightAt(x,z),focus=new THREE.Vector3(x,y,z);T.cam.camera.position.set(x,y+1.8,z-3);T.cam.camera.lookAt(x,y+.3,z+4);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,focus,T.settings,11,T.cam.camera,false);T.lastFrameDt=0;for(let i=0;i<3;i++)T.renderWorld();
const bodies=native.movers.map(m=>({...m}));if(!bodies.length||bodies.some(m=>!(m.radius>0)))throw Error('Native movers missing');const oldTexture=native.uniforms.tTrample.value,oldField=native.uniforms.uTrample.value.clone(),oldTarget=R.getRenderTarget(),rows={},counts={},images={};let nativePassHash,nativePixelsHash;
try{for(const mode of ['native','before','after']){const field=new models[mode].GrassTrample(native.size,native.extent),passes=[],pixels=[],oldPass=field.pass;
if(mode==='before'&&field.stepMaterial.fragmentShader!==native.stepMaterial.fragmentShader)throw Error('Native step shader differs');
field.pass=function(renderer,material,target){passes.push({shift:material.uniforms.uShift.value.toArray(),count:material.uniforms.uMoverCount?.value??null,keep:material.uniforms.uKeep?.value.toArray()??null});return oldPass.call(this,renderer,material,target);};
try{
for(let frame=0;frame<60;frame++){const px=x+frame*.08,pz=z+Math.sin(frame*.06);field.setMovers([{...bodies[0],x:px,z:pz,vx:4.8,vz:Math.cos(frame*.06)*3.6},...bodies.slice(1)],px,pz);if(frame===20)field.queueStamps(Array.from({length:103},(_,i)=>({x:px+(i%10)*.12,z:pz+Math.floor(i/10)*.12,radius:.45,weight:.4})));field.update(R,px,pz,frame===35?.1:1/60);const data=new Uint16Array(field.size*field.size*4);R.readRenderTargetPixels(field.targets[0],0,0,field.size,field.size,data);for(const v of data)pixels.push(v);}
const passHash=await hash(passes),pixelsHash=await hash(pixels);if(mode==='native'){nativePassHash=passHash;nativePixelsHash=pixelsHash;}if(passHash!==nativePassHash||pixelsHash!==nativePixelsHash)throw Error('Field replay differs: '+mode);if(!pixels.some((v,i)=>i%4!==3&&v!==0))throw Error('Empty interaction field');rows[mode]={updates:60,passes:passes.length,passSequenceSha256:passHash,allFrameFieldSha256:pixelsHash};
if(${args.images!=='0'}){native.uniforms.tTrample.value=field.uniforms.tTrample.value;native.uniforms.uTrample.value.copy(field.uniforms.uTrample.value);const oldPrepare=T.world.prepareGrass;try{T.world.prepareGrass=()=>{};T.grade.render(T.world.scene,T.cam.camera,0);R.info.reset();T.grade.render(T.world.scene,T.cam.camera,0);if(native.uniforms.tTrample.value!==field.uniforms.tTrample.value)throw Error('Replay field overwritten');rows[mode].drawCalls=R.info.render.calls;rows[mode].triangles=R.info.render.triangles;images[mode]=R.domElement.toDataURL('image/png');}finally{T.world.prepareGrass=oldPrepare;}}
}finally{native.uniforms.tTrample.value=oldTexture;native.uniforms.uTrample.value.copy(oldField);field.dispose();}}
for(const [profile,spec]of Object.entries({native:{size:native.size,extent:native.extent},high:GRASS_QUALITY.high.trample})){counts[profile]={};for(const mode of ['before','after']){const field=new models[mode].GrassTrample(spec.size,spec.extent);try{field.setMovers(bodies,x,z);field.update(R,x,z,1/30);const material=field.stepMaterial.clone();let fragment=material.fragmentShader.replace('float dist = length(d);','float dist = proofDistance(d);').replace('void main() {','float proofCalls;float proofDistance(vec2 d){proofCalls+=1.;return length(d);}void main() {proofCalls=0.;').replace('gl_FragColor = vec4(push, lying, 1.0);','gl_FragColor = vec4(proofCalls,0.,0.,1.);');if(!fragment.includes('float dist = proofDistance(d);'))throw Error('Distance counter patch missing');material.fragmentShader=fragment;material.needsUpdate=true;const old=field.quad.material;field.quad.material=material;const rt=new THREE.WebGLRenderTarget(spec.size,spec.size,{type:THREE.FloatType,depthBuffer:false});try{R.setRenderTarget(rt);R.render(field.scene,field.camera);const data=new Float32Array(spec.size*spec.size*4);R.readRenderTargetPixels(rt,0,0,spec.size,spec.size,data);let calls=0;for(let i=0;i<data.length;i+=4){if(data[i+3]!==1)throw Error('Incomplete counter capture');calls+=data[i];}const fieldData=new Uint16Array(spec.size*spec.size*4);R.readRenderTargetPixels(field.targets[0],0,0,spec.size,spec.size,fieldData);counts[profile][mode]={size:spec.size,extent:spec.extent,movers:bodies.length,distanceCalls:calls,fieldSha256:await hash(Array.from(fieldData)),nonzeroChannels:Array.from(fieldData).filter((v,i)=>i%4!==3&&v!==0).length};}finally{field.quad.material=old;rt.dispose();material.dispose();}}finally{field.dispose();}}}
}finally{native.uniforms.tTrample.value=oldTexture;native.uniforms.uTrample.value.copy(oldField);R.setRenderTarget(oldTarget);}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),quality:'low',position:{x,y,z},size:native.size,extent:native.extent,nativeMoverCount:bodies.length,rows,counts,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;report.changedChannels={};if(args.images!=='0'){const p=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));for(const [i,k]of [[1,'before'],[2,'after']])report.changedChannels[k]=p[0].reduce((n,v,j)=>n+Number(v!==p[i][j]),0);}
report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));report.scope='Native published field class, size, extent and mover snapshot. Native/baseline/candidate 60-update scripted walking replay includes a brush burst, field scroll and catch-up; exact half-float bytes checked at every update. Endpoint images bind the replay field into native post rendering with auxiliary captures frozen. Separate float counter draws count logical GLSL distance calls across every field texel. High is a controlled High-sized field in the same Low world, not a High scene or hardware timing.';
report.pass=Object.values(report.counts).every(p=>p.before.distanceCalls===p.before.size*p.before.size*p.before.movers&&p.after.distanceCalls<p.before.distanceCalls&&p.after.distanceCalls>0&&p.after.nonzeroChannels>0&&p.before.fieldSha256===p.after.fieldSha256)&&['before','after'].every(k=>report.rows[k].allFrameFieldSha256===report.rows.native.allFrameFieldSha256&&report.rows[k].passSequenceSha256===report.rows.native.passSequenceSha256)&&(args.images==='0'||Object.values(report.changedChannels).every(n=>n===0)&&['before','after'].every(k=>report.rows[k].drawCalls===report.rows.native.drawCalls&&report.rows[k].triangles===report.rows.native.triangles));
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
