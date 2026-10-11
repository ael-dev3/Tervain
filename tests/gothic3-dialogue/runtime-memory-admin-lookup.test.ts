import {NativeMemoryAdmin} from '../../src/gothic3/native-memory-admin';
import {it,expect} from 'vitest';
import {NativeRuntimePlatform,createNativeRuntimeAdminOwner,nativeRuntimeMemoryAdminForPlatform} from '../../src/gothic3/native-runtime-platform';

it('returns only the retained unique same-platform MemoryAdmin',()=>{
 const platform=new NativeRuntimePlatform();expect(nativeRuntimeMemoryAdminForPlatform(platform).known).toBe(false);
 const owner=createNativeRuntimeAdminOwner(platform);const proof=nativeRuntimeMemoryAdminForPlatform(platform);
 expect(proof.known).toBe(true);if(proof.known)expect(proof.value).toBe(owner.memory);
 expect(nativeRuntimeMemoryAdminForPlatform(new NativeRuntimePlatform()).known).toBe(false);
});
it('rejects ambiguous owner construction instead of replacing the first owner',()=>{
 const platform=new NativeRuntimePlatform();createNativeRuntimeAdminOwner(platform);createNativeRuntimeAdminOwner(platform);
 expect(nativeRuntimeMemoryAdminForPlatform(platform).known).toBe(false);
});

it('proves live allocation membership and rejects another owner, a copy and released backing',()=>{
 const platform=new NativeRuntimePlatform(),owner=createNativeRuntimeAdminOwner(platform),allocated=owner.memory.malloc(14);
 if(!allocated.known)throw new Error(allocated.reason);if(!allocated.value)throw new Error('Expected live 16-byte pool slot');const allocation=allocated.value;
 expect(NativeMemoryAdmin.canonicalAllocationForPlatform(owner.memory,platform,allocation).known).toBe(true);
 expect(NativeMemoryAdmin.canonicalAllocationForPlatform(owner.memory,new NativeRuntimePlatform(),allocation).known).toBe(false);
 const otherPlatform=new NativeRuntimePlatform(),other=createNativeRuntimeAdminOwner(otherPlatform);
 expect(NativeMemoryAdmin.canonicalAllocationForPlatform(other.memory,otherPlatform,allocation).known).toBe(false);
 expect(NativeMemoryAdmin.canonicalAllocationForPlatform(owner.memory,platform,{...allocation}).known).toBe(false);
 allocation.region.freed=true;expect(NativeMemoryAdmin.canonicalAllocationForPlatform(owner.memory,platform,allocation).known).toBe(false);allocation.region.freed=false;
 expect(owner.memory.free(allocation).known).toBe(true);expect(NativeMemoryAdmin.canonicalAllocationForPlatform(owner.memory,platform,allocation).known).toBe(false);
});
