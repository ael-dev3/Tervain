import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-gust-helper-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/grass/wind.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source.replace('const at = (i: number, j: number) => lattice', 'window.__noiseHelpers++; const at = (i: number, j: number) => lattice');
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/grass',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,wind=T.world.modules.find(m=>m.name==='groundcover').module.wind,texture=wind.uniforms.tGust.value,nativeData=texture.image.data;if(!(nativeData instanceof Uint8Array))throw Error('Native gust texture data missing');
const original=nativeData.slice(),models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(b=>b.toString(16).padStart(2,'0')).join('');
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
const images={native:T.renderer.domElement.toDataURL('image/png')},rows={};
try{for(const mode of ['before','after']){
 window.__noiseHelpers=0;const data=models[mode].gustField(),helperDefinitions=window.__noiseHelpers;
 if(data.length!==original.length||!data.every((v,i)=>v===original[i]))throw Error(mode+' differs from native gust texture');
 const cached=models[mode].gustField();if(cached!==data||window.__noiseHelpers!==helperDefinitions)throw Error('Warm gust cache regressed');
 rows[mode]={helperDefinitions,bytes:data.length,dataSha256:await hash(data),matchesNative:true,sameCachedObject:cached===data,warmHelperDefinitions:window.__noiseHelpers-helperDefinitions};
 nativeData.set(data);texture.needsUpdate=true;T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
 rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;images[mode]=T.renderer.domElement.toDataURL('image/png');
}}finally{nativeData.set(original);texture.needsUpdate=true;}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),nativeTextureSha256:await hash(original),textureWidth:texture.image.width,textureHeight:texture.image.height,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Fresh actual baseline/candidate gustField generation compared byte-for-byte to the published native wind texture. Count lattice lookup helper definition-site executions, not measured heap/GC or hardware timing. Re-upload each generated field into the native grass/foliage wind texture and compare full-scene post/MSAA pixels; restore original data afterward. Verify warm calls reuse the same cached field without new helper definitions.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.helperDefinitions===98304&&b.helperDefinitions===6&&a.matchesNative&&b.matchesNative&&a.sameCachedObject&&b.sameCachedObject&&a.warmHelperDefinitions===0&&b.warmHelperDefinitions===0&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles&&a.textureCount===b.textureCount;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
