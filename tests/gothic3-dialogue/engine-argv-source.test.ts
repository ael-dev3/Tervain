import {expect,it} from 'vitest';
import {admitEngineArgvSource,engineArgvInstruction,engineArgvImage,engineArgvGetACPImport,engineArgvFilenameImport,engineArgvMbcImport,engineArgvStaticMbcHeader,engineArgvClassificationImport} from '../../src/gothic3/native-engine-argv-source';
it('admits the original Engine argument bodies without granting cross-method instruction identity',()=>{
 expect(()=>admitEngineArgvSource()).not.toThrow();
 for(const entry of ['3068e76f','3068e5d7','30685007','30684e6d','30684b3a','30684bde','30684c58','3067c9c1','30672ec7','3067e12b','30684bd5','30673389','30671690','306849b0','306916a2','306914ea','3068de60','30674820'])expect(engineArgvInstruction(entry,entry).va).toBe(entry);
 expect(engineArgvInstruction('3068e76f','3068e799').instruction).toBe('CALL dword ptr [0x30afc82c]');
 expect(engineArgvInstruction('30685007','30685012').instruction).toBe('CALL 0x30684e6d');
 expect(()=>engineArgvInstruction('3068e76f','30684e6d')).toThrow();expect(()=>engineArgvInstruction('20476000','3068e76f')).toThrow();
});
it('retains frozen original Engine argument global receipts without supplying live pointers',()=>{
 for(const [label,address,bytes] of [['multibyteReady','30af7e84',4],['moduleFilename','30af7800',260],['moduleFilenameSentinel','30af7904',1],['commandLinePointer','30af91f8',4],['programNamePointer','30af7128',4],['argumentCount','30af710c',4],['argumentVector','30af7110',4],['multibyteSetupSehScope','30956ba0',28],['multibyteLocaleSehScope','30956b80',28],['multibyteLocaleFlags','30ad50f0',4],['currentMultibytePointer','30ad4ff8',4],['codepageAutomatic','30af76fc',4],['multibyteCodepageTable','30ad5000',240]] as const){
  const row=engineArgvImage(label);expect(row).toMatchObject({address,bytes});expect(row.raw.length).toBe(bytes*2);expect(Object.isFrozen(row)).toBe(true);
 }
 expect(()=>engineArgvImage('GameArgvPointer')).toThrow();
});

it('captures the exact Engine GetACP import used by the code-page helper',()=>{
 expect(engineArgvGetACPImport()).toMatchObject({iatVA:'0x30afc734',module:'KERNEL32.dll',name:'GetACP',ordinal:null});
 expect(engineArgvInstruction('30684bde','30684c28').instruction).toBe('CALL dword ptr [0x30afc734]');
 expect(Object.isFrozen(engineArgvGetACPImport())).toBe(true);
});

it('admits the exact Engine MBC imports and original five code-page records',()=>{
 for(const [kind,iatVA,site] of [['IsValidCodePage','0x30afc73c','30684cc9'],['GetCPInfo','0x30afc688','30684cdc']] as const){expect(engineArgvMbcImport(kind)).toMatchObject({iatVA,module:'KERNEL32.dll',name:kind,ordinal:null});expect(Object.isFrozen(engineArgvMbcImport(kind))).toBe(true);expect(engineArgvInstruction('30684c58',site).instruction).toBe(`CALL dword ptr [${iatVA}]`);}
 const row=engineArgvImage('multibyteCodepageTable');expect(Array.from({length:5},(_,index)=>{const raw=row.raw.slice(index*96,index*96+8);return parseInt(raw.match(/../g)!.reverse().join(''),16);})).toEqual([932,936,949,950,1361]);
});

it('captures the exact classification imports and loader-zero selector without a live pointer',()=>{
 for(const [kind,iatVA] of [['GetStringTypeW','0x30afc778'],['GetLastError','0x30afc86c'],['MultiByteToWideChar','0x30afc6e8'],['GetStringTypeA','0x30afc774']] as const){expect(engineArgvClassificationImport(kind)).toMatchObject({iatVA,module:'KERNEL32.dll',name:kind,ordinal:null});expect(Object.isFrozen(engineArgvClassificationImport(kind))).toBe(true);}
 expect(engineArgvImage('classificationApiSelector')).toMatchObject({address:'30af7c34',bytes:4,raw:'00000000',fileBackedBytes:0,loaderZeroFillBytes:4});expect(engineArgvImage('classificationWideProbe')).toMatchObject({address:'30892f38',bytes:2,raw:'0000',fileBackedBytes:2,loaderZeroFillBytes:0});expect(engineArgvInstruction('306914ea','30691517').instruction).toBe('CALL dword ptr [0x30afc778]');
});

it('captures the original Engine narrowing import and its mapping-body call',()=>{
 expect(engineArgvClassificationImport('WideCharToMultiByte')).toMatchObject({iatVA:'0x30afc6fc',module:'KERNEL32.dll',name:'WideCharToMultiByte',ordinal:null});expect(Object.isFrozen(engineArgvClassificationImport('WideCharToMultiByte'))).toBe(true);expect(engineArgvInstruction('3067c57c','3067c792').instruction).toBe('CALL dword ptr [0x30afc6fc]');
});

it('captures the original Engine MBC reference imports and static header without reseeding live state',()=>{
 for(const [kind,iatVA,site] of [['InterlockedDecrement','0x30afc6f4','30684ee3'],['InterlockedIncrement','0x30afc6f8','30684f02']] as const){expect(engineArgvMbcImport(kind)).toMatchObject({iatVA,module:'KERNEL32.dll',name:kind,ordinal:null});expect(Object.isFrozen(engineArgvMbcImport(kind))).toBe(true);expect(engineArgvInstruction('30684e6d',site).instruction).toBe(kind==='InterlockedDecrement'?`CALL dword ptr [${iatVA}]`:`MOV EDI,dword ptr [${iatVA}]`);}expect(engineArgvStaticMbcHeader()).toEqual({address:'30ad4bd0',bytes:16,raw:'0'.repeat(32)});expect(Object.isFrozen(engineArgvStaticMbcHeader())).toBe(true);
});

it('captures the original Engine global MBC publication storage extents',()=>{
 for(const [label,address,bytes] of [['globalMbcCodepage','30af770c',4],['globalMbcSingleByte','30af7710',4],['globalMbcLocale','30af7714',4],['globalMbcWideTypes','30af7700',10],['globalMbcCharacterTypes','30ad4df0',257],['globalMbcCaseBytes','30ad4ef8',256]] as const){const row=engineArgvImage(label);expect(row).toMatchObject({address,bytes});expect(row.raw.length).toBe(bytes*2);expect(Object.isFrozen(row)).toBe(true);}
});

it('captures the original four-instruction Engine global MBC unlock helper',()=>{
 expect(['30684fce','30684fd0','30684fd5','30684fd6'].map(pc=>engineArgvInstruction('30684fce',pc).instruction)).toEqual(['PUSH 0xd','CALL 0x306832b6','POP ECX','RET']);
});

it('captures the exact Engine module filename import and argument-setup call',()=>{
 expect(engineArgvFilenameImport()).toMatchObject({iatVA:'0x30afc82c',module:'KERNEL32.dll',name:'GetModuleFileNameA',ordinal:null});expect(Object.isFrozen(engineArgvFilenameImport())).toBe(true);expect(engineArgvInstruction('3068e76f','3068e799').instruction).toBe('CALL dword ptr [0x30afc82c]');
});

it('captures all Engine parser lead-byte calls and their actual locale classification dependency',()=>{
 for(const pc of ['3068e62a','3068e70f','3068e732'])expect(engineArgvInstruction('3068e5d7',pc).instruction).toBe('CALL 0x306846bd');
 expect(engineArgvInstruction('306846bd','306846c7').instruction).toBe('CALL 0x306844ff');
 expect(engineArgvInstruction('306844ff','3068450b').instruction).toBe('CALL 0x30673389');
 expect(engineArgvInstruction('306844ff','3068451a').instruction).toBe('TEST byte ptr [ECX + EAX*0x1 + 0x1d],DL');
 expect(()=>engineArgvInstruction('3068e5d7','306846bd')).toThrow();
});
