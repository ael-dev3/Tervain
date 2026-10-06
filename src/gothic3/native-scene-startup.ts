/** Source-ordered SceneAdmin class-name and cached lookup startup. The lookup
 * never constructs a SceneAdmin and never infers application initialization. */
import sourceText from '../../assets/gothic3/scene-startup/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import { NativeHeapCString } from './native-heap-cstring';
import type { NativeMemoryAdmin, NativeMemoryBacking } from './native-memory-admin';
import type { NativeCrtBytePointer } from './native-crt-dname';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
interface SourceRange { address: string; bytes: number; raw: string; knownMask?: string }
interface SourceRules {
  schema: string; inputs: { Engine: string; SharedBase: string };
  coldGlobals: Record<string, SourceRange>;
  constBytes: Record<string, SourceRange>;
  methods: Record<string, { entry: string; body: string; bodyInstructionBytesSha256: string }>;
}
const source = JSON.parse(sourceText) as SourceRules;
function admit(): void {
  if (source.schema !== 'gothic3-scene-startup-rules-v1' ||
      source.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
      source.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214') {
    throw new Error('Original SceneAdmin startup source inputs differ');
  }
  for (const [label, entry, body, hash] of [
    ['sceneGetInstance', '30009a2a', '3007bf20', 'f8d1032401b431b3aa6db61a5a7c1578ce917e9f6449e69c87e3e08592c13198'],
    ['sceneClassName', '3003d91f', '300780f0', 'd1da6600837d1ba10638681f0df1d2cde7c7e0f01583880292f2bfae3c971836'],
    ['sceneClassNameInitializer', '307325e0', '307325e0', '0de36f6fe4231248a2826932aff45cead6a77aa603b148f5aab3be516bf942f8'],
    ['typeInfoNameBody', '3067da97', '3067da97', '184ae8fa2b02b23b8964d3ba50f2bc2883114b1dbd48a60225b35351ca66cbe1'],
    ['typeInfoNameCleanup', '3067db83', '3067db80', 'f7496e1dd96c14c0e6fc494ca151849552c50e0f58775cb8be7dac928b334c98'],
    ['classNameUnMangle', '100088cd', '10091550', 'c639bbe65ad604674090c003628ac46ba8914554f1b413c41e6285ceffccd134'],
    ['sceneClassNameDestructor', '300184df', '30797c90', 'b1a2e2bb4cbdd84ecc08a969c18b636ac5e27f20ba3f1a6cf054d183329b51bc'],
  ]) {
    const method = source.methods[label!];
    if (!method || method.entry !== entry || method.body !== body || method.bodyInstructionBytesSha256 !== hash) {
      throw new Error('Original SceneAdmin startup method receipt differs: ' + label);
    }
  }
}
function hex(raw: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/.test(raw)) throw new Error('Exact native source hexadecimal bytes required');
  return Uint8Array.from(raw.match(/../g) ?? [], value => parseInt(value, 16));
}
function storage(label: string, address: string, size: number, constant = false): NativeHeapObjectViews {
  admit();
  const receipt = (constant ? source.constBytes : source.coldGlobals)[label];
  if (!receipt || receipt.address !== address || receipt.bytes !== size || receipt.raw.length !== size * 2 ||
      (!constant && (receipt.raw !== '00'.repeat(size) || receipt.knownMask !== 'ff'.repeat(size)))) {
    throw new Error('Original SceneAdmin startup storage differs: ' + label);
  }
  return new NativeHeapObjectViews({ identity: {}, bytes: hex(receipt.raw),
    knownMask: new Uint8Array(size).fill(255), freed: false });
}
function fact<T>(result: NativeValue<T>, operation: string): T {
  if (!result.known) throw new Error(operation + ': ' + result.reason);
  return result.value;
}
function terminated(view: NativeHeapObjectViews, offset = 0): Uint8Array {
  const bytes: number[] = [];
  for (let at = offset; at < view.bytes.length; at++) {
    const byte = view.readUnsigned(at, 1); bytes.push(byte);
    if (byte === 0) return Uint8Array.from(bytes);
  }
  throw new Error('Actual native NUL-terminated byte string required');
}

/** Actual CRT helper services. ___unDName is a separate native dependency;
 * providing a JavaScript label does not supply its owned output allocation. */
export interface NativeSceneTypeInfoHost {
  undname?(input: NativeCrtBytePointer, flags: 0x2800): NativeValue<NativeMemoryBacking | null>;
  crtMalloc(bytes: number): NativeValue<NativeMemoryBacking | null>;
  crtFree(backing: NativeMemoryBacking): NativeValue<void>;
  lock(id: 14): NativeValue<void>;
  unlock(id: 14): NativeValue<void>;
}

/** Engine CRT type_info::name wrapper306713ae/body3067da97. Its descriptor
 * cache and CRT-list links are physical slots. CRT ownership remains distinct
 * from SharedBase MemoryAdmin ownership and from the class-name CString. */
export class NativeSceneTypeInfoName {
  readonly descriptor = storage('sceneTypeInfoDescriptor', '30aa3050', 27, true);
  readonly list: NativeHeapObjectViews;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private held: boolean | null = false;
  private readonly nodes: NativeMemoryBacking[] = [];
  private readonly trace: string[] = [];
  constructor(private readonly host: NativeSceneTypeInfoHost, crtTypeInfoList?: NativeHeapObjectViews) {
    this.list = crtTypeInfoList ?? storage('crtTypeInfoList', '30af70ac', 8);
    if (this.list.bytes.length !== 8) throw new Error('Actual eight-byte CRT type-info list required');
    if (this.descriptor.readUnsigned(0) !== 0x30892abc || this.descriptor.readUnsigned(4) !== 0 ||
        [...terminated(this.descriptor, 8)].map(value => String.fromCharCode(value)).join('') !== '.?AVeCSceneAdmin@@\0') {
      throw new Error('Exact original SceneAdmin RTTI descriptor required');
    }
  }
  private guard(): void {
    if (this.reentrant) throw new Error('Unsupported reentry into the SceneAdmin CRT type-name service');
  }
  private call<T>(name: string, body: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.guard(); this.trace.push(name + '.attempt');
    const result = body(); if (result.known) retain?.(result.value);
    this.guard(); const value = fact(result, name); this.trace.push(name); return value;
  }
  getName(): NativeValue<NativeMemoryBacking | null> {
    if (this.active) { this.reentrant = true; return unknown('SceneAdmin type-name service is already executing'); }
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      const cached = this.descriptor.pointer<NativeMemoryBacking>(4).get();
      if (cached) { terminated(new NativeHeapObjectViews(cached)); return known(cached); }
      if (!this.host.undname) throw new Error('CRT.___unDName3069b26b is unowned');
      const temporary = this.call('crt.undname.0x2800', () => this.host.undname!({ fields: this.descriptor, offset: 9 }, 0x2800));
      if (!temporary) return known(null);
      const text = new NativeHeapObjectViews(temporary);
      let length = terminated(text).length - 1;
      while (length > 0 && text.readUnsigned(length - 1, 1) === 0x20) text.writeUnsigned(--length, 0, 1);
      this.held = null;
      this.call('crt.lock.14', () => this.host.lock(14), () => { this.held = true; });
      if (this.descriptor.pointer<NativeMemoryBacking>(4).get() === null) {
        const node = this.call('crt.malloc.8', () => this.host.crtMalloc(8));
        if (node) {
          this.nodes.push(node);
          const destination = this.call('crt.malloc.name', () => this.host.crtMalloc(length + 1));
          this.guard(); this.descriptor.pointer<NativeMemoryBacking>(4).set(destination);
          if (destination) {
            const output = new NativeHeapObjectViews(destination);
            // Exact successful strcpy_s branch: copy the terminating NUL too.
            for (let offset = 0; offset <= length; offset++) output.writeUnsigned(offset, text.readUnsigned(offset, 1), 1);
            const links = new NativeHeapObjectViews(node, 0, 8);
            links.pointer<NativeMemoryBacking>(0).set(destination);
            links.pointer<NativeMemoryBacking>(4).set(this.list.pointer<NativeMemoryBacking>(4).get());
            this.list.pointer<NativeMemoryBacking>(4).set(node); this.trace.push('crt.typeInfoList.link');
          } else this.call('crt.free.node', () => this.host.crtFree(node));
        }
      }
      this.call('crt.free.undname', () => this.host.crtFree(temporary));
      this.held = null;
      this.call('crt.unlock.14', () => this.host.unlock(14), () => { this.held = false; });
      this.guard(); return known(this.descriptor.pointer<NativeMemoryBacking>(4).get());
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  snapshot() { return Object.freeze({ boundary: this.boundary, held: this.held,
    nodes: Object.freeze([...this.nodes]), trace: Object.freeze([...this.trace]) }); }
}

export interface NativeSceneClassNameHost {
  readonly memory: NativeMemoryAdmin;
  readonly typeInfo: NativeSceneTypeInfoName;
  registerShutdown(address: '300184df', owner: object, execute: () => NativeValue<void>): NativeValue<number>;
}

/** ClassName300780f0 has two guard bits. +4 copies an earlier CString pointer;
 * CRTname still receives the literal RTTI descriptor30aa3050 independently. */
export class NativeSceneClassName {
  readonly fields = storage('sceneClassName', '30ad9c44', 12);
  readonly initializerResult = storage('sceneTypeInfoPointer', '30ad9d6c', 4);
  private name: NativeHeapCString | null = null;
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private destroyed = false;
  private readonly trace: string[] = [];
  constructor(private readonly host: NativeSceneClassNameHost) {}
  get(): NativeValue<NativeHeapCString> {
    if (this.active) { this.reentrant = true; return unknown('SceneAdmin class-name startup is already executing'); }
    if (this.destroyed) return unknown('SceneAdmin class-name lifetime has ended');
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      if ((this.fields.readUnsigned(8) & 1) === 0) {
        // 300780f9 loads the prior pointer before 30078102 sets the first guard bit.
        const prior = this.initializerResult.pointer<NativeHeapObjectViews>(0).get();
        this.fields.writeUnsigned(8, this.fields.readUnsigned(8) | 1);
        this.fields.pointer<NativeHeapObjectViews>(4).set(prior);
        this.trace.push('className.guard1.copy');
      }
      if ((this.fields.readUnsigned(8) & 2) === 0) {
        this.fields.writeUnsigned(8, this.fields.readUnsigned(8) | 2); this.trace.push('className.guard2');
        const name = fact(this.host.typeInfo.getName(), 'CRT.type_info.name');
        if (this.reentrant) throw new Error('Unsupported reentrant class-name initialization');
        if (!name) throw new Error('UnMangle._strstr dereferences NULL CRT type-name result');
        const bytes = terminated(new NativeHeapObjectViews(name));
        const firstSpace = bytes.indexOf(0x20);
        const selected = firstSpace < 0 ? bytes : bytes.subarray(firstSpace + 1);
        // The text constructor stores NULL then performs SetText. Retain the
        // actual object even when its subsequent allocation/copy is partial.
        this.name = new NativeHeapCString(this.host.memory, new NativeHeapObjectViews(this.fields.backing, 0, 4));
        fact(this.name.setTextBytes(selected), 'ClassName.UnMangle.CString');
        if (this.reentrant) throw new Error('Unsupported reentrant class-name initialization');
        const registered = this.host.registerShutdown('300184df', this, () => this.destroyName());
        if (this.reentrant) throw new Error('Unsupported reentrant class-name initialization');
        fact(registered, 'SceneClassName._atexit'); this.trace.push('className.shutdown.register');
      }
      if (!this.name) throw new Error('Actual completed SceneAdmin class-name CString required');
      return known(this.name);
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  /** Dynamic initializer307325e0 calls GetClassName then publishes its address. */
  initializeCachedClassName(): NativeValue<void> {
    const value = this.get(); if (!value.known) return value;
    this.initializerResult.pointer<NativeHeapObjectViews>(0).set(value.value.slot);
    this.trace.push('className.initializer.publish'); return known(undefined);
  }
  private destroyName(): NativeValue<void> {
    if (this.active) { this.reentrant = true; return unknown('Class-name shutdown during startup is unowned'); }
    if (this.destroyed) return unknown('SceneAdmin class-name lifetime has ended');
    if (!this.name) return unknown('Actual constructed class-name CString required for shutdown');
    const result = this.name.destroy();
    if (result.known) { this.destroyed = true; this.trace.push('className.shutdown.destroy'); }
    else { this.boundary = result.reason; this.trace.push('blocked:' + this.boundary); }
    return result;
  }
  snapshot() { return Object.freeze({ boundary: this.boundary, destroyed: this.destroyed, name: this.name, trace: Object.freeze([...this.trace]) }); }
}

export interface NativeSceneLookupHost<T extends object, M extends object> {
  readonly className: NativeSceneClassName;
  moduleAdmin(): NativeValue<M | null>;
  findModule(module: M, className: NativeHeapCString): NativeValue<object | null>;
  dynamicCast(component: object | null, sourceType: 'eCEngineComponentBase', targetType: 'eCSceneAdmin'): NativeValue<T | null>;
}

export class NativeSceneAdminLookup<T extends object, M extends object> {
  readonly applicationInitialized: NativeHeapObjectViews;
  readonly fields = storage('sceneCachedSingleton', '30ad9cdc', 8);
  private active = false;
  private reentrant = false;
  private boundary: string | null = null;
  private readonly trace: string[] = [];
  constructor(private readonly host: NativeSceneLookupHost<T, M>, applicationInitialized?: NativeHeapObjectViews) {
    this.applicationInitialized = applicationInitialized ?? storage('applicationInitialized', '30ad989c', 1);
    if (this.applicationInitialized.bytes.length !== 1) throw new Error('Actual one-byte application initialization field required');
  }
  getInstance(): NativeValue<T | null> {
    if (this.active) { this.reentrant = true; return unknown('SceneAdmin lookup is already executing'); }
    if (this.boundary) return unknown(this.boundary);
    this.active = true; this.reentrant = false;
    try {
      if (this.applicationInitialized.readUnsigned(0, 1) !== 1) return known(null);
      if ((this.fields.readUnsigned(4) & 1) === 0) {
        this.fields.writeUnsigned(4, this.fields.readUnsigned(4) | 1); this.trace.push('scene.lookup.guard');
        const name = fact(this.host.className.get(), 'SceneAdmin.GetClassName');
        if (this.reentrant) throw new Error('Unsupported reentrant SceneAdmin lookup');
        const module = fact(this.host.moduleAdmin(), 'ModuleAdmin.GetInstance');
        if (this.reentrant) throw new Error('Unsupported reentrant SceneAdmin lookup');
        if (!module) throw new Error('SceneAdmin.FindModule dereferences NULL ModuleAdmin');
        const component = fact(this.host.findModule(module, name), 'ModuleAdmin.FindModule');
        if (this.reentrant) throw new Error('Unsupported reentrant SceneAdmin lookup');
        const scene = fact(this.host.dynamicCast(component, 'eCEngineComponentBase', 'eCSceneAdmin'), 'CRT.RTDynamicCast');
        if (this.reentrant) throw new Error('Unsupported reentrant SceneAdmin lookup');
        this.fields.pointer<T>(0).set(scene); this.trace.push('scene.lookup.cache');
      }
      return known(this.fields.pointer<T>(0).get());
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary); return unknown(this.boundary);
    } finally { this.active = false; }
  }
  snapshot() { return Object.freeze({ boundary: this.boundary, trace: Object.freeze([...this.trace]) }); }
}
