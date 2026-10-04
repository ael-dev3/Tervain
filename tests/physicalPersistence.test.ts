import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/state';
import { MemoryStore, SaveStore, reviveState } from '../src/platform/storage';

const pose = { id: 'camp_crate_0', position: { x: -91, y: 4.5, z: 27 }, rotation: { x: 0, y: .6, z: 0, w: .8 } };
describe('plain physical object persistence', () => {
  it('saves and restores moved/rotated bodies without changing the format-1 quest/inventory state', () => {
    const state = createInitialState(); state.physicalObjects = [pose];
    const store = new SaveStore(new MemoryStore());
    expect(store.save('slot-1', state).ok).toBe(true);
    const loaded = store.load('slot-1'); expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.physicalObjects).toEqual([pose]);
    expect(loaded.state.saveFormatVersion).toBe(1);
    expect(loaded.state.quest).toEqual(state.quest);
    expect(loaded.state.inventory).toEqual(state.inventory);
  });
  it('old saves without physical poses keep the authored baseline', () => {
    const old: Record<string, unknown> = { ...createInitialState() }; delete old.physicalObjects;
    expect(reviveState(old)?.physicalObjects).toEqual([]);
  });
  it('rejects malformed and duplicate poses before handing them to the WASM solver', () => {
    const raw = { ...createInitialState(), physicalObjects: [pose, pose,
      { ...pose, id: 'bad', position: { x: Infinity, y: 0, z: 0 } },
      { ...pose, id: 'zero', rotation: { x: 0, y: 0, z: 0, w: 0 } },
      { ...pose, id: 'outside', position: { x: 900, y: 0, z: 0 } },
      { ...pose, id: 'missing', rotation: null }] };
    expect(reviveState(raw)?.physicalObjects).toEqual([pose]);
  });
});
