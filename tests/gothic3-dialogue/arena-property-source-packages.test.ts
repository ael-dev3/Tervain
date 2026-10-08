import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { NativeGameCrtOwner } from '../../src/gothic3/native-game-crt';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { nativeGameTypeInfoForCrt } from '../../src/gothic3/native-crt-undname';

const sha = (raw: Uint8Array) => createHash('sha256').update(raw).digest('hex');
it('retains separate actual Game Status cache and RTTI image storage', () => {
  const platform = new NativeRuntimePlatform();
  const crt = NativeGameCrtOwner.forPlatform({platform, errnoSlot: () => ({known:false, reason:'not initialized'})});
  const status = crt.imageStorage('arenaStatusClassName');
  expect(status).not.toBe(crt.imageStorage('arenaClassName'));
  expect(status.readUnsigned(8)).toBe(0);
  expect(crt.imageStorage('arenaStatusDescriptor').bytes.length).toBe(36);
  const name = nativeGameTypeInfoForCrt(crt, 'arenaStatus');
  expect(name.descriptor).toBe(crt.imageStorage('arenaStatusTypeInfoDescriptor'));
  expect(name).toBe(nativeGameTypeInfoForCrt(crt, 'arenaStatus'));
  expect(name.descriptor).not.toBe(nativeGameTypeInfoForCrt(crt, 'arena').descriptor);
});
interface Method {
  bodyVA: string; instructionCount: number; bodyByteCount: number;
  bodyInstructionBytesSha256: string; assemblySha256: string; cSha256: string;
}
for (const packageName of ['arena-property-registration', 'arena-status-descriptor', 'game-template-demangler', 'shared-diagnostic-locale', 'shared-crt-bootstrap']) {
  it(`preserves the original instruction and C evidence for ${packageName}`, () => {
    const base = `assets/gothic3/${packageName}/`;
    const source = JSON.parse(readFileSync(base + 'source.json', 'utf8'));
    expect(source.sourceOnly).toBe(true);
    expect(source.wholeCrtTraversalCompleted).toBe(false);
    for (const method of Object.values(source.methods) as Method[]) {
      const body = method.bodyVA.slice(2);
      const assembly = readFileSync(base + body + '.asm.txt');
      expect(sha(assembly)).toBe(method.assemblySha256);
      expect(sha(readFileSync(base + body + '.c.txt'))).toBe(method.cSha256);
      const rows = assembly.toString('utf8').trim().split('\n');
      const bytes = Buffer.concat(rows.map(row => Buffer.from(row.split(' | ')[1]!, 'hex')));
      expect(rows.length).toBe(method.instructionCount);
      expect(bytes.length).toBe(method.bodyByteCount);
      expect(sha(bytes)).toBe(method.bodyInstructionBytesSha256);
    }
  });
}
it('pins the Status owner dispatch and cold descriptor independently of runtime execution', () => {
  const source = JSON.parse(readFileSync('assets/gothic3/arena-status-descriptor/source.json', 'utf8'));
  expect(source.vtableAddress).toBe('20659aec');
  expect(source.slots['10']).toBe('2001af23');
  expect(source.methods.statusVirtualSlot10.bodyInstructionBytesSha256)
    .toBe('38058506e8e859d5be73a33baa621352c08ea01f2224ee170173253757193941');
  expect(source.coldDescriptor.address).toBe('207b5038');
  expect(source.coldDescriptor.raw).toBe('00'.repeat(36));
  expect(source.nameLiteral).toEqual({ address: '20657534', raw: '53746174757300' });
  expect(source.typeNameCache.address).toBe('207b4f58');
  expect(source.typeNameCache.raw).toBe('00'.repeat(12));
  expect(source.priorNameResult.address).toBe('207b5020');
  expect(source.priorNameResult.raw).toBe('00'.repeat(4));
  expect(source.typeInfoDescriptor.decoratedName).toBe('.?AV?$bTPropertyContainer@W4gEArenaStatus@@@@');
  expect(Buffer.from(source.typeInfoDescriptor.raw, 'hex').subarray(8).toString())
    .toBe('.?AV?$bTPropertyContainer@W4gEArenaStatus@@@@\0');
  expect(source.typeNameCleanup.entry).toBe('200064f1');
  const thunk = Buffer.from(source.typeNameCleanup.entryBytes, 'hex');
  expect(thunk[0]).toBe(0xe9);
  expect(0x200064f1 + 5 + thunk.readInt32LE(1)).toBe(0x20549920);
  expect(source.typeNameCleanup.bodyBytes).toBe('b9584f7b20ff2534887d20');
  expect(sha(Buffer.from(source.typeNameCleanup.bodyBytes, 'hex')))
    .toBe(source.typeNameCleanup.bodyInstructionBytesSha256);
});
it('records original SharedBase static TLS without claiming loader-assigned thread storage', () => {
  const source=JSON.parse(readFileSync('assets/gothic3/arena-property-registration/source.json','utf8'));
  const tls=source.staticTls;
  const directory=Buffer.from(tls.directoryRaw,'hex');
  expect(directory.length).toBe(24);
  expect(directory.readUInt32LE(0)).toBe(0x10301000);
  expect(directory.readUInt32LE(4)).toBe(0x103016d4);
  expect(directory.readUInt32LE(8)).toBe(0x102f6480);
  const template=Buffer.from(tls.templateRaw,'hex');
  expect(template.length).toBe(0x6d4);
  expect(sha(template)).toBe(tls.templateSha256);
  expect(tls.debugBufferOffset).toBe(0x108);
  expect(tls.loaderSlotAssigned).toBe(false);
  expect(tls.indexInitialRaw).toBe('00000000');
  expect(directory.readUInt32LE(12)).toBe(0x100e5780);
  expect(tls.callbacksTerminatorRaw).toBe('00000000');
  expect(source.registrationDebugFormat.address).toBe('100e9f40');
  expect(source.registrationDebugFormat.text.match(/%s/g)).toHaveLength(2);
});

it('preserves original SharedBase CRT cold globals separately from static TLS',()=>{
 const source=JSON.parse(readFileSync('assets/gothic3/shared-crt-bootstrap/source.json','utf8'));
 const globals=source.coldGlobals;
 expect(globals.securityCookie.raw).toBe('4ee640bb');
 expect(globals.securityCookieComplement.raw).toBe('b119bf44');
 expect(globals.tlsGetterIndex.raw).toBe('ffffffff');
 expect(globals.threadDataIndex.raw).toBe('ffffffff');
 expect(globals.procedureSlots.raw).toBe('00'.repeat(16));
 expect(globals.procedureSlots.section.loaderZeroFillBytes).toBe(16);
 expect(globals.localePointer.raw).toBe('90131410');
 expect(globals.multibytePointer.raw).toBe('600e1410');
 expect(globals.threadLocaleMask.raw).toBe('feffffff');
 for(const receipt of Object.values(globals) as {bytes:number;raw:string;knownMask:string;scope:string;liveValueCaptured:boolean}[]){
  expect(receipt.raw.length).toBe(receipt.bytes*2);
  expect(receipt.knownMask).toBe('ff'.repeat(receipt.bytes));
  expect(receipt.scope).toBe('cold-original-image');expect(receipt.liveValueCaptured).toBe(false);
 }
});

it('pins the original SharedBase TLS fallback allocator instructions',()=>{
 const source=JSON.parse(readFileSync('assets/gothic3/shared-crt-bootstrap/source.json','utf8'));
 expect(source.tlsFallbackAllocator.address).toBe('100ae360');
 expect(source.tlsFallbackAllocator.raw).toBe('ff15bc972f10c20400');
 expect(sha(Buffer.from(source.tlsFallbackAllocator.raw,'hex'))).toBe(source.tlsFallbackAllocator.sha256);
});
