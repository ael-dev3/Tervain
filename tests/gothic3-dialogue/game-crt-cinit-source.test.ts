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
});
