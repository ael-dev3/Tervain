import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer, transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'basal-clip-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/treeGrounding.ts';
const sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')};
const modules={};
for(const [mode,source] of Object.entries(sources)){
 if(!source.includes('const triangle: Point[] = [];'))throw Error('Clipping instrumentation site missing');
 const instrumented=source.replace('const triangle: Point[] = [];','proofClipTriangles++; const triangle: Point[] = [];')+'\nexport let proofClipTriangles = 0;\n';
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'basal-clip-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'clip-proof',resolveId(id){if(id.startsWith('/@clip-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@clip-proof-'))return modules[id.slice('\0/@clip-proof-'.length)];}}]});
let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
 const targets=[0,1,2].map(lod=>F.canopyAuditTargets(lod)),maps=targets.map(ts=>new Map(ts.map(t=>[t.label,t])));
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const variants=new Map(),trees=[];
 for(const target of targets[0]){if(!target.wood)continue;let variant=variants.get(target.wood);
 if(!variant){variant={species:target.species,lods:maps.map(m=>{const t=m.get(target.label);return{wood:t?.wood??null,leaf:t?.leaves??null};})};variants.set(target.wood,variant);}
 const e=target.matrix.elements;trees.push({label:target.label,variant,tree:{x:e[12],z:e[14],s:Math.hypot(e[0],e[2]),yaw:Math.atan2(e[8],e[0])}});}
 const geometryState=()=>Array.from(variants.values(),v=>v.lods.map(l=>l.wood?{position:Array.from(l.wood.getAttribute('position').array),index:l.wood.index?Array.from(l.wood.index.array):null}:null));
 const geometryBefore=await hash(geometryState()),rows={};
 for(const mode of ['before','after']){const M=await import(${JSON.stringify(origin)}+'/@clip-proof-'+mode),polygons=[],seats=[];
 for(const v of variants.values())polygons.push(M.treeRootPolygons(v));
 for(const {label,tree,variant}of trees){const y=M.groundedTreeY(T.world.terrain,tree,variant);seats.push({label,planted:y,flare:M.groundedTreeFlareY(T.world.terrain,tree,variant,y)});}
 rows[mode]={triangleClippingEntries:M.proofClipTriangles,temporaryArrayConstructionSites:M.proofClipTriangles*5,polygonSha256:await hash(polygons),seatSha256:await hash(seats),treeCount:seats.length,variantCount:variants.size,seats};}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,geometryBefore,geometryAfter:await hash(geometryState())};`);
 const a=report.rows.before,b=report.rows.after;
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Actual published low-preset tree models and terrain, original root/flare clipping functions. Counts are executed source construction sites (three point arrays plus triangle and polygon arrays per clipping entry), not a JavaScript heap, GC, hardware frame-time or visual-quality measurement. Variant caches are cold once in each implementation; placement is checked for every native target. No live geometry or placement is modified.';
 report.pass=a.treeCount>300&&a.treeCount===b.treeCount&&a.variantCount===b.variantCount&&a.polygonSha256===b.polygonSha256&&a.seatSha256===b.seatSha256&&report.geometryBefore===report.geometryAfter&&b.triangleClippingEntries<a.triangleClippingEntries;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,rows:Object.fromEntries(Object.entries(report.rows).map(([k,{seats,...v}])=>[k,v]))}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
