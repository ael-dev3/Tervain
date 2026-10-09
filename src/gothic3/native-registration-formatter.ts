/** Translated original narrow %s path. All output is written through the
 * retained FILE cursor; unsupported states preserve the applied writes. */
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeBytePointer} from './native-pointer-geometry';
import {admitRegistrationOutputSource,registrationOutputTables} from './native-registration-output-source';

function table(label:string):Uint8Array {
 const receipt=registrationOutputTables.find(row=>row.label===label);
 if(!receipt)throw new Error('Original registration formatter table required: '+label);
 return Uint8Array.from(receipt.bytes.match(/../g)!,byte=>parseInt(byte,16));
}
export function runRegistrationFormatterLoop(file:NativeHeapObjectViews,format:NativeBytePointer,
 args:NativeHeapObjectViews,locale:NativeHeapObjectViews,frame:NativeHeapObjectViews):number {
 admitRegistrationOutputSource();
 const states=table('classificationAndTransitions'),ctype=table('initialLocaleCtype'),dispatch=table('stateDispatch');
 const localeInfo=locale.pointer<NativeHeapObjectViews>(0).get();
 if(!localeInfo||localeInfo.readUnsigned(0xc8)!==0x100f2e38||!(file.readUnsigned(12,1)&0x40)||
   !file.pointer<NativeBytePointer>(8).get())throw new Error('Original narrow buffer FILE and initial locale required');
 const ebp=0x94;
 const store=(offset:number,value:number)=>frame.writeUnsigned(ebp+offset,value>>>0);
 const count=()=>frame.readUnsigned(ebp-0x34);
 const emit=(byte:number)=>{
  // 100b5289 -> 100b5295 -> 100b529a -> 100b52b9.
  const remaining=(file.readUnsigned(4)-1)|0;file.writeUnsigned(4,remaining>>>0);
  if(remaining<0)throw new Error('Unowned registration FILE flush at 100b52aa');
  const cursor=file.pointer<NativeBytePointer>(0).get();
  if(!cursor)throw new Error('Actual registration FILE destination required');
  cursor.fields.writeUnsigned(cursor.offset,byte,1);
  file.pointer<NativeBytePointer>(0).set(Object.freeze({fields:cursor.fields,offset:cursor.offset+1}));
  store(-0x34,count()+1);
 };
 store(-0x34,0);store(-0x28,0);store(-0x54,0);
 let state=0,index=format.offset,vararg=0;
 for(;;){
  const ch=format.fields.readUnsigned(index,1);frame.writeUnsigned(ebp-0x19,ch,1);
  if(ch===0)break;
  ++index;frame.pointer<NativeBytePointer>(ebp-0x48).set(Object.freeze({fields:format.fields,offset:index}));
  const category=((ch-0x20)&255)<=0x58?(states[ch]!&15):0;
  const transition=states[0x20+category*8+state]!;
  state=(transition<<24)>>28;store(-0x74,state);
  if(state<0||state>7)throw new Error('Unowned original registration formatter state');
  const target=new DataView(dispatch.buffer).getUint32(state*4,true);
  if(state===0){
   if(target!==0x100b5697)throw new Error('Original literal dispatch required');
   store(-0x44,0);
   // Explicit-locale __isleadbyte_l copies the retained locale pointers and
   // reads the original C-locale classification word. Its cleanup flag is zero.
   if(((ctype[ch*2]!|(ctype[ch*2+1]!<<8))&0x8000)!==0)
    throw new Error('Unowned registration multibyte literal at 100b56b0');
   emit(ch);
  }else if(state===1){
   if(target!==0x100b54fe)throw new Error('Original percent dispatch required');
   store(-0x20,-1);
   for(const offset of [-0x78,-0x50,-0x40,-0x3c,-0x18,-0x44])store(offset,0);
  }else if(state===7){
   if(target!==0x100b56d9||ch!==0x73||frame.readUnsigned(ebp-0x18)!==0||
    frame.readUnsigned(ebp-0x40)!==0||frame.readUnsigned(ebp-0x20)!==0xffffffff)
    throw new Error('Unowned registration conversion at 100b56d9');
   const text=args.pointer<NativeBytePointer>(vararg).get();
   if(!text)throw new Error('Unowned NULL registration string at 100b5b3b');
   vararg+=4;
   frame.pointer<NativeBytePointer>(ebp-0x2c).set(Object.freeze({fields:args,offset:vararg}));
   frame.pointer<NativeBytePointer>(ebp-0x24).set(text);
   let length=0;
   while(text.fields.readUnsigned(text.offset+length,1)!==0)++length;
   store(-0x28,length);
   // Width and prefix are zero: original write_multi_char receives a
   // negative count, and the first write_string receives count zero.
   for(let n=0;n<length;n++)emit(text.fields.readUnsigned(text.offset+n,1));
  }else throw new Error('Unowned registration formatting modifier state '+state);
 }
 // Original LocaleUpdate destructor only clears the bit it acquired.
 if(locale.readUnsigned(12,1)!==0){
  const ptd=locale.pointer<NativeHeapObjectViews>(8).get();
  if(!ptd)throw new Error('Actual registration locale cleanup PTD required');
  ptd.writeUnsigned(0x70,ptd.readUnsigned(0x70)&0xfffffffd);
 }
 return count();
}
