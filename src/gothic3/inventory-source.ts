/** Verified intrinsic stack facts, kept separate from unapplied runtime observers. */
import auditText from '../../assets/gothic3/inventory/audit.json?raw';
import type { InitializedEquipment, InitializedPlayerSeed } from './initial-state';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export interface IntrinsicInventoryRecord {
  index: number; templateName: string; templateGuid20: string; amount: number;
  quality: number; quickSlot: number | null; hotKeyUnsigned: number;
  stackType: 0; linkedSlot: 0; activationCount: 0; transactionAmount: 0;
  intrinsicLearned: boolean;
  externalObserverEffects: 'requires-complete-runtime-observer-registry';
}
export interface IntrinsicInventoryDocument {
  schema: 'gothic3-native-starting-inventory-v1'; schemaVersion: 1;
  sourceSeed: ResourceReceipt & { url: string };
  scope: 'intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping';
  stacks: IntrinsicInventoryRecord[]; equipment: InitializedEquipment[];
  counts: { stacks: 121; intrinsicLearnedTrue: 5; intrinsicLearnedFalse: 116; serializedEquipment: 2 };
  limitations: string[];
}
const audit = JSON.parse(auditText) as { nativeCodeExecuted: boolean;
  outputs: (ResourceReceipt & { url: string })[]; audit: { allInstructionBytesMatch: boolean } };
const output = audit.outputs?.find((record) => record.url === 'starting-inventory.json');
if (!output || audit.nativeCodeExecuted !== false || audit.audit?.allInstructionBytesMatch !== true) {
  throw new Error('Invalid intrinsic starting-inventory receipt');
}
const receipt = output;

/** Does not call CreateItems, inventory observers, item use or equipment methods. */
export async function loadOriginalIntrinsicInventory(seed: InitializedPlayerSeed): Promise<IntrinsicInventoryDocument> {
  const document = await readNativeResource<IntrinsicInventoryDocument>('inventory/' + receipt.url, receipt);
  if (document.schema !== 'gothic3-native-starting-inventory-v1' || document.schemaVersion !== 1 ||
      document.scope !== 'intrinsic-stack-state-before-external-inventory-observers-and-later-startup-equipping' ||
      document.sourceSeed?.url !== '../gameplay/initial/initialized-player.json' ||
      !Array.isArray(document.stacks) || document.stacks.length !== 121 || seed.inventory.stacks.length !== 121 ||
      !Array.isArray(document.equipment) || document.equipment.length !== 2 ||
      !Array.isArray(document.limitations) || document.counts?.stacks !== 121 ||
      document.counts.intrinsicLearnedTrue !== 5 || document.counts.intrinsicLearnedFalse !== 116 ||
      document.counts.serializedEquipment !== 2) throw new Error('Invalid intrinsic inventory source document');
  // Both documents are independently byte-verified. Identity and operand checks
  // prevent a future seed change from silently receiving stale intrinsic flags.
  let learned = 0;
  for (const [index, stack] of document.stacks.entries()) {
    const original = seed.inventory.stacks[index];
    if (!original || stack.index !== index || original.index !== index ||
        stack.templateGuid20 !== original.templateGuid20 || stack.templateName !== original.templateName ||
        stack.amount !== original.amount || stack.quality !== original.quality || stack.quickSlot !== original.quickSlot ||
        stack.hotKeyUnsigned !== original.hotKeyUnsigned || stack.stackType !== 0 || stack.linkedSlot !== 0 ||
        stack.activationCount !== 0 || stack.transactionAmount !== 0 || typeof stack.intrinsicLearned !== 'boolean' ||
        stack.intrinsicLearned !== (original.learnedOperation === 'setTrue') ||
        stack.externalObserverEffects !== 'requires-complete-runtime-observer-registry') {
      throw new Error('Intrinsic inventory facts differ from original assurance ' + index);
    }
    learned += Number(stack.intrinsicLearned);
  }
  if (learned !== 5) throw new Error('Intrinsic learned count differs from audited original calls');
  for (const [index, equipment] of document.equipment.entries()) {
    const original = seed.inventory.equipment[index];
    if (!original || original.slotIndex !== equipment.slotIndex || original.itemGuid20 !== equipment.itemGuid20 ||
        original.templateGuid20 !== equipment.templateGuid20 || original.templateName !== equipment.templateName) {
      throw new Error('Original serialized equipment identity differs');
    }
  }
  return document;
}
