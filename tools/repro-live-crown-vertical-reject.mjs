import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'crown-vertical-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/cameraCrowns.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/cameraCrowns.ts','utf8')};
const rigSource=execFileSync('git',['show','421d34b:src/presentation/cameraRig.ts'],{encoding:'utf8'}),modules={};
for(const[mode,source]of Object.entries(sources)){
 const needle='function inCore(c: CameraCrown, x: number, y: number, z: number): boolean {';
 let code=source.replace(needle,needle+'\n  proof.coreTests++;');
 const result='return Math.max(Math.min(boom, CROWN_MIN_BOOM), allowed);';
 if(!code.includes(result)||!source.includes(needle))throw Error('Crown instrumentation sites missing');
 code=code.replace(result,'const result=Math.max(Math.min(boom, CROWN_MIN_BOOM), allowed);proof.booms.push(result);return result;');
 modules[mode]=(await transformWithOxc(code+'\nexport const proof={coreTests:0,booms:[] as number[]};','cameraCrowns.ts')).code;
 modules[mode+'-rig']=(await transformWithOxc(rigSource,'cameraRig.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`).replaceAll("'/src/presentation/cameraCrowns'",`'/@vertical-proof-${mode}'`)+`\nexport { proof as helperProof } from '/@vertical-proof-${mode}';`;
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-crown-vertical-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'vertical-proof',resolveId(id){if(id.startsWith('/@vertical-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@vertical-proof-'))return modules[id.slice('\0/@vertical-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const name of Object.keys(modules)){const r=await fetch(origin+'/@vertical-proof-'+name);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,native=T.cam,query=native.crowns,models={},rigs={};
for(const mode of ['before','after']){models[mode]=await import(${JSON.stringify(origin)}+'/@vertical-proof-'+mode);rigs[mode]=await import(${JSON.stringify(origin)}+'/@vertical-proof-'+mode+'-rig');}
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const routes=[{name:'walk-fence',x:-2,z:34.6,dx:0,dz:4.9},{name:'forest-resume',x:-268,z:27,dx:8,dz:5},{name:'grove',x:-180,z:12,dx:12,dz:5}];
const policies={},images={};let nativeStates;
try{
 for(const policy of ['published','individual-reach']){
  const rows={};policies[policy]=rows;
  for(const mode of policy==='published'?['native','before','after']:['before','after']){
   const cam=mode==='native'?native:new rigs[mode].CameraRig();cam.setAspect(native.camera.aspect);T.cam=cam;
   let returned=0;const states=[],perRoute=[];
   if(mode!=='native'){rigs[mode].helperProof.coreTests=0;rigs[mode].helperProof.booms.length=0;}
   cam.crowns=(x,z,r)=>{const all=Array.from(query(x,z,r)),found=policy==='published'?all:all.filter(c=>Math.hypot(c.x-x,c.z-z)<=r+c.h);returned+=found.length;return found;};
   for(const route of routes){
    const countStart=returned,coreStart=mode==='native'?0:rigs[mode].helperProof.coreTests;
    cam.wantDist=6.2;cam.yaw=0;cam.pitch=.32;cam.reset();
    for(let i=0;i<120;i++){
     const x=route.x+route.dx*i/119,z=route.z+route.dz*i/119;cam.yaw=i*.05;cam.pitch=.32+.55*Math.sin(i*Math.PI/119);
     cam.follow(1/60,x,T.world.terrain.groundAt(x,z),z,T.world.terrain,T.world.colliders,true,0);cam.camera.updateMatrixWorld(true);
     states.push([...cam.camera.position.toArray(),...cam.camera.quaternion.toArray(),cam.curDist,cam.bodyVisible]);
    }
    perRoute.push({name:route.name,frames:120,returnedCrowns:returned-countStart,coreTests:mode==='native'?null:rigs[mode].helperProof.coreTests-coreStart});
   }
   if(mode!=='native'&&rigs[mode].helperProof.booms.length!==states.length)throw Error('Crown helper not wired to component');
   if(mode==='native')nativeStates=JSON.stringify(states);
   const row=rows[mode]={frames:states.length,returnedCrowns:returned,coreTests:mode==='native'?null:rigs[mode].helperProof.coreTests,
    nativeCameraMatches:JSON.stringify(states)===nativeStates,cameraSha256:await hash(states),boomSha256:mode==='native'?null:await hash(rigs[mode].helperProof.booms),perRoute};
   if(policy==='published'){
    T.world.update(0,T.game.state,T.player.group.position,T.settings,11,cam.camera,false);T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
    row.drawCalls=T.renderer.info.render.calls;row.triangles=T.renderer.info.render.triangles;row.textureCount=T.renderer.info.memory.textures;
    images[mode]=T.renderer.domElement.toDataURL('image/png');
   }
  }
 }
}finally{T.cam=native;native.crowns=query;}
let seed=34991;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);let syntheticMatches=true,shortened=0;
for(let i=0;i<1000;i++){
 const pivot={x:(rand()-.5)*500,y:rand()*40,z:(rand()-.5)*300},yaw=rand()*Math.PI*2,pitch=(rand()-.5)*2.6,boom=.04+rand()*14;
 const dir={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)};
 const crowns=Array.from({length:8},()=>({x:pivot.x+(rand()-.5)*24,y:pivot.y+(rand()-.5)*36,z:pivot.z+(rand()-.5)*24,h:.1+rand()*15,v:.1+rand()*12,floor:pivot.y+(rand()-.5)*14}));
 const a=models.before.crownBoom(pivot,dir,boom,crowns),b=models.after.crownBoom(pivot,dir,boom,crowns);if(a<boom)shortened++;if(a!==b)syntheticMatches=false;
}
return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),policies,images,synthetic:{cases:1000,shortened,matches:syntheticMatches}};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));
 report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Native published terrain/colliders/crown query and full reconstructed CameraRig components, importing the actual baseline/candidate crown helper. Before and after execute helper inside follow(), not a separate replay of its return value. 360 terrain-following turn/look-up updates per arm; native camera is the control. Both published query policy and the separate individual-reach filter tested. Count-only helper instrumentation; native Grade/post images; no hardware timing claim.';
 report.pass=report.synthetic.matches&&report.synthetic.shortened>0&&report.identicalPixels&&Object.values(report.policies).every(rows=>rows.before.nativeCameraMatches&&rows.after.nativeCameraMatches&&rows.before.cameraSha256===rows.after.cameraSha256&&rows.before.boomSha256===rows.after.boomSha256&&rows.before.coreTests>rows.after.coreTests&&rows.before.returnedCrowns===rows.after.returnedCrowns);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
