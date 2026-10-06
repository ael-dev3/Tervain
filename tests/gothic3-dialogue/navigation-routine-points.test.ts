import { describe, expect, it } from 'vitest';
import { nativeNavigationRoutinePointAssignments } from '../../src/gothic3/navigation-routine';

const a = '0123456789abcdef0123456789abcdef00000000';
const b = 'fedcba9876543210fedcba987654321000000000';

describe('native Navigation routine point selection', () => {
  it('selects the routine row and preserves native setter order', () => {
    const result = nativeNavigationRoutinePointAssignments('Braga', ['Start', 'Braga'], {
      SleepingPoint: [a, b], WorkingPoint: [a, b], RelaxingPoint: [a, b],
    });
    expect(result).toEqual({ known: true, value: [
      { property: 'SleepingPoint', propertyId: b },
      { property: 'WorkingPoint', propertyId: b },
      { property: 'RelaxingPoint', propertyId: b },
    ] });
  });

  it('clears all three point fields in native setter order for an unknown routine', () => {
    const result = nativeNavigationRoutinePointAssignments('Missing', ['Start'], {
      SleepingPoint: [a], WorkingPoint: [a], RelaxingPoint: [a],
    });
    expect(result).toEqual({ known: true, value: [
      { property: 'SleepingPoint', propertyId: '0'.repeat(40) },
      { property: 'WorkingPoint', propertyId: '0'.repeat(40) },
      { property: 'RelaxingPoint', propertyId: '0'.repeat(40) },
    ] });
  });

  it('refuses a short indexed point array instead of reading beyond its storage', () => {
    const result = nativeNavigationRoutinePointAssignments('Braga', ['Start', 'Braga'], {
      SleepingPoint: [a], WorkingPoint: [a, b], RelaxingPoint: [a, b],
    });
    expect(result).toMatchObject({ known: false, reason: 'RoutineNames[1] has no corresponding SleepingPoint row.' });
  });
});
