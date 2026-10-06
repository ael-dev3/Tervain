import { describe, expect, it } from 'vitest';
import { liveScenePersonPosition } from '../../src/gothic3/scene-person-position';
import type { ScenePerson } from '../../src/gothic3/types';

const person: ScenePerson = { id: 'diego-guid', name: 'Diego', position: [1, 2, 3], source: 'test' };

describe('live scene person positions', () => {
  it('uses the actor transform after construction and observes subsequent movement', () => {
    const actor = { position: { x: 4, y: 5, z: 6 } };
    const actors = new Map([[person.id, actor]]);
    expect(liveScenePersonPosition(person, actors)).toEqual([4, 5, 6]);
    actor.position.x = 7;
    expect(liveScenePersonPosition(person, actors)).toEqual([7, 5, 6]);
  });

  it('uses the original source placement before the actor object exists', () => {
    expect(liveScenePersonPosition(person, new Map())).toBe(person.position);
  });
});
