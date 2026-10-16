import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createServer, transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'pine-upper-wood-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/solitaryPine.ts';
const sources={before:execFileSync('git',['show','c3687b571:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')};
const modules={};
for(const [mode,source] of Object.entries(sources)){
 if(!source.includes('Math.hypot(a.x, a.z)'))throw Error('Radius instrumentation site missing');
 const instrumented=source.replaceAll('positions.getY(', 'proofHeight(positions, ').replaceAll('a.fromBufferAttribute(', 'proofVectorReads++;a.fromBufferAttribute(').replaceAll('b.fromBufferAttribute(', 'proofVectorReads++;b.fromBufferAttribute(').replaceAll('Math.hypot(', 'proofHypot(')+'\nexport { woodRadius as proofWoodRadius };\nexport let proofHypotCalls = 0;\nexport let proofVectorReads = 0;\nexport let proofHeightReads = 0;\nfunction proofHeight(p: {getY(i: number): number}, i: number): number { proofHeightReads++; return p.getY(i); }\nfunction proofHypot(x: number, z: number): number { proofHypotCalls++; return Math.hypot(x, z); }\n';
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
 modules[mode+'-warm']=(await transformWithOxc(source+'\nexport { woodRadius as proofWoodRadius };\n',file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'pine-upper-wood-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'radius-proof',resolveId(id){if(id.startsWith('/@radius-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@radius-proof-'))return modules[id.slice('\0/@radius-proof-'.length)];}}]});
let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
 const targets=[0,1,2].map(lod=>F.canopyAuditTargets(lod)),maps=targets.map(ts=>new Map(ts.map(t=>[t.label,t])));
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const variants=new Map(),trees=[];
 for(const target of targets[0]){if(!target.wood||target.species!=='pine')continue;let variant=variants.get(target.wood);if(!variant){variant={species:target.species,lods:maps.map(m=>{const t=m.get(target.label);return{wood:t?.wood??null,leaf:t?.leaves??null};})};variants.set(target.wood,variant);}const e=target.matrix.elements;trees.push({label:target.label,variant,scale:Math.hypot(e[0],e[2]),depth:T.world.terrain.heightAt(e[12],e[14])-e[13]});}
 const geometryState=()=>Array.from(variants.values(),v=>v.lods.map(l=>Object.fromEntries(['wood','leaf'].map(part=>{const g=l[part];return[part,g?{attributes:Object.fromEntries(Object.keys(g.attributes).filter(k=>k!=='aDistanceCoverage').sort().map(k=>[k,Array.from(g.getAttribute(k).array)])),index:g.index?Array.from(g.index.array):null}:null];}))));
 const geometryBefore=await hash(geometryState()),rows={},images={};T.lastFrameDt=0;
 for(const mode of ['before','after']){const M=await import(${JSON.stringify(origin)}+'/@radius-proof-'+mode),queries=[],at=performance.now();
 for(const {label,scale,depth,variant}of trees){queries.push({label,scale,depth,radius:M.proofWoodRadius(variant.lods,(2.6+depth)/scale)*scale+.03});}
 rows[mode]={vectorReads:M.proofVectorReads,heightReads:M.proofHeightReads,positionComponents:M.proofVectorReads*3+M.proofHeightReads,hypotCalls:M.proofHypotCalls,elapsedMs:performance.now()-at,radiusSha256:await hash(queries),treeCount:queries.length,variantCount:variants.size,queries};T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();rows[mode].render={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};images[mode]=T.renderer.domElement.toDataURL('image/png');}
 const warm={before:[],after:[]};for(let repeat=0;repeat<5;repeat++)for(const mode of repeat%2?['after','before']:['before','after']){const M=await import(${JSON.stringify(origin)}+'/@radius-proof-'+mode+'-warm'),at=performance.now();for(const {scale,depth,variant}of trees)M.proofWoodRadius(variant.lods,(2.6+depth)/scale);warm[mode].push(performance.now()-at);}for(const mode of ['before','after']){rows[mode].warmSamplesMs=warm[mode];rows[mode].warmMedianMs=[...warm[mode]].sort((a,b)=>a-b)[2];}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,images,geometryBefore,geometryAfter:await hash(geometryState())};`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;const pixels=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.changedChannels=pixels[0].reduce((n,v,i)=>n+Number(v!==pixels[1][i]),0);

 const a=report.rows.before,b=report.rows.after;
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Actual published low-preset pine wood/leaf geometry and retained instance transforms. Replays the native pine collisionRadius formula on every retained pine at its real scale and burial depth, calling the original or candidate woodRadius helper directly. Counts are executed full-vector reads, explicit plane-height reads, their total position components, and distance evaluations; alternating warm timing samples use separate uninstrumented modules. These are not hardware frame timings or heap allocations. No live geometry or placement is modified. Native full-scene post captures verify unchanged pixels/draw costs.';
 report.pass=a.treeCount>50&&a.treeCount===b.treeCount&&a.variantCount===b.variantCount&&a.radiusSha256===b.radiusSha256&&report.geometryBefore===report.geometryAfter&&b.vectorReads<a.vectorReads&&b.positionComponents<a.positionComponents&&b.hypotCalls===a.hypotCalls&&report.changedChannels===0&&JSON.stringify(a.render)===JSON.stringify(b.render);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,rows:Object.fromEntries(Object.entries(report.rows).map(([k,{queries,...v}])=>[k,v]))}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
