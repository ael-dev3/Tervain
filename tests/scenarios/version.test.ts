import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../src/game/state';
import { MemoryStore, SaveStore } from '../../src/platform/storage';
import { GAME_BUILD, GAME_VERSION } from '../../src/version';

describe('pre-alpha build version', () => {
  it('stays on the 0.0.x line until the quality hold is explicitly removed', () => {
    expect(GAME_VERSION).toMatch(/^0\.0\.\d+$/);
    expect(GAME_BUILD).toBe(`prototype-${GAME_VERSION}`);
  });

  it('writes the same build identifier into saves', () => {
    const saves = new SaveStore(new MemoryStore());
    expect(saves.save('slot-1', createInitialState('slot-1'))).toEqual({ ok: true });
    expect(saves.load('slot-1')).toMatchObject({
      ok: true,
      summary: { gameBuild: GAME_BUILD },
    });
  });
});
