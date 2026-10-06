import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapView } from '../../src/presentation/ui/map';
import { fullMapView, MAP_H, MAP_W, mapWorldAt } from '../../src/presentation/ui/mapProjection';

class MapElement {
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, ((event: Record<string, unknown>) => void)[]>();
  readonly children: unknown[] = [];
  className = '';
  style = {};
  captureFails = false;
  private captured = new Set<number>();
  focus = vi.fn();
  setAttribute(key: string, value: string) { this.attributes.set(key, value); }
  append(...children: unknown[]) { this.children.push(...children); }
  addEventListener(type: string, callback: (event: Record<string, unknown>) => void) {
    this.listeners.set(type, [...this.listeners.get(type) ?? [], callback]);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: MAP_W, height: MAP_H }; }
  setPointerCapture(pointer: number) {
    if (this.captureFails) throw new Error('pointer already released');
    this.captured.add(pointer);
  }
  hasPointerCapture(pointer: number) { return this.captured.has(pointer); }
  releasePointerCapture(pointer: number) { this.captured.delete(pointer); }
  emit(type: string, fields: Record<string, unknown> = {}) {
    const event = { button: 0, buttons: 1, pointerId: 1, isPrimary: true, clientX: MAP_W / 2, clientY: MAP_H / 2,
      preventDefault: vi.fn(), stopPropagation: vi.fn(), ...fields };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function mapInput() {
  vi.stubGlobal('document', { createElement: () => new MapElement() });
  const view = new MapView();
  const onMarker = vi.fn(); view.onMarker = onMarker;
  const { canvas } = view.element();
  return { view, canvas: canvas as unknown as MapElement, onMarker };
}

afterEach(() => vi.unstubAllGlobals());

describe('regional map pointer input', () => {
  it('still focuses and pins a local chart click when native pointer capture is refused', () => {
    const { canvas, onMarker } = mapInput(); canvas.captureFails = true;
    expect(() => canvas.emit('pointerdown')).not.toThrow();
    canvas.emit('pointerup', { buttons: 0 });
    expect(canvas.focus).toHaveBeenCalledOnce();
    expect(onMarker).toHaveBeenCalledExactlyOnceWith(mapWorldAt(fullMapView(), MAP_W / 2, MAP_H / 2));
  });

  it('treats a real drag as panning without accidentally placing a pin at its release', () => {
    const { canvas, onMarker } = mapInput();
    canvas.emit('pointerdown');
    canvas.emit('pointermove', { clientX: MAP_W / 2 + 40, clientY: MAP_H / 2 + 25 });
    canvas.emit('pointerup', { buttons: 0, clientX: MAP_W / 2 + 40, clientY: MAP_H / 2 + 25 });
    expect(onMarker).not.toHaveBeenCalled();
    expect(canvas.hasPointerCapture(1)).toBe(false);
  });

  it('cancels stale held state if the primary mouse button is released outside the chart', () => {
    const { canvas, onMarker } = mapInput();
    canvas.emit('pointerdown');
    canvas.emit('pointermove', { buttons: 0, clientX: MAP_W / 2 + 50 });
    canvas.emit('pointerup', { buttons: 0 });
    expect(onMarker).not.toHaveBeenCalled();
    expect(canvas.hasPointerCapture(1)).toBe(false);
  });

  it('ignores secondary pointers and discards cancelled/lost capture clicks', () => {
    const { canvas, onMarker } = mapInput();
    canvas.emit('pointerdown', { isPrimary: false }); canvas.emit('pointerup');
    canvas.emit('pointerdown'); canvas.emit('pointercancel'); canvas.emit('pointerup');
    canvas.emit('pointerdown'); canvas.emit('lostpointercapture'); canvas.emit('pointerup');
    expect(onMarker).not.toHaveBeenCalled();
  });
});
