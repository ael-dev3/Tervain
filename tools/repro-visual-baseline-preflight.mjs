import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'visual-baseline-preflight-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const cache=fs.mkdtempSync(path.join(tmpdir(),'visual-baseline-proof-'));
try{
 const cases={missing:{},null:{value:null},array:{value:[]},number:{value:0},boolean:{value:false},missingChecks:{value:{}},invalidJson:{raw:'{broken'},valid:{value:{checks:{placement:{rootCandidates:0},shimmer:{score:.01}}}},omitted:{omit:true}};
 const rows={},sourceHashes={},helperSourceHashes={};
 for(const mode of ['before','after']){
  const ref=mode==='before'?'421d34b':args['candidate-ref'],file='tools/visual-gate.mjs',source=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
  sourceHashes[mode]=createHash('sha256').update(source).digest('hex');helperSourceHashes[mode]=null;let readVisualBaseline;
  if(source.includes('readVisualBaseline(args.baseline)')){
   const helper=ref?execFileSync('git',['show',ref+':tools/read-visual-baseline.mjs'],{encoding:'utf8'}):fs.readFileSync('tools/read-visual-baseline.mjs','utf8');
   helperSourceHashes[mode]=createHash('sha256').update(helper).digest('hex');
   ({readVisualBaseline}=await import('data:text/javascript;base64,'+Buffer.from(helper).toString('base64')));
  }
  const start=source.indexOf('const args ='),end=source.indexOf('const page = await openPage',start);if(start<0||end<0)throw Error('Gate preflight boundary missing');
  const preflight=new Function('fs','path','process','readVisualBaseline',source.slice(start,end)+'return {reachedBrowserBoundary:true,baselinePresent:baseline!==null,baselineTruthy:!!baseline,outputCreated:fs.existsSync(OUT)};');
  rows[mode]={};
  for(const[name,c]of Object.entries(cases)){
   const input=path.join(cache,name+'.json');if('value'in c)fs.writeFileSync(input,JSON.stringify(c.value));else if(c.raw)fs.writeFileSync(input,c.raw);
   const output=path.join(cache,mode,name),argv=['node','visual-gate.mjs','--out',output,'--tag','proof',...(c.omit?[]:['--baseline',input])];
   try{rows[mode][name]=preflight(fs,path,{argv},readVisualBaseline);}
   catch(error){rows[mode][name]={reachedBrowserBoundary:false,errorType:error.name,outputCreated:fs.existsSync(path.join(output,'proof'))};}
  }
 }
 const regressions=['missing','null','array','number','boolean','missingChecks'],controls=['valid','omitted'];
 const report={rows,sourceHashes,helperSourceHashes,scope:'Execute the exact visual-gate initialization through the point immediately before openPage. Real file reads and output-directory setup with controlled temporary fixtures; Chrome is deliberately not launched. Reproduce missing/malformed requested baseline fail-open and preserve valid/omitted baseline controls. No build rendering or hardware timing claim.'};
 report.pass=regressions.every(k=>rows.before[k].reachedBrowserBoundary&&!rows.after[k].reachedBrowserBoundary&&!rows.after[k].outputCreated)&&controls.every(k=>rows.before[k].reachedBrowserBoundary&&rows.after[k].reachedBrowserBoundary)&&!rows.before.invalidJson.reachedBrowserBoundary&&!rows.after.invalidJson.reachedBrowserBoundary;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{fs.rmSync(cache,{recursive:true,force:true});}
