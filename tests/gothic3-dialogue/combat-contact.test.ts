import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { detectHeroFistContactCandidate } from '../../src/gothic3/combat-contact';

function target(id: string, x = 0, visible = true) {
  const object = new THREE.Group();
  object.visible = visible;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.5), new THREE.MeshBasicMaterial());
  body.position.y = 1;
  object.add(body);
  object.position.x = x;
  return { id, name: id, object, active: true };
}

describe('Hero fist contact against rendered Ardea characters', () => {
  it('reports the closest rendered character bounds touched by the animated hand bone', () => {
    const hand = new THREE.Bone();
    hand.position.set(0.55, 1, 0);
    const contact = detectHeroFistContactCandidate(hand, [target('orc')]);

    expect(contact).toMatchObject({ id: 'orc', name: 'orc',
      source: 'browser:Hero_Right_Hand_Hand_1-vs-rendered-NPC-bounds' });
    expect(contact?.distance).toBeCloseTo(0.05, 10);
  });

  it('ignores inactive, hidden and out-of-reach targets', () => {
    const hand = new THREE.Bone();
    hand.position.set(0.8, 1, 0);
    const inactive = { ...target('inactive'), active: false };
    expect(detectHeroFistContactCandidate(hand, [inactive, target('hidden', 0, false)])).toBeNull();
    expect(detectHeroFistContactCandidate(hand, [target('nearby', 2)])).toBeNull();
  });

  it('resolves equal-distance overlaps by stable source id', () => {
    const hand = new THREE.Bone();
    hand.position.set(0.55, 1, 0);
    const contact = detectHeroFistContactCandidate(hand, [target('z-source'), target('a-source')]);
    expect(contact?.id).toBe('a-source');
  });

  it('rejects unbounded contact tolerances', () => {
    expect(() => detectHeroFistContactCandidate(new THREE.Bone(), [], 1)).toThrow(RangeError);
  });
});
