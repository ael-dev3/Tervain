import {expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
it('removes a stale motion score before rejecting an invalid capture',()=>{
 const root=mkdtempSync(join(tmpdir(),'grass-score-'));
 try{writeFileSync(join(root,'report.json'),'{"pass":false}');writeFileSync(join(root,'paired-brightness.json'),'{"pass":true}');
 const r=spawnSync(process.execPath,['tools/score-native-grass-facing.mjs',root],{encoding:'utf8',timeout:15000});
 expect(r.error).toBeUndefined();expect(r.status).not.toBe(0);expect(existsSync(join(root,'paired-brightness.json'))).toBe(false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
it('removes a stale video receipt before rejecting an invalid capture',()=>{
 const root=mkdtempSync(join(tmpdir(),'grass-video-')),out=join(root,'encoded');mkdirSync(out);
 try{writeFileSync(join(root,'report.json'),'{"pass":false}');writeFileSync(join(out,'video-verification.json'),'{"pass":true}');
 const r=spawnSync(process.execPath,['tools/encode-grass-facing-proof.mjs',root,out],{encoding:'utf8',timeout:15000});
 expect(r.error).toBeUndefined();expect(r.status).not.toBe(0);expect(existsSync(join(out,'video-verification.json'))).toBe(false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
