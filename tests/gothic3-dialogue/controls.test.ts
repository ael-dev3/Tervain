import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ExplorerController } from '../../src/gothic3/controls';

class FocusTarget {
  constructor(private readonly tag: string) {}
  closest(selector: string): FocusTarget | null {
    return selector.split(',').some((entry) => entry.trim().split(/[:\[]/, 1)[0] === this.tag) ? this : null;
  }
}

function createController() {
  const documentListeners = new Map<string, (event: unknown) => void>();
  const windowListeners = new Map<string, (event: unknown) => void>();
  const canvasListeners = new Map<string, (event: unknown) => void>();
  vi.stubGlobal('Element', FocusTarget);
  vi.stubGlobal('document', {
    pointerLockElement: null,
    addEventListener: (type: string, listener: (event: unknown) => void) => documentListeners.set(type, listener),
    removeEventListener: (type: string) => documentListeners.delete(type),
  });
  vi.stubGlobal('window', {
    addEventListener: (type: string, listener: (event: unknown) => void) => windowListeners.set(type, listener),
    removeEventListener: (type: string) => windowListeners.delete(type),
  });
  const canvas = {
    tabIndex: -1,
    getAttribute: () => null,
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: (type: string, listener: (event: unknown) => void) => canvasListeners.set(type, listener),
    removeEventListener: (type: string) => canvasListeners.delete(type),
  } as unknown as HTMLCanvasElement;
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 1.65, 0);
  const onAction = vi.fn();
  const controller = new ExplorerController(camera, canvas, onAction);
  const keyDown = (code: string, tag: string) => {
    const preventDefault = vi.fn();
    documentListeners.get('keydown')!({ code, target: new FocusTarget(tag), repeat: false,
      ctrlKey: false, metaKey: false, altKey: false, preventDefault } as unknown as KeyboardEvent);
    return preventDefault;
  };
  return { controller, onAction, keyDown };
}

afterEach(() => vi.unstubAllGlobals());

describe('Gothic 3 keyboard focus', () => {
  it('keeps movement and action shortcuts active while a toolbar button has focus', () => {
    const { controller, onAction, keyDown } = createController();
    const preventMoveDefault = keyDown('KeyW', 'button');
    controller.update(0.1);
    expect(controller.position.z).toBeLessThan(0);
    expect(preventMoveDefault).toHaveBeenCalledOnce();

    const preventActionDefault = keyDown('KeyM', 'button');
    expect(onAction).toHaveBeenCalledWith('map');
    expect(preventActionDefault).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it('leaves text-entry fields alone', () => {
    const { controller, keyDown } = createController();
    const preventDefault = keyDown('KeyW', 'input');
    controller.update(0.1);
    expect(controller.position.z).toBe(0);
    expect(preventDefault).not.toHaveBeenCalled();
    controller.destroy();
  });
});
