import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const out=process.argv[2]??'shadow-zero-kernel';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/softShadows.ts',source=fs.readFileSync(file);
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],entries:['tools/shadow-zero-kernel-fixture.html']}});let page;
try{await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/shadow-zero-kernel-fixture.html`,{w:64,h:64});let ready=false;
 for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return window.fixtureReady')){ready=true;break;}await page.wait(100);}assert.ok(ready);
 const result=await page.eval('return window.fixtureReport');assert.equal(result.pass,true);assert.ok(source.equals(fs.readFileSync(file)));
 const report={revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:createHash('sha256').update(source).digest('hex'),fixture:result,pass:true,scope:'Current production installation into Three shadow chunk, actual comparison-tap kernel, 1-pixel software WebGL. Correctness and comparison-call counts only; not whole-scene hardware cadence.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,keys:Object.keys(result)}));
}finally{page?.close();await server.close();}
