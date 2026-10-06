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

export interface NativePlunderSourceStack {
  readonly treasureSetName: string;
  readonly treasureSetGuid20: string;
  readonly treasureSetSourcePath: string;
  readonly treasureSetSourceSha256: string;
  readonly itemName: string;
  readonly itemGuid20: string;
  readonly itemSourcePath: string;
  readonly itemSourceSha256: string;
  readonly configuredAmount: number;
}

/** Distribution-7 stack fields consumed by GeneratePickpocketInventory. */
export interface NativePickpocketSourceStack extends NativePlunderSourceStack {
  readonly configuredQuality: number;
}

/** Browser record for the arguments native GeneratePlunderInventory passes to
 * CreateItems. It is not an instantiated inventory item or a cache-in result. */
export interface NativeGeneratedPlunderStack extends NativePlunderSourceStack {
  readonly treasureSetSlot: number;
  readonly amount: number;
  readonly creationQuality: 0;
  readonly createItemsFlag: true;
}

/** One result selected from a distribution-7 treasure inventory. */
export interface NativeGeneratedPickpocketStack extends NativePickpocketSourceStack {
  readonly treasureSetSlot: number;
  readonly amount: number;
  readonly creationQuality: number;
  readonly createItemsFlag: true;
}

export interface NativeTreasureSetResolution {
  readonly name: string;
  readonly guid20: string;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly distribution: number;
  readonly minimumTransferStacks: number;
  readonly maximumTransferStacks: number;
  readonly status: 'weaponry-recipe-resolved' | 'plunder-source-resolved' |
    'pickpocket-source-resolved' | 'generation-not-implemented';
  readonly reason: string | null;
  readonly weaponry: readonly NativeWeaponryStack[];
  readonly plunderCandidates: readonly NativePlunderSourceStack[];
  readonly pickpocketCandidates: readonly NativePickpocketSourceStack[];
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

function configuredStacks(entity: NativeEntityRecord, name: string): NativeInventoryStackSource[] {
  const inventorySet = uniqueSet(entity, 'gCInventory_PS');
  const tailRecord = inventorySet.tail;
  const tail = tailRecord?.value;
  if (!tailRecord || tailRecord.status !== 'decoded' || tail === null || typeof tail !== 'object' ||
      !('stacks' in tail) || !Array.isArray(tail.stacks)) {
    throw new Error(`Native treasure set ${name} has no decoded inventory stack list.`);
  }
  if (tail.stacks.length === 0) throw new Error(`Native treasure set ${name} has an empty source inventory.`);
  return tail.stacks as NativeInventoryStackSource[];
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

async function resolvePlunderStack(name: string, treasureGuid20: string, treasurePath: string,
  treasureSha256: string, itemGuid20: string, configuredAmount: number,
  world: TreasureWorldSource): Promise<NativePlunderSourceStack> {
  if (!nonnegativeInt32(configuredAmount) || configuredAmount < 1) {
    throw new Error(`Native Plunder set ${name} has an unsupported stack amount.`);
  }
  const itemHeader = unique(await world.templateByGuidWithSource(itemGuid20), `Plunder item template ${itemGuid20}`);
  const itemSource = itemHeader.source;
  if (!itemHeader.name || itemHeader.guid?.toLowerCase() !== itemGuid20 || !itemSource?.path ||
      !/^[a-f0-9]{64}$/i.test(itemSource.sha256)) {
    throw new Error(`Native Plunder item ${itemGuid20} has no exact hash-checked template identity.`);
  }
  return Object.freeze({ treasureSetName: name, treasureSetGuid20: treasureGuid20,
    treasureSetSourcePath: treasurePath, treasureSetSourceSha256: treasureSha256,
    itemName: itemHeader.name, itemGuid20, itemSourcePath: itemSource.path,
    itemSourceSha256: itemSource.sha256, configuredAmount });
}

async function resolvePickpocketStack(name: string, treasureGuid20: string, treasurePath: string,
  treasureSha256: string, itemGuid20: string, configuredAmount: number, configuredQuality: number,
  world: TreasureWorldSource): Promise<NativePickpocketSourceStack> {
  if (!nonnegativeInt32(configuredAmount) || configuredAmount < 1 || !int32(configuredQuality)) {
    throw new Error(`Native PickPocket set ${name} has an unsupported stack amount or quality.`);
  }
  const itemHeader = unique(await world.templateByGuidWithSource(itemGuid20), `PickPocket item template ${itemGuid20}`);
  const itemSource = itemHeader.source;
  if (!itemHeader.name || itemHeader.guid?.toLowerCase() !== itemGuid20 || !itemSource?.path ||
      !/^[a-f0-9]{64}$/i.test(itemSource.sha256)) {
    throw new Error(`Native PickPocket item ${itemGuid20} has no exact hash-checked template identity.`);
  }
  return Object.freeze({ treasureSetName: name, treasureSetGuid20: treasureGuid20,
    treasureSetSourcePath: treasurePath, treasureSetSourceSha256: treasureSha256,
    itemName: itemHeader.name, itemGuid20, itemSourcePath: itemSource.path,
    itemSourceSha256: itemSource.sha256, configuredAmount, configuredQuality });
}

/** Reproduce distribution 0's bounded draw arithmetic. The supplied draw
 * source must return the same 0..32767 domain as the audited MSVCRT rand(). */
export function generateNativePlunder(resolution: NativeTreasureSetResolution, treasureSetSlot: number,
  nextRandom: () => number): readonly NativeGeneratedPlunderStack[] {
  if (resolution.distribution !== 0 || resolution.status !== 'plunder-source-resolved' ||
      !int32(resolution.minimumTransferStacks) || !int32(resolution.maximumTransferStacks) ||
      !Number.isInteger(treasureSetSlot) || treasureSetSlot < 1 || treasureSetSlot > 5) {
    throw new Error('Native Plunder generation needs one resolved distribution-0 set in actor slot 1..5.');
  }
  if (resolution.plunderCandidates.length === 0) throw new Error('Native Plunder source inventory has no selectable stacks.');
  const draw = (): number => {
    const result = nextRandom();
    if (!Number.isInteger(result) || result < 0 || result > 0x7fff) {
      throw new Error('Browser Plunder random source must return an integer in the native 0..32767 rand() range.');
    }
    return result;
  };

  let transferCount: number;
  if (resolution.minimumTransferStacks === resolution.maximumTransferStacks) {
    transferCount = resolution.minimumTransferStacks < 1 ? 1 : resolution.minimumTransferStacks;
  } else {
    const lower = Math.min(resolution.minimumTransferStacks, resolution.maximumTransferStacks);
    const upper = Math.max(resolution.minimumTransferStacks, resolution.maximumTransferStacks);
    const range = upper - lower + 1;
    if (!Number.isSafeInteger(range) || range < 1 || range > 0x7fffffff) {
      throw new Error('Native Plunder transfer range exceeds the browser implementation bounds.');
    }
    transferCount = draw() % range + lower;
  }
  if (transferCount <= 0) return Object.freeze([]);
  if (!Number.isSafeInteger(transferCount) || transferCount > 65_536) {
    throw new Error('Native Plunder transfer count exceeds the browser implementation bound of 65536.');
  }

  const generated: NativeGeneratedPlunderStack[] = [];
  for (let i = 0; i < transferCount; i++) {
    const selected = resolution.plunderCandidates.length > 1
      ? draw() % resolution.plunderCandidates.length : 0;
    const candidate = resolution.plunderCandidates[selected]!;
    const half = Math.floor(candidate.configuredAmount / 2);
    const amount = candidate.configuredAmount > 1
      ? draw() % (candidate.configuredAmount - half + 1) + half
      : candidate.configuredAmount;
    generated.push(Object.freeze({ ...candidate, treasureSetSlot, amount,
      creationQuality: 0 as const, createItemsFlag: true as const }));
  }
  return Object.freeze(generated);
}

/**
 * Reproduce one distribution-7 GeneratePickpocketInventory draw. The native
 * helper selects one configured stack, then computes `amount/2 +
 * GetRandomNumber(amount/2)`, replacing zero with one. Entity::GetRandomNumber
 * returns zero without drawing when its bound is below two.
 */
export function generateNativePickpocketLoot(resolution: NativeTreasureSetResolution, treasureSetSlot: number,
  nextRandom: () => number): NativeGeneratedPickpocketStack | null {
  if (resolution.distribution !== 7 || resolution.status !== 'pickpocket-source-resolved' ||
      !Number.isInteger(treasureSetSlot) || treasureSetSlot < 1 || treasureSetSlot > 5) {
    throw new Error('Native PickPocket loot needs one resolved distribution-7 set in actor slot 1..5.');
  }
  if (resolution.pickpocketCandidates.length === 0) return null;
  const draw = (): number => {
    const result = nextRandom();
    if (!Number.isInteger(result) || result < 0 || result > 0x7fff) {
      throw new Error('Browser PickPocket random source must return an integer in the native 0..32767 rand() range.');
    }
    return result;
  };
  const selected = resolution.pickpocketCandidates.length < 2 ? 0
    : draw() % resolution.pickpocketCandidates.length;
  const candidate = resolution.pickpocketCandidates[selected]!;
  const half = Math.floor(candidate.configuredAmount / 2);
  const amountDraw = half < 2 ? 0 : draw() % half;
  let amount = half + amountDraw;
  if (amount === 0) amount = 1;
  return Object.freeze({ ...candidate, treasureSetSlot, amount,
    creationQuality: candidate.configuredQuality, createItemsFlag: true as const });
}

/** Resolve source treasure templates. Weaponry distribution (3) has a
 * deterministic stack/equip path in Script_Game:100ced90; distribution-0
 * Plunder and distribution-7 PickPocket candidates are resolved here.
 * Other distributions retain source identity but still need their generator.
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
  const plunderCandidates: NativePlunderSourceStack[] = [];
  const pickpocketCandidates: NativePickpocketSourceStack[] = [];
  if (distribution === 3) {
    for (const rawStack of configuredStacks(entity, name)) {
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
  } else if (distribution === 0) {
    for (const rawStack of configuredStacks(entity, name)) {
      if (!rawStack || rawStack.name !== 'gCInventoryStack' || !Array.isArray(rawStack.properties)) {
        throw new Error(`Native Plunder set ${name} contains an unsupported stack record.`);
      }
      const properties = rawStack.properties as NativeNestedProperty[];
      const configuredAmount = nestedValue(properties, 'Amount');
      const itemGuid20 = proxyGuid(nestedValue(properties, 'Template'));
      if (!nonnegativeInt32(configuredAmount)) {
        throw new Error(`Native Plunder set ${name} contains an unsupported stack amount.`);
      }
      plunderCandidates.push(await resolvePlunderStack(name, treasureGuid20, source.path, source.sha256,
        itemGuid20, configuredAmount, world));
    }
  } else if (distribution === 7) {
    for (const rawStack of configuredStacks(entity, name)) {
      if (!rawStack || rawStack.name !== 'gCInventoryStack' || !Array.isArray(rawStack.properties)) {
        throw new Error(`Native PickPocket set ${name} contains an unsupported stack record.`);
      }
      const properties = rawStack.properties as NativeNestedProperty[];
      const configuredAmount = nestedValue(properties, 'Amount');
      const configuredQuality = nestedValue(properties, 'Quality');
      const itemGuid20 = proxyGuid(nestedValue(properties, 'Template'));
      if (!nonnegativeInt32(configuredAmount) || !int32(configuredQuality)) {
        throw new Error(`Native PickPocket set ${name} contains an unsupported amount or quality.`);
      }
      pickpocketCandidates.push(await resolvePickpocketStack(name, treasureGuid20, source.path,
        source.sha256, itemGuid20, configuredAmount, configuredQuality, world));
    }
  }
  const resolved = distribution === 3 || distribution === 0 || distribution === 7;
  const status = distribution === 3 ? 'weaponry-recipe-resolved'
    : distribution === 0 ? 'plunder-source-resolved'
    : distribution === 7 ? 'pickpocket-source-resolved' : 'generation-not-implemented';
  return Object.freeze({ name, guid20: treasureGuid20, sourcePath: source.path, sourceSha256: source.sha256,
    distribution, minimumTransferStacks, maximumTransferStacks,
    status,
    reason: resolved ? null : 'Treasure distribution ' + distribution + ' is source-identified but its generator is not implemented.',
    weaponry: Object.freeze(weaponry), plunderCandidates: Object.freeze(plunderCandidates),
    pickpocketCandidates: Object.freeze(pickpocketCandidates) });
}
