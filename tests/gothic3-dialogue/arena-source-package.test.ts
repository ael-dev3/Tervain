import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect,it } from 'vitest';
import { admitGameArenaSource } from '../../src/gothic3/native-game-arena-class-name-source';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
it('pins the Arena producer and every referenced source file', () => {
 admitGameArenaSource();
 const base='assets/gothic3/arena-class-name/';
 const source=JSON.parse(readFileSync(base+'source.json','utf8'));
 expect(sha(readFileSync('tools/gothic3/prepare_arena_class_name_source.py'))).toBe(source.producerSha256);
 expect(source.sourceOnly).toBe(true);
 expect(source.wholeCrtTraversalCompleted).toBe(false);
 expect(source.runtimeRegistrationCompleted).toBe(false);
 for(const method of Object.values(source.methods) as {sourceRefs:{assembly:string;assemblySha256:string;c?:string;cSha256?:string}}[]) {
  expect(sha(readFileSync(base+method.sourceRefs.assembly))).toBe(method.sourceRefs.assemblySha256);
  if(method.sourceRefs.c)expect(sha(readFileSync(base+method.sourceRefs.c))).toBe(method.sourceRefs.cSha256);
 }
 expect(source.methods.arenaClassNameVirtualEntry.entryChain.map((entry:{va:string})=>entry.va)).toEqual(['2001d278','2006e4f0','20031fca']);
 expect(source.methods.arenaClassNameInitializer.sourceASMGap).toBe(true);
});
it('checks all 20-byte pool method files and original constants', () => {
 const base='assets/gothic3/arena-heap/';
 const source=JSON.parse(readFileSync(base+'runtime-rules.json','utf8'));
 expect(source.sourceOnly).toBe(true);expect(source.nativeCodeExecuted).toBe(false);
 for(const method of Object.values(source.methods) as {sourceRefs:{assemblyExcerpt:string;assemblyExcerptSha256:string;cExcerpt?:string;cExcerptSha256?:string}}[]) {
  expect(sha(readFileSync(base+method.sourceRefs.assemblyExcerpt))).toBe(method.sourceRefs.assemblyExcerptSha256);
  if(method.sourceRefs.cExcerpt)expect(sha(readFileSync(base+method.sourceRefs.cExcerpt))).toBe(method.sourceRefs.cExcerptSha256);
 }
 expect(source.constWords.heap20Stride.value).toBe(20);
 expect(source.constWords.heap20Capacity.value).toBe(65535);
 expect(source.buckets['20'].bitmapOffset).toBe(0x13fffc);
});
