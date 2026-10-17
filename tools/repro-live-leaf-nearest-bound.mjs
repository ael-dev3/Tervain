import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createServer, transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'leaf-nearest-bound-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/leafIslands.ts',read=ref=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8'),sources={before:read('0f8f0da8f'),after:read(args['candidate-ref'])},modules={};
const published=execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'});
const nearest=s=>s.slice(s.indexOf('  const nearest ='),s.indexOf('  // Parts in a grid'));
if(nearest(published)!==nearest(sources.before))throw Error('Nearest search no longer matches published source');
const canopy=fs.readFileSync('src/presentation/canopy.ts','utf8');
const anchorBlock=s=>s.slice(s.indexOf('export function woodAnchor('),s.indexOf('/** Sides of a grown twig'));
if(anchorBlock(canopy)!==anchorBlock(execFileSync('git',['show','421d34b:src/presentation/canopy.ts'],{encoding:'utf8'})))throw Error('Wood index no longer matches published source');
for(const[mode,source]of Object.entries(sources)){
 modules[mode]=(await transformWithOxc(source,file)).code.replace(/from (['"])([.][^'"]+)\1/g,()=>`from '/@leaf-nearest-proof-${mode}Canopy'`);
 const instrumented=canopy.replace('const visit = (node: number) => {', 'const visit = (node: number) => {proofNodes++;').replace('triangle.closestPointToPoint(p, near);', 'proofTriangles++;triangle.closestPointToPoint(p, near);')+'\nexport let proofNodes=0,proofTriangles=0;';
 modules[mode]+=`\nexport {proofNodes,proofTriangles} from '/@leaf-nearest-proof-${mode}Canopy';`;
 modules[mode+'Canopy']=(await transformWithOxc(instrumented,'src/presentation/canopy.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'leaf-nearest-bound-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'leaf-nearest-proof',resolveId(id){if(id.startsWith('/@leaf-nearest-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@leaf-nearest-proof-'))return modules[id.slice('\0/@leaf-nearest-proof-'.length)];}}]});
let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,M={};for(const mode of ['before','after'])M[mode]=await import(${JSON.stringify(origin)}+'/@leaf-nearest-proof-'+mode);
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const hashes=async g=>{const h={};for(const key of Object.keys(g.attributes).sort())h[key]=await hash(g.getAttribute(key).array);h.index=g.index?await hash(g.index.array):null;return h;};
 const inputs=[],seen=new Set();for(let lod=0;lod<2;lod++){const targets=F.canopyAuditTargets(lod);for(const target of targets){if(!target.wood||!target.leaves||seen.has(target.leaves))continue;seen.add(target.leaves);const scale=Math.max(1,...targets.filter(t=>t.leaves===target.leaves).map(t=>Math.hypot(...t.matrix.elements.slice(0,3))));inputs.push({target,scale});}}
 const rows=[],built={before:new Map(),after:new Map()},images={},cost={},saved=[];F.group.traverse(o=>{if(o.isInstancedMesh&&seen.has(o.geometry))saved.push({mesh:o,geometry:o.geometry,visible:o.visible});});
 try{for(const {target:t,scale}of inputs){const row={label:t.label,species:t.species,lod:t.lod,triangles:Math.floor((t.leaves.index?.count??t.leaves.getAttribute('position').count)/3),native:await hashes(t.leaves),wood:await hashes(t.wood),variants:{}};for(const mode of ['before','after']){const clone=t.leaves.clone();clone.deleteAttribute('aDistanceCoverage');const nodes=M[mode].proofNodes,triangles=M[mode].proofTriangles;built[mode].set(t.leaves,clone);const result=M[mode].anchorLeafIslands(clone,t.wood,t.cutout,{reach:.6/scale,gap:.7/scale});row.variants[mode]={nodes:M[mode].proofNodes-nodes,triangles:M[mode].proofTriangles-triangles,result,hashes:await hashes(clone)};}row.originalUnchanged=JSON.stringify(row.native)===JSON.stringify(await hashes(t.leaves))&&JSON.stringify(row.wood)===JSON.stringify(await hashes(t.wood));rows.push(row);}
 T.lastFrameDt=0;for(const mode of ['empty','before','after']){for(const {mesh,geometry}of saved){mesh.visible=mode!=='empty';mesh.geometry=mode==='empty'?geometry:built[mode].get(geometry);if(mode!=='empty'&&geometry.getAttribute('aDistanceCoverage'))mesh.geometry.setAttribute('aDistanceCoverage',geometry.getAttribute('aDistanceCoverage'));}T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images[mode]=T.renderer.domElement.toDataURL('image/png');cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,images,cost};
 }finally{for(const {mesh,geometry,visible}of saved){mesh.geometry=geometry;mesh.visible=visible;}for(const map of Object.values(built))for(const g of map.values()){g.deleteAttribute('aDistanceCoverage');g.dispose();}}
 `);
 const pixels={};for(const[mode,data]of Object.entries(report.images)){fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));pixels[mode]=await sharp(path.join(out,mode+'.png')).raw().toBuffer();}delete report.images;report.changedChannels={};report.changedChannels.beforeAfter=pixels.before.reduce((n,v,i)=>n+Number(v!==pixels.after[i]),0);report.changedChannels.beforeEmpty=pixels.before.reduce((n,v,i)=>n+Number(v!==pixels.empty[i]),0);
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));report.totals=Object.fromEntries(['before','after'].map(mode=>[mode,report.rows.reduce((n,r)=>n+r.variants[mode].triangles,0)]));
 report.scope='Replays native retained near/middle forest templates through original/candidate anchorLeafIslands using actual cutouts, wood and maximum selected-instance scale. Counts actual wood-triangle closest-point evaluations and index node visits, not hardware timings. The nearest-search block and wood index match published source. Queued thin-alpha repair is shared by both variants. Output geometry and repair results must match the parent, native source geometry must stay untouched, and substituted repaired geometries render identically to each other; hidden-leaf control must change pixels. No foliage-placement policy changes.';
 report.pass=report.rows.length===40&&report.totals.after<report.totals.before&&report.rows.every(r=>r.originalUnchanged&&JSON.stringify(r.variants.before.result)===JSON.stringify(r.variants.after.result)&&JSON.stringify(r.variants.before.hashes)===JSON.stringify(r.variants.after.hashes))&&report.changedChannels.beforeAfter===0&&report.changedChannels.beforeEmpty>0&&JSON.stringify(report.cost.before)===JSON.stringify(report.cost.after);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,templates:report.rows.length,totals:report.totals,changedChannels:report.changedChannels,cost:report.cost,pass:report.pass}));if(!report.pass)process.exitCode=1;

}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
