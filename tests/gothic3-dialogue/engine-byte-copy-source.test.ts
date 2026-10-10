import {expect,it} from 'vitest';
import source from '../../assets/gothic3/engine-byte-copy/research.json';
it('captures Engine memcpy with its own caller and full release instruction',()=>{
 expect(source.source.methods).toHaveLength(1);
 const method=source.source.methods[0]!;
 expect(method.bodyVA).toBe('0x30671cf0');expect(method.instructions).toHaveLength(247);
 expect(method.instructions.reduce((bytes,row)=>bytes+row.bytes.length/2,0)).toBe(711);
 expect(source.caller).toMatchObject({arguments:'3068e942',call:'3068e945',target:'30671cf0',releaseCall:'3068e94e',releaseIat:'30afc750',raw:'555657e8a633feff83c40c56ff1550c7af30'});
 expect(source.runtimeConnected).toBe(false);
});
it('retains the Engine scalar dispatch tables and separate vector dependency',()=>{
 expect(source.images).toHaveLength(7);
 expect(source.images.find(image=>image.label==='sse2Flag')).toMatchObject({address:'30af7e68',raw:'00000000',loaderZeroFillBytes:4});
 const tail=source.images.find(image=>image.label==='forwardTail')!;
 expect(tail).toMatchObject({address:'30671e64',bytes:16,fileBackedBytes:16,raw:'741e67307c1e6730881e67309c1e6730'});
 expect(source.source.methods[0]!.instructions.find(row=>row.va==='30671d32')!.instruction).toBe('JMP 0x3067fda9');
});
