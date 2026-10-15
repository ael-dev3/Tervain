import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createServer} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const out=process.argv[2]??'hidden-leaf-poses-proof',baseline='421d34b';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=execFileSync('git',['show',`${baseline}:src/presentation/fallingLeaves.ts`],{encoding:'utf8'}).replace(/from '\.\//g,"from '/src/presentation/").replace(/from '\.\.\//g,"from '/src/");
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true},plugins:[{name:'baseline-falling',resolveId(id){if(id==='/@baseline-falling')return '/src/presentation/__baseline-falling.ts';},load(id){if(id==='/src/presentation/__baseline-falling.ts')return source;}}]});
let page;const reports={},captures=[19,20,50,80,110,111,150,190,210];try{await server.listen();for(const mode of ['baseline','candidate']){page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/hidden-leaf-poses-fixture.html?mode=${mode}`,{w:320,h:240,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});let ready=false;for(let i=0;i<600;i++){const e=await page.eval('return window.fixtureError');if(e)throw Error(e);if(await page.eval('return !!window.hiddenLeafProof')){ready=true;break;}await page.wait(100);}if(!ready)throw Error('Fixture not ready');for(let i=0;i<=210;i++){await page.eval(`window.hiddenLeafProof.step(${i});`);if(captures.includes(i))await page.shot(path.join(out,`${mode}-${i}.png`));}reports[mode]=await page.eval('return window.hiddenLeafProof.rows');page.close();page=null;}
 const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');const stable=rows=>rows.map(({writes,...r})=>r);
 let pixelDifferences=0;for(const i of captures){const a=await sharp(path.join(out,`baseline-${i}.png`)).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,`candidate-${i}.png`)).removeAlpha().raw().toBuffer();for(let j=0;j<a.length;j+=3)if(!a.subarray(j,j+3).equals(b.subarray(j,j+3)))pixelDifferences++;}
 const sum=rows=>rows.reduce((s,r)=>s+r.writes,0),a=reports.baseline,b=reports.candidate;
 const sample=await sharp(path.join(out,'candidate-50.png')).removeAlpha().raw().toBuffer();const colors=new Set();for(let i=0;i<sample.length;i+=3)colors.add(sample.subarray(i,i+3).toString('hex'));
 const report={sampleColorCount:colors.size,baseline,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/fallingLeaves.ts')).digest('hex'),frames:a.length,beforePoseWrites:sum(a),afterPoseWrites:sum(b),visibleMatricesAlphaBoundsOrderAndRenderCountersIdentical:hash(stable(a))===hash(stable(b)),pixelDifferences,captures:captures.length,scope:'Production falling-leaf module with 256 seeded streams on a controlled woodland plane, transparent overlap, delayed first visibility, camera turns/horizon exit/re-entry and later phase advances. Software WebGL; not whole-world image quality or hardware timing.'};
 report.pass=report.sampleColorCount>16&&report.beforePoseWrites>report.afterPoseWrites&&report.visibleMatricesAlphaBoundsOrderAndRenderCountersIdentical&&pixelDifferences===0&&b.every(r=>r.glError===0&&r.writes===(r.cachedBefore?r.visible:r.pool))&&b.some(r=>r.cachedBefore&&r.visible===0)&&a.some(r=>r.visible>0)&&a.some(r=>!r.cachedBefore&&r.visible===0);
 const compact=rows=>rows.map(({visibleMatrices,alpha,...r})=>({...r,visibleMatricesSha256:hash(visibleMatrices),alphaSha256:hash(alpha)}));fs.writeFileSync(path.join(out,'traces.json.gz'),gzipSync(JSON.stringify({baseline:compact(a),candidate:compact(b)})));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
