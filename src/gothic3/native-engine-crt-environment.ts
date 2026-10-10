/** Engine environment selection and scan prefix, using its own cold mode global.
 * Allocation/output ownership is the next dependency; no output is synthesized. */
import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeRuntimePlatform } from './native-runtime-platform';
import type { NativeBytePointer } from './native-pointer-geometry';
import type { NativeWin32ProcessInputEndpoints } from './native-win32-process-inputs';
import { admitEngineEnvironmentSource, engineEnvironmentImage, engineEnvironmentInstruction } from './native-engine-environment-source';

const known=<T>(value:T):NativeValue<T>=>({known:true,value});
const unknown=(reason:string):NativeValue<never>=>({known:false,reason});
function fact<T>(value:NativeValue<T>):T{if(!value.known)throw new Error(value.reason);return value.value;}
const owners=new WeakMap<NativeModuleCrtOwner,NativeEngineCrtEnvironment>();
const token=Object.freeze({});
export class NativeEngineCrtEnvironment {
  readonly #crt:NativeModuleCrtOwner;
  readonly #platform:NativeRuntimePlatform;
  readonly #endpoints:Readonly<NativeWin32ProcessInputEndpoints>;
  readonly #mode:NativeHeapObjectViews;
  #phase:'cold'|'invoking'|'returned'|'blocked'='cold';
  #boundary:string|null=null;
  #pc='3068e828';
  #input:NativeBytePointer|null=null;
  #branch:'wide'|'ansi'|null=null;
  #cursor=0;
  #reads=0;
  #inputCharacters:number|null=null;
  #outputBytes:number|null=null;
  #invocations=0;
  readonly #effects:{pc:string;operation:string;value:unknown}[]=[];
  private constructor(crt:NativeModuleCrtOwner,cap:object){
    if(cap!==token||new.target!==NativeEngineCrtEnvironment)throw new Error('Actual Engine environment construction required');
    admitEngineEnvironmentSource();
    if(!NativeModuleCrtOwner.isConstructedOwner(crt)||crt.module!=='Engine')throw new Error('Actual constructed Engine CRT required');
    this.#crt=crt;this.#platform=crt.host.platform as NativeRuntimePlatform;
    const endpoints=crt.host.platform.processInputEndpoints;
    if(!endpoints)throw new Error('Retained Engine process inputs required');
    this.#endpoints=endpoints;
    fact(NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(this.#platform,this.#endpoints));
    const image=engineEnvironmentImage('environmentMode');
    if(image.address!=='30af7908'||image.raw!=='00000000'||image.bytes!==4)throw new Error('Original Engine environment mode required');
    this.#mode=new NativeHeapObjectViews({identity:Object.freeze({crt:crt.identity,address:image.address}),bytes:new Uint8Array(4),knownMask:new Uint8Array(4).fill(255),freed:false});
    Object.freeze(this.#mode);Object.freeze(this);
  }
  static forCrt(crt:NativeModuleCrtOwner):NativeValue<NativeEngineCrtEnvironment>{
    try{const retained=owners.get(crt);if(retained){retained.#authority();return known(retained);}
      const owner=new NativeEngineCrtEnvironment(crt,token);owners.set(crt,owner);return known(owner);
    }catch(error){return unknown(error instanceof Error?error.message:String(error));}
  }
  #authority(){
    if(!NativeModuleCrtOwner.isConstructedOwner(this.#crt)||this.#crt.module!=='Engine'||this.#crt.host.platform!==this.#platform||this.#crt.host.platform.processInputEndpoints!==this.#endpoints)throw new Error('Actual retained Engine environment graph required');
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
    fact(NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(this.#platform,this.#endpoints!));
    if(this.#mode.backing.freed)throw new Error('Live Engine environment mode required');
  }
  #at(pc:string){this.#pc=pc;engineEnvironmentInstruction(pc);this.#authority();if(this.#phase!=='invoking')throw new Error(this.#boundary??'Engine environment invocation interrupted');}
  #effect(operation:string,value:unknown){this.#effects.push(Object.freeze({pc:this.#pc,operation,value}));}
  #call<T>(pc:string,operation:string,body:()=>NativeValue<T>):T{
    this.#at(pc);const value=fact(body());this.#effect(operation,value);this.#at(pc);return value;
  }
  #readMode(pc:string){this.#at(pc);const value=NativeHeapObjectViews.prototype.readUnsigned.call(this.#mode,0,4);this.#effect('mode.read',value);return value;}
  #storeMode(pc:string,value:number){this.#at(pc);NativeHeapObjectViews.prototype.writeUnsigned.call(this.#mode,0,value,4);this.#effect('mode.store',value);}
  #get(pc:string,wide:boolean){this.#input=this.#call(pc,wide?'GetEnvironmentStringsW.return':'GetEnvironmentStrings.return',()=>wide?this.#endpoints!.getEnvironmentStringsW():this.#endpoints!.getEnvironmentStrings());return this.#input;}
  #read(pc:string,width:1|2){this.#at(pc);const value=fact(NativeRuntimePlatform.readProcessInputUnsigned(this.#platform,this.#input!,this.#cursor,width));this.#reads++;return value;}
  #finish(){this.#at('3068e95c');this.#phase='returned';this.#effect('environment.return',null);return known(null);}
  capture():NativeValue<NativeBytePointer|null>{
    if(this.#phase==='blocked')return unknown(this.#boundary!);
    if(this.#phase==='invoking'){this.#phase='blocked';this.#boundary='Reentrant Engine environment capture cannot replay';return unknown(this.#boundary);}
    this.#phase='invoking';this.#input=null;this.#branch=null;this.#cursor=0;this.#reads=0;this.#inputCharacters=null;this.#outputBytes=null;this.#invocations++;
    try{
      admitEngineEnvironmentSource();let mode=this.#readMode('3068e82a');
      if(mode===0){
        if(this.#get('3068e844',true)!==null){this.#storeMode('3068e84c',1);mode=1;}
        else{const error=this.#call('3068e858','GetLastError.return',()=>this.#platform.getWin32LastError());
          if(error===0x78){this.#storeMode('3068e865',2);mode=2;}else mode=this.#readMode('3068e86c');}
      }
      if(mode===1){
        this.#branch='wide';if(this.#input===null&&this.#get('3068e87e',true)===null)return this.#finish();
        if(this.#read('3068e88d',2)!==0){for(;;){do{this.#cursor+=2;}while(this.#read('3068e896',2)!==0);this.#cursor+=2;if(this.#read('3068e89d',2)===0)break;}}
        this.#inputCharacters=(this.#cursor>>1)+1;this.#at('3068e8b5');this.#effect('inputCharacters.store',this.#inputCharacters);
        this.#outputBytes=this.#call('3068e8b9','WideCharToMultiByte.measure.return',()=>this.#endpoints!.wideCharToMultiByte({codePage:0,flags:0,input:this.#input!,inputCharacters:this.#inputCharacters!,output:null,outputBytes:0,defaultCharacter:null,usedDefaultCharacter:null}));
        if(!Number.isInteger(this.#outputBytes)||this.#outputBytes<0||this.#outputBytes>0xffffffff)throw new Error('Actual Engine conversion DWORD required');
        if(this.#outputBytes===0){this.#call('3068e8f4','FreeEnvironmentStringsW.return',()=>this.#endpoints!.freeEnvironmentStringsW(this.#input!));return this.#finish();}
        this.#at('3068e8c2');throw new Error('Engine environment allocation/output ownership3067c9c1 at3068e8c2');
      }
      if(mode!==0&&mode!==2)return this.#finish();
      this.#branch='ansi';if(this.#get('3068e906',false)===null)return this.#finish();
      if(this.#read('3068e916',1)!==0){for(;;){do{this.#cursor++;}while(this.#read('3068e91b',1)!==0);this.#cursor++;if(this.#read('3068e920',1)===0)break;}}
      this.#outputBytes=(this.#cursor+1)>>>0;this.#at('3068e92a');throw new Error('Engine environment allocation/output ownership3067c9c1 at3068e92a');
    }catch(error){this.#boundary??=error instanceof Error?error.message:String(error);this.#phase='blocked';return unknown(this.#boundary);}
  }
  snapshot(){return Object.freeze({module:'Engine' as const,entry:'3068e828',phase:this.#phase,boundary:this.#boundary,pc:this.#pc,mode:NativeHeapObjectViews.prototype.readUnsigned.call(this.#mode,0,4),branch:this.#branch,input:this.#input,scanCursor:this.#cursor,scanReads:this.#reads,inputCharacters:this.#inputCharacters,outputBytes:this.#outputBytes,invocations:this.#invocations,effects:Object.freeze([...this.#effects])});}
}
