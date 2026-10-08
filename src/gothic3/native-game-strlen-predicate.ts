/** Exact possible results of Game _strlen's original x86 DWORD predicate:
 * ((~word ^ (word + 0x7efefeff)) & 0x81010100) != 0.
 * Unknown bits remain unconstrained. Carry and accumulated predicate state
 * suffice to cover every completion without exponential enumeration. */
import type { NativeValue } from './dialogue';
export function gameStrlenDwordCandidate(value: number, knownMask: number): NativeValue<boolean> {
  // State bit: carry in bit 0, any selected predicate bit in bit 1.
  let states = new Set<number>([0]);
  for (let bit = 0; bit < 32; bit++) {
    const constant = (0x7efefeff >>> bit) & 1;
    const selected = ((0x81010100 >>> bit) & 1) !== 0;
    const known = ((knownMask >>> bit) & 1) !== 0;
    const fixed = (value >>> bit) & 1;
    const next = new Set<number>();
    for (const state of states) {
      for (const input of known ? [fixed] : [0,1]) {
        const sum = input + constant + (state & 1);
        const hit = (state & 2) !== 0 || (selected && ((input ^ 1 ^ (sum & 1)) !== 0));
        next.add((sum >= 2 ? 1 : 0) | (hit ? 2 : 0));
      }
    }
    states = next;
  }
  const results = new Set([...states].map(state => (state & 2) !== 0));
  return results.size === 1 ? { known:true,value:[...results][0]! } :
    { known:false,reason:'Game _strlen DWORD predicate is ambiguous' };
}
