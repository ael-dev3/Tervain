/** Engine30671cf0 scalar memcpy. Every dispatched table word and transfer uses
 * current canonical storage; the SSE branch remains an explicit boundary.
 * This checkpoint admits invocations on an active platform. Calling this
 * source during atexit callback drain needs a later lifetime admission. */
import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeBytePointer, NativePointerGeometry } from './native-pointer-geometry';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { admitEngineByteCopySource, engineByteCopyImage, engineByteCopyInstruction } from './native-engine-byte-copy-source';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });
function reason(error: unknown): string {
  try { return error instanceof Error ? error.message : String(error); }
  catch { return 'Engine memcpy escaped without an owned error description'; }
}
function fact<T>(value: NativeValue<T>): T { if (!value.known) throw new Error(value.reason); return value.value; }

const token = Object.freeze({});
type Phase = 'cold' | 'invoking' | 'returned' | 'blocked';
interface Construction { phase: 'constructing' | 'returned' | 'blocked'; owner: NativeEngineCrtByteCopy | null; boundary: string | null; }
const owners = new WeakMap<NativeModuleCrtOwner, Construction>();
const imagePins = Object.freeze({
  sse2Flag: ['30af7e68', 4],
  forwardAlignment: ['30671d78', 16], forwardDwords: ['30671df8', 32],
  forwardTail: ['30671e64', 16], backwardAlignment: ['30671f04', 16],
  backwardDwords: ['30671f94', 32], backwardTail: ['30672000', 16],
} as const);
type ImageLabel = keyof typeof imagePins;
// Admit the source-derived targets of each indirect operand. The two index0
// instruction-tail/NOP words are storage, never selected code capabilities.
const tableTargets: Partial<Record<ImageLabel, readonly number[]>> = {
  forwardAlignment: [0x30671d88, 0x30671db4, 0x30671dd8],
  forwardDwords: [0x30671e5b, 0x30671e48, 0x30671e40, 0x30671e38, 0x30671e30, 0x30671e28, 0x30671e20, 0x30671e18],
  forwardTail: [0x30671e74, 0x30671e7c, 0x30671e88, 0x30671e9c],
  backwardAlignment: [0x30671f14, 0x30671f38, 0x30671f60],
  backwardDwords: [0x30671fb4, 0x30671fbc, 0x30671fc4, 0x30671fcc, 0x30671fd4, 0x30671fdc, 0x30671fe4, 0x30671ff7],
  backwardTail: [0x30672010, 0x30672018, 0x30672028, 0x3067203c],
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
export class NativeEngineCrtByteCopy {
  readonly #crt: NativeModuleCrtOwner;
  readonly #platform: NativeRuntimePlatform;
  readonly #images: Readonly<Record<ImageLabel, NativeHeapObjectViews>>;
  readonly #imageProofs=new Map<ImageLabel,Readonly<{fields:NativeHeapObjectViews;backing:NativeHeapObjectViews['backing'];bytes:Uint8Array;masks:Uint8Array;rootBytes:Uint8Array;rootMasks:Uint8Array;view:DataView}>>();
  #phase: Phase = 'cold';
  #boundary: string | null = null;
  #frame: CopyFrame | null = null;
  readonly #frames: CopyFrame[] = [];

  private constructor(crt: NativeModuleCrtOwner, constructionToken: object) {
    if (constructionToken !== token || new.target !== NativeEngineCrtByteCopy) throw new Error('Actual Engine memcpy construction required');
    admitEngineByteCopySource();
    this.#crt = crt; this.#platform = crt.host.platform as NativeRuntimePlatform;
    this.#requireCrt();
    const entries = Object.entries(imagePins).map(([label, [address, bytes]]) => {
      const receipt = engineByteCopyImage(label);
      if (receipt.address !== address || receipt.bytes !== bytes) throw new Error('Engine memcpy image receipt differs: ' + label);
      const raw=Uint8Array.from(receipt.raw.match(/../g)!,byte=>parseInt(byte,16));
      if(raw.length!==bytes)throw new Error('Original Engine memcpy image extent required');
      const fields=new NativeHeapObjectViews({identity:Object.freeze({crt:crt.identity,address}),bytes:raw,knownMask:new Uint8Array(bytes).fill(255),freed:false});Object.freeze(fields);
      this.#imageProofs.set(label as ImageLabel,Object.freeze({fields,backing:fields.backing,bytes:fields.bytes,masks:fields.knownMask,rootBytes:fields.backing.bytes,rootMasks:fields.backing.knownMask,view:fields.view}));
      return [label, fields] as const;
    });
    this.#images = Object.freeze(Object.fromEntries(entries)) as Readonly<Record<ImageLabel, NativeHeapObjectViews>>;
    Object.freeze(this);
  }

  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeEngineCrtByteCopy> {
    if (!NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Engine') return unknown('Actual constructed Engine CRT required for memcpy');
    const retained = owners.get(crt);
    if (retained) {
      if (retained.phase === 'constructing') { retained.phase = 'blocked'; retained.boundary = 'Reentrant Engine memcpy construction cannot restart'; }
      if (retained.phase !== 'returned') return unknown(retained.boundary!);
      try { retained.owner!.#requireCrt();for(const label of Object.keys(imagePins) as ImageLabel[])retained.owner!.#imageStorage(label);return known(retained.owner!); }
      catch (error) { return unknown(reason(error)); }
    }
    const entry: Construction = { phase: 'constructing', owner: null, boundary: null };
    owners.set(crt, entry);
    try {
      const owner = new NativeEngineCrtByteCopy(crt, token);
      if (entry.phase !== 'constructing') throw new Error(entry.boundary ?? 'Reentrant Engine memcpy construction');
      entry.owner = owner; entry.phase = 'returned'; return known(owner);
    } catch (error) { entry.phase = 'blocked'; entry.boundary = reason(error); return unknown(entry.boundary); }
  }

  static copyForCrt(owner: NativeEngineCrtByteCopy, crt: NativeModuleCrtOwner,
    destination: NativeBytePointer, input: NativeBytePointer, bytes: number): NativeValue<NativeBytePointer> {
    const retained = owners.get(crt);
    if (!owner || retained?.phase !== 'returned' || retained.owner !== owner || !NativeModuleCrtOwner.isConstructedOwner(crt) || owner.#crt !== crt) {
      return unknown('Actual retained same-CRT Engine memcpy owner required');
    }
    return owner.#invoke(destination, input, bytes);
  }
  static imageForCrt(owner:NativeEngineCrtByteCopy,crt:NativeModuleCrtOwner,label:ImageLabel):NativeValue<NativeHeapObjectViews>{
    try{const retained=owners.get(crt);if(retained?.phase!=='returned'||retained.owner!==owner||owner.#crt!==crt)throw new Error('Actual same-CRT Engine memcpy image owner required');
      owner.#requireCrt();return known(owner.#imageStorage(label));
    }catch(error){return unknown(reason(error));}
  }

  #requireCrt(): void {
    if (!NativeModuleCrtOwner.isConstructedOwner(this.#crt) || this.#crt.module !== 'Engine' || this.#crt.host.platform !== this.#platform) {
      throw new Error('Actual same-platform Engine CRT required');
    }
    fact(NativeRuntimePlatform.requireActivePlatform(this.#platform));
  }
  #guard(): void {
    this.#requireCrt();
    if (this.#phase !== 'invoking' || this.#frame?.phase !== 'invoking') throw new Error(this.#boundary ?? 'Engine memcpy invocation was interrupted');
  }
  #pc(pc: number | string): void { this.#frame!.pc = typeof pc === 'number' ? pc.toString(16) : pc;engineByteCopyInstruction(this.#frame!.pc);this.#guard(); }
  #imageStorage(label:ImageLabel):NativeHeapObjectViews{
    engineByteCopyImage(label);const proof=this.#imageProofs.get(label),fields=proof?.fields;
    if(!proof||!fields||this.#images[label]!==fields||fields.backing!==proof.backing||fields.backing.freed||fields.bytes!==proof.bytes||fields.knownMask!==proof.masks||fields.view!==proof.view||fields.backing.bytes!==proof.rootBytes||fields.backing.knownMask!==proof.rootMasks||fields.bytes.buffer!==proof.rootBytes.buffer||fields.bytes.byteOffset!==proof.rootBytes.byteOffset||fields.knownMask.buffer!==proof.rootMasks.buffer||fields.knownMask.byteOffset!==proof.rootMasks.byteOffset||fields.view.buffer!==fields.bytes.buffer||fields.view.byteOffset!==fields.bytes.byteOffset||fields.view.byteLength!==fields.bytes.length||fields.bytes.length!==imagePins[label][1])throw new Error('Original Engine memcpy image storage changed');
    return fields;
  }
  #image(label: ImageLabel): NativeHeapObjectViews {
    this.#guard();
    return this.#imageStorage(label);
  }
  #geometry(pointer: NativeBytePointer): NativePointerGeometry {
    this.#guard();
    return fact(NativeRuntimePlatform.prototype.resolveNativePointer.call(this.#platform, pointer));
  }
  #pin(pointer: NativeBytePointer): PointerProof {
    fact(NativeRuntimePlatform.canonicalNativePointerAccessForPlatform(this.#platform,pointer,0,0));
    const geometry = this.#geometry(pointer), fields = pointer.fields;
    return Object.freeze({ pointer, fields, backing: fields.backing, bytes: fields.bytes, masks: fields.knownMask,
      view: fields.view, pointerOffset: pointer.offset, geometry });
  }
  #requirePointer(proof: PointerProof): NativeHeapObjectViews {
    this.#guard();
    const fields = proof.fields;
    if (proof.pointer.fields !== fields || proof.pointer.offset !== proof.pointerOffset || fields.backing !== proof.backing ||
        fields.bytes !== proof.bytes || fields.knownMask !== proof.masks || fields.view !== proof.view) {
      throw new Error('Engine memcpy retained physical pointer/view changed');
    }
    const geometry = this.#geometry(proof.pointer);
    if (geometry.canonicalBacking !== proof.geometry.canonicalBacking || geometry.offset !== proof.geometry.offset ||
        geometry.allocationBegin !== proof.geometry.allocationBegin || geometry.allocationEnd !== proof.geometry.allocationEnd ||
        geometry.canonicalCapacity !== proof.geometry.canonicalCapacity) throw new Error('Engine memcpy canonical pointer geometry changed');
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
    if (!Number.isInteger(index) || index < 0 || index >= imagePins[label][1] / 4) throw new Error('Unowned Engine memcpy table selector');
    const fields = this.#image(label);
    const target = NativeHeapObjectViews.prototype.readUnsigned.call(fields, index * 4, 4);
    this.#image(label);
    this.#frame!.dispatches.push(Object.freeze({ pc: pc.toString(16), label, index, target: target.toString(16) }));
    if (!tableTargets[label]?.includes(target)) throw new Error('Current Engine memcpy indirect target has no admitted operand owner at' + pc.toString(16) + '->' + target.toString(16));
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
      this.#boundary = 'Reentrant Engine memcpy interrupted the active native prefix'; this.#phase = 'blocked';
      if (this.#frame) { this.#frame.phase = 'blocked'; this.#frame.boundary = this.#boundary; }
      return unknown(this.#boundary);
    }
    const frame: CopyFrame = { id: this.#frames.length + 1, destination, input, bytes, phase: 'invoking', pc: '30671cf0', boundary: null,
      direction: null, sourceCursor: 0, destinationCursor: 0, ecx: bytes, edx: bytes, source: null, target: null,
      loads: 0, stores: 0, bytesStored: 0, loaded: null, lastStore: null, dispatches: [], directionFlag: null };
    this.#frames.push(frame); this.#frame = frame; this.#phase = 'invoking';
    try {
      admitEngineByteCopySource(); this.#guard();
      if (!Number.isInteger(bytes) || bytes < 0 || bytes > 0xffffffff) throw new Error('Engine memcpy requires actual uint32 size');
      frame.source = this.#pin(input); frame.target = this.#pin(destination);
      const source = frame.source.geometry, target = frame.target.geometry;
      this.#pc(0x30671d04);
      if (source.canonicalBacking === target.canonicalBacking) {
        if (source.offset + bytes > source.canonicalCapacity) throw new Error('Engine memcpy source addition has no owned canonical address-span proof');
        frame.direction = source.offset < target.offset && target.offset < source.offset + bytes ? 'backward' : 'forward';
      } else {
        if (source.offset + bytes > source.allocationEnd || target.offset + bytes > target.allocationEnd) throw new Error('Engine memcpy distinct-root spans lack native nonoverlap proof');
        frame.direction = 'forward';
      }
      let pc: number;
      if (frame.direction === 'forward') {
        this.#pc(0x30671d10);
        if (bytes >= 256) {
          this.#pc(0x30671d18);
          const fields = this.#image('sse2Flag');
          const cpu = NativeHeapObjectViews.prototype.readUnsigned.call(fields, 0, 4);
          this.#image('sse2Flag');
          if (cpu !== 0) {
            this.#pc(0x30671d23);
            // Different low two bits prove unequal low four bits. Equal low
            // two bits cannot supply the native AND0xf/vector placement fact.
            if (source.modulo4 === target.modulo4) throw new Error('Engine memcpy30671d23 requires actual modulo16/vector owner for tail JMP30671d32->3067fda9');
          }
        }
        const residue = target.modulo4;
        this.#pc(0x30671d37);
        if (residue === 0) {
          frame.ecx = bytes >>> 2; frame.edx = bytes & 3;
          if (frame.ecx >= 8) { this.#rep(0x30671d4a); pc = this.#dispatch(0x30671d4c, 'forwardTail', frame.edx); }
          else pc = this.#dispatch(0x30671d74, 'forwardDwords', frame.ecx);
        } else if (bytes < 4) {
          frame.ecx = (bytes - 4) >>> 0;
          // Operand30671e74+(n-4)*4 aliases actual30671e64+n*4.
          pc = this.#dispatch(0x30671d6c, 'forwardTail', bytes);
        } else {
          frame.ecx = (bytes - 4 + residue) >>> 0; frame.edx = 3;
          pc = this.#dispatch(0x30671d65, 'forwardAlignment', residue);
        }
      } else {
        this.#pc(0x30671eb4); frame.sourceCursor = bytes - 4; frame.destinationCursor = bytes - 4;
        const residue = (target.modulo4 + bytes - 4) & 3;
        this.#pc(0x30671ebc);
        if (residue === 0) {
          frame.ecx = bytes >>> 2; frame.edx = bytes & 3;
          if (frame.ecx >= 8) {
            this.#df(0x30671ecf, 1); this.#rep(0x30671ed0); this.#df(0x30671ed2, 0);
            pc = this.#dispatch(0x30671ed3, 'backwardTail', frame.edx);
          } else {
            frame.ecx = -frame.ecx;
            pc = this.#dispatch(0x30671ede, 'backwardDwords', 7 + frame.ecx);
          }
        } else if (bytes < 4) pc = this.#dispatch(0x30671f00, 'backwardTail', bytes);
        else {
          frame.ecx = bytes - residue; frame.edx = 3;
          pc = this.#dispatch(0x30671ef9, 'backwardAlignment', residue);
        }
      }
      for (;;) {
        this.#pc(pc);
        if (pc === 0x30671d88 || pc === 0x30671db4 || pc === 0x30671dd8) {
          const peel = pc === 0x30671d88 ? 3 : pc === 0x30671db4 ? 2 : 1;
          const pairs = peel === 3 ? [[0x30671d8a, 0x30671d8c], [0x30671d8e, 0x30671d91], [0x30671d94, 0x30671d9a]] :
            peel === 2 ? [[0x30671db6, 0x30671db8], [0x30671dba, 0x30671dc0]] : [[0x30671dda, 0x30671ddc]];
          frame.edx &= frame.ecx;
          for (let i = 0; i < peel; i++) {
            this.#load(pairs[i]![0]!, frame.sourceCursor + i, 1);
            if (i === peel - 1 && peel !== 1) frame.ecx >>>= 2;
            this.#store(pairs[i]![1]!, frame.destinationCursor + i);
          }
          if (peel === 1) frame.ecx >>>= 2;
          frame.sourceCursor += peel; frame.destinationCursor += peel;
          if (frame.ecx >= 8) {
            const rep = peel === 3 ? 0x30671da8 : peel === 2 ? 0x30671dce : 0x30671dec;
            this.#rep(rep); pc = this.#dispatch(rep + 2, 'forwardTail', frame.edx);
          } else pc = this.#dispatch(0x30671d74, 'forwardDwords', frame.ecx);
        } else if (pc >= 0x30671e18 && pc <= 0x30671e48 && (pc - 0x30671e18) % 8 === 0) {
          for (let load = pc; load <= 0x30671e48; load += 8) {
            const displacement = -28 + (load - 0x30671e18) / 8 * 4;
            this.#transfer(load, load + 4, frame.sourceCursor + frame.ecx * 4 + displacement,
              frame.destinationCursor + frame.ecx * 4 + displacement, 4);
          }
          frame.sourceCursor += frame.ecx * 4; frame.destinationCursor += frame.ecx * 4;
          pc = this.#dispatch(0x30671e5b, 'forwardTail', frame.edx);
        } else if (pc === 0x30671e5b) pc = this.#dispatch(pc, 'forwardTail', frame.edx);
        else if (pc === 0x30671f14 || pc === 0x30671f38 || pc === 0x30671f60) {
          const peel = pc === 0x30671f14 ? 1 : pc === 0x30671f38 ? 2 : 3;
          const pairs = peel === 1 ? [[0x30671f14, 0x30671f19]] : peel === 2 ?
            [[0x30671f38, 0x30671f3d], [0x30671f40, 0x30671f46]] :
            [[0x30671f60, 0x30671f65], [0x30671f68, 0x30671f6b], [0x30671f6e, 0x30671f74]];
          for (let i = 0; i < peel; i++) {
            this.#load(pairs[i]![0]!, frame.sourceCursor + 3 - i, 1);
            if (i === 0) frame.edx &= frame.ecx;
            if (i === peel - 1 && peel !== 1) frame.ecx >>>= 2;
            this.#store(pairs[i]![1]!, frame.destinationCursor + 3 - i);
          }
          if (peel === 1) frame.ecx >>>= 2;
          frame.sourceCursor -= peel; frame.destinationCursor -= peel;
          if (frame.ecx >= 8) {
            const std = peel === 1 ? 0x30671f2a : peel === 2 ? 0x30671f54 : 0x30671f86;
            this.#df(std, 1); this.#rep(std + 1); this.#df(std + 3, 0);
            pc = this.#dispatch(std + 4, 'backwardTail', frame.edx);
          } else {
            frame.ecx = -frame.ecx;
            pc = this.#dispatch(0x30671ede, 'backwardDwords', 7 + frame.ecx);
          }
        } else if (pc >= 0x30671fb4 && pc <= 0x30671fe4 && (pc - 0x30671fb4) % 8 === 0) {
          for (let load = pc; load <= 0x30671fe4; load += 8) {
            const displacement = 28 - (load - 0x30671fb4) / 8 * 4;
            this.#transfer(load, load + 4, frame.sourceCursor + frame.ecx * 4 + displacement,
              frame.destinationCursor + frame.ecx * 4 + displacement, 4);
          }
          frame.sourceCursor += frame.ecx * 4; frame.destinationCursor += frame.ecx * 4;
          pc = this.#dispatch(0x30671ff7, 'backwardTail', frame.edx);
        } else if (pc === 0x30671ff7) pc = this.#dispatch(pc, 'backwardTail', frame.edx);
        else {
          const tails: Record<number, readonly [readonly (readonly [number, number])[], number, boolean]> = {
            0x30671e74: [[], 0x30671e7a, false], 0x30671e7c: [[[0x30671e7c, 0x30671e7e]], 0x30671e86, false],
            0x30671e88: [[[0x30671e88, 0x30671e8a], [0x30671e8c, 0x30671e8f]], 0x30671e98, false],
            0x30671e9c: [[[0x30671e9c, 0x30671e9e], [0x30671ea0, 0x30671ea3], [0x30671ea6, 0x30671ea9]], 0x30671eb2, false],
            0x30672010: [[], 0x30672016, true], 0x30672018: [[[0x30672018, 0x3067201b]], 0x30672024, true],
            0x30672028: [[[0x30672028, 0x3067202b], [0x3067202e, 0x30672031]], 0x3067203a, true],
            0x3067203c: [[[0x3067203c, 0x3067203f], [0x30672042, 0x30672045], [0x30672048, 0x3067204b]], 0x30672054, true],
          };
          const tail = tails[pc];
          if (!tail) throw new Error('Current Engine memcpy table target has no selected scalar owner at' + pc.toString(16));
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
    return Object.freeze({ module: 'Engine' as const, entry: '30671cf0', phase: this.#phase, boundary: this.#boundary,
      invocations: Object.freeze(this.#frames.map(frame => Object.freeze({ id: frame.id, phase: frame.phase, pc: frame.pc,
        boundary: frame.boundary, bytes: frame.bytes, input: frame.input, destination: frame.destination, direction: frame.direction,
        sourceCursor: frame.sourceCursor, destinationCursor: frame.destinationCursor, ecx: frame.ecx, edx: frame.edx,
        loads: frame.loads, stores: frame.stores, bytesStored: frame.bytesStored, loaded: frame.loaded, lastStore: frame.lastStore,
        dispatches: Object.freeze([...frame.dispatches]), directionFlag: frame.directionFlag }))),
      invocationScope: 'active-runtime-platform' as const, drainInvocationOwned: false,
      vectorExecuted: false, wholeCrtTraversalCompleted: false, moduleAttachCompleted: false });
  }
}
