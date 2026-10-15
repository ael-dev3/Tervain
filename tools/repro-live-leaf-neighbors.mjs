import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createServer,transformWithOxc} from 'vite';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {liveProofPage} from './live-proof-page.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function proveLiveLeafNeighbors(page,{species=null,offsetX=0}={}){
if(!Number.isFinite(offsetX))throw new Error('Invalid control offset');
const sources={before:execFileSync('git',['show','421d34b:src/presentation/leafIslands.ts'],{cwd:root,encoding:'utf8'}),after:fs.readFileSync(root+'/src/presentation/leafIslands.ts','utf8')};
const modules={};for(const [mode,s]of Object.entries(sources)){const instrument=s.replace("'./canopy'","'/src/presentation/canopy.ts'").replace('const q = j * 6;', 'neighborChecks++; const q = j * 6;')+'\nlet neighborChecks=0;export function readNeighborChecks(){return neighborChecks;}';modules[mode]=(await transformWithOxc(instrument,'neighbors.ts')).code;}
const server=await createServer({root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'probe',resolveId(id){if(id.startsWith('/@neighbors-'))return '\0'+id},load(id){if(id.startsWith('\0/@neighbors-'))return modules[id.slice('\0/@neighbors-'.length)]}}]});
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
const expression=`(async()=>{const T=window.tervain,forest=T.world.modules.find(m=>m.name==='forest').module;const target=forest.canopyAuditTargets(0).filter(t=>t.wood&&t.leaves&&t.cutout&&(!${JSON.stringify(species??null)}||t.species===${JSON.stringify(species??null)})).map(t=>({...t,triangles:(t.leaves.index?.count??t.leaves.getAttribute('position').count)/3})).filter(t=>t.triangles>=100&&t.triangles<=12000).sort((a,b)=>a.triangles-b.triangles)[0];if(!target)throw Error('No bounded leafy fixture');const hash=async g=>{const data={index:g.index?Array.from(g.index.array):null,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,{itemSize:a.itemSize,normalized:a.normalized,array:Array.from(a.array)}]))};const bytes=new TextEncoder().encode(JSON.stringify(data));return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');};const runs={};for(const mode of ['before','after']){const m=await import(${JSON.stringify(origin)}+'/@neighbors-'+mode);const leaf=target.leaves.clone();if(${offsetX}!==0)leaf.translate(${offsetX},0,0);const stats=m.anchorLeafIslands(leaf,target.wood,target.cutout,{reach:.5,gap:.6});runs[mode]={neighborChecks:m.readNeighborChecks(),stats,geometrySha256:await hash(leaf)};leaf.dispose();}return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),target:{label:target.label,kind:target.kind,species:target.species,triangles:target.triangles},runs,geometryIdentical:runs.before.geometrySha256===runs.after.geometrySha256,statsIdentical:JSON.stringify(runs.before.stats)===JSON.stringify(runs.after.stats)};})()`;
const result=await page.eval('return await '+expression+';');
result.schema=1;result.offsetX=offsetX;result.baselineRef='421d34b';result.sourceSha256=createHash('sha256').update(sources.after).digest('hex');result.supportSourceSha256=createHash('sha256').update(fs.readFileSync(root+'/src/presentation/canopy.ts')).digest('hex');
result.scope='Actual published prepared tree source cloned into both production repair routines, using identical default reach/gap. No rendered geometry is modified. Counted neighbor bounds checks, not hardware timing or a full cold-load cost.';result.qualityPass=null;result.pass=result.geometryIdentical&&result.statsIdentical&&result.runs.after.neighborChecks<result.runs.before.neighborChecks;
return result;
}finally{await server.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
 const output=args.out??'leaf-neighbor-proof.json';fs.rmSync(output,{force:true});let page;
 try{page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high'});const result=await proveLiveLeafNeighbors(page,{species:args.species??null,offsetX:Number(args['offset-x']??0)});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!result.pass)process.exitCode=1;}finally{page?.close();}
}
