import type { NativeValue } from './dialogue';
import { NativeEngineInputDispatcher } from './native-engine-input-dispatcher';
import type { NativeEngineInputDispatcherHost } from './native-engine-input-dispatcher';
import { NativeEngineModuleAdmin } from './native-engine-module-admin';
import type { NativeEngineModuleAdminHost } from './native-engine-module-admin';
import type { NativeMemoryAdmin } from './native-memory-admin';
import type { NativeConstructedSceneAdmin, NativeSceneModuleAdmin } from './native-scene-admin';

export interface NativeEngineModuleOwnerHost<M extends object, R extends object = object>
  extends NativeEngineInputDispatcherHost<M, R>,
    Pick<NativeEngineModuleAdminHost<M>, 'moduleClassNameEquals' | 'registerShutdown'> {}

/** Compose the real dispatcher base with ModuleAdmin's retained static object.
 * Initialization occurs when the source getter is called. Name comparison and
 * non-NULL receiver/application services must come from their existing owners. */
export function createNativeEngineModuleOwner<M extends object, R extends object = object>(
  memory: Pick<NativeMemoryAdmin, 'realloc' | 'free'>, host: NativeEngineModuleOwnerHost<M, R>) {
  const dispatcher = new NativeEngineInputDispatcher(memory, host);
  const moduleAdmin = new NativeEngineModuleAdmin<M>({
    ...dispatcher.moduleAdminOperations(),
    moduleClassNameEquals: (module, requestedName) => host.moduleClassNameEquals(module, requestedName),
    registerShutdown: (address, owner, callback) => host.registerShutdown(address, owner, callback),
  }, memory);
  return Object.freeze({ moduleAdmin, dispatcher });
}

/** Actual eCSceneAdmin constructor registration through ModuleAdmin virtual+74.
 * This bridge supplies no reflected creator, cached SceneAdmin singleton,
 * class-name comparison or application startup. The caller must retain those
 * owners independently and provide the scene's physical component fields. */
export function nativeSceneModuleAdminLookup(moduleAdmin: NativeEngineModuleAdmin<NativeConstructedSceneAdmin>):
  () => NativeValue<NativeSceneModuleAdmin | null> {
  const bridge: NativeSceneModuleAdmin = Object.freeze({
    identity: moduleAdmin,
    vtableRegistrationSlot: 0x74,
    registerSceneComponent: (scene: NativeConstructedSceneAdmin): NativeValue<void> => {
      const registered = moduleAdmin.registerModule(scene);
      return registered.known ? { known: true, value: undefined } : registered;
    },
  });
  return () => {
    const instance = moduleAdmin.getInstance();
    return instance.known ? { known: true, value: bridge } : instance;
  };
}
