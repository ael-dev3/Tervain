import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
const out=process.argv[2]??'crown-lod-masks';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});fs.rmSync(path.join(out,'motion-verification.json'),{force:true});
const base='https://ael-dev3.github.io/Tervain/';
const download=url=>{assert.equal(new URL(url).protocol,'https:');return execFileSync('curl',['--fail','--silent','--show-error','--location','--proto','=https','--proto-redir','=https',url],{encoding:'utf8',maxBuffer:32*1024*1024});};
const liveBuild=JSON.parse(download(base+'version.json')),html=download(base),entry=html.match(/<script[^>]*src="([^"]+)"/);
assert.ok(entry,'Missing live module entry');const bundleUrl=new URL(entry[1],base).href,bundle=download(bundleUrl);
const liveStart=bundle.indexOf('float tvCellHash(vec3 cell, float seed)'),liveEnd=bundle.indexOf('`',liveStart);
assert.ok(liveStart>=0&&liveEnd>liveStart);
const coordinateRule='tvDistanceNoise((-vViewPosition - viewMatrix[3].xyz) * mat3(viewMatrix))';
assert.ok(bundle.includes(coordinateRule),'Published coordinate rule changed; update this repro');
const liveSource=bundle.slice(liveStart,liveEnd).trim();
const baselineFile=path.resolve('tools/baseline-distance.ts'),baselineModule=execFileSync('git',['show','d40777b:src/presentation/distanceVisibility.ts'],{encoding:'utf8'});
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],entries:['tools/crown-lod-mask-fixture.html']},plugins:[{name:'baseline-distance',resolveId(id){if(id==='/tools/baseline-distance.ts')return baselineFile;},load(id){if(id===baselineFile)return baselineModule;}}]});let page;
try{await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/crown-lod-mask-fixture.html`,{w:128,h:128});let ready=false;
 for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return window.fixtureReady')){ready=true;break;}await page.wait(100);}assert.ok(ready);
 const result=await page.eval('return lodMaskFixture.run()'),source=await page.eval('return lodMaskFixture.source');
 assert.equal(source,liveSource,'Fixture differs from published distance-noise GLSL');
 assert.deepEqual(JSON.parse(download(base+'version.json')),liveBuild,'Live build changed during repro');
 result.live={build:liveBuild,bundleUrl,bundleSha256:createHash('sha256').update(bundle).digest('hex'),shaderSourceExact:true,coordinateRuleExact:true};
 const movie=new Map();
 for(let i=0;i<result.rows.length;i++)for(const mode of ['before','control','shared']){const row=result.rows[i][mode];
  const sample=result.rows[i];if(sample.samples===4&&sample.near===150&&sample.weight===.5){
    const frame=Math.round(sample.pan[0]/.0433333333),dir=path.join(out,mode);fs.mkdirSync(dir,{recursive:true});
    await sharp(Buffer.from(row.pixels),{raw:{width:128,height:128,channels:4}}).flip().png().toFile(path.join(dir,String(frame).padStart(4,'0')+'.png'));
    if(mode!=='control'){if(!movie.has(frame))movie.set(frame,{});movie.get(frame)[mode]=await sharp(Buffer.from(row.pixels),{raw:{width:128,height:128,channels:4}}).flip().removeAlpha().raw().toBuffer();}
    if(frame===0)await sharp(Buffer.from(row.pixels),{raw:{width:128,height:128,channels:4}}).flip().png().toFile(path.join(out,mode+'.png'));
   }
  delete row.pixels;
 }
 result.assertions={rows:result.rows.length===54,identicalSurfaceControl:result.rows.every(r=>r.control.holes===0&&r.control.double===0),
   reproduced:result.rows.every(r=>r.before.holes>0&&r.before.double>0),sharedReferenceReduces:result.rows.every(r=>r.shared.holes+r.shared.double<r.before.holes+r.before.double)};
const frames=[];for(let i=0;i<3;i++){const pair=movie.get(i);assert.ok(pair?.before&&pair?.shared);const raw=Buffer.alloc(256*128*3);for(let y=0;y<128;y++)for(const [side,mode]of ['before','shared'].entries())pair[mode].copy(raw,(y*256+side*128)*3,y*128*3,(y+1)*128*3);frames.push(raw);}
 const input=Buffer.concat(frames),clip=path.join(out,'motion-lossless.mp4');
 execFileSync('ffmpeg',['-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size','256x128','-framerate','5','-i','pipe:0','-frames:v','3','-c:v','libx264rgb','-crf','0',clip],{input});
 const decoded=execFileSync('ffmpeg',['-v','error','-i',clip,'-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:input.length+1024});assert.ok(decoded.equals(input));
 execFileSync('ffmpeg',['-v','error','-y','-i',clip,'-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-movflags','+faststart',path.join(out,'motion-preview.mp4')]);
 fs.writeFileSync(path.join(out,'motion-verification.json'),JSON.stringify({frames:3,exact:true,sourceRgbSha256:createHash('sha256').update(input).digest('hex'),decodedSha256:createHash('sha256').update(decoded).digest('hex'),layout:'Published coordinate rule left; diagnostic shared reference right. Synthetic plane motion, not a live-tree clip. Lossy preview is not metric input.'},null,2)+'\n');
 result.sourceSha256=createHash('sha256').update(source).digest('hex');result.measurementPass=Object.values(result.assertions).every(Boolean);
 result.productionInvariantPass=result.rows.every(r=>r.before.holes===0&&r.before.double===0);
 result.scope='Controlled two surfaces with identical projected silhouettes but 4 m different depths, actual production distance-noise GLSL. Red = uncovered by either interval, blue = covered by both. Shared-reference plane is a diagnostic control, not a production fix. Counts are not live-tree pixels or a visual-quality gate.';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({assertions:result.assertions,example:result.rows[39],measurementPass:result.measurementPass,productionInvariantPass:result.productionInvariantPass}));assert.ok(result.measurementPass);
}finally{page?.close();await server.close();}
