import type { NativeValue } from './dialogue';

export type NativeNavigationRoutinePoint = 'SleepingPoint' | 'WorkingPoint' | 'RelaxingPoint';

export interface NativeNavigationRoutinePointAssignment {
  readonly property: NativeNavigationRoutinePoint;
  readonly propertyId: string;
}

const EMPTY_PROPERTY_ID = '0'.repeat(40);

/** Source routine notifications select the matching row from all three point
 * arrays, then call SetSleepingPoint, SetWorkingPoint and SetRelaxingPoint in
 * that order. The native handler compares the selected index only with the
 * RoutineNames count; this reader additionally rejects a short point array
 * rather than emulating an out-of-bounds native read. */
export function nativeNavigationRoutinePointAssignments(routine: string, routineNames: readonly string[],
  points: Readonly<Record<NativeNavigationRoutinePoint, readonly string[]>>): NativeValue<readonly NativeNavigationRoutinePointAssignment[]> {
  const index = routineNames.indexOf(routine);
  if (index < 0 || index >= routineNames.length) {
    return { known: true, value: Object.freeze([
      Object.freeze({ property: 'SleepingPoint' as const, propertyId: EMPTY_PROPERTY_ID }),
      Object.freeze({ property: 'WorkingPoint' as const, propertyId: EMPTY_PROPERTY_ID }),
      Object.freeze({ property: 'RelaxingPoint' as const, propertyId: EMPTY_PROPERTY_ID }),
    ]) };
  }
  const assignments: NativeNavigationRoutinePointAssignment[] = [];
  for (const property of ['SleepingPoint', 'WorkingPoint', 'RelaxingPoint'] as const) {
    const rows = points[property];
    if (index >= rows.length) return { known: false,
      reason: 'RoutineNames[' + index + '] has no corresponding ' + property + ' row.' };
    const propertyId = rows[index]!;
    if (!/^[0-9a-f]{40}$/.test(propertyId)) return { known: false,
      reason: 'Routine point ' + property + '[' + index + '] is not a native 20-byte PropertyID.' };
    assignments.push(Object.freeze({ property, propertyId }));
  }
  return { known: true, value: Object.freeze(assignments) };
}
