import {nativeVirtualX86CpuSelection} from './native-x86-thread-stack-profile';
/** Browser platform services for the retained NPC constructor. The declared
 * CRT compatibility platform owns real selected heap/TLS/lock operations;
 * incomplete native startup remains an explicit prerequisite boundary. */
import manifestText from '../../assets/gothic3/npc-entity/manifest.json?raw';
import { OriginalControlModuleState, OriginalControlReader } from './control-reading';
import { NativeReflectionController } from './entity-reflection';
import { monotonicClockMilliseconds } from './world-clock';
import { createBrowserNpcRuntimeAdminOwner } from './native-runtime-platform';
import { createBrowserGameCrtPlatform } from './browser-game-crt-platform';
import { browserGameProcessInputs } from './browser-game-process-inputs';
import { browserGameStartupIoInputs } from './browser-game-startup-io-inputs';
import { browserGameStandardIoInputs } from './browser-game-standard-io-inputs';
import { browserGameArgvNlsInputs } from './browser-game-argv-nls-inputs';
import { nativeEntityDefaultComparatorImportIdentity } from './native-entity-heap';
import { BrowserNavigationApplicationOwner } from './browser-npc-navigation-owner';
import type { BrowserSessionModeOwner } from './browser-npc-navigation-owner';
import { BrowserNavigationNotificationNames } from './browser-navigation-notification-names';
import { createBrowserScriptAdminStartup } from './browser-script-admin-startup';
import type { BrowserScriptAdminStartup } from './browser-script-admin-startup';
import type { BrowserNpcEntityServices } from './browser-npc-entity';
import type { NativeValue } from './dialogue';

type MatrixDestructorAddress = '100e2910';
interface MatrixDestructorEntry {
  readonly module: OriginalControlModuleState;
  readonly address: MatrixDestructorAddress;
  readonly callback: () => void;
}
const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
// SharedBase100e2910 contains only C3 RET. This concrete admitted callback
// performs no writes; it is retained and invoked through the shutdown service.
function originalMatrixDestructorRet(): void {}

function verifyMatrixDestructor(): void {
  const receipt = (JSON.parse(manifestText) as { matrixDestructor?: {
    module: string; inputSha256: string; address: string;
    instructionBytesHex: string; instructionBytesSha256: string;
  } }).matrixDestructor;
  if (receipt?.module !== 'SharedBase' ||
      receipt.inputSha256 !== '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' ||
      receipt.address !== '100e2910' || receipt.instructionBytesHex !== 'c3' ||
      receipt.instructionBytesSha256 !== 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e') {
    throw new Error('Original empty Matrix destructor receipt differs');
  }
}

/** This is a browser-owned shutdown service for one selected module lifetime.
 * Each registration retains its module and exact callback identity. dispose()
 * drains reverse order once; it makes no promise about page-unload delivery.
 * The admitted native callback is literally RET, so it leaves cache/guard
 * storage intact. Other CRT callbacks require their own source implementation.
 */
export class BrowserMatrixShutdownRegistry {
  private readonly pending: MatrixDestructorEntry[] = [];
  private readonly executed: MatrixDestructorEntry[] = [];
  private disposed = false;
  constructor(private readonly registerNativeShutdown?: (entry: MatrixDestructorEntry,
    callback: () => NativeValue<void>) => NativeValue<number>) { verifyMatrixDestructor(); }

  private execute(entry: MatrixDestructorEntry): NativeValue<void> {
    const index = this.pending.indexOf(entry);
    if (index < 0) return known(undefined); // A separately requested drain already ran this literal RET.
    this.pending.splice(index, 1);
    entry.callback();
    this.executed.push(entry);
    return known(undefined);
  }

  register(module: OriginalControlModuleState, address: MatrixDestructorAddress): NativeValue<number> {
    if (this.disposed) return { known: false, reason: 'Selected browser shutdown owner is disposed' };
    if (!(module instanceof OriginalControlModuleState) || address !== '100e2910') {
      return { known: false, reason: 'Actual shared module and admitted Matrix destructor required' };
    }
    const entry = Object.freeze({ module, address, callback: originalMatrixDestructorRet });
    const registered = this.registerNativeShutdown?.(entry, () => this.execute(entry));
    if (registered && !registered.known) return registered;
    this.pending.push(entry);
    return known(0); // Success follows an actual retained registration.
  }

  registrations(): readonly MatrixDestructorEntry[] { return Object.freeze(this.pending.slice()); }
  execution(): readonly MatrixDestructorEntry[] { return Object.freeze(this.executed.slice()); }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // In production the platform owns this callback in the combined native
    // stack. Do not drain it out of order if an earlier shutdown callback fails.
    if (this.registerNativeShutdown) return;
    while (this.pending.length) {
      const entry = this.pending.at(-1)!;
      this.execute(entry);
    }
  }
}

export interface BrowserNpcEntityPlatform {
  readonly crypto: Pick<Crypto, 'randomUUID'>;
  readonly now: () => number;
}
export interface BrowserNpcEntityServiceOwner {
  readonly services: BrowserNpcEntityServices;
  readonly application: BrowserNavigationApplicationOwner;
  readonly navigationNames: BrowserNavigationNotificationNames;
  readonly scriptAdminStartup: NativeValue<BrowserScriptAdminStartup>;
  readonly matrixModule: OriginalControlModuleState;
  readonly control: OriginalControlReader;
  readonly shutdown: BrowserMatrixShutdownRegistry;
  /** Starts only the selected lower browser session mode used by virtual270.
   * This is not native gCGameApp/Session startup. */
  startBrowserSessionMode(): NativeValue<void>;
  dispose(): void;
}

export function createBrowserNpcEntityServices(platform: BrowserNpcEntityPlatform): BrowserNpcEntityServiceOwner {
  const runtimeAdmins = createBrowserNpcRuntimeAdminOwner(createBrowserGameCrtPlatform({
    processInputs: browserGameProcessInputs, threadStack: { reservationBytes: 4096, pageAlignment: 'virtual-page-4096', cpu: nativeVirtualX86CpuSelection },
    startupIo: browserGameStartupIoInputs,
    standardIo: browserGameStandardIoInputs,
    argvNls: browserGameArgvNlsInputs,
    setEnvp: { physicalGameHeapCapacity: 'round-eight-unknown-padding', heapFree: { outcome: 'success' } },
  }));
  const scriptAdminStartup = createBrowserScriptAdminStartup(runtimeAdmins.platform, runtimeAdmins.memory, runtimeAdmins.error);
  const navigationNames = new BrowserNavigationNotificationNames(runtimeAdmins.memory, runtimeAdmins.platform);
  const initializedNavigationNames = navigationNames.initialize();
  if (!initializedNavigationNames.known) throw new Error(initializedNavigationNames.reason);
  const application = new BrowserNavigationApplicationOwner();
  let browserSession: BrowserSessionModeOwner | null = null;
  const startBrowserSessionMode = (): NativeValue<void> => {
    if (browserSession) {
      const current = browserSession.readRunningByte();
      return current.known && current.value === 1 ? known(undefined)
        : { known: false, reason: current.known ? 'Selected browser session mode is not running' : current.reason };
    }
    const session = application.createSessionModeOwner();
    const running = session.writeRunningByte(1);
    if (!running.known) return running;
    const registered = application.registerSession(session);
    if (!registered.known) return registered;
    const initialized = application.writeInitializedByte(1);
    if (!initialized.known) return initialized;
    browserSession = session;
    return known(undefined);
  };
  const shutdown = new BrowserMatrixShutdownRegistry((entry, callback) =>
    runtimeAdmins.platform.registerShutdown(entry.address, entry.module, callback));
  const matrixModule = OriginalControlModuleState.fromColdOriginalImage();
  const reflection = new NativeReflectionController('browser-npc-shared-matrix', {
    timestamps: monotonicClockMilliseconds(platform.now), precision: 53,
    // Matrix.GetIdentity never reads this Clock-only service. An attempted
    // Clock creator destruction must still request its actual ErrorAdmin.
    isInPanicState: () => runtimeAdmins.error.isInPanicState(),
  });
  const control = new OriginalControlReader(reflection, {
    module: matrixModule,
    registerMatrixDestructor: address => shutdown.register(matrixModule, address),
  });
  return Object.freeze({ matrixModule, control, shutdown, navigationNames, scriptAdminStartup,
    application, startBrowserSessionMode,
    services: Object.freeze({ crypto: platform.crypto, now: platform.now, control, runtimeAdmins,
      applicationMode270EqualsOne: application.applicationMode270EqualsOne,
      navigationNotifications: navigationNames.host,
      defaultPropertyComparator: () => known(nativeEntityDefaultComparatorImportIdentity) }),
    // One native callback stack preserves registration order across MemoryAdmin,
    // Matrix, MessageAdmin and ErrorAdmin. The platform drains it in reverse.
    dispose: () => { runtimeAdmins.dispose(); shutdown.dispose(); application.dispose(); },
  });
}
