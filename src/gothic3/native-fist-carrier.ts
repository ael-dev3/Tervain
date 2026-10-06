import { NativeWorldData, sourceProperty } from './native-data';
import type { NativeEntityRecord, NativeWorldData as NativeWorldDataType, SourceLookup } from './native-data';
import type { NativeKnowledge, NativeMeleeCarrier } from './combat';

export interface NativeFistCarrierSource {
  readonly templateName: 'Fist';
  readonly sourcePath: 'Items/Items/Action_Items_Fist.tple';
  readonly sourceSha256: string;
  readonly templateGuid20: string;
  readonly templateFile: number;
  readonly templateHeader: number;
  readonly damageType: 1;
  readonly damageAmount: number;
  readonly damageHitMultiplier: number;
  readonly itemQualityBits: number;
  readonly spellPresent: false;
  readonly projectilePresent: false;
}

export interface NativeFistCarrier {
  readonly carrier: NativeMeleeCarrier;
  readonly source: NativeFistCarrierSource;
}

type FistWorldSource = Pick<NativeWorldDataType, 'templateByNameInSource' | 'template'>;

const FIST_TEMPLATE_SOURCE = 'Items/Items/Action_Items_Fist.tple';

function unique<T>(lookup: SourceLookup<T>, label: string): T {
  if (lookup.kind !== 'found') throw new Error(lookup.kind === 'missing'
    ? lookup.reason
    : `Native ${label} is ambiguous across ${lookup.candidates.length} records.`);
  return lookup.value;
}

function sourceValue<T>(entity: NativeEntityRecord, setName: string, property: string,
  accepts: (value: unknown) => value is T): T {
  const lookup = sourceProperty(entity, setName, property);
  if (lookup.kind !== 'found' || !accepts(lookup.value)) {
    throw new Error(lookup.kind === 'missing'
      ? lookup.reason
      : lookup.kind === 'ambiguous'
        ? `Native ${setName}.${property} is ambiguous across ${lookup.candidates.length} values.`
        : `Native ${setName}.${property} has an unsupported value.`);
  }
  return lookup.value;
}

function int32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= -0x80000000 && (value as number) <= 0x7fffffff;
}

function finiteNonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function known<T>(value: T, source: string): NativeKnowledge<T> {
  return Object.freeze({ status: 'known', value, source });
}

/** Resolve the installed game's unarmed damage item through its unique
 * non-helper Fist template. This proves the carrier definition only; it does
 * not establish that a particular live actor currently has this item in hand.
 */
export async function loadNativeFistCarrier(ownerId: string,
  world: FistWorldSource = new NativeWorldData()): Promise<NativeFistCarrier> {
  if (!/^[a-f0-9]{40}$/i.test(ownerId)) throw new Error('Fist carrier owner must be one native 20-byte actor identity.');
  const header = unique(await world.templateByNameInSource('Fist', FIST_TEMPLATE_SOURCE), 'Fist template');
  const templateGuid20 = header.guid;
  if (header.name !== 'Fist' || typeof templateGuid20 !== 'string' || !/^[a-f0-9]{40}$/i.test(templateGuid20) ||
      header.source?.path !== FIST_TEMPLATE_SOURCE || !/^[a-f0-9]{64}$/i.test(header.source.sha256) ||
      !Number.isSafeInteger(header.file) || header.file < 0 || !Number.isSafeInteger(header.header) || header.header < 0) {
    throw new Error('Resolved Fist template identity is malformed.');
  }
  const entity = unique(await world.template(header), 'Fist template payload');
  if (entity.guid !== templateGuid20 || !Array.isArray(entity.propertySets)) {
    throw new Error('Fist template payload identity differs from its indexed header.');
  }
  if (entity.propertySets.filter((set) => set.name === 'gCDamage_PS').length !== 1 ||
      entity.propertySets.filter((set) => set.name === 'gCItem_PS').length !== 1 ||
      entity.propertySets.some((set) => set.name === 'gCProjectile_PS')) {
    throw new Error('Fist template damage, item, or projectile property sets are missing or ambiguous.');
  }

  const evidence = `template:Fist#${templateGuid20}:${FIST_TEMPLATE_SOURCE}@${header.source.sha256}`;
  const damageType = sourceValue(entity, 'gCDamage_PS', 'DamageType', int32);
  const damageAmount = sourceValue(entity, 'gCDamage_PS', 'DamageAmount', int32);
  const damageHitMultiplier = sourceValue(entity, 'gCDamage_PS', 'DamageHitMultiplier', finiteNonnegative);
  const itemQualityBits = sourceValue(entity, 'gCItem_PS', 'Quality', int32);
  const spell = sourceValue(entity, 'gCItem_PS', 'Spell', (value): value is { present: boolean; rawGuid20: string | null } =>
    value !== null && typeof value === 'object' && 'present' in value && typeof value.present === 'boolean' &&
    'rawGuid20' in value && (value.rawGuid20 === null || typeof value.rawGuid20 === 'string'));
  if (damageType !== 1 || damageAmount < 0 || spell.present || spell.rawGuid20 !== null) {
    throw new Error('Fist template does not match the audited non-spell Impact1 carrier profile.');
  }

  const source: NativeFistCarrierSource = Object.freeze({ templateName: 'Fist', sourcePath: FIST_TEMPLATE_SOURCE,
    sourceSha256: header.source.sha256, templateGuid20,
    templateFile: header.file, templateHeader: header.header, damageType: 1, damageAmount,
    damageHitMultiplier, itemQualityBits, spellPresent: false, projectilePresent: false });
  const carrier: NativeMeleeCarrier = Object.freeze({ id: templateGuid20, ownerId: ownerId.toLowerCase(), damageKind: 1,
    damageAmount, damageHitMultiplier, itemQualityBits,
    spellPresent: known(false, `${evidence}:gCItem_PS.Spell`),
    projectilePresent: known(false, `${evidence}:absent-gCProjectile_PS`) });
  return Object.freeze({ carrier, source });
}
