/** Browser scheduling for the admitted Game process-attach body. The declared
 * compatibility platform supplies lower operations; the native source owner
 * retains any incomplete attach instead of skipping to C/C++ initializers. */
import type { NativeValue } from './dialogue';
import { NativeCrtBootstrap } from './native-crt-bootstrap';
import { NativeGameCrtOwner } from './native-game-crt';
import type { NativeModuleCrtHost } from './native-game-crt';
import { browserGameCrtPlatformProfile } from './browser-game-crt-platform';
import type { BrowserGameCrtPlatformProfile } from './browser-game-crt-platform';
import type { NativeRuntimePlatform } from './native-runtime-platform';
import { NativeMemoryAdmin } from './native-memory-admin';
import { bindNativeGameLayerBaseMemory } from './native-game-layer-base-class-name';
import { NativeSharedStaticTls } from './native-shared-static-tls';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = (reason: string): { known: false; reason: string } => ({ known: false, reason });

export interface BrowserGameCrtStartup {
  readonly compatibility: BrowserGameCrtPlatformProfile;
  readonly crt: NativeGameCrtOwner;
  readonly bootstrap: NativeCrtBootstrap;
  /** Actual source execution result, including an incomplete attach boundary. */
  readonly attachResult: NativeValue<number>;
  /** Description captured after that execution; never continuation authority. */
  readonly attachProgress: ReturnType<NativeCrtBootstrap['attachProgress']>;
  readonly selectedEntry: 'Game:204677e4';
  readonly dllEntryExecuted: false;
  readonly crtTraversalCompleted: false;
  readonly nativeModuleInstantiated: false;
}
interface RetainedStartup {
  readonly memory: NativeMemoryAdmin | null;
  readonly compatibility: BrowserGameCrtPlatformProfile;
  phase: 'constructing' | 'returned';
  interruption: string | null;
  host: NativeModuleCrtHost | null;
  bootstrap: NativeCrtBootstrap | null;
  sharedTls: NativeSharedStaticTls | null;
  result: NativeValue<BrowserGameCrtStartup>;
}
const retained = new WeakMap<NativeRuntimePlatform, RetainedStartup>();

/** Checks the actual retained graph and current platform, rather than a
 * caller-created description of completed prerequisites. */
export function canonicalBrowserGameCrtStartup(graph: BrowserGameCrtStartup,
  platform: NativeRuntimePlatform): NativeValue<void> {
  const profile = browserGameCrtPlatformProfile(platform);
  if (!profile.known) return profile;
  const entry = retained.get(platform);
  const tls=NativeSharedStaticTls.forPlatform(platform);
  if (!entry || entry.phase !== 'returned' || entry.interruption || !entry.result.known ||
      !tls.known || tls.value!==entry.sharedTls || !tls.value.snapshot().loaded ||
      entry.result.value !== graph || entry.compatibility !== profile.value ||
      graph.compatibility !== profile.value || entry.host !== graph.crt.host ||
      entry.bootstrap !== graph.bootstrap || graph.bootstrap.crt !== graph.crt) {
    return unknown('Actual retained same-platform browser Game startup graph required');
  }
  const image = NativeGameCrtOwner.canonicalImageForPlatform(graph.crt, platform, 'scriptAdminPropertyIdLiteral');
  return image.known ? known(undefined) : image;
}

/** Construct the final host descriptor before the first canonical Game owner.
 * A retained interrupted graph cannot acquire replacement callbacks or replay. */
export function createBrowserGameCrtStartup(platform: NativeRuntimePlatform, memory?: NativeMemoryAdmin): NativeValue<BrowserGameCrtStartup> {
  const profile = browserGameCrtPlatformProfile(platform);
  if (!profile.known) return profile;
  const previous = retained.get(platform);
  if (previous) {
    if (memory && previous.memory !== memory) return unknown('Browser Game startup cannot replace its retained SharedBase MemoryAdmin');
    if (previous.compatibility !== profile.value) return unknown('Browser Game startup cannot replace its retained compatibility provider');
    if (previous.phase === 'constructing') {
      previous.interruption = 'Reentry into browser Game startup is unowned';
      return unknown(previous.interruption);
    }
    if (previous.result.known) {
      const proof = canonicalBrowserGameCrtStartup(previous.result.value, platform);
      if (!proof.known) return proof;
    }
    return previous.result;
  }
  if (memory) {
    const bound = bindNativeGameLayerBaseMemory(platform, memory);
    if (!bound.known) return bound;
  }
  const entry: RetainedStartup = { memory: memory ?? null, compatibility: profile.value, phase: 'constructing',
    interruption: null, host: null, bootstrap: null, sharedTls: null,
    result: unknown('Browser Game startup is constructing') };
  retained.set(platform, entry);
  const guard = (): void => {
    if (entry.interruption) throw new Error(entry.interruption);
    const active = browserGameCrtPlatformProfile(platform);
    if (!active.known) throw new Error(active.reason);
    if (active.value !== entry.compatibility) throw new Error('Retained browser CRT compatibility identity differs');
  };
  let result: NativeValue<BrowserGameCrtStartup>;
  try {
    // The declared VM loads SharedBase's pinned static TLS template before
    // Game startup. This is loader state, not SharedBase CRT or DLL attach.
    const tls=NativeSharedStaticTls.forPlatform(platform);
    if(!tls.known)throw new Error(tls.reason);
    entry.sharedTls=tls.value;
    const loaded=NativeSharedStaticTls.prototype.loadSharedBase.call(tls.value);
    if(!loaded.known)throw new Error(loaded.reason);
    guard();
    const host: NativeModuleCrtHost = Object.freeze({ platform,
      errnoSlot: () => entry.bootstrap ? entry.bootstrap.thread.errnoSlot()
        : unknown('Game errno requires its actual retained bootstrap thread owner'),
      getLastError: () => platform.getWin32LastError() });
    entry.host = host;
    const crt = NativeGameCrtOwner.forPlatform(host);
    if (crt.host.platform !== platform || crt.host.errnoSlot !== host.errnoSlot ||
        crt.host.getLastError !== host.getLastError) throw new Error('Canonical Game host callback identities differ');
    // The canonical owner intentionally retains its own frozen descriptor;
    // callback identities, rather than the caller descriptor object, survive.
    entry.host = crt.host;
    guard();
    const image = NativeGameCrtOwner.canonicalImageForPlatform(crt, platform, 'scriptAdminPropertyIdLiteral');
    if (!image.known) throw new Error(image.reason);
    const bootstrap = NativeCrtBootstrap.forCrt(crt);
    entry.bootstrap = bootstrap;
    guard();
    const attachResult = Object.freeze(NativeCrtBootstrap.processAttachForCrt(bootstrap, crt));
    guard();
    result = known(Object.freeze({ compatibility: entry.compatibility, crt, bootstrap, attachResult,
      attachProgress: bootstrap.attachProgress(), selectedEntry: 'Game:204677e4',
      dllEntryExecuted: false, crtTraversalCompleted: false, nativeModuleInstantiated: false }));
  } catch (failure) {
    result = unknown(failure instanceof Error ? failure.message : String(failure));
  }
  entry.result = Object.freeze(result);
  entry.phase = 'returned';
  return entry.result;
}
