import { describe, expect, it } from 'vitest';
import { admitGameCinitSource, gameCinitImagePins, gameCinitImageReceipt, gameCinitInstruction }
  from '../../src/gothic3/native-game-crt-cinit-source';

describe('Original Game cinit and PE-check source admission', () => {
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
});
