import {it,expect} from 'vitest';
import {NativeRuntimePlatform} from '../../src/gothic3/native-runtime-platform';
import {NativeSharedVersionModule} from '../../src/gothic3/native-shared-version-module';
function fixture(){const platform=new NativeRuntimePlatform(),result=NativeSharedVersionModule.forPlatform(platform,'current-sharedbase-version-query');if(!result.known)throw new Error(result.reason);return {platform,owner:result.value};}
it('retains a stable module capability and balances additional references',()=>{
 const {owner}=fixture(),first=owner.acquire('sharedbase.dll'),second=owner.acquire('sharedbase.dll');if(!first.known||!second.known)throw new Error('module acquire');expect(first.value).toBe(second.value);expect(owner.snapshot().additionalReferences).toBe(2);expect(owner.lookupVersionExport(first.value,'DllGetVersion')).toEqual({known:true,value:null});expect(owner.release(first.value)).toEqual({known:true,value:1});expect(owner.release(second.value)).toEqual({known:true,value:1});expect(owner.snapshot().additionalReferences).toBe(0);expect(owner.lookupVersionExport(first.value,'DllGetVersion')).toEqual({known:true,value:null});expect(owner.release(first.value).known).toBe(false);
});
it('rejects copied and foreign module capabilities',()=>{
 const a=fixture(),b=fixture(),first=a.owner.acquire('sharedbase.dll');if(!first.known)throw new Error(first.reason);expect(b.owner.release(first.value).known).toBe(false);expect(a.owner.lookupVersionExport({...first.value},'DllGetVersion').known).toBe(false);expect(a.owner.snapshot().additionalReferences).toBe(1);
});
it('does not invent unknown filenames or export results',()=>{
 const {owner}=fixture();expect(owner.acquire('other.dll').known).toBe(false);const module=owner.acquire('sharedbase.dll');if(!module.known)throw new Error(module.reason);expect(owner.lookupVersionExport(module.value,'OtherExport').known).toBe(false);
});
it('rejects use after the actual platform lifetime ends',()=>{
 const {owner,platform}=fixture(),module=owner.acquire('sharedbase.dll');if(!module.known)throw new Error(module.reason);expect(platform.dispose().known).toBe(true);expect(owner.lookupVersionExport(module.value,'DllGetVersion').known).toBe(false);expect(owner.release(module.value).known).toBe(false);expect(owner.snapshot().currentImageRetained).toBe(false);
});
