import { expect, it, vi } from 'vitest';
import { createLeafBurst, LEAF_BURST_POOL } from '../../src/presentation/foliage/leafBurst';

it('does no matrix or attribute work while the tree-strike pool is empty, including after expiry', () => {
  const burst = createLeafBurst({ heightAt: () => 0 }, null), writes = vi.spyOn(burst.mesh, 'setMatrixAt');
  const version = burst.mesh.instanceMatrix.version;
  for (let i = 0; i < 120; i++) burst.update(1 / 60, false);
  expect(writes).not.toHaveBeenCalled();expect(burst.mesh.instanceMatrix.version).toBe(version);
  expect(burst.mesh.visible).toBe(false);expect(burst.active).toBe(0);
  expect(burst.release(0, 1, 0, .5, 3)).toBe(3);
  // A release is pending even before the next simulation step; zero dt still presents it.
  burst.update(0, false);expect(burst.active).toBe(3);expect(burst.mesh.visible).toBe(true);
  expect(writes).toHaveBeenCalledTimes(LEAF_BURST_POOL);
  for (let i = 0; i < 1000 && burst.active > 0; i++) burst.update(.1, false);
  expect(burst.active).toBe(0);expect(burst.mesh.count).toBe(0);expect(burst.mesh.visible).toBe(false);
  writes.mockClear();const expiredVersion = burst.mesh.instanceMatrix.version;
  for (let i = 0; i < 120; i++) burst.update(1 / 60, false);
  expect(writes).not.toHaveBeenCalled();expect(burst.mesh.instanceMatrix.version).toBe(expiredVersion);
  expect(burst.release(0, 1, 0, .5, 2)).toBe(2);burst.update(0, false);expect(burst.active).toBe(2);
  burst.dispose();
});

it('updates the reduced-motion release policy while idle and preserves paused active leaves', () => {
  const burst = createLeafBurst({ heightAt: () => 0 }, null);
  burst.update(1 / 60, true);expect(burst.release(0, 1, 0, .5, 3)).toBe(0);
  burst.update(1 / 60, false);expect(burst.release(0, 1, 0, .5, 3)).toBe(3);
  burst.update(0, false);const pose = Array.from(burst.mesh.instanceMatrix.array);
  burst.update(.1, true);expect(Array.from(burst.mesh.instanceMatrix.array)).toEqual(pose);
  expect(burst.active).toBe(3);expect(burst.release(0, 1, 0, .5, 1)).toBe(0);
  burst.dispose();
});

it('draws/uploads only the occupied prefix and preserves holes before later surviving leaves', () => {
  const burst = createLeafBurst({ heightAt: () => 0 }, null);
  try {
    burst.release(0, 0, 0, 0, 10); burst.update(0, false);
    expect(burst.mesh.count).toBe(10);
    expect(burst.mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 160 }]);
    burst.release(0, 100, 0, 0, 10);
    for (let i = 0; i < 60; i++) burst.update(.1, false);
    expect(burst.active).toBe(10); // First ten landed/expired, later ten are still aloft.
    expect(burst.mesh.count).toBe(20); // Preserve indices 10..19; active count alone is not a draw prefix.
    expect(burst.mesh.instanceMatrix.updateRanges).toEqual([{ start: 0, count: 320 }]);
    burst.release(0, 1, 0, 0, 3); burst.update(0, false);
    expect(burst.active).toBe(13); expect(burst.mesh.count).toBe(20);
  } finally { burst.dispose(); }
});
it('retains frozen active matrices while presenting pending zero-step releases and resuming normally',()=>{
 const burst=createLeafBurst({heightAt:()=>0},null),writes=vi.spyOn(burst.mesh,'setMatrixAt');
 try{burst.release(0,1,0,.4,3);burst.update(0,false);const pose=Buffer.from(burst.mesh.instanceMatrix.array.buffer).toString('hex'),version=burst.mesh.instanceMatrix.version;writes.mockClear();
 for(let i=0;i<120;i++)burst.update(1/60,true);burst.update(0,false);burst.update(NaN,false);burst.update(-1,false);
 expect(writes).not.toHaveBeenCalled();expect(burst.mesh.instanceMatrix.version).toBe(version);expect(Buffer.from(burst.mesh.instanceMatrix.array.buffer).toString('hex')).toBe(pose);
 expect(burst.release(0,1,0,.4,2)).toBe(2);burst.update(0,true);expect(burst.active).toBe(5);expect(writes).toHaveBeenCalledTimes(burst.active);expect(burst.release(0,1,0,.4,1)).toBe(0);
 burst.update(1/60,false);expect(burst.mesh.instanceMatrix.version).toBe(version+2);expect(Buffer.from(burst.mesh.instanceMatrix.array.buffer).toString('hex')).not.toBe(pose);
 }finally{burst.dispose();}
});

it('retains cleared dead slots while survivors move and reuses expired holes safely', () => {
  const burst = createLeafBurst({ heightAt: () => 0 }, null);
  const writes = vi.spyOn(burst.mesh, 'setMatrixAt');
  try {
    burst.release(0, 0, 0, 0, 10); burst.update(0, false);
    expect(writes).toHaveBeenCalledTimes(LEAF_BURST_POOL); // Clear initial unused slots once.
    burst.release(0, 100, 0, 0, 10); burst.update(0, false);
    for (let i = 0; i < 60; i++) burst.update(.1, false);
    expect(burst.active).toBe(10); expect(burst.mesh.count).toBe(20);
    writes.mockClear();burst.update(1 / 60, false);
    expect(writes).toHaveBeenCalledTimes(10);
    for (let i = 0; i < 10; i++) {
      expect(Array.from(burst.mesh.instanceMatrix.array.slice(i * 16, i * 16 + 16)))
        .toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    }
    expect(burst.release(0, 1, 0, 0, 3)).toBe(3);
    writes.mockClear();burst.update(0, false);
    expect(burst.active).toBe(13);expect(writes).toHaveBeenCalledTimes(13);
    expect(burst.mesh.instanceMatrix.array[0]).not.toBe(0);
  } finally { burst.dispose(); }
});
