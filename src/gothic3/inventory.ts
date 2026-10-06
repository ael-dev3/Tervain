/** Intrinsic inventory state for the installed Gothic3 build.
 *
 * Source receipts: inventory/manifest.json. Property Enter/Exit callbacks on
 * the actual gCInventoryStack vtable inherit SharedBase hooks that return true
 * without effects. Inventory observers are a separate ordered runtime system.
 * An unresolved observer registry blocks mutation; [] explicitly asserts that
 * the caller's complete registry is empty. No physical ItemWorld is spawned by
 * CreateItems. Equipment plans require the entity/skeleton/stat host before
 * they can be applied; serialized Head/Body records retain their original IDs.
 */
import type { InitializedPlayerSeed, InitializedEquipment } from './initial-state';

export interface InventoryTemplate {
  readonly name: string;
  readonly guid20: string;
  readonly useType: number;
  readonly category: number;
  readonly permanent: boolean | null;
  readonly missionItem: boolean | null;
  readonly skillGuid20: string | null;
  readonly spellGuid20: string | null;
  readonly itemPropertySetPresent: boolean;
  readonly source: unknown;
}

export interface NativeInventoryStack {
  index: number;
  templateName: string;
  templateGuid20: string;
  amount: number; // Native signed int; arithmetic wraps at32bits.
  quality: number; // Native int bit pattern, not a quality rank.
  stackType: number;
  quickSlot: number;
  learned: boolean;
  activationCount: number;
  transactionAmount: number;
  sortIndex: number | null; // ApplyDefaults does not initialize this field.
  linkedSlot: number;
  physicalItemGuid20: string | null;
}

export interface NativeInventorySnapshot {
  readonly stacks: readonly Readonly<NativeInventoryStack>[];
  readonly equipment: readonly InitializedEquipment[];
  /** Complete source-resolved definitions needed to restore transferred items. */
  readonly templates?: readonly InventoryTemplate[];
  readonly observerRegistry: 'complete' | 'unresolved';
  readonly unresolvedEffects: readonly string[];
}

export type InventoryProperty = 'Type' | 'Quality' | 'Amount' | 'Learned' | 'ActivationCount';
export type InventoryEvent = (
  | { readonly kind: 'property'; readonly phase: 'enter' | 'exit'; readonly index: number;
      readonly property: InventoryProperty; readonly value: number | boolean;
      readonly intrinsicCallback: 'SharedBase-return-true'; readonly evidence: string }
  | { readonly kind: 'inventory'; readonly event: 'create' | 'change' | 'delete';
      readonly index: number; readonly stack: Readonly<NativeInventoryStack>;
      readonly dispatch: 'stack-list-listener' | 'NotifyListeners'; readonly evidence: string }
  | { readonly kind: 'write'; readonly index: number; readonly field: 'amount' | 'quickSlot';
      readonly before: number; readonly after: number; readonly evidence: string }
  | { readonly kind: 'dispose'; readonly index: number; readonly templateGuid20: string;
      readonly evidence: 'Game:201cf350' }) & {
        /** TS receipt order across inventories; not an original game field. */
        readonly sequence?: number;
      };

export type InventoryCallbackResult = { readonly status: 'applied' }
  | { readonly status: 'unsupported'; readonly reason: string };
export interface InventoryObserver {
  /** Native runtime registration identity, including source of its implementation. */
  readonly id: string;
  readonly source: string;
  onEvent(event: Extract<InventoryEvent, { kind: 'inventory' }>, inventory: NativeInventory): InventoryCallbackResult;
}
export interface InventoryOptions {
  /** null/omission means the original runtime registration state is unresolved. */
  readonly observers?: readonly InventoryObserver[] | null;
  readonly equipment?: readonly InitializedEquipment[];
}

function inventoryStackRecord(value: unknown): value is NativeInventoryStack {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const stack = value as Record<string, unknown>;
  return Number.isInteger(stack.index) && (stack.index as number) >= 0 &&
    typeof stack.templateName === 'string' && stack.templateName.length > 0 &&
    typeof stack.templateGuid20 === 'string' && GUID20.test(stack.templateGuid20) &&
    Number.isInteger(stack.amount) && (stack.amount as number) > 0 && (stack.amount as number) <= 0x7fffffff &&
    Number.isInteger(stack.quality) && (stack.quality as number) >= -0x80000000 && (stack.quality as number) <= 0x7fffffff &&
    Number.isInteger(stack.stackType) && (stack.stackType as number) >= -0x80000000 && (stack.stackType as number) <= 0x7fffffff &&
    Number.isInteger(stack.quickSlot) && (stack.quickSlot as number) >= -0x80000000 && (stack.quickSlot as number) <= 0x7fffffff &&
    typeof stack.learned === 'boolean' &&
    Number.isInteger(stack.activationCount) && (stack.activationCount as number) >= -0x80000000 && (stack.activationCount as number) <= 0x7fffffff &&
    Number.isInteger(stack.transactionAmount) && (stack.transactionAmount as number) >= -0x80000000 && (stack.transactionAmount as number) <= 0x7fffffff &&
    (stack.sortIndex === null || (Number.isInteger(stack.sortIndex) && (stack.sortIndex as number) >= -0x80000000 && (stack.sortIndex as number) <= 0x7fffffff)) &&
    Number.isInteger(stack.linkedSlot) && (stack.linkedSlot as number) >= -0x80000000 && (stack.linkedSlot as number) <= 0x7fffffff &&
    (stack.physicalItemGuid20 === null || (typeof stack.physicalItemGuid20 === 'string' && GUID20.test(stack.physicalItemGuid20)));
}
export interface NativeInventoryTransfer {
  readonly donorEntityGuid20: string;
  readonly recipientEntityGuid20: string;
  readonly templateGuid20: string;
  readonly amount: number;
}
export interface InventoryTransferContext {
  readonly donorEntityGuid20: string;
  readonly recipientEntityGuid20: string;
  readonly recipientIsPlayer: boolean;
  /** Native NotifyQuestManager can be a proven no-op (absent/inactive world or
   * absent manager), or requires the actual OnReceiveItem implementation. */
  readonly questNotification:
    | { readonly status: 'known-absent'; readonly source: string }
    | { readonly status: 'supported'; readonly source: string; notify(transfer: NativeInventoryTransfer): InventoryCallbackResult }
    | { readonly status: 'unresolved'; readonly reason: string };
}
export type InventoryResult<T> =
  | { readonly status: 'applied'; readonly value: T; readonly events: readonly InventoryEvent[] }
  | { readonly status: 'rejected'; readonly value: T; readonly reason: string; readonly events: readonly InventoryEvent[] }
  | { readonly status: 'unsupported'; readonly reason: string; readonly partial: boolean; readonly events: readonly InventoryEvent[] };
export type InventoryCapability = { readonly status: 'supported' }
  | { readonly status: 'unsupported'; readonly reason: string };

const GUID20 = /^[0-9a-f]{40}$/;
let inventoryReceiptSequence = 0;
function int32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) throw new RangeError(name + ' must be a native signed32bit integer.');
  return value;
}
function uint32(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError(name + ' must be a native unsigned32bit integer.');
  return value;
}
function guid20(value: string): string {
  if (!GUID20.test(value)) throw new TypeError('Expected an original lowercase20byte template GUID.');
  return value;
}
function validInventoryTemplate(value: unknown): value is InventoryTemplate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const template = value as Record<string, unknown>;
  return typeof template.name === 'string' && template.name.length > 0 && typeof template.guid20 === 'string' && GUID20.test(template.guid20) &&
    Number.isInteger(template.useType) && Number.isInteger(template.category) &&
    (template.permanent === null || typeof template.permanent === 'boolean') &&
    (template.missionItem === null || typeof template.missionItem === 'boolean') &&
    (template.skillGuid20 === null || (typeof template.skillGuid20 === 'string' && GUID20.test(template.skillGuid20))) &&
    (template.spellGuid20 === null || (typeof template.spellGuid20 === 'string' && GUID20.test(template.spellGuid20))) &&
    typeof template.itemPropertySetPresent === 'boolean' && template.source !== undefined;
}

function sameInventoryTemplateSource(left: unknown, right: unknown): boolean {
  const source = (value: unknown): { path: string; sha256: string; archive?: unknown } | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return typeof record.path === 'string' && record.path.length > 0 &&
      typeof record.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(record.sha256)
      ? { path: record.path, sha256: record.sha256.toLowerCase(), archive: record.archive } : null;
  };
  const a = source(left), b = source(right);
  if (!a || !b) return JSON.stringify(left) === JSON.stringify(right);
  // The Hero seed retains full catalog metadata; NPC templates retain a
  // compact receipt. Identical path/hash identifies the same source bytes.
  // Archive identity must also agree whenever both receipts declare it.
  return a.path === b.path && a.sha256 === b.sha256 &&
    (a.archive === undefined || b.archive === undefined || a.archive === b.archive);
}
function enumValue(value: unknown, fallback: number): number {
  if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'number') return int32(value.value, 'native enum');
  return fallback;
}
function proxyGuid(value: unknown): string | null {
  if (value && typeof value === 'object' && 'present' in value && value.present === true && 'rawGuid20' in value && typeof value.rawGuid20 === 'string') return guid20(value.rawGuid20);
  return null;
}

/** Adapts the source-pinned unique-live definitions already in the player seed.
 * An absent item/interaction set has the native GetCategory/GetUseType value0;
 * Permanent/MissionItem stay null when the item set is absent. */
export function inventoryTemplatesFromSeed(seed: InitializedPlayerSeed): InventoryTemplate[] {
  return Object.values(seed.templateDefinitions).map((unknownDefinition) => {
    if (!unknownDefinition || typeof unknownDefinition !== 'object') throw new TypeError('Invalid native template definition.');
    const definition = unknownDefinition as Record<string, unknown>;
    if (typeof definition.name !== 'string' || typeof definition.guid !== 'string' ||
        !Array.isArray(definition.propertySetNames)) throw new TypeError('Incomplete source template definition.');
    const item = definition.item && typeof definition.item === 'object' ? definition.item as Record<string, unknown> : {};
    const present = definition.propertySetNames.includes('gCItem_PS');
    if (present && (typeof item.Permanent !== 'boolean' || typeof item.MissionItem !== 'boolean')) throw new TypeError('Item template is missing original boolean fields.');
    return { name: definition.name, guid20: guid20(definition.guid),
      useType: enumValue(definition.useType, 0), category: enumValue(item.Category, 0),
      permanent: present ? item.Permanent as boolean : null,
      missionItem: present ? item.MissionItem as boolean : null,
      skillGuid20: proxyGuid(item.Skill), spellGuid20: proxyGuid(item.Spell),
      itemPropertySetPresent: present, source: structuredClone(definition.source) };
  });
}

class CallbackFailure extends Error {}
interface ObserverRegistration { observer: InventoryObserver; active: boolean }

/** A complete TS registry is caller supplied. No unspecified native observer is
 * treated as an empty callback. A callback failure can occur after a native
 * write; results report partial state and block subsequent operations. */
export class NativeInventory {
  private readonly definitions = new Map<string, InventoryTemplate>();
  private readonly stacks: NativeInventoryStack[] = [];
  private readonly equipment: InitializedEquipment[];
  private readonly observers: ObserverRegistration[] = [];
  private readonly registryComplete: boolean;
  private readonly journal: InventoryEvent[] = [];
  private readonly unresolvedEffects: string[] = [];

  constructor(templates: readonly InventoryTemplate[], options: InventoryOptions = {}) {
    for (const template of templates) {
      guid20(template.guid20);
      int32(template.useType, 'UseType'); int32(template.category, 'Category');
      if (this.definitions.has(template.guid20)) throw new TypeError('Duplicate resolved template GUID.');
      this.definitions.set(template.guid20, structuredClone(template));
    }
    this.equipment = structuredClone([...(options.equipment ?? [])]);
    this.registryComplete = options.observers != null;
    for (const observer of options.observers ?? []) this.addObserver(observer);
  }

  /** Rehydrate a saved intrinsic inventory against freshly source-resolved
   * templates. This restores stack values only; it does not replay callbacks,
   * create ItemWorld entities or claim native listener registration. */
  static fromSnapshot(templates: readonly InventoryTemplate[], snapshot: NativeInventorySnapshot,
    options: InventoryOptions): NativeInventory {
    if (!snapshot || snapshot.observerRegistry !== 'complete' || !Array.isArray(snapshot.stacks) ||
        !Array.isArray(snapshot.equipment) || !Array.isArray(snapshot.unresolvedEffects) ||
        snapshot.unresolvedEffects.length !== 0 || options.observers == null) {
      throw new TypeError('Restoring inventory needs intrinsic state without unresolved effects and an explicit observer registry.');
    }
    const inventory = new NativeInventory(templates, { ...options, equipment: snapshot.equipment });
    if (snapshot.templates !== undefined) {
      if (!Array.isArray(snapshot.templates) || !snapshot.templates.every(validInventoryTemplate)) {
        throw new TypeError('Saved inventory template registry is invalid.');
      }
      for (const template of snapshot.templates) inventory.registerTemplate(template);
    }
    for (const [index, value] of snapshot.stacks.entries()) {
      if (!inventoryStackRecord(value) || value.index !== index) throw new TypeError('Saved inventory stack record is invalid or out of order.');
      const template = inventory.definitions.get(value.templateGuid20);
      if (!template || template.name !== value.templateName) throw new Error('Saved inventory stack does not match a source-resolved item template.');
      inventory.stacks.push(structuredClone(value));
    }
    return inventory;
  }

  capability(): InventoryCapability {
    if (!this.registryComplete) return { status: 'unsupported', reason: 'Native inventory observer registration is unresolved. Supply a complete ordered registry.' };
    if (this.unresolvedEffects.length) return { status: 'unsupported', reason: 'Earlier inventory callback has unresolved effects: ' + this.unresolvedEffects.join('; ') };
    return { status: 'supported' };
  }
  snapshot(): NativeInventorySnapshot {
    return { stacks: structuredClone(this.stacks), equipment: structuredClone(this.equipment), templates: [...this.definitions.values()].map((template) => structuredClone(template)),
      observerRegistry: this.registryComplete ? 'complete' : 'unresolved', unresolvedEffects: [...this.unresolvedEffects] };
  }
  getStack(index: number): Readonly<NativeInventoryStack> | null {
    const stack = this.stacks[index];
    return Number.isInteger(index) && index >= 0 && stack ? structuredClone(stack) : null;
  }
  template(guid: string): InventoryTemplate | null { return this.definitions.get(guid) ? structuredClone(this.definitions.get(guid)!) : null; }
  templateByName(name: string): InventoryTemplate | null {
    const matches = [...this.definitions.values()].filter((template) => template.name === name);
    return matches.length === 1 ? structuredClone(matches[0]!) : null;
  }
  /** Capability for the browser potion adapter, separate from native item-use
   * and inventory listener execution. Equipped or physical stacks need those
   * original effects, so this adapter handles only an unlinked intrinsic stack
   * with the explicitly empty browser observer registry. Equipment identities
   * are template/item GUIDs, not stack indices, and remain untouched. */
  canConsumeBrowserStack(index: number, amount: number): InventoryCapability {
    const capability = this.capability();
    if (capability.status !== 'supported') return capability;
    const stack = this.stacks[index];
    if (!Number.isInteger(index) || index < 0 || !stack || !Number.isInteger(amount) || amount < 1 || amount > stack.amount) {
      return { status: 'unsupported', reason: 'Browser item use needs a present stack with the requested amount.' };
    }
    if (this.observers.length || stack.linkedSlot !== 0 || stack.physicalItemGuid20 !== null ||
        this.equipment.some((slot) => slot.templateGuid20 === stack.templateGuid20)) {
      return { status: 'unsupported', reason: 'Browser item consumption cannot execute native observers or equipped/physical item effects.' };
    }
    return { status: 'supported' };
  }
  /** Browser-owned reduction after a source-defined potion modifier. This
   * does not claim PS_QuickUse, native deletion hooks or ItemWorld disposal. */
  consumeBrowserStack(index: number, amount: number): InventoryResult<number> {
    const capability = this.canConsumeBrowserStack(index, amount);
    if (capability.status !== 'supported') return { ...capability, partial: false, events: [] };
    const stack = this.stacks[index]!;
    stack.amount -= amount;
    const remaining = stack.amount;
    if (remaining === 0) {
      this.stacks.splice(index, 1);
      for (let cursor = index; cursor < this.stacks.length; cursor++) this.stacks[cursor]!.index = cursor;
    }
    return { status: 'applied', value: remaining, events: [] };
  }
  hasTemplate(guid: string): boolean { return this.definitions.has(guid); }
  /** Add an already source-resolved template identity to this inventory's
   * browser registry, as TransferItemsTo carries the donor stack's template. */
  registerTemplate(template: InventoryTemplate): void {
    if (!validInventoryTemplate(template)) throw new TypeError('Inventory template is not a complete source-resolved record.');
    guid20(template.guid20); int32(template.useType, 'UseType'); int32(template.category, 'Category');
    const existing = this.definitions.get(template.guid20);
    if (existing && (existing.name !== template.name || existing.useType !== template.useType || existing.category !== template.category ||
        existing.permanent !== template.permanent || existing.missionItem !== template.missionItem ||
        existing.skillGuid20 !== template.skillGuid20 || existing.spellGuid20 !== template.spellGuid20 ||
        existing.itemPropertySetPresent !== template.itemPropertySetPresent || !sameInventoryTemplateSource(existing.source, template.source))) {
      throw new Error('Inventory template GUID resolves to conflicting source properties.');
    }
    if (!existing) this.definitions.set(template.guid20, structuredClone(template));
  }
  /** Native AddListener reactivates an existing identity, preserving order. */
  addObserver(observer: InventoryObserver): void {
    if (!observer.id || !observer.source) throw new TypeError('Observer identity and source are required.');
    const existing = this.observers.find((entry) => entry.observer === observer);
    if (existing) existing.active = true;
    else this.observers.push({ observer, active: true });
  }
  /** Removal during dispatch deactivates immediately; purge follows dispatch. */
  removeObserver(observer: InventoryObserver): void {
    const entry = this.observers.find((candidate) => candidate.observer === observer);
    if (entry) entry.active = false;
  }

  private run<T>(operation: () => { value: T; rejected?: string }): InventoryResult<T> {
    const start = this.journal.length;
    const capability = this.capability();
    if (capability.status === 'unsupported') return { ...capability, partial: false, events: [] };
    try {
      const result = operation();
      return result.rejected ? { status: 'rejected', value: result.value, reason: result.rejected, events: this.journal.slice(start) }
        : { status: 'applied', value: result.value, events: this.journal.slice(start) };
    } catch (error) {
      if (!(error instanceof CallbackFailure)) throw error;
      return { status: 'unsupported', reason: error.message, partial: this.journal.length > start, events: this.journal.slice(start) };
    }
  }
  private record<T extends InventoryEvent>(event: T): T {
    const stored = { ...event, sequence: ++inventoryReceiptSequence };
    this.journal.push(stored); return stored;
  }
  private property(stack: NativeInventoryStack, property: InventoryProperty, value: number | boolean, write: () => void, evidence: string): void {
    const fields: Record<InventoryProperty, keyof NativeInventoryStack> = { Type: 'stackType', Quality: 'quality', Amount: 'amount', Learned: 'learned', ActivationCount: 'activationCount' };
    const before = stack[fields[property]] as number | boolean;
    this.record({ kind: 'property', phase: 'enter', index: stack.index, property, value: before,
      intrinsicCallback: 'SharedBase-return-true', evidence });
    write();
    this.record({ kind: 'property', phase: 'exit', index: stack.index, property, value,
      intrinsicCallback: 'SharedBase-return-true', evidence });
  }
  private notify(event: 'create' | 'change' | 'delete', stack: NativeInventoryStack, dispatch: 'stack-list-listener' | 'NotifyListeners', evidence: string): void {
    const record: Extract<InventoryEvent, { kind: 'inventory' }> = { kind: 'inventory', event, index: stack.index,
      stack: structuredClone(stack), dispatch, evidence };
    const stored = this.record(record);
    // Native dispatcher captures the initial count, reads active state per entry,
    // and permits reentrant mutation. New registrations wait until next dispatch.
    const count = this.observers.length;
    try {
      for (let i = 0; i < count; i++) {
        const entry = this.observers[i];
        if (!entry) {
          const reason = 'Reentrant listener purge invalidated the outer native dispatch count; pointer lifetime is unresolved.';
          this.unresolvedEffects.push(reason); throw new CallbackFailure(reason);
        }
        if (!entry.active) continue;
        let result: InventoryCallbackResult;
        try { result = entry.observer.onEvent({ ...stored, stack: structuredClone(stack) }, this); }
        catch (error) { result = { status: 'unsupported', reason: error instanceof Error ? error.message : String(error) }; }
        if (result.status === 'unsupported') {
          const reason = entry.observer.id + ': ' + result.reason;
          this.unresolvedEffects.push(reason);
          throw new CallbackFailure(reason);
        }
      }
    } finally {
      for (let i = this.observers.length - 1; i >= 0; i--) if (this.observers[i]?.active === false) this.observers.splice(i, 1);
    }
  }

  /** Native gEInventoryFindQuality0=any,1=exact,2=highest,3=lowest.
   * Highest/lowest use signed comparison and choose the last tied match. */
  findStackIndex(templateGuid20: string, mode: 0 | 1 | 2 | 3 = 0, quality = 0, after = -1): number {
    guid20(templateGuid20); int32(after, 'after'); uint32(quality, 'quality');
    if (after < -1 || ![0, 1, 2, 3].includes(mode)) throw new RangeError('Unsupported native find-stack operands.');
    let selected = -1, best = mode === 3 ? 0x7fffffff : 0;
    for (let i = after + 1; i < this.stacks.length; i++) {
      const stack = this.stacks[i];
      if (!stack || stack.templateGuid20 !== templateGuid20) continue;
      if (mode === 0 || (mode === 1 && stack.quality === (quality | 0))) return i;
      if ((mode === 2 && best <= stack.quality) || (mode === 3 && stack.quality <= best)) { best = stack.quality; selected = i; }
    }
    return selected;
  }
  private create(template: InventoryTemplate | null, quality: number, amount: number, type: number): number {
    if (!template || amount < 1) return -1;
    for (const stack of this.stacks) {
      if (stack.templateGuid20 !== template.guid20 || stack.quality !== quality || stack.stackType !== type) continue;
      const slots = nativeInventoryEquipSlots(template.useType);
      const mustSplit = slots.alternative !== 0 || (slots.primary === 14 && stack.linkedSlot === 1);
      if (stack.linkedSlot !== 0 && mustSplit) continue;
      const before = stack.amount;
      stack.amount = (stack.amount + amount) | 0;
      this.record({ kind: 'write', index: stack.index, field: 'amount', before, after: stack.amount, evidence: 'Game:201cfc00' });
      const resultIndex = stack.index;
      if (this.observers.length) this.notify('change', stack, 'stack-list-listener', 'Game:201cfc00');
      return resultIndex;
    }
    const stack: NativeInventoryStack = { index: this.stacks.length, templateName: template.name, templateGuid20: template.guid20,
      amount: 1, quality: 0, stackType: 0, quickSlot: -1, learned: false, activationCount: 0,
      transactionAmount: 0, sortIndex: null, linkedSlot: 0, physicalItemGuid20: null };
    this.property(stack, 'Type', type, () => { stack.stackType = type; }, 'Game:201cfc00');
    this.property(stack, 'Quality', quality, () => { stack.quality = quality; }, 'Game:201cfc00');
    this.property(stack, 'Amount', amount, () => { stack.amount = amount; }, 'Game:201cfc00');
    this.stacks.push(stack);
    const resultIndex = stack.index;
    if (this.observers.length) this.notify('create', stack, 'stack-list-listener', 'Game:201cfc00');
    return resultIndex;
  }
  /** Adds quantities, unlike AssureItems. Quality is an unsigned argument stored
   * as a signed int bit pattern. Amount is the wrapper's original signed int. */
  createItems(templateGuid20: string, quality: number, amount: number, type = 0): InventoryResult<number> {
    guid20(templateGuid20); uint32(quality, 'quality'); int32(amount, 'amount'); int32(type, 'stack type');
    return this.run(() => { const index = this.create(this.definitions.get(templateGuid20) ?? null, quality | 0, amount, type);
      return { value: index, ...(index < 0 ? { rejected: 'Native CreateItems rejects unresolved template or nonpositive amount.' } : {}) }; });
  }
  private assure(templateGuid20: string, quality: number, minimum: number): number {
    if (!this.definitions.has(templateGuid20)) return -1;
    let total = 0, selected = -1;
    for (const stack of this.stacks) {
      if (stack.templateGuid20 !== templateGuid20 || stack.quality !== quality) continue;
      if (selected < 0 || stack.linkedSlot === 0) selected = stack.index;
      total = (total + stack.amount) >>> 0;
    }
    if (total < (minimum >>> 0)) return this.create(this.definitions.get(templateGuid20)!, quality, ((minimum >>> 0) - total) | 0, 0);
    return selected;
  }
  assureItems(templateGuid20: string, quality: number, minimum: number): InventoryResult<number> {
    guid20(templateGuid20); uint32(quality, 'quality'); int32(minimum, 'minimum');
    return this.run(() => { const index = this.assure(templateGuid20, quality | 0, minimum);
      return { value: index, ...(index < 0 ? { rejected: 'Native AssureItems returned no stack.' } : {}) }; });
  }
  private hotkey(index: number, key: number): boolean {
    if (!Number.isInteger(index) || index < 0 || !this.stacks[index]) return false;
    if (key >= 0) {
      const previous = this.stacks.find((stack) => stack.quickSlot === key);
      if (previous) {
        this.record({ kind: 'write', index: previous.index, field: 'quickSlot', before: previous.quickSlot, after: -1, evidence: 'Game:201cf7a0' });
        previous.quickSlot = -1;
        if (this.observers.length) this.notify('change', previous, 'stack-list-listener', 'Game:201cf7a0');
      }
    }
    // Native AssignStackQuickSlot reads the target slot AFTER notifying the old
    // holder, so a supported callback can have changed which stack is at index.
    const target = this.stacks[index];
    if (!target) {
      const reason = 'Quickslot callback removed the target index; native pointer lifetime is unresolved.';
      this.unresolvedEffects.push(reason); throw new CallbackFailure(reason);
    }
    this.record({ kind: 'write', index: target.index, field: 'quickSlot', before: target.quickSlot, after: key, evidence: 'Game:201cf7a0' });
    target.quickSlot = key;
    if (this.observers.length) this.notify('change', target, 'stack-list-listener', 'Game:201cf7a0');
    return true;
  }
  setStackHotKey(index: number, unsignedKey: number): InventoryResult<boolean> {
    uint32(unsignedKey, 'hotkey');
    return this.run(() => { const value = this.hotkey(index, unsignedKey | 0);
      return { value, ...(!value ? { rejected: 'Native quickslot assignment rejects invalid stack index.' } : {}) }; });
  }
  assureItemsEx(templateGuid20: string, quality: number, minimum: number, key: number, learned: boolean): InventoryResult<number> {
    guid20(templateGuid20); uint32(quality, 'quality'); int32(minimum, 'minimum'); int32(key, 'key');
    if (typeof learned !== 'boolean') throw new TypeError('Learned argument must be a native bool.');
    return this.run(() => {
      const index = this.assure(templateGuid20, quality | 0, minimum);
      if (index < 0) return { value: index, rejected: 'Native AssureItemsEx received no stack.' };
      this.hotkey(index, key < 0 ? -1 : key);
      if (learned) {
        const stack = this.stacks[index];
        if (!stack) {
          const reason = 'AssureItemsEx callback removed its stack index; native setter lifetime is unresolved.';
          this.unresolvedEffects.push(reason); throw new CallbackFailure(reason);
        }
        this.property(stack, 'Learned', true, () => { stack.learned = true; }, 'Script:10004890/Game:20014849');
      }
      return { value: index };
    });
  }
  learnStack(index: number): InventoryResult<boolean> {
    return this.run(() => {
      const stack = this.stacks[index];
      if (!Number.isInteger(index) || index < 0 || !stack) return { value: false, rejected: 'Native LearnStack rejects invalid stack index.' };
      if (!stack.learned) {
        this.property(stack, 'Learned', true, () => { stack.learned = true; }, 'Game:200203e2');
        this.notify('change', stack, 'NotifyListeners', 'Game:200203e2');
      }
      return { value: true };
    });
  }
  /** Direct native stack setter, distinct from LearnStack: property hooks only,
   * with no explicit inventory event1. Enables a known observer implementation
   * to reproduce an actual source setter instead of guessing callback effects. */
  setLearned(index: number, learned: boolean): InventoryResult<boolean> {
    if (typeof learned !== 'boolean') throw new TypeError('Learned must be a native bool.');
    return this.run(() => {
      const stack = this.stacks[index];
      if (!Number.isInteger(index) || index < 0 || !stack) return { value: false, rejected: 'Cannot set a missing stack property.' };
      this.property(stack, 'Learned', learned, () => { stack.learned = learned; }, 'Game:20014849');
      return { value: true };
    });
  }
  /** A skill is found through the permanent item's Skill proxy, not by comparing
   * the item template name to the requested skill template. Caller resolves the
   * original skill template before providing its GUID. */
  findSkillStackIndex(skillGuid20: string): number { return this.findAbilityStack(skillGuid20, 'skillGuid20'); }
  findSpellStackIndex(spellGuid20: string): number { return this.findAbilityStack(spellGuid20, 'spellGuid20'); }
  private findAbilityStack(guid: string, field: 'skillGuid20' | 'spellGuid20'): number {
    guid20(guid);
    return this.stacks.findIndex((stack) => { const definition = this.definitions.get(stack.templateGuid20);
      return definition?.itemPropertySetPresent && definition.permanent === true && definition[field] === guid; });
  }
  learnSkill(skillGuid20: string): InventoryResult<boolean> { return this.learnStack(this.findSkillStackIndex(skillGuid20)); }
  learnSpell(spellGuid20: string): InventoryResult<boolean> { return this.learnStack(this.findSpellStackIndex(spellGuid20)); }
  activateSkill(skillGuid20: string): InventoryResult<boolean> {
    const index = this.findSkillStackIndex(skillGuid20);
    return this.run(() => {
      const stack = this.stacks[index];
      if (!stack) return { value: false, rejected: 'Native ActivateSkill found no permanent skill item stack.' };
      const after = (stack.activationCount + 1) | 0;
      this.property(stack, 'ActivationCount', after, () => { stack.activationCount = after; }, 'Game:20014c6d');
      return { value: true };
    });
  }

  /** Executable ordinary unlinked-stack branch of TransferItemsTo. This is the
   * inventory primitive used by Info Give; native GUI messages remain its host's
   * responsibility. Amount is NOT clamped here: only Give clamps a PLAYER donor.
   * Linked stacks need original physical unlink effects. Mission-item transfers
   * to nonplayers include a peculiar target-stack0 fallthrough and special-name
   * exceptions in the native body; that branch is explicitly unsupported. */
  transferItemsTo(target: NativeInventory, index: number, amount: number, context: InventoryTransferContext, type = 0): InventoryResult<boolean> {
    int32(amount, 'transfer amount'); int32(type, 'transfer stack type');
    guid20(context.donorEntityGuid20); guid20(context.recipientEntityGuid20);
    const donorCapability = this.capability(), targetCapability = target.capability();
    const unsupported = (reason: string): InventoryResult<boolean> => ({ status: 'unsupported', reason, partial: false, events: [] });
    if (donorCapability.status === 'unsupported') return unsupported(donorCapability.reason);
    if (targetCapability.status === 'unsupported') return unsupported(targetCapability.reason);
    const source = this.stacks[index];
    if (!Number.isInteger(index) || index < 0 || !source || amount < 1)
      return { status: 'rejected', value: false, reason: 'Native TransferItemsTo rejects missing stack or nonpositive amount.', events: [] };
    if (source.linkedSlot !== 0) return unsupported('Physical UnLinkFromSlot and equipped item effects are required for a linked source stack.');
    const definition = this.definitions.get(source.templateGuid20)!;
    if ((definition.missionItem !== false) && !context.recipientIsPlayer)
      return unsupported('Native mission/absent-item-property transfer to a nonplayer requires its special-name and stack0 branch.');
    target.registerTemplate(definition);
    if (context.questNotification.status === 'unresolved') return unsupported(context.questNotification.reason);
    if (!context.questNotification.source) return unsupported('Quest notification/no-op source is required.');
    const sourceStart = this.journal.length, targetStart = target.journal.length;
    const result = this.run(() => {
      const targetIndex = target.create(target.definitions.get(source.templateGuid20)!, source.quality, amount, type);
      const received = target.stacks[targetIndex];
      if (!received) return { value: false, rejected: 'Native TransferItemsTo could not create recipient items.' };
      // Keep the original stack object across receiver callbacks, as native code
      // keeps ESI. A disposed/replaced source pointer would be unsafe natively.
      if (this.stacks[index] !== source) {
        const reason = 'Receiver callback changed the source stack identity; native pointer lifetime cannot be reproduced safely.';
        this.unresolvedEffects.push(reason); throw new CallbackFailure(reason);
      }
      const before = source.amount;
      source.amount = (source.amount - amount) | 0;
      this.record({ kind: 'write', index, field: 'amount', before, after: source.amount, evidence: 'Game:201afe30' });
      const sourceType = source.stackType;
      if (source.amount < 1) {
        if (this.observers.length) this.notify('delete', source, 'stack-list-listener', 'Game:201cf350');
        if (this.stacks[index] !== source) {
          const reason = 'Delete callback changed the live source slot; native deletion lifetime is unresolved.';
          this.unresolvedEffects.push(reason); throw new CallbackFailure(reason);
        }
        this.record({ kind: 'dispose', index, templateGuid20: source.templateGuid20, evidence: 'Game:201cf350' });
        this.stacks.splice(index, 1);
        for (let i = index; i < this.stacks.length; i++) this.stacks[i]!.index = i;
      }
      if (received.stackType !== 2 && sourceType !== 2 && context.questNotification.status === 'supported') {
        let callback: InventoryCallbackResult;
        try { callback = context.questNotification.notify({ donorEntityGuid20: context.donorEntityGuid20,
          recipientEntityGuid20: context.recipientEntityGuid20, templateGuid20: source.templateGuid20, amount }); }
        catch (error) { callback = { status: 'unsupported', reason: error instanceof Error ? error.message : String(error) }; }
        if (callback.status === 'unsupported') { this.unresolvedEffects.push(callback.reason); throw new CallbackFailure(callback.reason); }
      }
      return { value: true };
    });
    // Both inventories may have been written before a receiver callback fails.
    if (result.status === 'unsupported') return this.transferFailureResult(target, sourceStart, targetStart);
    return { ...result, events: this.transferEvents(target, sourceStart, targetStart) };
  }
  private transferEvents(target: NativeInventory, sourceStart: number, targetStart: number): InventoryEvent[] {
    return (target === this ? this.journal.slice(sourceStart) : [...target.journal.slice(targetStart), ...this.journal.slice(sourceStart)])
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }
  private transferFailureResult(target: NativeInventory, sourceStart: number, targetStart: number): InventoryResult<boolean> {
    const events = this.transferEvents(target, sourceStart, targetStart);
    const reason = [...target.unresolvedEffects, ...this.unresolvedEffects].join('; ') || 'Native transfer callback could not complete.';
    if (!this.unresolvedEffects.includes(reason)) this.unresolvedEffects.push(reason);
    return { status: 'unsupported', reason, partial: events.length > 0, events };
  }

  /** Decision-only source port. Applying these operations requires the original
   * LinkToSlot/UnLinkFromSlot entity, skeleton, attribute and skill effects. */
  planEquipStack(index: number): InventoryResult<InventoryEquipPlan | null> {
    return this.run<InventoryEquipPlan | null>(() => {
      const stack = this.stacks[index];
      if (!Number.isInteger(index) || index < 0 || !stack) return { value: null, rejected: 'Native EquipStack rejects invalid stack index.' };
      const definition = this.definitions.get(stack.templateGuid20)!;
      if (definition.useType === 0) return { value: null, rejected: 'Native EquipStack rejects UseType0.' };
      const { primary, alternative } = nativeInventoryEquipSlots(definition.useType);
      if ((stack.linkedSlot !== 0 && (stack.linkedSlot === primary || stack.linkedSlot === alternative)) || primary === 0)
        return { value: { index, unlinks: [], link: null, nativeOuterReturn: true, applied: false, evidence: 'Game:2001705d' } };
      const findSlot = (slot: number) => this.stacks.find((candidate) => candidate.linkedSlot === slot);
      const right = findSlot(1), primaryOccupied = findSlot(primary);
      const two1H = right != null && this.definitions.get(right.templateGuid20)?.useType === 2 && definition.useType === 2;
      const slot = (primaryOccupied || two1H) && alternative !== 0 && !findSlot(alternative) ? alternative : primary;
      const unlinks: number[] = [];
      if (slot === 2 || slot === 5) {
        unlinks.push(2, 5);
        if (right && [3, 12, 51, 52].includes(this.definitions.get(right.templateGuid20)!.useType)) unlinks.push(1);
        else return { value: { index, unlinks, link: { index, slot, applyStats: true }, nativeOuterReturn: true, applied: false, evidence: 'Game:2001705d' } };
      } else unlinks.push(slot);
      return { value: { index, unlinks, link: { index, slot, applyStats: true }, nativeOuterReturn: true, applied: false, evidence: 'Game:2001705d' } };
    });
  }
}

export interface InventoryEquipPlan {
  readonly index: number;
  readonly unlinks: readonly number[];
  readonly link: { readonly index: number; readonly slot: number; readonly applyStats: true } | null;
  /** Native EquipStack returns true after calling LinkStackToSlot regardless of its bool. */
  readonly nativeOuterReturn: true;
  readonly applied: false;
  readonly evidence: 'Game:2001705d';
}
export interface NativeGiveTransferPlan {
  readonly donor: NativeInventory;
  readonly recipient: NativeInventory;
  readonly sourceStackIndex: number;
  readonly transferAmount: number;
  readonly templateGuid20: string;
  readonly evidence: readonly ['Game:200060b4', 'Game:20033e01'];
  /** Info Give's localized Given/Taken GUI messages still require its host. */
  readonly gameMessages: 'host-required-after-successful-transfer';
}
/** Source-faithful template overload of gCInfo_PS::Give: first ANY-quality
 * matching stack, with no assurance or item creation. Only a PLAYER donor is
 * clamped to that stack's unsigned amount. The Script_Game Give command uses a
 * separate AssureItems-then-index overload below. */
export function planNativeInventoryGiveTransfer(donor: NativeInventory | null, recipient: NativeInventory | null,
  templateGuid20: string, unsignedAmount: number, donorIsPlayer: boolean): InventoryResult<NativeGiveTransferPlan | null> {
  guid20(templateGuid20); uint32(unsignedAmount, 'Give amount');
  if (!donor || !recipient) return { status: 'rejected', value: null, reason: 'Native Give requires source and destination inventories.', events: [] };
  const sourceStackIndex = donor.findStackIndex(templateGuid20, 0, 0, -1);
  const stack = donor.getStack(sourceStackIndex);
  if (!stack) return { status: 'rejected', value: null, reason: 'Native Give requires an existing donor template stack.', events: [] };
  const requested = donorIsPlayer ? Math.min(unsignedAmount, stack.amount >>> 0) : unsignedAmount;
  const transferAmount = requested | 0;
  if (transferAmount < 1) return { status: 'rejected', value: null, reason: 'Native transfer rejects the resulting nonpositive signed amount.', events: [] };
  return { status: 'applied', value: { donor, recipient, sourceStackIndex, transferAmount, templateGuid20,
    evidence: ['Game:200060b4', 'Game:20033e01'], gameMessages: 'host-required-after-successful-transfer' }, events: [] };
}

export interface NativeScriptGiveTransfer {
  readonly sourceStackIndex: number;
  readonly transferAmount: number;
  readonly templateGuid20: string;
  readonly assuredQuality: 0;
  readonly evidence: readonly ['Script_Game:100dbb80', 'Script:10003c65', 'Game:20033e01', 'Game:201afe30'];
  readonly gameMessages: 'host-required-after-successful-transfer';
}

/** Executes the bounded Script_Game opcode-13 path. The dispatcher parses ID2
 * as a signed integer, assures at least that many exact-quality-0 items in the
 * donor, then passes AssureItems' returned stack index to the indexed
 * gCInfo_PS::Give overload. That overload clamps only when the donor is the
 * player. It does not search other qualities or consume multiple stacks. */
export function executeNativeScriptGiveTransfer(donor: NativeInventory | null, recipient: NativeInventory | null,
  templateGuid20: string, amount: number, donorIsPlayer: boolean,
  context: InventoryTransferContext): InventoryResult<NativeScriptGiveTransfer | null> {
  guid20(templateGuid20);
  int32(amount, 'Script_Game Give amount');
  if (!donor || !recipient) return { status: 'rejected', value: null,
    reason: 'Script_Game Give requires source and destination inventories.', events: [] };
  // Negative and zero script amounts have native unsigned-conversion behavior
  // outside this positive, safely reproducible browser slice.
  if (amount < 1) return { status: 'unsupported', reason:
    'Script_Game Give with a nonpositive parsed amount reaches native unsigned conversion and is outside the supported profile.',
    partial: false, events: [] };

  const assurance = donor.assureItems(templateGuid20, 0, amount);
  if (assurance.status === 'unsupported') return assurance;
  if (assurance.status === 'rejected') return { ...assurance, value: null };
  const sourceStackIndex = assurance.value;
  const stack = donor.getStack(sourceStackIndex);
  if (!stack) return { status: 'rejected', value: null,
    reason: 'Native AssureItems returned a stack index that is not present in the donor inventory.',
    events: assurance.events };

  const transferAmount = donorIsPlayer ? Math.min(amount >>> 0, stack.amount >>> 0) : amount;
  if (transferAmount < 1) return { status: 'rejected', value: null,
    reason: 'Indexed native Give resolves to a nonpositive transfer amount.', events: assurance.events };
  const transfer = donor.transferItemsTo(recipient, sourceStackIndex, transferAmount, context, 0);
  const events = [...assurance.events, ...transfer.events];
  if (transfer.status === 'unsupported') return { ...transfer, events,
    partial: transfer.partial || assurance.events.length > 0 };
  if (transfer.status === 'rejected') return { ...transfer, value: null, events };
  return { status: 'applied', value: { sourceStackIndex, transferAmount, templateGuid20,
    assuredQuality: 0, evidence: ['Script_Game:100dbb80', 'Script:10003c65', 'Game:20033e01', 'Game:201afe30'],
    gameMessages: 'host-required-after-successful-transfer' }, events };
}

export function nativeInventoryEquipSlots(useType: number): { primary: number; alternative: number } {
  int32(useType, 'UseType');
  switch (useType) {
    case 2: return { primary: 6, alternative: 5 };
    case 3: case 12: case 51: case 52: return { primary: 6, alternative: 0 };
    case 4: case 7: return { primary: 14, alternative: 0 };
    case 5: case 6: return { primary: 7, alternative: 0 };
    case 9: return { primary: 5, alternative: 0 };
    case 10: return { primary: 9, alternative: 0 };
    case 11: return { primary: 18, alternative: 0 };
    case 13: return { primary: 11, alternative: 0 };
    case 14: return { primary: 12, alternative: 13 };
    case 112: return { primary: 15, alternative: 0 };
    case 114: return { primary: 17, alternative: 0 };
    default: return { primary: 0, alternative: 0 };
  }
}

export interface StartingInventoryResult {
  readonly inventory: NativeInventory;
  readonly status: 'applied' | 'unsupported' | 'rejected';
  readonly reason?: string;
  readonly events: readonly InventoryEvent[];
  readonly completedAssurances: number;
  readonly scope: 'original-assurance-calls-and-serialized-equipment-before-later-startup-callbacks';
}
/** Replays source calls from an EMPTY serialized stack list. Does not upgrade a
 * previously partially initialized seed by assigning unknown Learned=false.
 * Complete callback support is required before the first mutation. */
export function createNativeStartingInventory(seed: InitializedPlayerSeed, options: Omit<InventoryOptions, 'equipment'> = {}): StartingInventoryResult {
  if (seed.inventory.serializedStackCount !== 0) throw new TypeError('This starting path requires the source-proven empty serialized stack list.');
  const inventory = new NativeInventory(inventoryTemplatesFromSeed(seed), { ...options, equipment: seed.inventory.equipment });
  const events: InventoryEvent[] = [];
  let completedAssurances = 0;
  for (const source of seed.inventory.stacks) {
    const raw = source.startupOperation;
    if (!raw || typeof raw !== 'object') throw new TypeError('Missing original startup inventory operation.');
    const call = raw as Record<string, unknown>;
    if (call.template !== source.templateName || typeof call.quality !== 'number' || typeof call.amount !== 'number' ||
        typeof call.key !== 'number' || typeof call.finalBoolean !== 'boolean') throw new TypeError('Incomplete original AssureItemsEx operands.');
    const result = inventory.assureItemsEx(source.templateGuid20, call.quality, call.amount, call.key, call.finalBoolean);
    events.push(...result.events);
    if (result.status !== 'applied') return { inventory, status: result.status, reason: result.reason, events, completedAssurances,
      scope: 'original-assurance-calls-and-serialized-equipment-before-later-startup-callbacks' };
    completedAssurances++;
  }
  return { inventory, status: 'applied', events, completedAssurances,
    scope: 'original-assurance-calls-and-serialized-equipment-before-later-startup-callbacks' };
}
