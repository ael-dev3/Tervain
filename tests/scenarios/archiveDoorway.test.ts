import { describe, expect, it } from 'vitest';

describe('eighth scout fixes: the sealed archive lets him out (A101)', () => {
  it('counts him in until his body is clear of the door and shutter openings', async () => {
    const { WorldScene: World } = await import('../../src/presentation/world');
    const { buildStaticColliders } = await import('../../src/world/colliders');
    const { PLAYER_BODY_RADIUS } = await import('../../src/world/playerPlacement');
    const w = { insideArchive: World.prototype.insideArchive } as unknown as typeof World.prototype;
    const occupies = (x: number, z: number) => World.prototype.occupiesArchive.call(w, x, z, PLAYER_BODY_RADIUS);
    const c = buildStaticColliders();
    let gap = 0;
    // Walking out through the door (south, +z) and climbing out of the shutter (north, -z), every step.
    for (const [x, z0, z1] of [[-46, -101, -96], [-46, -103, -108]] as const) {
      for (let k = 0; k <= 100; k++) {
        const z = z0 + (z1 - z0) * k / 100;
        // Wherever the closed door or shutter would overlap him, he still counts as inside, so neither closes on him.
        const touches = (c.all as unknown as { id: string; x: number; z: number; hw: number; hd: number }[]).some(s => (s.id === 'archive_door' || s.id === 'archive_shutter')
          && Math.abs(x - s.x) < s.hw + PLAYER_BODY_RADIUS && Math.abs(z - s.z) < s.hd + PLAYER_BODY_RADIUS);
        if (touches) expect(occupies(x, z), `z ${z.toFixed(2)}`).toBe(true);
        if (touches && !w.insideArchive(x, z)) gap++;
      }
      expect(occupies(x, z1)).toBe(false);
    }
    // The roofed room alone leaves him counted out while the door would still overlap him: the trap this closes.
    expect(gap).toBeGreaterThan(0);
  });
});
