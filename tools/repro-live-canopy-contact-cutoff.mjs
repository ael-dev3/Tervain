import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out = args.out ?? 'canopy-contact-cutoff'; fs.mkdirSync(out,{recursive:true});
fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/diagnostics/canopyConnectivity.ts',sources={
 before:execFileSync('git',['show',(args.baseline??'b31773468')+':'+file],{encoding:'utf8'}),
 after:fs.readFileSync(file,'utf8'),
};
const modules={};for(const mode of ['before','after'])modules[mode]=(await transformWithOxc(sources[mode],'contact.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true},plugins:[{
 name:'contact-cutoff-proof',resolveId(id){if(id.startsWith('/@contact-'))return '\0'+id;},load(id){if(id.startsWith('\0/@contact-'))return modules[id.slice('\0/@contact-'.length)];},
}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:15});
 const report=await page.eval(`
 const T=tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,A=await import('${origin}/src/diagnostics/canopyAudit.ts'),before=await import('${origin}/@contact-before'),after=await import('${origin}/@contact-after');
 T.frame=()=>{};T.present=()=>{};T.perf=null;T.lastFrameDt=0;T.cam.manual=true;T.grade.time=0;T.worldLook=null;T.hud.show(false);
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const geometryHash=async g=>{if(!g)return null;const parts=[];for(const name of Object.keys(g.attributes).sort()){const a=g.getAttribute(name);if(a.isInstancedBufferAttribute)continue;const data=a.array??a.data.array;parts.push([name,a.itemSize,a.normalized,a.offset??null,a.data?.stride??null,data.constructor.name,await hash(data)]);}if(g.index)parts.push(['index',g.index.array.constructor.name,await hash(g.index.array)]);return JSON.stringify(parts);};
 const geometries=async()=>{const rows=[];for(let lod=0;lod<3;lod++){const seen=new Set();for(const t of F.canopyAuditTargets(lod)){const key=t.wood?.uuid+':'+t.leaves?.uuid;if(seen.has(key))continue;seen.add(key);rows.push({kind:t.kind,lod,wood:await geometryHash(t.wood),leaves:await geometryHash(t.leaves)});}}return rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));};
 const geometryBefore=await geometries(),rows=[],targets=F.canopyAuditTargets(0);
 for(const label of ['tree:wild:79:22','tree:wild:70:35','tree:wild:42:45']){
  const t=targets.find(t=>t.label===label);if(!t)throw Error('Missing stable tree target '+label);
  const e=t.matrix.elements,scale=Math.hypot(e[0],e[1],e[2]);
  for(const [reach,gap]of [[.75,1.5],[1,1.5],[1.5,.75]]){
   let oldOperations=0,newOperations=0;
   const a=before.detachedClumpSet(t.leaves,t.wood,reach/scale,gap/scale,()=>oldOperations++),b=after.detachedClumpSet(t.leaves,t.wood,reach/scale,gap/scale,()=>newOperations++),reference=A.auditCanopies([t],{woodReach:reach,gap,alpha:false,maxOperations:300000000});
   rows.push({label,kind:t.kind,position:e.slice(12,15),scale,reach,gap,oldCards:a.far.filter(Boolean).length,newCards:b.far.filter(Boolean).length,referenceCards:reference.summary.detachedCards,oldClumps:a.detachedClumps,newClumps:b.detachedClumps,referenceClumps:reference.summary.detachedClumps,referenceComplete:reference.complete,defaultMasksEqual:reach>=gap?JSON.stringify(a.far)===JSON.stringify(b.far):null,oldOperations,newOperations});
  }
 }
 const geometryAfter=await geometries();
 const c=T.cam.camera,eye=[138,W.terrain.heightAt(138,-9)+1.7,-9],focus=[125.0475193,9.5641761,-15.430061];T.player.setPosition(138,-9,0,W.terrain);c.position.fromArray(eye);c.lookAt(...focus);c.fov=38;c.updateProjectionMatrix();c.updateMatrixWorld(true);
 for(let i=0;i<5;i++)W.update(0,T.game.state,T.player.group.position,T.settings,15,c,false);
 W.foliage.strength.value=0;W.sway.uTime.value=0;globalThis.__restoreOrchardRaster?.();if(globalThis.__tervainCpuNoRaster||T.grade.target.samples!==4)throw Error('Native High/MSAA4 required');
 const draw=()=>{T.grade.waterTime=0;T.grade.waterPass.reflectionValid=false;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();gl.finish();if(gl.getError()||gl.isContextLost())throw Error('Invalid software raster');return{draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,png:T.renderer.domElement.toDataURL()};};
 T.renderer.shadowMap.autoUpdate=true;draw();T.renderer.shadowMap.autoUpdate=false;draw();const original=draw();
 const t=targets.find(t=>t.label==='tree:wild:79:22'),scale=Math.hypot(...t.matrix.elements.slice(0,3));before.detachedClumpSet(t.leaves,t.wood,.75/scale,1.5/scale);const old=draw();after.detachedClumpSet(t.leaves,t.wood,.75/scale,1.5/scale);const corrected=draw();
 return{build:await fetch('version.json').then(r=>r.json()),rows,geometryBefore,geometryAfter,eye,focus,camera:c.matrixWorld.toArray(),buffer:[T.renderer.domElement.width,T.renderer.domElement.height],images:{original:original.png,before:old.png,after:corrected.png},cost:{original:{draws:original.draws,triangles:original.triangles},before:{draws:old.draws,triangles:old.triangles},after:{draws:corrected.draws,triangles:corrected.triangles}}};
 `);
 const pixels={};for(const[mode,png]of Object.entries(report.images)){const bytes=Buffer.from(png.split(',')[1],'base64');fs.writeFileSync(path.join(out,mode+'.png'),bytes);pixels[mode]=await sharp(bytes).removeAlpha().raw().toBuffer();}
 const stats=await sharp(path.join(out,'original.png')).stats();assert(stats.channels.slice(0,3).some(c=>c.stdev>5),'Blank capture');report.imageStddev=stats.channels.slice(0,3).map(c=>c.stdev);
 delete report.images;
 assert(pixels.original.equals(pixels.before)&&pixels.before.equals(pixels.after),'Read-only detector changed pixels');
 assert.deepEqual(report.geometryBefore,report.geometryAfter,'Diagnostic mutated native geometry');
 assert(report.rows.every(r=>r.referenceComplete&&r.newCards===r.referenceCards&&r.newClumps===r.referenceClumps),'Shared result differs from audit');
 assert(report.rows.filter(r=>r.reach<r.gap).some(r=>r.oldCards>r.newCards),'No mismatch reproduced');
 assert(report.rows.filter(r=>r.reach>=r.gap).every(r=>r.defaultMasksEqual&&r.oldOperations===r.newOperations),'Default workload changed');
 assert.deepEqual(report.cost.before,report.cost.after);
 if(args['baseline-report']){const baseline=JSON.parse(fs.readFileSync(args['baseline-report'],'utf8'));assert.deepEqual(report.geometryBefore,baseline.geometryBefore,'Compiled default geometry differs from live baseline');report.compiledDefaultGeometryMatches=true;}
 report.errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(report.errors,[]);
 report.sourceHashes=Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,createHash('sha256').update(s).digest('hex')]));
 report.pixelsIdentical=true;report.scope='Actual native High tree geometry, unmasked custom-threshold detector queries and independent audit. Default geometry/read-only rendered controls remain identical. Corrects false detector flags, not static floating foliage or art. Software raster, not hardware frame timing.';
 report.complete=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({build:report.build,rows:report.rows,geometries:report.geometryBefore.length,pixelsIdentical:true,cost:report.cost}));
}finally{page?.close();await server.close();}
