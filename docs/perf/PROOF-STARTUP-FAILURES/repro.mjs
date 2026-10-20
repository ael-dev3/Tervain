import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
const root=process.cwd(),out=process.argv[2];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'proof-startup-native-'));
const server=createServer((req,res)=>{if(req.url.startsWith('/broken.js')){res.writeHead(404,{'Content-Type':'text/html'});res.end('<p>missing required module</p>');}else{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><script type="module" src="/broken.js"></script>');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`,results=[];
try{
 const native=pathToFileURL(path.join(root,'tools/cdp.mjs')).href;
 fs.writeFileSync(path.join(dir,'driver.mjs'),`import{openPage as native}from${JSON.stringify(native)};export async function openPage(...args){const p=await native(...args),close=p.close;globalThis.measure={started:performance.now(),cutoff:false};const timer=setTimeout(()=>{globalThis.measure.cutoff=true;close()},3000);p.close=()=>{clearTimeout(timer);close()};return p}`);
 const old=execFileSync('git',['show','b317734:tools/live-proof-page.mjs'],{encoding:'utf8'}),candidate=fs.readFileSync('tools/live-proof-page.mjs','utf8');
 for(const [name,source] of [['old',old],['candidate',candidate]]){
  const file=path.join(dir,name+'.mjs');fs.writeFileSync(file,source.replace("'./cdp.mjs'","'./driver.mjs'"));
  const {liveProofPage}=await import(pathToFileURL(file).href);
  try{const p=await liveProofPage(base);p.close();throw Error('Broken page unexpectedly ready');}catch(e){const row={name,error:e.message,externalCutoff:globalThis.measure.cutoff,elapsedAfterOpenMs:performance.now()-globalThis.measure.started};results.push(row);console.log(JSON.stringify(row));}
 }
 if(!results[0].externalCutoff||results[1].externalCutoff||results[1].error!=='Published world failed to load a script')throw Error('Native startup assertions failed');
 fs.writeFileSync(out,JSON.stringify({fixture:'HTML page whose required module returns HTTP 404 with HTML MIME type; no game build or renderer timing claim',watchdogMs:3000,results,pass:true},null,2));
}finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
