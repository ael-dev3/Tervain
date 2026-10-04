/** Original HUD inventory callbacks and player-cache binding boundaries.
 *
 * These functions port the actual recovered listener writes. They do not turn
 * the unresolved original runtime registry into an empty one. Native HUD page
 * construction, active-page selection and instantiated control order must be
 * recovered before a complete registry can be supplied to NativeInventory.
 */
import manifestText from '../../assets/gothic3/inventory-observers/manifest.json?raw';
import type { InventoryCallbackResult, InventoryEvent, InventoryObserver } from './inventory';
import { NativeInventory } from './inventory';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

export type NativeHudInventoryFamily = 'list' | 'recipe-stats' | 'stack-stats';
export type NativeInventoryNotification = 'create' | 'change' | 'delete' | 'clear' | 'destroy';
export interface NativeInventoryObserverBoundaries {
  schema: 'gothic3-native-inventory-observer-boundaries-v1';
  originalGameSha256: string;
  originalScriptSha256: string;
  originalScriptGameSha256: string;
  runtimeRegistryCompleteness: 'unresolved';
  listenerStorage: { snapshotCountAtEntry: true; readActiveAndPointerAtEachIteration: true; purgeAfterDispatch: true };
  nativeEvents: Record<NativeInventoryNotification, number>;
  onPlayerChanged: {
    source: 'Script_Game:10077540'; invalidateScriptEntityPlayerCache: true;
    updateGuiPlayerBinding: true; returnValue: 1; directPlayerMemoryOrStatWrites: [];
  };
  guiBinding: {
    source: 'Game:20170a70'; entitySlots: 7; mainPageBeforeActivePage: true;
    mainPagePointerOffset: 124; activePageIndexOffset: 132; activePageArrayOffset: 56;
    virtualSetEntityOffset: 280; unresolved: string[];
  };
  supportedHudCallbackFamilies: Record<NativeHudInventoryFamily, Record<NativeInventoryNotification | 'bind', string>>;
  remaining: string[];
  limitation: string;
}

const manifest = JSON.parse(manifestText) as {
  schema: string; allSelectedInstructionBytesMatchOriginalPE: boolean;
  runtimeRegistryCompletenessProven: boolean; runtime: ResourceReceipt & { path: string };
};
if (manifest.schema !== 'gothic3-native-inventory-observers-audit-v1' ||
    manifest.allSelectedInstructionBytesMatchOriginalPE !== true ||
    manifest.runtimeRegistryCompletenessProven !== false ||
    manifest.runtime?.path !== 'public/gothic3/inventory-observers/boundaries.json') {
  throw new Error('Invalid original inventory observer receipt.');
}

/** Loads source facts only. It does not install an empty listener registry. */
export async function loadOriginalInventoryObserverBoundaries(): Promise<NativeInventoryObserverBoundaries> {
  const document = await readNativeResource<NativeInventoryObserverBoundaries>('inventory-observers/boundaries.json', manifest.runtime);
  if (document.schema !== 'gothic3-native-inventory-observer-boundaries-v1' ||
      document.runtimeRegistryCompleteness !== 'unresolved' ||
      document.originalGameSha256 !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
      document.originalScriptSha256 !== '9375605676faaae44a50d48539a7b3995bed471e099ef573666221a044cd4e08' ||
      document.originalScriptGameSha256 !== '2f10fbb6307c4800bc44c90cb60dac0b32182c1f2416e11ac82b4ba0c35803c1' ||
      document.onPlayerChanged?.source !== 'Script_Game:10077540' ||
      document.onPlayerChanged.returnValue !== 1 ||
      document.onPlayerChanged.directPlayerMemoryOrStatWrites?.length !== 0 ||
      document.guiBinding?.source !== 'Game:20170a70' ||
      document.guiBinding.mainPageBeforeActivePage !== true || document.guiBinding.entitySlots !== 7) {
    throw new Error('Original inventory observer boundaries changed.');
  }
  for (const [index, event] of (['create', 'change', 'delete', 'clear', 'destroy'] as const).entries()) {
    if (document.nativeEvents?.[event] !== index) throw new Error('Original listener event order changed.');
  }
  return document;
}

function signed32(value: number, label: string): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new RangeError(label + ' must be a native signed 32-bit integer.');
  }
  return value;
}
function entityGuid(value: string | null): string | null {
  if (value !== null && !/^[0-9a-f]{40}$/.test(value)) throw new TypeError('Expected an original lowercase 20-byte entity GUID.');
  return value;
}

export interface NativeHudInventoryState {
  readonly family: NativeHudInventoryFamily;
  readonly bound: boolean;
  readonly dirty: boolean;
  readonly selectedStack: number | null;
  readonly events: readonly { event: NativeInventoryNotification | 'bind'; source: string }[];
}

/** Ports one native listener instance. Its constructor requires the state from
 * the recovered HUD constructor; it does not invent original widget defaults.
 * Bind/rebind order is the actual AddListener/RemoveListener order, including
 * removal of a stack-stat observer from inside its own delete callback.
 */
export class NativeHudInventoryObserver implements InventoryObserver {
  readonly source: string;
  private inventory: NativeInventory | null = null;
  private dirty: boolean;
  private selectedStack: number | null;
  private readonly events: { event: NativeInventoryNotification | 'bind'; source: string }[] = [];

  constructor(
    readonly id: string,
    readonly family: NativeHudInventoryFamily,
    private readonly boundaries: NativeInventoryObserverBoundaries,
    initial: { readonly dirty: boolean; readonly selectedStack: number | null },
  ) {
    if (!id || !boundaries.supportedHudCallbackFamilies?.[family]) throw new TypeError('Original listener instance identity and family are required.');
    if (boundaries.runtimeRegistryCompleteness !== 'unresolved') throw new TypeError('This callback module cannot certify registry completeness.');
    if (typeof initial.dirty !== 'boolean' || (family === 'stack-stats') !== (initial.selectedStack !== null)) {
      throw new TypeError('Supply the source-derived dirty flag and stack-stat selection.');
    }
    this.source = boundaries.supportedHudCallbackFamilies[family].bind;
    this.dirty = initial.dirty;
    this.selectedStack = initial.selectedStack === null ? null : signed32(initial.selectedStack, 'Selected stack');
  }

  snapshot(): NativeHudInventoryState {
    return { family: this.family, bound: this.inventory !== null, dirty: this.dirty,
      selectedStack: this.selectedStack, events: this.events.map((event) => ({ ...event })) };
  }

  /** List widgets skip equal bindings; recipe and stack-stat bindings remove
   * and re-add even when the inventory is the same. Native AddListener revives
   * the same pointer in its original array position until purge occurs.
   */
  bind(inventory: NativeInventory | null, selectedStack: number | null = null): void {
    if (this.family === 'stack-stats') {
      if (selectedStack === null) throw new TypeError('Native stack-stat binding requires its index argument.');
      signed32(selectedStack, 'Selected stack');
    } else if (selectedStack !== null) throw new TypeError('Only the native stack-stat binding receives a stack index.');
    if (this.family === 'list' && inventory === this.inventory) return;
    this.inventory?.removeObserver(this);
    this.inventory = inventory;
    if (this.family === 'stack-stats') this.selectedStack = selectedStack;
    this.dirty = true;
    this.inventory?.addObserver(this);
    this.events.push({ event: 'bind', source: this.boundaries.supportedHudCallbackFamilies[this.family].bind });
  }

  onEvent(event: Extract<InventoryEvent, { kind: 'inventory' }>, inventory: NativeInventory): InventoryCallbackResult {
    return this.onNativeNotification(event.event, event.index, inventory);
  }

  /** Clear/destroy are original virtual notifications absent from today's
   * bounded stack kernel. The eventual lifecycle host must route them here.
   */
  onNativeNotification(event: NativeInventoryNotification, index: number, inventory: NativeInventory): InventoryCallbackResult {
    signed32(index, 'Inventory event stack index');
    if (inventory !== this.inventory) return { status: 'unsupported', reason: 'Listener was called with an inventory different from its actual native binding.' };
    this.events.push({ event, source: this.boundaries.supportedHudCallbackFamilies[this.family][event] });
    if (this.family === 'list') {
      if (event === 'destroy') {
        this.inventory?.removeObserver(this);
        this.inventory = null;
      }
      this.dirty = true;
      return { status: 'applied' };
    }
    if (this.family === 'recipe-stats') {
      this.dirty = true;
      // Native destruction clears this pointer without a RemoveListener call.
      if (event === 'destroy') this.inventory = null;
      return { status: 'applied' };
    }
    const selected = this.selectedStack!;
    if (event === 'create' && index <= selected) {
      this.selectedStack = (selected + 1) | 0;
      this.dirty = true;
    } else if (event === 'change' && index === selected) {
      this.dirty = true;
    } else if (event === 'delete') {
      if (index === selected) {
        this.inventory?.removeObserver(this);
        this.inventory = null;
        this.selectedStack = -1;
        this.dirty = true;
      } else if (index < selected) {
        this.selectedStack = (selected - 1) | 0;
        this.dirty = true;
      }
    } else if (event === 'clear' || event === 'destroy') {
      this.inventory?.removeObserver(this);
      this.inventory = null;
      this.selectedStack = -1;
      this.dirty = true;
    }
    return { status: 'applied' };
  }
}

/** Entity::ms_Player identity cache. Assigning None on OnPlayerChanged does
 * not initialize stats or player memory. GUIDs identify existing live entities;
 * attachment of all native Entity property wrappers remains the entity host's
 * responsibility, so this class never pretends to create a new player entity.
 */
export class NativeScriptPlayerIdentityCache {
  private cached: string | null = null;
  invalidate(): void { this.cached = null; }
  get(session: { getPlayerGuid20(): string | null } | null): string | null {
    if (this.cached === null) {
      if (!session) throw new Error('Original Entity::GetPlayer requires an existing native session.');
      this.cached = entityGuid(session.getPlayerGuid20());
    }
    return this.cached;
  }
  snapshot(): { readonly cachedPlayerGuid20: string | null; readonly source: 'Script:10032890' } {
    return { cachedPlayerGuid20: this.cached, source: 'Script:10032890' };
  }
}

export interface NativeGuiEntityPage {
  readonly id: string;
  readonly source: string;
  setEntity(entityGuid20: string | null, slot: number): InventoryCallbackResult;
}
export interface NativeGuiBindingRoot {
  readonly entitySlots: (string | null)[];
  readonly mainPage: NativeGuiEntityPage | null;
  readonly activePageIndex: number;
  readonly pages: readonly (NativeGuiEntityPage | null)[];
}

/** The original root stores the entity first, calls its persistent main page,
 * then reads/calls the active page. It does not broadcast to every HUD page.
 * The root is read again after the main callback so native reentrant changes
 * to active-page selection are visible. A callback failure is partial state.
 */
export function routeOriginalGuiEntityBinding(
  root: NativeGuiBindingRoot, guid20: string | null, slot: number,
): InventoryCallbackResult & { readonly partial?: boolean; readonly pageOrder?: readonly string[] } {
  entityGuid(guid20);
  signed32(slot, 'HUD entity slot');
  if (slot < 0 || slot >= 7 || root.entitySlots.length !== 7) throw new RangeError('Original HUD entity binding has seven slots.');
  root.entitySlots[slot] = guid20;
  const order: string[] = [];
  const main = root.mainPage;
  if (main !== null) {
    if (!main.id || !main.source) return { status: 'unsupported', reason: 'Native main HUD page identity or implementation source is unresolved.', partial: true, pageOrder: order };
    order.push(main.id);
    const result = main.setEntity(guid20, slot);
    if (result.status !== 'applied') return { ...result, partial: true, pageOrder: order };
  }
  const activeIndex = signed32(root.activePageIndex, 'Active HUD page index');
  if (activeIndex !== -1) {
    if (activeIndex < 0 || activeIndex >= root.pages.length) return { status: 'unsupported', reason: 'Original active HUD page pointer cannot be resolved.', partial: true, pageOrder: order };
    const active = root.pages[activeIndex];
    if (active !== null && active !== undefined) {
      if (!active.id || !active.source) return { status: 'unsupported', reason: 'Native active HUD page identity or implementation source is unresolved.', partial: true, pageOrder: order };
      order.push(active.id);
      const result = active.setEntity(guid20, slot);
      if (result.status !== 'applied') return { ...result, partial: true, pageOrder: order };
    }
  }
  return { status: 'applied', partial: false, pageOrder: order };
}

/** Observable original ordering only: invalidation precedes GUI2::UpdatePlayer.
 * Missing GUI root is a native no-op only when its actual absence is established
 * by the composed session. Unknown GUI state leaves the operation unsupported.
 */
export function applyOriginalPlayerChanged(
  cache: NativeScriptPlayerIdentityCache,
  session: { readonly playerGuid20: string | null; readonly gui:
    | { readonly status: 'known-absent'; readonly source: string }
    | { readonly status: 'present'; readonly root: NativeGuiBindingRoot }
    | { readonly status: 'unresolved'; readonly reason: string } },
): InventoryCallbackResult & { readonly partial: boolean; readonly nativeReturnValue?: 1 } {
  entityGuid(session.playerGuid20);
  cache.invalidate();
  if (session.gui.status === 'unresolved') return { status: 'unsupported', reason: session.gui.reason, partial: true };
  if (session.gui.status === 'known-absent') {
    if (!session.gui.source) return { status: 'unsupported', reason: 'Absent native GUI manager/root requires a source-derived absence.', partial: true };
    return { status: 'applied', partial: false, nativeReturnValue: 1 };
  }
  const result = routeOriginalGuiEntityBinding(session.gui.root, session.playerGuid20, 0);
  return result.status === 'applied' ? { status: 'applied', partial: false, nativeReturnValue: 1 }
    : { status: 'unsupported', reason: result.reason, partial: true };
}
