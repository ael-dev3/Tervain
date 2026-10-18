import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import {openPage} from './cdp.mjs';
const out=process.argv[2]??'grass-facing-coverage',ref='d40777b',file='src/presentation/grass/grassMaterial.ts';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=fs.readFileSync(file),legacy=execFileSync('git',['show',ref+':'+file],{encoding:'utf8'});
const runtimeJS=s=>(s.slice(0,s.indexOf('export const GRASS_BLADE_GLSL'))+s.slice(s.indexOf('export const GRASS_FRAGMENT_DECL'))).replace(/tervain-grass-blades-v(?:10|14-facing-coverage)/g,'GRASS_PROGRAM_KEY');
assert.equal(runtimeJS(source.toString()),runtimeJS(legacy),'Unexpected runtime JS change');
const transformed=(await transformWithOxc(legacy,'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>"from '"+path.posix.resolve('/src/presentation/grass',p)+"'");
const server=await createServer({root:process.cwd(),configFile:false,logLevel:'error',plugins:[{name:'published-grass',resolveId(id){if(id==='/@baseline-grass')return '\0published-grass';},load(id){if(id==='\0published-grass')return transformed;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;try{
 await server.listen();page=await openPage('http://127.0.0.1:'+server.httpServer.address().port+'/tools/grass-facing-coverage-fixture.html',{w:320,h:240});
 let ready=false;for(let i=0;i<300;i++){const state=await page.eval('return{ready:window.fixtureReady,error:window.fixtureError};');if(state.error)throw Error(state.error);if(state.ready){ready=true;break;}await page.wait(100);}assert.ok(ready,'Fixture did not become ready');
 const r=await page.eval('return window.facingProbe;');let maxCurveError=0,maxNormalError=0,maxFaceOnError=0,edgeWitnesses=0,resolved=0;
 for(let i=0;i<r.cases.length;i++){
  const c=r.cases[i],a=r.before.values.slice(i*20,i*20+20),b=r.after.values.slice(i*20,i*20+20);assert.ok([...a,...b].every(Number.isFinite));
  for(let j=0;j<8;j++)maxCurveError=Math.max(maxCurveError,Math.abs(a[j]-b[j]));
  for(let j=12;j<20;j++)maxNormalError=Math.max(maxNormalError,Math.abs(a[j]-b[j]));
  assert.ok(b[8]>=0&&b[8]<=a[8]+1e-4,'Facing estimate increased nominal width');
  assert.ok(b[9]>=0&&b[9]<=a[9]+1e-4&&b[11]>=0&&b[11]<=a[11]+1e-4,'Coverage outside the baseline budget');
  if(c.facing===0){assert.equal(b[8],0);assert.equal(b[9],0);assert.equal(b[11],0);if(a[9]>0)edgeWitnesses++;}
  if(c.facing===1)maxFaceOnError=Math.max(maxFaceOnError,Math.abs(a[8]-b[8]));
  if(c.nominal===40&&c.facing>=.5){assert.equal(b[9],a[9]);assert.equal(b[11],a[11]);resolved++;}
 }
 console.log(JSON.stringify({maxCurveError,maxNormalError,maxFaceOnError,edgeWitnesses,resolved}));fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify(r));assert.equal(maxCurveError,0);assert.equal(maxNormalError,0);assert.equal(r.fragmentEqual,true);assert.ok(maxFaceOnError<1e-4);assert.ok(edgeWitnesses>0&&resolved>0);
 const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,''),count=(s,re)=>(strip(s).match(re)??[]).length;
 for(const name of ['texture2D','textureLod','pow','sin','cos','sqrt','length','normalize','dot'])assert.equal(count(source.toString(),new RegExp('\\b'+name+'\\s*\\(','g')),count(legacy,new RegExp('\\b'+name+'\\s*\\(','g')),'Unexpected intrinsic cost change: '+name);
 const lengths={before:count(r.before.parts.arc,/\blength\s*\(/g),after:count(r.after.parts.arc,/\blength\s*\(/g)};assert.equal(lengths.after,lengths.before);
 const muls={before:count(r.before.parts.coverage,/\*/g),after:count(r.after.parts.coverage,/\*/g)};assert.equal(muls.after,muls.before+2);
 assert.ok(source.equals(fs.readFileSync(file)),'Production shader changed during probe');
 const report={baseline:ref,sourceSha256:createHash('sha256').update(source).digest('hex'),cases:r.cases.length,maxCurveErrorMetres:maxCurveError,maxNormalError,maxFaceOnWidthErrorPixels:maxFaceOnError,edgeCoverageWitnesses:{before:edgeWitnesses,after:0},resolvedCoveragePairs:resolved,cost:{textureInstructionsAdded:0,fragmentChanges:0,runtimeJsIdenticalExceptCompileKey:true,normalViewDotAdded:0,vertexVectorLengths:lengths,vertexScalarMultiplications:muls,additionalVertexOps:['abs','min'],scalarProxy:{removed:'2 scalar multiplications in tangent normalization + 2 scalar multiplications by factoring the normal edge scale',added:'2 scalar multiplications + abs + min',scope:'Deterministic scalar-operation budget, not compiled ISA, driver latency or hardware timing.'}},pass:true,scope:r.cases.length+' WebGL2 transform-feedback probes run exact production arc and coverage expressions against the published shader. Unit horizontal direction is the GrassWind/gTiltDir contract. Curve outputs are bit-identical; normal outputs are bit-identical over the sampled blade rows and sides; whole-scene image controls and motion are separate.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{page?.close();await server.close();}
