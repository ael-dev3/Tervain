import { describe, expect, it } from 'vitest';
import { DAY_CONTRAST, displayToSceneLuminance, WORLD_EXPOSURE } from '../../src/presentation/grade';

// The day transfer for a grey pixel, written forwards: Three's ACES filmic fit (its input and output matrices keep grey)
// at the world exposure, the sRGB encoding and the final pass's contrast curve.
function sceneToDisplay(scene: number): number {
  const v = (scene * WORLD_EXPOSURE) / 0.6;
  const toned = (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
  const encoded = Math.min(Math.max(toned <= 0.0031308 ? toned * 12.92 : 1.055 * toned ** (1 / 2.4) - 0.055, 0), 1);
  return Math.min(Math.max((encoded - 0.4) * DAY_CONTRAST + 0.408, 0), 1);
}

describe('grade transfer', () => {
  it('finds the scene light that reaches a screen level by day', () => {
    for (const display of [0.3, 0.5, 158 / 255, 166 / 255, 180 / 255, 0.9]) {
      expect(sceneToDisplay(displayToSceneLuminance(display))).toBeCloseTo(display, 9);
    }
  });

  it('rises with the screen level, and puts a scene-light 0.62 far above a bright tip', () => {
    let last = 0;
    for (let display = 0.2; display < 0.95; display += 0.05) {
      const scene = displayToSceneLuminance(display);
      expect(scene).toBeGreaterThan(last);
      last = scene;
    }
    // The 0.0.32 cap value, read as scene light (where the grass writes it), lands above 230 of 255.
    expect(sceneToDisplay(0.62) * 255).toBeGreaterThan(230);
  });
});
