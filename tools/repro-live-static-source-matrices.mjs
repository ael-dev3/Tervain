import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import sharp from 'sharp';import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'static-source-matrix-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/staticMerge.ts'],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':src/presentation/staticMerge.ts'],{encoding:'utf8'}):fs.readFileSync('src/presentation/staticMerge.ts','utf8')},blocks={};
for(const[mode,source]of Object.entries(sources)){const block=source.match(/for \(const part of parts\) \{[^\n]*\}/)?.[0];if(!block)throw Error('Static completion policy missing');blocks[mode]=block;}
let page;try{
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,parts=[],groups=new Map();T.world.scene.updateMatrixWorld(true);
T.world.scene.traverse(p=>{const m=p.userData?.mergedInto;if(p.isMesh&&!p.visible&&m?.isMesh){let inScene=false;for(let n=m;n;n=n.parent)if(n===T.world.scene)inScene=true;if(inScene){parts.push(p);const list=groups.get(m)??[];list.push(p);groups.set(m,list);}}});
if(!parts.length)throw Error('No native static source parts');
const saved=parts.map(p=>({auto:p.matrixAutoUpdate,compose:p.matrix.compose,own:Object.hasOwn(p.matrix,'compose')})),policies=Object.fromEntries(Object.entries(${JSON.stringify(blocks)}).map(([mode,code])=>[mode,new Function('parts','mesh',code)]));
const snapshot=()=>parts.map(p=>[...p.matrix.elements,...p.matrixWorld.elements]);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const initial=snapshot(),rows={},images={};let composes=0;
parts.forEach((p,i)=>{p.matrix.compose=function(...a){composes++;return saved[i].compose.apply(this,a);};});
try{
 for(const mode of ['native','before','after']){
  parts.forEach((p,i)=>p.matrixAutoUpdate=saved[i].auto);
  if(mode!=='native')for(const[mesh,list]of groups)policies[mode](list,mesh);
  composes=0;for(let i=0;i<120;i++)T.world.scene.updateMatrixWorld(true);
  const count=composes,matrices=snapshot();rows[mode]={localCompositions:count,autoUpdatingParts:parts.filter(p=>p.matrixAutoUpdate).length,matricesSha256:await hash(matrices),nativeMatricesMatch:JSON.stringify(matrices)===JSON.stringify(initial)};
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{parts.forEach((p,i)=>{p.matrixAutoUpdate=saved[i].auto;if(saved[i].own)p.matrix.compose=saved[i].compose;else delete p.matrix.compose;});T.world.scene.updateMatrixWorld(true);}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),sourceParts:parts.length,mergedMeshes:groups.size,matrixWalks:120,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Published static source meshes retained by actual mergeStaticParts replacements. Execute the exact baseline/candidate completion-loop source on their existing native parts, then count their actual Matrix4.compose calls during 120 forced scene matrix walks. Whole-builder behavior is checked separately by unit tests. Preserve local/world matrices and full native endpoint pixels. Not 120 rendered frames or a hardware timing/FPS claim.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.localCompositions>0&&b.localCompositions===0&&Object.values(report.rows).every(r=>r.nativeMatricesMatch)&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
