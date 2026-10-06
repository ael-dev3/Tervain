import type { DialogueEntity, NativeValue } from './dialogue';

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

interface ActorRow {
  readonly id: string;
  readonly name: string;
  readonly hasNpc: boolean;
  readonly hasDialog: boolean;
  readonly sourceTalkedToPlayer: boolean;
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
        sourceTalkedToPlayer, talkedToPlayer: sourceTalkedToPlayer, tradeEnabled, partyEnabled, teachEnabled };
      if (this.rows.has(id) || [...this.rows.values()].some((existing) => existing.name === row.name)) {
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

  restoreEnabledDialogActorIds(field: NativeActorDialogFlag, ids: readonly string[]): void {
    const restored = new Set<string>();
    for (const value of ids) {
      const id = actorId(value);
      const row = this.rows.get(id);
      if (!row || !row.hasDialog || restored.has(id)) throw new Error('Browser save has an invalid or duplicate Ardea Dialog.' + field + ' actor: ' + id);
      restored.add(id);
    }
    const key = field === 'TradeEnabled' ? 'tradeEnabled' : field === 'PartyEnabled' ? 'partyEnabled' : 'teachEnabled';
    for (const row of this.rows.values()) row[key] = row.hasDialog && restored.has(row.id);
  }
}
