import originalSource from '../../assets/gothic3/engine-cinit/research.json';
import { describe, expect, it } from 'vitest';
import source from '../../assets/gothic3/engine-cinit/research.json';
import { admitEngineCinitSource, engineCinitCaller, engineCinitFloatingPointCallback,
  engineCinitInstruction, engineCinitUnMangleInstruction, engineCinitUnMangleLiteral, engineCinitTable, engineCinitTableTarget, engineCinitImage } from '../../src/gothic3/native-engine-cinit-source';

describe('original Engine CRT initializer evidence', () => {
  it('returns the exact frozen receipt for every image and rejects unadmitted labels', () => {
    expect(new Set(source.images.map(image => image.label)).size).toBe(source.images.length);
    for (const image of source.images) {
      expect(engineCinitImage(image.label)).toBe(image);
      expect(Object.isFrozen(image)).toBe(true);
    }
    for (const label of ['', 'foreign-image', '__proto__', 'toString']) {
      expect(() => engineCinitImage(label)).toThrow('Original Engine initializer image required');
    }
  });
  it.each([
    ['307323e0','e8e8ca90ff','3003eecd','30076ea0','a1cc9aad30','3003ae86','e905d07500','30797e90','b9c49aad30'],
    ['307323f0','e8172390ff','3003470c','30076f10','a1d89aad30','3002eac8','e9b3937600','30797e80','b9d09aad30'],
    ['30732400','e8590e8fff','3002325e','30076f80','a1e49aad30','300191ff','e96cec7700','30797e70','b9dc9aad30'],
    ['30732410','e82eba8fff','3002de43','30076ff0','a1f09aad30','30044edb','e9802f7500','30797e60','b9e89aad30'],
    ['30732420','e886688dff','30008cab','30077060','a1fc9aad30','3002301a','e9314e7700','30797e50','b9f49aad30'],
    ['30732430','e868848eff','3001a89d','300770d0','a1089bad30','3003f5f3','e948887500','30797e40','b9009bad30'],
    ['30732440','e8fc9a8dff','3000bf41','30077140','a1149bad30','300227fa','e931567700','30797e30','b90c9bad30'],
    ['307324a0','e891808fff','3002a536','30077670','a15c9bad30','30028af1','e9daf27600','30797dd0','b9549bad30'],
    ['307324b0','e86e988fff','3002bd23','300776e0','a1689bad30','3000bd2a','e991c07800','30797dc0','b9609bad30'],
    ['307324c0','e8136f90ff','300393d8','30077760','a1749bad30','30018313','e998fa7700','30797db0','b96c9bad30'],
    ['307324d0','e8c6ce90ff','3003f39b','300777d0','a1809bad30','3002ea91','e90a937600','30797da0','b9789bad30'],
    ['307324e0','e8b4cc8fff','3002f199','30077840','a18c9bad30','3002fe32','e9597f7600','30797d90','b9849bad30'],
    ['307324f0','e8650690ff','30032b5a','300778b0','a1989bad30','3000fb19','e962827800','30797d80','b9909bad30'],
    ['30732500','e8624990ff','30036e67','30077920','a1a49bad30','3000ed86','e9e58f7800','30797d70','b99c9bad30'],
    ['30732510','e8f9098dff','30002f0e','30077990','a1b09bad30','30029546','e915e87600','30797d60','b9a89bad30'],
    ['30732520','e8c5fc90ff','300421ea','30077ab0','a1bc9bad30','30017b5c','e9ef017800','30797d50','b9b49bad30'],
    ['30732530','e80dd48eff','3001f942','30077b20','a1c89bad30','3000e45d','e9de987800','30797d40','b9c09bad30'],
    ['30732540','e82c4f8fff','30027471','30077b90','a1d49bad30','3002007c','e9af7c7700','30797d30','b9cc9bad30'],
    ['30732550','e8fbd08dff','3000f650','30077c00','a1e09bad30','3000f538','e9e3877800','30797d20','b9d89bad30'],
    ['30732560','e855c68dff','3000ebba','30077c80','a1ec9bad30','300119cd','e93e637800','30797d10','b9e49bad30'],
    ['30732570','e8364e8dff','300073ab','30077cf0','a1f89bad30','3000fba5','e956817800','30797d00','b9f09bad30'],
    ['30732580','e8e45b8fff','30028169','30077d60','a1049cad30','300346e4','e907367600','30797cf0','b9fc9bad30'],
    ['30732590','e847218eff','300146dc','30077dd0','a1109cad30','30031129','e9b26b7600','30797ce0','b9089cad30'],
    ['307325a0','e805b88dff','3000ddaa','30077ea0','a11c9cad30','30020289','e9427a7700','30797cd0','b9149cad30'],
    ['30732490','e8f9558fff','30027a8e','30077370','a1509bad30','30045228','e9b32b7500','30797de0','b9489bad30'],
    ['30732480','e8c23290ff','30035747','30077300','a1449bad30','3000113b','e9b06c7900','30797df0','b93c9bad30'],
    ['30732470','e8b5ec8eff','3002112a','30077290','a1389bad30','3000eb56','e9a5927800','30797e00','b9309bad30'],
    ['30732460','e892b490ff','3003d8f7','30077220','a12c9bad30','30019029','e9e2ed7700','30797e10','b9249bad30'],
    ['30732450','e8ed9690ff','3003bb42','300771b0','a1209bad30','30013908','e913457800','30797e20','b9189bad30'],
    ['307323d0','e8a71e8eff','3001427c','30076e30','a1c09aad30','300418d0','e9cb657500','30797ea0','b9b89aad30'],
    ['30732370','e8126790ff','30038a87','30076ac0','a1789aad30','30042037','e9c45e7500','30797f00','b9709aad30'],
    ['30732380','e82b1d8eff','300140b0','30076b50','a1849aad30','30026864','e987167700','30797ef0','b97c9aad30'],
    ['30732390','e81b9890ff','3003bbb0','30076c20','a1909aad30','300267d8','e903177700','30797ee0','b9889aad30'],
    ['307323a0','e8a6af8dff','3000d34b','30076ce0','a19c9aad30','30030729','e9a2777600','30797ed0','b9949aad30'],
    ['307323b0','e842958dff','3000b8f7','30076d50','a1a89aad30','30025ffe','e9bd1e7700','30797ec0','b9a09aad30'],
    ['307323c0','e8880491ff','3004284d','30076dc0','a1b49aad30','3003c2b3','e9f8bb7500','30797eb0','b9ac9aad30'],
    ['30732360','e82f2791ff','30044a94','30076a50','a16c9aad30','30003e3b','e9d0407900','30797f10','b9649aad30'],
    ['30732350','e8639d8dff','3000c0b8','300769e0','a1609aad30','3002ca2f','e9ecb47600','30797f20','b9589aad30'],
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


it('pins the original template compound call to the basic-type parser',()=>{
 const call=engineCinitInstruction('3069b738','3069b770');
 expect(call.bytes).toBe('e83cfcffff');
 const target=(0x3069b770+5+Buffer.from(call.bytes.slice(2),'hex').readInt32LE(0))>>>0;
 expect(target.toString(16)).toBe('3069b3b1');
 expect(engineCinitInstruction('30698a86','30698be1').bytes).toBe('e8522b0000');
 expect(engineCinitInstruction('306991ad','30699282').bytes).toBe('e8fff7ffff');
});


it('pins original template comma and character-node routines',()=>{
 expect(engineCinitInstruction('30697b95','30697bc8').bytes).toBe('e823f0ffff');
 expect(engineCinitInstruction('30697b95','30697bd5').bytes).toBe('c7008cf28930');
 expect(engineCinitInstruction('30697b95','30697be5').bytes).toBe('e879f2ffff');
 expect(engineCinitInstruction('30697b95','30697bfc').bytes).toBe('c20400');
 expect(engineCinitInstruction('30696ea2','30696ea4').bytes).toBe('40');
 expect(engineCinitInstruction('30696ea6','30696ea6').bytes).toBe('8a4108');
 expect(engineCinitInstruction('30696eaa','30696ebc').bytes).toBe('8808');
 expect(engineCinitInstruction('30696eaa','30696ec2').bytes).toBe('c20800');
});


it('pins the original template parent combination and last-character calls',()=>{
 expect(engineCinitInstruction('306991ad','3069928e').bytes).toBe('e807ebffff');
 expect(engineCinitInstruction('306991ad','306992a2').bytes).toBe('e892deffff');
 expect(engineCinitInstruction('30697d9a','30697dab').bytes).toBe('e802f9ffff');
 expect(engineCinitInstruction('30697d9a','30697db2').bytes).toBe('e85ffdffff');
 expect(engineCinitInstruction('30697139','30697150').bytes).toBe('ff10');
});


it('pins the original text-node last character and empty return',()=>{
 expect(engineCinitInstruction('306973c9','306973c9').bytes).toBe('8b410c');
 expect(engineCinitInstruction('306973c9','306973cc').bytes).toBe('85c0');
 expect(engineCinitInstruction('306973c9','306973ce').bytes).toBe('7408');
 expect(engineCinitInstruction('306973c9','306973d0').bytes).toBe('8b4908');
 expect(engineCinitInstruction('306973c9','306973d3').bytes).toBe('8a4401ff');
 expect(engineCinitInstruction('306973c9','306973d7').bytes).toBe('c3');
 expect(engineCinitInstruction('306973c9','306973d8').bytes).toBe('32c0');
 expect(engineCinitInstruction('306973c9','306973da').bytes).toBe('c3');
});

it('pins original Engine realloc wrapper and normal HeapReAlloc instructions',()=>{
 expect(engineCinitInstruction('3067ca49','3067ca55').bytes).toBe('e8a6c7ffff');
 expect(engineCinitInstruction('3067ca49','3067ca93').bytes).toBe('c3');
 expect(engineCinitInstruction('30679200','30679234').bytes).toBe('833d207eaf3003');
 expect(engineCinitInstruction('30679200','306793b5').bytes).toBe('ff1584c6af30');
 expect(engineCinitInstruction('30679200','306793ed').bytes).toBe('e853510000');
});

it('indexes every original instruction with unchanged first-match and object identity',()=>{
 let checked=0;
 for(const [methods,lookup] of [[originalSource.source.methods,engineCinitInstruction],[originalSource.sharedBaseUnMangleSource.methods,engineCinitUnMangleInstruction]] as const){
  for(const candidate of methods){for(const entry of new Set([candidate.entryVA,candidate.bodyVA])){
   const method=methods.find(m=>m.bodyVA===entry||m.entryVA===entry)!;
   for(const row of [...method.instructions,...method.entryChain]){const expected=method.instructions.find(r=>r.va===row.va)??method.entryChain.find(r=>r.va===row.va);expect(lookup(entry.slice(2),row.va)).toBe(expected);checked++;}
  }}
 }
 const expectedCount=[originalSource.source.methods,originalSource.sharedBaseUnMangleSource.methods].reduce((total,methods)=>total+methods.reduce((count,candidate)=>count+[...new Set([candidate.entryVA,candidate.bodyVA])].reduce((n,entry)=>{const m=methods.find(m=>m.entryVA===entry||m.bodyVA===entry)!;return n+m.instructions.length+m.entryChain.length;},0),0),0);expect(checked).toBe(expectedCount);expect(checked).toBeGreaterThan(0);expect(Object.isFrozen(originalSource)).toBe(true);expect(()=>engineCinitInstruction('ffffffff','ffffffff')).toThrow('Original Engine initializer instruction required');expect(()=>engineCinitUnMangleInstruction('ffffffff','ffffffff')).toThrow('Original SharedBase UnMangle instruction required');
});

it('captures the second original critical-section reference initializer and shutdown',()=>{
  for(const [pc,bytes,instruction] of [
    ['30791f18','b9016eaf30','MOV ECX,0x30af6e01'],
    ['30791f1d','e822e5edff','CALL 0x30670444'],
    ['30791f22','686e807b30','PUSH 0x307b806e'],
    ['30791f27','e86af6edff','CALL 0x30671596'],
    ['30791f2c','59','POP ECX'],['30791f2d','c3','RET']
  ])expect(engineCinitInstruction('30791f18',pc!)).toMatchObject({bytes,instruction});
  expect(engineCinitInstruction('307b806e','307b806e')).toMatchObject({bytes:'b9016eaf30',instruction:'MOV ECX,0x30af6e01'});
  expect(engineCinitInstruction('307b806e','307b8073')).toMatchObject({bytes:'e9fb83ebff',instruction:'JMP 0x30670473'});
  expect(engineCinitImage('sharedCriticalSectionSecondReferenceAddress')).toMatchObject({address:'30af6e01',bytes:1,raw:'00',fileBackedBytes:0,loaderZeroFillBytes:1});
});

it('captures the original standard-output filebuf caller and static stream getter',()=>{
 expect(engineCinitInstruction('30791f2e','30791f2e')).toMatchObject({bytes:'e88ea4eeff',instruction:'CALL 0x3067c3c1'});
 expect(engineCinitInstruction('30791f2e','30791f33')).toMatchObject({bytes:'83c020',instruction:'ADD EAX,0x20'});
 expect(engineCinitInstruction('30791f2e','30791f37')).toMatchObject({bytes:'b9086eaf30',instruction:'MOV ECX,0x30af6e08'});
 expect(engineCinitInstruction('30791f2e','30791f3c')).toMatchObject({bytes:'e8efcde5ff',instruction:'CALL 0x305eed30'});
 expect(engineCinitInstruction('3067c3c1','3067c3c1')).toMatchObject({bytes:'b8a845ad30',instruction:'MOV EAX,0x30ad45a8'});
 expect(engineCinitInstruction('3067c3c1','3067c3c6')).toMatchObject({bytes:'c3',instruction:'RET'});
 expect(engineCinitInstruction('305eed30','305eed33')).toMatchObject({bytes:'e828f9ffff',instruction:'CALL 0x305ee660'});
 expect(engineCinitInstruction('305eed30','305eed82')).toMatchObject({bytes:'c20400',instruction:'RET 0x4'});
 expect(engineCinitInstruction('307b8082','307b8082')).toMatchObject({bytes:'b9086eaf30',instruction:'MOV ECX,0x30af6e08'});
 expect(engineCinitInstruction('307b8082','307b8087')).toMatchObject({bytes:'e9f48be3ff',instruction:'JMP 0x305f0c80'});
});

it('captures original streambuf lock allocation and critical-section wrapper calls',()=>{expect(engineCinitInstruction('30670963','30670964')).toMatchObject({bytes:'6a18',instruction:'PUSH 0x18'});expect(engineCinitInstruction('30670963','30670968')).toMatchObject({bytes:'e8761f0000',instruction:'CALL 0x306728e3'});expect(engineCinitInstruction('30670963','30670970')).toMatchObject({bytes:'e8c8090000',instruction:'CALL 0x3067133d'});expect(engineCinitInstruction('3067097b','30670980')).toMatchObject({bytes:'e8c3090000',instruction:'CALL 0x30671348'});});


it('captures the original locale initializer and its EH3 prologue without claiming execution',()=>{
 expect(engineCinitInstruction('30670832','30670832')).toMatchObject({bytes:'6a08',instruction:'PUSH 0x8'});
 expect(engineCinitInstruction('30670832','30670839')).toMatchObject({bytes:'e81d930000',instruction:'CALL 0x30679b5b'});
 expect(engineCinitInstruction('30670832','3067083e')).toMatchObject({bytes:'a1d86daf30',instruction:'MOV EAX,[0x30af6dd8]'});
 expect(engineCinitInstruction('30670832','30670860')).toMatchObject({bytes:'6a34',instruction:'PUSH 0x34'});
 expect(engineCinitInstruction('30670832','30670862')).toMatchObject({bytes:'e87c200000',instruction:'CALL 0x306728e3'});
 expect(engineCinitInstruction('30670832','306708c6')).toMatchObject({bytes:'e868930000',instruction:'CALL 0x30679c33'});
 expect(engineCinitInstruction('30679b5b','30679b5c')).toMatchObject({bytes:'64ff3500000000',instruction:'PUSH dword ptr FS:[0x0]'});
 expect(engineCinitInstruction('30679b5b','30679b72')).toMatchObject({bytes:'a1ec43ad30',instruction:'MOV EAX,[0x30ad43ec]'});
 expect(engineCinitInstruction('30679b5b','30679b87')).toMatchObject({bytes:'64a300000000',instruction:'MOV FS:[0x0],EAX'});
 expect(engineCinitInstruction('30679b5b','30679b8d')).toMatchObject({bytes:'c3',instruction:'RET'});
});


it('captures loader zero-fill for the original locale global pointer',()=>{
 expect(engineCinitImage('standardLocaleGlobalPointer')).toMatchObject({address:'30af6dd8',bytes:4,raw:'00000000',fileBackedBytes:0,loaderZeroFillBytes:4});
});


it('captures the original locale lock selection and enter/leave wrappers',()=>{
 expect(engineCinitInstruction('30670503','30670507')).toMatchObject({bytes:'83e003',instruction:'AND EAX,0x3'});
 expect(engineCinitInstruction('30670503','3067050f')).toMatchObject({bytes:'6bc018',instruction:'IMUL EAX,EAX,0x18'});
 expect(engineCinitInstruction('30670503','30670512')).toMatchObject({bytes:'05706daf30',instruction:'ADD EAX,0x30af6d70'});
 expect(engineCinitInstruction('30670503','30670518')).toMatchObject({bytes:'e8360e0000',instruction:'CALL 0x30671353'});
 expect(engineCinitInstruction('30670503','30670521')).toMatchObject({bytes:'c20400',instruction:'RET 0x4'});
 expect(engineCinitInstruction('30670524','3067052f')).toMatchObject({bytes:'e82a0e0000',instruction:'CALL 0x3067135e'});
 expect(engineCinitInstruction('30671353','30671357')).toMatchObject({bytes:'ff15dcc6af30',instruction:'CALL dword ptr [0x30afc6dc]'});
 expect(engineCinitInstruction('3067135e','30671362')).toMatchObject({bytes:'ff15d8c6af30',instruction:'CALL dword ptr [0x30afc6d8]'});
});


it('captures the original locale object constructor and readonly name inputs',()=>{
 expect(engineCinitInstruction('30670790','30670797')).toMatchObject({bytes:'e8bf930000',instruction:'CALL 0x30679b5b'});
 expect(engineCinitInstruction('30670790','306707a1')).toMatchObject({bytes:'c7460401000000',instruction:'MOV dword ptr [ESI + 0x4],0x1'});
 expect(engineCinitInstruction('30670790','306707ca')).toMatchObject({bytes:'e850f69aff',instruction:'CALL 0x3001fe1f'});
 expect(engineCinitImage('standardLocaleNameLiteral')).toMatchObject({address:'30826a90',raw:'2a00',bytes:2,fileBackedBytes:2,loaderZeroFillBytes:0});
 expect(engineCinitImage('standardLocaleObjectVtable')).toMatchObject({address:'30892a0c',raw:'16086730',bytes:4,fileBackedBytes:4,loaderZeroFillBytes:0});
});


it('captures the original locale string assignment overlap and copy path',()=>{
 expect(engineCinitInstruction('30042974','30042974')).toMatchObject({bytes:'e977a73a00',targetVA:'303ed0f0'});
 expect(engineCinitInstruction('30042974','303ed0f8')).toMatchObject({bytes:'83f910',instruction:'CMP ECX,0x10'});
 expect(engineCinitInstruction('30042974','303ed10a')).toMatchObject({bytes:'3be8',instruction:'CMP EBP,EAX'});
 expect(engineCinitInstruction('30042974','303ed191')).toMatchObject({bytes:'e8ae792800',instruction:'CALL 0x30674b44'});
});


it('captures original locale publication shutdown registration and zero-fill flag',()=>{
 expect(engineCinitInstruction('30670642','3067064b')).toMatchObject({bytes:'6812066730',instruction:'PUSH 0x30670612'});
 expect(engineCinitInstruction('30670642','30670657')).toMatchObject({bytes:'e80d0d0000',instruction:'CALL 0x30671369'});
 expect(engineCinitInstruction('30670642','30670661')).toMatchObject({bytes:'a3d86daf30',instruction:'MOV [0x30af6dd8],EAX'});
 expect(engineCinitImage('standardLocaleShutdownRegistered')).toMatchObject({address:'30af6dfc',bytes:1,raw:'00',fileBackedBytes:0,loaderZeroFillBytes:1});
});
