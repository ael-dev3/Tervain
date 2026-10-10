import {expect,it} from 'vitest';
import {admitEngineArgvSource,engineArgvInstruction,engineArgvImage,engineArgvGetACPImport} from '../../src/gothic3/native-engine-argv-source';
it('admits the original Engine argument bodies without granting cross-method instruction identity',()=>{
 expect(()=>admitEngineArgvSource()).not.toThrow();
 for(const entry of ['3068e76f','3068e5d7','30685007','30684e6d','30684b3a','30684bde','30684c58','3067c9c1','3067e12b','30684bd5','30673389'])expect(engineArgvInstruction(entry,entry).va).toBe(entry);
 expect(engineArgvInstruction('3068e76f','3068e799').instruction).toBe('CALL dword ptr [0x30afc82c]');
 expect(engineArgvInstruction('30685007','30685012').instruction).toBe('CALL 0x30684e6d');
 expect(()=>engineArgvInstruction('3068e76f','30684e6d')).toThrow();expect(()=>engineArgvInstruction('20476000','3068e76f')).toThrow();
});
it('retains frozen original Engine argument global receipts without supplying live pointers',()=>{
 for(const [label,address,bytes] of [['multibyteReady','30af7e84',4],['moduleFilename','30af7800',260],['moduleFilenameSentinel','30af7904',1],['commandLinePointer','30af91f8',4],['programNamePointer','30af7128',4],['argumentCount','30af710c',4],['argumentVector','30af7110',4],['multibyteSetupSehScope','30956ba0',28],['multibyteLocaleSehScope','30956b80',28],['multibyteLocaleFlags','30ad50f0',4],['currentMultibytePointer','30ad4ff8',4],['codepageAutomatic','30af76fc',4]] as const){
  const row=engineArgvImage(label);expect(row).toMatchObject({address,bytes});expect(row.raw.length).toBe(bytes*2);expect(Object.isFrozen(row)).toBe(true);
 }
 expect(()=>engineArgvImage('GameArgvPointer')).toThrow();
});

it('captures the exact Engine GetACP import used by the code-page helper',()=>{
 expect(engineArgvGetACPImport()).toMatchObject({iatVA:'0x30afc734',module:'KERNEL32.dll',name:'GetACP',ordinal:null});
 expect(engineArgvInstruction('30684bde','30684c28').instruction).toBe('CALL dword ptr [0x30afc734]');
 expect(Object.isFrozen(engineArgvGetACPImport())).toBe(true);
});
