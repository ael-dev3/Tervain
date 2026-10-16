import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'floor-footprint-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/forestFloor.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source;
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="forest").module.initializeFloor',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this?.terrain===window.tervain.world.terrain&&typeof this.excl?.blocked==="function"&&typeof this.plantedCrowns?.coverAt==="function")window.__floorContext=this;if(Array.isArray(this)&&this.length&&this.every(t=>t&&typeof t.sp==="string"&&Number.isFinite(t.s)&&Number.isFinite(t.radius))&&this.length>(window.__floorTrees?.length??0))window.__floorTrees=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const T=window.tervain,C=window.__floorContext,trees=window.__floorTrees;if(!C||!trees)throw Error('Native floor inputs missing');
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const F=T.world.modules.find(m=>m.name==='forest').module;
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
const nativeFloor=F.group.getObjectByName('deepwood_forest_floor');if(!nativeFloor)throw Error('Native floor missing');
T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
const images={native:T.renderer.domElement.toDataURL('image/png')},rows={};let baseline;
for(const mode of ['before','after']){const m=models[mode];let sinCalls=0,cosCalls=0;const originalSin=Math.sin,originalCos=Math.cos;let population;try{Math.sin=function(...args){sinCalls++;return originalSin.apply(this,args);};Math.cos=function(...args){cosCalls++;return originalCos.apply(this,args);};population=m.createForestFloorPopulation(T.world.terrain,C.excl,trees,C.plantedCrowns);}finally{Math.sin=originalSin;Math.cos=originalCos;}
const selections=Object.fromEntries(['low','medium','high'].map(q=>[q,m.selectForestFloorPopulation(population,q)]));
const bytes=JSON.stringify({population,selections});if(mode==='before')baseline=bytes;
rows[mode]={sinCalls,cosCalls,pieces:population.length,selections:Object.fromEntries(Object.entries(selections).map(([q,p])=>[q,p.length])),populationAndSelectionsSha256:await hash({population,selections}),matchesBaseline:bytes===baseline};
let rebuilt;try{nativeFloor.visible=false;rebuilt=m.buildForestFloor(T.world.terrain,C.excl,T.settings.quality,trees,C.plantedCrowns,C.foliage);F.group.add(rebuilt.group);rebuilt.update(0,{camera:T.cam.camera});
T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;images[mode]=T.renderer.domElement.toDataURL('image/png');
}finally{rebuilt?.group.removeFromParent();rebuilt?.dispose();nativeFloor.visible=true;}
}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),trees:trees.length,images,nativeSelectedPieces:T.world.modules.find(m=>m.name==='forest').module.stats().forestFloorPieces,rows};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Replay actual baseline/candidate forest-floor population builders with the published world terrain, retained canonical tree population, exclusion object and planted crown field. Compare every piece property and all quality selections. Count actual Math.sin/Math.cos calls during one native population build, restoring both functions before rendering; module initialization is outside the count. Rebuild baseline/candidate floor modules in the native scene, preserving other modules and native post/MSAA rendering; require equality to original native pixels. No hardware timing claim.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.sinCalls>b.sinCalls&&a.cosCalls>b.cosCalls&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles&&b.matchesBaseline&&a.pieces>0&&b.selections.low===report.nativeSelectedPieces;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
