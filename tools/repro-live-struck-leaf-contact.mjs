import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'struck-leaf-contact-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/foliage/leafBurst.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source.replace('  return {\n    mesh,','  window.__proofLeaves=leaves;\n  return {\n    mesh,');if(instrumented===source)throw Error('Leaf state exposure missing');
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/foliage',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id==='\0/@floor-proof-env')return "export * as THREE from 'three';";if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');url.searchParams.set('motion','1');page=await liveProofPage(url.href,{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="forest").module.strike',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 searchScopes:for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   const found=await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this?.mesh?.name==="struck-tree-leaves"&&typeof this.release==="function"&&typeof this.update==="function"){window.__nativeBurst=this;return true;}return false;}',returnByValue:true});if(found.result?.result?.value===true)break searchScopes;
  }
 }
 const report=await page.eval(`
const{THREE}=await import(${JSON.stringify(origin)}+'/@floor-proof-env'),T=window.tervain,R=T.renderer,F=T.world.modules.find(m=>m.name==='forest').module,native=window.__nativeBurst,target=F.canopyAuditTargets(0).find(t=>t.label==='tree:wild:40:42');if(!native||!target)throw Error('Native strike or oak missing');if(native.active!==0)throw Error('Native burst already active');
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const oldRelease=native.release,e=target.matrix.elements;let releaseArgs,released;try{native.release=function(...a){releaseArgs=a;released=oldRelease.apply(this,a);return released;};if(!F.strike(e[12]+.1,T.world.terrain.heightAt(e[12],e[14])+1.5,e[14],1,target.label)||!releaseArgs||!(released>0))throw Error('Native tree strike released no leaves');}finally{native.release=oldRelease;}
const bursts={},states={},rows={},matrix=new THREE.Matrix4(),vertex=new THREE.Vector3(),geometry=native.mesh.geometry.getAttribute('position'),snapshots={},images={},cost={};let frame=0,worst=0,worstFrame=-1,airborneMatrices=0,paused=false;
try{for(const mode of ['before','after']){rows[mode]={groundedVertexObservations:0,penetratingVertices:0,minGap:Infinity,terrainQueries:0,pausedQueries:null};const terrain={heightAt(x,z){rows[mode].terrainQueries++;return T.world.terrain.heightAt(x,z);}};bursts[mode]=models[mode].createLeafBurst(terrain,T.world.foliage.wind,7177,false);states[mode]=window.__proofLeaves;if(JSON.stringify(Array.from(bursts[mode].mesh.geometry.getAttribute('position').array))!==JSON.stringify(Array.from(geometry.array)))throw Error('Leaf geometry differs from native');if(bursts[mode].release(...releaseArgs)!==released)throw Error('Release count differs');}
for(frame=0;frame<2400;frame++){
 native.update(1/60,false);for(const mode of ['before','after'])bursts[mode].update(1/60,false);
 const nativeArray=native.mesh.instanceMatrix.array,before=bursts.before.mesh.instanceMatrix.array,after=bursts.after.mesh.instanceMatrix.array;if(nativeArray.some((v,i)=>v!==before[i])||native.mesh.count!==bursts.before.mesh.count)throw Error('Baseline differs from the native strike');
 if(bursts.after.active!==bursts.before.active||bursts.after.mesh.count!==bursts.before.mesh.count)throw Error('Pool lifetime changed');
 for(let i=0;i<states.before.length;i++){const leaf=states.before[i];if(!leaf.alive)continue;if(leaf.landed<=0){for(let c=0;c<16;c++)if(before[i*16+c]!==after[i*16+c])throw Error('Airborne pose changed');airborneMatrices++;continue;}
  for(const mode of ['before','after']){bursts[mode].mesh.getMatrixAt(i,matrix);for(let v=0;v<geometry.count;v++){vertex.fromBufferAttribute(geometry,v).applyMatrix4(matrix);const gap=vertex.y-T.world.terrain.heightAt(vertex.x,vertex.z),row=rows[mode];if(!Number.isFinite(gap))throw Error('Invalid contact');row.groundedVertexObservations++;row.minGap=Math.min(row.minGap,gap);if(gap< -1e-5)row.penetratingVertices++;if(mode==='before'&&gap<worst){worst=gap;worstFrame=frame;for(const k of ['before','after'])snapshots[k]={matrices:Array.from(bursts[k].mesh.instanceMatrix.array),count:bursts[k].mesh.count,leaf:i,centre:[states[k][i].x,states[k][i].y,states[k][i].z]};}}}
 }
 if(!paused&&states.before.some(l=>l.alive&&l.landed>.5&&l.landed<3)){paused=true;for(const mode of ['before','after']){const q=rows[mode].terrainQueries;for(let i=0;i<120;i++)bursts[mode].update(0,false);rows[mode].pausedQueries=rows[mode].terrainQueries-q;}for(let i=0;i<120;i++)native.update(0,false);}
 if(frame>1&&native.active===0)break;
}
if(frame>=2400||worstFrame<0||airborneMatrices===0)throw Error('Contact/lifetime repro incomplete');
for(const mode of ['before','after']){rows[mode].finalActive=bursts[mode].active;rows[mode].finalVisible=bursts[mode].mesh.visible;}
if(${args.images!=='0'}){T.settings.reducedMotion=true;F.group.visible=false;T.world.groundcover.group.visible=false;const centre=snapshots.before.centre;T.cam.camera.position.set(centre[0]+.22,centre[1]+.14,centre[2]+.32);T.cam.camera.lookAt(centre[0],centre[1],centre[2]);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,new THREE.Vector3(...centre),T.settings,11,T.cam.camera,false);native.mesh.visible=false;T.lastFrameDt=0;for(let i=0;i<3;i++)T.renderWorld();
for(const mode of ['before','after']){const mesh=bursts[mode].mesh;mesh.instanceMatrix.array.set(snapshots[mode].matrices);mesh.instanceMatrix.needsUpdate=true;mesh.count=snapshots[mode].count;mesh.visible=true;T.world.scene.add(mesh);R.info.reset();T.grade.render(T.world.scene,T.cam.camera,0);cost[mode]={drawCalls:R.info.render.calls,triangles:R.info.render.triangles};images[mode]=R.domElement.toDataURL('image/png');mesh.removeFromParent();}}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),label:target.label,releaseArgs,released,frames:frame+1,airborneMatrices,worstFrame,worstGroundedLeaf:snapshots.before.leaf,rows,images,cost,geometrySha256:await hash(Array.from(geometry.array))};
}finally{for(const burst of Object.values(bursts))burst.dispose();}
`);
for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));report.changedChannels=null;if(args.images!=='0'){const p=await Promise.all(['before','after'].map(k=>sharp(path.join(out,k+'.png')).raw().toBuffer()));report.changedChannels=p[0].reduce((n,v,i)=>n+Number(v!==p[1][i]),0);}
report.scope='Published native tree strike and terrain, original leaf pool compared matrix-for-matrix with the extracted baseline. Measure transformed geometry vertices only after landing; airborne matrices must remain identical. Fixed-step simulation is accelerated. Images isolate the worst landed contact against native terrain through native post rendering, with forest/grass groups hidden equally; not a player camera route or hardware timing.';
report.pass=report.rows.before.penetratingVertices>0&&report.rows.after.penetratingVertices===0&&report.rows.after.minGap>=.012-1e-5&&report.rows.after.pausedQueries===0&&report.rows.before.finalActive===0&&report.rows.after.finalActive===0&&(args.images==='0'||report.changedChannels>0&&report.cost.before.drawCalls===report.cost.after.drawCalls&&report.cost.before.triangles===report.cost.after.triangles);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
