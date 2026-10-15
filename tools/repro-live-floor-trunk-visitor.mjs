import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'floor-trunk-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/forestFloor.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const marker='    const local: FloraTree[] = [];';if(!source.includes(marker))throw Error('Nearby collection counter site missing');
 const instrumented='export const floorProof={collections:0};\n'+source.replace(marker,'    floorProof.collections++;'+marker);
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="forest").module.initializeFloor',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this?.terrain===window.tervain.world.terrain&&typeof this.excl?.blocked==="function"&&typeof this.plantedCrowns?.coverAt==="function")window.__floorContext=this;if(Array.isArray(this)&&this.length&&this.every(t=>t&&typeof t.sp==="string"&&Number.isFinite(t.s)&&Number.isFinite(t.radius))&&this.length>(window.__floorTrees?.length??0))window.__floorTrees=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const T=window.tervain,C=window.__floorContext,trees=window.__floorTrees;if(!C||!trees)throw Error('Native floor inputs missing');
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const rows={};let baseline;
for(const mode of ['before','after']){const m=models[mode];m.floorProof.collections=0;const population=m.createForestFloorPopulation(T.world.terrain,C.excl,trees,C.plantedCrowns);
const selections=Object.fromEntries(['low','medium','high'].map(q=>[q,m.selectForestFloorPopulation(population,q)]));
const bytes=JSON.stringify({population,selections});if(mode==='before')baseline=bytes;
rows[mode]={nearbyCollections:m.floorProof.collections,pieces:population.length,selections:Object.fromEntries(Object.entries(selections).map(([q,p])=>[q,p.length])),populationAndSelectionsSha256:await hash({population,selections}),matchesBaseline:bytes===baseline};}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),trees:trees.length,nativeSelectedPieces:T.world.modules.find(m=>m.name==='forest').module.stats().forestFloorPieces,rows};
`);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Replay actual baseline/candidate forest-floor population builders with the published world terrain, retained canonical tree population, exclusion object and planted crown field. Compare every piece property and all quality selections. Count executed nearby-list construction sites, not measured heap allocations or GC. No render substitution or hardware timing claim.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.nearbyCollections>0&&b.nearbyCollections===0&&b.matchesBaseline&&a.pieces>0&&b.selections.low===report.nativeSelectedPieces;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
