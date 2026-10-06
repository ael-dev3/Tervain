import { describe, expect, it } from 'vitest';
import { HeroAttackSequence } from '../../src/gothic3/hero-attack-sequence';

const clips = [
  { name: 'attack-raise', role: 'attack', phase: 'raise', duration: 0.44 },
  { name: 'attack-hit', role: 'attack', phase: 'hit', duration: 0.32 },
  { name: 'attack-recover', role: 'attack', phase: 'recover', duration: 0.36 },
  { name: 'power-raise', role: 'powerAttack', phase: 'raise', duration: 0.44 },
  { name: 'power-hit', role: 'powerAttack', phase: 'hit', duration: 0.32 },
  { name: 'power-recover', role: 'powerAttack', phase: 'recover', duration: 0.36 },
] as const;

describe('recovered Hero melee motion sequence', () => {
  it('plays raise, opens one native-timed hit window, then recovers', () => {
    const sequence = new HeroAttackSequence(clips);
    expect(sequence.begin('attack')).toBe(true);
    expect(sequence.currentClipName).toBe('attack-raise');
    expect(sequence.advance(0.44)).toEqual([
      { type: 'phase', style: 'attack', phase: 'hit', clipName: 'attack-hit' },
    ]);

    const hitThreshold = Math.fround(0.32) * 0.6000000238418579;
    expect(sequence.advance(hitThreshold - 0.001)).toEqual([]);
    expect(sequence.advance(0.001001)).toContainEqual({
      type: 'hit-window', style: 'attack', phase: 'hit', clipName: 'attack-hit',
    });
    expect(sequence.advance(0.32 - hitThreshold)).toEqual([
      { type: 'phase', style: 'attack', phase: 'recover', clipName: 'attack-recover' },
    ]);
    expect(sequence.advance(0.36)).toEqual([{ type: 'complete', style: 'attack' }]);
    expect(sequence.active).toBe(false);
  });

  it('keeps power attacks distinct and refuses to replace an active swing', () => {
    const sequence = new HeroAttackSequence(clips);
    expect(sequence.begin('powerAttack')).toBe(true);
    expect(sequence.currentClipName).toBe('power-raise');
    expect(sequence.begin('attack')).toBe(false);
    expect(sequence.advance(0.44)).toContainEqual({
      type: 'phase', style: 'powerAttack', phase: 'hit', clipName: 'power-hit',
    });
  });

  it('rejects invalid frame time without mutating the active sequence', () => {
    const sequence = new HeroAttackSequence(clips);
    sequence.begin('attack');
    expect(() => sequence.advance(Number.NaN)).toThrow('finite and nonnegative');
    expect(sequence.currentClipName).toBe('attack-raise');
  });
});
