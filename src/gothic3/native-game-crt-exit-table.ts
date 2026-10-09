import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeBytePointer } from './native-pointer-geometry';
import { NativeGameCrtOwner } from './native-game-crt';
import { gameCinitStaticFiniReceipt } from './native-game-crt-cinit-source';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const exitTables = new WeakMap<NativeGameCrtOwner, NativeGameExitTable>();
const callbackOwners = new WeakMap<object, { readonly crt: NativeGameCrtOwner; readonly label: string;
  readonly entry: string; readonly body: string; readonly hash: string }>();
const tableConstructionToken = Object.freeze({});

/** A source-address capability used as callback data. It is never invoked here. */
export interface NativeGameCrtCallback {
  readonly identity: object;
  readonly module: 'Game';
  readonly label: string;
  readonly entry: string;
}

/** Physical Game CRT onexit globals and their actual mode-1 heap table.
 * Full table traversal and any reallocating path remain unowned. */
export class NativeGameExitTable {
  private readonly allocatedTables: NativeMemoryBacking[] = [];
  private readonly tablePointers = new WeakMap<object, Map<number, NativeBytePointer>>();
  private readonly callbacks = new Map<string, NativeGameCrtCallback>();
  private readonly cells: { readonly offset: number; readonly callback: NativeGameCrtCallback | null }[] = [];
  private readonly trace: string[] = [];
  private readonly cThis: NativeHeapObjectViews;
  private readonly cThat: NativeHeapObjectViews;
  private active = false;
  private boundary: string | null = null;

  private constructor(readonly crt: NativeGameCrtOwner, token: object) {
    if (token !== tableConstructionToken || crt.module !== 'Game' ||
        NativeGameCrtOwner.forPlatform(crt.host) !== crt) {
      throw new Error('Canonical source-admitted Game CRT owner required for exit-table construction');
    }
    this.cThis = crt.imageStorage('crtExitBegin');
    this.cThat = crt.imageStorage('crtExitEnd');
  }

  static forCrt(crt: NativeGameCrtOwner): NativeGameExitTable {
    const existing = exitTables.get(crt);
    if (existing) return existing;
    const table = new NativeGameExitTable(crt, tableConstructionToken);
    exitTables.set(crt, table);
    return table;
  }

  /** Admit a callback target only from this Game image's complete pinned methods. */
  callbackForMethod(label: string): NativeValue<NativeGameCrtCallback> {
    if (this.boundary) return unknown(this.boundary);
    const old = this.callbacks.get(label);
    if (old) return known(old);
    const method = label === 'staticFiniWalker' ? gameCinitStaticFiniReceipt() : this.crt.sourceProfile.heapRules.methods[label];
    const entryChain = (method as typeof method & { readonly entryChain?: readonly {
      readonly va: string; readonly bytes: string; readonly targetVA: string;
    }[] } | undefined)?.entryChain;
    const exactNavigationDestructorThunk = label === 'navigationClassNameDestructor' && method?.entry === '20003904' &&
      method.body === '205496d0' && method.bodyInstructionBytesSha256 === '76ac978a7b1e8b7f104b23644088c9058ab16e59cf363bfbb9b04f1ab3d63d9d' &&
      entryChain?.length === 1 && entryChain[0]?.va === '20003904' && entryChain[0]?.bytes === 'e9c75d5400' && entryChain[0]?.targetVA === '205496d0';
    const exactScriptAdminDestructorThunk = label === 'scriptAdminClassNameDestructor' && method?.entry === '20013971' &&
      method.body === '205491a0' && method.bodyInstructionBytesSha256 === '1ed845df3f543953ecc7b79bc1dde2f2842d2b80968c3c8938917635b1d4aa87' &&
      entryChain?.length === 1 && entryChain[0]?.va === '20013971' && entryChain[0]?.bytes === 'e92a585300' && entryChain[0]?.targetVA === '205491a0';
    const exactArenaDestructorThunk = label === 'arenaClassNameDestructor' && method?.entry === '2000951b' &&
      method.body === '20549960' && method.bodyInstructionBytesSha256 === '1be8eebe292854b737cea1276ff4108adab8b6ad15e7085bfbdf73a6d58ecfdb' &&
      entryChain?.length === 1 && entryChain[0]?.va === '2000951b' && entryChain[0]?.bytes === 'e940045400' && entryChain[0]?.targetVA === '20549960';
    const exactStatusDestructorThunk = label === 'arenaStatusClassNameDestructor' && method?.entry === '200064f1' &&
      method.body === '20549920' && method.bodyInstructionBytesSha256 === '89ac10cc5b5555577e1f3404fda090f234ea745158c607dcd7f0e3983a4eddb5' &&
      entryChain?.length === 1 && entryChain[0]?.va === '200064f1' && entryChain[0]?.bytes === 'e92a345400' && entryChain[0]?.targetVA === '20549920';
    if (!method || method.module !== 'Game' ||
        (method.entry !== method.body && !exactNavigationDestructorThunk && !exactScriptAdminDestructorThunk && !exactArenaDestructorThunk && !exactStatusDestructorThunk) ||
        !/^[0-9a-f]{8}$/.test(method.entry) || !/^[0-9a-f]{64}$/.test(method.bodyInstructionBytesSha256)) {
      return unknown('Complete pinned Game method receipt required for an onexit callback');
    }
    const callback: NativeGameCrtCallback = Object.freeze({ identity: Object.freeze({}), module: 'Game', label, entry: method.entry });
    callbackOwners.set(callback, { crt: this.crt, label, entry: method.entry, body: method.body,
      hash: method.bodyInstructionBytesSha256 });
    this.callbacks.set(label, callback);
    return known(callback);
  }

  private invoke<T>(label: string, body: () => NativeValue<T>): NativeValue<T> {
    if (this.boundary) return unknown(this.boundary);
    if (this.active) {
      this.boundary = 'Reentrant Game CRT ' + label + ' invocation';
      this.trace.push(label + '.reentrant-boundary');
      return unknown(this.boundary);
    }
    this.active = true;
    this.trace.push(label + '.begin');
    try {
      const result = body();
      if (!result.known) this.boundary ??= label + ': ' + result.reason;
      if (this.boundary) return unknown(this.boundary);
      this.trace.push(label + '.return');
      return result;
    } catch (error) {
      this.boundary ??= label + ': ' + (error instanceof Error ? error.message : String(error));
      return unknown(this.boundary);
    } finally {
      this.active = false;
    }
  }

  private call<T>(label: string, action: () => NativeValue<T>, retain?: (value: T) => void): NativeValue<T> {
    this.trace.push(label + '.attempt');
    const result = action();
    if (result.known) retain?.(result.value);
    if (!result.known) {
      this.boundary ??= label + ': ' + result.reason;
      return unknown(this.boundary);
    }
    this.trace.push(label + '.return');
    if (this.boundary) return unknown(this.boundary);
    return result;
  }

  private pointer(backing: NativeMemoryBacking, offset: number): NativeBytePointer {
    let byOffset = this.tablePointers.get(backing.identity);
    if (!byOffset) { byOffset = new Map(); this.tablePointers.set(backing.identity, byOffset); }
    const existing = byOffset.get(offset);
    if (existing) return existing;
    const fields = new NativeHeapObjectViews(backing);
    const pointer: NativeBytePointer = Object.freeze({ fields, offset });
    byOffset.set(offset, pointer);
    return pointer;
  }

  private decodeGlobal(fields: NativeHeapObjectViews, label: string): NativeValue<NativeBytePointer | null> {
    let encoded: object | null;
    try { encoded = fields.pointer<object>(0).get(); }
    catch (error) { return unknown(label + ' load: ' + (error instanceof Error ? error.message : String(error))); }
    const decoded = this.call('DecodePointer20467ddb.' + label, () => this.crt.decodePointer(encoded));
    if (!decoded.known) return decoded;
    if (decoded.value === null) return known(null);
    if (typeof decoded.value !== 'object') return unknown(label + ' did not decode to a retained native byte pointer');
    const pointer = decoded.value as NativeBytePointer;
    if (!(pointer.fields instanceof NativeHeapObjectViews) || !Number.isSafeInteger(pointer.offset)) {
      return unknown(label + ' did not decode to an owned Game CRT allocation pointer');
    }
    return known(pointer);
  }

  private append(callback: NativeGameCrtCallback | null): NativeValue<NativeGameCrtCallback | null> {
    this.trace.push('onexitAppend204636aa.begin');
    const beginResult = this.decodeGlobal(this.cThis, 'crtExitBegin207d2b80');
    if (!beginResult.known) return beginResult;
    const endResult = this.decodeGlobal(this.cThat, 'crtExitEnd207d2b7c');
    if (!endResult.known) return endResult;

    const begin = beginResult.value, end = endResult.value;
    if (begin === null || end === null) {
      if (begin !== null || end !== null) return unknown('Original onexit pointer order between NULL and an opaque allocation lacks native address proof');
      const size = this.call('msize204684cd(NULL)', () => this.crt.msize(null));
      if (!size.known) return size;
      if ((size.value >>> 0) < 4) {
        this.trace.push('reallocCrt20468416.attempt-after-null-msize(' + (size.value >>> 0) + ')');
        return unknown('_realloc20477d87 after a returning invalid-parameter handler; NULL table geometry remains unowned');
      }
      return unknown('Original onexit cell store after NULL table pointer lacks retained allocation backing');
    }
    const geometry = this.crt.byteGeometry();
    const beginGeometry = geometry.resolveNativePointer(begin);
    if (!beginGeometry.known) return beginGeometry;
    const endGeometry = geometry.resolveNativePointer(end);
    if (!endGeometry.known) return endGeometry;
    if (beginGeometry.value.canonicalBacking !== endGeometry.value.canonicalBacking ||
        beginGeometry.value.allocationIdentity !== endGeometry.value.allocationIdentity) {
      return unknown('Original Game onexit pointer order across separate allocations is not admitted');
    }
    if (endGeometry.value.offset < beginGeometry.value.offset) {
      this.trace.push('onexitAppend204636aa.end-before-begin-returnNULL');
      return known(null);
    }
    const difference = endGeometry.value.offset - beginGeometry.value.offset;
    if (difference > 0xffffffff) return unknown('Original onexit DWORD pointer difference exceeds its owned geometry');
    const required = (difference + 4) >>> 0;
    if (required < 4) {
      this.trace.push('onexitAppend204636aa.required-wrap-returnNULL');
      return known(null);
    }

    const size = this.call('msize204684cd', () => this.crt.msize(begin));
    if (!size.known) return size;
    if ((size.value >>> 0) < required) {
      const increment = Math.min(size.value >>> 0, 0x800);
      const requested = ((size.value >>> 0) + increment) >>> 0;
      if (requested >= (size.value >>> 0)) {
        this.trace.push('reallocCrt20468416.attempt(' + requested + ')');
        return unknown('_realloc20477d87 inside the admitted reallocCrt20468416; growth result and storage relocation are unowned');
      }
      const fallback = ((size.value >>> 0) + 0x10) >>> 0;
      if (fallback < (size.value >>> 0)) {
        this.trace.push('onexitAppend204636aa.fallback-growth-overflow-returnNULL');
        return known(null);
      }
      this.trace.push('reallocCrt20468416.fallback-attempt(' + fallback + ')');
      return unknown('_realloc20477d87 inside the admitted reallocCrt20468416 fallback; growth result and storage relocation are unowned');
    }

    const offset = endGeometry.value.offset;
    if ((offset & 3) !== 0 || offset + 4 > endGeometry.value.allocationEnd) {
      return unknown('Original DWORD callback cell lacks retained aligned table storage');
    }
    if (callback !== null) {
      const receipt = callbackOwners.get(callback);
      const method = receipt && (receipt.label === 'staticFiniWalker' ? gameCinitStaticFiniReceipt()
        : this.crt.sourceProfile.heapRules.methods[receipt.label]);
      if (!receipt || receipt.crt !== this.crt || receipt.entry !== callback.entry || receipt.entry !== method?.entry ||
          receipt.body !== method?.body || receipt.hash !== method?.bodyInstructionBytesSha256 || callback.module !== 'Game') {
        return unknown('Callback must be this Game CRT owner’s admitted pinned function capability');
      }
    }

    const encoded = this.call('EncodePointer20467d64.callback', () => this.crt.encodePointer(callback));
    if (!encoded.known) return encoded;
    let fields: NativeHeapObjectViews;
    try { fields = new NativeHeapObjectViews(beginGeometry.value.canonicalBacking); fields.pointer<object>(offset).set(encoded.value); }
    catch (error) { return unknown('onexit cell store: ' + (error instanceof Error ? error.message : String(error))); }
    this.cells.push(Object.freeze({ offset, callback }));
    this.trace.push('onexitAppend204636aa.callback-cell-store+' + offset.toString(16));

    const next = this.pointer(beginGeometry.value.canonicalBacking, offset + 4);
    const encodedEnd = this.call('EncodePointer20467d64.next-end', () => this.crt.encodePointer(next));
    if (!encodedEnd.known) return encodedEnd;
    try { this.cThat.pointer<object>(0).set(encodedEnd.value); }
    catch (error) { return unknown('crtExitEnd207d2b7c store: ' + (error instanceof Error ? error.message : String(error))); }
    this.trace.push('crtExitEnd207d2b7c.store');
    return known(callback);
  }

  private onexitBody(callback: NativeGameCrtCallback | null): NativeValue<NativeGameCrtCallback | null> {
    this.trace.push('onexit20463792.lock8');
    const entered = this.call('onexitLock820466415', () => this.crt.lock(8));
    if (!entered.known) return entered;
    const appended = this.append(callback);
    if (!appended.known) return appended;
    this.trace.push('onexitCleanup204637c8');
    const left = this.call('onexitUnlock82046641e', () => this.crt.unlock(8));
    if (!left.known) return left;
    return appended;
  }

  /** Re-run the original cold initializer on every completed invocation; it has no once guard. */
  initialize(): NativeValue<number> {
    return this.invoke('onexitColdInitializer20463763', () => {
      const allocation = this.call('callocCrt204683ce(32,4)', () => this.crt.callocCrt(32, 4), backing => {
        if (backing) this.allocatedTables.push(backing);
      });
      if (!allocation.known) return allocation;
      const base = allocation.value === null ? null : this.pointer(allocation.value, 0);
      const encoded = this.call('EncodePointer20467d64.initial-begin-and-end', () => this.crt.encodePointer(base));
      if (!encoded.known) return encoded;
      try { this.cThis.pointer<object>(0).set(encoded.value); this.trace.push('crtExitBegin207d2b80.store'); }
      catch (error) { return unknown('crtExitBegin207d2b80 store: ' + (error instanceof Error ? error.message : String(error))); }
      try { this.cThat.pointer<object>(0).set(encoded.value); this.trace.push('crtExitEnd207d2b7c.store'); }
      catch (error) { return unknown('crtExitEnd207d2b7c store: ' + (error instanceof Error ? error.message : String(error))); }
      if (allocation.value === null) return known(24);
      try { new NativeHeapObjectViews(allocation.value).writeUnsigned(0, 0); this.trace.push('onexitColdInitializer20463763.first-cell-zero'); }
      catch (error) { return unknown('onexit initializer first-cell store: ' + (error instanceof Error ? error.message : String(error))); }
      return known(0);
    });
  }

  onexit(callback: NativeGameCrtCallback | null): NativeValue<NativeGameCrtCallback | null> {
    return this.invoke('onexit20463792', () => this.onexitBody(callback));
  }

  /** Register only; the returned value is the source callback, never an invocation. */
  atexit(callback: NativeGameCrtCallback | null): NativeValue<0 | -1> {
    return this.invoke('atexit204637ce', () => {
      const result = this.onexitBody(callback);
      if (!result.known) return result;
      return known(result.value === null ? -1 : 0);
    });
  }

  snapshot() {
    return Object.freeze({ scope: 'Game CRT onexit initialization and within-capacity callback registration',
      traversalOwned: false, boundary: this.boundary, active: this.active,
      tableAllocations: Object.freeze(this.allocatedTables.slice()),
      callbackCells: Object.freeze(this.cells.slice()),
      trace: Object.freeze(this.trace.slice()) });
  }
}
