import {createHash} from 'node:crypto';
import {describe,it,expect} from 'vitest';
import observation from '../../assets/gothic3/shared-dll-entry-source/windows-version-api-observation.json';
import source from '../../assets/gothic3/shared-dll-entry-source/source.json';
import {sharedDllEntryInstruction} from '../../src/gothic3/native-shared-dll-entry-instructions';
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
describe('original SharedBase DLL entry evidence',()=>{
 it('retains every original body and thunk instruction without granting execution',()=>{
  expect(source.inputSha256).toBe('5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214');
  expect(source.verifiedAgainstOriginalPE).toBe(true);
  expect(source.methods).toHaveLength(11);
  expect(source.methods.reduce((n,m)=>n+m.instructions.length,0)).toBe(1317);
  for(const method of source.methods){
   for(const row of method.instructions){const emitted=sharedDllEntryInstruction(row.va);expect(emitted).toEqual({address:row.va,bytes:row.bytes,instruction:row.instruction});expect(Object.isFrozen(emitted)).toBe(true);}
   for(const row of method.entryChain)expect(sharedDllEntryInstruction(row.va)).toEqual({address:row.va,bytes:row.bytes,instruction:'JMP 0x'+row.targetVA});
  }
  expect(()=>sharedDllEntryInstruction('00000000')).toThrow('Unowned');
 });
 it('preserves the absence of DllGetVersion in the installed export table',()=>{
  expect(source.versionExportLookup).toMatchObject({name:'DllGetVersion',namedExportCount:4805,matches:[]});
  expect(source.imports.map(i=>i.name)).toContain('LoadLibraryA');
  expect(source.imports.map(i=>i.name)).toContain('GetProcAddress');
 });
 it('preserves the actual version resource and translated FileVersion text',()=>{
  expect(source.versionResources.entries).toHaveLength(1);
  const entry=source.versionResources.entries[0]!;
  expect(entry.path).toEqual([16,1,1031]);expect(entry.size).toBe(868);
  expect(sha(Buffer.from(entry.bytes,'hex'))).toBe(entry.sha256);
  expect(entry.sha256).toBe('2b94742476a11cd051b72d535033a373ab7d4ddb68ec2ecda3cdf459e59974d3');
  const strings=entry.blocks.children.find(b=>b.key==='StringFileInfo')!;
  expect(strings.children[0]!.children.find(b=>b.key==='FileVersion')!.text).toBe('1, 60, 25931, 29');
 });
 it('retains cold guard and optional hook bytes',()=>{
  for(const name of ['optionalCrtHook','dllInitializerObject','dllInitializerGuard'])expect(source.coldImages.find(i=>i.label===name)!.bytes).toBe('00000000');
  expect(sharedDllEntryInstruction('100a164f').instruction).toBe('RET 0xc');
 });
});

it('preserves the prepared ANSI version buffer and contained actual query results',()=>{
 expect(observation.inputSha256).toBe(source.inputSha256);
 expect(observation.size).toBe(1740);expect(observation.handle).toBe(0);
 const bytes=Buffer.from(observation.preparedBufferBytes,'hex');
 expect(bytes.length).toBe(observation.size);expect(sha(bytes)).toBe(observation.preparedBufferSha256);
 expect(observation.queries.map(q=>[q.offset,q.length])).toEqual([[864,4],[1200,17]]);
 for(const query of observation.queries){
  expect(query.result).toBe(1);expect(query.offset).toBeGreaterThanOrEqual(0);
  expect(query.offset+query.length).toBeLessThanOrEqual(bytes.length);
  expect(bytes.subarray(query.offset,query.offset+query.length).toString('hex')).toBe(query.bytes);
 }
 expect(Buffer.from(observation.queries[1]!.bytes,'hex').toString('ascii')).toBe('1, 60, 25931, 29\0');
});

it('replays only the observed query mutations from the initialized API buffer',()=>{
 const bytes=Buffer.from(observation.initialBufferBytes,'hex');
 expect(bytes.length).toBe(observation.size);expect(sha(bytes)).toBe(observation.initialBufferSha256);
 expect(observation.queries.map(q=>q.changedBytes.length)).toEqual([0,16]);
 for(const query of observation.queries){
  expect(sha(bytes)).toBe(query.beforeSha256);
  for(const change of query.changedBytes){expect(change.offset).toBeLessThan(bytes.length);expect(bytes[change.offset]).toBe(change.before);bytes[change.offset]=change.after;}
  expect(sha(bytes)).toBe(query.afterSha256);
 }
 expect(bytes.toString('hex')).toBe(observation.preparedBufferBytes);
});

it('retains VERSION import thunk bytes and their original IAT receipts',()=>{
 expect(source.versionImportThunks).toHaveLength(3);for(const thunk of source.versionImportThunks){expect(thunk.import.module).toBe('VERSION.dll');expect(thunk.bytes).toBe('ff25'+Buffer.from(Uint32Array.of(parseInt(thunk.import.iatVA,16)).buffer).toString('hex'));expect(sharedDllEntryInstruction(thunk.address)).toEqual({address:thunk.address,bytes:thunk.bytes,instruction:thunk.instruction});}
});


it('captures the actual formatted query helper, output engine and zero-filled output buffer',()=>{
 const helper=source.methods.find(m=>m.label==='versionQuerySprintf')!;
 const engine=source.methods.find(m=>m.label==='formattedOutputEngine')!;
 expect(helper.bodyVA).toBe('0x100aa234');expect(helper.instructions).toHaveLength(51);
 expect(helper.instructions.find(i=>i.va==='100aa287')!.instruction).toBe('CALL 0x100b5355');
 expect(engine.bodyVA).toBe('0x100b5355');expect(engine.instructions).toHaveLength(769);
 const output=source.coldImages.find(i=>i.label==='versionQueryOutput')!;
 expect(output.address).toBe('101ab190');expect(output.size).toBe(256);
 expect(output.bytes).toBe('00'.repeat(256));
 const literal=(label:string)=>Buffer.from(source.coldImages.find(i=>i.label===label)!.bytes,'hex').toString('ascii');
 expect(literal('translatedVersionQuery')).toBe('\\StringFileInfo\\%02X%02X%02X%02X\\FileVersion\0');
 expect(literal('localeVersionQuery')).toBe('\\StringFileInfo\\%04X04B0\\FileVersion\0');
});
