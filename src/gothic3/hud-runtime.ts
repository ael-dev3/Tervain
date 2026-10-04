/** Original HUD listener instances and ordered entity-binding lifecycle.
 *
 * The constructor initializes the actual root fields. create() constructs the
 * persistent Main2 and all17 regular page/control instances. GFC creation,
 * rendering and non-inventory effects require explicit native-equivalent hosts.
 * The complete constructed HUD listener family set is known; that is separate
 * from proving a complete inventory registry across other engine components.
 */
import profileText from '../../assets/gothic3/hud/profile.json?raw';
import type { InventoryCallbackResult, InventoryObserver } from './inventory';
import { NativeInventory } from './inventory';
import { NativeHudInventoryObserver } from './inventory-observers';
import type { NativeGuiBindingRoot, NativeGuiEntityPage, NativeHudInventoryFamily,
  NativeInventoryObserverBoundaries } from './inventory-observers';
import { routeOriginalGuiEntityBinding } from './inventory-observers';

interface HudControlProfile {
  readonly id: string; readonly page: number; readonly name: string;
  readonly family: NativeHudInventoryFamily; readonly constructor: string;
  readonly controlOffset: number; readonly listenerOffset: number;
  readonly initial: { readonly dirty: false; readonly selectedStack: null | 'uninitialized';
    readonly boundInventory: null };
}
interface HudPageProfile {
  readonly id: number; readonly class: string; readonly constructor: string;
  readonly setEntity: string | null; readonly synthesisCategory: number | null;
  readonly transformCategory: number | null;
}
interface HudProfile {
  readonly schema: string; readonly inputSha256: string;
  readonly controls: readonly HudControlProfile[]; readonly pages: readonly HudPageProfile[];
  readonly root: { readonly initialActivePage: number; readonly initialPreviousPage: number;
    readonly regularPageCount: number; readonly entitySlots: number };
  readonly supportedProfile: { readonly stableUniqueLiveEntityPointers: boolean };
}
const profile = JSON.parse(profileText) as HudProfile;
if (profile.schema !== 'gothic3-native-hud-profile-v1' ||
    profile.inputSha256 !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
    profile.root.initialActivePage !== -1 || profile.root.initialPreviousPage !== -1 ||
    profile.root.regularPageCount !== 17 || profile.root.entitySlots !== 7 ||
    profile.controls.length !== 37 || profile.pages.length !== 17 ||
    profile.controls.filter(control => control.family === 'list').length !== 26 ||
    profile.controls.filter(control => control.family === 'stack-stats').length !== 7 ||
    profile.controls.filter(control => control.family === 'recipe-stats').length !== 4 ||
    profile.supportedProfile.stableUniqueLiveEntityPointers !== true) {
  throw new Error('Original constructed HUD profile differs.');
}

export type NativeHudInventoryResolution =
  | { readonly status: 'present'; readonly inventory: NativeInventory }
  | { readonly status: 'known-absent'; readonly source: string }
  | { readonly status: 'unresolved'; readonly reason: string };
export interface NativeHudEntityReference {
  readonly guid20: string;
  /** Stable eCEntity pointer identity, not a property-id lookup key. */
  readonly identity: object;
}

/** These handlers must implement the specified boundary's complete effects.
 * source can identify a containing function; nativeCalls/scope describe its
 * remaining subcalls, preventing double execution of the ported listener bind.
 * The effect kind defines the exact boundary; source is its original origin,
 * and may name a containing function rather than the subcall being executed.
 * Any message
 * that binds a listener must call this runtime's control binding API. Returning
 * applied without performing an unresolved native callback is not supported.
 */
export interface NativeHudHost {
  inventory(entity: NativeHudEntityReference): NativeHudInventoryResolution;
  /** Return the stable original eCEntity pointer identity after resolving the
   * property id. The20-byte id's trailing cache DWORD is not identity data. */
  entityIdentity(entityGuid20: string): object;
  /** Pure lifetime guard: that exact captured pointer is still live, and its
   * first16-byte id still uniquely identifies it in the selected host profile.
   * Destruction, replacement and duplicate ids are explicitly unsupported. */
  isEntityLive(entity: NativeHudEntityReference): boolean;
  effect(effect: NativeHudEffect, hud: NativeHudRuntime): InventoryCallbackResult;
}
export interface NativeHudEffect {
  readonly kind: 'create-window' | 'show-window' | 'close-page' | 'open-page' |
    'enable-window' | 'bring-main-to-top' | 'page-changed' | 'page-change-sound' |
    'session-state' | 'tutorial' | 'progress-refresh' | 'focus-visibility' |
    'character-bind' | 'cash-bind' | 'category-refresh' | 'headers-refresh' |
    'documents-bind' | 'trade-refresh' | 'loot-refresh' | 'page-bind' |
    'destroy-window' | 'delete-object' | 'destroy-root-tail' | 'layout' |
    'logo-bitmap-load' | 'logo-bitmap-release';
  readonly source: string; readonly page: number; readonly entityGuid20?: string | null;
  readonly entityReference?: NativeHudEntityReference | null;
  readonly slot?: number; readonly argument?: number | boolean | string;
  readonly previousPage?: number; readonly control?: string;
  readonly scope?: string; readonly nativeCalls?: readonly string[];
  /** The captured native receiver, including when a callback changes a root
   * pointer. Object deletion instead receives the reread live pointer. */
  readonly object?: NativeGuiEntityPage | NativeHudAuxiliaryWindow | null;
}
export interface NativeHudAuxiliaryWindow { readonly id: string; readonly source: string }
export interface NativeHudTrace {
  readonly operation: string; readonly source: string; readonly target: string;
  readonly value?: string | number | boolean | null;
}
export type NativeHudResult =
  | { readonly status: 'applied'; readonly partial: false;
      readonly applied: readonly NativeHudTrace[]; readonly attempted: readonly NativeHudTrace[] }
  | { readonly status: 'unsupported'; readonly reason: string; readonly partial: boolean;
      readonly applied: readonly NativeHudTrace[]; readonly attempted: readonly NativeHudTrace[] };

function guid(value: string | null): void {
  if (value !== null && !/^[0-9a-f]{40}$/.test(value)) throw new TypeError('HUD entity requires an original20-byte GUID.');
}
function index(value: number): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new RangeError('Expected native signed32 index.');
}

/** Precisely identify host-only subcalls of the already partially ported
 * containing helper. These never ask the host to repeat a listener Bind. */
function hudBoundary(kind: NativeHudEffect['kind'], source: string, argument?: string | number | boolean):
  Pick<NativeHudEffect, 'scope' | 'nativeCalls'> {
  if (kind === 'cash-bind') return { scope: 'cash control entity binding', nativeCalls: ['Game:2018b1e0'] };
  if (kind === 'focus-visibility') return { scope: 'post-progress-bind visibility branch of20166110, including2018ebb0 and NPCPS1e/name checks' };
  if (kind === 'documents-bind') return { scope: 'remaining three document child bindings after recipe binding',
    nativeCalls: ['Game:20164d90', 'Game:201650c0', 'Game:20163c80'] };
  if (kind === 'trade-refresh') return { scope: 'three refresh subcalls after all trade binding helpers',
    nativeCalls: ['Game:20162a70', 'Game:20163810', 'Game:201632b0'] };
  if (kind === 'category-refresh' && ['Game:20165350', 'Game:20165720'].includes(source)) {
    return { scope: 'tab getters and category updates after inventory list bind',
      nativeCalls: ['Game:2018e930', 'Game:20188730', 'Game:2018e930', 'Game:2018b510'] };
  }
  if (kind === 'category-refresh' && source === 'Game:20164900') return {
    scope: 'category getter/filter updates after documents list bind',
    nativeCalls: ['Game:201946d0', 'Game:20186d20', 'Game:201946d0', 'Game:20193a20'] };
  if (kind === 'page-bind' && source === 'Game:20162e50') return {
    scope: argument === 'transaction-player-partner' ? 'partner field of transaction-vendor control' : 'partner field of transaction-player control',
    nativeCalls: ['Game:20188ed0'] };
  if (kind === 'page-bind' && ['Game:20162910', 'Game:20163670'].includes(source)) return {
    scope: 'partner entity field update, excluding list/cash binds', nativeCalls: ['Game:20188ed0'] };
  if (kind === 'page-bind' && source === 'Game:20165720') return {
    scope: 'inventory-owner field update at loot list+54', nativeCalls: ['Game:201875f0'] };
  if (kind === 'page-bind' && source === 'Game:20165ca0') return argument === 'pool-player-reference'
    ? { scope: 'pool headings and partner inventory field, excluding list binding', nativeCalls: ['Game:20165ba0', 'Game:201875f0'] }
    : { scope: 'pool owner label before list/cash binding', nativeCalls: ['Game:20190810'] };
  return {};
}

/** The stack-stat constructor leaves its selection field uninitialized. It
 * cannot be represented by an invented0/-1 seed. The observer adapter is created
 * at the first real Bind call, where the native function writes its index before
 * registering the listener. Other control constructors establish all fields
 * required by the frozen observer implementation directly.
 */
export class NativeHudControl {
  private adapter: NativeHudInventoryObserver | null;
  private boundInventory: NativeInventory | null = null;
  private initializedSelection = false;
  constructor(readonly descriptor: HudControlProfile, boundaries: NativeInventoryObserverBoundaries) {
    this.adapter = descriptor.family === 'stack-stats' ? null :
      new NativeHudInventoryObserver(descriptor.id, descriptor.family, boundaries,
        { dirty: false, selectedStack: null });
    this.boundaries = boundaries;
  }
  private readonly boundaries: NativeInventoryObserverBoundaries;
  observer(): InventoryObserver | null { return this.adapter; }
  inventory(): NativeInventory | null {
    return this.adapter?.snapshot().bound ? this.boundInventory : null;
  }
  bind(inventory: NativeInventory | null, selectedStack: number | null = null): void {
    if (this.descriptor.family === 'stack-stats') {
      if (selectedStack === null) throw new Error('Original stack-stat Bind requires an explicit selected stack.');
      index(selectedStack);
      this.adapter ??= new NativeHudInventoryObserver(this.descriptor.id, 'stack-stats', this.boundaries,
        { dirty: false, selectedStack });
      this.initializedSelection = true;
    } else if (selectedStack !== null) throw new Error('Only stack-stat Bind accepts a selection index.');
    this.adapter!.bind(inventory, selectedStack);
    this.boundInventory = inventory;
  }
  snapshot() {
    const state = this.adapter?.snapshot();
    return { id: this.descriptor.id, page: this.descriptor.page, family: this.descriptor.family,
      source: this.descriptor.constructor, controlOffset: this.descriptor.controlOffset,
      listenerOffset: this.descriptor.listenerOffset, bound: state?.bound ?? false,
      dirty: state?.dirty ?? false,
      selectedStack: this.descriptor.family === 'stack-stats'
        ? (this.initializedSelection ? state!.selectedStack : 'uninitialized') : null,
      events: state?.events ?? [] };
  }
}

export class NativeHudPage implements NativeGuiEntityPage {
  readonly id: string;
  readonly source: string;
  constructor(readonly number: number, private readonly hud: NativeHudRuntime) {
    this.id = number === -1 ? 'main' : 'page-' + number;
    this.source = number === -1 ? 'Game:2016d4d0' : profile.pages[number]!.setEntity ?? 'unresolved-native-page-binding';
  }
  setEntity(entityGuid20: string | null, slot: number): InventoryCallbackResult {
    return this.hud.bindConstructedPage(this, entityGuid20, slot);
  }
}

export class NativeHudRuntime implements NativeGuiBindingRoot {
  private readonly entityReferences: (NativeHudEntityReference | null)[] = Array.from({ length: 7 }, () => null);
  /** GUIDs are the frozen router's transport view. The corresponding actual
   * pointer capability is captured on every root write, even when mainPage is
   * still null and there will be no page callback to capture it. */
  readonly entitySlots: (string | null)[] = new Proxy(Array.from({ length: 7 }, () => null as string | null), {
    set: (slots, property, value: unknown) => {
      if (typeof property !== 'string' || !/^[0-6]$/.test(property) ||
          (value !== null && typeof value !== 'string')) {
        throw new Error('Native HUD entity pointer array has exactly seven fixed slots.');
      }
      guid(value);
      const slot = Number(property);
      this.entityReferences[slot] = this.captureEntity(value);
      slots[slot] = value;
      return true;
    },
  });
  mainPage: NativeGuiEntityPage | null = null;
  readonly pages: (NativeGuiEntityPage | null)[] = Array.from({ length: 17 }, () => null);
  crosshair: NativeHudAuxiliaryWindow | null = null;
  readonly logos: (NativeHudAuxiliaryWindow | null)[] = [null, null, null];
  activePageIndex = -1;
  previousPageIndex = -1;
  private readonly controls = new Map<string, NativeHudControl>();
  private readonly progressEntities = new Map<string, string | null>();
  private readonly progressPointers = new Map<string, object | null>();
  private readonly capturedEntities = new Map<string, NativeHudEntityReference>();
  private compassEntity: string | null = null;
  private compassPointer: object | null = null;
  private readonly constructedPages = new Set<NativeHudPage>();
  private created = false;
  private blocked: string | null = null;
  private journals: { applied: NativeHudTrace[]; attempted: NativeHudTrace[] }[] = [];

  constructor(private readonly boundaries: NativeInventoryObserverBoundaries, private readonly host: NativeHudHost) {
    if (boundaries.originalGameSha256 !== profile.inputSha256 ||
        boundaries.runtimeRegistryCompleteness !== 'unresolved') throw new Error('HUD observer source profile differs.');
    for (const name of ['focus', 'mana', 'health', 'stamina']) {
      this.progressEntities.set(name, null); this.progressPointers.set(name, null);
    }
  }
  snapshot() {
    return { source: 'Game:2016fb70', created: this.created, entitySlots: [...this.entitySlots],
      activePageIndex: this.activePageIndex, previousPageIndex: this.previousPageIndex,
      mainPresent: this.mainPage !== null, pagesPresent: this.pages.map(page => page !== null),
      crosshairPresent: this.crosshair !== null, logosPresent: this.logos.map(logo => logo !== null),
      compassEntity: this.compassEntity, progressEntities: Object.fromEntries(this.progressEntities),
      controls: [...this.controls.values()].map(control => control.snapshot()), blocked: this.blocked };
  }
  entityReference(slot: number): NativeHudEntityReference | null {
    index(slot);
    if (slot < 0 || slot >= 7) throw new Error('Original HUD has seven entity pointer slots.');
    return this.entityReferences[slot]!;
  }
  private record(trace: NativeHudTrace): void { for (const journal of this.journals) journal.applied.push(trace); }
  private attempt(trace: NativeHudTrace): void { for (const journal of this.journals) journal.attempted.push(trace); }
  private run(action: () => void): NativeHudResult {
    const journal = { applied: [] as NativeHudTrace[], attempted: [] as NativeHudTrace[] };
    if (this.blocked) return { status: 'unsupported', reason: this.blocked, partial: false, ...journal };
    this.journals.push(journal);
    try {
      action();
      if (this.blocked) throw new Error(this.blocked);
      return { status: 'applied', partial: false, ...journal };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const partial = journal.applied.length > 0 || journal.attempted.length > 0;
      if (partial) this.blocked = reason;
      return { status: 'unsupported', reason, partial, ...journal };
    } finally { this.journals.pop(); }
  }
  private effect(effect: NativeHudEffect): void {
    if (effect.entityReference) this.assertLive(effect.entityReference);
    const trace = { operation: effect.kind, source: effect.source, target: effect.control ?? String(effect.page),
      value: effect.argument };
    this.attempt(trace);
    const result = this.host.effect(effect, this);
    if (result.status !== 'applied') throw new Error(result.reason);
    if (this.blocked) throw new Error(this.blocked);
    this.record(trace);
    if (effect.entityReference) this.assertLive(effect.entityReference);
  }
  private constructPage(page: number): NativeHudPage {
    for (const descriptor of profile.controls.filter(control => control.page === page)) {
      const control = new NativeHudControl(descriptor, this.boundaries);
      this.controls.set(descriptor.id, control);
      this.record({ operation: 'construct-control', source: descriptor.constructor, target: descriptor.id });
    }
    const instance = new NativeHudPage(page, this);
    this.constructedPages.add(instance);
    if (page === -1) this.mainPage = instance;
    this.record({ operation: 'construct-page', source: page === -1 ? 'Game:2016d160' : profile.pages[page]!.constructor,
      target: instance.id });
    return instance;
  }
  create(): NativeHudResult {
    return this.run(() => {
      if (this.mainPage !== null || this.pages.some(page => page !== null)) throw new Error('Native HUD Create cannot be replayed over existing objects.');
      const main = this.constructPage(-1);
      this.effect({ kind: 'create-window', source: 'Game:201708b0', page: -1, argument: 0x755c, object: main,
        scope: 'CFFGFCWnd Create(captured Main2,resource0x755c,parent root)' });
      this.effect({ kind: 'show-window', source: 'Game:201708b0', page: -1, argument: true, object: this.mainPage,
        scope: 'CFFGFCWnd ShowWindow(reread root main pointer,true)' });
      const resources = [0x7564, 0x756b, 0x7563, 0x7565, 0x7566, 0x756f, 0x7576, 0x7580,
        0x7579, 0x7579, 0x7579, 0x7585, 0x7585, 0x7585, 0x7585, 0x7586, 0x759b];
      for (let page = 0; page < 17; page++) {
        const instance = this.constructPage(page);
        this.effect({ kind: 'create-window', source: 'Game:2016fc30', page, argument: resources[page]!, object: instance,
          scope: 'CFFGFCWnd Create(captured factory page,resource,parent root); constructors already modeled' });
        if (page >= 8 && page <= 10) this.effect({ kind: 'category-refresh', source: 'Game:2016e750', page, argument: page - 6, object: instance });
        if (page >= 11 && page <= 14) this.effect({ kind: 'category-refresh', source: 'Game:2016f490', page, argument: page - 11, object: instance });
        this.pages[page] = instance; // Factory returns before the root publishes this pointer.
        this.record({ operation: 'store-page-pointer', source: 'Game:201708b0', target: instance.id });
        this.effect({ kind: 'close-page', source: page === 5 ? 'Game:20012ad5' : 'Game:2000a312', page, object: instance });
      }
      for (let logo = 0; logo < 3; logo++) {
        const bitmap = ['G3_HUD_Logo_Start.tga', 'G3_HUD_Logo_Title.tga', 'G3_HUD_Logo_Version.tga'][logo]!;
        this.effect({ kind: 'logo-bitmap-load', source: 'Game:201708b0', page: -3 - logo,
          argument: bitmap, scope: 'CFFGFCBitmap constructor/Create before logo allocation' });
        this.logos[logo] = { id: 'logo-' + logo, source: 'Game:20191620' };
        this.effect({ kind: 'create-window', source: 'Game:201708b0', page: -3 - logo,
          argument: bitmap, object: this.logos[logo], scope: 'CFFGFCStatic Create(empty,0x10,rect0,0,100,100,null,0xffffffff), then SetBitmap(GetHandle)' });
        this.effect({ kind: 'logo-bitmap-release', source: 'Game:201708b0', page: -3 - logo,
          scope: 'CFFGFCBitmap destructor after SetBitmap' });
      }
      this.crosshair = { id: 'crosshair', source: 'Game:20190340' };
      this.effect({ kind: 'create-window', source: 'Game:201903e0', page: -2, object: this.crosshair });
      this.effect({ kind: 'layout', source: 'Game:20170170', page: -1 });
      this.created = true;
      this.record({ operation: 'create-complete', source: 'Game:201708b0', target: 'root' });
    });
  }
  control(id: string): NativeHudControl {
    const value = this.controls.get(id);
    if (!value) throw new Error('Original HUD control is not constructed: ' + id);
    return value;
  }
  private captureEntity(entity: string | null): NativeHudEntityReference | null {
    if (entity === null) return null;
    const key = entity.slice(0, 32);
    const captured = this.capturedEntities.get(key);
    if (captured) { this.assertLive(captured); return captured; }
    const identity = this.host.entityIdentity(entity);
    if (identity === null || (typeof identity !== 'object' && typeof identity !== 'function')) {
      throw new Error('Original HUD entity pointer identity is unresolved.');
    }
    const reference = Object.freeze({ guid20: entity, identity });
    this.assertLive(reference);
    this.capturedEntities.set(key, reference);
    return reference;
  }
  private assertLive(entity: NativeHudEntityReference): void {
    if (this.host.isEntityLive(entity) !== true) {
      throw new Error('Captured HUD eCEntity pointer was destroyed, replaced, duplicated or otherwise left the supported stable lifetime profile.');
    }
  }
  private resolveInventory(entity: NativeHudEntityReference | null): NativeInventory | null {
    if (entity === null) return null;
    this.assertLive(entity);
    // The native virtual GetPropertySet may call OnReadContent before lookup.
    // An unresolved/throwing host can therefore already have applied effects.
    const trace = { operation: 'resolve-inventory-ps', source: 'Game:2018a7f0/20161a80', target: entity.guid20 };
    this.attempt(trace);
    const result = this.host.inventory(entity);
    if (result.status === 'unresolved') throw new Error(result.reason);
    if (result.status === 'known-absent') {
      if (!result.source) throw new Error('Inventory absence lacks source evidence.');
      this.assertLive(entity); this.record(trace);
      return null;
    }
    this.assertLive(entity); this.record(trace);
    return result.inventory;
  }
  private bindControl(id: string, inventory: NativeInventory | null, selection: number | null = null): void {
    const control = this.control(id);
    const source = this.boundaries.supportedHudCallbackFamilies[control.descriptor.family].bind;
    const trace = { operation: 'bind-listener', source, target: id, value: selection };
    this.attempt(trace);
    control.bind(inventory, selection);
    this.record(trace);
  }
  private bindEntityControl(page: number, name: string, entity: NativeHudEntityReference | null): void {
    this.bindControl((page === -1 ? 'main' : 'page-' + page) + '/' + name, this.resolveInventory(entity));
  }
  /** Port only the Game2018e460 listener bind invoked by Game20161000. Icon,
   * text, item-template and visibility effects of20161000 require the selection
   * message host; this method does not claim to execute that complete helper.
   */
  bindSelectedStack(page: number, inventory: NativeInventory | null, selectedStack: number): NativeHudResult {
    return this.run(() => { index(selectedStack); this.bindControl('page-' + page + '/item-stats', inventory, selectedStack); });
  }
  private progress(name: string, entity: NativeHudEntityReference | null): void {
    if (entity) this.assertLive(entity);
    const pointer = entity?.identity ?? null;
    if (this.progressPointers.get(name) !== pointer) {
      this.progressPointers.set(name, pointer);
      this.progressEntities.set(name, entity?.guid20 ?? null);
      this.record({ operation: 'progress-entity', source: 'Game:2018ef50', target: 'main/' + name, value: entity?.guid20 ?? null });
      this.effect({ kind: 'progress-refresh', source: 'Game:2018ecd0', page: -1, control: name,
        entityGuid20: entity?.guid20 ?? null, entityReference: entity });
    }
  }
  bindPage(page: number, entity: string | null, slot: number): NativeHudResult {
    const instance = page === -1 ? this.mainPage : this.pages[page];
    if (!(instance instanceof NativeHudPage)) return { status: 'unsupported', reason: 'Original HUD page receiver is unresolved.', partial: false, applied: [], attempted: [] };
    return this.bindConstructedPage(instance, entity, slot);
  }
  /** Used by the captured receiver during native Create and reentrant routes. */
  bindConstructedPage(instance: NativeHudPage, entity: string | null, slot: number): NativeHudResult {
    return this.run(() => {
      const page = instance.number;
      guid(entity); index(slot);
      const capturedEntity = this.captureEntity(entity);
      if (slot < 0 || slot >= 7 || (page !== -1 && (!Number.isInteger(page) || page < 0 || page >= 17))) throw new Error('Native HUD page/slot is unresolved.');
      if (!this.constructedPages.has(instance)) throw new Error('Native HUD page is not constructed by this runtime.');
      const emit = (kind: NativeHudEffect['kind'], source: string, argument?: string | number | boolean) =>
        this.effect({ kind, source, page, entityGuid20: entity, entityReference: capturedEntity, slot, argument, object: instance,
          ...hudBoundary(kind, source, argument) });
      if (page === -1) {
        if (slot === 1) {
          this.progress('focus', capturedEntity);
          emit('focus-visibility', 'Game:20166110');
        }
        if (slot === 0) {
          this.progress('mana', capturedEntity); this.progress('health', capturedEntity); this.progress('stamina', capturedEntity);
          this.bindEntityControl(-1, 'quick-slots', capturedEntity);
          if (capturedEntity) this.assertLive(capturedEntity);
          const pointer = capturedEntity?.identity ?? null;
          if (this.compassPointer !== pointer) {
            this.compassPointer = pointer; this.compassEntity = entity;
            this.record({ operation: 'compass-entity', source: 'Game:20190080', target: 'main/compass', value: entity });
          }
        }
        return;
      }
      if (page === 0 && slot === 0) {
        emit('character-bind', 'Game:20160c20');
        emit('cash-bind', 'Game:20165350');
        this.bindEntityControl(page, 'inventory', capturedEntity);
        emit('category-refresh', 'Game:20165350');
      } else if (page === 1 && slot === 0) {
        for (const name of ['innos', 'beliar', 'adanos']) this.bindEntityControl(page, name, capturedEntity);
        emit('headers-refresh', 'Game:2016b3a0');
      } else if (page === 2) {
        if (slot === 0) {
          this.bindEntityControl(page, 'documents', capturedEntity);
          emit('category-refresh', 'Game:20164900');
          this.bindControl('page-' + page + '/recipe-stats', this.resolveInventory(capturedEntity));
        }
        emit('documents-bind', 'Game:20164210');
      } else if (page === 3 && slot === 0) {
        emit('character-bind', 'Game:20160c20');
        for (let child = 0; child < 7; child++) this.bindEntityControl(page, 'skills-' + child, capturedEntity);
        emit('headers-refresh', 'Game:20169580');
      } else if (page === 5) {
        if (slot === 0) {
          this.bindEntityControl(page, 'inventory', capturedEntity);
          emit('cash-bind', 'Game:20162910');
          emit('page-bind', 'Game:20163670', 'vendor-player-reference');
          this.bindEntityControl(page, 'transaction-player', capturedEntity);
          emit('page-bind', 'Game:20162e50', 'transaction-player-partner');
        } else if (slot === 2) {
          emit('page-bind', 'Game:20162910', 'inventory-vendor-reference');
          this.bindEntityControl(page, 'vendor', capturedEntity);
          emit('cash-bind', 'Game:20163670');
          this.bindEntityControl(page, 'transaction-vendor', capturedEntity);
          emit('page-bind', 'Game:20162e50', 'transaction-vendor-partner');
        }
        emit('trade-refresh', 'Game:2016ef60');
      } else if (page === 7) {
        if (slot === 0) {
          emit('cash-bind', 'Game:20165720');
          this.bindEntityControl(page, 'inventory', capturedEntity);
          this.bindEntityControl(page, 'inventory', capturedEntity); // Original duplicate call, list equality guard applies.
          emit('category-refresh', 'Game:20165720');
          emit('page-bind', 'Game:20165ca0', 'pool-player-reference');
        } else if (slot === 2) {
          emit('page-bind', 'Game:20165720', 'inventory-owner-reference');
          emit('page-bind', 'Game:20165ca0', 'pool-owner-reference');
          this.bindEntityControl(page, 'pool', capturedEntity);
          emit('cash-bind', 'Game:20165ca0');
        }
        emit('loot-refresh', 'Game:20165b70');
      } else if (page >= 8 && page <= 10 && slot === 0) {
        this.bindEntityControl(page, 'recipes', capturedEntity);
        this.bindControl('page-' + page + '/recipe-stats', this.resolveInventory(capturedEntity));
      } else if (page >= 11 && page <= 14 && slot === 0) {
        this.bindEntityControl(page, 'inventory', capturedEntity);
      } else if ([4, 15].includes(page)) {
        emit('page-bind', profile.pages[page]!.setEntity ?? 'native-page-vtable+0x118');
      }
      // Dialog and Slideshow virtual SetEntity are proven no-ops.
    });
  }
  setEntity(entity: string | null, slot: number): NativeHudResult {
    return this.run(() => {
      guid(entity); index(slot);
      // Capture the actual original argument once before the first page call.
      // Every later GUID transport retrieves this same capability; liveness
      // guards reject destruction/replacement instead of rebinding a new GUID
      // lookup result. The selected profile requires unique stable entity ids.
      this.captureEntity(entity);
      // Root writes and callback prefixes are recorded before entering the
      // existing native router, including unsupported first callback effects.
      this.attempt({ operation: 'root-set-entity', source: 'Game:20170a70', target: 'root', value: entity });
      const result = routeOriginalGuiEntityBinding(this, entity, slot);
      if (result.status !== 'applied') throw new Error(result.reason);
      this.record({ operation: 'root-set-entity', source: 'Game:20170a70', target: 'root', value: entity });
    });
  }
  resetEntities(): NativeHudResult {
    return this.run(() => {
      for (let slot = 0; slot < 7; slot++) {
        const result = this.setEntity(null, slot);
        if (result.status !== 'applied') throw new Error(result.reason);
      }
    });
  }
  private pageSlots(instance: NativeGuiEntityPage, clear: boolean): void {
    for (let slot = 0; slot < 7; slot++) {
      this.attempt({ operation: clear ? 'clear-page-slot' : 'bind-page-slot', source: clear ? 'Game:20170320' : 'Game:201702e0', target: instance.id, value: slot });
      const result = instance.setEntity(clear ? null : this.entitySlots[slot]!, slot);
      if (result.status !== 'applied') throw new Error(result.reason);
    }
  }
  selectPage(next: number): NativeHudResult {
    return this.run(() => {
      index(next);
      if (next === this.activePageIndex) return;
      if (!this.created || next < -1 || next >= 17) throw new Error('Native HUD page selection is unavailable.');
      this.effect({ kind: 'enable-window', source: 'Game:20170d90', page: -1, argument: next !== 15, object: this.mainPage });
      if (next === 15) {
        const old = this.activePageIndex;
        if (old !== -1 && this.pages[old] !== null) this.effect({ kind: 'enable-window', source: 'Game:20170d90', page: old, argument: false, object: this.pages[old] });
        this.previousPageIndex = this.activePageIndex;
        this.record({ operation: 'previous-page', source: 'Game:20170d90', target: 'root', value: this.previousPageIndex });
      } else {
        const old = this.activePageIndex;
        const captured = old === -1 ? null : this.pages[old];
        if (captured) {
          this.effect({ kind: 'close-page', source: old === 5 ? 'Game:20012ad5' : 'Game:2000a312', page: old, object: captured });
          this.pageSlots(captured, true);
        }
      }
      const captured = next === -1 ? null : this.pages[next];
      if (captured) {
        this.pageSlots(captured, false);
        this.effect({ kind: 'enable-window', source: 'Game:20170d90', page: next, argument: true, object: captured });
        this.effect({ kind: 'open-page', source: next === 5 ? 'Game:2001a979' : 'Game:20029a7d', page: next, object: captured });
      }
      const old = this.activePageIndex; // Original rereads this after all page callbacks.
      this.effect({ kind: 'page-change-sound', source: 'Game:20170d00', page: next, argument: next === -1 });
      for (let page = 0; page < 17; page++) this.effect({ kind: 'page-changed', source: 'Game:20170d00', page, argument: next, previousPage: old, object: this.pages[page] });
      this.effect({ kind: 'page-changed', source: 'Game:20170d00', page: -1, argument: next, previousPage: old, object: this.mainPage });
      if (next === -1) this.effect({ kind: 'session-state', source: 'Game:20170d00', page: next, argument: 0 });
      else if (old === -1) this.effect({ kind: 'session-state', source: 'Game:20170d00', page: next, argument: 1 });
      this.activePageIndex = next;
      this.record({ operation: 'active-page', source: 'Game:20170d90', target: 'root', value: next });
      this.effect({ kind: 'bring-main-to-top', source: 'Game:20170d90', page: -1, object: this.mainPage });
      this.effect({ kind: 'tutorial', source: 'Game:20170b20', page: next });
    });
  }
  /** Exhausts every constructed HUD listener control. Registration order is
   * owned by NativeInventory's actual Add/Remove/Purge operations, not this
   * constructor-order list. This is not a complete external registry receipt.
   */
  inventoryCoverage(inventory: NativeInventory) {
    return { status: this.created && this.blocked === null ? 'known-HUD-profile' as const : 'unresolved' as const,
      originalConstructedControlCount: 37,
      boundControls: [...this.controls.values()].filter(control => control.inventory() === inventory)
        .map(control => ({ id: control.descriptor.id, family: control.descriptor.family, observer: control.observer()! })),
      completeExternalRegistry: false as const,
      reason: this.blocked ?? 'Non-HUD registry and source message dispatch need independent composition.' };
  }
  /** Original member destructors do not remove inventory listeners themselves.
   * Require the native explicit page/entity clear paths first, instead of
   * inventing a destructor-time RemoveListener. The inherited window lifetime
   * and object deletion remain explicit source host effects.
   */
  destroy(): NativeHudResult {
    return this.run(() => {
      if ([...this.controls.values()].some(control => control.inventory() !== null)) {
        throw new Error('Bound HUD destruction requires original window lifecycle/clear effects; member destructors do not unregister listeners.');
      }
      if (this.mainPage !== null) {
        this.effect({ kind: 'destroy-window', source: 'Game:20170760', page: -1, object: this.mainPage, argument: 0 });
        this.effect({ kind: 'delete-object', source: 'Game:20170760', page: -1, object: this.mainPage });
        this.mainPage = null;
        this.record({ operation: 'clear-main-pointer', source: 'Game:20170760', target: 'root' });
      }
      if (this.crosshair !== null) {
        this.effect({ kind: 'destroy-window', source: 'Game:20170760', page: -2, object: this.crosshair, argument: 0 });
        this.effect({ kind: 'delete-object', source: 'Game:20170760', page: -2, object: this.crosshair });
        this.crosshair = null;
        this.record({ operation: 'clear-crosshair-pointer', source: 'Game:20170760', target: 'root' });
      }
      for (let page = 0; page < 17; page++) if (this.pages[page] !== null) {
        this.effect({ kind: 'destroy-window', source: 'Game:20170760', page, object: this.pages[page], argument: 0 });
        this.effect({ kind: 'delete-object', source: 'Game:20170760', page, object: this.pages[page] });
        this.pages[page] = null;
        this.record({ operation: 'clear-page-pointer', source: 'Game:20170760', target: 'page-' + page });
      }
      for (let logo = 0; logo < 3; logo++) if (this.logos[logo] !== null) {
        this.effect({ kind: 'destroy-window', source: 'Game:20170760', page: -3 - logo, object: this.logos[logo], argument: 0 });
        this.effect({ kind: 'delete-object', source: 'Game:20170760', page: -3 - logo, object: this.logos[logo] });
        this.logos[logo] = null;
        this.record({ operation: 'clear-logo-pointer', source: 'Game:20170760', target: 'logo-' + logo });
      }
      this.effect({ kind: 'destroy-root-tail', source: 'Game:20170760', page: -1 });
      this.controls.clear(); this.constructedPages.clear(); this.created = false;
      this.record({ operation: 'destroy-complete', source: 'Game:20170760', target: 'root' });
    });
  }
}
