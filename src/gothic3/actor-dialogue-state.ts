import type { DialogueEntity, NativeValue } from './dialogue';
import { NativeWorldData } from './native-data';
import type { NativeEntityIndex, NativeEntityRecord, NativeSourceFile,
  NativeWorldData as NativeWorldDataType, SourceLookup } from './native-data';
import type { ScenePerson } from './types';

export interface NativeActorDialogState {
  readonly hasNpc: boolean;
  readonly hasDialog: boolean;
  readonly talkedToPlayer: boolean;
  readonly tradeEnabled: boolean | null;
  readonly partyEnabled: boolean | null;
  readonly teachEnabled: boolean | null;
}

export type NativeActorDialogFlag = 'TradeEnabled' | 'PartyEnabled' | 'TeachEnabled';

interface SourceProperty { name: string; status?: string; value?: unknown }
interface SourcePropertySet { name: string; properties: SourceProperty[] }
export interface SourceArdeaActor { name: string; guid: string; propertySets: SourcePropertySet[] }

export interface SceneActorDialogSources {
  readonly actors: readonly SourceArdeaActor[];
  readonly sourceFiles: readonly { readonly archive: string; readonly path: string; readonly sha256: string }[];
}

type SceneActorWorld = Pick<NativeWorldDataType, 'sourceByPath' | 'entityIndex' | 'entity'>;

function sourceLookup<T>(result: SourceLookup<T>, label: string): T {
  if (result.kind !== 'found') throw new Error(result.kind === 'missing'
    ? result.reason
    : 'Native scene actor source is ambiguous: ' + label);
  return result.value;
}

function sourceReference(person: ScenePerson): { archive: string; path: string; entityIndex: number } {
  const match = /^(.+?) :: (.+) # entity (\d+)$/.exec(person.source);
  if (!match || !match[1] || !match[2]) throw new Error('Scene actor source reference is malformed: ' + person.name);
  const entityIndex = Number(match[3]);
  if (!Number.isSafeInteger(entityIndex) || entityIndex < 0) throw new Error('Scene actor entity index is invalid: ' + person.name);
  return { archive: match[1], path: match[2], entityIndex };
}

function actorSource(entity: NativeEntityRecord): SourceArdeaActor {
  return {
    name: entity.name,
    guid: entity.guid ?? '',
    propertySets: entity.propertySets.map((set) => ({ name: set.name, properties: [
      ...Object.entries(set.values).map(([name, value]) => ({ name, status: 'decoded', value })),
      ...(set.unknownProperties ?? []).map((property) => ({ name: property.name, status: property.status })),
      ...(set.duplicateProperties ?? []).map((property) => ({ name: property.name, status: 'duplicate', value: property.value })),
    ] })),
  };
}

/** Resolve every rendered scene actor to the exact indexed native world record.
 * This reads serialized NPC/Dialog properties only; it does not activate the
 * original entity, context, routine, AI or PVS state. */
export async function loadSceneActorDialogSources(people: readonly ScenePerson[],
  world: SceneActorWorld = new NativeWorldData()): Promise<SceneActorDialogSources> {
  const references = people.map((person) => ({ person, ref: sourceReference(person) }));
  if (new Set(references.map(({ person }) => person.id.toLowerCase())).size !== references.length) {
    throw new Error('Scene actor source list contains duplicate native identities.');
  }
  const paths = [...new Set(references.map(({ ref }) => ref.path))].sort();
  const sources = new Map<string, NativeSourceFile>();
  await Promise.all(paths.map(async (path) => {
    const source = sourceLookup(await world.sourceByPath(path), path);
    const expectedArchives = new Set(references.filter((entry) => entry.ref.path === path).map((entry) => entry.ref.archive));
    if (expectedArchives.size !== 1 || source.source.archive !== [...expectedArchives][0]) {
      throw new Error('Scene actor archive/path identity differs for ' + path);
    }
    sources.set(path, source);
  }));
  const indexes = new Map<string, readonly NativeEntityIndex[]>();
  await Promise.all(paths.map(async (path) => indexes.set(path, await world.entityIndex(sources.get(path)!.index))));
  const actors = await Promise.all(references.map(async ({ person, ref }) => {
    const source = sources.get(ref.path)!;
    const rows = indexes.get(ref.path)!.filter((row) => row.file === source.index && row.entityIndex === ref.entityIndex &&
      row.name === person.name && row.guid?.toLowerCase() === person.id.toLowerCase());
    if (rows.length !== 1) throw new Error(rows.length
      ? 'Scene actor identity resolves to multiple native entity-index rows: ' + person.name
      : 'Scene actor does not resolve to its exact native entity-index row: ' + person.name);
    const entity = sourceLookup(await world.entity(rows[0]!), person.name);
    if (entity.name !== person.name || entity.guid?.toLowerCase() !== person.id.toLowerCase()) {
      throw new Error('Loaded scene actor identity differs from its rendered actor: ' + person.name);
    }
    return actorSource(entity);
  }));
  const sourceFiles = paths.map((path) => {
    const source = sources.get(path)!.source;
    return Object.freeze({ archive: source.archive, path: source.path, sha256: source.sha256 });
  });
  return Object.freeze({ actors: Object.freeze(actors), sourceFiles: Object.freeze(sourceFiles) });
}

interface ActorRow {
  readonly id: string;
  readonly name: string;
  readonly hasNpc: boolean;
  readonly hasDialog: boolean;
  readonly sourceTalkedToPlayer: boolean;
  readonly sourceTradeEnabled: boolean;
  readonly sourcePartyEnabled: boolean;
  readonly sourceTeachEnabled: boolean;
  talkedToPlayer: boolean;
  tradeEnabled: boolean;
  partyEnabled: boolean;
  teachEnabled: boolean;
}

function actorId(id: string): string {
  const normalized = id.toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(normalized)) throw new Error('Native Ardea actor needs its 20-byte entity ID');
  return normalized;
}

function flag(properties: readonly SourceProperty[], name: string): boolean {
  const matches = properties.filter((property) => property.name === name);
  if (matches.length !== 1 || matches[0]!.status !== 'decoded' || typeof matches[0]!.value !== 'boolean') {
    throw new Error('Native Ardea actor source has no unique decoded ' + name + ' value');
  }
  return matches[0]!.value as boolean;
}

/** Source-seeded Dialog_PS facts for the named Ardea actors. NPC death/wound
 * state remains a separate, unresolved actor-runtime service. */
export class NativeArdeaActorDialogState {
  private readonly rows = new Map<string, ActorRow>();
  private readonly active = new Set<string>();

  constructor(source: readonly SourceArdeaActor[]) {
    for (const entity of source) {
      if (!entity || typeof entity.name !== 'string' || !entity.name || !Array.isArray(entity.propertySets)) {
        throw new Error('Invalid native Ardea actor source record');
      }
      const id = actorId(entity.guid);
      const npcSets = entity.propertySets.filter((set) => set.name === 'gCNPC_PS');
      const dialogSets = entity.propertySets.filter((set) => set.name === 'gCDialog_PS');
      if (npcSets.length > 1 || dialogSets.length > 1) throw new Error('Duplicate native Ardea actor property set: ' + entity.name);
      const hasDialog = dialogSets.length === 1;
      const sourceTalkedToPlayer = hasDialog ? flag(dialogSets[0]!.properties, 'TalkedToPlayer') : false;
      const tradeEnabled = hasDialog ? flag(dialogSets[0]!.properties, 'TradeEnabled') : false;
      const partyEnabled = hasDialog ? flag(dialogSets[0]!.properties, 'PartyEnabled') : false;
      const teachEnabled = hasDialog ? flag(dialogSets[0]!.properties, 'TeachEnabled') : false;
      const row: ActorRow = { id, name: entity.name, hasNpc: npcSets.length === 1, hasDialog,
        sourceTalkedToPlayer, sourceTradeEnabled: tradeEnabled, sourcePartyEnabled: partyEnabled,
        sourceTeachEnabled: teachEnabled, talkedToPlayer: sourceTalkedToPlayer, tradeEnabled, partyEnabled, teachEnabled };
      if (this.rows.has(id)) {
        throw new Error('Duplicate native Ardea actor identity: ' + entity.name);
      }
      this.rows.set(id, row);
    }
  }

  dialog(entity: DialogueEntity): NativeValue<NativeActorDialogState> {
    const row = this.rows.get(actorId(entity.id));
    if (!row) return { known: false, reason: 'Native NPC/Dialog property state is not loaded for ' + entity.name + '.' };
    if (row.name !== entity.name) return { known: false, reason: 'Native entity ID/name identity differs for ' + entity.name + '.' };
    return { known: true, value: { hasNpc: row.hasNpc, hasDialog: row.hasDialog,
      talkedToPlayer: row.talkedToPlayer, tradeEnabled: row.hasDialog ? row.tradeEnabled : null,
      partyEnabled: row.hasDialog ? row.partyEnabled : null, teachEnabled: row.hasDialog ? row.teachEnabled : null } };
  }

  dialogFlag(entity: DialogueEntity, field: NativeActorDialogFlag): NativeValue<boolean | null> {
    const state = this.dialog(entity);
    const key = field === 'TradeEnabled' ? 'tradeEnabled' : field === 'PartyEnabled' ? 'partyEnabled' : 'teachEnabled';
    return state.known ? { known: true, value: state.value[key] }
      : state;
  }

  setDialogFlag(entity: DialogueEntity, field: NativeActorDialogFlag, value: boolean): NativeValue<true> {
    if (typeof value !== 'boolean') return { known: false, reason: 'Native Dialog.' + field + ' requires a bool.' };
    const state = this.dialog(entity);
    if (!state.known) return state;
    if (!state.value.hasDialog) return { known: false, reason: 'Native Dialog.' + field + ' target has no Dialog property set.' };
    const row = this.rows.get(actorId(entity.id))!;
    if (field === 'TradeEnabled') row.tradeEnabled = value;
    else if (field === 'PartyEnabled') row.partyEnabled = value;
    else row.teachEnabled = value;
    return { known: true, value: true };
  }

  setTradeEnabled(entity: DialogueEntity, value: boolean): NativeValue<true> {
    return this.setDialogFlag(entity, 'TradeEnabled', value);
  }

  beginInfoManager(entity: DialogueEntity): NativeValue<true> {
    const state = this.dialog(entity);
    if (!state.known) return state;
    if (!state.value.hasNpc || !state.value.hasDialog) {
      return { known: false, reason: 'Native dialogue participant lacks its NPC or Dialog property set.' };
    }
    this.active.add(actorId(entity.id));
    return { known: true, value: true };
  }

  /** gCInfoManager_PS::EndInfoManager marks each non-player dialog participant. */
  endInfoManager(entity: DialogueEntity): void {
    const id = actorId(entity.id);
    const row = this.rows.get(id);
    if (!row || row.name !== entity.name) throw new Error('Native InfoManager participant does not match Ardea source state');
    if (!this.active.delete(id)) return;
    row.talkedToPlayer = true;
  }

  currentTalkedToPlayerIds(): string[] {
    return [...this.rows.values()].filter((row) => row.talkedToPlayer).map((row) => row.id).sort();
  }

  currentTradeEnabledIds(): string[] {
    return this.currentEnabledDialogActorIds('TradeEnabled');
  }

  currentEnabledDialogActorIds(field: NativeActorDialogFlag): string[] {
    const key = field === 'TradeEnabled' ? 'tradeEnabled' : field === 'PartyEnabled' ? 'partyEnabled' : 'teachEnabled';
    return [...this.rows.values()].filter((row) => row.hasDialog && row[key]).map((row) => row.id).sort();
  }

  restoreTalkedToPlayerIds(ids: readonly string[]): void {
    const restored = new Set<string>();
    for (const value of ids) {
      const id = actorId(value);
      const row = this.rows.get(id);
      if (!row || !row.hasDialog || restored.has(id)) throw new Error('Browser save has an invalid or duplicate Ardea dialog actor: ' + id);
      restored.add(id);
    }
    for (const row of this.rows.values()) row.talkedToPlayer = row.sourceTalkedToPlayer || restored.has(row.id);
    this.active.clear();
  }

  restoreTradeEnabledIds(ids: readonly string[]): void {
    this.restoreEnabledDialogActorIds('TradeEnabled', ids);
  }

  restoreEnabledDialogActorIds(field: NativeActorDialogFlag, ids: readonly string[],
    sourceOnlyIds?: ReadonlySet<string>): void {
    const restored = new Set<string>();
    for (const value of ids) {
      const id = actorId(value);
      const row = this.rows.get(id);
      if (!row || !row.hasDialog || restored.has(id)) throw new Error('Browser save has an invalid or duplicate Ardea Dialog.' + field + ' actor: ' + id);
      restored.add(id);
    }
    const key = field === 'TradeEnabled' ? 'tradeEnabled' : field === 'PartyEnabled' ? 'partyEnabled' : 'teachEnabled';
    const sourceKey = field === 'TradeEnabled' ? 'sourceTradeEnabled' : field === 'PartyEnabled' ? 'sourcePartyEnabled' : 'sourceTeachEnabled';
    for (const row of this.rows.values()) {
      row[key] = sourceOnlyIds && !sourceOnlyIds.has(row.id) ? row.hasDialog && row[sourceKey]
        : row.hasDialog && restored.has(row.id);
    }
  }
}
