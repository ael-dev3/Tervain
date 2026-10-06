import { describe, expect, it, vi } from 'vitest';
import { NativeInventory } from '../../src/gothic3/inventory';
import type { InventoryTemplate, NativeInventorySnapshot } from '../../src/gothic3/inventory';
import type { InitializedEquipment } from '../../src/gothic3/initial-state';

const potion: InventoryTemplate = { name: 'It_TestPotion', guid20: '1'.repeat(40), useType: 16, category: 0,
  permanent: false, missionItem: false, skillGuid20: null, spellGuid20: null,
  itemPropertySetPresent: true, source: { path: 'test potion template', sha256: 'a'.repeat(64) } };
const other: InventoryTemplate = { ...potion, name: 'It_TestOther', guid20: '2'.repeat(40) };
const body: InitializedEquipment = { slotIndex: 17, slot: { enum: 'gESlot', version: 1, value: 17 },
  templateName: 'Body', templateGuid20: '3'.repeat(40), itemGuid20: '4'.repeat(40), status: 'serialized-equipped-slot' };

describe('browser inventory potion reduction', () => {
  it('removes an exhausted intrinsic stack, retains equipment identities, and saves contiguous indices', () => {
    const inventory = new NativeInventory([potion, other], { observers: [], equipment: [body] });
    inventory.createItems(potion.guid20, 0, 2);
    inventory.createItems(other.guid20, 0, 3);
    expect(inventory.consumeBrowserStack(0, 2)).toMatchObject({ status: 'applied', value: 0 });
    expect(inventory.getStack(0)).toMatchObject({ index: 0, templateName: other.name, amount: 3 });
    const snapshot = inventory.snapshot();
    expect(snapshot.equipment).toEqual([body]);
    expect(NativeInventory.fromSnapshot([potion, other], snapshot, { observers: [] }).snapshot()).toEqual(snapshot);
  });

  it('refuses absent observer registration or a known observer without dispatching invented native callbacks', () => {
    expect(new NativeInventory([potion]).canConsumeBrowserStack(0, 1)).toMatchObject({ status: 'unsupported', reason: /registration/ });
    const inventory = new NativeInventory([potion], { observers: [] });
    inventory.createItems(potion.guid20, 0, 2);
    const listener = vi.fn(() => ({ status: 'applied' as const }));
    inventory.addObserver({ id: 'test observer', source: 'test', onEvent: listener });
    expect(inventory.consumeBrowserStack(0, 1)).toMatchObject({ status: 'unsupported', reason: /observers/ });
    expect(inventory.getStack(0)?.amount).toBe(2);
    expect(listener).not.toHaveBeenCalled();
  });

  it('refuses equipped, linked, physical and insufficient stacks before changing their saved state', () => {
    const original = new NativeInventory([potion], { observers: [] });
    original.createItems(potion.guid20, 0, 2);
    const source = original.snapshot();
    const cases: NativeInventorySnapshot[] = [
      { ...source, equipment: [{ ...body, templateGuid20: potion.guid20 }] },
      { ...source, stacks: source.stacks.map((stack) => ({ ...stack, linkedSlot: 1 })) },
      { ...source, stacks: source.stacks.map((stack) => ({ ...stack, physicalItemGuid20: '5'.repeat(40) })) },
    ];
    for (const snapshot of cases) {
      const inventory = NativeInventory.fromSnapshot([potion], snapshot, { observers: [] });
      expect(inventory.consumeBrowserStack(0, 1).status).toBe('unsupported');
      expect(inventory.snapshot()).toEqual(snapshot);
    }
    expect(original.consumeBrowserStack(0, 3).status).toBe('unsupported');
    expect(original.consumeBrowserStack(0, 0).status).toBe('unsupported');
    expect(original.snapshot()).toEqual(source);
  });
});
