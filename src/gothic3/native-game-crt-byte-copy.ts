/** Game20463ed0 scalar memcpy. Every dispatched table word and transfer uses
 * current canonical storage; the SSE branch remains an explicit boundary.
 * This checkpoint admits invocations on an active platform. Calling this
 * source during atexit callback drain needs a later lifetime admission. */
import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeBytePointer, NativePointerGeometry } from './native-pointer-geometry';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { admitGameEnvironmentSource, gameContinuationImageReceipt } from './native-game-crt-attach-source';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Game memcpy escaped without an owned error description'; }
}
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }

const token = Object.freeze({});
type Phase = 'cold' | 'invoking' | 'returned' | 'blocked';
interface Construction { phase: 'constructing' | 'returned' | 'blocked'; owner: NativeGameCrtByteCopy | null; boundary: string | null; }
const owners = new WeakMap<NativeModuleCrtOwner, Construction>();
const imagePins = Object.freeze({
  sse2Flag207d2b50: ['207d2b50', 4],
  memcpyForwardAlignment: ['20463f58', 16], memcpyForwardDwords: ['20463fd8', 32],
  memcpyForwardTail: ['20464044', 16], memcpyBackwardAlignment: ['204640e4', 16],
  memcpyBackwardDwords: ['20464174', 32], memcpyBackwardTail: ['204641e0', 16],
} as const);
type ImageLabel = keyof typeof imagePins;
// Admit the source-derived targets of each indirect operand. The two index0
// instruction-tail/NOP words are storage, never selected code capabilities.
const tableTargets: Partial<Record<ImageLabel, readonly number[]>> = {
  memcpyForwardAlignment: [0x20463f68, 0x20463f94, 0x20463fb8],
  memcpyForwardDwords: [0x2046403b, 0x20464028, 0x20464020, 0x20464018, 0x20464010, 0x20464008, 0x20464000, 0x20463ff8],
  memcpyForwardTail: [0x20464054, 0x2046405c, 0x20464068, 0x2046407c],
  memcpyBackwardAlignment: [0x204640f4, 0x20464118, 0x20464140],
  memcpyBackwardDwords: [0x20464194, 0x2046419c, 0x204641a4, 0x204641ac, 0x204641b4, 0x204641bc, 0x204641c4, 0x204641d7],
  memcpyBackwardTail: [0x204641f0, 0x204641f8, 0x20464208, 0x2046421c],
};
interface PointerProof {
  readonly pointer: NativeBytePointer; readonly fields: NativeHeapObjectViews;
  readonly backing: NativeHeapObjectViews['backing']; readonly bytes: Uint8Array;
  readonly masks: Uint8Array; readonly view: DataView; readonly pointerOffset: number;
  readonly geometry: NativePointerGeometry;
}
interface CopyFrame {
  readonly id: number; readonly destination: NativeBytePointer; readonly input: NativeBytePointer; readonly bytes: number;
  phase: Phase; pc: string; boundary: string | null; direction: 'forward' | 'backward' | null;
  sourceCursor: number; destinationCursor: number; ecx: number; edx: number;
  source: PointerProof | null; target: PointerProof | null;
  loads: number; stores: number; bytesStored: number;
  loaded: Readonly<{ pc: string; offset: number; width: 1 | 4; value: number; mask: number }> | null;
  lastStore: Readonly<{ pc: string; offset: number; width: 1 | 4 }> | null;
  readonly dispatches: Readonly<{ pc: string; label: ImageLabel; index: number; target: string }>[];
  directionFlag: 0 | 1 | null;
}

/** Constructor and static invocation authority are private per actual CRT.
 * Completed calls permit fresh frames; a failed frame is never replayed. */
export class NativeGameCrtByteCopy {
  readonly #crt: NativeModuleCrtOwner;
  readonly #platform: NativeRuntimePlatform;
  readonly #images: Readonly<Record<ImageLabel, NativeHeapObjectViews>>;
  #phase: Phase = 'cold';
  #boundary: string | null = null;
  #frame: CopyFrame | null = null;
  readonly #frames: CopyFrame[] = [];

  private constructor(crt: NativeModuleCrtOwner, constructionToken: object) {
    if (constructionToken !== token || new.target !== NativeGameCrtByteCopy) throw new Error('Actual Game memcpy construction required');
    admitGameEnvironmentSource();
    this.#crt = crt; this.#platform = crt.host.platform as NativeRuntimePlatform;
    this.#requireCrt();
    const entries = Object.entries(imagePins).map(([label, [address, bytes]]) => {
      const receipt = gameContinuationImageReceipt(label);
      if (receipt.module !== 'Game' || receipt.address !== address || receipt.bytes !== bytes) throw new Error('Game memcpy image receipt differs: ' + label);
      return [label, fact(NativeModuleCrtOwner.canonicalImageForOwner(crt, label))] as const;
    });
    this.#images = Object.freeze(Object.fromEntries(entries)) as Readonly<Record<ImageLabel, NativeHeapObjectViews>>;
    Object.freeze(this);
  }

  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeGameCrtByteCopy> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Game') return unknown('Actual constructed Game CRT required for memcpy');
    const retained = owners.get(crt);
    if (retained) {
      if (retained.phase === 'constructing') { retained.phase = 'blocked'; retained.boundary = 'Reentrant Game memcpy construction cannot restart'; }
      if (retained.phase !== 'returned') return unknown(retained.boundary!);
      try { retained.owner!.#requireCrt(); return known(retained.owner!); }
      catch (error) { return unknown(reason(error)); }
    }
    const entry: Construction = { phase: 'constructing', owner: null, boundary: null };
    owners.set(crt, entry);
    try {
      const owner = new NativeGameCrtByteCopy(crt, token);
      if (entry.phase !== 'constructing') throw new Error(entry.boundary ?? 'Reentrant Game memcpy construction');
      entry.owner = owner; entry.phase = 'returned'; return known(owner);
    } catch (error) { entry.phase = 'blocked'; entry.boundary = reason(error); return unknown(entry.boundary); }
  }

  static copyForCrt(owner: NativeGameCrtByteCopy, crt: NativeModuleCrtOwner,
    destination: NativeBytePointer, input: NativeBytePointer, bytes: number): NativeValue<NativeBytePointer> {
    const retained = owners.get(crt);
    if (!owner || retained?.phase !== 'returned' || retained.owner !== owner || !NativeModuleCrtOwner.isConstructedOwner(crt) || owner.#crt !== crt) {
      return unknown('Actual retained same-CRT Game memcpy owner required');
    }
    return owner.#invoke(destination, input, bytes);
  }

  #requireCrt(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.#crt.module !== 'Game' || this.#crt.host.platform !== this.#platform) {
      throw new Error('Actual same-platform Game CRT required');
    }
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
  }
  #guard(): void {
    this.#requireCrt();
    if (this.#phase !== 'invoking' || this.#frame?.phase !== 'invoking') throw new Error(this.#boundary ?? 'Game memcpy invocation was interrupted');
  }
  #pc(pc: number | string): void { this.#frame!.pc = typeof pc === 'number' ? pc.toString(16) : pc; this.#guard(); }
  #image(label: ImageLabel): NativeHeapObjectViews {
    this.#guard();
    const fields = fact(NativeModuleCrtOwner.canonicalImageForOwner(this.#crt, label));
    if (fields !== this.#images[label] || fields.bytes.length !== imagePins[label][1]) throw new Error('Retained canonical Game memcpy image differs: ' + label);
    return fields;
  }
  #geometry(pointer: NativeBytePointer): NativePointerGeometry {
    this.#guard();
    return fact(NativeRuntimePlatform.prototype.resolveNativePointer.call(this.#platform, pointer));
  }
  #pin(pointer: NativeBytePointer): PointerProof {
    const geometry = this.#geometry(pointer), fields = pointer.fields;
    return Object.freeze({ pointer, fields, backing: fields.backing, bytes: fields.bytes, masks: fields.knownMask,
      view: fields.view, pointerOffset: pointer.offset, geometry });
  }
  #requirePointer(proof: PointerProof): NativeHeapObjectViews {
    this.#guard();
    const fields = proof.fields;
    if (proof.pointer.fields !== fields || proof.pointer.offset !== proof.pointerOffset || fields.backing !== proof.backing ||
        fields.bytes !== proof.bytes || fields.knownMask !== proof.masks || fields.view !== proof.view) {
      throw new Error('Game memcpy retained physical pointer/view changed');
    }
    const geometry = this.#geometry(proof.pointer);
    if (geometry.canonicalBacking !== proof.geometry.canonicalBacking || geometry.offset !== proof.geometry.offset ||
        geometry.allocationBegin !== proof.geometry.allocationBegin || geometry.allocationEnd !== proof.geometry.allocationEnd ||
        geometry.canonicalCapacity !== proof.geometry.canonicalCapacity) throw new Error('Game memcpy canonical pointer geometry changed');
    return fields;
  }
  #access(proof: PointerProof, offset: number, width: 1 | 4): NativeHeapObjectViews {
    const fields = this.#requirePointer(proof);
    fact(NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(this.#platform, proof.pointer, offset, width));
    return fields;
  }
  #load(pc: number, offset: number, width: 1 | 4): void {
    this.#pc(pc); const frame = this.#frame!, fields = this.#access(frame.source!, offset, width);
    const word = NativeHeapObjectViews.prototype.maskedWord.call(fields, frame.input.offset + offset, width);
    const value = word.value, mask = word.knownMask;
    frame.loaded = Object.freeze({ pc: frame.pc, offset, width, value, mask }); frame.loads++;
    this.#guard();
  }
  #store(pc: number, offset: number): void {
    this.#pc(pc); const frame = this.#frame!, loaded = frame.loaded!;
    const fields = this.#access(frame.target!, offset, loaded.width);
    const word = NativeHeapObjectViews.prototype.maskedWord.call(fields, frame.destination.offset + offset, loaded.width);
    word.value = loaded.value; word.knownMask = loaded.mask;
    frame.lastStore = Object.freeze({ pc: frame.pc, offset, width: loaded.width });
    frame.stores++; frame.bytesStored += loaded.width; this.#guard();
  }
  #transfer(loadPc: number, storePc: number, sourceOffset: number, destinationOffset: number, width: 1 | 4): void {
    this.#load(loadPc, sourceOffset, width); this.#store(storePc, destinationOffset);
  }
  #dispatch(pc: number, label: ImageLabel, index: number): number {
    this.#pc(pc);
    if (!Number.isInteger(index) || index < 0 || index >= imagePins[label][1] / 4) throw new Error('Unowned Game memcpy table selector');
    const fields = this.#image(label);
    fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, this.#crt, label, index * 4, 4));
    const target = NativeHeapObjectViews.prototype.readUnsigned.call(fields, index * 4, 4);
    this.#image(label);
    this.#frame!.dispatches.push(Object.freeze({ pc: pc.toString(16), label, index, target: target.toString(16) }));
    if (!tableTargets[label]?.includes(target)) throw new Error('Current Game memcpy indirect target has no admitted operand owner at' + pc.toString(16) + '->' + target.toString(16));
    return target;
  }
  #df(pc: number, value: 0 | 1): void {
    this.#pc(pc); fact(NativeRuntimePlatform.writeNativeDirectionFlag(this.#platform, value));
    this.#frame!.directionFlag = value; this.#guard();
  }
  #rep(pc: number): void {
    this.#pc(pc); const frame = this.#frame!;
    const df = fact(NativeRuntimePlatform.readNativeDirectionFlag(this.#platform)); frame.directionFlag = df;
    while (frame.ecx !== 0) {
      this.#transfer(pc, pc, frame.sourceCursor, frame.destinationCursor, 4);
      frame.sourceCursor += df === 0 ? 4 : -4; frame.destinationCursor += df === 0 ? 4 : -4; frame.ecx--;
    }
  }

  #invoke(destination: NativeBytePointer, input: NativeBytePointer, bytes: number): NativeValue<NativeBytePointer> {
    if (this.#phase === 'blocked') return unknown(this.#boundary!);
    if (this.#phase === 'invoking') {
      this.#boundary = 'Reentrant Game memcpy interrupted the active native prefix'; this.#phase = 'blocked';
      if (this.#frame) { this.#frame.phase = 'blocked'; this.#frame.boundary = this.#boundary; }
      return unknown(this.#boundary);
    }
    const frame: CopyFrame = { id: this.#frames.length + 1, destination, input, bytes, phase: 'invoking', pc: '20463ed0', boundary: null,
      direction: null, sourceCursor: 0, destinationCursor: 0, ecx: bytes, edx: bytes, source: null, target: null,
      loads: 0, stores: 0, bytesStored: 0, loaded: null, lastStore: null, dispatches: [], directionFlag: null };
    this.#frames.push(frame); this.#frame = frame; this.#phase = 'invoking';
    try {
      admitGameEnvironmentSource(); this.#guard();
      if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) throw new Error('Game memcpy requires actual uint32 size');
      frame.source = this.#pin(input); frame.target = this.#pin(destination);
      const source = frame.source.geometry, target = frame.target.geometry;
      this.#pc(0x20463ee4);
      if (source.canonicalBacking === target.canonicalBacking) {
        if (source.offset + bytes > source.canonicalCapacity) throw new Error('Game memcpy source addition has no owned canonical address-span proof');
        frame.direction = source.offset < target.offset && target.offset < source.offset + bytes ? 'backward' : 'forward';
      } else {
        if (source.offset + bytes > source.allocationEnd || target.offset + bytes > target.allocationEnd) throw new Error('Game memcpy distinct-root spans lack native nonoverlap proof');
        frame.direction = 'forward';
      }
      let pc: number;
      if (frame.direction === 'forward') {
        this.#pc(0x20463ef0);
        if (bytes >= 256) {
          this.#pc(0x20463ef8);
          const fields = this.#image('sse2Flag207d2b50');
          fact(NativeRuntimePlatform.canonicalGameModuleImageAccessForPlatform(this.#platform, this.#crt, 'sse2Flag207d2b50', 0, 4));
          const cpu = NativeHeapObjectViews.prototype.readUnsigned.call(fields, 0, 4);
          this.#image('sse2Flag207d2b50');
          if (cpu !== 0) {
            this.#pc(0x20463f03);
            // Different low two bits prove unequal low four bits. Equal low
            // two bits cannot supply the native AND0xf/vector placement fact.
            if (source.modulo4 === target.modulo4) throw new Error('Game memcpy20463f03 requires actual modulo16/vector owner for tail JMP20463f12->20469fe9');
          }
        }
        const residue = target.modulo4;
        this.#pc(0x20463f17);
        if (residue === 0) {
          frame.ecx = bytes >>> 2; frame.edx = bytes & 3;
          if (frame.ecx >= 8) { this.#rep(0x20463f2a); pc = this.#dispatch(0x20463f2c, 'memcpyForwardTail', frame.edx); }
          else pc = this.#dispatch(0x20463f54, 'memcpyForwardDwords', frame.ecx);
        } else if (bytes < 4) {
          frame.ecx = (bytes - 4) >>> 0;
          // Operand20464054+(n-4)*4 aliases actual20464044+n*4.
          pc = this.#dispatch(0x20463f4c, 'memcpyForwardTail', bytes);
        } else {
          frame.ecx = (bytes - 4 + residue) >>> 0; frame.edx = 3;
          pc = this.#dispatch(0x20463f45, 'memcpyForwardAlignment', residue);
        }
      } else {
        this.#pc(0x20464094); frame.sourceCursor = bytes - 4; frame.destinationCursor = bytes - 4;
        const residue = (target.modulo4 + bytes - 4) & 3;
        this.#pc(0x2046409c);
        if (residue === 0) {
          frame.ecx = bytes >>> 2; frame.edx = bytes & 3;
          if (frame.ecx >= 8) {
            this.#df(0x204640af, 1); this.#rep(0x204640b0); this.#df(0x204640b2, 0);
            pc = this.#dispatch(0x204640b3, 'memcpyBackwardTail', frame.edx);
          } else {
            frame.ecx = -frame.ecx;
            pc = this.#dispatch(0x204640be, 'memcpyBackwardDwords', 7 + frame.ecx);
          }
        } else if (bytes < 4) pc = this.#dispatch(0x204640e0, 'memcpyBackwardTail', bytes);
        else {
          frame.ecx = bytes - residue; frame.edx = 3;
          pc = this.#dispatch(0x204640d9, 'memcpyBackwardAlignment', residue);
        }
      }
      for (;;) {
        this.#pc(pc);
        if (pc === 0x20463f68 || pc === 0x20463f94 || pc === 0x20463fb8) {
          const peel = pc === 0x20463f68 ? 3 : pc === 0x20463f94 ? 2 : 1;
          const pairs = peel === 3 ? [[0x20463f6a, 0x20463f6c], [0x20463f6e, 0x20463f71], [0x20463f74, 0x20463f7a]] :
            peel === 2 ? [[0x20463f96, 0x20463f98], [0x20463f9a, 0x20463fa0]] : [[0x20463fba, 0x20463fbc]];
          frame.edx &= frame.ecx;
          for (let i = 0; i < peel; i++) {
            this.#load(pairs[i]![0]!, frame.sourceCursor + i, 1);
            if (i === peel - 1 && peel !== 1) frame.ecx >>>= 2;
            this.#store(pairs[i]![1]!, frame.destinationCursor + i);
          }
          if (peel === 1) frame.ecx >>>= 2;
          frame.sourceCursor += peel; frame.destinationCursor += peel;
          if (frame.ecx >= 8) {
            const rep = peel === 3 ? 0x20463f88 : peel === 2 ? 0x20463fae : 0x20463fcc;
            this.#rep(rep); pc = this.#dispatch(rep + 2, 'memcpyForwardTail', frame.edx);
          } else pc = this.#dispatch(0x20463f54, 'memcpyForwardDwords', frame.ecx);
        } else if (pc >= 0x20463ff8 && pc <= 0x20464028 && (pc - 0x20463ff8) % 8 === 0) {
          for (let load = pc; load <= 0x20464028; load += 8) {
            const displacement = -28 + (load - 0x20463ff8) / 8 * 4;
            this.#transfer(load, load + 4, frame.sourceCursor + frame.ecx * 4 + displacement,
              frame.destinationCursor + frame.ecx * 4 + displacement, 4);
          }
          frame.sourceCursor += frame.ecx * 4; frame.destinationCursor += frame.ecx * 4;
          pc = this.#dispatch(0x2046403b, 'memcpyForwardTail', frame.edx);
        } else if (pc === 0x2046403b) pc = this.#dispatch(pc, 'memcpyForwardTail', frame.edx);
        else if (pc === 0x204640f4 || pc === 0x20464118 || pc === 0x20464140) {
          const peel = pc === 0x204640f4 ? 1 : pc === 0x20464118 ? 2 : 3;
          const pairs = peel === 1 ? [[0x204640f4, 0x204640f9]] : peel === 2 ?
            [[0x20464118, 0x2046411d], [0x20464120, 0x20464126]] :
            [[0x20464140, 0x20464145], [0x20464148, 0x2046414b], [0x2046414e, 0x20464154]];
          for (let i = 0; i < peel; i++) {
            this.#load(pairs[i]![0]!, frame.sourceCursor + 3 - i, 1);
            if (i === 0) frame.edx &= frame.ecx;
            if (i === peel - 1 && peel !== 1) frame.ecx >>>= 2;
            this.#store(pairs[i]![1]!, frame.destinationCursor + 3 - i);
          }
          if (peel === 1) frame.ecx >>>= 2;
          frame.sourceCursor -= peel; frame.destinationCursor -= peel;
          if (frame.ecx >= 8) {
            const std = peel === 1 ? 0x2046410a : peel === 2 ? 0x20464134 : 0x20464166;
            this.#df(std, 1); this.#rep(std + 1); this.#df(std + 3, 0);
            pc = this.#dispatch(std + 4, 'memcpyBackwardTail', frame.edx);
          } else {
            frame.ecx = -frame.ecx;
            pc = this.#dispatch(0x204640be, 'memcpyBackwardDwords', 7 + frame.ecx);
          }
        } else if (pc >= 0x20464194 && pc <= 0x204641c4 && (pc - 0x20464194) % 8 === 0) {
          for (let load = pc; load <= 0x204641c4; load += 8) {
            const displacement = 28 - (load - 0x20464194) / 8 * 4;
            this.#transfer(load, load + 4, frame.sourceCursor + frame.ecx * 4 + displacement,
              frame.destinationCursor + frame.ecx * 4 + displacement, 4);
          }
          frame.sourceCursor += frame.ecx * 4; frame.destinationCursor += frame.ecx * 4;
          pc = this.#dispatch(0x204641d7, 'memcpyBackwardTail', frame.edx);
        } else if (pc === 0x204641d7) pc = this.#dispatch(pc, 'memcpyBackwardTail', frame.edx);
        else {
          const tails: Record<number, readonly [readonly (readonly [number, number])[], number, boolean]> = {
            0x20464054: [[], 0x2046405a, false], 0x2046405c: [[[0x2046405c, 0x2046405e]], 0x20464066, false],
            0x20464068: [[[0x20464068, 0x2046406a], [0x2046406c, 0x2046406f]], 0x20464078, false],
            0x2046407c: [[[0x2046407c, 0x2046407e], [0x20464080, 0x20464083], [0x20464086, 0x20464089]], 0x20464092, false],
            0x204641f0: [[], 0x204641f6, true], 0x204641f8: [[[0x204641f8, 0x204641fb]], 0x20464204, true],
            0x20464208: [[[0x20464208, 0x2046420b], [0x2046420e, 0x20464211]], 0x2046421a, true],
            0x2046421c: [[[0x2046421c, 0x2046421f], [0x20464222, 0x20464225], [0x20464228, 0x2046422b]], 0x20464234, true],
          };
          const tail = tails[pc];
          if (!tail) throw new Error('Current Game memcpy table target has no selected scalar owner at' + pc.toString(16));
          for (let i = 0; i < tail[0].length; i++) {
            const pair = tail[0][i]!, delta = tail[2] ? 3 - i : i;
            this.#transfer(pair[0], pair[1], frame.sourceCursor + delta, frame.destinationCursor + delta, 1);
          }
          this.#pc(tail[1]); this.#requirePointer(frame.source!); this.#requirePointer(frame.target!);
          frame.phase = 'returned'; this.#phase = 'returned'; return known(destination);
        }
      }
    } catch (error) {
      this.#boundary ??= reason(error); frame.boundary = this.#boundary; frame.phase = 'blocked'; this.#phase = 'blocked';
      return unknown(this.#boundary);
    }
  }

  snapshot() {
    return Object.freeze({ module: 'Game' as const, entry: '20463ed0', phase: this.#phase, boundary: this.#boundary,
      invocations: Object.freeze(this.#frames.map(frame => Object.freeze({ id: frame.id, phase: frame.phase, pc: frame.pc,
        boundary: frame.boundary, bytes: frame.bytes, input: frame.input, destination: frame.destination, direction: frame.direction,
        sourceCursor: frame.sourceCursor, destinationCursor: frame.destinationCursor, ecx: frame.ecx, edx: frame.edx,
        loads: frame.loads, stores: frame.stores, bytesStored: frame.bytesStored, loaded: frame.loaded, lastStore: frame.lastStore,
        dispatches: Object.freeze([...frame.dispatches]), directionFlag: frame.directionFlag }))),
      invocationScope: 'active-runtime-platform' as const, drainInvocationOwned: false,
      vectorExecuted: false, wholeCrtTraversalCompleted: false, moduleAttachCompleted: false });
  }
}
