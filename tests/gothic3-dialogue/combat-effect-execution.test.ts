import { describe, expect, it, vi } from 'vitest';
import { NativeMeleeEffectExecutor } from '../../src/gothic3/combat';
import type { NativeCombatEffect, NativeMeleeEffectHost, NativeMeleePlan } from '../../src/gothic3/combat';

const known = { status: 'known', value: undefined, source: 'test:verified-host-callback' } as const;
const plan = (effects: readonly NativeCombatEffect[], accepted = true): NativeMeleePlan => ({
  accepted, calculation: null, guard: null, reaction: accepted ? 23 : null,
  engineAppliesReceiverDamage: true, effects, deferredNativeBehavior: [],
});

function host(calls: string[]): NativeMeleeEffectHost {
  const note = (name: string) => (): typeof known => { calls.push(name); return known; };
  return {
    setLastAttacker: note('last-attacker'), setCurrentAttacker: note('current-attacker'),
    setStamina: note('stamina'), setHitPoints: note('hit-points'), setReceiverDamage: note('receiver-damage'),
    fullStopAndSetTask: note('task'), perceive: note('perception'), setLastInflictor: note('last-inflictor'),
    impactEffects: note('impact-effects'), entityOnDamage: note('entity-on-damage'),
  };
}

describe('native melee effect execution', () => {
  it('dispatches every effect in the plan’s native order', () => {
    const effects: NativeCombatEffect[] = [
      { type: 'setLastAttacker', victimId: 'orc', attackerId: null },
      { type: 'setCurrentAttacker', victimId: 'orc', attackerId: 'hero' },
      { type: 'setStamina', victimId: 'orc', value: 10, delta: -2 },
      { type: 'setHitPoints', victimId: 'orc', value: 80, delta: -2 },
      { type: 'setReceiverDamage', victimId: 'orc', amount: 2 },
      { type: 'fullStopAndSetTask', victimId: 'orc', task: 'ZS_Stumble', reaction: 23 },
      { type: 'perception', victimId: 'orc', attackerId: 'hero', kind: 'Attack' },
      { type: 'nativeBoundary', victimId: 'orc', operation: 'impactEffects' },
      { type: 'setLastInflictor', victimId: 'orc', carrierId: 'fist' },
      { type: 'nativeBoundary', victimId: 'orc', operation: 'entityOnDamage' },
    ];
    const calls: string[] = [];

    const result = new NativeMeleeEffectExecutor(host(calls)).execute(plan(effects));

    expect(result.outcome).toBe('complete');
    expect(result.applied).toEqual(effects);
    expect(result.attempted).toEqual(effects);
    expect(calls).toEqual(['last-attacker', 'current-attacker', 'stamina', 'hit-points', 'receiver-damage',
      'task', 'perception', 'impact-effects', 'last-inflictor', 'entity-on-damage']);
  });

  it('does not call the host for a rejected contact plan', () => {
    const calls: string[] = [];
    const result = new NativeMeleeEffectExecutor(host(calls)).execute(plan([
      { type: 'setHitPoints', victimId: 'orc', value: 0, delta: -10 },
    ], false));

    expect(result).toMatchObject({ outcome: 'rejected', applied: [], attempted: [], required: null });
    expect(calls).toEqual([]);
  });

  it('retains the exact applied prefix and stops when a native callback is unresolved', () => {
    const effects: NativeCombatEffect[] = [
      { type: 'setLastAttacker', victimId: 'orc', attackerId: null },
      { type: 'setCurrentAttacker', victimId: 'orc', attackerId: 'hero' },
      { type: 'setHitPoints', victimId: 'orc', value: 80, delta: -2 },
    ];
    const calls: string[] = [];
    const callbacks = host(calls);
    vi.spyOn(callbacks, 'setCurrentAttacker').mockReturnValue({ status: 'unknown', reason: 'NPC proxy callback missing' });

    const executor = new NativeMeleeEffectExecutor(callbacks);
    const result = executor.execute(plan(effects));
    const replay = executor.execute(plan(effects));

    expect(result.outcome).toBe('partial');
    expect(result.applied).toEqual(effects.slice(0, 1));
    expect(result.attempted).toEqual(effects.slice(0, 2));
    expect(result.required).toBe('NPC proxy callback missing');
    expect(replay).toMatchObject({ outcome: 'blocked', applied: [], attempted: [] });
    expect(calls).toEqual(['last-attacker']);
  });
});
