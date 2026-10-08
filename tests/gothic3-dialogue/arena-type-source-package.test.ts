import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect,it } from 'vitest';
import { admitGameArenaTypeSource } from '../../src/gothic3/native-game-arena-type-source';
const sha=(raw:Uint8Array)=>createHash('sha256').update(raw).digest('hex');
it('pins the Arena type producer, source rows and cleanup import identities',()=>{
 admitGameArenaTypeSource();
 const base='assets/gothic3/arena-type/',source=JSON.parse(readFileSync(base+'source.json','utf8'));
 expect(sha(readFileSync('tools/gothic3/prepare_arena_type_source.py'))).toBe(source.producerSha256);
 expect(source.runtimeRegistrationCompleted).toBe(false);expect(source.wholeCrtTraversalCompleted).toBe(false);
 for(const method of Object.values(source.methods) as {bodyByteCount:number;bodyInstructionBytesSha256:string;sourceRefs:{assembly:string;assemblySha256:string;c?:string;cSha256?:string}}[]) {
  const assembly=readFileSync(base+method.sourceRefs.assembly);
  expect(sha(assembly)).toBe(method.sourceRefs.assemblySha256);
  const bytes=Buffer.concat(assembly.toString('utf8').trim().split('\n').map(line=>Buffer.from(line.split(' | ')[1]!,'hex')));
  expect(bytes.length).toBe(method.bodyByteCount);expect(sha(bytes)).toBe(method.bodyInstructionBytesSha256);
  if(method.sourceRefs.c)expect(sha(readFileSync(base+method.sourceRefs.c))).toBe(method.sourceRefs.cSha256);
 }
 expect(source.imports.Game).toContainEqual({iatVA:'0x207d87a0',module:'SharedBase.dll',name:'??1bCPropertyObjectFactory@@UAE@XZ',ordinal:null});
 expect(source.layout.guardOffset).toBe(60);
});
it('preserves every original SharedBase destruction listing and its native byte hash',()=>{
 const base='assets/gothic3/property-object-destruction/',source=JSON.parse(readFileSync(base+'source.json','utf8'));
 expect(source.sourceOnly).toBe(true);
 for(const method of Object.values(source.methods) as {bodyVA:string;bodyByteCount:number;bodyInstructionBytesSha256:string;assemblySha256:string;cSha256:string}[]) {
  const name=method.bodyVA.slice(2),assembly=readFileSync(base+name+'.asm.txt');
  expect(sha(assembly)).toBe(method.assemblySha256);expect(sha(readFileSync(base+name+'.c.txt'))).toBe(method.cSha256);
  const bytes=Buffer.concat(assembly.toString('utf8').trim().split('\n').map(line=>Buffer.from(line.split(' | ')[1]!,'hex')));
  expect(bytes.length).toBe(method.bodyByteCount);expect(sha(bytes)).toBe(method.bodyInstructionBytesSha256);
 }
});
