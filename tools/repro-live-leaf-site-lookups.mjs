import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
if(!['low','medium','high'].includes(args.quality??'low'))throw Error('Invalid quality');
const out=args.out??'leaf-site-lookups-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/leafSurfaceSites.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/leafSurfaceSites.ts','utf8')};
const modules=Object.fromEntries(Object.entries(sources).map(([mode,source])=>[mode,source.replace('function textureMatrix(texture: THREE.Texture): THREE.Matrix3 {','function textureMatrix(texture: THREE.Texture): THREE.Matrix3 { matrixCalls++;').replaceAll('new THREE.Vector2(u, v)', '(uvVectors++, new THREE.Vector2(u, v))').replaceAll('new THREE.Vector2()', '(uvVectors++, new THREE.Vector2())')+'\nlet matrixCalls=0,uvVectors=0;export const lookupCounts=()=>({matrixCalls,uvVectors});']));
for(const mode of ['before','after'])modules[mode]=(await transformWithOxc(modules[mode], 'sampler.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true},plugins:[{name:'lookup-proof',resolveId(id){if(id.startsWith('/@site-'))return '\0'+id+'.ts';},load(id){if(id.startsWith('\0/@site-'))return modules[id.slice('\0/@site-'.length,-3)];}}]});
let page;
try {await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:args.quality??'low',hour:19.3});
const report=await page.eval(`const T=window.tervain,forest=T.world.modules.find(m=>m.name==='forest').module,targets=[],seen=new Set();forest.group.traverse(o=>{const m=o.material;if(!o.geometry||!m||Array.isArray(m)||!m.map||!(m.alphaTest>0))return;const key=o.geometry.uuid+':'+m.uuid;if(seen.has(key))return;seen.add(key);targets.push({geometry:o.geometry,material:m,name:o.name});});if(!targets.length)throw Error('No masked forest sources');
const results={},images={},hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');T.lastFrameDt=0;
for(const mode of ['before','after']){const m=await import(${JSON.stringify(origin)}+'/@site-'+mode),rows=[];for(const t of targets){const sites=m.sampleLeafSurfaceSites(t.geometry,t.material);rows.push({name:t.name,triangles:(t.geometry.index?.count??t.geometry.getAttribute('position').count)/3,sites:sites.length,sha256:await hash(sites)});}results[mode]={rows,...m.lookupCounts(),sites:rows.reduce((n,r)=>n+r.sites,0)};T.renderWorld();images[mode]=T.renderer.domElement.toDataURL('image/png');}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),results,images};`);
for(const mode of ['before','after']){fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(report.images[mode].split(',')[1],'base64'));}delete report.images;
const rgb=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).removeAlpha().raw().toBuffer()));
report.identicalSites=JSON.stringify(report.results.before.rows)===JSON.stringify(report.results.after.rows);report.identicalPixels=rgb[0].equals(rgb[1]);report.quality=args.quality??'low';report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.scope='Published prepared masked forest geometries/materials replayed through both actual emission-site samplers. Source-level texture-transform and UV-vector construction counts, not total allocations or hardware timing. Read-only sampling, followed by frozen native Grade/post/MSAA captures; no geometry or material changes.';
report.pass=report.identicalSites&&report.identicalPixels&&report.results.before.sites>0&&(args.expect==='before'?report.results.before.matrixCalls===report.results.after.matrixCalls:report.results.after.matrixCalls<report.results.before.matrixCalls&&report.results.after.uvVectors<report.results.before.uvVectors);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,before:{matrices:report.results.before.matrixCalls,uvVectors:report.results.before.uvVectors,sites:report.results.before.sites},after:{matrices:report.results.after.matrixCalls,uvVectors:report.results.after.uvVectors,sites:report.results.after.sites},identicalPixels:report.identicalPixels,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
