/** Declared browser Win32 compatibility provider for the selected Game CRT
 * processAttach prefix. These ABI fields describe a virtual environment;
 * they are not observations of the browser's host OS or Windows thread IDs.
 * RuntimePlatform owns the real byte writes, heap/TLS/FLS/section operations
 * and pointer capabilities. Command line, DLL-entry entropy and later CRT
 * startup services remain absent until their actual owners are supplied. */
import type { NativeValue } from './dialogue';
import { NativeRuntimePlatform } from './native-runtime-platform';
import type { NativeEngineCrtPlatformServices } from './native-runtime-platform';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });

/** One coherent declared x86 Win32 ABI. Platform2/major6 selects this source's
 * heap mode1 and modern pointer-export branches. FLS and spin-count exports
 * are explicit contracts backed by RuntimePlatform's actual registries. */
export const browserGameCrtAbiProfile = Object.freeze({
  profile: 'browser-game-crt-virtual-win32-nt6.1-v1' as const,
  virtualOsVersion: Object.freeze({ platform: 2, major: 6, minor: 1, build: 7601 }),
  kernel32Available: true,
  pointerCodec: 'owned-bijection' as const,
  sectionSpinProcedure: true,
  fiberLocalStorage: true,
  processHeap: true,
  initialTls: 'empty' as const,
  threadModel: 'one-allocated-logical-thread-per-runtime-platform' as const,
  nativeWindowsFunctionsExecuted: false,
  hostOsObserved: false,
  completeSecurityCookieEntropyProvided: false,
  commandLineProvided: false,
});

export interface BrowserGameCrtPlatformProfile {
  readonly identity: object;
  readonly abi: typeof browserGameCrtAbiProfile;
  readonly thread: Readonly<{ capability: object; logicalId: number }>;
}
// Only this factory can publish provider authority. Descriptive records or an
// arbitrary RuntimePlatform with similar service settings supply no proof.
const providers = new WeakMap<NativeRuntimePlatform, BrowserGameCrtPlatformProfile>();
let nextLogicalThreadId = 1;

export function browserGameCrtPlatformProfile(platform: NativeRuntimePlatform): NativeValue<BrowserGameCrtPlatformProfile> {
  const profile = providers.get(platform);
  if (!profile) return unknown('Actual factory-created browser Game CRT platform required');
  const active = NativeRuntimePlatform.requireActivePlatform(platform);
  return active.known ? known(profile) : active;
}

/** Construct a fresh actual platform before any Game owner retains its host.
 * The logical ID is allocated once and stays stable; its callback returns that
 * private retained capability's ID rather than a guessed known-success value. */
export function createBrowserGameCrtPlatform(): NativeRuntimePlatform {
  if (nextLogicalThreadId > 0xffffffff) throw new Error('Browser Game CRT logical thread-ID space exhausted');
  const thread = Object.freeze({ capability: Object.freeze({}), logicalId: nextLogicalThreadId++ });
  const identity = Object.freeze({});
  let platform: NativeRuntimePlatform | null = null;
  const currentThreadId = (): NativeValue<number> => {
    if (!platform) return unknown('Browser Game CRT platform construction has not completed');
    const retained = browserGameCrtPlatformProfile(platform);
    if (!retained.known) return retained;
    if (retained.value.identity !== identity || retained.value.thread !== thread) {
      return unknown('Actual retained logical browser Game CRT thread capability required');
    }
    return known(thread.logicalId);
  };
  const services: NativeEngineCrtPlatformServices = Object.freeze({
    tlsValues: new Map<number, object>(),
    kernel32Available: browserGameCrtAbiProfile.kernel32Available,
    pointerCodec: browserGameCrtAbiProfile.pointerCodec,
    sectionSpinProcedure: browserGameCrtAbiProfile.sectionSpinProcedure,
    fiberLocalStorage: browserGameCrtAbiProfile.fiberLocalStorage,
    processHeap: browserGameCrtAbiProfile.processHeap,
    osVersion: browserGameCrtAbiProfile.virtualOsVersion,
    entropy: Object.freeze({ currentThreadId }),
  });
  platform = new NativeRuntimePlatform({ engineCrtServices: services });
  providers.set(platform, Object.freeze({ identity, abi: browserGameCrtAbiProfile, thread }));
  return platform;
}
