import {it,expect} from 'vitest';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
it('removes an old canopy PASS before browser launch or driver import failure',()=>{
 const dir=mkdtempSync(join(tmpdir(),'canopy-receipt-'));
 try {const out=join(dir,'report.json'),driver=join(dir,'driver.mjs');
 writeFileSync(driver,"export async function openPage(){throw new Error('controlled launch failure')}");
 for(const selected of [driver,join(dir,'absent.mjs')]){writeFileSync(out,'{"pass":true}');const result=spawnSync(process.execPath,['tools/audit-canopy.mjs','--driver',selected,'--out',out],{encoding:'utf8'});expect(result.status).not.toBe(0);expect(existsSync(out)).toBe(false);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
it('rejects output aliasing the baseline without deleting it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'canopy-baseline-'));try{const out=join(dir,'report.json');writeFileSync(out,'{"pass":true}');const result=spawnSync(process.execPath,['tools/audit-canopy.mjs','--baseline',out,'--out',resolve(dir,'.','report.json')],{encoding:'utf8'});expect(result.status).not.toBe(0);expect(result.stderr).toContain('must be different');expect(readFileSync(out,'utf8')).toBe('{"pass":true}');}finally{rmSync(dir,{recursive:true,force:true});}
});
