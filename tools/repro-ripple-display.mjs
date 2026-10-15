import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const out=process.argv[2]??'ripple-display-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const baseline=execFileSync('git',['show','421d34b:src/presentation/water/ripples.ts'],{encoding:'utf8'}).replace("from '../skyState'","from '/src/presentation/skyState.ts'");
const code=(await transformWithOxc(baseline,'ripples.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-ripple',resolveId(id){if(id==='/@baseline-ripple')return '\0baseline-ripple';},load(id){if(id==='\0baseline-ripple')return code;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});
let page;
try{
 await server.listen();page=await openPage('http://127.0.0.1:'+server.httpServer.address().port+'/tools/ripple-display-fixture.html',{requestTimeoutMs:600000,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});
 for(let i=0;i<600;i++){if(await page.eval('return !!(window.rippleProof||window.fixtureError)'))break;await page.wait(100);}
 const proof=await page.eval('if(window.fixtureError)throw Error(window.fixtureError);return window.rippleProof');if(!proof)throw Error('Fixture timed out');
 let pixelsEqual=true;for(const size of [64,256,512]){const buffers=[];for(const mode of ['before','after']){const file=path.join(out,mode+'-'+size+'.png');fs.writeFileSync(file,Buffer.from(proof.images[mode+'-'+size].split(',')[1],'base64'));buffers.push(await sharp(file).raw().toBuffer());}pixelsEqual&&=buffers[0].equals(buffers[1]);}
 const profiles=[64,256,512].map(size=>{const a=proof.rows.filter(r=>r.size===size&&r.mode==='before'),b=proof.rows.filter(r=>r.size===size&&r.mode==='after'),sum=(r,k)=>r.reduce((n,x)=>n+x[k],0);return{size,updates:a.length,beforeDraws:sum(a,'draws'),afterDraws:sum(b,'draws'),beforeTriangles:sum(a,'triangles'),afterTriangles:sum(b,'triangles'),beforeUploadBytes:sum(a,'uploads'),afterUploadBytes:sum(b,'uploads'),fieldTexturePayloadBytes:3*size*size*8,allFieldHashesEqual:a.every((r,i)=>r.sha===b[i].sha),nonzero:a.some(r=>r.nonzero)&&b.some(r=>r.nonzero),noGlErrors:[...a,...b].every(r=>r.error===0)};});
 const report={baseline:'421d34b',candidateSourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/water/ripples.ts')).digest('hex'),scope:'Actual source classes on software WebGL; full RGBA16F display readback after each update. Draws include simulation and display. Upload bytes exclude uniforms/warmup. Nominal three-target texture payload excludes driver overhead. No hardware timing or full-game FPS claim.',profiles,pixelsEqual};
 report.pass=pixelsEqual&&profiles.every(p=>p.updates===48&&p.beforeDraws>p.afterDraws&&p.allFieldHashesEqual&&p.nonzero&&p.noGlErrors&&p.beforeUploadBytes===p.afterUploadBytes);
 fs.writeFileSync(path.join(out,'traces.json.gz'),gzipSync(JSON.stringify(proof.rows)));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
