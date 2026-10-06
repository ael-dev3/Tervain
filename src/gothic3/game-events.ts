/** Browser-owned mirror of Script.dll PSPlayerMemory game-event operations.
 * The source is an ordered bCString array: Set appends only when Find misses;
 * Clear finds the first matching value and removes that one slot. */
import receiptText from '../../assets/gothic3/dialogue/game-events-receipt.json?raw';

const receipt = JSON.parse(receiptText) as {
  schema: string; nativeExecution: boolean; scriptModuleSha256: string;
  evidence: { path: string; sha256: string; allRecordedInstructionBytesMatchSourcePE: boolean };
  methods: { set: { entryVA: string; bodyVA: string; arrayOffset: number; appendWhenFindReturns: number };
    clear: { entryVA: string; bodyVA: string; arrayOffset: number; removeFirstMatchingEntry: boolean } };
};
if (receipt.schema !== 'gothic3-player-game-events-rules-v1' || receipt.nativeExecution !== false ||
    receipt.scriptModuleSha256 !== '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08' ||
    receipt.evidence.path !== 'assets/gothic3/dialogue/native-evidence.json' ||
    receipt.evidence.sha256 !== '376b5df5539a8743c69c5e4e95eb25956b42508d8b6c095d4c39268146676d08' ||
    receipt.evidence.allRecordedInstructionBytesMatchSourcePE !== true ||
    receipt.methods.set.entryVA !== '0x100022a7' || receipt.methods.set.bodyVA !== '0x100287e0' ||
    receipt.methods.set.arrayOffset !== 24 || receipt.methods.set.appendWhenFindReturns !== -1 ||
    receipt.methods.clear.entryVA !== '0x100022de' || receipt.methods.clear.bodyVA !== '0x10028790' ||
    receipt.methods.clear.arrayOffset !== 24 || receipt.methods.clear.removeFirstMatchingEntry !== true) {
  throw new Error('Original Script.dll PlayerKnows operation receipt differs.');
}

export class NativeGameEvents {
  private readonly values: string[];

  constructor(initial: readonly string[] = []) {
    if (!Array.isArray(initial) || initial.some((value) => typeof value !== 'string' || value.includes('\0'))) {
      throw new Error('Original PlayerKnows seed must contain native bCString values.');
    }
    this.values = [...initial];
  }

  isSet(event: string): boolean {
    this.requireCString(event);
    return this.values.indexOf(event) !== -1;
  }

  /** PSPlayerMemory::SetGameEvent returns true for a live PlayerMemory receiver,
   * preserving an existing entry and appending a missing one. */
  set(event: string): true {
    this.requireCString(event);
    if (this.values.indexOf(event) === -1) this.values.push(event);
    return true;
  }

  /** PSPlayerMemory::ClearGameEvent returns true for a live receiver and removes
   * only the first matching entry, as the native Find/RemoveAt sequence does. */
  clear(event: string): true {
    this.requireCString(event);
    const index = this.values.indexOf(event);
    if (index !== -1) this.values.splice(index, 1);
    return true;
  }

  snapshot(): readonly string[] { return this.values.slice(); }

  private requireCString(event: string): void {
    if (typeof event !== 'string' || event.includes('\0')) throw new Error('Native game event needs a valid bCString.');
  }
}
