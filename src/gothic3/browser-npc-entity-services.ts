/** Selected browser platform services for the retained NPC constructor.
 * GUID/timer and ordered shutdown storage replace their platform boundaries;
 * they do not reconstruct Windows CRT allocation, pointer encoding or locks.
 */
import manifestText from '../../assets/gothic3/npc-entity/manifest.json?raw';
import { OriginalControlModuleState, OriginalControlReader } from './control-reading';
import { NativeReflectionController } from './entity-reflection';
import { monotonicClockMilliseconds } from './world-clock';
import { createNativeRuntimeAdminOwner } from './native-runtime-platform';
import { nativeEntityDefaultComparatorImportIdentity } from './native-entity-heap';
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
  readonly matrixModule: OriginalControlModuleState;
  readonly control: OriginalControlReader;
  readonly shutdown: BrowserMatrixShutdownRegistry;
  dispose(): void;
}

export function createBrowserNpcEntityServices(platform: BrowserNpcEntityPlatform): BrowserNpcEntityServiceOwner {
  const runtimeAdmins = createNativeRuntimeAdminOwner();
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
  return Object.freeze({ matrixModule, control, shutdown,
    services: Object.freeze({ crypto: platform.crypto, now: platform.now, control, runtimeAdmins,
      defaultPropertyComparator: () => known(nativeEntityDefaultComparatorImportIdentity) }),
    // One native callback stack preserves registration order across MemoryAdmin,
    // Matrix, MessageAdmin and ErrorAdmin. The platform drains it in reverse.
    dispose: () => { runtimeAdmins.dispose(); shutdown.dispose(); },
  });
}
