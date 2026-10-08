/** Original SharedBase security-cookie initializer; independent of Game/Engine. */
import source from '../../assets/gothic3/shared-crt-bootstrap/source.json';
import {NativeHeapObjectViews} from './native-heap-views';
import {NativeRuntimePlatform} from './native-runtime-platform';
import type {NativeValue} from './dialogue';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedCrtSecurityCookie>();
const token=Object.freeze({});
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
export class NativeSharedCrtSecurityCookie {
 readonly fields:NativeHeapObjectViews;
 #rootBytes:Uint8Array;
 #rootMasks:Uint8Array;
 #active=false;
 #boundary:string|null=null;
 #returned=false;
 #fileTime:NativeHeapObjectViews|null=null;
 #counter:NativeHeapObjectViews|null=null;
 #trace:string[]=[];
 private constructor(private readonly platform:NativeRuntimePlatform,proof:object){
  if(proof!==token)throw new Error('Canonical SharedBase security-cookie owner required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'||
    source.methods.securityInitCookie.bodyVA!=='0x100c0d95'||
    source.methods.securityInitCookie.bodyInstructionBytesSha256!=='71ad7a44998e0455f0ad93afc0eb2dbe971fa94ef6f7214da89bdfc9f94da653')throw new Error('Original SharedBase cookie source differs');
  const cookie=source.coldGlobals.securityCookie,complement=source.coldGlobals.securityCookieComplement;
  if(cookie.address!=='10140d6c'||cookie.bytes!==4||cookie.raw!=='4ee640bb'||cookie.knownMask!=='ffffffff'||
    complement.address!=='10140d70'||complement.bytes!==4||complement.raw!=='b119bf44'||complement.knownMask!=='ffffffff'||
    cookie.liveValueCaptured||complement.liveValueCaptured||cookie.scope!=='cold-original-image'||complement.scope!=='cold-original-image')throw new Error('Original cookie image required');
  this.fields=physical(8);this.fields.writeUnsigned(0,0xbb40e64e);this.fields.writeUnsigned(4,0x44bf19b1);
  this.#rootBytes=this.fields.backing.bytes;this.#rootMasks=this.fields.backing.knownMask;
  Object.defineProperty(this,'fields',{value:this.fields,writable:false,configurable:false});
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeSharedCrtSecurityCookie {
  const old=owners.get(platform);if(old)return old;
  const owner=new NativeSharedCrtSecurityCookie(platform,token);owners.set(platform,owner);return owner;
 }
 #live(){
  if(this.fields.backing.freed||this.fields.backing.bytes!==this.#rootBytes||this.fields.backing.knownMask!==this.#rootMasks||
    this.fields.bytes.buffer!==this.#rootBytes.buffer||this.fields.bytes.byteOffset!==this.#rootBytes.byteOffset||this.fields.bytes.length!==8)throw new Error('Actual retained SharedBase cookie image required');
 }
 #call<T>(label:string,invoke:()=>NativeValue<T>):T {
  this.#trace.push(label);const result=invoke();
  if(this.#boundary)throw new Error(this.#boundary);
  if(!result.known)throw new Error(result.reason);return result.value;
 }
 #dword(value:number):number {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw new Error('Original entropy DWORD required');return value;}
 initialize():NativeValue<void>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  if(this.#active){this.#boundary='Reentrant SharedBase security-cookie initialization';return {known:false,reason:this.#boundary};}
  this.#active=true;
  try{
   this.#live();let cookie=this.fields.readUnsigned(0);
   this.#fileTime=physical(8);this.#counter=physical(8);
   this.#fileTime.writeUnsigned(0,0);this.#fileTime.writeUnsigned(4,0);
   if(cookie===0xbb40e64e||(cookie&0xffff0000)===0){
    this.#call('100c0dca.GetSystemTimeAsFileTime',()=>this.platform.getSystemTimeAsFileTime(this.#fileTime!));
    let mixed=this.#fileTime.readUnsigned(4)^this.#fileTime.readUnsigned(0);
    mixed^=this.#dword(this.#call('100c0dd6.GetCurrentProcessId',()=>this.platform.getCurrentProcessId()));
    mixed^=this.#dword(this.#call('100c0dde.GetCurrentThreadId',()=>this.platform.getCurrentThreadId()));
    mixed^=this.#dword(this.#call('100c0de6.GetTickCount',()=>this.platform.getTickCount()));
    // Original assembly ignores QueryPerformanceCounter's BOOL and reads both
    // output DWORDs. Unknown/unwritten outputs must still stop the read.
    this.#call('100c0df2.QueryPerformanceCounter',()=>this.platform.queryPerformanceCounter(this.#counter!));
    cookie=(mixed^this.#counter.readUnsigned(4)^this.#counter.readUnsigned(0))>>>0;
    if(cookie===0xbb40e64e)cookie=0xbb40e64f;
    else if((cookie&0xffff0000)===0)cookie=(cookie|(cookie<<16))>>>0;
    this.#live();this.fields.writeUnsigned(0,cookie);this.#trace.push('100c0e16.storeCookie');
   }
   this.#live();this.fields.writeUnsigned(4,(~cookie)>>>0);this.#trace.push('storeCookieComplement');
   this.#returned=true;return {known:true,value:undefined};
  }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#active=false;}
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,returned:this.#returned,fileTime:this.#fileTime,counter:this.#counter,
  trace:Object.freeze([...this.#trace]),sharedCrtAttachReturned:false});}
}
