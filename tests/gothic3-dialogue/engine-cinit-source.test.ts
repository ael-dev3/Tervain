import { describe, expect, it } from 'vitest';
import { admitEngineCinitSource, engineCinitCaller, engineCinitFloatingPointCallback,
  engineCinitInstruction, engineCinitUnMangleInstruction, engineCinitUnMangleLiteral, engineCinitTable, engineCinitTableTarget } from '../../src/gothic3/native-engine-cinit-source';

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
    expect(engineCinitInstruction('306970b2', '306970b2').bytes).toBe('8b4104');
    expect(engineCinitInstruction('306970b2', '306970c8').bytes).toBe('c3');
    expect(engineCinitInstruction('30696ec5', '30696ec5').bytes).toBe('8b410c');
    expect(engineCinitInstruction('30696ec5', '30696ec8').bytes).toBe('c3');
    expect(engineCinitInstruction('3068a84a', '3068a84a').bytes).toBe('8b4c2404');
    expect(engineCinitInstruction('3068a84a', '3068a8ae').bytes).toBe('c3');
    expect(engineCinitInstruction('30679ad0', '30679ad0').bytes).toBe('8b4c2404');
    expect(engineCinitInstruction('30679ad0', '30679b50').bytes).toBe('c3');
    expect(engineCinitInstruction('30696606', '30696606').bytes).toBe('56');
    expect(engineCinitInstruction('30696606', '3069662b').bytes).toBe('c3');
    expect(engineCinitInstruction('30672f8a', '30672f8a').bytes).toBe('6a0c');
    expect(engineCinitInstruction('3069b305', '3069b305').bytes).toBe('6a05');
    expect(engineCinitInstruction('306832b6', '306832c3').bytes).toBe('ff15d8c6af30');
    expect(engineCinitInstruction('306973db', '306973db').bytes).toBe('8b410c');
    expect(engineCinitInstruction('306973db', '30697409').bytes).toBe('c20800');
  });
  it('pins the omitted cleanup continuation and lock-14 finally helper', () => {
    expect(engineCinitInstruction('3067db6a', '3067db6a').bytes).toBe('59');
    expect(engineCinitInstruction('3067db6a', '3067db6b').bytes).toBe('c745fcfeffffff');
    expect(engineCinitInstruction('3067db6a', '3067db72').bytes).toBe('e80c000000');
    expect(engineCinitInstruction('3067db83', '3067db83').bytes).toBe('6a0e');
    expect(engineCinitInstruction('3067db83', '3067db85').bytes).toBe('e82c570000');
    expect(engineCinitInstruction('3067db83', '3067db8b').bytes).toBe('c3');
  });
  it('admits the matching SharedBase UnMangle and CString dependency bytes',()=>{
    expect(engineCinitUnMangleInstruction('100088cd','100088cd').bytes).toBe('e97e8c0800');
    expect(engineCinitUnMangleInstruction('100088cd','10091555').bytes).toBe('68446f0e10');
    expect(engineCinitUnMangleInstruction('100a7430','100a7430').bytes).toBe('8b4c2408');
    expect(engineCinitUnMangleInstruction('10003ba7','10003ba7').bytes).toBe('e944fa0000');
    expect(engineCinitUnMangleLiteral()).toMatchObject({address:'100e6f44',raw:'2000'});
    expect(()=>engineCinitUnMangleInstruction('3067da97','3067da97')).toThrow();
    expect(()=>engineCinitUnMangleInstruction('100088cd','10091556')).toThrow();
  });
  it('rejects unknown bodies, tables and invalid callback slots', () => {
    expect(() => engineCinitInstruction('3067d1c7', '3067d1c8')).toThrow();
    expect(() => engineCinitTable('Game')).toThrow();
    for (const slot of ['307bb001', '30816824', '307baffc', 'NaN', '0x307bb000']) {
      expect(() => engineCinitTableTarget('cppInitializers', slot)).toThrow();
    }
  });
});
