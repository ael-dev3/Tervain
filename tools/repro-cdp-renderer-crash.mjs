#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).flatMap((s,i,a)=>s.startsWith('--')?[[s.slice(2),a[i+1]]]:[]));
const { openPage } = await import(pathToFileURL(path.resolve(args.driver ?? 'tools/cdp.mjs')).href);
const live = args.live === '1', timeoutMs = 600000;
let page;
try {
 const url = live ? new URL(args.url ?? 'https://ael-dev3.github.io/Tervain/') : new URL('data:text/html,renderer-crash-control');
 if(live)for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'15'}))url.searchParams.set(k,v);
 page = await openPage(url.href, {w:640,h:360,requestTimeoutMs:timeoutMs,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
 let build=null;
 if(live){let ready=false;for(let i=0;i<1200;i++){if(await page.eval('return window.tervain?.mode === "play" && document.title === "READY";')){ready=true;break;}await page.wait(250);}assert(ready,'Live world not ready');build=await page.eval('const T=tervain;T.render=()=>{};T.step=()=>{};return fetch("version.json").then(r=>r.json());');}
 let result=null;
 const pending=page.eval('return new Promise(() => {});').then(()=>{result={state:'resolved'};},e=>{result={state:'rejected',error:e.message};});
 await page.wait(100);
 const start=performance.now(), crash=page.cdp('Page.crash').catch(()=>{});
 await Promise.race([pending,page.wait(1200)]);
 const report={scope:live?'Controlled renderer crash after the published High world becomes ready; not an organic game crash.':'Controlled renderer crash on a minimal page.',build,requestTimeoutMs:timeoutMs,observationMs:performance.now()-start,result:result??{state:'pending'},expected:args.expect??'rejected',console:page.console()};
 // Cleanup is excluded from the measured observation. Old code can reject only after this socket closes.
 page.close();await Promise.all([pending,crash]);page=null;
 report.pass=report.result.state===report.expected;
 if(args.out)fs.writeFileSync(args.out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));assert(report.pass,'Unexpected request outcome');
}finally{page?.close();}
