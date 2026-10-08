import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoadingScreen } from '../../src/presentation/ui/loadingScreen';

class ElementFixture {
  className = '';
  disabled = false;
  isConnected = true;
  innerHTML = '';
  parent: ElementFixture | null = null;
  readonly attributes = new Map<string, string>();
  readonly children: (ElementFixture | string)[] = [];
  readonly listeners = new Map<string, ((event: Record<string, unknown>) => unknown)[]>();
  readonly style = { setProperty: vi.fn() };
  readonly classList = {
    add: (...names: string[]) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' '); },
    remove: (...names: string[]) => { this.className = this.className.split(' ').filter((name) => !names.includes(name)).join(' '); },
    toggle: (name: string, force: boolean) => force ? this.classList.add(name) : this.classList.remove(name),
    contains: (name: string) => this.className.split(' ').includes(name),
  };
  private text = '';
  constructor(readonly tagName: string) {}
  set textContent(text: string) { this.text = text; this.children.length = 0; }
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
    if (typeof child !== 'string') { child.parent = null; child.isConnected = false; }
  }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  addEventListener(name: string, listener: (event: Record<string, unknown>) => unknown) { this.listeners.set(name, [...this.listeners.get(name) ?? [], listener]); }
  contains(other: ElementFixture): boolean { return this === other || this.children.some((child) => typeof child !== 'string' && child.contains(other)); }
  closest(): null { return null; }
  focus() { Reflect.set(document, 'activeElement', this); }
  click() { void this.emit('click'); }
  async emit(name: string, event: Record<string, unknown> = {}) {
    await Promise.all((this.listeners.get(name) ?? []).map((listener) => listener(event)));
  }
  find(predicate: (element: ElementFixture) => boolean): ElementFixture | undefined {
    if (predicate(this)) return this;
    for (const child of this.children) if (typeof child !== 'string') {
      const found = child.find(predicate); if (found) return found;
    }
    return undefined;
  }
}

const fixture = (element: Element) => element as unknown as ElementFixture;
const find = (screen: LoadingScreen, role: string) => fixture(screen.el).find((element) => element.attributes.get('role') === role)!;

beforeEach(() => {
  const body = new ElementFixture('BODY');
  vi.stubGlobal('document', { body, activeElement: body, createElement: (tag: string) => new ElementFixture(tag.toUpperCase()) });
});
afterEach(() => vi.unstubAllGlobals());

describe('loading screen recovery and accessible work counts', () => {
  it('announces the current phase and exposes actual counts only while they are known', () => {
    const screen = new LoadingScreen();
    screen.start({ mode: 'initial' });
    const bar = find(screen, 'progressbar');
    expect(bar.attributes.has('aria-valuenow')).toBe(false);
    screen.update({ phase: 'residents', completed: 3, total: 12 });
    expect(find(screen, 'status').textContent).toBe('Loading residents');
    expect(bar.attributes.get('aria-valuenow')).toBe('3');
    expect(bar.attributes.get('aria-valuemax')).toBe('12');
    expect(bar.attributes.get('aria-valuetext')).toBe('Loading residents: 3 of 12');
    screen.update({ phase: 'terrain' });
    expect(bar.attributes.has('aria-valuenow')).toBe(false);
    expect(fixture(screen.el).textContent).not.toContain('%');
  });

  it('distinguishes first-load recovery from a paused view rebuild', () => {
    const screen = new LoadingScreen();
    screen.start({ mode: 'initial' });
    screen.fail({ retry: vi.fn() });
    expect(fixture(screen.el).textContent).toContain('Your journey could not begin.');
    screen.start({ mode: 'rebuild', phase: 'terrain' });
    expect(fixture(screen.el).textContent).toContain('Your journey is paused while the view changes.');
    screen.fail({ retry: vi.fn() });
    expect(fixture(screen.el).textContent).toContain('The view could not be prepared.');
  });

  it('focuses Retry, blocks duplicate retry clicks and preserves button identity for controller navigation', async () => {
    const screen = new LoadingScreen();
    screen.start({ mode: 'initial' });
    let resolve!: () => void;
    const retry = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const button = screen.fail({ retry })!;
    expect(screen.retryButton).toBe(button);
    expect(document.activeElement).toBe(button);
    const pending = fixture(button).emit('click');
    await fixture(button).emit('click');
    expect(retry).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    resolve(); await pending;
    expect(button.disabled).toBe(false);
  });

  it('keeps Tab within recovery controls and restores the original focus after finishing', async () => {
    const previous = new ElementFixture('BUTTON');
    previous.focus();
    const screen = new LoadingScreen();
    screen.start({ mode: 'rebuild' });
    const retry = screen.fail({ retry: vi.fn(), back: vi.fn() })!;
    const card = fixture(screen.el).find((element) => element.classList.contains('loading-error'))!;
    const preventDefault = vi.fn();
    await card.emit('keydown', { key: 'Tab', shiftKey: false, preventDefault });
    expect(document.activeElement).not.toBe(retry);
    await card.emit('keydown', { key: 'Tab', shiftKey: false, preventDefault });
    expect(document.activeElement).toBe(retry);
    expect(preventDefault).toHaveBeenCalledTimes(2);
    screen.finish();
    expect(document.activeElement).toBe(previous);
    expect(fixture(screen.el).classList.contains('off')).toBe(true);
    expect(screen.retryButton).toBeNull();
  });

  it('names the cause of a failure in small print under the message (A68)', () => {
    const screen = new LoadingScreen();
    screen.start({ mode: 'initial' });
    screen.fail({ retry: vi.fn(), detail: 'Tree fir-spire download stalled.' });
    expect(fixture(screen.el).textContent).toContain('Tree fir-spire download stalled.');
    const plain = new LoadingScreen();
    plain.start({ mode: 'initial' });
    plain.fail({ retry: vi.fn() });
    expect(fixture(plain.el).textContent).not.toContain('stalled');
  });

  it('removes failure semantics when a retry starts and ignores late updates while failed', () => {
    const screen = new LoadingScreen();
    screen.start({ mode: 'initial' });
    screen.fail({ message: 'The shore could not be reached.', retry: vi.fn() });
    screen.update({ phase: 'graphics', completed: 1, total: 1 });
    expect(fixture(screen.el).textContent).toContain('The shore could not be reached.');
    screen.start({ mode: 'initial' });
    expect(fixture(screen.el).attributes.has('aria-modal')).toBe(false);
    expect(fixture(screen.el).attributes.has('aria-labelledby')).toBe(false);
    expect(screen.retryButton).toBeNull();
    expect(find(screen, 'status').textContent).toBe('Preparing your journey');
  });

  it('lets controller navigation select Back and confirmation activate the focused recovery action', () => {
    const screen = new LoadingScreen();
    screen.start({ mode: 'initial' });
    const retry = vi.fn(), back = vi.fn();
    screen.fail({ retry, back });
    screen.navigate(0, 1);
    expect((document.activeElement as HTMLElement).textContent).toBe('Back');
    screen.confirm();
    expect(back).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
    screen.navigate(1, 0);
    screen.confirm();
    expect(retry).toHaveBeenCalledOnce();
    screen.finish();
    screen.navigate(0, 1); screen.confirm();
    expect(back).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });
});
