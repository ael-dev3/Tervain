import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { admitGameCinitSource, gameCinitImagePins, gameCinitImageReceipt, gameCinitInstruction }
  from '../../src/gothic3/native-game-crt-cinit-source';

describe('Original Game cinit and PE-check source admission', () => {
  it('pins the complete original C++ table including its leading null slots', () => {
    const table = gameCinitImageReceipt('cinitCppInitializerTable');
    expect(table).toMatchObject({ address: '2056c000', bytes: 955408,
      sha256: 'b03bdc863cc852e3b14ef05e1082cb8616ce78c63efe3d35e5e80e9dcea40185' });
    expect(table.raw.slice(0, 65 * 8)).toBe('00'.repeat(65 * 4));
    expect(table.raw.slice(65 * 8, 66 * 8)).toBe('b0114b20');
    expect(table.raw.length).toBe(955408 * 2);
  });

  it('retains shutdown recovery provenance without granting its execution', () => {
    const source = JSON.parse(readFileSync(new URL('../../assets/gothic3/game-cinit-math-source/source.json', import.meta.url), 'utf8'));
    const walker = source.module.methods.find((method: { label: string }) => method.label === 'staticFiniWalker');
    expect(walker).toMatchObject({ entryVA: '0x20473801', bodyRanges: '20473801-20473824',
      functionCatalogEntryPresent: false, verifiedAgainstOriginalPE: true,
      recoveryOrigin: 'explicit-contiguous-original-disassembly-extent',
      bodyInstructionBytesSha256: '986b18c3a8f0645d9c2f415efcb1546abf399932f5f72e07b05dae318cb7f2a4' });
    expect(walker.instructions).toHaveLength(17);
    expect(walker.instructions.at(-1)).toMatchObject({ va: '20473824', bytes: 'c3', instruction: 'RET' });
    expect(source.literals.find((row: { label: string }) => row.label === 'staticFiniTable')).toMatchObject({
      address: '206e86e0', bytes: 256, raw: '00'.repeat(256),
      sha256: '5341e6b2646979a70e57653007a1f310169421ec9bdd9f1a5648f75ade005af1' });
    expect(() => gameCinitInstruction('20473801')).toThrow('No admitted original Game cinit instruction');
  });

  it('captures the original FILE initializer without claiming runtime execution', () => {
    expect(gameCinitInstruction('2047472e')).toMatchObject({ bytes: 'e89b3cffff',
      instruction: 'CALL 0x204683ce', assemblyOrigin: 'supplemental-ghidra-recovery' });
    expect(gameCinitInstruction('20474747').instruction).toBe('CALL 0x204683ce');
    expect(gameCinitInstruction('2047478b').instruction).toBe('IMUL EDI,EDI,0x38');
    expect(gameCinitInstruction('20474790').instruction).toBe('SAR EAX,0x5');
    expect(gameCinitInstruction('204747bc').instruction).toBe('RET');
    expect(() => gameCinitInstruction('204747bd')).toThrow();
    expect(gameCinitImageReceipt('cinitStdioCount')).toMatchObject({ address: '207d29c0', bytes: 4, liveValueCaptured: false });
    expect(gameCinitImageReceipt('cinitStdioVector')).toMatchObject({ address: '207d1664', bytes: 4, liveValueCaptured: false });
    expect(gameCinitImageReceipt('cinitStdioFiles')).toMatchObject({ address: '207b2e50', bytes: 640,
      scope: 'cold-original-image', knownMask: 'ff'.repeat(640), liveValueCaptured: false });
  });

  it('admits the original initializer and both section-check helpers', () => {
    expect(() => admitGameCinitSource()).not.toThrow();
    expect(gameCinitInstruction('204665f4')).toMatchObject({ bytes: '833d8c636b2000',
      instruction: 'CMP dword ptr [0x206b638c],0x0' });
    expect(gameCinitInstruction('20473830').instruction).toBe('MOV ECX,dword ptr [ESP + 0x4]');
    expect(gameCinitInstruction('20473860').instruction).toBe('MOV EAX,dword ptr [ESP + 0x4]');
    expect(Object.isFrozen(gameCinitInstruction('20473938'))).toBe(true);
  });

  it('keeps optional precision, SSE and divide-test fallbacks outside this execution getter', () => {
    for (const pc of ['204696ba', '20467d64', '2048bf68', '20469691', '204665f5']) {
      expect(() => gameCinitInstruction(pc)).toThrow('No admitted original Game cinit instruction');
    }
  });

  it('pins the original callback, full PE headers and exception scope', () => {
    expect(gameCinitImageReceipt('cinitMathCallback')).toMatchObject({ address: '206b638c',
      bytes: 4, raw: '17394620', knownMask: 'ffffffff', liveValueCaptured: false });
    const headers = gameCinitImageReceipt('cinitPEHeaders');
    expect(headers.address).toBe('20000000');
    expect(headers.bytes).toBe(672);
    expect(headers.raw.slice(0, 4)).toBe('4d5a');
    expect(headers.knownMask).toBe('ff'.repeat(672));
    expect(gameCinitImageReceipt('cinitNonwritableEH4Scope').bytes).toBe(28);
    expect(Object.isFrozen(gameCinitImagePins)).toBe(true);
    expect(() => gameCinitImageReceipt('cinitFloatingPointState')).toThrow();
  });

  it('admits the original C walker and all 135 table slots without admitting callback bodies', () => {
    expect(gameCinitInstruction('2046643f').instruction).toBe('PUSH ESI');
    expect(gameCinitInstruction('20466452').instruction).toBe('CALL ECX');
    expect(gameCinitInstruction('2046645e').instruction).toBe('RET');
    expect(() => gameCinitInstruction('20463763')).toThrow('No admitted original Game cinit instruction');
    const table = gameCinitImageReceipt('cinitCInitializerTable');
    expect(table).toMatchObject({ address: '20655514', bytes: 540,
      sha256: '4d072c9e4d3bf5082fc45f5a7036020e409e08d3cef3e7be396ed2a200b42b17' });
    const bytes = Uint8Array.from(table.raw.match(/../g)!, pair => parseInt(pair, 16));
    const view = new DataView(bytes.buffer);
    const slots = Array.from({ length: 135 }, (_, index) => view.getUint32(index * 4, true));
    expect(slots.slice(0, 65)).toEqual(Array(65).fill(0));
    expect(slots.slice(65, 70)).toEqual([0x20463763, 0x20469f3a, 0x2046bcff, 0x2047470c, 0x2047e687]);
    expect(slots.slice(70)).toEqual(Array(65).fill(0));
  });

  it('admits independently recovered SSE callbacks and the original query/probe rows', () => {
    expect(gameCinitInstruction('20469f41').instruction).toBe('CALL 0x2047e627');
    expect(gameCinitInstruction('2047e687').instruction).toBe('CALL 0x2047e627');
    expect(gameCinitInstruction('2047e63a').instruction).toBe('PUSHFD');
    expect(gameCinitInstruction('2047e64f').instruction).toBe('CPUID');
    expect(gameCinitInstruction('2047e5e7').instruction).toBe('MOVAPD XMM0,XMM1');
    expect(() => gameCinitInstruction('2047e5f4')).toThrow('No admitted original Game cinit instruction');
    expect(gameCinitImageReceipt('cinitSse2ConversionAvailable')).toMatchObject({ address: '207d2b40', raw: '00000000', bytes: 4 });
    expect(gameCinitImageReceipt('cinitSse2ProbeEH4Scope')).toMatchObject({ address: '206e9018', bytes: 28,
      raw: 'feffffff00000000d4ffffff00000000fefffffff4e5472010e64720' });
  });
});
