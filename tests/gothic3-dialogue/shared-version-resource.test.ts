import {it,expect} from 'vitest';
import {NativeSharedVersionResource} from '../../src/gothic3/native-shared-version-resource';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeHeapObjectViews} from '../../src/gothic3/native-heap-views';
function fixture(){
 const platform=new NativeRuntimePlatform(),owner=NativeSharedVersionResource.forPlatform(platform,'recorded-sharedbase-ansi-version-buffer');if(!owner.known)throw new Error(owner.reason);
 const heap=platform.createWin32Heap({},0,4096,0);if(!heap.known||!heap.value)throw new Error("heap");const allocation=platform.win32HeapAlloc(heap.value,0,1744);if(!allocation.known||!allocation.value)throw new Error('allocation');
 const fields=new NativeHeapObjectViews(allocation.value),pointer={fields,offset:4},handle={fields,offset:0};return {platform,heap:heap.value,owner:owner.value,fields,pointer,handle};
}
it('initializes the actual allocation and returns contained translated ANSI pointers',()=>{
 const {owner,fields,pointer,handle}=fixture();expect(owner.size('sharedbase.dll',handle)).toEqual({known:true,value:1740});expect(fields.readUnsigned(0)).toBe(0);
 expect(owner.initialize('sharedbase.dll',0,1740,pointer)).toEqual({known:true,value:1});
 const translation=owner.query(pointer,'\\VarFileInfo\\Translation');expect(translation.known).toBe(true);if(!translation.known)throw new Error(translation.reason);expect(translation.value.pointer.fields).toBe(fields);expect(translation.value.pointer.offset).toBe(868);expect(fields.readUnsigned(868)).toBe(0x04b00000);
 const result=owner.query(pointer,'\\StringFileInfo\\000004B0\\FileVersion');if(!result.known)throw new Error(result.reason);expect(result.value.length).toBe(17);expect(result.value.pointer.offset).toBe(1204);expect(String.fromCharCode(...fields.bytes.slice(1204,1221))).toBe('1, 60, 25931, 29\0');
});
it('accepts a physical alias of the retained allocation base',()=>{
 const {owner,fields,pointer}=fixture();owner.initialize('sharedbase.dll',0,1740,pointer);const alias={fields:new NativeHeapObjectViews(fields.backing,4,1740),offset:0};const result=owner.query(alias,'\\VarFileInfo\\Translation');expect(result.known).toBe(true);if(result.known){expect(result.value.pointer.fields).toBe(alias.fields);expect(result.value.pointer.offset).toBe(864);}
});
it('rejects foreign owned storage and query reordering',()=>{
 const a=fixture(),b=fixture();a.owner.initialize('sharedbase.dll',0,1740,a.pointer);expect(a.owner.query(b.pointer,'\\VarFileInfo\\Translation').known).toBe(false);expect(a.owner.query(a.pointer,'\\StringFileInfo\\000004B0\\FileVersion')).toMatchObject({known:false,reason:'Recorded version query order required'});
});
it('rejects changed prepared bytes before applying query mutations',()=>{
 const {owner,fields,pointer}=fixture();owner.initialize('sharedbase.dll',0,1740,pointer);fields.writeUnsigned(1204,255,1);expect(owner.query(pointer,'\\VarFileInfo\\Translation')).toMatchObject({known:false,reason:'Prepared version bytes changed outside the selected API'});expect(fields.readUnsigned(1204,1)).toBe(255);
});
it('rejects an ended allocation lifetime',()=>{
 const {platform,heap,owner,fields,pointer}=fixture();owner.initialize('sharedbase.dll',0,1740,pointer);expect(platform.win32HeapFree(heap,0,fields.backing).known).toBe(true);expect(owner.query(pointer,'\\VarFileInfo\\Translation').known).toBe(false);
});

it('retains separate outer and nested resource allocations on the same platform',()=>{
 const {platform,heap,owner,pointer}=fixture();expect(owner.initialize('sharedbase.dll',0,1740,pointer).known).toBe(true);
 const allocated=platform.win32HeapAlloc(heap,0,1741);if(!allocated.known||!allocated.value)throw new Error('nested allocation');
 const nested={fields:new NativeHeapObjectViews(allocated.value),offset:0};expect(owner.initialize('sharedbase.dll',0,1740,nested).known).toBe(true);
 expect(owner.query(nested,'\\VarFileInfo\\Translation').known).toBe(true);expect(owner.query(nested,'\\StringFileInfo\\000004B0\\FileVersion').known).toBe(true);
 expect(platform.win32HeapFree(heap,0,allocated.value).known).toBe(true);
 expect(owner.query(pointer,'\\VarFileInfo\\Translation').known).toBe(true);
});
it('reinitializes a retained allocation and resets its query sequence',()=>{
 const {owner,pointer}=fixture();owner.initialize('sharedbase.dll',0,1740,pointer);owner.query(pointer,'\\VarFileInfo\\Translation');
 expect(owner.initialize('sharedbase.dll',0,1740,pointer).known).toBe(true);expect(owner.query(pointer,'\\VarFileInfo\\Translation').known).toBe(true);
});
