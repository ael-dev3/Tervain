/** Original startup callback order for the audited installed Gothic3 build.
 *
 * This planner is not a fabricated liberated-Ardea start. The host must prepare
 * every effect against a detached draft and publish the draft in one atomic
 * revision-checked operation. Missing script, enclave, quest, inventory or ROI
 * semantics block the entire plan. Completing this callback does not mean that
 * the remaining session warmup/menu-return/intro/AI lifecycle is implemented.
 * Receipts: public/gothic3/startup/{native-startup,source-manifest}.json.
 */
import startupReceiptText from '../../assets/gothic3/startup/source-manifest.json?raw';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export const NATIVE_STARTUP_INPUTS = Object.freeze({
  Script_Game: '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1',
  Game: 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f',
});

export type StartupKnowledge<T> =
  | { readonly status: 'known'; readonly value: T; readonly source: string }
  | { readonly status: 'unknown'; readonly reason: string };

export type StartupResult<T> =
  | { readonly status: 'resolved'; readonly value: T; readonly evidence: readonly string[] }
  | { readonly status: 'unsupported'; readonly reason: string; readonly dependencies: readonly string[];
      readonly effects: readonly []; readonly gameplayReady: false };

export type NativeStartupEntityName =
  | 'PC_Hero' | 'Ardea' | 'Ardea_Orkboss' | 'Gorn' | 'Larson' | 'Yepas'
  | 'AlShedim_TempleDoor_Tester_01';

/** A resolved None is different from an entity not yet loaded or looked up. */
export interface NativeStartupEntity {
  readonly id: string;
  readonly guid20: string;
  readonly name: NativeStartupEntityName;
  readonly propertySets: readonly string[];
  readonly worldMatrixCm: readonly number[];
  readonly source: string;
}

export type NativeStartupEntityLookups = Readonly<Record<NativeStartupEntityName,
  StartupKnowledge<NativeStartupEntity | null>>>;

export interface NativeScriptHelperReset {
  readonly receiverVA: string;
  readonly bodyVA: string;
  readonly callVA: string;
  readonly effects: readonly Readonly<Record<string, unknown>>[];
}

export interface NativeStartupDocument {
  readonly schema: 'gothic3-native-startup-v1';
  readonly version: 1;
  readonly profile: 'installed-build-new-game-start0';
  readonly inputs: Readonly<Record<keyof typeof NATIVE_STARTUP_INPUTS, { readonly sha256: string }>>;
  readonly onInitHelpers: readonly NativeScriptHelperReset[];
  readonly startupOperations: readonly Readonly<Record<string, unknown>>[];
  readonly callbackOrder: readonly string[];
  readonly entities: readonly {
    readonly key: string; readonly name: NativeStartupEntityName; readonly guid20: string;
    readonly worldMatrixCm: readonly number[]; readonly source: Readonly<Record<string, unknown>>;
    readonly classes: Readonly<Record<string, { readonly version: number; readonly values: Readonly<Record<string, unknown>> }>>;
  }[];
  readonly limitations: readonly string[];
  readonly audit: Readonly<Record<string, unknown>>;
  readonly gornExitCallback: Readonly<Record<string, unknown>>;
  readonly returnFromMenuCallback: Readonly<Record<string, unknown>>;
}

export type NativeStartupHandler =
  | 'script-helper-reset' | 'entity-caches' | 'player-memory-and-stat-setters'
  | 'world-matrix-write' | 'npc-property-write' | 'navigation-routine'
  | 'enclave-property-write' | 'notify-enclave-event2' | 'quest-run'
  | 'interaction-property-write' | 'inventory-populate0'
  | 'quest-close' | 'move-to-selected-working-point';

export interface NativeStartupImplementation {
  readonly status: 'implemented';
  /** Native receipts and actual host implementation path; not a feature label. */
  readonly evidence: readonly string[];
}

export interface NativeStartupContext {
  readonly revision: string;
  readonly document: NativeStartupDocument;
  readonly inputHashes: Readonly<Record<keyof typeof NATIVE_STARTUP_INPUTS, string>>;
  readonly sessionStartMode: number;
  readonly phase: 'serialized-before-OnInit' | 'after-OnInit-before-OnGameStartUp' | 'other';
  readonly worldLoaded: StartupKnowledge<boolean>;
  readonly playerAndCameraSelected: StartupKnowledge<boolean>;
  readonly navigationSceneCompiled: StartupKnowledge<boolean>;
  readonly onPlayerChangedCompleted: StartupKnowledge<boolean>;
  /** If OnInit was performed separately, retain its successful transaction receipt. */
  readonly onInitReceipt: StartupKnowledge<NativeStartupCommitReceipt | null>;
  readonly playerMemoryValid: StartupKnowledge<boolean>;
  readonly playerIsTransformed: StartupKnowledge<boolean>;
  readonly entities: NativeStartupEntityLookups;
  readonly implementations: Readonly<Partial<Record<NativeStartupHandler, NativeStartupImplementation>>>;
}

export type NativeStartupEffect =
  | { readonly kind: 'resetScriptHelper'; readonly reset: NativeScriptHelperReset; readonly source: 'Script_Game:100d0470' }
  | { readonly kind: 'resetEntityCaches'; readonly fields: readonly ['ms_arrEntities', 'ms_arrNPCs', 'ms_u32LastFrame', 'ms_Player']; readonly source: 'Script_Game:100cfb70' }
  | { readonly kind: 'setPlayerChapter'; readonly entityId: string; readonly value: 1; readonly source: 'Script_Game:100cfb70' }
  | { readonly kind: 'setWorldMatrix'; readonly entityId: string; readonly matrixCm: readonly number[]; readonly source: 'Script_Game:100cfa10' }
  | { readonly kind: 'setNpcAlignment'; readonly entityId: string; readonly alignment: 7; readonly source: 'Script_Game:100cfa10' }
  | { readonly kind: 'logWarning'; readonly severity: 3; readonly message: string; readonly source: 'Script_Game:100cfa10' }
  | { readonly kind: 'setNavigationRoutine'; readonly entityId: string; readonly routine: 'Start' | 'GothaPrison'; readonly source: string }
  | { readonly kind: 'setEnclaveAlignment'; readonly entityId: string; readonly alignment: 1; readonly source: 'Script_Game:100cfb70' }
  | { readonly kind: 'setEnclaveRaid' | 'setEnclaveRevolution'; readonly entityId: string; readonly value: true; readonly source: 'Script_Game:100cfb70' }
  | { readonly kind: 'notifyEnclave'; readonly selfId: string; readonly otherId: string; readonly event: 2; readonly source: 'Script_Game:100755e0' }
  | { readonly kind: 'runQuest'; readonly quest: 'Xardas_FindXardas'; readonly source: 'Script_Game:100cfb70' }
  | { readonly kind: 'setExitRoiScript'; readonly entityId: string; readonly script: 'OnExit_Gorn' | ''; readonly source: string }
  | { readonly kind: 'setPlayerStat'; readonly entityId: string; readonly setter: NativeStartupStatSetter; readonly value: number; readonly source: string }
  | { readonly kind: 'setPlayerLearningPointsAttributes'; readonly entityId: string; readonly value: 0; readonly source: 'Script_Game:100cfb70' }
  | { readonly kind: 'inventoryPopulate'; readonly selfId: string; readonly otherId: null; readonly argument: 0; readonly source: 'Script_Game:10091ad0' }
  | { readonly kind: 'closeQuest'; readonly quest: 'Gorn_ShowReddock'; readonly source: 'Script_Game:100d3590' }
  | { readonly kind: 'moveToSelectedWorkingPoint'; readonly entityId: string; readonly source: 'Script_Game:100d3590' };

export type NativeStartupStatSetter =
  | 'SetHitPointsMax' | 'SetHitPoints' | 'SetManaPointsMax' | 'SetManaPoints'
  | 'SetStaminaPointsMax' | 'SetStaminaPoints' | 'SetStrength' | 'SetDexterity'
  | 'SetIntelligence' | 'SetSmithing' | 'SetTheft' | 'SetAlchemy'
  | 'SetProtectionBlades' | 'SetProtectionImpact' | 'SetProtectionMissile'
  | 'SetProtectionFire' | 'SetProtectionIce' | 'SetProtectionLightning';

export interface NativeStartupPlan {
  readonly profile: 'installed-build-new-game-start0';
  readonly basisRevision: string;
  readonly callbacks: readonly ('OnInit' | 'OnGameStartUp' | 'OnExit_Gorn')[];
  readonly effects: readonly NativeStartupEffect[];
  readonly requiredHandlers: readonly NativeStartupHandler[];
  readonly nativeReturnValue: 1;
  readonly gameplayReady: false;
  readonly remainingSessionSteps: readonly string[];
}

export interface NativeStartupCommitReceipt {
  readonly profile: 'installed-build-new-game-start0';
  readonly inputHashes: Readonly<Record<keyof typeof NATIVE_STARTUP_INPUTS, string>>;
  readonly callbacks: readonly ('OnInit' | 'OnGameStartUp' | 'OnExit_Gorn')[];
  readonly beforeRevision: string;
  readonly afterRevision: string;
  readonly nativeReturnValue: 1;
  readonly gameplayReady: false;
}

const HELPERS = [
  ['102203d8', '10009400'], ['102203dc', '10009680'], ['102203e4', '1000e380'],
  ['102203fc', '1000ebc0'], ['102203d9', '1000a6f0'], ['10220420', '1000ed50'],
  ['10220640', '1000a800'], ['10220650', '1000ee40'], ['10220678', '1000a9a0'],
  ['102203da', '1000adc0'], ['102203db', '1000b3e0'], ['10220e84', '1000b4a0'],
] as const;

const STATS: readonly (readonly [NativeStartupStatSetter, number, string])[] = [
  ['SetHitPointsMax', 200, '10045c90'], ['SetHitPoints', 200, '10045b20'],
  ['SetManaPointsMax', 100, '100462a0'], ['SetManaPoints', 100, '100461d0'],
  ['SetStaminaPointsMax', 100, '10046960'], ['SetStaminaPoints', 100, '100467f0'],
  ['SetStrength', 100, '100443c0'], ['SetDexterity', 100, '10044490'],
  ['SetIntelligence', 0, '10044560'], ['SetSmithing', 10, '10044700'],
  ['SetTheft', 10, '100447d0'], ['SetAlchemy', 10, '10044630'],
  ['SetProtectionBlades', 0, '10044f00'], ['SetProtectionImpact', 0, '10044fd0'],
  ['SetProtectionMissile', 0, '100450a0'], ['SetProtectionFire', 0, '10045170'],
  ['SetProtectionIce', 0, '10045240'], ['SetProtectionLightning', 0, '10045310'],
];

const WARNING = 'OnGameStartUpDirtyHack - Mattes hack faild because AlShedim_TempleDoor_Tester_01 is not in da house!';
const AFTER_CALLBACK = Object.freeze([
  'Clock CLI time override if present, factor12, ResumeClock', 'Session.Resume',
  'New-game engine component disable and channel0 mute',
  '20 engine-process warmup iterations with native Sleep100ms', 'CloseMenu/ClosePage',
  'OnReturnFromMenu including NPC health/stamina refresh', 'G3_Intro.bik and restore audio/component',
  'Optional TUT_Start and thread-pool restoration', 'Native ongoing AI/ROI/contact scheduling',
]);

function unsupported(reason: string, ...dependencies: string[]): StartupResult<never> {
  return { status: 'unsupported', reason, dependencies, effects: [], gameplayReady: false };
}

function sourceInputsMatch(inputs: Readonly<Record<keyof typeof NATIVE_STARTUP_INPUTS, string>>): boolean {
  return inputs.Script_Game === NATIVE_STARTUP_INPUTS.Script_Game && inputs.Game === NATIVE_STARTUP_INPUTS.Game;
}

function freezeTree(value: unknown, seen = new Set<object>()): void {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const item of Object.values(value)) freezeTree(item, seen);
  Object.freeze(value);
}

let startupDocumentRequest: Promise<NativeStartupDocument> | null = null;
const verifiedDocuments = new WeakSet<object>();
const verifiedPlans = new WeakSet<object>();
const committedReceipts = new WeakSet<object>();

/** Hash-verified read-only source recipe; loading it applies no startup effects. */
export function loadNativeStartupDocument(): Promise<NativeStartupDocument> {
  if (!startupDocumentRequest) {
    startupDocumentRequest = (async () => {
      const manifest = JSON.parse(startupReceiptText) as {
        schema?: string; version?: number;
        nativeDocument?: ResourceReceipt & { url: string };
      };
      const receipt = manifest.nativeDocument;
      if (manifest.schema !== 'gothic3-native-startup-manifest-v1' || manifest.version !== 1 ||
          !receipt || receipt.url !== 'startup/native-startup.json' ||
          !/^[0-9a-f]{64}$/.test(receipt.sha256) || !Number.isSafeInteger(receipt.bytes) || receipt.bytes < 1) {
        throw new Error('Invalid bundled native startup output receipt.');
      }
      const raw = await readNativeResource<unknown>(receipt.url, receipt);
      const parsed = parseNativeStartupDocument(raw);
      if (parsed.status === 'unsupported') throw new Error(parsed.reason);
      verifiedDocuments.add(parsed.value);
      return parsed.value;
    })().catch((error: unknown) => {
      startupDocumentRequest = null;
      throw error;
    });
  }
  return startupDocumentRequest;
}

/** Structural inspection only. Planning additionally requires loader-verified
 * bytes so caller-supplied helper operations cannot impersonate native resets. */
export function parseNativeStartupDocument(raw: unknown): StartupResult<NativeStartupDocument> {
  if (!raw || typeof raw !== 'object') return unsupported('Invalid native startup document.', 'native-startup.json');
  const value = raw as Partial<NativeStartupDocument>;
  if (value.schema !== 'gothic3-native-startup-v1' || value.version !== 1 || value.profile !== 'installed-build-new-game-start0') {
    return unsupported('Unsupported native startup document profile.', 'installed build receipt');
  }
  if (!value.inputs || value.inputs.Script_Game?.sha256 !== NATIVE_STARTUP_INPUTS.Script_Game ||
      value.inputs.Game?.sha256 !== NATIVE_STARTUP_INPUTS.Game) {
    return unsupported('Native startup input hash mismatch.', 'installed build PE hashes');
  }
  if (!Array.isArray(value.onInitHelpers) || value.onInitHelpers.length !== HELPERS.length ||
      value.onInitHelpers.some((row, i) => !row || row.receiverVA !== HELPERS[i]![0] ||
        row.bodyVA !== HELPERS[i]![1] || !Array.isArray(row.effects))) {
    return unsupported('OnInit helper order is incomplete.', '12 original helper resets');
  }
  if (!Array.isArray(value.startupOperations)) return unsupported('Missing startup recipe.', 'ordered original callback effects');
  const actualStats = value.startupOperations.filter(row => row.kind === 'setPlayerStat');
  if (actualStats.length !== STATS.length || actualStats.some((row, i) => row.setter !== STATS[i]![0] || row.value !== STATS[i]![1] || row.body !== '0x' + STATS[i]![2])) {
    return unsupported('Player startup setters differ from audited recipe.', '18 original stat setter calls');
  }
  if (!Array.isArray(value.entities) || value.entities.length !== 7 || !Array.isArray(value.callbackOrder) ||
      value.callbackOrder[0] !== 'OnInit' || value.callbackOrder[1] !== 'OnGameStartUp' ||
      !Array.isArray(value.limitations) || !value.audit || !value.gornExitCallback || !value.returnFromMenuCallback) {
    return unsupported('Native startup source evidence is incomplete.', 'source entities and callback lifecycle receipts');
  }
  // No request to accept arbitrary JSON operations: the planner constructs its
  // known recipe below; only the explicitly retained helper resets are carried.
  freezeTree(value);
  return { status: 'resolved', value: value as NativeStartupDocument,
    evidence: ['Script_Game:100d0470', 'Script_Game:100cfb70', 'Game:20376690'] };
}

function validateContext(context: NativeStartupContext): StartupResult<true> {
  if (!sourceInputsMatch(context.inputHashes)) return unsupported('Native input profile differs.', 'installed build hashes');
  if (!verifiedDocuments.has(context.document)) return unsupported('Startup document has not passed the pinned byte loader.', 'loadNativeStartupDocument');
  const parsed = parseNativeStartupDocument(context.document);
  if (parsed.status === 'unsupported') return parsed;
  if (context.sessionStartMode !== 0) return unsupported('OnGameStartUp is new-game mode0 only.', 'gCSession::Start mode0');
  for (const [name, item] of [
    ['worldLoaded', context.worldLoaded], ['playerAndCameraSelected', context.playerAndCameraSelected],
    ['navigationSceneCompiled', context.navigationSceneCompiled], ['onPlayerChangedCompleted', context.onPlayerChangedCompleted],
  ] as const) {
    if (item.status === 'unknown' || !item.value) return unsupported('Native session prerequisite is unresolved.', name);
  }
  if (!context.revision) return unsupported('Missing startup transaction revision.', 'source-state revision');
  if (context.phase !== 'serialized-before-OnInit' && context.phase !== 'after-OnInit-before-OnGameStartUp') {
    return unsupported('Player seed is not a fresh native startup phase.', 'serialized source state before startup');
  }
  if (context.phase === 'after-OnInit-before-OnGameStartUp') {
    const receipt = context.onInitReceipt;
    if (receipt.status === 'unknown' || !receipt.value || receipt.value.profile !== 'installed-build-new-game-start0' ||
        !sourceInputsMatch(receipt.value.inputHashes) || receipt.value.afterRevision !== context.revision ||
        receipt.value.callbacks.length !== 1 || receipt.value.callbacks[0] !== 'OnInit' || !committedReceipts.has(receipt.value)) {
      return unsupported('OnInit completion lacks a matching committed receipt.', 'successful standalone OnInit transaction');
    }
  }
  if (context.playerMemoryValid.status === 'unknown' || !context.playerMemoryValid.value ||
      context.playerIsTransformed.status === 'unknown' || context.playerIsTransformed.value) {
    return unsupported('Only original untransformed PlayerMemory startup setters are supported.', 'valid Hero PlayerMemory', 'untransformed Hero');
  }
  return { status: 'resolved', value: true, evidence: ['Game:20376690', 'Script_Game:100cfb70'] };
}

function requireEntity(context: NativeStartupContext, name: NativeStartupEntityName, requiredClass?: string): StartupResult<NativeStartupEntity> {
  const lookup = context.entities[name];
  if (lookup.status === 'unknown') return unsupported('Entity lookup is unresolved: ' + name, lookup.reason);
  const entity = lookup.value;
  if (!entity) return unsupported('Required native startup entity is absent: ' + name, name);
  if (entity.name !== name || !entity.id || !/^[0-9a-f]{40}$/i.test(entity.guid20) || !entity.source) {
    return unsupported('Entity identity lacks source evidence: ' + name, 'unique source name/GUID resolution');
  }
  const original = context.document.entities.find(row => row.name === name);
  if (!original || original.guid20 !== entity.guid20) return unsupported('Resolved entity is not the reviewed original startup identity.', name);
  if (requiredClass && !entity.propertySets.includes(requiredClass)) {
    return unsupported('Required property set is absent: ' + name, requiredClass);
  }
  return { status: 'resolved', value: entity, evidence: [entity.source] };
}

function requiredHandlers(effects: readonly NativeStartupEffect[]): NativeStartupHandler[] {
  const handlers = new Set<NativeStartupHandler>();
  for (const effect of effects) {
    switch (effect.kind) {
      case 'resetScriptHelper': if (effect.reset.effects.length) handlers.add('script-helper-reset'); break;
      case 'resetEntityCaches': handlers.add('entity-caches'); break;
      case 'setPlayerChapter': case 'setPlayerStat': case 'setPlayerLearningPointsAttributes': handlers.add('player-memory-and-stat-setters'); break;
      case 'setWorldMatrix': handlers.add('world-matrix-write'); break;
      case 'setNpcAlignment': handlers.add('npc-property-write'); break;
      case 'setNavigationRoutine': handlers.add('navigation-routine'); break;
      case 'setEnclaveAlignment': case 'setEnclaveRaid': case 'setEnclaveRevolution': handlers.add('enclave-property-write'); break;
      case 'notifyEnclave': handlers.add('notify-enclave-event2'); break;
      case 'runQuest': handlers.add('quest-run'); break;
      case 'setExitRoiScript': handlers.add('interaction-property-write'); break;
      case 'inventoryPopulate': handlers.add('inventory-populate0'); break;
      case 'closeQuest': handlers.add('quest-close'); break;
      case 'moveToSelectedWorkingPoint': handlers.add('move-to-selected-working-point'); break;
      case 'logWarning': break;
    }
  }
  return [...handlers];
}

function finishPlan(context: NativeStartupContext, callbacks: NativeStartupPlan['callbacks'], effects: NativeStartupEffect[], remaining: readonly string[]): StartupResult<NativeStartupPlan> {
  const handlers = requiredHandlers(effects);
  const missing = handlers.filter(name => context.implementations[name]?.status !== 'implemented' ||
    !context.implementations[name]?.evidence.length);
  if (missing.length) return unsupported('Native startup effect handlers are incomplete; no prefix is applicable.', ...missing);
  const plan: NativeStartupPlan = { profile: 'installed-build-new-game-start0',
    basisRevision: context.revision, callbacks, effects, requiredHandlers: handlers,
    nativeReturnValue: 1, gameplayReady: false, remainingSessionSteps: remaining };
  freezeTree(plan);
  verifiedPlans.add(plan);
  return { status: 'resolved', value: plan,
    evidence: callbacks.map(name => name === 'OnInit' ? 'Script_Game:100d0470' : name === 'OnGameStartUp' ? 'Script_Game:100cfb70' : 'Script_Game:100d3590') };
}

/** Standalone OnInit can be committed first, and its receipt used for startup. */
export function planNativeOnInit(context: NativeStartupContext): StartupResult<NativeStartupPlan> {
  const checked = validateContext(context);
  if (checked.status === 'unsupported') return checked;
  if (context.phase !== 'serialized-before-OnInit') return unsupported('OnInit has already been reached or completed.', 'before-OnInit source phase');
  return finishPlan(context, ['OnInit'], context.document.onInitHelpers.map(reset => ({
    kind: 'resetScriptHelper', reset, source: 'Script_Game:100d0470',
  })), ['OnGameStartUp', ...AFTER_CALLBACK]);
}

/** Include OnInit first for source state, or require its actual commit receipt. */
export function planNativeGameStartUp(context: NativeStartupContext): StartupResult<NativeStartupPlan> {
  const checked = validateContext(context);
  if (checked.status === 'unsupported') return checked;
  const player = requireEntity(context, 'PC_Hero', 'gCPlayerMemory_PS');
  const ardea = requireEntity(context, 'Ardea', 'gCEnclave_PS');
  const boss = requireEntity(context, 'Ardea_Orkboss', 'gCNPC_PS');
  const larson = requireEntity(context, 'Larson', 'gCNavigation_PS');
  for (const result of [player, ardea, boss, larson]) if (result.status === 'unsupported') return result;
  if (player.status !== 'resolved' || ardea.status !== 'resolved' || boss.status !== 'resolved' || larson.status !== 'resolved') {
    return unsupported('Required startup entities are unresolved.', 'PC_Hero', 'Ardea', 'Ardea_Orkboss', 'Larson');
  }
  for (const name of ['Gorn', 'Yepas', 'AlShedim_TempleDoor_Tester_01'] as const) {
    if (context.entities[name].status === 'unknown') return unsupported('Optional native lookup is unknown rather than resolved None.', name);
    const lookup = context.entities[name];
    if (lookup.status === 'known' && lookup.value) {
      const identity = requireEntity(context, name);
      if (identity.status === 'unsupported') return identity;
    }
  }
  const effects: NativeStartupEffect[] = context.phase === 'serialized-before-OnInit'
    ? context.document.onInitHelpers.map(reset => ({ kind: 'resetScriptHelper', reset, source: 'Script_Game:100d0470' })) : [];
  effects.push({ kind: 'resetEntityCaches', fields: ['ms_arrEntities', 'ms_arrNPCs', 'ms_u32LastFrame', 'ms_Player'], source: 'Script_Game:100cfb70' },
    { kind: 'setPlayerChapter', entityId: player.value.id, value: 1, source: 'Script_Game:100cfb70' });
  const door = context.entities.AlShedim_TempleDoor_Tester_01;
  if (door.status === 'known' && door.value) {
    const matrix = [...door.value.worldMatrixCm];
    if (matrix.length !== 16 || matrix.some(value => !Number.isFinite(value) || Math.fround(value) !== value)) {
      return unsupported('Door transform is not a finite original float32 matrix.', 'door world matrix');
    }
    matrix[13] = Math.fround(matrix[13]! - 50.0);
    if (!Number.isFinite(matrix[13])) return unsupported('Native door offset leaves finite float32 domain.', 'finite source translationY');
    effects.push({ kind: 'setWorldMatrix', entityId: door.value.id, matrixCm: matrix, source: 'Script_Game:100cfa10' });
  } else effects.push({ kind: 'logWarning', severity: 3, message: WARNING, source: 'Script_Game:100cfa10' });
  const yepas = context.entities.Yepas;
  if (yepas.status === 'known' && yepas.value?.propertySets.includes('gCNPC_PS')) {
    effects.push({ kind: 'setNpcAlignment', entityId: yepas.value.id, alignment: 7, source: 'Script_Game:100cfa10' });
  } else effects.push({ kind: 'logWarning', severity: 3, message: WARNING, source: 'Script_Game:100cfa10' });
  effects.push({ kind: 'setNavigationRoutine', entityId: larson.value.id, routine: 'Start', source: 'Script_Game:100cfb70' },
    { kind: 'setEnclaveAlignment', entityId: ardea.value.id, alignment: 1, source: 'Script_Game:100cfb70' },
    { kind: 'setEnclaveRaid', entityId: ardea.value.id, value: true, source: 'Script_Game:100cfb70' },
    { kind: 'setEnclaveRevolution', entityId: ardea.value.id, value: true, source: 'Script_Game:100cfb70' },
    { kind: 'notifyEnclave', selfId: player.value.id, otherId: boss.value.id, event: 2, source: 'Script_Game:100755e0' },
    { kind: 'runQuest', quest: 'Xardas_FindXardas', source: 'Script_Game:100cfb70' });
  const gorn = context.entities.Gorn;
  if (gorn.status === 'known' && gorn.value) {
    if (!gorn.value.propertySets.includes('gCInteraction_PS')) return unsupported('Gorn interaction setter is not available.', 'Gorn gCInteraction_PS');
    effects.push({ kind: 'setExitRoiScript', entityId: gorn.value.id, script: 'OnExit_Gorn', source: 'Script_Game:100cfb70' });
  }
  for (const [setter, value, body] of STATS) effects.push({ kind: 'setPlayerStat', entityId: player.value.id, setter, value, source: 'Script_Game:' + body });
  effects.push({ kind: 'setPlayerLearningPointsAttributes', entityId: player.value.id, value: 0, source: 'Script_Game:100cfb70' },
    { kind: 'inventoryPopulate', selfId: player.value.id, otherId: null, argument: 0, source: 'Script_Game:10091ad0' });
  return finishPlan(context, context.phase === 'serialized-before-OnInit' ? ['OnInit', 'OnGameStartUp'] : ['OnGameStartUp'], effects, AFTER_CALLBACK);
}

export interface NativeGornExitContext {
  readonly startup: NativeStartupContext;
  readonly self: StartupKnowledge<NativeStartupEntity | null>;
  readonly gornShowReddockIsOpen: StartupKnowledge<boolean>;
  /** Spatial scheduler must prove this callback invocation; distance is not guessed. */
  readonly exitRoiInvocation: StartupKnowledge<{ readonly callback: 'OnExit_Gorn'; readonly selfId: string }>;
}

/** Native SETE/JZ polarity: perform relocation only when escort quest is NOT open. */
export function planNativeGornExitRoi(context: NativeGornExitContext): StartupResult<NativeStartupPlan> {
  if (!sourceInputsMatch(context.startup.inputHashes)) return unsupported('Native input profile differs.', 'installed build hashes');
  if (!verifiedDocuments.has(context.startup.document)) return unsupported('Startup document has not passed the pinned byte loader.', 'loadNativeStartupDocument');
  const invocation = context.exitRoiInvocation;
  if (invocation.status === 'unknown' || context.self.status === 'unknown' || !context.self.value ||
      invocation.value.callback !== 'OnExit_Gorn' || invocation.value.selfId !== context.self.value.id) {
    return unsupported('Gorn ROI invocation is not source-resolved.', 'native ROI callback self and trigger');
  }
  if (context.gornShowReddockIsOpen.status === 'unknown') return unsupported('Escort quest state is unknown.', 'IsOpen(Gorn_ShowReddock)');
  if (context.gornShowReddockIsOpen.value) return finishPlan(context.startup, ['OnExit_Gorn'], [], ['Native ongoing ROI/AI scheduling']);
  if (!context.self.value.propertySets.includes('gCNavigation_PS') || !context.self.value.propertySets.includes('gCInteraction_PS')) {
    return unsupported('Gorn relocation property sets are unavailable.', 'navigation', 'interaction');
  }
  return finishPlan(context.startup, ['OnExit_Gorn'], [
    { kind: 'closeQuest', quest: 'Gorn_ShowReddock', source: 'Script_Game:100d3590' },
    { kind: 'setNavigationRoutine', entityId: context.self.value.id, routine: 'GothaPrison', source: 'Script_Game:100d3590' },
    { kind: 'moveToSelectedWorkingPoint', entityId: context.self.value.id, source: 'Script_Game:100d3590' },
    { kind: 'setExitRoiScript', entityId: context.self.value.id, script: '', source: 'Script_Game:100d3590' },
  ], ['Native ongoing ROI/AI scheduling']);
}

/** The candidate includes all nested notifications/callbacks, never live objects. */
export interface NativeStartupAtomicHost<Candidate> {
  readonly currentRevision: () => string;
  readonly prepare: (plan: NativeStartupPlan) => StartupResult<Candidate>;
  /** Must publish every effect or publish none. Conflict/failure leaves state unchanged. */
  readonly commitAtomically: (candidate: Candidate, expectedRevision: string) =>
    | { readonly status: 'committed'; readonly revision: string }
    | { readonly status: 'unsupported'; readonly reason: string };
}

/** No default fallback exists which can silently approve unresolved callbacks. */
export function commitNativeStartup<Candidate>(plan: NativeStartupPlan, host: NativeStartupAtomicHost<Candidate>): StartupResult<NativeStartupCommitReceipt> {
  if (!verifiedPlans.has(plan)) return unsupported('Startup plan was not produced by the source-verified planner.', 'original ordered startup plan');
  if (host.currentRevision() !== plan.basisRevision) return unsupported('Startup plan revision is stale.', 'fresh source-state revision');
  const prepared = host.prepare(plan);
  if (host.currentRevision() !== plan.basisRevision) {
    throw new Error('NativeStartupAtomicHost.prepare mutated live state; atomic contract violated.');
  }
  if (prepared.status === 'unsupported') return prepared;
  const committed = host.commitAtomically(prepared.value, plan.basisRevision);
  if (committed.status === 'unsupported') {
    if (host.currentRevision() !== plan.basisRevision) throw new Error('NativeStartupAtomicHost failed commit changed live state.');
    return unsupported(committed.reason, 'atomic startup commit');
  }
  if (!committed.revision || committed.revision === plan.basisRevision || host.currentRevision() !== committed.revision) {
    throw new Error('NativeStartupAtomicHost commit must advance the matching source-state revision.');
  }
  const receipt: NativeStartupCommitReceipt = { profile: plan.profile, inputHashes: NATIVE_STARTUP_INPUTS,
    callbacks: plan.callbacks, beforeRevision: plan.basisRevision, afterRevision: committed.revision,
    nativeReturnValue: 1, gameplayReady: false };
  freezeTree(receipt);
  committedReceipts.add(receipt);
  // Each prepared plan is single-use even if a host retained its previous epoch.
  verifiedPlans.delete(plan);
  return { status: 'resolved', value: receipt, evidence: ['atomic detached-draft commit', ...plan.callbacks] };
}
