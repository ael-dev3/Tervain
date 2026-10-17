import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out = args.out ?? 'grass-slope-clear-proof'; fs.mkdirSync(out,{recursive:true}); fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/ground/tileStream.ts', fieldFile='src/presentation/grass/grassField.ts';
const candidate = f => args['candidate-ref'] ? execFileSync('git',['show',args['candidate-ref']+':'+f],{encoding:'utf8'}) : fs.readFileSync(f,'utf8');
const sources={before:execFileSync('git',['show','95adda3ed:'+file],{encoding:'utf8'}),after:candidate(file)}, fieldSource=candidate(fieldFile), writesSlope=/\bwritesSlope:\s*true\b/.test(fieldSource),modules={};
for(const[mode,source]of Object.entries(sources)) modules[mode]=(await transformWithOxc(source,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
const cache=fs.mkdtempSync(path.join(tmpdir(),'grass-slope-clear-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'slope-clear',resolveId(id){if(id.startsWith('/@slope-clear-'))return '\0'+id;},load(id){if(id==='\0/@slope-clear-env')return "export * as THREE from 'three';";if(id.startsWith('\0/@slope-clear-'))return modules[id.slice('\0/@slope-clear-'.length)];}}]});
let page;
try{
 await server.listen(); const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.groundcover.update',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Groundcover scopes missing');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 search:for(const scope of scopes){if(!scope.value?.objectId)continue;const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(Array.isArray(this?.layers)&&this.layers.length===2&&this.layers.every(l=>typeof l.o?.generate==="function"))window.__slopeClearField=this;}',returnByValue:true});
   if(await page.eval('return !!window.__slopeClearField;'))break search;
  }
 }
 const report=await page.eval(`
 const {THREE}=await import(${JSON.stringify(origin)}+'/@slope-clear-env'),models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@slope-clear-'+mode);
 const T=window.tervain,G=T.world.groundcover,F=window.__slopeClearField;if(!F)throw Error('Native grass generators unavailable');
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const x=18,z=20,y=T.world.terrain.heightAt(x,z),focus=new THREE.Vector3(x,y,z),cam=T.cam.camera;
 cam.position.set(x,y+1.8,z-3);cam.lookAt(x,y+.3,z+4);cam.updateMatrixWorld(true);G.update(0,{camera:cam,focus,reducedMotion:true});T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderWorld();
 const rows={},images={},cost={},coverage=[];
 for(const native of F.layers){const o=native.o, tx=Math.floor(cam.position.x/o.tileSize),tz=Math.floor(cam.position.z/o.tileSize);
  for(const [dx,dz] of [[0,0],[1,0],[0,1],[-1,-1]]){const make=fill=>({base:new Float32Array(o.capacity*4),shape:new Float32Array(o.capacity*4),tint:new Float32Array(o.capacity*4),slope:new Float32Array(o.capacity*4).fill(fill),ymin:Infinity,ymax:-Infinity}),a=make(0),b=make(NaN),na=o.generate(tx+dx,tz+dz,a),nb=o.generate(tx+dx,tz+dz,b);coverage.push({layer:o.name,tile:[tx+dx,tz+dz],count:na,allSlopeWritten:na===nb&&Array.from(b.slope.subarray(0,nb*4)).every(Number.isFinite),equalPrefix:await hash(Array.from(a.slope.subarray(0,na*4)))===await hash(Array.from(b.slope.subarray(0,nb*4)))});}
 }
 const nativeImage=T.renderer.domElement.toDataURL('image/png');
 try{G.group.visible=false;
  for(const mode of ['before','after']){const group=new THREE.Group(),layers=[],metrics={clearCalls:0,clearedFloats:0,fills:0,accepted:0,frames:[]};T.world.scene.add(group);
   try{for(const native of F.layers){const options={...native.o,geometry:native.o.geometry.clone(),writesSlope:mode==='after'&&${writesSlope}},generate=options.generate;options.generate=(...a)=>{metrics.fills++;const n=generate(...a);metrics.accepted+=n;return n;};const layer=new models[mode].TileLayer(options),slope=layer.buf.slope,fill=slope.fill;slope.fill=function(...a){metrics.clearCalls++;metrics.clearedFloats+=this.length;return fill.apply(this,a);};layers.push(layer);group.add(layer.group);}
    for(const [dx,dz]of [[0,0],[13,0],[26,12],[0,0]]){const c=cam.position.clone().add(new THREE.Vector3(dx,0,dz));for(const layer of layers)layer.update(c,{remaining:2});metrics.frames.push(await hash(layers.map(layer=>Array.from(layer.tiles.values(),tile=>({key:tile.key,count:tile.count,instances:tile.geo.instanceCount,drawRange:tile.geo.drawRange,bounds:tile.geo.boundingSphere,attributes:Object.fromEntries(['aBase','aShape','aTint','aSlope'].map(name=>[name,Array.from(tile.geo.getAttribute(name).array)]))})))));}
    group.updateMatrixWorld(true);
    if(${args.images!=='0'}){T.renderer.info.reset();T.grade.render(T.world.scene,cam,0);cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};images[mode]=T.renderer.domElement.toDataURL('image/png');}
    rows[mode]=metrics;
   }finally{group.removeFromParent();for(const layer of layers){layer.o.material=new THREE.MeshBasicMaterial();layer.dispose();}}
  }
 }finally{G.group.visible=true;}
 if(${args.images!=='0'})images.native=nativeImage;
 return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),quality:'low',focus:[x,y,z],writesSlope:${writesSlope},coverage,rows,images,cost};
 `);
 for(const[name,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 if(args.images!=='0'){const p=await Promise.all(['native','before','after'].map(m=>sharp(path.join(out,m+'.png')).raw().toBuffer()));report.nativeChangedChannels=p[0].reduce((n,v,i)=>n+Number(v!==p[1][i]),0);report.changedChannels=p[1].reduce((n,v,i)=>n+Number(v!==p[2][i]),0);}
 report.sourceSha256=Object.fromEntries(Object.entries({...sources,field:fieldSource}).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Published native Low grass generator closures with their actual terrain, habitat and exclusion inputs. Real TileLayer fills replay four camera positions with deterministic reserve quotas. Compare every retained tile attribute, bound and draw decision, and native post-rendered scene pixels. NaN-poisoned scratch controls check that native generators write the accepted slope prefix. Clear counts measure CPU float writes, not upload bytes or hardware time.';
 const a=report.rows.before,b=report.rows.after;report.pass=report.writesSlope&&a.clearCalls>0&&b.clearCalls===0&&a.fills===b.fills&&a.accepted===b.accepted&&a.accepted>0&&JSON.stringify(a.frames)===JSON.stringify(b.frames)&&report.coverage.every(c=>c.allSlopeWritten&&c.equalPrefix)&&report.coverage.some(c=>c.count>0)&&(args.images==='0'||report.nativeChangedChannels===0&&report.changedChannels===0&&JSON.stringify(report.cost.before)===JSON.stringify(report.cost.after));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
