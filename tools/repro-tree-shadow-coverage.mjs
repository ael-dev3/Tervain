import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=process.argv[2]??'tree-shadow-coverage-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const baselineRef='421d34b',baseline=execFileSync('git',['show',`${baselineRef}:src/presentation/flora.ts`],{cwd:root,encoding:'utf8'}).replace(/from '\.\//g,"from '/src/presentation/").replace(/from '\.\.\//g,"from '/src/");
const server=await createServer({root,configFile:false,logLevel:'error',optimizeDeps:{include:['three'],entries:[]},server:{host:'127.0.0.1',port:0,hmr:false,ws:false},plugins:[{name:'baseline',resolveId(id){if(id==='/@baseline-flora')return '/src/presentation/__baseline_flora.ts';},load(id){if(id==='/src/presentation/__baseline_flora.ts')return baseline;}}]});
let page;const reports={};try{await server.listen();for(const mode of ['baseline','candidate']){page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/tree-shadow-coverage-fixture.html?mode=${mode}`,{w:320,h:240,requestTimeoutMs:300000});let ready=false;for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return !!window.shadowCoverageProof')){ready=true;break;}await page.wait(100);}if(!ready)throw Error('Shadow fixture did not finish');reports[mode]=await page.eval('return window.shadowCoverageProof');fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(reports[mode].panImage.split(',')[1],'base64'));delete reports[mode].panImage;page.close();page=null;}
 const a=await sharp(path.join(out,'baseline.png')).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,'candidate.png')).removeAlpha().raw().toBuffer();
 const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),summary=r=>({rows:r.rows,stateSha256:sha(r.states),receiverFramesSha256:sha(r.receiverFrames),pass:r.pass});
 const report={schema:1,baselineRef,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/flora.ts'))).digest('hex'),before:summary(reports.baseline),after:summary(reports.candidate),casterBuffersBitIdentical:sha(reports.baseline.states)===sha(reports.candidate.states),receiverFramesIdentical:sha(reports.baseline.receiverFrames)===sha(reports.candidate.receiverFrames),pixelIdentical:a.equals(b),scope:'Source-backed High forest with supplied pine models and procedural catalog, actual shadow-only hooks, five fixed-position camera turns plus two near shadow-LOD blend controls. Actual caster coverage WebGL uploads; rendered receiver images at every step. Not final post/MSAA or hardware timing.',qualityPass:null};
 const background=a.subarray(0,3);report.nonBackgroundPixels=0;for(let i=0;i<a.length;i+=3)if(!a.subarray(i,i+3).equals(background))report.nonBackgroundPixels++;
 report.pass=report.nonBackgroundPixels>100&&reports.baseline.pass&&reports.candidate.pass&&report.casterBuffersBitIdentical&&report.receiverFramesIdentical&&report.pixelIdentical&&report.before.rows.slice(0,5).every((r,i)=>r.unnecessaryVersions>0&&r.coverageUploadBytes>0&&report.after.rows[i].unnecessaryVersions===0&&report.after.rows[i].coverageUploadBytes===0&&r.drawCalls===report.after.rows[i].drawCalls&&r.triangles===report.after.rows[i].triangles);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'traces.json.gz'),gzipSync(JSON.stringify(reports)));console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
