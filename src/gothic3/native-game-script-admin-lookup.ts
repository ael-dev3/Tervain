/** Source-ordered Game.dll gCScriptAdmin lazy singleton getter.
 *
 * This models only the verified IsInitialised/guard/class-name/ModuleAdmin/
 * RTTI/cache sequence. It does not construct or register ScriptAdmin, and it
 * does not implement CallScript or the script processing unit. Callers must
 * supply the retained native global views and actual lower owners.
 */
import movementRulesText from '../../assets/gothic3/movement-state/runtime-rules.json?raw';
import type { NativeValue } from './dialogue';
import { NativeHeapObjectViews } from './native-heap-views';
import type { NativeHeapCString } from './native-heap-cstring';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
const movementRules = JSON.parse(movementRulesText) as {
  schema: string; gameSha256: string;
  entries: Record<string, { entry: string; body: string; jumpTrail: readonly { address: string; bytes: string; target: string }[] }>;
};
if (movementRules.schema !== 'gothic3-movement-state-rules-v1' ||
    movementRules.gameSha256 !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    movementRules.entries.ScriptAdminGetter?.entry !== '2001afbe' ||
    movementRules.entries.ScriptAdminGetter?.body !== '200a4bb0' ||
    movementRules.entries.ScriptAdminGetter?.jumpTrail.length !== 1 ||
    movementRules.entries.ScriptAdminGetter?.jumpTrail[0]?.bytes !== 'e9ed9b0800' ||
    movementRules.entries.ScriptAdminGetter?.jumpTrail[0]?.target !== '200a4bb0') {
  throw new Error('Original Game ScriptAdmin getter source receipt differs');
}
const fact = <T>(value: NativeValue<T>, operation: string): T => {
  if (!value.known) throw new Error(operation + ': ' + value.reason);
  return value.value;
};

export interface NativeGameScriptAdminLookupHost<T extends object, M extends object> {
  /** bTPropertyObjectType<gCScriptAdmin,eCEngineComponentBase>::vfunction1. */
  className(): NativeValue<NativeHeapCString>;
  /** Exact ModuleAdmin singleton and first-match FindModule owners. */
  moduleAdmin(): NativeValue<M | null>;
  findModule(module: M, className: NativeHeapCString): NativeValue<object | null>;
  dynamicCast(component: object | null, sourceType: 'eCEngineComponentBase',
    targetType: 'gCScriptAdmin'): NativeValue<T | null>;
}

/** ScriptAdminGetInstance at Game:2001afbe -> 200a4bb0. `globals` aliases
 * the source cache at Game:207b6028 and guard at Game:207b602c; the one-byte
 * application field aliases Engine:30ad989c. The caller owns all three.
 */
export class NativeGameScriptAdminLookup<T extends object, M extends object> {
  private boundary: string | null = null;
  private readonly trace: string[] = [];

  constructor(
    readonly applicationInitialized: NativeHeapObjectViews,
    readonly globals: NativeHeapObjectViews,
    private readonly host: NativeGameScriptAdminLookupHost<T, M>,
  ) {
    if (applicationInitialized.bytes.length !== 1 || applicationInitialized.knownMask.length !== 1) {
      throw new Error('Actual one-byte Engine application initialization field required');
    }
    if (globals.bytes.length !== 8 || globals.knownMask.length !== 8) {
      throw new Error('Actual eight-byte ScriptAdmin cache and guard globals required');
    }
  }

  getInstance(): NativeValue<T | null> {
    try {
      // eCApplication::IsInitialised is evaluated on every getter call, before
      // the one-time guard. A cold application returns NULL without touching it.
      if (this.applicationInitialized.readUnsigned(0, 1) !== 1) return known(null);
      if (this.boundary) return unknown(this.boundary);
      if ((this.globals.readUnsigned(4) & 1) === 0) {
        // Native code sets the guard before class-name, ModuleAdmin or RTTI work.
        this.globals.writeUnsigned(4, this.globals.readUnsigned(4) | 1);
        this.trace.push('scriptAdmin.lookup.guard');
        const name = fact(this.host.className(), 'gCScriptAdmin class-name vfunction1');
        if (fact(name.text(), 'gCScriptAdmin class-name CString') !== 'gCScriptAdmin') {
          throw new Error('Unexpected gCScriptAdmin class-name bytes');
        }
        const module = fact(this.host.moduleAdmin(), 'ModuleAdmin.GetInstance');
        if (module === null) throw new Error('ScriptAdmin.FindModule dereferences NULL ModuleAdmin');
        const component = fact(this.host.findModule(module, name), 'ModuleAdmin.FindModule');
        const admin = fact(this.host.dynamicCast(component, 'eCEngineComponentBase', 'gCScriptAdmin'), 'CRT.RTDynamicCast');
        this.globals.pointer<T>(0).set(admin);
        this.trace.push('scriptAdmin.lookup.cache');
      }
      // If a lower operation reenters after the guard is set, this reads the
      // current cache (normally NULL) just as the native guard-first branch does.
      return known(this.globals.pointer<T>(0).get());
    } catch (error) {
      this.boundary = error instanceof Error ? error.message : String(error);
      this.trace.push('blocked:' + this.boundary);
      return unknown(this.boundary);
    }
  }

  snapshot() {
    return Object.freeze({ boundary: this.boundary, trace: Object.freeze([...this.trace]) });
  }
}
