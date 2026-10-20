import type {changeComponents} from './foliage-motion-metric.mjs';
export function walkVisibilityChanges(before: Uint8Array, after: Uint8Array, width: number, height: number, options?: {border?: number; threshold?: number; minPixels?: number}): {
  crop: {left: number; top: number; width: number; height: number};
  central: ReturnType<typeof changeComponents>;
  wholeFrame: ReturnType<typeof changeComponents>;
};
