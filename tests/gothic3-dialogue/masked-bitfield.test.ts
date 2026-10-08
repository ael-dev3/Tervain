import {expect,it} from 'vitest';
import {nativeMaskedBitfieldAssignment} from '../../src/gothic3/native-masked-bitfield';
it('derives the native low-nibble assignment while preserving unknown padding',()=>{
 expect(nativeMaskedBitfieldAssignment({value:0xaabbccdd,knownMask:0xffff0000},{value:3,knownMask:0xffffffff},15)).toEqual({value:0xaabbccd3,knownMask:0xffff000f});
});
it('matches the original three bitwise instructions for every byte value and selected type',()=>{
 for(let value=0;value<256;value++)for(const selected of [0,1,3]){
  const result=nativeMaskedBitfieldAssignment({value,knownMask:0xffffffff},{value:selected,knownMask:0xffffffff},15);expect(result.value).toBe((value^((value^selected)&15))>>>0);expect(result.knownMask).toBe(0xffffffff);
 }
});
it('asserts only bits shared by every concrete value matching the original masks',()=>{
 for(const mask of [0,15,240,255])for(const selectedMask of [0,1,3,15]){
  const original={value:0x5a,knownMask:mask},selected={value:3,knownMask:selectedMask},result=nativeMaskedBitfieldAssignment(original,selected,15);
  for(let a=0;a<256;a++)if((a&mask)===(original.value&mask))for(let b=0;b<16;b++)if((b&selectedMask)===(selected.value&selectedMask))expect(((a^((a^b)&15))&result.knownMask)>>>0).toBe((result.value&result.knownMask)>>>0);
 }
});
