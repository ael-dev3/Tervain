import { describe, expect, it } from 'vitest';
import { parseTreeLab, pickLabSpot } from '../../src/presentation/treeLab';

describe('tree lab request', () => {
  it('is off without the parameter and for bad values', () => {
    expect(parseTreeLab('')).toBeNull();
    expect(parseTreeLab('?treelab=cactus')).toBeNull();
    expect(parseTreeLab('?treelab=oak:Bad_Id')).toBeNull();
    expect(parseTreeLab('?treelab=oak*0')).toBeNull();
  });
  it('reads species, asset, spot and scale', () => {
    expect(parseTreeLab('?quality=high&treelab=oak:oak-elder@-12.5,40*1.5')).toEqual({ species: 'oak', assetId: 'oak-elder', x: -12.5, z: 40, scale: 1.5 });
    expect(parseTreeLab('?treelab=pine')).toEqual({ species: 'pine', assetId: undefined, x: undefined, z: undefined, scale: 1 });
  });
  it('picks flat dry ground clear of blockers', () => {
    const terrain = { heightAt: (x: number) => (x < 0 ? 1 : 5 + 0.0001 * x), slopeAt: () => 0.01 };
    const spot = pickLabSpot(terrain, (x, z, r) => Math.hypot(x - 100, z) < 80 + r, 60, 300);
    expect(spot).not.toBeNull();
    expect(spot!.x).toBeGreaterThanOrEqual(0);
    expect(Math.hypot(spot!.x - 100, spot!.z)).toBeGreaterThan(140);
    expect(pickLabSpot({ heightAt: () => 1, slopeAt: () => 0 }, () => false)).toBeNull();
  });
});
