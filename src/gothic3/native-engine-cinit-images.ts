import type { NativeValue } from './dialogue';
import { NativeModuleCrtOwner } from './native-engine-crt-locks';
import { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeHeapObjectViews } from './native-heap-views';
import { engineCinitImage } from './native-engine-cinit-source';

type Label = 'floatingPointCallback' | 'floatConversionPointers' | 'divideAdjustment' | 'dynamicTlsCallback';
const owners = new WeakMap<NativeModuleCrtOwner, NativeEngineCinitImages>();
const token = Object.freeze({});
const buffer = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')!.get!;
const offset = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset')!.get!;
const length = Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength')!.get!;
export class NativeEngineCinitImages {
  readonly #images = new Map<Label, { fields: NativeHeapObjectViews; backing: NativeHeapObjectViews['backing']; bytes: Uint8Array; masks: Uint8Array; rootBytes: Uint8Array; rootMasks: Uint8Array; view: DataView; size: number }>();
  private constructor(readonly crt: NativeModuleCrtOwner, grant: object) {
    if (grant !== token || new.target !== NativeEngineCinitImages || !NativeModuleCrtOwner.isConstructedOwner(crt) || crt.module !== 'Engine' || !(crt.host.platform instanceof NativeRuntimePlatform)) throw new Error('Constructed Engine initializer owner required');
    for (const label of ['floatingPointCallback', 'floatConversionPointers', 'divideAdjustment', 'dynamicTlsCallback'] as const) {
      const row = engineCinitImage(label);
      const bytes = Uint8Array.from(row.raw.match(/../g)!, byte => parseInt(byte, 16));
      if (bytes.length !== row.bytes) throw new Error('Original initializer image extent required');
      const fields = new NativeHeapObjectViews({ identity: Object.freeze({ crt: crt.identity, address: row.address }), bytes, knownMask: new Uint8Array(row.bytes).fill(255), freed: false });
      Object.freeze(fields);
      this.#images.set(label, { fields, backing: fields.backing, bytes: fields.bytes, masks: fields.knownMask, rootBytes: fields.backing.bytes, rootMasks: fields.backing.knownMask, view: fields.view, size: row.bytes });
    }
    Object.freeze(this);
  }
  #validate() {
    const active = NativeRuntimePlatform.requireActivePlatform(this.crt.host.platform as NativeRuntimePlatform);
    if (!active.known) throw new Error(active.reason);
    for (const [label, p] of this.#images) {
      engineCinitImage(label);
      const f = p.fields;
      if (f.backing !== p.backing || f.backing.freed || f.bytes !== p.bytes || f.knownMask !== p.masks || f.view !== p.view || f.backing.bytes !== p.rootBytes || f.backing.knownMask !== p.rootMasks || f.bytes.length !== p.size || f.knownMask.length !== p.size || buffer.call(f.view) !== f.bytes.buffer || offset.call(f.view) !== f.bytes.byteOffset || length.call(f.view) !== p.size) throw new Error('Retained Engine initializer storage required');
    }
  }
  static forCrt(crt: NativeModuleCrtOwner): NativeValue<NativeEngineCinitImages> {
    try { let owner = owners.get(crt); if (!owner) { owner = new NativeEngineCinitImages(crt, token); owners.set(crt, owner); } owner.#validate(); return { known: true, value: owner }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
  static imageForCrt(owner: NativeEngineCinitImages, crt: NativeModuleCrtOwner, label: Label): NativeValue<NativeHeapObjectViews> {
    try { if (owners.get(crt) !== owner || owner.crt !== crt) throw new Error('Same Engine initializer owner required'); owner.#validate(); const image = owner.#images.get(label); if (!image) throw new Error('Original initializer image required'); return { known: true, value: image.fields }; }
    catch (error) { return { known: false, reason: error instanceof Error ? error.message : String(error) }; }
  }
}
