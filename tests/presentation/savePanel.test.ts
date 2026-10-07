import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import { Game } from '../../src/game/game';
import { createInitialState } from '../../src/game/state';
import { defaultSettings } from '../../src/platform/settings';
import { MemoryStore, SaveStore } from '../../src/platform/storage';
import { slotsPanel, type PanelActions, type PanelCtx, type PanelHost } from '../../src/presentation/ui/panels';

/** Narrow DOM fixture: the panel's real event handlers and save adapter remain in use. */
class ElementFixture {
  className = '';
  parent: ElementFixture | null = null;
  readonly attributes = new Map<string, string>();
  readonly children: (ElementFixture | string)[] = [];
  readonly listeners = new Map<string, (() => void)[]>();
  readonly style = {};
  readonly classList = {
    toggle: (name: string, on: boolean) => {
      const names = new Set(this.className.split(' ').filter(Boolean));
      if (on) names.add(name); else names.delete(name);
      this.className = [...names].join(' ');
    },
  };
  private text = '';
  constructor(readonly tagName: string) {}
  set textContent(value: string) { this.text = value; this.children.length = 0; }
  get textContent(): string { return this.text + this.children.map((child) => typeof child === 'string' ? child : child.textContent).join(''); }
  get firstChild(): ElementFixture | string | null { return this.children[0] ?? null; }
  append(...children: (ElementFixture | string)[]) {
    for (const child of children) {
      if (typeof child !== 'string') child.parent = this;
      this.children.push(child);
    }
  }
  removeChild(child: ElementFixture | string) {
    this.children.splice(this.children.indexOf(child), 1);
    if (typeof child !== 'string') child.parent = null;
  }
  remove() { this.parent?.removeChild(this); }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  addEventListener(name: string, listener: () => void) { this.listeners.set(name, [...this.listeners.get(name) ?? [], listener]); }
  focus() { Reflect.set(document, 'activeElement', this); }
  click() { if (!this.attributes.has('disabled')) for (const listener of this.listeners.get('click') ?? []) listener(); }
  findAll(predicate: (element: ElementFixture) => boolean): ElementFixture[] {
    return [...(predicate(this) ? [this] : []), ...this.children.flatMap((child) => typeof child === 'string' ? [] : child.findAll(predicate))];
  }
}

const fixture = (element: Element) => element as unknown as ElementFixture;
const keyed = (panel: HTMLElement, key: string) => fixture(panel).findAll((element) => element.attributes.get('data-focus-key') === key)[0]!;
const status = (panel: HTMLElement) => fixture(panel).findAll((element) => element.attributes.get('role') === 'status')[0]!;
const times = (panel: HTMLElement) => fixture(panel).findAll((element) => element.tagName === 'TIME');

beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null, createElement: (tag: string) => new ElementFixture(tag.toUpperCase()) });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function session() {
  const memory = new MemoryStore();
  let savedAt = Date.UTC(2026, 9, 7, 13, 45);
  const saves = new SaveStore(memory, () => savedAt);
  const game = new Game(createInitialState());
  const snapshot = vi.fn(() => []);
  const hud = { toast: vi.fn() };
  const host = { replaceTop: vi.fn(), back: vi.fn() };
  const app: App = Object.assign(Object.create(App.prototype), {
    game, saves, mode: 'play', player: { ...game.state.player },
    world: { physics: { snapshot } }, hud, panels: host,
  });
  const actions = Reflect.apply(Reflect.get(App.prototype, 'panelActions'), app, []) as PanelActions;
  const ctx: PanelCtx = {
    game, saves, actions, host: host as unknown as PanelHost,
    settings: defaultSettings(), input: {} as PanelCtx['input'], toast: vi.fn(), playerNear: { sluice: false },
  };
  return { app, ctx, memory, saves, game, snapshot, hud, host, setTime: (time: number) => { savedAt = time; } };
}

describe('manual save panel feedback and selection', () => {
  it('keeps the focused slot mounted and refreshes its semantic local timestamp after a successful write', () => {
    const { ctx, saves, game, host, hud, setTime } = session();
    saves.save('slot-2', game.state);
    const panel = slotsPanel(ctx, 'save');
    const button = keyed(panel, 'save-slot-2');
    const result = status(panel);
    button.focus();
    const updated = Date.UTC(2026, 9, 7, 14, 30);
    setTime(updated);
    button.click();

    expect(saves.summary('slot-2')?.savedAt).toBe(updated);
    expect(keyed(panel, 'save-slot-2')).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(status(panel)).toBe(result);
    expect(result.textContent).toBe('Game saved (Slot 2).');
    expect(result.attributes.get('aria-atomic')).toBe('true');
    expect(result.className).toContain('good');
    expect(times(panel)).toHaveLength(1);
    expect(times(panel)[0]!.attributes.get('datetime')).toBe(new Date(updated).toISOString());
    expect(times(panel)[0]!.textContent).toBe(`Saved ${new Date(updated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`);
    expect(host.replaceTop).not.toHaveBeenCalled();
    expect(hud.toast).toHaveBeenCalledWith('Game saved (Slot 2).', 'good');
  });

  it('reports a real storage write failure inside the modal and preserves the previous save and focused button', () => {
    const { ctx, memory, saves, game, hud } = session();
    saves.save('slot-1', game.state);
    const previous = memory.get('tervain:save:slot-1:cur');
    game.addPlaySeconds(123);
    vi.spyOn(memory, 'set').mockImplementation(() => { throw new Error('Storage quota exceeded.'); });
    const panel = slotsPanel(ctx, 'save');
    const button = keyed(panel, 'save-slot-1');
    button.focus(); button.click();

    expect(memory.get('tervain:save:slot-1:cur')).toBe(previous);
    expect(status(panel).textContent).toBe('Could not save: Storage quota exceeded.');
    expect(status(panel).className).toContain('bad');
    expect(document.activeElement).toBe(button);
    expect(keyed(panel, 'save-slot-1')).toBe(button);
    expect(hud.toast).toHaveBeenCalledWith('Could not save: Storage quota exceeded.', 'bad');
    // Failure feedback remains until another explicit write, rather than an expiry timer.
    expect(status(panel).textContent).toContain('Storage quota exceeded.');
  });

  it('does not leave a damaged-slot delete action after successfully replacing that slot', () => {
    const { ctx, memory, saves } = session();
    memory.set('tervain:save:slot-3:cur', '{broken');
    const panel = slotsPanel(ctx, 'save');
    expect(keyed(panel, 'delete-slot-3')).toBeDefined();
    keyed(panel, 'save-slot-3').click();
    expect(saves.load('slot-3').ok).toBe(true);
    expect(keyed(panel, 'delete-slot-3')).toBeUndefined();
  });
});

describe('save slot metadata and accessible actions', () => {
  it('names each Save, Load and damaged-slot Delete action, including its deletion confirmation', () => {
    const { ctx, saves, game, memory } = session();
    saves.save('slot-1', game.state);
    memory.set('tervain:save:slot-3:cur', '{broken');
    const save = slotsPanel(ctx, 'save'), load = slotsPanel(ctx, 'load');
    expect(keyed(save, 'save-slot-1').attributes.get('aria-label')).toBe('Save to Slot 1');
    expect(keyed(save, 'save-slot-2').attributes.get('aria-label')).toBe('Save to Slot 2');
    expect(keyed(load, 'load-slot-1').attributes.get('aria-label')).toBe('Load Slot 1');
    expect(keyed(load, 'load-slot-2').attributes.has('disabled')).toBe(true);
    const deletion = keyed(load, 'delete-slot-3');
    expect(deletion.attributes.get('aria-label')).toBe('Delete damaged save in Slot 3');
    deletion.click();
    expect(deletion.attributes.get('aria-label')).toBe('Confirm deletion of damaged save in Slot 3');
    expect(memory.get('tervain:save:slot-3:cur')).toBe('{broken');
  });

  it.each([0, 1e20])('omits an unknown or unrepresentable saved-at timestamp (%s) without inventing a date', (time) => {
    const { ctx, saves, game, setTime } = session();
    setTime(time); saves.save('slot-1', game.state);
    expect(times(slotsPanel(ctx, 'load'))).toHaveLength(0);
  });
});

describe('manual save availability and quicksave feedback', () => {
  it.each([
    ['worldBuilding', true], ['worldBuildFailed', true], ['initialJourneyLoading', true],
    ['qualityReload', Promise.resolve()], ['worldDisposed', true], ['world', undefined], ['mode', 'title'],
  ] as const)('returns a failure without touching unavailable state during %s', (property, value) => {
    const { app, ctx, saves, snapshot, hud } = session();
    const write = vi.spyOn(saves, 'save');
    Reflect.set(app, property, value);
    expect(ctx.actions.save('slot-2')).toEqual({ ok: false, message: 'Your journey is not ready to save. Wait until the view is prepared.' });
    expect(snapshot).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(hud.toast).not.toHaveBeenCalled();
  });

  it('keeps successful quicksave feedback and returns the verified adapter result', () => {
    const { app, saves, hud } = session();
    expect(app.saveTo('quick')).toEqual({ ok: true });
    expect(saves.load('quick').ok).toBe(true);
    expect(hud.toast).toHaveBeenCalledWith('Game saved (Quicksave).', 'good');
  });
});
