/** Live installed Script_Game OnInit/OnGameStartUp callback order.
 *
 * This executes each call against retained objects and preserves a failed
 * prefix. The older startup.ts atomic planner is a separate planning API.
 * Opaque Entity wrappers are captured168B nonowning values, not entity IDs.
 * Wrapper construction/assignment/AttachTo and unported engine/script bodies
 * are mandatory host boundaries. No registered source is asserted resident.
 */
import rulesText from '../../assets/gothic3/startup-controller/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import type { NativePlayerControls } from './player-state';
import type { OriginalPlayerMemory } from './player-properties';
import type { NativeScriptProcessingUnit } from './script-routine';
import type { NativeStartupStatSetter } from './startup';

interface Helper { receiver: string; body: string; call: string }
interface Stat { setter: NativeStartupStatSetter; value: number; body: string; call: string }
const rules = JSON.parse(rulesText) as { schema: string; inputs: Record<string, string>;
  helpers: readonly Helper[]; stats: readonly Stat[]; dirtyHackWarning: string;
  doorTranslationDeltaCm: number; pendingResetByOnInit: boolean };
if (rules.schema !== 'gothic3-live-startup-rules-v1' ||
    rules.inputs.Script_Game !== '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1' ||
    rules.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    rules.helpers.length !== 12 || rules.stats.length !== 18 ||
    rules.doorTranslationDeltaCm !== -50 || rules.pendingResetByOnInit !== false) {
  throw new Error('Live original startup source profile differs');
}

export interface NativeStartupTrace {
  sequence: number; operation: string; source: string; state: 'attempted' | 'applied';
  value?: string | number | boolean | null;
}
export type NativeStartupRunResult =
  | { supported: true; nativeReturnValue: 1; trace: readonly NativeStartupTrace[]; gameplayReady: false }
  | { supported: false; nativeReturnValue: null; reason: string; partial: boolean;
      trace: readonly NativeStartupTrace[]; gameplayReady: false };

/** Actual module-global bTObjArray<Entity> storage, including retained empty
 * allocations. NULL storage does not imply the original count/capacity is0. */
export interface NativeStartupEntityArray<E extends object> {
  storage: readonly E[] | null; count: number; capacity: number;
}
export interface NativeStartupModuleGlobals<E extends object> {
  /** Re-read the imported variable at each native load, not once at construction. */
  entityArray(): NativeStartupEntityArray<E>;
  npcArray(): NativeStartupEntityArray<E>;
  setLastFrame(value: 0): void;
  playerWrapper(): E;
}

export interface NativeStartupHost<E extends object, I extends object> {
  constructEntity(): NativeValue<E>;
  constructEntityFromNullInstance(): NativeValue<E>;
  assignEntity(destination: E, source: E): NativeValue<void>;
  spuEntity(spu: NativeScriptProcessingUnit, slot: 'self' | 'other'): NativeValue<I | null>;
  attachEntity(destination: E, instance: I | null): NativeValue<void>;
  /** Destructor is RET in the audited nonowning Entity profile; no invented
   * Add/ReleaseReference callbacks. Host retains any original local lifetime. */
  destroyEntity(wrapper: E): NativeValue<void>;
  noneEntity(): E;
  freeEntityArray(storage: readonly E[]): NativeValue<void>;
  helper(receiver: string, body: string): NativeValue<void>;
  /** Executes1000ed50 after its three scalar writes: inspect actual+214
   * storage, destroy the original capacity, free and zero all three metadata
   * fields only if storage is non-NULL. True means released; false means
   * storage was already NULL and its metadata was retained. It must use these
   * same control records. JS allocation remains an explicit selected profile. */
  releaseControlQueue(controls: NativePlayerControls): NativeValue<boolean>;
  getPlayer(): NativeValue<E>;
  getEntity(name: string): NativeValue<E>;
  getWorldEntity(): NativeValue<E>;
  getEnclave(name: 'Ardea'): NativeValue<E>;
  differsFromNone(wrapper: E): NativeValue<number>;
  instance(wrapper: E): NativeValue<I>;
  worldMatrix(instance: I): NativeValue<readonly number[]>;
  setToWorldMatrix(instance: I, matrixCm: readonly number[]): NativeValue<void>;
  /** Includes actual PSNpc.IsValid, without promoting a missing PS to valid. */
  npcValid(wrapper: E): NativeValue<number>;
  setNpcAlignment(wrapper: E, value: 7): NativeValue<void>;
  setChapter(wrapper: E, value: 1): NativeValue<void>;
  setNavigationRoutine(wrapper: E, routine: 'Start'): NativeValue<void>;
  setEnclaveProperty(wrapper: E, property: 'PoliticalAlignment' | 'Raid' | 'Revolution',
    value: 1 | true): NativeValue<void>;
  notifyEnclave(spu: NativeScriptProcessingUnit, self: E, other: E, event: 2): NativeValue<number>;
  runQuest(world: E, name: 'Xardas_FindXardas'): NativeValue<number>;
  setExitRoiScript(wrapper: E, script: 'OnExit_Gorn'): NativeValue<void>;
  /** Direct native Script_Game body call, with explicit captured Self and
   * explicit global None Other. This does not push an SPU state/instruction. */
  statSetter(spu: NativeScriptProcessingUnit, self: E, other: E, setter: NativeStartupStatSetter,
    value: number): NativeValue<number>;
  setLPAttribs(wrapper: E, value: 0): NativeValue<void>;
  populateInventory(spu: NativeScriptProcessingUnit, self: E, other: E, argument: 0): NativeValue<number>;
  /** Re-read original g_iDefaultMessagePriority, GetMessageAdmin, then OnMessage. */
  warning(message: string, severity: 3, file: null, functionName: null, line: -1): NativeValue<void>;
}

function byte(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Expected original AL byte');
  return value;
}
function word(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Expected original array DWORD');
  return value;
}
function propertyResult(result: ReturnType<OriginalPlayerMemory['setChapter']>): NativeValue<void> {
  return result.supported ? { known: true, value: undefined } : { known: false, reason: result.reason };
}
/** Adapter for an already captured original PlayerMemory wrapper pointer.
 * NULL reaches the original GE_MESSAGEF_WARN call without writing the property.
 * The caller supplies that warning implementation and the captured PS pointer,
 * not a replacement entity-name lookup or a guessed successful no-op. */
export function nativeStartupPlayerMemoryScalars(memory: OriginalPlayerMemory | null,
  warning: (property: 'Chapter' | 'LPAttribs', className: 'gCPlayerMemory_PS') => NativeValue<void>): {
  setChapter(value: 1): NativeValue<void>; setLPAttribs(value: 0): NativeValue<void>;
} {
  return {
    setChapter: value => memory ? propertyResult(memory.setChapter(value)) : warning('Chapter', 'gCPlayerMemory_PS'),
    setLPAttribs: value => memory ? propertyResult(memory.setLPAttribs(value)) : warning('LPAttribs', 'gCPlayerMemory_PS'),
  };
}

/** One shared module instance. A failed/unknown callback can already have
 * mutated external objects; automatic replay is blocked after that boundary.
 * Reentrant startup is outside this profile and latches failure immediately. */
export class NativeStartupController<E extends object, I extends object> {
  private active = false;
  private blocked: string | null = null;
  constructor(readonly controls: NativePlayerControls, readonly globals: NativeStartupModuleGlobals<E>,
    private readonly host: NativeStartupHost<E, I>) {}
  failure(): string | null { return this.blocked; }
  private run(body: (call: <T>(operation: string, source: string, fn: () => NativeValue<T>) => T,
    write: (operation: string, source: string, fn: () => void, value?: NativeStartupTrace['value']) => void) => void): NativeStartupRunResult {
    if (this.active) this.blocked = 'Reentrant original startup requires an unported native call stack';
    if (this.blocked) return { supported: false, nativeReturnValue: null, reason: this.blocked,
      partial: false, trace: [], gameplayReady: false };
    const trace: NativeStartupTrace[] = [];
    const record = (operation: string, source: string, state: NativeStartupTrace['state'], value?: NativeStartupTrace['value']) => {
      trace.push({ sequence: trace.length, operation, source, state, value });
    };
    const guard = () => { if (this.blocked) throw new Error(this.blocked); };
    const call = <T>(operation: string, source: string, fn: () => NativeValue<T>): T => {
      guard(); record(operation, source, 'attempted'); const result = fn();
      guard(); if (!result.known) throw new Error(operation + ': ' + result.reason);
      record(operation, source, 'applied'); return result.value;
    };
    const write = (operation: string, source: string, fn: () => void, value?: NativeStartupTrace['value']) => {
      guard(); record(operation, source, 'attempted'); fn(); guard(); record(operation, source, 'applied', value);
    };
    this.active = true;
    try { body(call, write); guard(); return { supported: true, nativeReturnValue: 1, trace, gameplayReady: false }; }
    catch (error) {
      this.blocked = error instanceof Error ? error.message : String(error);
      return { supported: false, nativeReturnValue: null, reason: this.blocked,
        partial: trace.length > 0, trace, gameplayReady: false };
    } finally { this.active = false; }
  }
  onInit(spu: NativeScriptProcessingUnit, self: E | null, other: E | null): NativeStartupRunResult {
    return this.run((call, write) => {
      const wrap = (slot: 'self' | 'other', supplied: E | null) => {
        const local = call(slot + '-construct', 'Script_Game:100d0470', () => this.host.constructEntity());
        if (supplied !== null) call(slot + '-assign', 'Script_Game:100d0470', () => this.host.assignEntity(local, supplied));
        else {
          const instance = call(slot + '-SPU-get', 'Script_Game:100d0470', () => this.host.spuEntity(spu, slot));
          call(slot + '-attach', 'Script_Game:100d0470', () => this.host.attachEntity(local, instance));
        }
        return local;
      };
      const localSelf = wrap('self', self), localOther = wrap('other', other);
      for (const helper of rules.helpers) {
        if (['10009400', '1000adc0', '1000b3e0'].includes(helper.body)) continue; // original RET bodies
        if (helper.body === '10009680') {
          write('movement-seven-bytes-zero', 'Script_Game:10009680', () => this.controls.resetOriginalMovementOnInit(), 0);
        } else if (helper.body === '1000ed50') {
          write('queue-three-bytes-zero', 'Script_Game:1000ed50', () => this.controls.resetOriginalQueueFlagsOnInit(), 0);
          const released = call('queue-original-storage-release', 'Script_Game:1000ed50', () => this.host.releaseControlQueue(this.controls));
          if (typeof released !== 'boolean') throw new Error('Queue release needs its actual nonNULL-storage branch');
          if (released) write('queue-shared-value-records-clear', 'Script_Game:1000ed50', () => this.controls.clearOriginalQueueAfterOnInitRelease(), 0);
        } else call('helper-' + helper.receiver, 'Script_Game:' + helper.body, () => this.host.helper(helper.receiver, helper.body));
      }
      call('other-destruct', 'Script_Game:100d0470', () => this.host.destroyEntity(localOther));
      call('self-destruct', 'Script_Game:100d0470', () => this.host.destroyEntity(localSelf));
    });
  }
  onGameStartUp(spu: NativeScriptProcessingUnit, self: E | null, other: E | null): NativeStartupRunResult {
    return this.run((call, write) => {
      const source = 'Script_Game:100cfb70';
      const wrap = (slot: 'self' | 'other', supplied: E | null) => {
        const local = call(slot + '-construct', source, () => this.host.constructEntity());
        if (supplied !== null) call(slot + '-assign', source, () => this.host.assignEntity(local, supplied));
        else {
          const instance = call(slot + '-SPU-get', source, () => this.host.spuEntity(spu, slot));
          call(slot + '-attach', source, () => this.host.attachEntity(local, instance));
        }
        return local;
      };
      const localSelf = wrap('self', self), localOther = wrap('other', other);
      const clear = (name: string, array: NativeStartupEntityArray<E>) => {
        word(array.count); word(array.capacity);
        if (array.storage !== null) {
          //100158f0 iterates capacity; its Entity destructor is RET. Capture
          //storage again for Free, then clear the same captured array object.
          call(name + '-storage-free', source, () => this.host.freeEntityArray(array.storage!));
          write(name + '-metadata-zero', source, () => { array.storage = null; array.count = 0; array.capacity = 0; }, 0);
        }
      };
      clear('ms_arrEntities', this.globals.entityArray()); clear('ms_arrNPCs', this.globals.npcArray());
      write('ms_u32LastFrame-zero', source, () => this.globals.setLastFrame(0), 0);
      const none = call('none-null-instance-construct', source, () => this.host.constructEntityFromNullInstance());
      call('ms_Player-assign-None', source, () => this.host.assignEntity(this.globals.playerWrapper(), none));
      call('none-destruct', source, () => this.host.destroyEntity(none));
      const player = call('Entity.GetPlayer', source, () => this.host.getPlayer());
      call('PlayerMemory.Chapter=1', source, () => this.host.setChapter(player, 1));

      const door = call('door-lookup', 'Script_Game:100cfa10', () => this.host.getEntity('AlShedim_TempleDoor_Tester_01'));
      const warning = () => call('dirty-hack-warning', 'Script_Game:100cfa10', () =>
        this.host.warning(rules.dirtyHackWarning, 3, null, null, -1));
      if (byte(call('door!=None', 'Script_Game:100cfa10', () => this.host.differsFromNone(door))) !== 0) {
        const instance = call('door-GetInstance-first', 'Script_Game:100cfa10', () => this.host.instance(door));
        const original = call('door-GetWorldMatrix', 'Script_Game:100cfa10', () => this.host.worldMatrix(instance));
        if (original.length !== 16 || original.some(value => !Number.isFinite(value) || !Object.is(Math.fround(value), value))) {
          throw new Error('Door matrix requires its actual16 original finite float32 components');
        }
        const matrix = [...original]; // bCMatrix copy; source never edits GetWorldMatrix storage directly
        matrix[13] = Math.fround(matrix[13]! + rules.doorTranslationDeltaCm);
        const destination = call('door-GetInstance-second', 'Script_Game:100cfa10', () => this.host.instance(door));
        call('door-SetToWorldMatrix', 'Script_Game:100cfa10', () => this.host.setToWorldMatrix(destination, matrix));
      } else warning();
      const yepas = call('Yepas-lookup', 'Script_Game:100cfa10', () => this.host.getEntity('Yepas'));
      if (byte(call('Yepas!=None', 'Script_Game:100cfa10', () => this.host.differsFromNone(yepas))) !== 0 &&
          byte(call('Yepas-NPC-valid', 'Script_Game:100cfa10', () => this.host.npcValid(yepas))) !== 0) {
        call('Yepas-alignment7', 'Script_Game:100cfa10', () => this.host.setNpcAlignment(yepas, 7));
      } else warning(); // source repeats the door warning even when Yepas is missing
      call('Yepas-destruct', 'Script_Game:100cfa10', () => this.host.destroyEntity(yepas));
      call('door-destruct', 'Script_Game:100cfa10', () => this.host.destroyEntity(door));
      const larson = call('Larson-lookup', source, () => this.host.getEntity('Larson'));
      call('Larson-routine-Start', source, () => this.host.setNavigationRoutine(larson, 'Start'));
      const orkboss = call('Ardea_Orkboss-lookup', source, () => this.host.getEntity('Ardea_Orkboss'));
      const enclave = call('Ardea-enclave-lookup', source, () => this.host.getEnclave('Ardea'));
      call('Ardea-PoliticalAlignment1', source, () => this.host.setEnclaveProperty(enclave, 'PoliticalAlignment', 1));
      call('Ardea-Raid-true', source, () => this.host.setEnclaveProperty(enclave, 'Raid', true));
      call('Ardea-Revolution-true', source, () => this.host.setEnclaveProperty(enclave, 'Revolution', true));
      call('NotifyEnclave-event2', 'Script_Game:100755e0', () => this.host.notifyEnclave(spu, player, orkboss, 2));
      const world = call('Entity.GetWorldEntity', source, () => this.host.getWorldEntity());
      call('RunQuest-Xardas_FindXardas', source, () => this.host.runQuest(world, 'Xardas_FindXardas'));
      call('world-destruct', source, () => this.host.destroyEntity(world));
      const gorn = call('Gorn-lookup', source, () => this.host.getEntity('Gorn'));
      if (byte(call('Gorn!=None', source, () => this.host.differsFromNone(gorn))) !== 0) {
        call('Gorn-ExitROIScript-OnExit_Gorn', source, () => this.host.setExitRoiScript(gorn, 'OnExit_Gorn'));
      }
      for (const stat of rules.stats) {
        call(stat.setter, 'Script_Game:' + stat.body, () => this.host.statSetter(spu, player, this.host.noneEntity(), stat.setter, stat.value));
      }
      call('PlayerMemory.LPAttribs=0', source, () => this.host.setLPAttribs(player, 0));
      call('InventoryPopulate', 'Script_Game:10091ad0', () => this.host.populateInventory(spu, player, this.host.noneEntity(), 0));
      for (const [name, wrapper] of [['Gorn', gorn], ['Ardea', enclave], ['Ardea_Orkboss', orkboss],
        ['Larson', larson], ['Player', player], ['Other', localOther], ['Self', localSelf]] as const) {
        call(name + '-destruct', source, () => this.host.destroyEntity(wrapper));
      }
    });
  }
}
