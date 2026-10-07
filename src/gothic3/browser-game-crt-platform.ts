/** Declared browser Win32 compatibility provider for the selected Game CRT
 * processAttach prefix. These ABI fields describe a virtual environment;
 * they are not observations of the browser's host OS or Windows thread IDs.
 * RuntimePlatform owns the real byte writes, heap/TLS/FLS/section operations
 * and pointer capabilities. Optional process inputs use declared copied
 * literals; DLL-entry entropy and later CRT owners remain separate. */
import type { NativeValue } from './dialogue';
import { NativeRuntimePlatform } from './native-runtime-platform';
import type { NativeEngineCrtPlatformServices } from './native-runtime-platform';
import { retainNativeWin32ProcessInputSelection } from './native-win32-process-inputs';
import type { NativeWin32ProcessInputSelection, RetainedWin32ProcessInputSelection } from './native-win32-process-inputs';
import type { NativeX86ThreadStackSelection } from './native-x86-thread-stack-profile';
import { retainNativeWin32StartupIoSelection } from './native-win32-startup-io';
import type { NativeWin32StartupIoSelection, RetainedWin32StartupIoSelection } from './native-win32-startup-io';
import { retainNativeWin32StandardIoSelection } from './native-win32-standard-io';
import type { NativeWin32StandardIoSelection, RetainedWin32StandardIoSelection } from './native-win32-standard-io';

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

export interface BrowserGameCrtProcessAbiProfile extends Omit<typeof browserGameCrtAbiProfile, 'profile' | 'commandLineProvided'> {
  readonly profile: 'browser-game-crt-virtual-win32-nt6.1-process-inputs-v2';
  readonly commandLineProvided: boolean;
  readonly environmentAProvided: boolean; readonly environmentWProvided: boolean;
  readonly processBufferAlignment: 4;
  readonly commandLineLifetime: 'stable-process-buffer';
  readonly environmentLifetime: 'per-acquisition-os-block';
  readonly environmentMutability: 'retained-live-buffers-no-reseed';
  readonly processInputOrigin: 'declared-virtual-process';
  readonly acpCodePage: 1252;
  readonly conversionCoverage: 'ascii-explicit-positive-count';
  readonly initialDirectionFlag: 0;
}
export interface BrowserGameCrtStackAbiProfile extends Omit<typeof browserGameCrtAbiProfile, 'profile' | 'commandLineProvided'> {
  readonly profile: 'browser-game-crt-virtual-win32-nt6.1-opaque-stack-v3';
  readonly commandLineProvided: boolean;
  readonly environmentAProvided: boolean; readonly environmentWProvided: boolean;
  readonly stackAddressModel: 'opaque-relative'; readonly stackReservationBytes: number;
  readonly initialStackRegisters: 'unknown'; readonly initialFs0: 'unknown';
}
export interface BrowserGameCrtStartupWriterAbiProfile extends Omit<BrowserGameCrtStackAbiProfile, 'profile'> {
  readonly profile: 'browser-game-crt-virtual-win32-nt6.1-startup-writer-v4';
  readonly startupInfoWriterProvided: boolean;
  readonly startupInfoOrigin: 'declared-virtual-process';
  readonly startupInfoCoverage: 'explicit-ordered-masked-writes';
  readonly startupInfoCallConvention: 'void-stdcall4';
  readonly startupInfoVolatileRegisters: 'unknown-EAX-ECX-EDX';
  readonly startupInfoNativeExceptionDispatchProvided: false;
}
export interface BrowserGameCrtStandardIoAbiProfile extends Omit<BrowserGameCrtStartupWriterAbiProfile, 'profile'> {
  readonly profile: 'browser-game-crt-virtual-win32-nt6.1-standard-io-v5';
  readonly standardHandleOrigin: 'declared-virtual-process';
  readonly standardHandleCapabilities: 'opaque-platform-owned';
  readonly sectionInitialization: 'owned-registration';
  readonly hostConsoleIoProvided: false;
}
export interface BrowserGameCrtPlatformProfile {
  readonly identity: object;
  readonly abi: typeof browserGameCrtAbiProfile | BrowserGameCrtProcessAbiProfile | BrowserGameCrtStackAbiProfile | BrowserGameCrtStartupWriterAbiProfile | BrowserGameCrtStandardIoAbiProfile;
  readonly thread: Readonly<{ capability: object; logicalId: number }>;
  /** Immutable descriptions, never OS-buffer or conversion authority. */
  readonly processInputs?: Readonly<{ identity: object; selection: RetainedWin32ProcessInputSelection }>;
  readonly threadStack?: Readonly<NativeX86ThreadStackSelection>;
  readonly startupIo?: Readonly<RetainedWin32StartupIoSelection>;
  readonly standardIo?: RetainedWin32StandardIoSelection;
}
// Only this factory can publish provider authority. Descriptive records or an
// arbitrary RuntimePlatform with similar service settings supply no proof.
const providers = new WeakMap<NativeRuntimePlatform, BrowserGameCrtPlatformProfile>();
let nextLogicalThreadId = 1;

export function browserGameCrtPlatformProfile(platform: NativeRuntimePlatform): NativeValue<BrowserGameCrtPlatformProfile> {
  const profile = providers.get(platform);
  if (!profile) return unknown('Actual factory-created browser Game CRT platform required');
  const active = NativeRuntimePlatform.requireActivePlatform(platform);
  if (!active.known) return active;
  if (profile.processInputs) {
    const endpoints = platform.processInputEndpoints;
    if (!endpoints) return unknown('Retained extended browser process-input endpoints required');
    const proof = NativeRuntimePlatform.canonicalProcessInputEndpointsForPlatform(platform, endpoints);
    if (!proof.known) return proof;
  } else if (platform.processInputEndpoints !== undefined) return unknown('Prefix-only browser profile cannot replace its process-input selection');
  if (profile.threadStack) {
    const stack = NativeRuntimePlatform.threadStackSelectionForPlatform(platform);
    if (!stack.known || stack.value !== profile.threadStack || stack.value.threadCapability !== profile.thread.capability) {
      return unknown('Actual retained same-logical-thread browser stack selection required');
    }
  }
  if (profile.startupIo) {
    const selected = NativeRuntimePlatform.startupIoSelectionForPlatform(platform);
    if (!selected.known || selected.value !== profile.startupIo) return unknown('Actual retained browser startup writer selection required');
    const endpoints = platform.startupIoEndpoints;
    if (profile.startupIo.startupInfoA) {
      if (!endpoints) return unknown('Actual retained browser startup writer endpoint required');
      const proof = NativeRuntimePlatform.canonicalStartupIoEndpointsForPlatform(platform, endpoints); if (!proof.known) return proof;
    } else if (endpoints !== undefined) return unknown('Absent selected startup writer cannot acquire a replacement endpoint');
  } else if (platform.startupIoEndpoints !== undefined) return unknown('Browser profile cannot replace its absent startup writer');
  if (profile.standardIo) {
    const selected = NativeRuntimePlatform.standardIoSelectionForPlatform(platform);
    if (!selected.known || selected.value !== profile.standardIo) return unknown('Actual retained browser standard-I/O selection required');
    const endpoints = platform.standardIoEndpoints;
    if (!endpoints) return unknown('Actual retained browser standard-I/O endpoints required');
    const proof = NativeRuntimePlatform.canonicalStandardIoEndpointsForPlatform(platform, endpoints);
    if (!proof.known) return proof;
  } else if (platform.standardIoEndpoints !== undefined) return unknown('Browser profile cannot replace its absent standard-I/O selection');
  return known(profile);
}

/** Construct a fresh actual platform before any Game owner retains its host.
 * The logical ID is allocated once and stays stable; its callback returns that
 * private retained capability's ID rather than a guessed known-success value. */
export function createBrowserGameCrtPlatform(options: { readonly processInputs?: NativeWin32ProcessInputSelection;
  readonly threadStack?: Readonly<{ reservationBytes: number }>; readonly startupIo?: NativeWin32StartupIoSelection;
  readonly standardIo?: NativeWin32StandardIoSelection } = {}): NativeRuntimePlatform {
  if (nextLogicalThreadId > 0xffffffff) throw new Error('Browser Game CRT logical thread-ID space exhausted');
  const thread = Object.freeze({ capability: Object.freeze({}), logicalId: nextLogicalThreadId++ });
  const identity = Object.freeze({});
  const { processInputs, threadStack, startupIo, standardIo } = options;
  if (startupIo !== undefined && threadStack === undefined) throw new Error('Explicit startup writer requires a selected opaque logical-thread stack');
  if (standardIo !== undefined && (threadStack === undefined || startupIo === undefined)) throw new Error('Explicit standard I/O requires selected startup data and an opaque logical-thread stack');
  const stackSelection: NativeX86ThreadStackSelection | undefined = threadStack === undefined ? undefined : Object.freeze({
    threadCapability: thread.capability, reservationBytes: threadStack.reservationBytes, addressModel: 'opaque-relative',
    initialRegisters: 'unknown', initialFs0: 'unknown',
  });
  const process = processInputs === undefined ? undefined : retainNativeWin32ProcessInputSelection(processInputs);
  const startup = startupIo === undefined ? undefined : retainNativeWin32StartupIoSelection(startupIo);
  const standard = standardIo === undefined ? undefined : retainNativeWin32StandardIoSelection(standardIo);
  const baseAbi = process === undefined ? browserGameCrtAbiProfile : Object.freeze({
    ...browserGameCrtAbiProfile, profile: 'browser-game-crt-virtual-win32-nt6.1-process-inputs-v2',
    commandLineProvided: process.commandLineA !== undefined, environmentAProvided: process.environmentA !== undefined,
    environmentWProvided: process.environmentW !== undefined, processBufferAlignment: 4,
    commandLineLifetime: 'stable-process-buffer', environmentLifetime: 'per-acquisition-os-block',
    environmentMutability: 'retained-live-buffers-no-reseed', processInputOrigin: 'declared-virtual-process',
    acpCodePage: process.acpCodePage, conversionCoverage: process.conversionCoverage, initialDirectionFlag: process.initialDirectionFlag,
  });
  const stackAbi = stackSelection === undefined ? baseAbi : Object.freeze({
    ...baseAbi, profile: 'browser-game-crt-virtual-win32-nt6.1-opaque-stack-v3',
    commandLineProvided: process?.commandLineA !== undefined, environmentAProvided: process?.environmentA !== undefined,
    environmentWProvided: process?.environmentW !== undefined, stackAddressModel: stackSelection.addressModel,
    stackReservationBytes: stackSelection.reservationBytes, initialStackRegisters: stackSelection.initialRegisters,
    initialFs0: stackSelection.initialFs0,
  });
  const startupAbi = startup === undefined ? stackAbi : Object.freeze({
    ...stackAbi, profile: 'browser-game-crt-virtual-win32-nt6.1-startup-writer-v4',
    commandLineProvided: process?.commandLineA !== undefined, environmentAProvided: process?.environmentA !== undefined,
    environmentWProvided: process?.environmentW !== undefined, stackAddressModel: stackSelection!.addressModel,
    stackReservationBytes: stackSelection!.reservationBytes, initialStackRegisters: stackSelection!.initialRegisters,
    initialFs0: stackSelection!.initialFs0, startupInfoWriterProvided: startup.startupInfoA !== undefined,
    startupInfoOrigin: 'declared-virtual-process', startupInfoCoverage: 'explicit-ordered-masked-writes',
    startupInfoCallConvention: 'void-stdcall4', startupInfoVolatileRegisters: 'unknown-EAX-ECX-EDX',
    startupInfoNativeExceptionDispatchProvided: false,
  });
  const abi: BrowserGameCrtPlatformProfile['abi'] = standard === undefined ? startupAbi : Object.freeze({
    ...startupAbi, profile: 'browser-game-crt-virtual-win32-nt6.1-standard-io-v5',
    commandLineProvided: process?.commandLineA !== undefined, environmentAProvided: process?.environmentA !== undefined,
    environmentWProvided: process?.environmentW !== undefined, stackAddressModel: stackSelection!.addressModel,
    stackReservationBytes: stackSelection!.reservationBytes, initialStackRegisters: stackSelection!.initialRegisters,
    initialFs0: stackSelection!.initialFs0, startupInfoWriterProvided: startup!.startupInfoA !== undefined,
    startupInfoOrigin: 'declared-virtual-process', startupInfoCoverage: 'explicit-ordered-masked-writes',
    startupInfoCallConvention: 'void-stdcall4', startupInfoVolatileRegisters: 'unknown-EAX-ECX-EDX',
    startupInfoNativeExceptionDispatchProvided: false, standardHandleOrigin: 'declared-virtual-process',
    standardHandleCapabilities: 'opaque-platform-owned', sectionInitialization: standard.sectionInitialization,
    hostConsoleIoProvided: false,
  });
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
    processInputs: process,
    threadStack: stackSelection,
    startupIo: startup,
    standardIo: standard,
  });
  platform = new NativeRuntimePlatform({ engineCrtServices: services });
  const retainedStack = stackSelection === undefined ? undefined : NativeRuntimePlatform.threadStackSelectionForPlatform(platform);
  if (retainedStack && !retainedStack.known) throw new Error(retainedStack.reason);
  const retainedStartup = startup === undefined ? undefined : NativeRuntimePlatform.startupIoSelectionForPlatform(platform);
  if (retainedStartup && !retainedStartup.known) throw new Error(retainedStartup.reason);
  const retainedStandard = standard === undefined ? undefined : NativeRuntimePlatform.standardIoSelectionForPlatform(platform);
  if (retainedStandard && !retainedStandard.known) throw new Error(retainedStandard.reason);
  providers.set(platform, Object.freeze({ identity, abi, thread, threadStack: retainedStack?.known ? retainedStack.value : undefined,
    startupIo: retainedStartup?.known ? retainedStartup.value : undefined,
    standardIo: retainedStandard?.known ? retainedStandard.value : undefined,
    processInputs: process === undefined ? undefined : Object.freeze({ identity: Object.freeze({}), selection: process }) }));
  return platform;
}
