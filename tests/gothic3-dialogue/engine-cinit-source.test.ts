import { describe, expect, it } from 'vitest';
import { admitEngineCinitSource, engineCinitCaller, engineCinitFloatingPointCallback,
  engineCinitInstruction, engineCinitUnMangleInstruction, engineCinitUnMangleLiteral, engineCinitTable, engineCinitTableTarget } from '../../src/gothic3/native-engine-cinit-source';

describe('original Engine CRT initializer evidence', () => {
  it.each([
    ['30732320','e882ce90ff','3003f1a7','30076890','a13c9aad30','30011e3c','e90f617800','30797f50','b9349aad30'],
    ['30732330','e81d6590ff','30038852','30076900','a1489aad30','300057ae','e98d277900','30797f40','b9409aad30'],
    ['30732340','e823a18eff','3001c468','30076970','a1549aad30','3004214a','e9e15d7500','30797f30','b94c9aad30'],
  ])('pins original class property callback %s and its shutdown bytes', (callback,callBytes,thunk,body,bodyBytes,shutdown,shutdownBytes,destructor,destructorBytes) => {
    expect(engineCinitInstruction(callback,callback).bytes).toBe(callBytes);
    expect(engineCinitInstruction(thunk,body).bytes).toBe(bodyBytes);
    expect(engineCinitInstruction(shutdown,shutdown).bytes).toBe(shutdownBytes);
    expect(engineCinitInstruction(destructor,destructor).bytes).toBe(destructorBytes);
  });

  it('pins the original matrix callback, property body and shutdown', () => {
    expect(engineCinitInstruction('30732310','30732310').bytes).toBe('e8a93c8eff');
    expect(engineCinitInstruction('30732310','30732315').bytes).toBe('a3209ead30');
    expect(engineCinitInstruction('30015fbe','30076820').bytes).toBe('a1309aad30');
    expect(engineCinitInstruction('3000be1f','3000be1f').bytes).toBe('e93cc17800');
    expect(engineCinitInstruction('30797f60','30797f60').bytes).toBe('b9289aad30');
    expect(engineCinitInstruction('30797f60','30797f65').bytes).toBe('ff25dcdbaf30');
  });

  it('pins the original obsolete-class shutdown thunk and CString destructor tail', () => {
    expect(engineCinitInstruction('30018c5a','30018c5a').bytes).toBe('e911f37700');
    expect(engineCinitInstruction('30797f70','30797f70').bytes).toBe('b91c9aad30');
    expect(engineCinitInstruction('30797f70','30797f75').bytes).toBe('ff25dcdbaf30');
  });

  it('pins the next obsolete-class initializer and its physical property caller', () => {
    expect(engineCinitInstruction('30732300', '30732300').bytes).toBe('e8150290ff');
    expect(engineCinitInstruction('30732300', '30732305').bytes).toBe('a3249ead30');
    expect(engineCinitInstruction('30732300', '3073230a').bytes).toBe('c3');
    expect(engineCinitInstruction('3003251a', '300767b0').bytes).toBe('a1249aad30');
    expect(engineCinitInstruction('3003251a', '300767c7').bytes).toBe('890d209aad30');
    expect(engineCinitInstruction('3003251a', '300767e3').bytes).toBe('e8c6ab5f00');
    expect(engineCinitInstruction('3003251a', '300767ee').bytes).toBe('ff15b0daaf30');
    expect(engineCinitInstruction('3003251a', '300767f9').bytes).toBe('e898ad5f00');
    expect(engineCinitInstruction('3003251a', '30076806').bytes).toBe('c3');
  });
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
    expect(engineCinitUnMangleInstruction('10007d65','10007d65').bytes).toBe('e9d6b40000');
    expect(engineCinitUnMangleInstruction('10002aae','10002aae').bytes).toBe('e93de10100');
    expect(engineCinitUnMangleInstruction('100a7a00','100a7a00').bytes).toBe('55');
    expect(engineCinitUnMangleInstruction('100a7a00','100a7b96').bytes).toBe('c3');
    expect(engineCinitUnMangleLiteral()).toMatchObject({address:'100e6f44',raw:'2000'});
    expect(()=>engineCinitUnMangleInstruction('3067da97','3067da97')).toThrow();
    expect(()=>engineCinitUnMangleInstruction('100088cd','10091556')).toThrow();
  });
  it('pins the original decorated-type decoder body and retained caller',()=>{
    expect(engineCinitInstruction('3069b876','3069b8fe').bytes).toBe('e8d1f1ffff');
    expect(engineCinitInstruction('3069aad4','3069aad4').bytes).toBe('55');
    expect(engineCinitInstruction('3069aad4','3069aad7').bytes).toBe('83ec54');
    expect(engineCinitInstruction('3069aad4','3069aaff').bytes).toBe('7533');
    expect(engineCinitInstruction('3069aad4','3069afb7').bytes).toBe('c3');
    expect(engineCinitInstruction('306976b2','306976b2').bytes).toBe('56');
    expect(engineCinitInstruction('306976b2','306976c4').bytes).toBe('740c');
    expect(engineCinitInstruction('306976b2','306976d5').bytes).toBe('c20400');
  });
  it('pins the original qualified-value copy wrapper',()=>{
    expect(engineCinitInstruction('30697b16','30697b16').bytes).toBe('56');
    expect(engineCinitInstruction('30697b16','30697b1e').bytes).toBe('e870f1ffff');
    expect(engineCinitInstruction('30697b16','30697b25').bytes).toBe('e89ff5ffff');
    expect(engineCinitInstruction('30697b16','30697b64').bytes).toBe('c20800');
  });
  it('pins the second visual-animation initializer and its property thunk',()=>{
    expect(engineCinitInstruction('307322c0','307322c0').bytes).toBe('e8254d8eff');
    expect(engineCinitInstruction('30016fea','30016fea').bytes).toBe('e971f50500');
    expect(engineCinitInstruction('30016fea','30076593').bytes).toBe('e816ae5f00');
  });
  it('pins the original class-type parser and its dependent calls',()=>{
    expect(engineCinitInstruction('306995dd','306995dd').bytes).toBe('55');
    expect(engineCinitInstruction('306995dd','306995e0').bytes).toBe('a1847caf30');
    expect(engineCinitInstruction('306995dd','3069962c').bytes).toBe('743f');
    expect(engineCinitInstruction('306995dd','30699683').bytes).toBe('e887e3ffff');
    expect(engineCinitInstruction('306995dd','306996a3').bytes).toBe('e842feffff');
    expect(engineCinitInstruction('306995dd','306996dc').bytes).toBe('c3');
  });
  it('pins the original scoped-name and identifier parser bodies',()=>{
    expect(engineCinitInstruction('306994ea','306994ea').bytes).toBe('55');
    expect(engineCinitInstruction('306994ea','306995cd').bytes).toBe('c3');
    expect(engineCinitInstruction('306994ea','30699505').bytes).toBe('e8f6fdffff');
    expect(engineCinitInstruction('30699300','30699300').bytes).toBe('55');
    expect(engineCinitInstruction('30699300','306994e9').bytes).toBe('c3');
  });
  it('pins the original delimited identifier constructor',()=>{
    expect(engineCinitInstruction('30697709','30697709').bytes).toBe('55');
    expect(engineCinitInstruction('30697709','30697722').bytes).toBe('8b0f');
    expect(engineCinitInstruction('30697709','30697738').bytes).toBe('3a450c');
    expect(engineCinitInstruction('30697709','3069778c').bytes).toBe('e87bfeffff');
    expect(engineCinitInstruction('30697709','306977c1').bytes).toBe('c20800');
  });
  it('pins the original identifier reference-cache append',()=>{
    expect(engineCinitInstruction('306972d6','306972d6').bytes).toBe('56');
    expect(engineCinitInstruction('306972d6','306972e2').bytes).toBe('e8e2fdffff');
    expect(engineCinitInstruction('306972d6','306972f3').bytes).toBe('e8f8f8ffff');
    expect(engineCinitInstruction('306972d6','30697302').bytes).toBe('e88cf9ffff');
    expect(engineCinitInstruction('306972d6','3069731a').bytes).toBe('c20400');
  });
  it('rejects unknown bodies, tables and invalid callback slots', () => {
    expect(() => engineCinitInstruction('3067d1c7', '3067d1c8')).toThrow();
    expect(() => engineCinitTable('Game')).toThrow();
    for (const slot of ['307bb001', '30816824', '307baffc', 'NaN', '0x307bb000']) {
      expect(() => engineCinitTableTarget('cppInitializers', slot)).toThrow();
    }
  });
});

it('pins the original identifier cookie check and failure edge',()=>{
 expect(engineCinitInstruction('3067746c','3067746c').bytes).toBe('3b0dec43ad30');
 expect(engineCinitInstruction('3067746c','30677472').bytes).toBe('7502');
 expect(engineCinitInstruction('3067746c','30677474').bytes).toBe('f3c3');
});

it('pins the original parsed-value append entry',()=>{
 expect(engineCinitInstruction('30697906','30697906').bytes).toBe('56');
});

it('pins the original node-to-list and list constructor entries',()=>{
 expect(engineCinitInstruction('3069731d','3069731d').bytes).toBe('53');
 expect(engineCinitInstruction('30696ec9','30696ec9').bytes).toBe('8b542404');
 expect(engineCinitInstruction('30696e63','30696e63').bytes).toBe('8bc1');
});

it('pins the third visual-animation property initializer and int type arguments',()=>{
 expect(engineCinitTableTarget('cppInitializers','307bb10c')).toBe('307322d0');expect(engineCinitInstruction('307322d0','307322d5').bytes).toBe('a3309ead30');expect(engineCinitInstruction('30015bef','30015bef').bytes).toBe('e9dc090600');expect(engineCinitInstruction('30015bef','300765f9').bytes).toBe('b9fc29aa30');expect(engineCinitInstruction('30015bef','30076614').bytes).toBe('686df50230');
});


it('pins the original camera base object initializer and type arguments',()=>{
 expect(engineCinitTableTarget('cppInitializers','307bb110')).toBe('307322e0');expect(engineCinitInstruction('307322e0','307322e5').bytes).toBe('a32c9ead30');expect(engineCinitInstruction('3000d9f9','3000d9f9').bytes).toBe('e9d28c0600');expect(engineCinitInstruction('3000d9f9','300766f9').bytes).toBe('b91c2aaa30');expect(engineCinitInstruction('3000d9f9','30076714').bytes).toBe('68f1070330');
});


it('pins the original object-reference-base initializer and type arguments',()=>{
 expect(engineCinitTableTarget('cppInitializers','307bb114')).toBe('307322f0');expect(engineCinitInstruction('307322f0','307322f5').bytes).toBe('a3289ead30');expect(engineCinitInstruction('300247da','300247da').bytes).toBe('e9611f0500');expect(engineCinitInstruction('300247da','30076769').bytes).toBe('b92c20aa30');expect(engineCinitInstruction('300247da','30076784').bytes).toBe('68e0980030');
});


it('captures the reference-base shutdown thunk and exact storage destructor body',()=>{
 expect(engineCinitInstruction('300098e0','300098e0')).toMatchObject({bytes:'e99be67800',instruction:'jmp 0x30797f80'});
 expect(engineCinitInstruction('30797f80','30797f80')).toMatchObject({bytes:'b9109aad30',instruction:'mov ecx, 0x30ad9a10'});
 expect(engineCinitInstruction('30797f80','30797f85')).toMatchObject({bytes:'ff25dcdbaf30',instruction:'jmp dword ptr [0x30afdbdc]'});
});
