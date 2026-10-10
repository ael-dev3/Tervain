import {expect,it} from 'vitest';
import {admitEngineIoSource,engineIoInstruction,engineIoImage} from '../../src/gothic3/native-engine-io-source';
it('admits each captured Engine I/O body independently',()=>{
 expect(()=>admitEngineIoSource()).not.toThrow();
 expect(engineIoInstruction('306886ec','30688701').instruction).toBe('CALL dword ptr [0x30afc748]');
 expect(engineIoInstruction('3067e500','3067e500').va).toBe('3067e500');
 expect(engineIoInstruction('3067ca01','3067ca01').va).toBe('3067ca01');
 expect(engineIoInstruction('3067e545','3067e545').va).toBe('3067e545');
 expect(engineIoInstruction('30696484','30696484').va).toBe('30696484');
 expect(()=>engineIoInstruction('306886ec','3067e500')).toThrow();
 expect(()=>engineIoInstruction('20474300','30688701')).toThrow();
});
it('retains the original Engine cold globals and immutable scope receipt',()=>{
 const count=engineIoImage('ioHandleCount'),table=engineIoImage('ioBlockPointers'),scope=engineIoImage('ioSehScope');
 expect(count).toMatchObject({address:'30af7cdc',bytes:4,raw:'00000000',loaderZeroFillBytes:4});
 expect(table).toMatchObject({address:'30af7d20',bytes:256,loaderZeroFillBytes:256});
 expect(table.raw).toBe('00'.repeat(256));expect(scope).toMatchObject({address:'30956c00',bytes:28,fileBackedBytes:28});
 expect(Object.isFrozen(count)).toBe(true);expect(Object.isFrozen(scope)).toBe(true);expect(()=>engineIoImage('GameIoCount')).toThrow();
});
