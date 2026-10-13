import { expect, it } from 'vitest';
import { BufferAttribute, InterleavedBufferAttribute } from 'three';
const version = (a: BufferAttribute | InterleavedBufferAttribute) => a instanceof InterleavedBufferAttribute ? a.data.version : a.version;
import { Splashes } from '../../src/presentation/water/splashes';
it('draws no idle spray and retains the live prefix through circular-pool wraparound', () => {
  const spray = new Splashes();
  try {
    expect(spray.points.geometry.drawRange.count).toBe(0);
    expect(spray.points.visible).toBe(false);
    spray.emit(0, 1, 0, 2, 1); spray.update(1 / 60);
    expect(spray.points.geometry.drawRange.count).toBe(2);
    expect(spray.points.visible).toBe(true);
    while (spray.active) spray.update(.1);
    expect(spray.points.geometry.drawRange.count).toBe(0);
    expect(spray.points.visible).toBe(false);
    for (let i = 0; i < 4; i++) spray.emit(0, 1, 0, 120, 1);
    spray.update(1 / 60);
    expect(spray.active).toBe(480);
    expect(spray.points.geometry.drawRange.count).toBe(480);
    while (spray.active) spray.update(.1);
    // The ring cursor is back at slot 2, so omit only the suffix, not dead slots inside the prefix.
    spray.emit(0, 1, 0, 1, 1); spray.update(1 / 60);
    expect(spray.points.geometry.drawRange.count).toBe(3);
    expect(spray.points.geometry.attributes.aFade!.getX(2)).toBeGreaterThan(0);
  } finally { spray.dispose(); }
});
it('keeps idle spray buffers unchanged but uploads new drops and the final fade-out', () => {
  const spray = new Splashes();
  try {
    const attributes = Object.values(spray.points.geometry.attributes);
    spray.update(1 / 60);
    const before = attributes.map(version);
    for (let i = 0; i < 120; i++) spray.update(1 / 60);
    expect(attributes.map(version)).toEqual(before);
    spray.emit(0, 1, 0, 1, 1);
    spray.update(1 / 60);
    expect(spray.active).toBe(1);
    expect(attributes.every((a, i) => version(a) > before[i]!)).toBe(true);
    while (spray.active) spray.update(.1);
    expect(spray.points.geometry.attributes.aFade!.getX(0)).toBe(0);
    const expired = attributes.map(version);
    spray.update(.1);
    expect(attributes.map(version)).toEqual(expired);
  } finally { spray.dispose(); }
});
