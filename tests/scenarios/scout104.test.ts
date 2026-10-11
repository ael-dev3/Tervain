import { describe, expect, it } from 'vitest';
import { BARKS as NPC_BARKS, NPCS } from '../../src/content/npcs';
import { SCENE_REACH, SCENES } from '../../src/content/voice';
import { createInitialState } from '../../src/game/state';
import { SpeechDirector } from '../../src/presentation/speech';
import { resolveGoal } from '../../src/presentation/actors';
import { ANCHORS } from '../../src/world/layout';

describe('eleventh scout fixes: who can be heard (A104)', () => {
  it('stands every scene\'s pair at their working places within reach of each other', () => {
    const s = createInitialState();
    for (const scene of SCENES) {
      const hour = (scene.hours[0] + scene.hours[1]) / 2;
      const [a, b] = scene.cast.map((id) => ANCHORS[resolveGoal(NPCS[id], s, hour).anchor]!);
      if (scene.id.startsWith('quarry.')) expect(Math.hypot(a!.x - b!.x, a!.z - b!.z), scene.id).toBeLessThanOrEqual(SCENE_REACH);
    }
  });

  it('starts no overheard scene while the player is talking with someone else', () => {
    const d = new SpeechDirector({ say: () => 3, caption: () => {} });
    const s = createInitialState();
    expect(d.talk('mill_hand', () => ({ x: 0, y: 0, z: 0 }), s)).toBe(true);
    const scene = SCENES.find((x) => !x.cast.includes('mill_hand'))!;
    expect(d.sceneDue(scene, 0)).toBe(false);
  });

  it('has Sel awake at dusk to say it is too dark to write', () => {
    const bark = NPC_BARKS.find((b) => b.line === 'sel.bark.dark')!;
    const s = createInitialState();
    const [from, to] = bark.hours!, span = (to - from + 24) % 24 || 24;
    for (let k = 0; k < span; k += 0.25) { const h = (from + k) % 24; expect(resolveGoal(NPCS.ash_recorder, s, h).activity, `${h}`).not.toBe('rest'); }
  });
});
