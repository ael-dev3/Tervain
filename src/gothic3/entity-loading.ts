/** Original installed gCEntity64 -> Dynamic83 -> Entity83 read sequence.
 * Uses already constructed physical entity/storage and its real services.
 * Completion of this reader does not perform graph attachment or world activation.
 */
import rulesText from '../../assets/gothic3/entity-loading/runtime-rules.json?raw';
import manifestText from '../../assets/gothic3/entity-loading/manifest.json?raw';
import type { NativeValue } from './dialogue';
import { NativeEntityByteInput, NativeEntityV83Reader } from './entity-reading';
import type { NativeEntityReadData, NativeEntityReadHost } from './entity-reading';
import { NativeLivePropertySet } from './entity-lifecycle';
import type { NativeEntityPropertyLifecycle, NativeLifecycleResult, NativeMaskedWord } from './entity-lifecycle';
import type { NativeEntitySetters } from './entity-setters';
import type { NativeReflectionController } from './entity-reflection';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

const rules = JSON.parse(rulesText) as { schema: string; profile: { gameVersion: number; dynamicVersion: number;
  entityVersion: number; nodeVersion: number }; inputs: Record<string, string>; worldResident: false };
if (rules.schema !== 'gothic3-entity-loading-rules-v1' || rules.profile.gameVersion !== 64 ||
    rules.profile.dynamicVersion !== 83 || rules.profile.entityVersion !== 83 || rules.profile.nodeVersion !== 1 ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.inputs.Engine !== 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3' ||
    rules.inputs.SharedBase !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
    rules.worldResident !== false) throw new Error('Original dynamic read receipt differs');
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const missing = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
function fact<T>(value: NativeValue<T>, name: string): T {
  if (!value.known) throw new Error(name + ': ' + value.reason);
  return value.value;
}
function lifecycleValue<T>(result: NativeLifecycleResult<T>): NativeValue<T> {
  return result.outcome === 'complete' ? known(result.value) : missing(result.required);
}
function uint16(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new Error('Original uint16 required');
  return value;
}
function id(value: string): string {
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error('Original physical PropertyID20 required');
  return value;
}

export interface NativeDynamicEntityReadStorage {
  /** These capabilities alias actual object+1a8 and object+1bc. A serialized
   * snapshot or copied flag holder cannot replace physical entity storage. */
  readonly data: NativeEntityReadData;
  readonly creator: { propertyId20: string };
  readonly flags1bc: NativeMaskedWord;
}
export interface NativeDynamicEntityReadHost {
  /** Source compares AL exactly with1; a truthy value is insufficient. */
  isEntityPatchingEnabled(): NativeValue<number>;
  /** Capture the actual embedded creator pointer after base Read/PostRead.
   * Internal lookup/application callbacks must read this live store; a copied
   * ID string cannot replace it. Source ignores the bool return. */
  patchWithTemplate(target: NativeDynamicEntityReadStorage,
    creator: NativeDynamicEntityReadStorage['creator'], patch: true): NativeValue<boolean>;
}
export interface NativeDynamicEntityReadTrace {
  operation: string; source: string; state: 'attempted' | 'applied'; cursor: number;
  value?: number | boolean | string;
}
export type NativeDynamicEntityReadResult =
  | { supported: true; nativeReturnValue: 1; trace: readonly NativeDynamicEntityReadTrace[]; worldResident: false }
  | { supported: false; nativeReturnValue: null; reason: string;
      trace: readonly NativeDynamicEntityReadTrace[]; worldResident: false };

export class NativeOriginalDynamicEntityReader {
  private active = false;
  private blocked: string | null = null;
  private readonly rows: NativeDynamicEntityReadTrace[] = [];
  constructor(readonly base: NativeEntityV83Reader, readonly host: NativeDynamicEntityReadHost) {}
  failure(): string | null { return this.blocked; }
  read(target: NativeDynamicEntityReadStorage, input: NativeEntityByteInput): NativeDynamicEntityReadResult {
    if (this.active) this.blocked = 'Nested dynamic read is outside the selected profile';
    if (this.blocked) return { supported: false, nativeReturnValue: null,
      reason: this.blocked, trace: this.rows.slice(), worldResident: false };
    const record = (operation: string, source: string, state: NativeDynamicEntityReadTrace['state'],
      value?: NativeDynamicEntityReadTrace['value']): void => {
      this.rows.push({ operation, source, state, cursor: input.cursor(), value });
    };
    const call = <T>(operation: string, source: string, body: () => NativeValue<T>): T => {
      if (this.blocked) throw new Error(this.blocked);
      record(operation, source, 'attempted');
      const value = fact(body(), operation);
      if (this.blocked) throw new Error(this.blocked);
      record(operation, source, 'applied'); return value;
    };
    const word = (mask: number, value: number, source: string): void => {
      uint16(target.flags1bc.value); uint16(target.flags1bc.knownMask);
      target.flags1bc.value = ((target.flags1bc.value & ~mask) | value) & 0xffff;
      target.flags1bc.knownMask = (target.flags1bc.knownMask | mask) & 0xffff;
      record('dynamic word1bc masked write', source, 'applied', target.flags1bc.value);
    };
    this.active = true;
    try {
      if (target.data.entity.kind !== 'gCEntity') throw new Error('Actual constructed gCEntity required');
      id(target.creator.propertyId20);
      const gameVersion = input.u16(); record('gCEntity.Read version', 'Game:2012bc12', 'applied', gameVersion);
      if (gameVersion !== 64) throw new Error('Installed game entity version64 profile required; legacy2 is not inferred');
      const dynamicVersion = input.u16();
      record('Dynamic.Read version', 'Engine:304bd683', 'applied', dynamicVersion);
      if (dynamicVersion !== 83) throw new Error('Installed Dynamic83 profile required; legacy flag branch is not inferred');
      const hasCreator = input.bool();
      record('creator present', 'Engine:304bd6a7', 'applied', hasCreator);
      if (hasCreator) {
        // SharedBase10003a71 ->10092a00 performs one bulk16 read into
        // the GUID, consumes serialized DWORD through10007243, then zeros
        // the live cached DWORD. Retain the first write if the tail truncates.
        const guid = [...input.take(16)].map(value => value.toString(16).padStart(2, '0')).join('');
        target.creator.propertyId20 = guid + id(target.creator.propertyId20).slice(32);
        record('creator GUID16 bulk read', 'SharedBase:10092a00', 'applied', target.creator.propertyId20);
        const cache = input.take(4);
        target.creator.propertyId20 = guid + [...cache].map(value => value.toString(16).padStart(2, '0')).join('');
        record('creator serialized cache DWORD read', 'SharedBase:10007243', 'applied', target.creator.propertyId20);
        target.creator.propertyId20 = guid + '00000000';
        record('creator discard serialized cache and clear live cache', 'SharedBase:10092a00', 'applied', target.creator.propertyId20);
      }
      word(1, 1, 'Engine:304bd6c2');
      call('eCEntity.Read ->ReadV83', 'Engine:304bd6cc', () => {
        const entityVersion = input.u16();
        record('eCEntity.Read version', 'Engine:3003d271', 'applied', entityVersion);
        if (entityVersion !== 83) return missing('Installed Entity83 profile required');
        const result = this.base.read(target.data, input, 83);
        return result.supported ? known(result.nativeReturnValue) : missing(result.reason);
      });
      if (hasCreator) {
        const enabled = call('IsEntityPatchingEnabled', 'Engine:304bd6d7', () => this.host.isEntityPatchingEnabled());
        if (!Number.isInteger(enabled) || enabled < 0 || enabled > 255) throw new Error('Original patching AL byte required');
        if (enabled === 1) {
          call('PatchWithTemplate(creator,true)', 'Engine:304bd6ea', () => {
            const creator = target.creator; id(creator.propertyId20);
            return this.host.patchWithTemplate(target, creator, true);
          });
        }
      }
      word(2, 0, 'Engine:304bd6ef');
      // Annotation only: neither registry presence nor this read stage is
      // cache/physics/PVS/range membership or graph attachment.
      target.data.entity.sourceReadStage = 'entity-read-complete';
      record('Dynamic return1, preserved by Game epilogue', 'Engine:304bd6fa/Game:2012bc5d', 'applied', 1);
      return { supported: true, nativeReturnValue: 1, trace: this.rows.slice(), worldResident: false };
    } catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error);
      return { supported: false, nativeReturnValue: null, reason: this.blocked,
        trace: this.rows.slice(), worldResident: false };
    } finally { this.active = false; }
  }
}

export interface NativeEntityReadServices {
  readonly setters: NativeEntitySetters;
  readonly properties: NativeEntityPropertyLifecycle;
  readonly reflection: NativeReflectionController;
  readonly diagnostics: Pick<NativeEntityReadHost, 'warningNewerVersion' | 'fatalInvalidSentinel'>;
  readonly pureScalingX: NativeEntityReadHost['pureScalingX'];
}
/** Compose existing concrete controllers. Required virtual observer/math
 * capabilities stay explicit; no generic success callback substitutes for them. */
export function connectOriginalEntityRead(services: NativeEntityReadServices): NativeEntityReadHost {
  return {
    setter: (target, operation, value, recursive) =>
      services.setters.readHostSetter(target, operation, value, recursive),
    modified: target => services.setters.host.modified(target),
    setName(target, name) {
      const result = services.setters.setName(target, name);
      return result.supported ? known(undefined) : missing(result.reason);
    },
    removeAllPropertySets: target => lifecycleValue(services.properties.removeAll(target.entity)),
    readAccessor: input => services.reflection.readAccessor(input),
    castPropertySet: object => services.reflection.castPropertySet(object),
    propertySetVersion: set => services.reflection.propertySetVersion(set),
    addPropertySet(target, object, sort) {
      if (object !== null && !(object instanceof NativeLivePropertySet)) {
        return missing('Reloaded native AddPropertySet receiver has no concrete property-set capability');
      }
      return lifecycleValue(services.properties.add(target.entity, object, sort));
    },
    warningNewerVersion: (...args) => services.diagnostics.warningNewerVersion(...args),
    fatalInvalidSentinel: (...args) => services.diagnostics.fatalInvalidSentinel(...args),
    onPostRead: target => target.entity.kind === 'gCEntity' || target.entity.kind === 'eCDynamicEntity'
      // Game2066813c+140 ->204628a0 ->Engine30045e03 ->304bdf10.
      // The selected gCEntity inherits the concrete Dynamic PS traversal.
      ? lifecycleValue(services.properties.postRead(target.entity))
      : missing('Concrete entity OnPostRead dispatch outside selected dynamic profile'),
    pureScalingX: matrix => services.pureScalingX(matrix),
  };
}

export interface OriginalHeroReadRecord {
  schema: 'gothic3-entity-loading-hero-v1'; worldResident: false; strings: readonly string[];
  hero: { sourceIndex: 371; sourceOffset: 1183912; endSourceOffsetExclusive: 1192397; bytes: 8485;
    sha256: string; serializedRaw: string; name: 'PC_Hero'; propertyId20: string; creatorId20: string;
    packets: readonly { index: number; className: string; begin: number; endExclusive: number }[] };
  separateGraph: { links: readonly (readonly [number, number])[]; nativeGraphAttachmentPerformed: false };
}
const manifest = JSON.parse(manifestText) as { schema: string; outputs: (ResourceReceipt & { path: string })[] };
const verifiedRecords = new WeakSet<OriginalHeroReadRecord>();
export async function loadOriginalHeroReadRecord(): Promise<OriginalHeroReadRecord> {
  if (manifest.schema !== 'gothic3-entity-loading-manifest-v1') throw new Error('Original Hero record manifest differs');
  const receipt = manifest.outputs.find(value => value.path === 'hero-record.json');
  if (!receipt) throw new Error('Original Hero resource receipt missing');
  const document = await readNativeResource<OriginalHeroReadRecord>('entity-loading/hero-record.json', receipt);
  const hero = document.hero;
  if (document.schema !== 'gothic3-entity-loading-hero-v1' || document.worldResident !== false ||
      hero.sourceIndex !== 371 || hero.sourceOffset !== 1183912 || hero.endSourceOffsetExclusive !== 1192397 ||
      hero.bytes !== 8485 || hero.sha256 !== '8b0478a57152023598a3d93550151d623d58fc6d49d90b3ea505a2202efa5e8b' ||
      hero.name !== 'PC_Hero' || hero.packets.length !== 19 || hero.serializedRaw.length !== hero.bytes * 2 ||
      !/^(?:[0-9a-f]{2})+$/.test(hero.serializedRaw) || document.separateGraph.nativeGraphAttachmentPerformed !== false) {
    throw new Error('Original complete Hero record differs');
  }
  const freeze = (value: unknown): void => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
  };
  freeze(document); verifiedRecords.add(document); return document;
}
/** Cursor0 corresponds to sourceOffset1183912. Includes every original packet
 * and sentinel; missing factories stop the original loop instead of skipping. */
export function originalHeroEntityInput(document: OriginalHeroReadRecord): NativeEntityByteInput {
  if (!verifiedRecords.has(document)) throw new Error('Use the hash-verified original Hero record');
  const raw = document.hero.serializedRaw;
  return new NativeEntityByteInput(Uint8Array.from(raw.match(/../g)!, value => parseInt(value, 16)), document.strings);
}
