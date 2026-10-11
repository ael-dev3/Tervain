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
