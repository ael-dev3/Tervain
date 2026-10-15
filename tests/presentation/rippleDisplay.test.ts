import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { RippleField } from '../../src/presentation/water/ripples';

it('retains the readable ripple field between solver ticks but refreshes after a shift or rewarm', () => {
  const target = new THREE.WebGLRenderTarget(4, 4);
  const renderer = {
    autoClear: false, getRenderTarget: () => target,
    setRenderTarget: vi.fn(), clear: vi.fn(), render: vi.fn(),
  };
  const field = new RippleField(64, 36);
  const update = (x: number, dt: number) => {
    renderer.render.mockClear();
    field.update(renderer as unknown as THREE.WebGLRenderer, x, 0, dt);
    expect(renderer.autoClear).toBe(false);
    expect(renderer.setRenderTarget).toHaveBeenLastCalledWith(target);
    return renderer.render.mock.calls.length;
  };
  try {
    expect(update(0, 0)).toBe(1); // Initial readable field, even with no solver tick.
    expect(field.ready).toBe(true);
    field.drop({ x: 0, z: 0, radius: 1, strength: .2, foam: .3 });
    expect(update(0, 1 / 120)).toBe(0); // Queued drop must wait for the same fixed tick.
    expect(update(0, 1 / 120)).toBe(2); // Solve and readable field.
    expect(update(0, 0)).toBe(0);
    expect(update(20, 0)).toBe(2); // A shift needs a fresh display without a solver tick.
    expect(update(20, Number.NaN)).toBe(0);
    field.warm(renderer as unknown as THREE.WebGLRenderer);
    expect(update(20, 0)).toBe(1); // Warm invalidates both state and display.
    expect(update(20, 1 / 60)).toBe(2);
  } finally { field.dispose(); target.dispose(); }
});
