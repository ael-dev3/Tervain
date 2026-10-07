/** Actual Game20476835 environment capture. OS input blocks and the returned
 * Game heap allocation have different retained identities and lifetimes.
 * The current admitted invocation scope is an active platform; source use
 * during atexit callback drain still needs separate lifetime ownership. */
import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeMemoryBacking } from './native-memory-admin';
import type { NativeBytePointer } from './native-pointer-geometry';
import { NativeRuntimePlatform } from './native-runtime-platform';
import type { NativeWin32ProcessInputEndpoints } from './native-win32-process-inputs';
import { admitGameEnvironmentSource, gameContinuationImageReceipt } from './native-game-crt-attach-source';
import { NativeGameCrtByteCopy } from './native-game-crt-byte-copy';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Game environment capture escaped without an owned error description'; }
}
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }
function dword(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Actual environment DWORD result required');
  return value;
}
const token = Object.freeze({});
type Phase = 'cold' | 'invoking' | 'returned' | 'blocked';
interface Construction { phase: 'constructing' | 'returned' | 'blocked'; owner: NativeGameCrtEnvironment | null; boundary: string | null; }
const owners = new WeakMap<NativeModuleCrtOwner, Construction>();
export interface NativeGameEnvironmentEffect {
  readonly pc: string; readonly operation: string;
  readonly value: number | NativeBytePointer | NativeMemoryBacking | null;
}
interface EnvironmentFrame {
  readonly id: number; phase: Phase; pc: string; boundary: string | null;
  mode: number | null; branch: 'wide' | 'ansi' | null;
  input: NativeBytePointer | null; scanCursor: number; scanReads: number;
  lastRead: Readonly<{ pc: string; offset: number; width: 1 | 2; value: number }> | null;
  inputCharacters: number | null; outputBytes: number | null;
  allocation: NativeMemoryBacking | null; output: NativeBytePointer | null;
  conversionResult: number | null; releaseResult: number | null;
  result: NativeBytePointer | null; readonly effects: NativeGameEnvironmentEffect[];
}

/** The native function has no once guard. A successful call permits another
 * physical invocation; any unknown/reentrant frame remains blocked forever. */
export class NativeGameCrtEnvironment {
  readonly #crt: NativeModuleCrtOwner;
  readonly #platform: NativeRuntimePlatform;
  readonly #endpoints: NativeWin32ProcessInputEndpoints;
  readonly #mode: NativeHeapObjectViews;
  readonly #copy: NativeGameCrtByteCopy;
  #phase: Phase = 'cold';
  #boundary: string | null = null;
  #frame: EnvironmentFrame | null = null;
  readonly #frames: EnvironmentFrame[] = [];

  private constructor(crt: NativeModuleCrtOwner, constructionToken: object) {
    if (constructionToken !== token || new.target !== NativeGameCrtEnvironment) throw new Error('Actual Game environment construction required');
    admitGameEnvironmentSource();
    this.#crt = crt; this.#platform = crt.host.platform as NativeRuntimePlatform;
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') throw new Error('Actual constructed Game CRT required');
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
    const endpoints = crt.host.platform.processInputEndpoints;
    if (!endpoints) throw new Error('Actual retained Game Win32 process-input endpoints required');
    fact(NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(this.#platform, endpoints));
    this.#endpoints = endpoints;
    const receipt = gameContinuationImageReceipt('environmentMode');
    if (receipt.module !== 'Game' || receipt.address !== '207d11b0' || receipt.bytes !== 4) throw new Error('Original Game environment-mode receipt differs');
    this.#mode = fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, 'environmentMode'));
    this.#copy = fact(NativeGameCrtByteCopy.forCrt(crt));
    this.#requireAuthority(); Object.freeze(this);
  }

  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeGameCrtEnvironment> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') return unknown('Actual constructed Game CRT required for environment capture');
    const retained = owners.get(crt);
    if (retained) {
      if (retained.phase === 'constructing') { retained.phase = 'blocked'; retained.boundary = 'Reentrant Game environment construction cannot restart'; }
      if (retained.phase !== 'returned') return unknown(retained.boundary!);
      try { retained.owner!.#requireAuthority(); return known(retained.owner!); }
      catch (error) { return unknown(reason(error)); }
    }
    const entry: Construction = { phase: 'constructing', owner: null, boundary: null }; owners.set(crt, entry);
    try {
      const owner = new NativeGameCrtEnvironment(crt, token);
      if (entry.phase !== 'constructing') throw new Error(entry.boundary ?? 'Game environment construction was interrupted');
      entry.owner = owner; entry.phase = 'returned'; return known(owner);
    } catch (error) { entry.phase = 'blocked'; entry.boundary ??= reason(error); return unknown(entry.boundary); }
  }

  static captureForCrt(owner: NativeGameCrtEnvironment, crt: NativeModuleCrtOwner): NativeValue<NativeBytePointer | null> {
    const retained = owners.get(crt);
    if (!owner || retained?.phase !== 'returned' || retained.owner !== owner || !NativeModuleCrtOwner.isConstructedOwner(crt) || owner.#crt !== crt) {
      return unknown('Actual retained same-CRT Game environment owner required');
    }
    return owner.#capture();
  }

  #requireAuthority(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.#crt.module !== 'Game' || this.#crt.host.platform !== this.#platform ||
        this.#crt.host.platform.processInputEndpoints !== this.#endpoints) throw new Error('Actual retained same-platform Game environment graph required');
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
    fact(NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(this.#platform, this.#endpoints));
    if (fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, 'environmentMode')) !== this.#mode || this.#mode.bytes.length !== 4) {
      throw new Error('Retained canonical environment-mode storage differs');
    }
  }
  #guard(): void {
    this.#requireAuthority();
    if (this.#phase !== 'invoking' || this.#frame?.phase !== 'invoking') throw new Error(this.#boundary ?? 'Game environment invocation was interrupted');
  }
  #pc(pc: string): void { this.#frame!.pc = pc; this.#guard(); }
  #effect(pc: string, operation: string, value: NativeGameEnvironmentEffect['value']): void {
    this.#frame!.effects.push(Object.freeze({ pc, operation, value }));
  }
  #call<T>(pc: string, operation: string, body: () => NativeValue<T>, retain?: (value: T) => void): T {
    this.#pc(pc); const result = body();
    if (!result.known) throw new Error(operation + ' at' + pc + ': ' + result.reason);
    const value = result.value;
    retain?.(value); this.#guard(); return value;
  }
  #readMode(pc: string): number {
    this.#pc(pc);
    fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, this.#crt, 'environmentMode', 0, 4));
    const value = NativeHeapObjectViews.prototype.readUnsigned.call(this.#mode, 0, 4);
    this.#frame!.mode = value; this.#effect(pc, 'environmentMode.read', value); this.#guard(); return value;
  }
  #writeMode(pc: string, value: number): void {
    this.#pc(pc);
    fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, this.#crt, 'environmentMode', 0, 4));
    NativeHeapObjectViews.prototype.writeUnsigned.call(this.#mode, 0, value, 4);
    this.#frame!.mode = value; this.#effect(pc, 'environmentMode.store', value); this.#guard();
  }
  #read(pc: string, offset: number, width: 1 | 2): number {
    this.#pc(pc); const frame = this.#frame!;
    const value = fact(NativeRuntimePlatform.readProcessInputUnsigned(this.#platform, frame.input!, offset, width));
    frame.scanReads++; frame.lastRead = Object.freeze({ pc, offset, width, value }); this.#guard(); return value;
  }
  #getInput(pc: string, wide: boolean): NativeBytePointer | null {
    const operation = wide ? 'GetEnvironmentStringsW.return' : 'GetEnvironmentStrings.return';
    return this.#call(pc, operation, () => wide ? this.#endpoints.getEnvironmentStringsW() : this.#endpoints.getEnvironmentStrings(), value => {
      this.#frame!.input = value; this.#effect(pc, operation, value);
    });
  }
  #malloc(pc: string, bytes: number): NativeBytePointer | null {
    const frame = this.#frame!;
    const backing = this.#call(pc, 'mallocCrt2046838e.return', () => NativeModuleCrtOwner.prototype.mallocCrt.call(this.#crt, bytes), value => {
      frame.allocation = value; this.#effect(pc, 'mallocCrt2046838e.return', value);
    });
    if (backing === null) return null;
    const aliases = this.#platform.setEnvpEndpoints
      ? fact(NativeRuntimePlatform.canonicalGameHeapAllocationViewsForPlatform(this.#platform, this.#crt, backing))
      : null;
    if (aliases && aliases.requestedBytes !== bytes) throw new Error('Actual retained logical Game environment allocation span required');
    const fields = aliases?.logical ?? new NativeHeapObjectViews(backing); Object.freeze(fields);
    const pointer: NativeBytePointer = Object.freeze({ fields, offset: 0 });
    fact(NativeRuntimePlatform.canonicalGameHeapDestination(this.#platform, this.#crt, pointer, 0));
    frame.output = pointer; this.#guard(); return pointer;
  }
  #convert(pc: string, output: NativeBytePointer | null, outputBytes: number): number {
    const frame = this.#frame!;
    return dword(this.#call(pc, 'WideCharToMultiByte.return', () => this.#endpoints.wideCharToMultiByte(Object.freeze({
      codePage: 0, flags: 0, input: frame.input!, inputCharacters: frame.inputCharacters!, output, outputBytes,
      defaultCharacter: null, usedDefaultCharacter: null,
    })), value => {
      frame.conversionResult = value; this.#effect(pc, 'WideCharToMultiByte.return', value);
    }));
  }
  #release(pc: string, wide: boolean): void {
    const frame = this.#frame!, operation = wide ? 'FreeEnvironmentStringsW.return' : 'FreeEnvironmentStringsA.return';
    dword(this.#call(pc, operation, () => wide ? this.#endpoints.freeEnvironmentStringsW(frame.input!) : this.#endpoints.freeEnvironmentStringsA(frame.input!), value => {
      frame.releaseResult = value; this.#effect(pc, operation, value);
    }));
    // Original caller ignores the raw BOOL, including known0; only a returned
    // import permits continuation. No release occurs after an unknown call.
  }
  #finish(value: NativeBytePointer | null): NativeBytePointer | null {
    this.#pc('20476969'); this.#frame!.result = value; this.#frame!.phase = 'returned'; this.#phase = 'returned';
    this.#effect('20476969', 'crtGetEnvironmentStringsA.return', value); return value;
  }
  #wide(): NativeBytePointer | null {
    const frame = this.#frame!; frame.branch = 'wide';
    if (frame.input === null && this.#getInput('2047688b', true) === null) return this.#finish(null);
    frame.scanCursor = 0;
    if (this.#read('2047689a', 0, 2) !== 0) {
      for (;;) {
        do { frame.scanCursor += 2; } while (this.#read('204768a3', frame.scanCursor, 2) !== 0);
        frame.scanCursor += 2;
        if (this.#read('204768aa', frame.scanCursor, 2) === 0) break;
      }
    }
    // SUB/SAR/INC computes the explicit native character count. Empty input
    // reads its first NUL once and therefore supplies count1, not count2.
    frame.inputCharacters = ((frame.scanCursor | 0) >> 1) + 1;
    this.#effect('204768c2', 'inputCharacters.local.store', frame.inputCharacters);
    const bytes = this.#convert('204768c6', null, 0); frame.outputBytes = bytes;
    if (bytes !== 0) {
      const output = this.#malloc('204768cf', bytes);
      if (output !== null) {
        const converted = this.#convert('204768e8', output, bytes);
        if (converted === 0) {
          this.#call('204768f2', 'free20467c6a.return', () => NativeModuleCrtOwner.prototype.free.call(this.#crt, frame.allocation), () => {
            this.#effect('204768f2', 'free20467c6a.return', null);
          });
          this.#pc('204768f8'); frame.output = null; this.#effect('204768f8', 'output.local.store', null);
        }
      }
    }
    this.#release('20476901', true); return this.#finish(frame.output);
  }
  #ansi(): NativeBytePointer | null {
    const frame = this.#frame!; frame.branch = 'ansi';
    if (this.#getInput('20476913', false) === null) return this.#finish(null);
    frame.scanCursor = 0;
    if (this.#read('20476923', 0, 1) !== 0) {
      for (;;) {
        do { frame.scanCursor++; } while (this.#read('20476928', frame.scanCursor, 1) !== 0);
        frame.scanCursor++;
        if (this.#read('2047692d', frame.scanCursor, 1) === 0) break;
      }
    }
    frame.outputBytes = (frame.scanCursor + 1) >>> 0;
    const output = this.#malloc('20476937', frame.outputBytes);
    if (output === null) { this.#release('20476944', false); return this.#finish(null); }
    this.#call('20476952', 'memcpy20463ed0.return', () => NativeGameCrtByteCopy.copyForCrt(this.#copy, this.#crt, output, frame.input!, frame.outputBytes!), value => {
      this.#effect('20476952', 'memcpy20463ed0.return', value);
    });
    this.#release('2047695b', false); return this.#finish(output);
  }
  #capture(): NativeValue<NativeBytePointer | null> {
    if (this.#phase === 'blocked') return unknown(this.#boundary!);
    if (this.#phase === 'invoking') {
      this.#boundary = 'Reentrant Game environment capture interrupted the active native prefix'; this.#phase = 'blocked';
      if (this.#frame) { this.#frame.phase = 'blocked'; this.#frame.boundary = this.#boundary; }
      return unknown(this.#boundary);
    }
    const frame: EnvironmentFrame = { id: this.#frames.length + 1, phase: 'invoking', pc: '20476835', boundary: null,
      mode: null, branch: null, input: null, scanCursor: 0, scanReads: 0, lastRead: null, inputCharacters: null,
      outputBytes: null, allocation: null, output: null, conversionResult: null, releaseResult: null, result: null, effects: [] };
    this.#frames.push(frame); this.#frame = frame; this.#phase = 'invoking';
    try {
      admitGameEnvironmentSource(); this.#guard();
      let mode = this.#readMode('20476837');
      if (mode === 0) {
        if (this.#getInput('20476851', true) !== null) { this.#writeMode('20476859', 1); mode = 1; }
        else {
          const error = dword(this.#call('20476865', 'GetLastError.return', () => NativeRuntimePlatform.prototype.getWin32LastError.call(this.#platform), value => {
            this.#effect('20476865', 'GetLastError.return', value);
          }));
          if (error === 0x78) { mode = 2; this.#writeMode('20476872', mode); }
          else mode = this.#readMode('20476879');
        }
      }
      if (mode === 1) return known(this.#wide());
      if (mode === 0 || mode === 2) return known(this.#ansi());
      return known(this.#finish(null));
    } catch (error) {
      this.#boundary ??= reason(error); frame.boundary = this.#boundary; frame.phase = 'blocked'; this.#phase = 'blocked';
      return unknown(this.#boundary);
    }
  }

  snapshot() {
    return Object.freeze({ module: 'Game' as const, entry: '20476835', phase: this.#phase, boundary: this.#boundary,
      invocations: Object.freeze(this.#frames.map(frame => Object.freeze({ id: frame.id, phase: frame.phase, pc: frame.pc,
        boundary: frame.boundary, mode: frame.mode, branch: frame.branch, input: frame.input,
        scanCursor: frame.scanCursor, scanReads: frame.scanReads, lastRead: frame.lastRead,
        inputCharacters: frame.inputCharacters, outputBytes: frame.outputBytes, allocation: frame.allocation,
        output: frame.output, conversionResult: frame.conversionResult, releaseResult: frame.releaseResult,
        result: frame.result, effects: Object.freeze([...frame.effects]) }))),
      copy: this.#copy.snapshot(), invocationScope: 'active-runtime-platform' as const, drainInvocationOwned: false,
      wholeCrtTraversalCompleted: false, moduleAttachCompleted: false });
  }
}
