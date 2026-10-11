import { describe, expect, it } from 'vitest';
import { admitEngineCinitSource, engineCinitCaller, engineCinitFloatingPointCallback,
  engineCinitInstruction, engineCinitTable, engineCinitTableTarget } from '../../src/gothic3/native-engine-cinit-source';

describe('original Engine CRT initializer evidence', () => {
  it('admits the pinned caller and floating-point callback', () => {
    expect(admitEngineCinitSource).not.toThrow();
    expect(engineCinitCaller().target).toBe('3067d1c7');
    expect(engineCinitCaller().returnAddress).toBe('3067728f');
    expect(engineCinitFloatingPointCallback().target).toBe('30671672');
    expect(engineCinitInstruction('3067d1c7', '3067d1c7').bytes).toBe('833dc02a893000');
  });
  it('preserves nonzero callbacks and original zero slots', () => {
    expect(engineCinitTable('errorInitializers').slots).toBe(200);
    expect(engineCinitTable('cppInitializers').nonzeroEntries).toHaveLength(1963);
    expect(engineCinitTableTarget('errorInitializers', '30816a2c')).toBe('3067152b');
    expect(engineCinitTableTarget('cppInitializers', '307bb104')).toBe('307322b0');
    expect(engineCinitTableTarget('cppInitializers', '307bb000')).toBeNull();
    expect(Object.isFrozen(engineCinitTable('cppInitializers').nonzeroEntries)).toBe(true);
  });
  it('pins original value assignment and string output dependencies', () => {
    expect(engineCinitInstruction('30696da9', '30696da9').bytes).toBe('8bc1');
    expect(engineCinitInstruction('30696da9', '30696e21').bytes).toBe('c20400');
    expect(engineCinitInstruction('30697114', '30697114').bytes).toBe('57');
    expect(engineCinitInstruction('30697171', '30697171').bytes).toBe('55');
  });
  it('rejects unknown bodies, tables and invalid callback slots', () => {
    expect(() => engineCinitInstruction('3067d1c7', '3067d1c8')).toThrow();
    expect(() => engineCinitTable('Game')).toThrow();
    for (const slot of ['307bb001', '30816824', '307baffc', 'NaN', '0x307bb000']) {
      expect(() => engineCinitTableTarget('cppInitializers', slot)).toThrow();
    }
  });
});
