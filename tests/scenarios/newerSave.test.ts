import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/game/state';
import { SAVE_FORMAT_VERSION } from '../../src/game/types';
import { MemoryStore, SaveStore } from '../../src/platform/storage';

describe('a save from a newer version of the game (A71)', () => {
  it('is kept: this version will not overwrite what it cannot read', () => {
    const store = new MemoryStore(), saves = new SaveStore(store);
    expect(saves.save('auto', createInitialState('auto')).ok).toBe(true);
    const key = [...(store as unknown as { m: Map<string, string> }).m.keys()].find(k => k.endsWith('auto:cur'))!;
    const newer = JSON.parse(store.get(key)!);
    newer.saveFormatVersion = SAVE_FORMAT_VERSION + 1;
    if (newer.state) newer.state.saveFormatVersion = SAVE_FORMAT_VERSION + 1;
    const text = JSON.stringify(newer);
    store.set(key, text);
    expect(saves.load('auto').ok).toBe(false);
    const result = saves.save('auto', createInitialState('auto'));
    expect(result.ok).toBe(false);
    expect(store.get(key)).toBe(text);
  });
});
