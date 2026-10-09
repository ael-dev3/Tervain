import {expect,it} from 'vitest';
import {NativeGameCrtOwner} from '../../src/gothic3/native-game-crt';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {arenaEnumImageReceipt,arenaEnumImagePins} from '../../src/gothic3/native-game-arena-enum-source';

it('retains canonical original enum images without resetting later writes',()=>{
 const platform=new NativeRuntimePlatform();
 const crt=NativeGameCrtOwner.forPlatform({platform,errnoSlot:()=>({known:false,reason:'Not used by image lookup'})});
 const scratch=crt.imageStorage('enumValueScratch');
 expect(scratch).toBe(crt.imageStorage('enumValueScratch'));
 expect(scratch.readUnsigned(0)).toBe(0);
 scratch.writeUnsigned(0,7);
 expect(crt.imageStorage('enumValueScratch').readUnsigned(0)).toBe(7);
 expect(crt.imageStorage('statusNoneReceiver').readUnsigned(0,1)).toBe(0);
 expect(new TextDecoder().decode(crt.imageStorage('statusNoneName').bytes)).toBe('gEArenaStatus_None\0');
 for(const label of ['enumNameRegistry','enumValueRegistry','enumNameRegistryGuard','enumValueRegistryGuard'])
  expect(crt.imageStorage(label).bytes.every(byte=>byte===0)).toBe(true);
 expect(Object.isFrozen(arenaEnumImagePins)).toBe(true);
 expect(arenaEnumImageReceipt('statusNoneReceiver').knownMask).toBe('ff');
});
