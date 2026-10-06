import { initializeNativeNpcOnProcessingRange } from './native-npc-processing';
import type { NativeNpcSerializedPoints, NativeNpcProcessingRangeState } from './native-npc-processing';
import type { NativeDifficulty } from './combat';
import { loadNativeTreasureSet } from './native-treasure-sets';
import type { NativeTreasureSetResolution } from './native-treasure-sets';
import { NativeWorldData, sourceProperty } from './native-data';
import type { NativeEntityRecord, NativeSourceFile, SourceLookup } from './native-data';
import type { ScenePerson } from './types';

const SESSION_SCHEMA = 'gothic3-browser-npc-combat-session-v1';

interface NativeNpcSourceFacts {
  readonly personId: string;
  readonly name: string;
  readonly sourcePath: string;
  readonly sourceFileIndex: number;
  readonly sourceSha256: string;
  readonly level: number;
  readonly levelMax: number;
  readonly species: number;
  readonly npcType: number;
  readonly statusEffects: number;
  readonly action: number;
  readonly aniState: number;
  readonly statePosition: number;
  readonly currentAttackerId: string | null;
  readonly treasureSets: readonly string[];
  readonly serializedEquipmentSlots: NativeNpcSerializedEquipmentSlots;
  readonly navigationValid: true;
  readonly serializedPoints: NativeNpcSerializedPoints;
}

export type NativeNpcSerializedEquipmentSlots =
  | { readonly status: 'resolved'; readonly slots: readonly {
      readonly index: number; readonly templateGuid20: string; readonly templateName: string;
      readonly templateSourcePath: string; readonly templateSourceSha256: string; readonly itemGuid20: string;
    }[] }
  | { readonly status: 'unknown'; readonly reason: string };

type NativeNpcSerializedEquipmentSlotRefs =
  | { readonly status: 'resolved'; readonly slots: readonly {
      readonly index: number; readonly templateGuid20: string; readonly itemGuid20: string;
    }[] }
  | { readonly status: 'unknown'; readonly reason: string };

export interface BrowserArdeaNpcCombatState {
  readonly personId: string;
  readonly name: string;
  readonly sourcePath: string;
  readonly sourceFileIndex: number;
  readonly sourceSha256: string;
  readonly rawLevel: number;
  readonly rawLevelMax: number;
  readonly species: number;
  readonly npcType: number;
  readonly statusEffects: number;
  readonly action: number;
  readonly aniState: number;
  readonly statePosition: number;
  readonly currentAttackerId: string | null;
  /** Source NPC inventory configuration; entries are names, not generated stacks. */
  readonly treasureSets: readonly string[];
  /** Serialized slot templates and item identities; these are not generated treasure or active attachments. */
  readonly serializedEquipmentSlots: NativeNpcSerializedEquipmentSlots;
  /** Source-resolved weaponry plans; non-weapon treasure generation stays explicit. */
  readonly treasureSetResolutions: readonly ({ readonly status: 'unresolved'; readonly name: string; readonly reason: string } | NativeTreasureSetResolution)[];
  readonly navigationValid: true;
  readonly damageReceiverValid: true;
  readonly initialization: 'browser-source-processing-range-state';
  readonly processingRange: NativeNpcProcessingRangeState;
  hitPoints: number;
  stamina: number;
}

export interface BrowserArdeaNpcCombatSessionSave {
  readonly schema: typeof SESSION_SCHEMA;
  readonly actors: readonly {
    readonly personId: string;
    readonly sourcePath: string;
    readonly sourceSha256: string;
    readonly hitPoints: number;
    readonly stamina: number;
  }[];
}

export interface BrowserArdeaNpcRestoreResult {
  readonly restored: number;
  readonly skipped: readonly { readonly personId: string; readonly reason: string }[];
}

type CombatWorldSource = Pick<NativeWorldData, 'sourceByPath' | 'entityIndex' | 'entity' |
  'templateByNameWithSource' | 'templateByGuidWithSource' | 'template'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueSet(record: NativeEntityRecord, setName: string): boolean {
  return record.propertySets.filter((set) => set.name === setName).length === 1;
}

function sourceValue<T>(record: NativeEntityRecord, setName: string, property: string,
  accepts: (value: unknown) => value is T): T {
  const result = sourceProperty(record, setName, property);
  if (result.kind !== 'found' || !accepts(result.value)) {
    throw new Error(result.kind === 'found'
      ? `Source ${setName}.${property} has an unsupported value.`
      : result.kind === 'missing' ? result.reason
      : `Source ${setName}.${property} is ambiguous across ${result.candidates.length} values.`);
  }
  return result.value;
}

function int32(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= -0x80000000 && (value as number) <= 0x7fffffff;
}

function nonnegativeInt32(value: unknown): value is number {
  return int32(value) && (value as number) >= 0;
}

function sourceReference(person: ScenePerson): { path: string; entityIndex: number } {
  const match = /^.+ :: (.+) # entity (\d+)$/.exec(person.source);
  if (!match || !match[1]) throw new Error('Scene character source reference is not in the reviewed archive/path/entity form.');
  const entityIndex = Number(match[2]);
  if (!Number.isSafeInteger(entityIndex) || entityIndex < 0) throw new Error('Scene character source entity index is invalid.');
  return { path: match[1], entityIndex };
}

function slotProxy(properties: readonly unknown[], name: 'Template' | 'Item'): string {
  const matching = properties.filter((entry) => isRecord(entry) && entry.name === name);
  if (matching.length !== 1 || !isRecord(matching[0]) || matching[0].status !== 'decoded' ||
      !isRecord(matching[0].value)) {
    throw new Error(`Native inventory slot ${name} proxy is missing, undecoded or ambiguous.`);
  }
  const value = matching[0].value;
  if (value.present !== true || typeof value.rawGuid20 !== 'string' || !/^[a-f0-9]{40}$/i.test(value.rawGuid20)) {
    throw new Error(`Native inventory slot ${name} proxy is not one present 20-byte identity.`);
  }
  return value.rawGuid20.toLowerCase();
}

/** Read only the serialized inventory slot identities. Dynamic treasure sets,
 * item construction and slot attachment remain separate cache-in operations. */
function readSerializedEquipmentSlots(entity: NativeEntityRecord): NativeNpcSerializedEquipmentSlotRefs {
  const sets = entity.propertySets.filter((set) => set.name === 'gCInventory_PS');
  if (sets.length !== 1) return { status: 'unknown', reason: 'Native gCInventory_PS is missing or ambiguous.' };
  const tail = sets[0]!.tail;
  if (!tail || tail.status !== 'decoded' || !isRecord(tail.value) ||
      !Number.isSafeInteger(tail.value.slotCount) || !Array.isArray(tail.value.slots) ||
      tail.value.slotCount !== tail.value.slots.length || tail.value.slots.length > 256) {
    return { status: 'unknown', reason: 'Native serialized inventory slot tail is not completely decoded.' };
  }
  try {
    const slots = tail.value.slots.map((raw, index) => {
      if (!isRecord(raw) || raw.index !== index || typeof raw.empty !== 'boolean') {
        throw new Error('Native serialized inventory slot indices are incomplete or out of order.');
      }
      if (raw.empty) return null;
      const record = raw.record;
      if (!isRecord(record) || record.name !== 'gCInventorySlot' || !Array.isArray(record.properties)) {
        throw new Error('Native nonempty inventory slot has no decoded gCInventorySlot record.');
      }
      return Object.freeze({ index, templateGuid20: slotProxy(record.properties, 'Template'),
        itemGuid20: slotProxy(record.properties, 'Item') });
    }).filter((slot): slot is NonNullable<typeof slot> => slot !== null);
    return { status: 'resolved', slots: Object.freeze(slots) };
  } catch (error) {
    return { status: 'unknown', reason: error instanceof Error ? error.message : String(error) };
  }
}

async function resolveSerializedEquipmentSlots(refs: NativeNpcSerializedEquipmentSlotRefs,
  world: CombatWorldSource): Promise<NativeNpcSerializedEquipmentSlots> {
  if (refs.status === 'unknown') return refs;
  try {
    const slots = await Promise.all(refs.slots.map(async (slot) => {
      const header = indexedUnique(await world.templateByGuidWithSource(slot.templateGuid20),
        'serialized inventory slot template ' + slot.templateGuid20);
      const source = header.source;
      if (header.guid?.toLowerCase() !== slot.templateGuid20 || !header.name || !source?.path ||
          !/^[a-f0-9]{64}$/i.test(source.sha256)) {
        throw new Error('Serialized inventory slot template source identity is incomplete.');
      }
      const template = indexedUnique(await world.template(header), header.name);
      if (template.guid?.toLowerCase() !== slot.templateGuid20) {
        throw new Error('Serialized inventory slot template payload identity differs from its index.');
      }
      return Object.freeze({ ...slot, templateName: header.name,
        templateSourcePath: source.path, templateSourceSha256: source.sha256 });
    }));
    return { status: 'resolved', slots: Object.freeze(slots) };
  } catch (error) {
    return { status: 'unknown', reason: error instanceof Error ? error.message : String(error) };
  }
}

function indexedUnique<T>(result: SourceLookup<T>, label: string): T {
  if (result.kind !== 'found') throw new Error(result.kind === 'missing'
    ? result.reason
    : `Native ${label} has ${result.candidates.length} matching source records.`);
  return result.value;
}

async function loadNpcFacts(person: ScenePerson, world: CombatWorldSource): Promise<NativeNpcSourceFacts> {
  const sourceRef = sourceReference(person);
  const source: NativeSourceFile = indexedUnique(await world.sourceByPath(sourceRef.path), sourceRef.path);
  const rows = (await world.entityIndex(source.index)).filter((row) =>
    row.guid?.toLowerCase() === person.id.toLowerCase() && row.name === person.name && row.entityIndex === sourceRef.entityIndex);
  if (rows.length !== 1) throw new Error(`Scene character ${person.name} does not resolve to one exact native entity-index row.`);
  const entity = indexedUnique(await world.entity(rows[0]!), person.name);
  if (entity.guid?.toLowerCase() !== person.id.toLowerCase() || entity.name !== person.name ||
      !Array.isArray(entity.propertySets)) throw new Error('Loaded NPC source identity differs from the scene actor.');
  for (const required of ['gCNPC_PS', 'gCScriptRoutine_PS', 'gCNavigation_PS', 'gCDamageReceiver_PS', 'gCInventory_PS']) {
    if (!uniqueSet(entity, required)) throw new Error(`Native ${required} source set is missing or ambiguous for ${person.name}.`);
  }

  const level = sourceValue(entity, 'gCNPC_PS', 'Level', nonnegativeInt32);
  const levelMax = sourceValue(entity, 'gCNPC_PS', 'LevelMax', nonnegativeInt32);
  const species = sourceValue(entity, 'gCNPC_PS', 'Species', int32);
  const npcType = sourceValue(entity, 'gCNPC_PS', 'Type', int32);
  const statusEffects = sourceValue(entity, 'gCNPC_PS', 'StatusEffects', nonnegativeInt32);
  const action = sourceValue(entity, 'gCScriptRoutine_PS', 'Action', int32);
  const aniState = sourceValue(entity, 'gCScriptRoutine_PS', 'AniState', int32);
  const statePosition = sourceValue(entity, 'gCScriptRoutine_PS', 'StatePosition', int32);
  const treasureSets = Object.freeze([1, 2, 3, 4, 5].map((slot) =>
    sourceValue(entity, 'gCInventory_PS', 'TreasureSet' + slot, (value): value is string => typeof value === 'string')));
  const serializedEquipmentSlots = await resolveSerializedEquipmentSlots(readSerializedEquipmentSlots(entity), world);
  const attacker = sourceProperty(entity, 'gCNPC_PS', 'CurrentAttackerEntity');
  if (attacker.kind !== 'found' || !isRecord(attacker.value) || typeof attacker.value.present !== 'boolean' ||
      (attacker.value.rawGuid20 !== null && (typeof attacker.value.rawGuid20 !== 'string' ||
        !/^[a-f0-9]{40}$/i.test(attacker.value.rawGuid20)))) {
    throw new Error(attacker.kind === 'missing' ? attacker.reason
      : attacker.kind === 'ambiguous' ? 'Native CurrentAttackerEntity source value is ambiguous.'
      : 'Native CurrentAttackerEntity source value is malformed.');
  }
  if (attacker.value.present !== (typeof attacker.value.rawGuid20 === 'string')) {
    throw new Error('Native CurrentAttackerEntity presence and PropertyID disagree.');
  }
  const serializedPoints: NativeNpcSerializedPoints = {
    hitPoints: sourceValue(entity, 'gCDamageReceiver_PS', 'HitPoints', nonnegativeInt32),
    hitPointsMax: sourceValue(entity, 'gCDamageReceiver_PS', 'HitPointsMax', nonnegativeInt32),
    stamina: sourceValue(entity, 'gCDamageReceiver_PS', 'StaminaPoints', nonnegativeInt32),
    staminaMax: sourceValue(entity, 'gCDamageReceiver_PS', 'StaminaPointsMax', nonnegativeInt32),
  };
  return Object.freeze({ personId: person.id, name: person.name, sourcePath: sourceRef.path,
    sourceFileIndex: source.index, sourceSha256: source.source.sha256, level, levelMax, species, npcType,
    statusEffects, action, aniState, statePosition,
    currentAttackerId: typeof attacker.value.rawGuid20 === 'string' ? attacker.value.rawGuid20.toLowerCase() : null,
    treasureSets, serializedEquipmentSlots,
    navigationValid: true, serializedPoints: Object.freeze(serializedPoints) });
}

function validSavedActor(value: unknown): value is BrowserArdeaNpcCombatSessionSave['actors'][number] {
  return isRecord(value) && typeof value.personId === 'string' && /^[a-f0-9]{40}$/i.test(value.personId) &&
    typeof value.sourcePath === 'string' && value.sourcePath.length > 0 &&
    typeof value.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sourceSha256) &&
    nonnegativeInt32(value.hitPoints) && nonnegativeInt32(value.stamina);
}

/** Browser-owned mutable combat-state bridge for Ardea's source actors.
 *
 * This resolves each rendered person to one hash-checked source entity and
 * applies the exact HP/stamina refresh arithmetic at first contact. It does
 * not construct or activate the original engine entity, choose its native
 * processing radius, accept native collision, run AI tasks, or apply damage.
 */
export class BrowserArdeaNpcCombatRuntime {
  private readonly peopleById = new Map<string, ScenePerson>();
  private readonly actors = new Map<string, BrowserArdeaNpcCombatState>();

  constructor(people: readonly ScenePerson[], private readonly world: CombatWorldSource = new NativeWorldData()) {
    for (const person of people) {
      const id = person.id.toLowerCase();
      if (!/^[a-f0-9]{40}$/i.test(person.id) || this.peopleById.has(id)) {
        throw new Error('Ardea combat people need unique native 20-byte scene identities.');
      }
      this.peopleById.set(id, person);
    }
  }

  get(personId: string): BrowserArdeaNpcCombatState | null {
    return this.actors.get(personId.toLowerCase()) ?? null;
  }

  async initializeOnContact(personId: string, playerLevel: number,
    difficulty: NativeDifficulty): Promise<BrowserArdeaNpcCombatState> {
    const id = personId.toLowerCase();
    const existing = this.actors.get(id);
    if (existing) return existing;
    const person = this.peopleById.get(id);
    if (!person) throw new Error('Combat contact does not identify a placed Ardea source person.');
    const facts = await loadNpcFacts(person, this.world);
    const treasureSetResolutions: ({ readonly status: 'unresolved'; readonly name: string; readonly reason: string } | NativeTreasureSetResolution)[] = [];
    for (const treasureSetName of facts.treasureSets) {
      if (!treasureSetName) continue;
      try {
        treasureSetResolutions.push(await loadNativeTreasureSet(treasureSetName, facts.personId, this.world));
      } catch (error) {
        treasureSetResolutions.push(Object.freeze({ status: 'unresolved', name: treasureSetName,
          reason: error instanceof Error ? error.message : String(error) }));
      }
    }
    const initialized = initializeNativeNpcOnProcessingRange({ isPlayer: false, rawLevel: facts.level,
      rawLevelMax: facts.levelMax, species: facts.species }, facts.serializedPoints, playerLevel, difficulty);
    if (initialized.status !== 'resolved') throw new Error(initialized.reason);
    const state: BrowserArdeaNpcCombatState = {
      personId: facts.personId, name: facts.name, sourcePath: facts.sourcePath,
      sourceFileIndex: facts.sourceFileIndex, sourceSha256: facts.sourceSha256,
      rawLevel: facts.level, rawLevelMax: facts.levelMax, species: facts.species, npcType: facts.npcType,
      statusEffects: facts.statusEffects, action: facts.action, aniState: facts.aniState,
      statePosition: facts.statePosition, currentAttackerId: facts.currentAttackerId, treasureSets: facts.treasureSets,
      serializedEquipmentSlots: facts.serializedEquipmentSlots,
      treasureSetResolutions: Object.freeze(treasureSetResolutions),
      navigationValid: facts.navigationValid, damageReceiverValid: true,
      initialization: 'browser-source-processing-range-state', processingRange: initialized.value,
      hitPoints: initialized.value.hitPoints, stamina: initialized.value.stamina,
    };
    this.actors.set(id, state);
    return state;
  }

  saveData(): BrowserArdeaNpcCombatSessionSave {
    return Object.freeze({ schema: SESSION_SCHEMA, actors: Object.freeze([...this.actors.values()].map((actor) =>
      Object.freeze({ personId: actor.personId, sourcePath: actor.sourcePath, sourceSha256: actor.sourceSha256,
        hitPoints: actor.hitPoints, stamina: actor.stamina }))) });
  }

  async restore(value: unknown, playerLevel: number, difficulty: NativeDifficulty): Promise<BrowserArdeaNpcRestoreResult> {
    if (!isRecord(value) || value.schema !== SESSION_SCHEMA || !Array.isArray(value.actors) ||
        value.actors.length > this.peopleById.size || !value.actors.every(validSavedActor) ||
        new Set(value.actors.map((actor) => actor.personId.toLowerCase())).size !== value.actors.length) {
      return { restored: 0, skipped: Object.freeze([{ personId: '*', reason: 'Saved NPC combat state has an unsupported schema or shape.' }]) };
    }
    const skipped: { personId: string; reason: string }[] = [];
    for (const saved of value.actors) {
      try {
        const initialized = await this.initializeOnContact(saved.personId, playerLevel, difficulty);
        if (initialized.sourcePath !== saved.sourcePath || initialized.sourceSha256 !== saved.sourceSha256) {
          this.actors.delete(saved.personId.toLowerCase());
          throw new Error('Saved NPC state belongs to a different source file or source hash.');
        }
        if (saved.hitPoints > initialized.processingRange.hitPointsMax ||
            saved.stamina > initialized.processingRange.staminaMax) {
          this.actors.delete(saved.personId.toLowerCase());
          throw new Error('Saved NPC points exceed the re-derived native processing maxima.');
        }
        initialized.hitPoints = saved.hitPoints;
        initialized.stamina = saved.stamina;
      } catch (error) {
        skipped.push({ personId: saved.personId, reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return Object.freeze({ restored: value.actors.length - skipped.length, skipped: Object.freeze(skipped) });
  }
}
