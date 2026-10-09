import {expect,it} from 'vitest';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
import {runRegistrationFormatterLoop} from '../../src/gothic3/native-registration-formatter';
import type {NativeBytePointer} from '../../src/gothic3/native-pointer-geometry';
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
function text(value:string){const fields=physical(value.length+1);for(let i=0;i<value.length;i++)fields.writeUnsigned(i,value.charCodeAt(i),1);fields.writeUnsigned(value.length,0,1);return Object.freeze({fields,offset:0});}
function fixture(formatText:string){
 const file=physical(32),buffer=physical(64),base=Object.freeze({fields:buffer,offset:0});
 file.writeUnsigned(4,0x7fffffff);file.writeUnsigned(12,0x42);
 file.pointer(0).set(base);file.pointer(8).set(base);
 const locale=physical(16),info=physical(216);info.writeUnsigned(0xc8,0x100f2e38);
 locale.pointer(0).set(info);locale.writeUnsigned(12,0,1);
 return {file,buffer,base,locale,format:text(formatText),args:physical(8),frame:physical(0x2a4)};
}
it('writes through the original FILE cursor without appending a terminator',()=>{
 const f=fixture('A%sB%s!');f.args.pointer(0).set(text('xy'));f.args.pointer(4).set(text('z'));
 expect(runRegistrationFormatterLoop(f.file,f.format,f.args,f.locale,f.frame)).toBe(6);
 expect(new TextDecoder().decode(f.buffer.bytes.subarray(0,6))).toBe('AxyBz!');
 expect(f.buffer.knownMask[6]).toBe(0);
 expect(f.file.pointer(8).get()).toBe(f.base);
 expect(f.file.pointer<NativeBytePointer>(0).get()!.offset).toBe(6);
 expect(f.file.readUnsigned(4)).toBe(0x7fffffff-6);
 expect(f.frame.readUnsigned(0x60)).toBe(6);
});
it('preserves literal writes at an unsupported conversion',()=>{
 const f=fixture('ok:%d');
 expect(()=>runRegistrationFormatterLoop(f.file,f.format,f.args,f.locale,f.frame)).toThrow('Unowned registration conversion');
 expect(new TextDecoder().decode(f.buffer.bytes.subarray(0,3))).toBe('ok:');
 expect(f.buffer.knownMask[3]).toBe(0);
 expect(f.frame.readUnsigned(0x60)).toBe(3);
});
