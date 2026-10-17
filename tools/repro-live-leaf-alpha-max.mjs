import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createServer, transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'leaf-alpha-max-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/leafSurfaceSites.ts',read=ref=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
const sources={before:read('d78a9b87a'),after:read(args['candidate-ref'])},modules={};
for(const[mode,source]of Object.entries(sources)){
 if(!source.includes('previous.data['))throw Error('Max-read boundary changed');
 const code=source.replace('let maximum = previous.data[row + column]!;', 'let maximum = proofValue(previous.data,row + column,0);')
  .replace(/previous\.data\[([^\]]+)\]!/g, 'proofValue(previous.data,$1,maximum)')
  .replace('alphaMaxLevels.set(image, levels);','proofPyramids.push(levels);alphaMaxLevels.set(image, levels);')
  +'\nexport let proofMaxReads=0,proofRedundantReads=0;export const proofPyramids:(readonly LeafChannelImage[])[]=[];function proofValue(data:Uint8Array,index:number,previous:number){proofMaxReads++;if(previous===255)proofRedundantReads++;return data[index]!;}';
 modules[mode]=(await transformWithOxc(code,file)).code;modules[mode+'Raw']=(await transformWithOxc(source+'\nexport {maxLevels as proofBuild};',file)).code;
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'leaf-alpha-max-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'leaf-alpha-max',resolveId(id){if(id.startsWith('/@alpha-max-'))return '\0'+id;},load(id){if(id.startsWith('\0/@alpha-max-'))return modules[id.slice('\0/@alpha-max-'.length)];}}]});
let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
 const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,M={};for(const mode of ['before','after'])M[mode]=await import(${JSON.stringify(origin)}+'/@alpha-max-'+mode);
 const repair=await import(${JSON.stringify(origin)}+'/src/presentation/leafIslands.ts');
 const hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const hashes=async g=>{const h={};for(const name of Object.keys(g.attributes).filter(n=>n!=='aDistanceCoverage').sort())h[name]=await hash(g.getAttribute(name).array);h.index=g.index?await hash(g.index.array):null;return h;};
 const targets=F.canopyAuditTargets(2),seen=new Set(),inputs=[];for(const t of targets){if(!t.wood||!t.leaves||seen.has(t.leaves))continue;seen.add(t.leaves);inputs.push({target:t,scale:Math.max(1,...targets.filter(q=>q.leaves===t.leaves).map(q=>Math.hypot(...q.matrix.elements.slice(0,3))))});}
 const saved=[];F.group.traverse(o=>{if(o.isInstancedMesh&&seen.has(o.geometry))saved.push({mesh:o,geometry:o.geometry,visible:o.visible});});
 const built={before:new Map(),after:new Map()},rows=[],images={},cost={};
 try{
  for(const {target:t,scale}of inputs){
   const mesh=saved.find(s=>s.geometry===t.leaves).mesh,row={label:t.label,species:t.species,lod:t.lod,native:await hashes(t.leaves),wood:await hashes(t.wood),variants:{}};
   for(const mode of ['before','after']){
    const s=M[mode],reads=s.proofMaxReads,redundant=s.proofRedundantReads,g=t.leaves.clone();g.deleteAttribute('aDistanceCoverage');built[mode].set(t.leaves,g);
    const cutout=s.leafCutoutSampler(mesh.material),result=repair.anchorLeafIslands(g,t.wood,cutout,{reach:.6/scale,gap:.7/scale});
    row.variants[mode]={maxReads:s.proofMaxReads-reads,redundantReads:s.proofRedundantReads-redundant,result,hashes:await hashes(g)};
   }
   row.originalUnchanged=JSON.stringify(row.native)===JSON.stringify(await hashes(t.leaves))&&JSON.stringify(row.wood)===JSON.stringify(await hashes(t.wood));rows.push(row);
  }
  const timings={before:[],after:[]},raw={};for(const mode of ['before','after'])raw[mode]=await import(${JSON.stringify(origin)}+'/@alpha-max-'+mode+'Raw');const corpus=M.before.proofPyramids.map(levels=>levels[0]);let roots=0;const run=mode=>{for(const image of corpus){const levels=raw[mode].proofBuild({...image});roots+=levels[levels.length-1].data[0];}};run('before');run('after');for(let round=0;round<5;round++)for(const mode of round%2?['after','before']:['before','after']){const started=performance.now();run(mode);timings[mode].push(performance.now()-started);}const pyramids={};for(const mode of ['before','after'])pyramids[mode]=await Promise.all(M[mode].proofPyramids.map(async levels=>Promise.all(levels.map(async l=>({width:l.width,height:l.height,bytes:l.data.byteLength,sha256:await hash(l.data)})))));
  T.lastFrameDt=0;for(const mode of ['empty','before','after']){
   for(const {mesh,geometry,visible}of saved){mesh.visible=mode!=='empty'&&visible;mesh.geometry=mode==='empty'?geometry:built[mode].get(geometry);if(mode!=='empty'&&geometry.getAttribute('aDistanceCoverage'))mesh.geometry.setAttribute('aDistanceCoverage',geometry.getAttribute('aDistanceCoverage'));}
   T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images[mode]=T.renderer.domElement.toDataURL('image/png');cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};
  }
  return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,pyramids,timings,roots,images,cost};
 }finally{for(const {mesh,geometry,visible}of saved){mesh.geometry=geometry;mesh.visible=visible;}for(const map of Object.values(built))for(const g of map.values()){g.deleteAttribute('aDistanceCoverage');g.dispose();}}
 `);
 const pixels={};for(const[mode,data]of Object.entries(report.images)){fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));pixels[mode]=await sharp(path.join(out,mode+'.png')).raw().toBuffer();}delete report.images;
 report.changedChannels=pixels.before.reduce((n,v,i)=>n+Number(v!==pixels.after[i]),0);report.visibleControlChannels=pixels.before.reduce((n,v,i)=>n+Number(v!==pixels.empty[i]),0);
 report.totals=Object.fromEntries(['before','after'].map(mode=>[mode,{maxReads:report.rows.reduce((n,r)=>n+r.variants[mode].maxReads,0),redundantReads:report.rows.reduce((n,r)=>n+r.variants[mode].redundantReads,0),pyramids:report.pyramids[mode].length,pyramidBytes:report.pyramids[mode].reduce((n,levels)=>n+levels.slice(1).reduce((q,l)=>q+l.bytes,0),0)}]));
 report.medianMs=Object.fromEntries(Object.entries(report.timings).map(([k,v])=>[k,[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)]]));
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Native far masks with separate wood replayed through the same leaf repair. Counts max-hierarchy child-byte reads, not GPU uploads, heap allocations or frame time. Every hierarchy level and output geometry must match. Existing cache sizes, sampling, placement and draw rules are unchanged. Captures use the native postprocessed scene and a hidden-far-leaf control.';
 report.pass=report.rows.length===17&&report.totals.before.maxReads>0&&report.totals.after.maxReads<report.totals.before.maxReads&&report.totals.after.redundantReads===0&&report.totals.before.maxReads-report.totals.after.maxReads===report.totals.before.redundantReads&&JSON.stringify(report.pyramids.before)===JSON.stringify(report.pyramids.after)&&report.rows.every(r=>r.originalUnchanged&&JSON.stringify(r.variants.before.result)===JSON.stringify(r.variants.after.result)&&JSON.stringify(r.variants.before.hashes)===JSON.stringify(r.variants.after.hashes))&&report.changedChannels===0&&report.visibleControlChannels>0&&JSON.stringify(report.cost.before)===JSON.stringify(report.cost.after);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,templates:report.rows.length,totals:report.totals,changedChannels:report.changedChannels,visibleControlChannels:report.visibleControlChannels,medianMs:report.medianMs,cost:report.cost,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
