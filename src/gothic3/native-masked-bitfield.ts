/** Exact bit result of A XOR ((A XOR B) AND M), once the caller proves
 * that both reads are the same original physical word. */
export function nativeMaskedBitfieldAssignment(original:{value:number;knownMask:number},selected:{value:number;knownMask:number},mask:number):{value:number;knownMask:number}{
 return {value:((original.value&~mask)|(selected.value&mask))>>>0,
  knownMask:((original.knownMask&~mask)|(selected.knownMask&mask))>>>0};
}
