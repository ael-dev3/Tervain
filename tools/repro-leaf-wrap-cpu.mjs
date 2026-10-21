import fs from 'node:fs';import path from 'node:path';import{execFileSync}from'node:child_process';
const root=process.cwd(),out=path.resolve(process.argv[2]??'leaf-wrap-cpu'),original=path.join(root,'src/presentation/__leaf-wrap-original.ts'),test=path.join(root,'tests/presentation/__leaf-wrap-cpu.test.ts');
if(fs.existsSync(original)||fs.existsSync(test))throw Error('Refusing to overwrite CPU probe files');fs.mkdirSync(out,{recursive:true});
const testSource=fs.readFileSync(new URL('./leaf-wrap-cpu-fixture.txt',import.meta.url),'utf8');
try{fs.writeFileSync(original,execFileSync('git',['show','3596f1e8b:src/presentation/leafSurfaceSites.ts'],{cwd:root}));fs.writeFileSync(test,testSource);for(let run=0;run<3;run++){execFileSync('npx',['vitest','run',test],{cwd:root,env:{...process.env,WRAP_CPU_OUT:path.join(out,`run-${run}.json`)},stdio:'pipe'});console.log('CPU set '+run+' complete');}}finally{fs.rmSync(original,{force:true});fs.rmSync(test,{force:true});}
