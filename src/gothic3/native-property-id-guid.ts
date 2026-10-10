/** Original SharedBase PropertyID construction from a retained GUID receiver. */
import rules from '../../assets/gothic3/script-admin-startup/runtime-rules.json';
import type {NativeValue} from './dialogue';
import {NativeHeapObjectViews} from './native-heap-views';
import {nativeGuidPayloadEquals} from './native-guid-text';

export function constructNativePropertyIdFromGuid(destination:NativeHeapObjectViews,guid:NativeHeapObjectViews,
  nullPayload:()=>NativeValue<NativeHeapObjectViews>):NativeValue<void> {
  try {
    if(rules.inputs.SharedBase!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||
      rules.methods.propertyIdGuidCtor.body!=='10092ba0'||
      rules.methods.propertyIdGuidCtor.bodyInstructionBytesSha256!=='0edae761d70075a219ecd32f06ff1a1aa850ac769d8739464846679a7d193e71'||
      rules.methods.propertyIdSetGuid.body!=='10092b40'||
      rules.methods.propertyIdSetGuid.bodyInstructionBytesSha256!=='675e7b3cb14e0009900cbc249640e6f3738c01f4370dae1a7a62fd6a097458e6')throw new Error('Original PropertyID constructor source differs');
    if(destination.bytes.length!==20||guid.bytes.length!==20)throw new Error('Actual twenty-byte PropertyID and GUID receivers required');
    // Original constructor clears in this order before calling SetGuid.
    for(const offset of [12,8,4,0,16])destination.writeUnsigned(offset,0);
    if(guid.readUnsigned(16,1)===0)return {known:true,value:undefined};
    // IsNull rereads validity, then compares the same mutable Shared payload.
    if(guid.readUnsigned(16,1)!==0) {
      const payload=nullPayload();if(!payload.known)throw new Error(payload.reason);
      const equal=nativeGuidPayloadEquals(guid,payload.value);if(!equal.known)throw new Error(equal.reason);
      if(equal.value===1)return {known:true,value:undefined};
    }
    destination.writeUnsigned(16,0);
    for(const offset of [0,4,8,12])destination.writeUnsigned(offset,guid.readUnsigned(offset));
    destination.writeUnsigned(16,0);
    // The original constructor ignores SetGuid's BOOL and returns its this.
    return {known:true,value:undefined};
  } catch(error) {return {known:false,reason:error instanceof Error?error.message:String(error)};}
}
