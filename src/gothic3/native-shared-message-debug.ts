/** Original property-registration Debug call through TLS, vsprintf and the
 * actual runtime MessageAdmin getter. OnMessage dispatch remains pending. */
import source from '../../assets/gothic3/arena-property-registration/source.json';
import {NativeRuntimePlatform,nativeRuntimeMessageAdminForPlatform} from './native-runtime-platform';
import type {NativeMessageAdminModule} from './native-message-admin';
import {NativeSharedStaticTls} from './native-shared-static-tls';
import {NativeHeapObjectViews} from './native-heap-views';
import type {NativeBytePointer} from './native-pointer-geometry';
import type {NativeValue} from './dialogue';
import {NativeSharedCrtSecurityCookie} from './native-shared-crt-security-cookie';
import {NativeSharedCrtOwner} from './native-shared-crt';
import {runRegistrationFormatterLoop} from './native-registration-formatter';
import {admitRegistrationOutputSource,registrationOutputPrefix,registrationLocalePrefix,registrationOutputBodies} from './native-registration-output-source';
const owners=new WeakMap<NativeRuntimePlatform,NativeSharedMessageDebug>();
const token=Object.freeze({});
const formatText="bCPropertyObjectTypeBase::RegisterPropertyTemplate - property '%s' with valuetype '%s' added.";
const methods={
 messageDebug:['0x100498f0','bda592836d1f962248869c3ba7f90be5fee5271a962293633012d3a075d43dfc'],
 messageVsprintf:['0x100a7f27','db7e7cdf21e7945d6831d7a24d9741dfed758ceb6034933bda953d4ece2e7b26'],
 messageVsprintfCore:['0x100a7eab','01a8e501079dfbac7738c12afe584792b8ec8feecdbcac4a70a16d3077ac389e'],
 messageOutputFormatter:['0x100b5355','b4cea1685c86d396c8b2298308b5b521c8185f73d5c2d9eda5a92aa7c9ef686b'],
} as const;
function physical(size:number){return new NativeHeapObjectViews({identity:{},bytes:new Uint8Array(size),knownMask:new Uint8Array(size),freed:false});}
function fact<T>(result:NativeValue<T>):T {if(!result.known)throw new Error(result.reason);return result.value;}
export class NativeSharedMessageDebug {
 #boundary:string|null=null;
 #file:NativeHeapObjectViews|null=null;
 #arguments:NativeHeapObjectViews|null=null;
 #buffer:NativeHeapObjectViews|null=null;
 #format:NativeBytePointer;
 #trace:string[]=[];
 #active=false;
 #formatterFrame:NativeHeapObjectViews|null=null;
 #formatterLocale:NativeHeapObjectViews|null=null;
 #localeCallFrame:NativeHeapObjectViews|null=null;
 #localeReturned=false;
 #formatterOutputCount:number|null=null;
 #formatterReturned=false;
 #terminatorWritten=false;
 #messageCallFrame:NativeHeapObjectViews|null=null;
 #messageOwner:NativeMessageAdminModule|null=null;
 #messageGetterReturned=false;
 #formatterCookieExpression:Readonly<{cookie:NativeHeapObjectViews;cookieValue:number;frame:NativeHeapObjectViews;ebpOffset:number}>|null=null;
 #formatterRegisters:Readonly<{eax:NativeHeapObjectViews;ebx:NativeBytePointer;esi:0;edi:NativeHeapObjectViews;ecx:NativeHeapObjectViews}>|null=null;
 private constructor(private readonly platform:NativeRuntimePlatform,proof:object){
  if(proof!==token)throw new Error('Canonical SharedBase diagnostic owner required');
  if(source.sharedBaseSha256!=='5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214')throw new Error('Original SharedBase module required');
  for(const [label,[body,hash]] of Object.entries(methods)){
   const receipt=source.methods[label as keyof typeof methods];
   if(receipt.bodyVA!==body||receipt.bodyInstructionBytesSha256!==hash)throw new Error('Original diagnostic method differs: '+label);
  }
  if(source.registrationDebugFormat.address!=='100e9f40'||source.registrationDebugFormat.text!==formatText)throw new Error('Original registration format required');
  const fields=physical(formatText.length+1);
  for(let index=0;index<formatText.length;index++)fields.writeUnsigned(index,formatText.charCodeAt(index),1);
  fields.writeUnsigned(formatText.length,0,1);this.#format=Object.freeze({fields,offset:0});
  Object.defineProperty(this,'platform',{value:platform,writable:false,configurable:false});
 }
 static forPlatform(platform:NativeRuntimePlatform):NativeSharedMessageDebug {
  const old=owners.get(platform);if(old)return old;
  const owner=new NativeSharedMessageDebug(platform,token);owners.set(platform,owner);return owner;
 }
 static registrationLocaleForPlatform(platform:NativeRuntimePlatform,caller:NativeSharedMessageDebug):NativeValue<NativeHeapObjectViews>{
  if(owners.get(platform)!==caller||!caller.#active||caller.#boundary||caller.#localeReturned||
    !caller.#formatterLocale||!caller.#localeCallFrame||!caller.#formatterFrame||
    caller.#localeCallFrame.readUnsigned(12)!==0||caller.#localeCallFrame.readUnsigned(4)!==0||
    caller.#localeCallFrame.pointer(8).get()!==caller.#formatterFrame.pointer(0).get())
    return {known:false,reason:'Actual pending registration LocaleUpdate caller required'};
  return {known:true,value:caller.#formatterLocale};
 }
 registerProperty(propertyName:NativeBytePointer,typeName:NativeBytePointer):NativeValue<void>{
  if(this.#boundary)return {known:false,reason:this.#boundary};
  if(this.#active){this.#boundary='Reentrant property registration diagnostic';return {known:false,reason:this.#boundary};}
  this.#active=true;
  try{
   const tls=fact(NativeSharedStaticTls.forPlatform(this.platform));
   this.#buffer=fact(NativeSharedStaticTls.prototype.debugBuffer.call(tls));
   this.#trace.push('100498f0.loadThreadTlsBuffer');
   // Original cdecl argument order is property text, then type text. These
   // are retained pointer capabilities, not copies of their string values.
   this.#arguments=physical(8);
   this.#arguments.pointer<NativeBytePointer>(0).set(propertyName);
   this.#arguments.pointer<NativeBytePointer>(4).set(typeName);
   this.#trace.push('1004990a.retainActualVarargs');
   this.#trace.push('100a7f27.forwardWithNullLocale');
   this.#file=physical(32);
   const destination=Object.freeze({fields:this.#buffer,offset:0});
   this.#file.pointer<NativeBytePointer>(8).set(destination);
   this.#file.pointer<NativeBytePointer>(0).set(destination);
   this.#file.writeUnsigned(4,0x7fffffff);
   this.#file.writeUnsigned(12,0x42);
   this.#trace.push('100a7eff.callOutputFormatter');
   this.#prepareFormatterEntry();
   this.#prepareLocaleEntry();
   const locale=NativeSharedCrtOwner.initializeRegistrationLocaleForPlatform(this.platform,this);
   if(!locale.known)throw new Error(locale.reason);
   this.#localeReturned=true;
   this.#trace.push('100a7535.registrationLocale.return');
   this.#formatterOutputCount=runRegistrationFormatterLoop(this.#file,this.#format,this.#arguments,this.#formatterLocale!,this.#formatterFrame!);
   this.#trace.push('100b5cae.registrationOutput.loopComplete');
   this.#finishFormatter();
   const messageFrame=physical(28);this.#messageCallFrame=messageFrame;
   messageFrame.pointer(0).set(Object.freeze({module:'SharedBase',source:'10049929'}));
   messageFrame.writeUnsigned(4,1);
   messageFrame.pointer<NativeBytePointer>(8).set(Object.freeze({fields:this.#buffer,offset:0}));
   messageFrame.writeUnsigned(12,0);messageFrame.writeUnsigned(16,0);
   messageFrame.writeUnsigned(20,0xffffffff);messageFrame.writeUnsigned(24,5);
   this.#trace.push('10049924.MessageAdmin.getInstance.pending');
   const owner=fact(nativeRuntimeMessageAdminForPlatform(this.platform));
   this.#messageOwner=owner;
   const returned=fact(owner.getInstance());
   if(returned!==owner)throw new Error('Actual registration MessageAdmin getter owner differs');
   this.#messageGetterReturned=true;
   this.#trace.push('10049929.MessageAdmin.getInstance.return');
   throw new Error('Unowned SharedBase registration OnMessage at 1004992b -> 10005560 (MessageAdmin getter returned)');
  }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);return {known:false,reason:this.#boundary};}
  finally{this.#active=false;}
 }
 /** Translate the pinned entry's local frame; this is not instruction
  * interpretation on the Game startup stack. Saved caller registers and
  * absolute stack-address bits remain unknown. No return is synthesized. */
 #prepareFormatterEntry():void {
  admitRegistrationOutputSource();
  if(this.#formatterFrame || !this.#file || !this.#arguments || !this.#buffer ||
    registrationOutputPrefix.length!==25 || registrationOutputPrefix[24]!.va!=='100b53ab' ||
    registrationOutputPrefix[24]!.instruction!=='CALL 0x100a74b6')
    throw new Error('Actual original registration formatter entry required');
  const cookie=NativeSharedCrtSecurityCookie.forPlatform(this.platform);
  const cookieValue=fact(NativeSharedCrtSecurityCookie.prototype.readCookie.call(cookie));
  if(this.#boundary)throw new Error(this.#boundary);
  // Relative entry ESP 0x290 leaves room for locals, saved registers,
  // the locale argument and the pending CALL word. EBP = ESP-4-0x1f8.
  const frame=physical(0x2a4),ebp=0x94;
  this.#formatterFrame=frame;
  frame.pointer(0x294).set(this.#file);
  frame.pointer(0x298).set(this.#format);
  frame.writeUnsigned(0x29c,0);
  frame.pointer(0x2a0).set(this.#arguments);
  // cookie XOR EBP is retained as an opaque expression; numerical EBP
  // bits cannot be derived from a JavaScript buffer or relative offset.
  this.#formatterCookieExpression=Object.freeze({cookie:cookie.fields,cookieValue,frame,ebpOffset:ebp});
  frame.pointer(ebp-0x30).set(this.#file);
  frame.pointer(ebp-0x2c).set(this.#arguments);
  for(const offset of [-0x4c,-0x18,-0x40,-0x20,-0x3c,-0x50,-0x44])frame.writeUnsigned(ebp+offset,0);
  frame.writeUnsigned(4,0); // Original pushed NULL locale argument.
  frame.pointer(0).set(Object.freeze({module:'SharedBase',source:'100b53b0'}));
  this.#formatterLocale=new NativeHeapObjectViews(frame.backing,ebp-0x64,16);
  this.#formatterRegisters=Object.freeze({eax:this.#file,ebx:this.#format,esi:0,edi:this.#arguments,ecx:this.#formatterLocale});
  this.#trace.push('100b5355.translatedEntryFrame');
  this.#trace.push('100b53ab.LocaleUpdate.pending');
 }
 /** Separate translated callee frame preserves the actual caller return and
  * NULL argument. The PTD CALL remains pending until its CRT owner is live. */
 #prepareLocaleEntry():void {
  admitRegistrationOutputSource();
  if(!this.#formatterFrame||!this.#formatterLocale||this.#localeCallFrame||
    registrationLocalePrefix.length!==7||registrationLocalePrefix[6]!.va!=='100a74c5'||
    registrationLocalePrefix[6]!.instruction!=='CALL 0x100ae542')
    throw new Error('Actual original registration LocaleUpdate entry required');
  if(this.#formatterFrame.readUnsigned(4)!==0||this.#formatterRegisters?.esi!==0)
    throw new Error('Actual NULL locale and formatter ESI required');
  const frame=physical(16);
  this.#localeCallFrame=frame;
  frame.pointer(8).set(this.#formatterFrame.pointer(0).get());
  frame.writeUnsigned(12,0); // Retained original NULL argument.
  frame.writeUnsigned(4,0); // PUSH ESI, from the actual formatter register.
  this.#formatterLocale.writeUnsigned(12,0,1);
  frame.pointer(0).set(Object.freeze({module:'SharedBase',source:'100a74ca'}));
  this.#trace.push('100a74b6.translatedLocaleEntry');
  this.#trace.push('100a74c5.getPTD.pending');
 }
 #finishFormatter():void {
  admitRegistrationOutputSource();
  const check=registrationOutputBodies.checkSecurityCookie;
  if(check.length!==4||check[0]!.instruction!=='CMP ECX,dword ptr [0x10140d6c]'||
   check[2]!.instruction!=='RET')throw new Error('Original SharedBase cookie check required');
  const expression=this.#formatterCookieExpression,cookie=NativeSharedCrtSecurityCookie.forPlatform(this.platform);
  if(!expression||expression.frame!==this.#formatterFrame||expression.ebpOffset!==0x94||expression.cookie!==cookie.fields||
   this.#formatterFrame!.knownMask.subarray(0x288,0x28c).some(mask=>mask!==0)||
   fact(NativeSharedCrtSecurityCookie.prototype.readCookie.call(cookie))!==expression.cookieValue)
   throw new Error('Original registration formatter security-cookie mismatch at 100b01d2');
  // (saved cookie XOR this EBP) XOR this same EBP recovers the entry cookie.
  // Saved caller-register bits remain unknown; no numerical stack address is minted.
  this.#formatterReturned=true;this.#trace.push('100b5cc8.registrationFormatter.return');
  const file=this.#file!,remaining=(file.readUnsigned(4)-1)|0;
  file.writeUnsigned(4,remaining>>>0);
  if(remaining<0)throw new Error('Unowned registration terminator flush at 100a7f1a');
  const cursor=file.pointer<NativeBytePointer>(0).get();
  if(!cursor||cursor.fields!==this.#buffer||cursor.offset!==this.#formatterOutputCount)
   throw new Error('Actual returned registration FILE cursor required');
  cursor.fields.writeUnsigned(cursor.offset,0,1);this.#terminatorWritten=true;
  this.#trace.push('100a7f11.registrationTerminator.store');
  this.#trace.push('100a7f26.vsprintfCore.return');
 }
 snapshot(){return Object.freeze({boundary:this.#boundary,file:this.#file,arguments:this.#arguments,
  buffer:this.#buffer,format:this.#format,locale:null,trace:Object.freeze([...this.#trace]),
  formatterFrame:this.#formatterFrame,formatterLocale:this.#formatterLocale,
  localeCallFrame:this.#localeCallFrame,
  localeReturned:this.#localeReturned,
  formatterOutputCount:this.#formatterOutputCount,
  messageCallFrame:this.#messageCallFrame,
  messageOwner:this.#messageOwner,messageGetterReturned:this.#messageGetterReturned,
  formatterCookieExpression:this.#formatterCookieExpression,
  formatterRegisters:this.#formatterRegisters,
  formatterReturned:this.#formatterReturned,terminatorWritten:this.#terminatorWritten,messageDispatched:false,debugReturned:false});}
}
