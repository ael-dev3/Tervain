import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer, transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'canopy-position-copy-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/canopy.ts',sources={before:execFileSync('git',['show',(args.baseline??'b31773468')+':'+file],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')},modules={};
for(const [mode,source]of Object.entries(sources)){
 const start=source.indexOf('  const out = new Float32Array(position.count * 3);',source.indexOf('export function snapDetachedClumps'));
 const end=source.indexOf('  const mid = ',start);if(start<0||end<start)throw Error('Position-copy boundary changed');
 const copy=source.slice(start,end),counted=copy.replace('out.set([','out.set((proofStats.triplets++, [').replace('position.getZ(v)], v * 3);','position.getZ(v)]), v * 3);');
 const code=source+'\nexport const proofStats={triplets:0};\nexport function proofCopy(position){'+copy+'return out;}\nexport function proofCopyCounted(position){'+counted+'return out;}';
 modules[mode]=(await transformWithOxc(code,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const server=await createServer({server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},logLevel:'error',plugins:[{name:'position-copy-proof',resolveId(id){if(id.startsWith('/@position-copy-'))return '\0'+id;},load(id){if(id.startsWith('\0/@position-copy-'))return modules[id.slice('\0/@position-copy-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:19.3});
 const report=await page.eval(`const M={};for(const mode of ['before','after'])M[mode]=await import(${JSON.stringify(origin)}+'/@position-copy-'+mode);const T=tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module;
 T.frame=()=>{};T.present=()=>{};T.perf=null;T.cam.manual=true;T.hud.show(false);T.worldLook=null;T.grade.time=0;T.grade.waterTime=0;T.lastFrameDt=0;
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const hashes=async g=>{const o={};for(const key of Object.keys(g.attributes).filter(k=>k!=='aDistanceCoverage').sort())o[key]=await hash(g.getAttribute(key).array);o.index=g.index?await hash(g.index.array):null;return o;};
 const seen=new Set(),rows=[],variants={before:new Map(),after:new Map()},targets=[];for(const lod of [0,1])for(const t of F.canopyAuditTargets(lod)){if(t.species!=='oak'||!t.wood||!t.leaves||seen.has(t.leaves))continue;seen.add(t.leaves);targets.push(t);const row={label:t.label,lod,vertices:t.leaves.getAttribute('position').count,native:await hashes(t.leaves),outputs:{}};for(const mode of ['before','after']){const result=M[mode].snapDetachedClumps(t.leaves,t.wood,1.5/M[mode].MAX_TREE_SCALE,.75,.9,lod===0?.75/M[mode].MAX_TREE_SCALE:undefined);variants[mode].set(t.leaves,result.geometry);row.outputs[mode]={moved:result.moved,hashes:await hashes(result.geometry)};}rows.push(row);}
 const times={before:[],after:[]};let sink=0;for(let warm=0;warm<8;warm++)for(const mode of ['before','after'])for(const t of targets)sink+=M[mode].proofCopy(t.leaves.getAttribute('position'))[0];for(const mode of ['before','after'])M[mode].proofStats.triplets=0;
 for(let round=0;round<30;round++)for(const mode of round%2?['after','before']:['before','after']){const at=performance.now();for(const t of targets)sink+=M[mode].proofCopy(t.leaves.getAttribute('position'))[0];times[mode].push(performance.now()-at);}
 for(const mode of ['before','after'])for(const t of targets)M[mode].proofCopyCounted(t.leaves.getAttribute('position'));
 const stats=a=>{const s=[...a].sort((a,b)=>a-b);return{averageMs:a.reduce((n,x)=>n+x,0)/a.length,p50Ms:s[Math.floor(s.length*.5)],p95Ms:s[Math.floor(s.length*.95)],samplesMs:a};};
 const saved=[];F.group.traverse(o=>{if(!o.isInstancedMesh||o.castShadow)return;for(const t of targets)if(o.geometry.getAttribute('position')===t.leaves.getAttribute('position')){const built={};for(const mode of ['before','after']){const g=o.geometry.clone(),v=variants[mode].get(t.leaves);g.setAttribute('position',v.getAttribute('position'));g.setIndex(v.index);const cov=o.geometry.getAttribute('aDistanceCoverage');if(cov)g.setAttribute('aDistanceCoverage',cov);g.computeBoundingBox();g.computeBoundingSphere();built[mode]=g;}saved.push({mesh:o,original:o.geometry,built});break;}});
 const select=mode=>{for(const s of saved)s.mesh.geometry=mode==='native'||mode==='restored'?s.original:s.built[mode];};globalThis.__restoreOrchardRaster?.();if(T.grade.target.samples!==4)throw Error('Expected native MSAA4');
 globalThis.__copyProof={select,place(pose){select('native');const c=T.cam.camera;c.position.fromArray(pose.from);c.lookAt(...pose.to);c.updateMatrixWorld(true);T.player.setPosition(pose.from[0],pose.from[2],0,W.terrain);for(let i=0;i<60;i++){W.update(0,T.game.state,T.player.group.position,T.settings,19.3,c,false);W.prepareGrass(T.renderer,0);}W.foliage.strength.value=0;W.sway.uTime.value=0;W.foliage.wind.uniforms.uGrassTime.value=0;W.sky.cloudTime=0;T.renderer.shadowMap.autoUpdate=true;T.renderWorld();T.renderer.shadowMap.autoUpdate=false;},render(mode){select(mode);T.grade.time=0;T.grade.waterTime=0;T.lastFrameDt=0;T.renderer.info.autoReset=false;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid GL');return{png:T.renderer.domElement.toDataURL(),draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};}};
 return{build:await fetch('version.json').then(r=>r.json()),rows,tripletArraysPerCopyPass:Object.fromEntries(['before','after'].map(m=>[m,M[m].proofStats.triplets])),timing:Object.fromEntries(['before','after'].map(m=>[m,stats(times[m])])),sink,samples:T.grade.target.samples};`);
 fs.writeFileSync(path.join(out,'setup.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({stage:'setup',templates:report.rows.length,timing:report.timing,arrays:report.tripletArraysPerCopyPass}));
 report.images=[];const poses=[{from:[-210,5,0],to:[-215,9,-7]},{from:[-2,5,38],to:[-2,8,28]},{from:[-180,5,12],to:[-185,9,3]},{from:[-12.3,5,44.8],to:[-13,9,34]},{from:[-4,5,46],to:[-4,9,35]}];
 for(const [i,pose]of poses.entries()){
  await page.eval(`__copyProof.place(${JSON.stringify(pose)});return null;`);const row={pose,captures:{}};
  for(const mode of ['native','before','after','restored']){const v=await page.eval(`return __copyProof.render('${mode}');`);fs.writeFileSync(path.join(out,i+'-'+mode+'.png'),Buffer.from(v.png.split(',')[1],'base64'));delete v.png;row.captures[mode]=v;console.log(JSON.stringify({stage:'capture',pose:i,mode,...v}));}
  const images=await Promise.all(['native','before','after','restored'].map(mode=>sharp(path.join(out,i+'-'+mode+'.png')).raw().toBuffer()));row.beforeAfterChangedChannels=images[1].reduce((n,v,j)=>n+Number(v!==images[2][j]),0);row.nativeBeforeChangedChannels=images[0].reduce((n,v,j)=>n+Number(v!==images[1][j]),0);row.restoredChangedChannels=images[0].reduce((n,v,j)=>n+Number(v!==images[3][j]),0);report.images.push(row);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 }
 report.sources=Object.fromEntries(Object.entries(sources).map(([mode,s])=>[mode,createHash('sha256').update(s).digest('hex')]));report.scope='Native published High oak geometry reprocessed through original/candidate snapping on identical inputs; copy-only timing includes ten retained templates, not full loading or per-frame CPU/GPU timing. Original warmed shadow map and ground shade retained. Native/restored controls expose reprocessing effects separately. No detached-clump repair is proposed.';
 report.pass=report.rows.length>0&&report.tripletArraysPerCopyPass.before>0&&report.tripletArraysPerCopyPass.after===0&&report.rows.every(r=>JSON.stringify(r.outputs.before)===JSON.stringify(r.outputs.after))&&report.images.every(r=>r.beforeAfterChangedChannels===0&&r.restoredChangedChannels===0&&JSON.stringify(r.captures.before)===JSON.stringify(r.captures.after));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({complete:true,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{try{await page?.eval('__copyProof.select("native");return null;');}catch{}page?.close();await server.close();}
