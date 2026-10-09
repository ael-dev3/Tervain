/** Browser startup composes the selected Shared GUID callback with the actual
 * Game attach prerequisites. An interrupted attach does not enter the later
 * property-ID callback or construct a ScriptAdmin component. */
import type { NativeValue } from './dialogue';
import { browserGameCrtPlatformProfile } from './browser-game-crt-platform';
import { canonicalBrowserGameCrtStartup, createBrowserGameCrtStartup } from './browser-game-crt-startup';
import type { BrowserGameCrtStartup } from './browser-game-crt-startup';
import { NativeGameScriptAdminStartup } from './native-game-script-admin-startup';
import { selectAsciiGuidTextPlatform } from './native-guid-platform';
import { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeErrorAdminModule } from './native-error-admin';
import type { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeSharedGuidNull } from './native-shared-guid-null';
import { NativeSharedCrtOwner } from './native-shared-crt';
import { NativeSharedStaticTls } from './native-shared-static-tls';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });

export interface BrowserScriptAdminStartup {
  readonly shared: NativeSharedGuidNull;
  readonly sharedCrt: NativeSharedCrtOwner | null;
  readonly prerequisites: BrowserGameCrtStartup;
  readonly game: NativeGameScriptAdminStartup | null;
  /** Distinguishes a callback never entered from an actual returned result. */
  readonly propertyIdInvocation: 'not-entered' | 'returned';
  /** An unentered callback has an explicit prerequisite boundary. An entered
   * callback retains its actual result, including a later lower interruption. */
  readonly propertyIdResult: NativeValue<void>;
  readonly selectedOrder: readonly ['SharedBase:100e1470', 'Game:204677e4'] |
    readonly ['SharedBase:100e1470', 'Game:204677e4', 'Game:2051dcf0'] |
    readonly ['SharedBase:100ada4c', 'Game:204677e4'] |
    readonly ['SharedBase:100ada4c', 'Game:204677e4', 'Game:2051dcf0'];
  readonly crtTraversalCompleted: false;
  readonly nativeModuleInstantiated: false;
}
interface RetainedStartup {
  readonly memory: NativeMemoryAdmin;
  readonly error: NativeErrorAdminModule;
  result: NativeValue<BrowserScriptAdminStartup>;
  phase: 'constructing' | 'returned';
  interruption: string | null;
}
const retained = new WeakMap<NativeRuntimePlatform, RetainedStartup>();

/** Creates this graph once. The caller supplies the actual browser NPC heap
 * and platform, so GUID text buffers and both modules' image views share the
 * same lifetime. Existing interrupted Game owners cannot be patched/replayed. */
export function createBrowserScriptAdminStartup(platform: NativeRuntimePlatform,
  memory: NativeMemoryAdmin, error: NativeErrorAdminModule): NativeValue<BrowserScriptAdminStartup> {
  const compatibility = browserGameCrtPlatformProfile(platform);
  if (!compatibility.known) return compatibility;
  const previous = retained.get(platform);
  if (previous) {
    if (previous.memory !== memory || previous.error !== error) return unknown('Browser ScriptAdmin startup cannot replace its retained heap or ErrorAdmin owner');
    if (previous.phase === 'constructing') {
      previous.interruption = 'Reentry into selected browser ScriptAdmin startup is unowned';
      return unknown(previous.interruption);
    }
    if (previous.result.known) {
      const payload = NativeSharedGuidNull.canonicalPayloadForPlatform(previous.result.value.shared, platform);
      if (!payload.known) return payload;
      const prerequisites = canonicalBrowserGameCrtStartup(previous.result.value.prerequisites, platform);
      if (!prerequisites.known) return prerequisites;
    }
    return previous.result;
  }
  if (!NativeMemoryAdmin.isForPlatform(memory, platform)) return unknown('Actual same-platform browser NPC heap required');
  const entry: RetainedStartup = { memory, error, phase: 'constructing', interruption: null,
    result: unknown('Selected browser ScriptAdmin startup is constructing') };
  retained.set(platform, entry);
  const guard = (): void => {
    if (entry.interruption) throw new Error(entry.interruption);
    const active = browserGameCrtPlatformProfile(platform);
    if (!active.known) throw new Error(active.reason);
    if (active.value !== compatibility.value) throw new Error('Browser ScriptAdmin compatibility provider identity differs');
  };
  let result: NativeValue<BrowserScriptAdminStartup>;
  try {
    let sharedCrt:NativeSharedCrtOwner|null=null;
    if(compatibility.value.setEnvp){
      const tls=NativeSharedStaticTls.forPlatform(platform);if(!tls.known)throw new Error(tls.reason);
      const loaded=tls.value.loadSharedBase();if(!loaded.known)throw new Error(loaded.reason);
      sharedCrt=NativeSharedCrtOwner.forPlatform(platform);
      const attached=sharedCrt.processAttach();guard();
      if(!attached.known)throw new Error('SharedBase CRT prerequisite incomplete: '+attached.reason);
      if(attached.value!==1)throw new Error('SharedBase CRT prerequisite returned zero');
    }
    const sharedResult = NativeSharedGuidNull.forPlatform(platform);
    guard();
    if (!sharedResult.known) throw new Error(sharedResult.reason);
    const shared = sharedResult.value;
    // Reuse an already completed canonical initializer without resetting any
    // later payload writes. Cold or interrupted owners still enter their own
    // actual one-shot selected execution/boundary; the getter never initializes.
    if (!NativeSharedGuidNull.canonicalPayloadForPlatform(shared, platform).known) {
      const initialized = sharedCrt ? shared.adoptReturnedCrtExecution() : shared.invokeInitializer();
      guard();
      if (!initialized.known) throw new Error(initialized.reason);
    }
    const prerequisiteResult = createBrowserGameCrtStartup(platform, memory);
    guard();
    if (!prerequisiteResult.known) throw new Error(prerequisiteResult.reason);
    const prerequisites = prerequisiteResult.value;
    const proof = canonicalBrowserGameCrtStartup(prerequisites, platform);
    if (!proof.known) throw new Error(proof.reason);
    if (!prerequisites.attachResult.known || prerequisites.attachResult.value === 0) {
      const reason = prerequisites.attachResult.known ? 'Game processAttach returned 0; property-ID initializer was not entered'
        : 'Game processAttach is incomplete; property-ID initializer was not entered: ' + prerequisites.attachResult.reason;
      result = known(Object.freeze({ shared, sharedCrt, prerequisites, game: null, propertyIdInvocation: 'not-entered',
        propertyIdResult: Object.freeze(unknown(reason)),
        selectedOrder: sharedCrt ? Object.freeze(['SharedBase:100ada4c', 'Game:204677e4'] as const) : Object.freeze(['SharedBase:100e1470', 'Game:204677e4'] as const),
        crtTraversalCompleted: false, nativeModuleInstantiated: false }));
    } else {
      const startup = NativeGameScriptAdminStartup.forCrtWithSharedGuid(prerequisites.crt, memory, platform, shared, {
        guidTextPlatform: selectAsciiGuidTextPlatform(),
        errorAdminPanicState: () => {
          const panic = error.isInPanicState();
          // The ErrorAdmin owner exposes the original byte predicate as bool;
          // this host preserves its zero/nonzero meaning for the cleanup test.
          return panic.known ? known(panic.value ? 1 : 0) : panic;
        },
      });
      guard();
      if (!startup.known) throw new Error(startup.reason);
      const propertyIdResult = Object.freeze(startup.value.invokeInitializer('propertyId'));
      guard();
      result = known(Object.freeze({ shared, sharedCrt, prerequisites, game: startup.value,
        propertyIdInvocation: 'returned', propertyIdResult,
        selectedOrder: sharedCrt ? Object.freeze(['SharedBase:100ada4c', 'Game:204677e4', 'Game:2051dcf0'] as const) : Object.freeze(['SharedBase:100e1470', 'Game:204677e4', 'Game:2051dcf0'] as const),
        crtTraversalCompleted: false, nativeModuleInstantiated: false }));
    }
  } catch (failure) {
    result = unknown(failure instanceof Error ? failure.message : String(failure));
  }
  result = Object.freeze(result);
  entry.result = result;
  entry.phase = 'returned';
  return result;
}
