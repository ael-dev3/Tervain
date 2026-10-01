import { itemAction, ITEMS } from '../../content/items';
import { S } from '../../content/strings';
import type { ItemId } from '../../game/types';
import { clear, h } from './dom';
import { icon } from './icons';
import { decodeQuickDrag, QUICK_DRAG_TYPE, QUICK_SLOT_COUNT, quickSlotLabel } from './uiModel';
import type { QuickDrag } from './uiModel';
import { bindQuickDrag, quickDropOperation } from './quickDrag';

export interface QuickSlotData {
  quickSlots: readonly (ItemId | null)[];
  inventory: Partial<Record<ItemId, number>>;
  equippedWeapon: ItemId | null;
  health: number;
  maxHealth: number;
}
interface QuickSlotOptions {
  mode: 'activate' | 'assign';
  onActivate?(slot: number): void;
  onAssign?(slot: number, item: ItemId | null): void;
  onSwap?(from: number, to: number): void;
  onSelect?(slot: number): void;
}

/** The same physical slots live in the world HUD and the modal inventory. Bindings never transfer inventory. */
export class QuickSlotBar {
  readonly el: HTMLElement;
  private buttons: HTMLButtonElement[] = [];
  private signatures: string[] = [];
  private data: QuickSlotData | null = null;
  constructor(private options: QuickSlotOptions) {
    this.el = h('div', { class: 'hotbar', role: 'group', 'aria-label': options.mode === 'assign' ? 'Assign items to hotbar slots' : 'Item hotbar · keys 1 through 0', 'data-nav-grid': true });
    for (let slot = 0; slot < QUICK_SLOT_COUNT; slot++) {
      const button = h('button', { class: 'hotbar-slot', type: 'button', 'data-nav': true, 'data-focus-key': `quick-slot-${slot}`, 'data-quick-slot': slot,
        onClick: () => { this.options.onSelect?.(slot); if (this.options.mode === 'assign' || button.getAttribute('aria-disabled') !== 'true') this.options.onActivate?.(slot); },
        onFocus: () => this.options.onSelect?.(slot),
        onKeydown: (event: KeyboardEvent) => {
          if (this.options.mode === 'assign' && (event.code === 'Delete' || event.code === 'Backspace')) {
            event.preventDefault(); event.stopPropagation();
            this.options.onAssign?.(slot, null);
          }
        },
        onDragover: (event: DragEvent) => {
          if (!event.dataTransfer?.types.includes(QUICK_DRAG_TYPE)) return;
          event.preventDefault(); event.dataTransfer.dropEffect = 'move';
          button.classList.add('is-drop-target');
        },
        onDragleave: (event: DragEvent) => { if (!(event.relatedTarget instanceof Node) || !button.contains(event.relatedTarget)) button.classList.remove('is-drop-target'); },
        onDrop: (event: DragEvent) => {
          event.preventDefault(); event.stopPropagation(); this.clearDropTargets();
          const value = decodeQuickDrag(event.dataTransfer?.getData(QUICK_DRAG_TYPE) ?? '');
          if (value) this.receiveDrop(value, slot);
        },
      });
      bindQuickDrag(button, {
        value: () => { const item = this.data?.quickSlots[slot]; return item ? { item, from: slot } : null; },
        scope: () => button.closest<HTMLElement>('.inventory-record') ?? this.el,
        drop: (value, target) => this.receiveDrop(value, target),
      });
      this.buttons.push(button); this.el.append(button);
    }
  }
  private clearDropTargets() { this.buttons.forEach((button) => button.classList.remove('is-drop-target')); }
  receiveDrop(value: QuickDrag, slot: number) {
    if (!this.data) return;
    const operation = quickDropOperation(value, slot, this.data.quickSlots, this.data.inventory);
    if (operation?.t === 'assign') this.options.onAssign?.(operation.slot, operation.item);
    else if (operation?.t === 'swap') this.options.onSwap?.(operation.from, operation.to);
  }
  select(slot: number) { this.buttons.forEach((button, index) => button.classList.toggle('is-selected', index === slot)); }
  update(data: QuickSlotData) {
    this.data = data;
    this.buttons.forEach((button, slot) => {
      const item = data.quickSlots[slot] ?? null;
      const count = item ? Math.max(0, data.inventory[item] ?? 0) : 0;
      const equipped = item !== null && item === data.equippedWeapon;
      const usable = item !== null && count > 0 && (itemAction(item) !== 'consume' || data.health < data.maxHealth);
      const signature = `${item}|${count}|${equipped}|${usable}`;
      if (signature === this.signatures[slot]) return;
      this.signatures[slot] = signature;
      clear(button);
      button.append(h('kbd', { class: 'slot-key' }, quickSlotLabel(slot)));
      if (item) button.append(icon(item), h('span', { class: 'slot-count', 'aria-hidden': 'true' }, String(count)));
      const label = item ? `${S(ITEMS[item].nameKey)} · ${count} carried${equipped ? ' · equipped' : ''}${count === 0 ? ' · unavailable' : !usable ? ' · already healthy' : ''}` : 'Empty';
      const name = `Slot ${quickSlotLabel(slot)} · ${label}`;
      button.setAttribute('aria-label', name);
      button.title = `${name}${this.options.mode === 'assign' ? ' · click to assign selected item; Delete to clear' : item ? '' : ' · open inventory to assign'}`;
      button.setAttribute('aria-disabled', String(this.options.mode === 'activate' && !usable));
      if (item && itemAction(item) === 'equip') button.setAttribute('aria-pressed', String(equipped)); else button.removeAttribute('aria-pressed');
      button.classList.toggle('is-empty', !item);
      button.classList.toggle('is-unavailable', !!item && !usable);
      button.classList.toggle('is-equipped', equipped);
      button.classList.toggle('quick-drag-source', !!item);
      button.draggable = false;
    });
  }
}
