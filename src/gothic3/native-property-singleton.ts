/** SharedBase 10090750 lazy getter over its canonical image and retained heap.
 * This support owner is not a live Game initializer dispatch grant. */
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeMemoryAdmin } from './native-memory-admin';
import { NativeSharedModuleImage } from './native-shared-module-image';
import type { NativeSharedPropertySingletonRanges } from './native-shared-module-image';
import { NativePropertySingletonConstruction } from './native-property-singleton-construction';
import { admitPropertySingletonGetter, admittedPropertySingletonExit } from './native-property-singleton-profile';
import type { NativeHeapObjectViews } from './native-heap-views';
import type { NativePropertyTypeTable } from './native-property-type-table';
import type { NativeValue } from './dialogue';

function fact<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
const constructionToken = Object.freeze({});
interface ExitProof { readonly platform: NativeRuntimePlatform; readonly owner: object; ready: boolean; consumed: boolean }
const exitProofs = new WeakMap<() => NativeValue<void>, ExitProof>();
/** RuntimePlatform admission for the actual getter-created callback window. */
export function admittedPropertySingletonCallback(address: string, platform: NativeRuntimePlatform,
  owner: object, callback: () => NativeValue<void>): boolean {
  const proof = exitProofs.get(callback);
  if (!admittedPropertySingletonExit(address) || !proof || proof.platform !== platform || proof.owner !== owner ||
      !proof.ready || proof.consumed) return false;
  proof.consumed = true; return true;
}
const owners = new WeakMap<NativeRuntimePlatform, NativePropertySingleton>();
export class NativePropertySingleton {
  #exitCallback = () => this.destroy();
  #exitProof: ExitProof;
  private construction: NativePropertySingletonConstruction | null = null;
  private boundary: string | null = null;
  private active = false;
  private destroyed = false;
  private constructor(private readonly platform: NativeRuntimePlatform, private readonly memory: NativeMemoryAdmin,
    readonly ranges: NativeSharedPropertySingletonRanges, token: object) {
    if (token !== constructionToken) throw new Error('Canonical property singleton factory required');
    Object.defineProperty(this, 'platform', { value: platform, writable: false, configurable: false });
    Object.defineProperty(this, 'memory', { value: memory, writable: false, configurable: false });
    Object.defineProperty(this, 'ranges', { value: ranges, writable: false, configurable: false });
    this.#exitProof = { platform, owner: this, ready: false, consumed: false };
    exitProofs.set(this.#exitCallback, this.#exitProof);
  }
  static forPlatform(platform: NativeRuntimePlatform, memory: NativeMemoryAdmin): NativeValue<NativePropertySingleton> {
    try {
      admitPropertySingletonGetter();
      if (!NativeMemoryAdmin.prototype.usesPlatform.call(memory, platform)) throw new Error('Same retained platform/heap required');
      const previous = owners.get(platform);
      if (previous) {
        if (previous.memory !== memory) throw new Error('Canonical property singleton cannot change its MemoryAdmin');
        return { known: true, value: previous };
      }
      const image = fact(NativeSharedModuleImage.forPlatform(platform));
      const owner = new NativePropertySingleton(platform, memory, fact(image.propertySingletonRanges()), constructionToken);
      owners.set(platform, owner); return { known: true, value: owner };
    } catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
  get(): NativeValue<NativeHeapObjectViews> {
    if (this.boundary || this.destroyed) return { known: false, reason: this.boundary ?? 'Property singleton lifetime ended' };
    let executing = false;
    try {
      const image = fact(NativeSharedModuleImage.forPlatform(this.platform));
      if (fact(image.propertySingletonRanges()) !== this.ranges) throw new Error('Canonical singleton ranges differ');
      const guard = this.ranges.guard.maskedWord(0);
      if ((guard.knownMask & 1) === 0) throw new Error('Actual singleton guard bit is unknown');
      // Native warm return does not read or promote constructor fields.
      if (guard.value & 1) return { known: true, value: this.ranges.object };
      if (this.active) throw new Error('Property getter cannot restart an executing cold constructor');
      this.active = true; executing = true;
      guard.value = (guard.value | 1) >>> 0; guard.knownMask = (guard.knownMask | 1) >>> 0;
      this.construction = fact(NativePropertySingletonConstruction.construct(this.memory, this.ranges.object));
      if (this.boundary) throw new Error(this.boundary);
      // The source ignores a known integer atexit result, but not an unowned call.
      this.#exitProof.ready = true;
      try { fact(NativeRuntimePlatform.prototype.registerShutdown.call(this.platform, '100e30a0', this, this.#exitCallback)); }
      finally { this.#exitProof.ready = false; }
      if (this.boundary) throw new Error(this.boundary);
      return { known: true, value: this.ranges.object };
    } catch (error) {
      this.boundary ??= error instanceof Error ? error.message : String(error);
      return { known: false, reason: this.boundary };
    } finally { if (executing) this.active = false; }
  }
  table(): NativeValue<NativePropertyTypeTable> {
    if (this.boundary || this.destroyed || !this.construction || this.construction.snapshot().phase !== 'constructed') {
      return { known: false, reason: this.boundary ?? 'Actual completed live singleton constructor required' };
    }
    return { known: true, value: this.construction.table };
  }
  private destroy(): NativeValue<void> {
    if (this.boundary || this.destroyed || !this.construction) return { known: false, reason: this.boundary ?? 'Live constructed singleton required' };
    const result = this.construction.destroy();
    if (result.known) this.destroyed = true;
    else this.boundary = result.reason;
    return result;
  }
}
