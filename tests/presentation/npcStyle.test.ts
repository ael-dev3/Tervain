import { describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { NPC_STYLES, npcStyle } from '../../src/presentation/npcStyle';

describe('authored NPC presentation profiles', () => {
  it('covers every named NPC with a stable face identity independent of wardrobe', () => {
    const ids = NPC_LIST.map((npc) => npc.id);
    expect(Object.keys(NPC_STYLES).sort()).toEqual([...ids].sort());
    expect(ids.map((id) => npcStyle(id).faceSeed)).toHaveLength(new Set(ids.map((id) => npcStyle(id).faceSeed)).size);
    expect(npcStyle('rillford_reeve')).toMatchObject({ hair: 'long', beard: 'none', build: 'woman' });
    expect(npcStyle('maintenance_worker')).toMatchObject({ hair: 'long', beard: 'none', build: 'woman' });
  });

  it('gives beards only to builds that grow them', () => {
    for (const npc of NPC_LIST) {
      const s = npcStyle(npc.id);
      if (s.build !== 'man') expect(s.beard, npc.id).toBe('none');
    }
  });

  it('keeps human task loops distinct and within the authored animation vocabulary', () => {
    const work = NPC_LIST.map((npc) => npcStyle(npc.id).work);
    expect(work).toContain('stonework');
    expect(work).toContain('writing');
    expect(work).toContain('mending');
    expect(new Set(work).size).toBeGreaterThanOrEqual(6);
    for (const id of NPC_LIST.map((npc) => npc.id)) {
      const profile = npcStyle(id);
      expect(profile.age).toBeGreaterThanOrEqual(0);
      expect(profile.age).toBeLessThanOrEqual(1);
    }
  });
});
