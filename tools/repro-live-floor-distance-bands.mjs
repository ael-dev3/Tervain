import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'floor-distance-band-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/forestFloor.ts',sources={before:execFileSync('git',['show',(args['baseline-ref']??'d244d39')+':'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source;
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:15,w:492,h:320});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="forest").module.initializeFloor',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this?.group?.name==="deepwood_forest_floor"&&typeof this.update==="function")window.__nativeFloor=this;if(this?.terrain===window.tervain.world.terrain&&typeof this.excl?.blocked==="function"&&typeof this.plantedCrowns?.coverAt==="function")window.__floorContext=this;if(Array.isArray(this)&&this.length&&this.every(t=>t&&typeof t.sp==="string"&&Number.isFinite(t.s)&&Number.isFinite(t.radius))&&this.length>(window.__floorTrees?.length??0))window.__floorTrees=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const T=window.tervain,C=window.__floorContext,trees=window.__floorTrees,N=window.__nativeFloor;
if(!C||!trees||!N)throw Error('Native floor inputs missing');
globalThis.__restoreShadowPartRaster?.();if(globalThis.__tervainCpuNoRaster)throw Error('Native capture must restore raster');
T.frame=()=>{};T.present=()=>{};T.lastFrameDt=0;T.settings.reducedMotion=true;
const R=T.renderer,F=T.world.modules.find(m=>m.name==='forest').module,cam=T.cam.camera;
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const rebuilt={before:models.before.buildForestFloor(T.world.terrain,C.excl,'high',trees,C.plantedCrowns,C.foliage),after:models.after.buildForestFloor(T.world.terrain,C.excl,'high',trees,C.plantedCrowns,C.foliage)};
for(const floor of Object.values(rebuilt)){F.group.add(floor.group);floor.group.visible=false;}
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const snapshot=floor=>floor.group.children.filter(m=>m.isInstancedMesh).map(m=>({name:m.name,count:m.count,matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),coverage:Array.from(m.geometry.getAttribute('aDistanceCoverage').array.slice(0,m.count*2))}));
let sun;T.world.scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)sun=o;});
const frame=()=>({camera:cam,shadowFrustum:sun.shadow.getFrustum()});
const pose=(metres,angle=0)=>{const x=-55-metres,z=70,y=T.world.terrain.heightAt(x,z);T.player.group.position.set(x,y,z);cam.position.set(x+3,Math.max(y+2.2,T.world.terrain.heightAt(x+3,z)+1.5),z);cam.lookAt(x-20,y+1.2,z);cam.rotateY(angle);cam.updateMatrixWorld(true);};
const rows=[],views=[[0,0],[10,0],[20,0],[40,0],[80,0],[0,-.6],[0,.6]];
try{
 for(let i=0;i<views.length;i++){
  pose(...views[i]);T.world.update(0,T.game.state,T.player.group.position,T.settings,15,cam,false);
  const row={pose:views[i],modes:{},images:{}};
  for(const [mode,floor]of [['native',N],...Object.entries(rebuilt)]){
   N.group.visible=mode==='native';for(const [k,b]of Object.entries(rebuilt))b.group.visible=k===mode;
   const original=Math.hypot;let hypotCalls=0;
   try{Math.hypot=function(...a){hypotCalls++;return original(...a);};
    // Force the same pose invalidation in each module; native was already updated by the world.
    cam.position.x+=.001;floor.update(0,frame());cam.position.x-=.001;hypotCalls=0;floor.update(0,frame());
   }finally{Math.hypot=original;}
   const buffers=await hash(snapshot(floor));
   R.info.reset();T.renderWorld();R.info.reset();T.renderWorld();
   row.modes[mode]={hypotCalls,buffers,...floor.stats(),calls:R.info.render.calls,triangles:R.info.render.triangles};row.images[mode]=R.domElement.toDataURL('image/png');
  }
  rows.push(row);
 }
 for(const floor of Object.values(rebuilt))floor.group.visible=false;N.group.visible=false;
 const cpu=[],order=['before','before','after','after','after','before','after','before'];
 const cursors={before:0,after:0};
 for(const mode of ['before','after'])for(let i=0;i<1200;i++){pose((i%600)/600*80);rebuilt[mode].update(0,frame());}
 for(const mode of order){const times=[];for(let i=0;i<1500;i++){const j=cursors[mode]++;pose((j%600)/600*80);const begin=performance.now();rebuilt[mode].update(0,frame());times.push(performance.now()-begin);}cpu.push({mode,times});}
 const build=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
 return {build,rows,cpu,scope:'Published world inputs and native floor vs original/candidate rebuilt modules; High frozen native post/MSAA at seven poses. CPU separately times only floor.update over the same repeated 80 m camera path, not complete game-frame or GPU cost.'};
}finally{for(const floor of Object.values(rebuilt)){floor.group.removeFromParent();floor.dispose();}N.group.visible=true;}
`);
 let pass=true;
 for(const [i,row]of report.rows.entries()){
  const pixels=[];for(const mode of ['native','before','after']){const file=path.join(out,`${i}-${mode}.png`);fs.writeFileSync(file,Buffer.from(row.images[mode].split(',')[1],'base64'));pixels.push(await sharp(file).raw().toBuffer());}delete row.images;
  row.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
  const {native:n,before:a,after:b}=row.modes;
  row.pass=row.identicalPixels&&n.buffers===a.buffers&&a.buffers===b.buffers&&n.hypotCalls===a.hypotCalls&&b.hypotCalls<a.hypotCalls&&n.calls===a.calls&&a.calls===b.calls&&n.triangles===a.triangles&&a.triangles===b.triangles;
  pass&&=row.pass;console.log(JSON.stringify(row));
 }
 const quantile=(a,q)=>a.toSorted((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*q))];
 report.cpuSummary=Object.fromEntries(['before','after'].map(mode=>{const rows=report.cpu.filter(r=>r.mode===mode).flatMap(r=>r.times);return[mode,{frames:rows.length,average:rows.reduce((a,b)=>a+b,0)/rows.length,p95:quantile(rows,.95)}];}));
 report.errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));
 report.pass=pass&&report.errors.length===0;report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,cpuSummary:report.cpuSummary,errors:report.errors}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
