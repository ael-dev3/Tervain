import { describe, expect, it } from 'vitest';
import { FURNITURE } from '../../src/world/furniture';

describe('twelfth scout fixes: seats face what they serve (A105)', () => {
  it('turns every chair and stool towards the nearest table or desk in its room', () => {
    const seats = FURNITURE.filter((p) => p.piece === 'chair' || p.piece === 'stool');
    let checked = 0;
    for (const seat of seats) {
      const hosts = FURNITURE.filter((p) => p.room === seat.room && (p.piece === 'table' || p.piece === 'desk'));
      const host = hosts.sort((a, b) => Math.hypot(a.x - seat.x, a.z - seat.z) - Math.hypot(b.x - seat.x, b.z - seat.z))[0];
      if (!host || Math.hypot(host.x - seat.x, host.z - seat.z) > 1.6) continue;
      const toward = (host.x - seat.x) * Math.sin(seat.yaw) + (host.z - seat.z) * Math.cos(seat.yaw);
      expect(toward, `${seat.room.building.id} ${seat.piece} at ${seat.x.toFixed(2)},${seat.z.toFixed(2)}`).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
});
