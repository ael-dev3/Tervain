import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
const out=process.argv[2];assert.ok(out,'Output directory required');fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/foliage/foliageMoverUniform.ts',source=fs.readFileSync(file);
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true,entries:[]},plugins:[{name:'no-hot-client',transformIndexHtml:{order:'post',handler:s=>s.replace(/<script type="module" src="\/@vite\/client"><\/script>/g,'')}}]});let page;
try{
 await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/foliage-mover-uniform-fixture.html`,{w:256,h:192,requestTimeoutMs:300000});
 let ready=false;for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return window.fixtureReady')){ready=true;break;}await page.wait(100);}assert.ok(ready);
 const report=await page.eval('return moverFixture.run()');
 for(const row of report.rows){
  const images={};for(const mode of ['before','after']){const png=Buffer.from(row[mode].png.split(',')[1],'base64'),rgb=await sharp(png).removeAlpha().raw().toBuffer();images[mode]=rgb;fs.writeFileSync(path.join(out,`${mode}-${row.frame}.png`),png);delete row[mode].png;}
  assert.ok(images.before.equals(images.after),'Changed wind/shadow fixture RGB');assert.equal(row.before.draws,row.after.draws);assert.equal(row.before.triangles,row.after.triangles);
  assert.ok(row.before.calls>0);assert.ok(row.after.bytes<=row.before.bytes);console.log(JSON.stringify({frame:row.frame,before:row.before.calls,after:row.after.calls,changed:row.changed}));if(row.changed)assert.ok(row.after.calls>0,'Changed field was not uploaded');else assert.equal(row.after.calls,0);
  if(row.inactiveMover){const png=Buffer.from(row.inactiveMover.split(',')[1],'base64');const rgb=await sharp(png).removeAlpha().raw().toBuffer();assert.ok(!rgb.equals(images.after),'Mover control did not move geometry at the same wind time');fs.writeFileSync(path.join(out,'inactive-mover.png'),png);delete row.inactiveMover;row.sameTimeMoverControlDiffers=true;}
  row.rgbSha256=createHash('sha256').update(images.before).digest('hex');row.exactRgb=true;
 }
 assert.ok(report.uniforms.some(u=>u.name==='uFoliageMovers[0]'&&u.size===6&&u.type===0x8b52));assert.ok(report.uniforms.some(u=>u.name==='uFoliageMovers[0].item'&&u.size===1&&u.type===0x8b52));
 assert.notEqual(report.rows[0].rgbSha256,report.rows[2].rgbSha256,'Active-mover control did not change the picture');
 const errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(errors,[]);assert.ok(source.equals(fs.readFileSync(file)),'Production helper changed during capture');
 report.sourceSha256=createHash('sha256').update(source).digest('hex');report.consoleErrors=errors;report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,rows:report.rows.map(r=>({frame:r.frame,changed:r.changed,before:r.before.calls,after:r.after.calls,exactRgb:r.exactRgb}))}));
}finally{page?.close();await server.close();}
