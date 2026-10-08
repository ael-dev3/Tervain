import { expect, it } from 'vitest';
import { NativeRuntimePlatform } from '../../src/gothic3/native-runtime-platform';
import { NativeSharedModuleImage } from '../../src/gothic3/native-shared-module-image';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import type { NativeValue } from '../../src/gothic3/dialogue';
function value<T>(result: NativeValue<T>): T { if (!result.known) throw new Error(result.reason); return result.value; }
it('retains one canonical loader-zero singleton and guard with physical aliases', () => {
  const platform = new NativeRuntimePlatform(), image = value(NativeSharedModuleImage.forPlatform(platform));
  const ranges = value(image.propertySingletonRanges());
  expect(ranges.storage.bytes.length).toBe(40); expect(ranges.object.bytes.length).toBe(28);
  expect(ranges.object.backing).toBe(ranges.guard.backing);
  expect(ranges.storage.bytes.every(byte => byte === 0)).toBe(true);
  ranges.guard.writeUnsigned(0, 1);
  expect(ranges.storage.readUnsigned(36)).toBe(1);
  expect(value(image.resolve('102f48e4', 4))).toBe(ranges.guard);
  expect(value(image.propertySingletonRanges())).toBe(ranges);
  expect(NativeSharedModuleImage.canonicalViewForPlatform(image, platform, ranges.object).known).toBe(true);
  const copy = new NativeHeapObjectViews({ identity: {}, bytes: ranges.object.bytes.slice(),
    knownMask: ranges.object.knownMask.slice(), freed: false });
  expect(NativeSharedModuleImage.canonicalViewForPlatform(image, platform, copy).known).toBe(false);
  const other = value(NativeSharedModuleImage.forPlatform(new NativeRuntimePlatform()));
  expect(value(other.propertySingletonRanges()).guard.readUnsigned(0)).toBe(0);
});
it('rejects ended canonical singleton storage rather than replacing it', () => {
  const image = value(NativeSharedModuleImage.forPlatform(new NativeRuntimePlatform()));
  const ranges = value(image.propertySingletonRanges());
  ranges.storage.backing.freed = true;
  expect(image.propertySingletonRanges().known).toBe(false);
});
