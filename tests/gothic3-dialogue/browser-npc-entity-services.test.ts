import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
// These execute original instructions: about 4-5 seconds each locally; use a longer timeout under CI load.
vi.setConfig({ testTimeout: 30_000 });
import { BrowserMatrixShutdownRegistry, createBrowserNpcEntityServices } from '../../src/gothic3/browser-npc-entity-services';
import { OriginalControlModuleState } from '../../src/gothic3/control-reading';

describe('selected browser NPC platform services', () => {
  it('retains the actual shared Matrix module and registers its destructor once', () => {
    const owner = createBrowserNpcEntityServices({ crypto: { randomUUID }, now: () => 42 });
    expect(owner.scriptAdminStartup.known).toBe(true);
    if(!owner.scriptAdminStartup.known)throw new Error(owner.scriptAdminStartup.reason);
    const startup=owner.scriptAdminStartup.value;
    expect(startup.sharedCrt!.snapshot().attachReturned).toBe(1);
    expect(startup.sharedCrt!.snapshot().ptdInstalled).toBe(true);
    expect(startup.shared.snapshot().executionOrigin).toBe('returned-crt');
    expect(startup.shared.snapshot().reachedInstructions).toEqual([]);
    expect(startup.selectedOrder).toEqual(['SharedBase:100ada4c','Game:204677e4']);
    expect(startup.propertyIdInvocation).toBe('not-entered');
    expect(startup.prerequisites.attachResult.known).toBe(false);
    if(startup.prerequisites.attachResult.known)throw new Error('Unfinished Game startup returned');
    expect(startup.prerequisites.attachResult.reason).toContain('Engine prior MBC release preparation at30684ee0');
    const first = owner.control.matrixIdentity();
    const second = owner.control.matrixIdentity();
    expect(first.known).toBe(true);
    expect(second).toEqual(first);
    expect(owner.shutdown.registrations().map(({ module, address }) => ({ module, address })))
      .toEqual([{ module: owner.matrixModule, address: '100e2910' }]);
    expect(typeof owner.shutdown.registrations()[0]?.callback).toBe('function');
    expect(owner.services.control).toBe(owner.control);
    expect(owner.matrixModule.identityGuard.value & 1).toBe(1);
  },30000);

  it('drains real callback registrations in reverse order once', () => {
    const registry = new BrowserMatrixShutdownRegistry();
    const first = OriginalControlModuleState.fromColdOriginalImage();
    const second = OriginalControlModuleState.fromColdOriginalImage();
    expect(registry.register(first, '100e2910')).toEqual({ known: true, value: 0 });
    expect(registry.register(second, '100e2910')).toEqual({ known: true, value: 0 });
    registry.dispose();
    expect(registry.registrations()).toEqual([]);
    expect(registry.execution().map(entry => entry.module)).toEqual([second, first]);
    registry.dispose();
    expect(registry.execution()).toHaveLength(2);
    expect(registry.register(first, '100e2910').known).toBe(false);
  });

  it('executes the admitted RET without clearing Matrix cache or guard storage', () => {
    const owner = createBrowserNpcEntityServices({ crypto: { randomUUID }, now: () => 42 });
    const identity = owner.control.matrixIdentity();
    expect(identity.known).toBe(true);
    const bytes = owner.matrixModule.identity.bytes.slice();
    const masks = owner.matrixModule.identity.knownMask.slice();
    const guard = { ...owner.matrixModule.identityGuard };
    owner.dispose();
    expect(owner.shutdown.execution()).toHaveLength(1);
    expect(owner.matrixModule.identity.bytes).toEqual(bytes);
    expect(owner.matrixModule.identity.knownMask).toEqual(masks);
    expect(owner.matrixModule.identityGuard).toEqual(guard);
  },30000);

  it('retains no success registration for an unadmitted callback', () => {
    const registry = new BrowserMatrixShutdownRegistry();
    const module = OriginalControlModuleState.fromColdOriginalImage();
    expect(registry.register(module, 'unported' as '100e2910').known).toBe(false);
    expect(registry.registrations()).toEqual([]);
  });
});
