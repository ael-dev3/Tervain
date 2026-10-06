import { nativeInventoryEquipSlots } from './inventory';
import { NativeWorldData, sourceProperty } from './native-data';
import type { NativeEntityRecord, NativeWorldData as NativeWorldDataType, SourceLookup } from './native-data';
import type { NativeKnowledge, NativeMeleeCarrier } from './combat';

export interface NativeWeaponryStack {
  readonly treasureSetName: string;
  readonly treasureSetGuid20: string;
  readonly treasureSetSourcePath: string;
  readonly treasureSetSourceSha256: string;
  readonly itemName: string;
  readonly itemGuid20: string;
  readonly itemSourcePath: string;
  readonly itemSourceSha256: string;
  readonly configuredAmount: number;
  readonly equippedAmount: 1;
  readonly sourceQuality: number;
  readonly inventoryQuality: number;
  readonly useType: number;
  readonly category: number;
  readonly equipSlots: { readonly primary: number; readonly alternative: number };
  readonly carrier: NativeMeleeCarrier | null;
}

export interface NativeTreasureSetResolution {
  readonly name: string;
  readonly guid20: string;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly distribution: number;
  readonly minimumTransferStacks: number;
  readonly maximumTransferStacks: number;
  readonly status: 'weaponry-recipe-resolved' | 'generation-not-implemented';
  readonly reason: string | null;
  readonly weaponry: readonly NativeWeaponryStack[];
}

type TreasureWorldSource = Pick<NativeWorldDataType,
  'templateByNameWithSource' | 'templateByGuidWithSource' | 'template'>;

interface NativeNestedProperty {
  readonly name?: unknown;
  readonly status?: unknown;
  readonly value?: unknown;
}

interface NativeInventoryStackSource {
  readonly name?: unknown;
  readonly properties?: unknown;
}

function unique<T>(lookup: SourceLookup<T>, label: string): T {
  if (lookup.kind !== 'found') throw new Error(lookup.kind === 'missing'
    ? lookup.reason
    : `Native ${label} is ambiguous across ${lookup.candidates.length} records.`);
  return lookup.value;
}

function uniqueSet(entity: NativeEntityRecord, name: string) {
  const matching = entity.propertySets.filter((set) => set.name === name);
  if (matching.length !== 1) throw new Error(`Native ${name} is missing or ambiguous in ${entity.name}.`);
  return matching[0]!;
}

function value<T>(entity: NativeEntityRecord, setName: string, property: string,
  accepts: (input: unknown) => input is T): T {
  const lookup = sourceProperty(entity, setName, property);
  if (lookup.kind !== 'found' || !accepts(lookup.value)) throw new Error(lookup.kind === 'missing'
    ? lookup.reason
    : lookup.kind === 'ambiguous'
      ? `Native ${setName}.${property} is ambiguous.`
      : `Native ${setName}.${property} has an unsupported value.`);
  return lookup.value;
}

function nestedValue(properties: readonly NativeNestedProperty[], name: string): unknown {
  const matching = properties.filter((property) => property.name === name);
  if (matching.length !== 1 || matching[0]!.status !== 'decoded') {
    throw new Error(`Native treasure stack property ${name} is missing, undecoded or ambiguous.`);
  }
  return matching[0]!.value;
}

function nonnegativeInt32(input: unknown): input is number {
  return Number.isInteger(input) && (input as number) >= 0 && (input as number) <= 0x7fffffff;
}

function int32(input: unknown): input is number {
  return Number.isInteger(input) && (input as number) >= -0x80000000 && (input as number) <= 0x7fffffff;
}

function finiteNonnegative(input: unknown): input is number {
  return typeof input === 'number' && Number.isFinite(input) && input >= 0;
}

function proxyGuid(input: unknown): string {
  if (input === null || typeof input !== 'object' || !('present' in input) || input.present !== true ||
      !('rawGuid20' in input) || typeof input.rawGuid20 !== 'string' || !/^[a-f0-9]{40}$/i.test(input.rawGuid20)) {
    throw new Error('Native treasure stack does not reference one exact item template.');
  }
  return input.rawGuid20.toLowerCase();
}

function known<T>(knownValue: T, source: string): NativeKnowledge<T> {
  return Object.freeze({ status: 'known', value: knownValue, source });
}

async function resolveWeaponryStack(name: string, treasureGuid20: string, treasurePath: string,
  treasureSha256: string, itemGuid20: string, configuredAmount: number, sourceQuality: number,
  ownerId: string, world: TreasureWorldSource): Promise<NativeWeaponryStack> {
  if (!nonnegativeInt32(configuredAmount) || configuredAmount < 1 || !int32(sourceQuality) || sourceQuality < 0) {
    throw new Error(`Native weaponry set ${name} has an unsupported amount or quality.`);
  }
  const itemHeader = unique(await world.templateByGuidWithSource(itemGuid20), `weapon template ${itemGuid20}`);
  const itemSource = itemHeader.source;
  if (!itemSource || itemSource.path.length === 0 || !/^[a-f0-9]{64}$/i.test(itemSource.sha256)) {
    throw new Error(`Native weapon template ${itemGuid20} has no hash-checked source identity.`);
  }
  const itemEntity = unique(await world.template(itemHeader), itemHeader.name);
  if (itemEntity.guid !== itemGuid20) throw new Error('Native weapon template payload identity differs from its index.');
  const useType = value(itemEntity, 'gCInteraction_PS', 'UseType', int32);
  const category = value(itemEntity, 'gCItem_PS', 'Category', int32);
  const inventoryQuality = useType === 4 || useType === 7 ? sourceQuality : sourceQuality | 0x100;
  const spell = value(itemEntity, 'gCItem_PS', 'Spell', (input): input is { present: boolean; rawGuid20: string | null } =>
    input !== null && typeof input === 'object' && 'present' in input && typeof input.present === 'boolean' &&
    'rawGuid20' in input && (input.rawGuid20 === null || typeof input.rawGuid20 === 'string'));
  const damageSets = itemEntity.propertySets.filter((set) => set.name === 'gCDamage_PS');
  if (damageSets.length > 1) throw new Error(`Native weapon ${itemHeader.name} has ambiguous damage property sets.`);
  let carrier: NativeMeleeCarrier | null = null;
  if (damageSets.length === 1) {
    const damageType = value(itemEntity, 'gCDamage_PS', 'DamageType', int32);
    const damageAmount = value(itemEntity, 'gCDamage_PS', 'DamageAmount', int32);
    const damageHitMultiplier = value(itemEntity, 'gCDamage_PS', 'DamageHitMultiplier', finiteNonnegative);
    const evidence = `weapon:${itemHeader.name}#${itemGuid20}:${itemSource.path}@${itemSource.sha256}`;
    carrier = Object.freeze({ id: itemGuid20, ownerId, damageKind: damageType,
      damageAmount, damageHitMultiplier, itemQualityBits: inventoryQuality,
      spellPresent: known(spell.present, `${evidence}:gCItem_PS.Spell`),
      projectilePresent: known(itemEntity.propertySets.some((set) => set.name === 'gCProjectile_PS'),
        `${evidence}:gCProjectile_PS-membership`) });
  }
  const equipSlots = nativeInventoryEquipSlots(useType);
  if (!equipSlots.primary) throw new Error(`Native weaponry set ${name} cannot equip ${itemHeader.name} with UseType ${useType}.`);
  return Object.freeze({ treasureSetName: name, treasureSetGuid20: treasureGuid20, treasureSetSourcePath: treasurePath,
    treasureSetSourceSha256: treasureSha256, itemName: itemHeader.name, itemGuid20,
    itemSourcePath: itemSource.path, itemSourceSha256: itemSource.sha256,
    configuredAmount, equippedAmount: 1, sourceQuality, inventoryQuality,
    useType, category, equipSlots: Object.freeze(equipSlots), carrier });
}

/** Resolve the source treasure-set template. Weaponry distribution (3) has a
 * deterministic stack/equip path in Script_Game:100ced90. Other distributions
 * retain source identity but need their own generator before output is claimed.
 */
export async function loadNativeTreasureSet(name: string, ownerId: string,
  world: TreasureWorldSource = new NativeWorldData()): Promise<NativeTreasureSetResolution> {
  if (!name || !/^[a-f0-9]{40}$/i.test(ownerId)) throw new Error('Treasure-set lookup needs a name and native actor identity.');
  const header = unique(await world.templateByNameWithSource(name), `treasure set ${name}`);
  const source = header.source;
  const treasureGuid20 = header.guid;
  if (header.name !== name || typeof treasureGuid20 !== 'string' ||
      !/^[a-f0-9]{40}$/i.test(treasureGuid20) || !source || !source.path ||
      !/^[a-f0-9]{64}$/i.test(source.sha256)) {
    throw new Error(`Native treasure set ${name} has incomplete hash-checked source identity.`);
  }
  const entity = unique(await world.template(header), name);
  if (entity.guid !== treasureGuid20) throw new Error(`Native treasure set ${name} payload identity differs from its header.`);
  const distribution = value(entity, 'gCTreasureSet_PS', 'TreasureDistribution', int32);
  const minimumTransferStacks = value(entity, 'gCTreasureSet_PS', 'MinTransferStacks', int32);
  const maximumTransferStacks = value(entity, 'gCTreasureSet_PS', 'MaxTransferStacks', int32);
  const weaponry: NativeWeaponryStack[] = [];
  if (distribution === 3) {
    const inventorySet = uniqueSet(entity, 'gCInventory_PS');
    const tail = inventorySet.tail?.value;
    if (tail === null || typeof tail !== 'object' || !('stacks' in tail) || !Array.isArray(tail.stacks)) {
      throw new Error(`Native weaponry set ${name} has no decoded inventory stack list.`);
    }
    for (const rawStack of tail.stacks as NativeInventoryStackSource[]) {
      if (!rawStack || rawStack.name !== 'gCInventoryStack' || !Array.isArray(rawStack.properties)) {
        throw new Error(`Native weaponry set ${name} contains an unsupported stack record.`);
      }
      const properties = rawStack.properties as NativeNestedProperty[];
      const configuredAmount = nestedValue(properties, 'Amount');
      const sourceQuality = nestedValue(properties, 'Quality');
      const itemGuid20 = proxyGuid(nestedValue(properties, 'Template'));
      if (!nonnegativeInt32(configuredAmount) || !int32(sourceQuality)) {
        throw new Error(`Native weaponry set ${name} contains an unsupported amount or quality.`);
      }
      weaponry.push(await resolveWeaponryStack(name, treasureGuid20, source.path, source.sha256,
        itemGuid20, configuredAmount, sourceQuality, ownerId.toLowerCase(), world));
    }
  }
  const resolved = distribution === 3;
  return Object.freeze({ name, guid20: treasureGuid20, sourcePath: source.path, sourceSha256: source.sha256,
    distribution, minimumTransferStacks, maximumTransferStacks,
    status: resolved ? 'weaponry-recipe-resolved' : 'generation-not-implemented',
    reason: resolved ? null : 'Treasure distribution ' + distribution + ' is source-identified but its generator is not implemented.',
    weaponry: Object.freeze(weaponry) });
}
