import { hotbarEligible, itemAction, ITEMS } from '../../content/items';
import { NPCS } from '../../content/npcs';
import { S } from '../../content/strings';
import { TRAINING_COST } from '../../game/constants';
import { commitPreconditions, riteCalmActive, rotationBlockers, stabilizePreconditions } from '../../game/commands';
import type { Game } from '../../game/game';
import { buildJournal } from '../../game/journal';
import { clockDay, evalCond, formatClock } from '../../game/state';
import { worldView } from '../../game/worldView';
import type { Allocation, Cond, ItemId, WorldState } from '../../game/types';
import { type Input } from '../../platform/input';
import { ACTIONS, DEFAULT_BINDINGS, codeLabel, defaultSettings, findConflict, saveSettings, type Action, type Settings } from '../../platform/settings';
import { SLOT_IDS, type LoadResult, type SaveStore, type SlotId } from '../../platform/storage';
import { clear, focusableElements, focusFirst, h, moveFocus, visibleControl } from './dom';
import { EVIDENCE_IDS } from '../../game/types';
import { GAME_VERSION } from '../../version';
import { createMenuScreen } from './menuView';
import { icon } from './icons';
import { INVENTORY_GROUPS, inventoryItems, QUICK_SLOT_COUNT, quickSlotFromCode, quickSlotLabel, type InventoryGroup } from './uiModel';
import { QuickSlotBar } from './hotbar';
import { bindQuickDrag } from './quickDrag';

let panelLabelId = 0;

export interface PanelActions {
  resume(): void;
  save(slot: SlotId): void;
  load(slot: SlotId): void;
  newGame(): void;
  quitToTitle(): void;
  useItem(item: ItemId): void;
  assignQuickSlot(slot: number, item: ItemId | null): void;
  swapQuickSlots(from: number, to: number): void;
  equipWeapon(item: ItemId | null): void;
  brace(): void;
  force(): void;
  commit(a: Allocation): void;
  applySettings(reload?: boolean): void;
  closeAll(): void;
}

export interface PanelCtx {
  game: Game;
  settings: Settings;
  saves: SaveStore;
  input: Input;
  actions: PanelActions;
  host: PanelHost;
  toast(text: string, kind?: '' | 'evidence' | 'good' | 'bad'): void;
  playerNear: { sluice: boolean };
}

interface Frame {
  content: HTMLElement;
  narrow: boolean;
  returnFocus: HTMLElement | null;
  onClose?: () => void;
  refresh?: () => HTMLElement;
}

/** Holds a stack of modal panels so Settings can open from Pause and return to it. */
export class PanelHost {
  readonly el: HTMLElement;
  private stack: Frame[] = [];
  onEmpty: (() => void) | null = null;
  onOpen: (() => void) | null = null;
  /** Fired whenever the visible screen changes or closes. */
  onChange: (() => void) | null = null;

  constructor() {
    this.el = h('div', { class: 'panel-root' });
    this.el.addEventListener('mousedown', (e) => {
      if (e.target === this.el) this.back();
    });
  }

  get isOpen() {
    return this.stack.length > 0;
  }

  get depth() {
    return this.stack.length;
  }

  push(content: HTMLElement, opts: { narrow?: boolean; onClose?: () => void; refresh?: () => HTMLElement } = {}) {
    const wasEmpty = this.stack.length === 0;
    this.stack.push({ content, narrow: !!opts.narrow, returnFocus: document.activeElement as HTMLElement | null, onClose: opts.onClose, refresh: opts.refresh });
    this.render();
    if (wasEmpty) this.onOpen?.();
  }

  replaceTop(content: HTMLElement, opts: { narrow?: boolean } = {}) {
    const top = this.stack[this.stack.length - 1];
    if (!top) return this.push(content, opts);
    top.content = content;
    if (opts.narrow !== undefined) top.narrow = opts.narrow;
    this.render();
  }

  refreshTop() {
    const top = this.stack[this.stack.length - 1];
    if (top?.refresh) {
      top.content = top.refresh();
      this.render(false);
    }
  }

  back() {
    if (!this.stack.length) return;
    const top = this.stack.pop();
    top?.onClose?.();
    if (this.stack.length === 0) {
      this.el.classList.remove('on');
      clear(this.el);
      this.onChange?.();
      this.onEmpty?.();
      const trigger = top?.returnFocus;
      if (trigger?.isConnected && visibleControl(trigger)) trigger.focus();
    } else this.render(top?.returnFocus ?? true);
  }

  closeAll() {
    if (!this.stack.length) return;
    const returnFocus = this.stack[0]?.returnFocus;
    while (this.stack.length > 0) {
      const top = this.stack.pop();
      top?.onClose?.();
    }
    this.el.classList.remove('on');
    clear(this.el);
    this.onChange?.();
    this.onEmpty?.();
    if (returnFocus?.isConnected && visibleControl(returnFocus)) returnFocus.focus();
  }

  private render(focus: boolean | HTMLElement = true) {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    const active = document.activeElement as HTMLElement | null;
    const key = active && this.el.contains(active) ? active.dataset.focusKey : undefined;
    const oldScroll = this.el.firstElementChild?.scrollTop ?? 0;
    clear(this.el);
    const menu = top.content.classList.contains('menu-screen');
    const heading = top.content.querySelector<HTMLElement>('h1, h2');
    if (heading && !heading.id) heading.id = `tervain-panel-heading-${panelLabelId++}`;
    const panel = h('div', {
      class: menu ? 'panel panel-menu' : `panel surface-paper${top.narrow ? ' narrow' : ''}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': heading?.id,
      'aria-label': heading ? null : S('game.title'),
      tabindex: '-1',
    }, top.content);
    this.el.append(panel);
    this.el.classList.add('on');
    this.onChange?.();
    const matching = key ? [...panel.querySelectorAll<HTMLElement>('[data-focus-key]')].find((control) => control.dataset.focusKey === key && visibleControl(control) && !control.hasAttribute('disabled')) : null;
    if (typeof focus !== 'boolean' && panel.contains(focus) && visibleControl(focus)) focus.focus();
    else if (matching) { matching.focus(); panel.scrollTop = oldScroll; }
    else if (focus || key) focusFirst(panel);
  }

  navigate(dx: number, dy: number) {
    moveFocus(this.el, dx, dy);
  }

  activateFocused() {
    const active = document.activeElement as HTMLElement | null;
    if (this.isOpen && active && this.el.contains(active)) active.click();
  }

  /** App calls this after its rebind-capture guard so Tab can still be assigned as a game key. */
  trapTab(event: KeyboardEvent): boolean {
    if (!this.isOpen || event.code !== 'Tab') return false;
    const panel = this.el.firstElementChild as HTMLElement | null;
    if (!panel) return false;
    event.preventDefault();
    event.stopPropagation();
    const controls = focusableElements(panel);
    if (controls.length === 0) {
      panel.focus();
      return true;
    }
    const active = document.activeElement as HTMLElement | null;
    const index = active ? controls.indexOf(active) : -1;
    const next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    const target = controls[next] ?? panel;
    target.focus();
    target.scrollIntoView({ block: 'nearest' });
    return true;
  }
}

/* ---------------------------------------------------------------- helpers */

export function describeCond(c: Cond, s: WorldState): string | null {
  switch (c.t) {
    case 'evidence':
      return S('req.evidence', { name: S(`evidence.${c.id}`) });
    case 'fact': {
      const key = `req.fact.${c.key}`;
      const name = S(key);
      return name === key ? S('req.generic') : S('req.fact', { name });
    }
    case 'item':
      return (c.min ?? 1) > 1 ? S('req.item.n', { n: c.min ?? 1, name: S(ITEMS[c.id].nameKey) }) : S('req.item', { name: S(ITEMS[c.id].nameKey) });
    case 'trust':
      return S('req.trust');
    case 'anyDefeated':
      return S('req.anyDefeated');
    case 'skill':
      return S('req.skill');
    case 'phase':
      return S('req.phase');
    case 'any': {
      const parts = c.c.filter((x) => !evalCond(s, x)).map((x) => describeCond(x, s)).filter((x): x is string => !!x);
      const all = c.c.map((x) => describeCond(x, s)).filter((x): x is string => !!x);
      return S('req.any', { list: (parts.length ? parts : all).join(' / ') });
    }
    case 'not':
      return null;
    default:
      return S('req.generic');
  }
}

export function describeMissing(conds: Cond[], s: WorldState): string[] {
  return conds.map((c) => describeCond(c, s)).filter((x): x is string => !!x);
}

function fmtPlay(sec: number) {
  const m = Math.floor(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function slotLabel(res: LoadResult, slot: SlotId): { title: string; meta: string; ok: boolean } {
  const title = S(`menu.slot.${slot}`);
  if (!res.ok) {
    return { title, meta: res.kind === 'missing' ? S('menu.empty') : res.message, ok: false };
  }
  const sm = res.summary;
  return {
    title,
    meta: S('menu.savetime', { day: S('menu.day', { n: clockDay(sm.clock) + 1 }), phase: S(`journal.status.${sm.phase}`).split('.')[0] ?? '', play: fmtPlay(sm.playSeconds) }),
    ok: true,
  };
}

const closeBtn = (ctx: PanelCtx, label = S('menu.close')) => h('button', { class: 'btn', type: 'button', 'data-nav': true, 'data-focus-key': 'close-record', onClick: () => ctx.host.back() }, label);

/* ---------------------------------------------------------------- journal */

interface RecordPage { key: string; label: string; content: HTMLElement; count?: number }
let recordPageId = 0;

/** Material tabs keep one Tab stop; arrows/Home/End select pages without moving outside the record. */
function recordTabs(pages: RecordPage[], initially = pages[0]?.key): HTMLElement {
  const prefix = `record-${recordPageId++}`;
  const tabs = h('div', { class: 'record-tabs', role: 'tablist' });
  const body = h('div', { class: 'record-pages' });
  const buttons: HTMLButtonElement[] = [];
  const select = (key: string) => {
    pages.forEach((page, i) => {
      const active = page.key === key;
      page.content.hidden = !active;
      buttons[i]!.setAttribute('aria-selected', String(active));
      buttons[i]!.tabIndex = active ? 0 : -1;
    });
  };
  pages.forEach((page, i) => {
    const id = `${prefix}-${page.key}`;
    page.content.id = `${id}-page`;
    page.content.classList.add('record-page');
    page.content.setAttribute('role', 'tabpanel');
    page.content.setAttribute('aria-labelledby', id);
    const button = h('button', {
      class: 'record-tab', type: 'button', role: 'tab', id,
      'aria-controls': page.content.id, 'data-nav': true, 'data-focus-key': `tab-${page.key}`,
      onClick: () => select(page.key), onFocus: () => select(page.key),
      onKeydown: (event: KeyboardEvent) => {
        let next: number | undefined;
        if (event.code === 'ArrowLeft') next = (i - 1 + pages.length) % pages.length;
        if (event.code === 'ArrowRight') next = (i + 1) % pages.length;
        if (event.code === 'Home') next = 0;
        if (event.code === 'End') next = pages.length - 1;
        if (next === undefined) return;
        event.preventDefault(); event.stopPropagation(); buttons[next]!.focus();
      },
    }, h('span', { class: 'record-tab-label' }, page.label), page.count === undefined ? null : h('small', {}, String(page.count)));
    buttons.push(button); tabs.append(button); body.append(page.content);
  });
  select(initially ?? pages[0]!.key);
  return h('div', { class: 'record-body' }, tabs, body);
}

export function journalPanel(ctx: PanelCtx): HTMLElement {
  const j = buildJournal(ctx.game.state);
  const entries = (items: { key: string; params?: Record<string, string | number> }[]) =>
    h('div', { class: 'journal-entries' }, items.length ? items.map((entry, i) => h('article', { class: 'journal-entry' }, h('span', { class: 'entry-number', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')), h('p', {}, S(entry.key, entry.params)))) : h('p', { class: 'record-empty' }, S('journal.empty')));
  const knownPlaces = j.places.filter((p) => p.status !== 'unknown');
  const knownPeople = j.people.filter((p) => p.met || !p.available);
  const pages: RecordPage[] = [
    { key: 'observed', label: S('journal.observed'), count: j.observed.length, content: entries(j.observed) },
    { key: 'reported', label: S('journal.reported'), count: j.reported.length, content: entries(j.reported) },
    { key: 'concluded', label: S('journal.concluded'), count: j.concluded.length, content: entries(j.concluded) },
    { key: 'questions', label: S('journal.questions'), count: j.questions.length, content: entries(j.questions) },
    { key: 'places', label: S('journal.places'), count: knownPlaces.length, content: h('div', { class: 'journal-entries' }, knownPlaces.length ? knownPlaces.map((p) => h('article', { class: 'journal-entry' }, icon('map'), h('div', {}, h('strong', {}, S(`place.${p.id}`)), h('p', { class: 'muted' }, S(`journal.place.${p.status}`))))) : h('p', { class: 'record-empty' }, S('journal.empty'))) },
    { key: 'people', label: S('journal.people'), count: knownPeople.length, content: h('div', { class: 'journal-entries' }, knownPeople.length ? knownPeople.map((p) => {
      const def = NPCS[p.npc];
      return h('article', { class: 'journal-entry' }, h('div', {}, h('strong', {}, `${def.name} — ${S(def.titleKey)}`), h('p', { class: 'muted' }, p.available ? S(def.sleepsKey) : S('journal.person.absent'))));
    }) : h('p', { class: 'record-empty' }, S('journal.empty'))) },
  ];
  return h('div', { class: 'game-record journal-record' },
    h('header', { class: 'record-heading' }, icon('journal'), h('div', {}, h('h1', {}, S('journal.title')), h('p', { class: 'sub' }, S(j.statusKey)))),
    h('div', { class: 'journal-layout' },
      h('aside', { class: 'record-summary' }, h('h2', {}, S('journal.status')), j.leadKey ? h('p', {}, S(j.leadKey)) : null, h('p', { class: 'record-date' }, S('hud.time', { n: clockDay(ctx.game.state.clock) + 1, time: formatClock(ctx.game.state.clock) }))),
      recordTabs(pages)),
    h('footer', { class: 'record-footer' }, h('span', { class: 'muted' }, 'Notes distinguish what you saw, heard and learned.'), closeBtn(ctx)));
}

/* -------------------------------------------------------------- inventory */

const GROUP_LABELS: Record<InventoryGroup, string> = { all: 'All', weapon: 'Weapons', tool: 'Tools', quest: 'Keepsakes', consumable: 'Remedies', clothing: 'Clothing', material: 'Materials' };

export function inventoryPanel(ctx: PanelCtx): HTMLElement {
  const s = ctx.game.state;
  const previous = ctx.host.el.querySelector<HTMLElement>('.inventory-record');
  const previousScroll = previous?.querySelector<HTMLElement>('.inventory-layout')?.scrollTop ?? 0;
  let group: InventoryGroup = INVENTORY_GROUPS.find((g) => g === previous?.dataset.inventoryGroup) ?? 'all';
  let selected: ItemId | null = inventoryItems(s).find((id) => id === previous?.dataset.selectedItem) ?? inventoryItems(s)[0] ?? null;
  let selectedSlot = Math.max(0, Math.min(QUICK_SLOT_COUNT - 1, Number(previous?.dataset.selectedSlot) || 0));
  const grid = h('div', { class: 'inventory-grid', 'data-nav-grid': true, 'aria-label': 'Carried items' });
  const detail = h('section', { class: 'inventory-detail', 'aria-label': 'Selected item' });
  const record = h('div', { class: 'game-record inventory-record' });
  const mutate = (action: () => void, focusSlot?: number) => {
    action();
    ctx.host.replaceTop(inventoryPanel(ctx));
    if (focusSlot !== undefined) ctx.host.el.querySelector<HTMLElement>(`[data-quick-slot="${focusSlot}"]`)?.focus();
  };
  const filters = h('div', { class: 'inventory-filters', role: 'group', 'aria-label': 'Item categories' });
  const filterButtons = new Map<InventoryGroup, HTMLButtonElement>();
  const slotSelection = h('span', { class: 'hotbar-selection' });
  const clearSlot = h('button', { class: 'btn', type: 'button', 'data-nav': true, 'data-focus-key': 'quick-clear', onClick: () => mutate(() => ctx.actions.assignQuickSlot(selectedSlot, null), selectedSlot) }, 'Clear');
  const move = (direction: number) => {
    const to = selectedSlot + direction;
    if (to < 0 || to >= QUICK_SLOT_COUNT || !s.quickSlots[selectedSlot]) return;
    const from = selectedSlot;
    selectedSlot = to; record.dataset.selectedSlot = String(to);
    mutate(() => ctx.actions.swapQuickSlots(from, to), to);
  };
  const moveLeft = h('button', { class: 'btn', type: 'button', 'data-nav': true, 'data-focus-key': 'quick-left', onClick: () => move(-1), 'aria-label': 'Swap selected binding with the slot to its left' }, 'Move left');
  const moveRight = h('button', { class: 'btn', type: 'button', 'data-nav': true, 'data-focus-key': 'quick-right', onClick: () => move(1), 'aria-label': 'Swap selected binding with the slot to its right' }, 'Move right');
  let hotbar: QuickSlotBar;
  const syncSlot = () => {
    record.dataset.selectedSlot = String(selectedSlot);
    hotbar.select(selectedSlot);
    slotSelection.textContent = `Slot ${quickSlotLabel(selectedSlot)}`;
    clearSlot.disabled = !s.quickSlots[selectedSlot];
    moveLeft.disabled = !s.quickSlots[selectedSlot] || selectedSlot === 0;
    moveRight.disabled = !s.quickSlots[selectedSlot] || selectedSlot === QUICK_SLOT_COUNT - 1;
    const assignButton = detail.querySelector<HTMLElement>('[data-focus-key="quick-assign"]');
    if (assignButton) assignButton.textContent = `Assign to slot ${quickSlotLabel(selectedSlot)}`;
  };
  const assignSelected = (slot: number) => {
    selectedSlot = slot; syncSlot();
    if (selected && hotbarEligible(selected) && (s.inventory[selected] ?? 0) > 0) mutate(() => ctx.actions.assignQuickSlot(slot, selected), slot);
    else ctx.toast('Select a carried weapon or remedy to assign it.', '');
  };
  hotbar = new QuickSlotBar({ mode: 'assign', onActivate: assignSelected, onSelect: (slot) => { selectedSlot = slot; syncSlot(); },
    onAssign: (slot, item) => { selectedSlot = slot; record.dataset.selectedSlot = String(slot); mutate(() => ctx.actions.assignQuickSlot(slot, item), slot); },
    onSwap: (from, to) => { selectedSlot = to; record.dataset.selectedSlot = String(to); mutate(() => ctx.actions.swapQuickSlots(from, to), to); },
  });
  hotbar.update({ quickSlots: s.quickSlots, inventory: s.inventory, equippedWeapon: s.equippedWeapon, health: s.player.health, maxHealth: s.player.maxHealth });
  const renderDetail = () => {
    clear(detail);
    record.dataset.inventoryGroup = group;
    record.dataset.selectedItem = selected ?? '';
    grid.querySelectorAll<HTMLElement>('[data-item-id]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.itemId === selected)));
    if (!selected) { detail.append(h('p', { class: 'record-empty' }, S('inv.empty'))); return; }
    const def = ITEMS[selected];
    const id = selected;
    const equipped = s.equippedWeapon === id;
    detail.append(h('div', { class: 'item-portrait' }, icon(id)), h('div', { class: 'item-description' }, h('h2', {}, S(def.nameKey)), h('p', {}, S(def.descKey)), h('p', { class: 'item-kind' }, `${GROUP_LABELS[def.kind === 'currency' ? 'all' : def.kind]} · ×${s.inventory[id] ?? 0}${equipped ? ' · Equipped' : ''}`)));
    const actions = h('div', { class: 'inventory-item-actions row' });
    if (itemAction(id) === 'consume') actions.append(h('button', {
      class: 'btn primary', type: 'button', 'data-nav': true, 'data-focus-key': 'use-selected-item', disabled: s.player.health >= s.player.maxHealth,
      onClick: () => mutate(() => ctx.actions.useItem(id)),
    }, `${S('inv.use')} · restore ${def.healAmount ?? 0} health`));
    if (itemAction(id) === 'equip') actions.append(h('button', {
      class: 'btn primary', type: 'button', 'data-nav': true, 'data-focus-key': 'equip-selected-item', onClick: () => mutate(() => ctx.actions.equipWeapon(equipped ? null : id)),
    }, equipped ? 'Unequip' : 'Equip'));
    if (hotbarEligible(id)) actions.append(h('button', { class: 'btn', type: 'button', 'data-nav': true, 'data-focus-key': 'quick-assign', onClick: () => assignSelected(selectedSlot) }, `Assign to slot ${quickSlotLabel(selectedSlot)}`));
    if (actions.childElementCount) detail.append(actions);
  };
  const renderGrid = () => {
    const ids = inventoryItems(s, group);
    if (!ids.includes(selected!)) selected = ids[0] ?? null;
    clear(grid);
    if (!ids.length) grid.append(h('p', { class: 'record-empty' }, group === 'all' ? S('inv.empty') : 'Nothing in this category.'));
    for (const id of ids) {
      const n = s.inventory[id] ?? 0;
      const choose = () => { selected = id; renderDetail(); };
      const cell = h('button', { class: `item-cell item-${ITEMS[id].kind}${s.equippedWeapon === id ? ' item-equipped' : ''}`, type: 'button', draggable: 'false', 'data-nav': true, 'data-item-id': id, 'data-focus-key': `item-${id}`, 'aria-label': `${S(ITEMS[id].nameKey)} · ${n}${s.equippedWeapon === id ? ' · equipped' : ''}`, title: S(ITEMS[id].nameKey), onFocus: choose, onClick: choose }, icon(id), h('span', { class: 'item-cell-name' }, S(ITEMS[id].nameKey)), h('span', { class: 'item-quantity' }, String(n)), s.equippedWeapon === id ? h('span', { class: 'item-equipped-label', 'aria-hidden': 'true' }, 'Equipped') : null);
      if (hotbarEligible(id)) bindQuickDrag(cell, {
        value: () => { if ((ctx.game.state.inventory[id] ?? 0) <= 0) return null; choose(); return { item: id, from: null }; },
        scope: () => record,
        drop: (value, slot) => hotbar.receiveDrop(value, slot),
      });
      grid.append(cell);
    }
    filterButtons.forEach((button, key) => button.setAttribute('aria-pressed', String(group === key)));
    renderDetail();
  };
  for (const key of INVENTORY_GROUPS) {
    const button = h('button', { class: 'record-tab', type: 'button', 'data-nav': true, 'data-focus-key': `filter-${key}`, onClick: () => { group = key; renderGrid(); } }, GROUP_LABELS[key]);
    filterButtons.set(key, button); filters.append(button);
  }
  const skills = s.skills.map((key) => h('div', { class: 'learned-skill' }, h('strong', {}, S(`skill.${key}`)), h('p', {}, S(`skill.${key}.desc`))));
  const layout = h('div', { class: 'inventory-layout' },
    h('aside', { class: 'record-summary' }, h('h2', {}, 'The wanderer'), h('dl', { class: 'record-stats' }, h('dt', {}, S('hud.health')), h('dd', {}, `${Math.round(s.player.health)} / ${s.player.maxHealth}`), h('dt', {}, S('hud.coin')), h('dd', {}, String(s.inventory.coin ?? 0))), h('h2', {}, S('inv.skills')), skills.length ? skills : h('p', { class: 'muted' }, S('inv.noskills'))),
    h('div', { class: 'inventory-main' }, filters, grid, detail));
  record.append(
    h('header', { class: 'record-heading' }, icon('inventory'), h('div', {}, h('h1', {}, S('inv.title')), h('p', { class: 'sub' }, 'What you carry, and what you have learned.'))),
    layout,
    h('section', { class: 'hotbar-editor', 'aria-label': 'Quick slot assignment' },
      h('div', { class: 'hotbar-editor-heading' }, h('h2', {}, 'Quick slots'), h('div', { class: 'hotbar-tools' }, slotSelection, clearSlot, moveLeft, moveRight)),
      hotbar.el, h('p', { class: 'hotbar-help' }, 'Select an item, then click a slot or press 1–0 to assign. Drag bindings to swap; Delete clears a focused slot.')),
    h('footer', { class: 'record-footer' }, h('span', { class: 'muted' }, 'Weapons equip. Remedies restore health. Keepsakes remain in your pack.'), closeBtn(ctx)));
  record.addEventListener('keydown', (event) => {
    const slot = quickSlotFromCode(event.code);
    if (slot === null || event.repeat || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof Element && event.target.closest('input, select, textarea, [contenteditable]'))) return;
    event.preventDefault(); event.stopPropagation(); assignSelected(slot);
  });
  renderGrid();
  syncSlot();
  // Assignment rerenders the modal from authoritative state; retain the scrolled item list as well as selection.
  queueMicrotask(() => { if (record.isConnected) layout.scrollTop = previousScroll; });
  return record;
}

/* ------------------------------------------------------------- noticeboard */

export function noticePanel(ctx: PanelCtx): HTMLElement {
  const v = worldView(ctx.game.state);
  return h(
    'div',
    {},
    h('h1', {}, S('board.title')),
    h('div', { class: 'notice-list' }, v.noticeboard.map((k) => h('div', { class: 'notice-item' }, S(k)))),
    h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx)),
  );
}

/* ------------------------------------------------------------------ sluice */

const REASON_KEY: Record<string, string> = {
  need_brace: 'toast.need.brace',
  need_wrench: 'toast.need.wrench',
  need_understanding: 'toast.need.understanding',
};

export function sluicePanel(ctx: PanelCtx): HTMLElement {
  const s = ctx.game.state;
  const gate = s.quest.gate;
  const frag: (HTMLElement | null)[] = [];
  frag.push(h('h1', {}, S('sluice.title')), h('p', { class: 'sub' }, S(`sluice.state.${gate}`)));

  if (gate !== 'stabilized') {
    const block = stabilizePreconditions(s);
    const safeRite = riteCalmActive(s);
    const safeProc = s.evidence.worker_testimony !== undefined;
    const note = safeRite ? S('sluice.brace.safe.rite') : safeProc ? S('sluice.brace.safe.procedure') : S('sluice.brace.unsafe');
    frag.push(
      h(
        'div',
        { class: 'alloc-card' },
        h('h3', {}, S('sluice.brace')),
        h('p', {}, S('sluice.brace.desc')),
        h('p', { class: safeRite || safeProc ? 'gain' : 'cost' }, note),
        block ? h('p', { class: 'need' }, `${S('hud.requires')} ${S(REASON_KEY[block] ?? 'req.generic')}`) : null,
        h('div', { class: 'row', style: { marginTop: '6px' } }, h('button', { class: `btn primary${block ? ' disabled' : ''}`, 'data-nav': true, onClick: () => (block ? ctx.toast(S(REASON_KEY[block] ?? 'req.generic'), 'bad') : ctx.actions.brace()) }, S('sluice.brace'))),
      ),
    );
    if (gate === 'damaged') {
      frag.push(
        h(
          'div',
          { class: 'alloc-card' },
          h('h3', {}, S('sluice.force')),
          h('p', {}, S('sluice.force.desc')),
          h('p', { class: 'cost' }, S('sluice.force.warn')),
          h('div', { class: 'row', style: { marginTop: '6px' } }, h('button', { class: 'btn danger', 'data-nav': true, onClick: () => showForceConfirm(ctx) }, S('sluice.force'))),
        ),
      );
    }
    frag.push(h('p', { class: 'hint-line' }, S('sluice.commit.locked')));
  } else {
    frag.push(h('h2', {}, S('sluice.commit.title')), h('p', { class: 'sub' }, S('sluice.commit.intro')));
    const cards = h('div', { class: 'alloc' });
    for (const a of ['rillford', 'quarry', 'rotation'] as const) {
      const block = commitPreconditions(s, a);
      const reasons: string[] = [];
      if (a === 'rotation') for (const b of rotationBlockers(s)) reasons.push(S(`sluice.alloc.rotation.need.${b}`));
      const disabled = !!block;
      const committedAlready = s.quest.phase === 'committed' || s.quest.phase === 'settled';
      cards.append(
        h(
          'div',
          { class: 'alloc-card' },
          h('h3', {}, S(`sluice.alloc.${a}`)),
          h('p', { class: 'gain' }, `+ ${S(`sluice.alloc.${a}.gain`)}`),
          h('p', { class: 'cost' }, `− ${S(`sluice.alloc.${a}.cost`)}`),
          h('p', { class: 'kind' }, S(`sluice.alloc.${a}.kind`)),
          reasons.map((r) => h('p', { class: 'need' }, `${S('hud.requires')} ${r}`)),
          a === 'rotation' && !reasons.length && s.npcs.quarry_foreman.available && s.npcs.rillford_reeve.available && s.npcs.spring_steward.available ? null : a === 'rotation' && [s.npcs.quarry_foreman, s.npcs.rillford_reeve, s.npcs.spring_steward].some((n) => !n.available) ? h('p', { class: 'need' }, S('sluice.alloc.caretaker')) : null,
          h('div', { class: 'row', style: { marginTop: '6px' } }, h('button', { class: 'btn primary', disabled: disabled || committedAlready, 'data-nav': true, onClick: () => (disabled || committedAlready ? null : showCommitConfirm(ctx, a)) }, S(`sluice.alloc.${a}`))),
        ),
      );
    }
    frag.push(cards);
  }
  frag.push(h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx)));
  return h('div', {}, frag);
}

function showForceConfirm(ctx: PanelCtx) {
  ctx.host.push(
    h(
      'div',
      {},
      h('h1', {}, S('sluice.force')),
      h('p', { class: 'cost' }, S('sluice.force.warn')),
      h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn danger', 'data-nav': true, onClick: () => ctx.actions.force() }, S('sluice.force.confirm')), h('button', { class: 'btn', 'data-nav': true, onClick: () => ctx.host.back() }, S('sluice.commit.back'))),
    ),
    { narrow: true },
  );
}

function showCommitConfirm(ctx: PanelCtx, a: Allocation) {
  ctx.host.push(
    h(
      'div',
      {},
      h('h1', {}, S(`sluice.alloc.${a}`)),
      h('p', { class: 'gain' }, `+ ${S(`sluice.alloc.${a}.gain`)}`),
      h('p', { class: 'cost' }, `− ${S(`sluice.alloc.${a}.cost`)}`),
      h('p', { class: 'kind' }, S(`sluice.alloc.${a}.kind`)),
      h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn primary', 'data-nav': true, onClick: () => ctx.actions.commit(a) }, S('sluice.commit.confirm')), h('button', { class: 'btn', 'data-nav': true, onClick: () => ctx.host.back() }, S('sluice.commit.back'))),
    ),
    { narrow: true },
  );
}

/* --------------------------------------------------------- menus and saves */

export function pauseMenu(ctx: PanelCtx): HTMLElement {
  const b = (label: string, fn: () => void, primary = false) => h('button', { class: `btn${primary ? ' primary' : ''}`, 'data-nav': true, onClick: fn }, label);
  const menu = h(
    'div',
    { class: 'menu-list' },
    b(S('menu.resume'), () => ctx.actions.resume(), true),
    b(S('menu.save'), () => ctx.host.push(slotsPanel(ctx, 'save'))),
    b(S('menu.load'), () => ctx.host.push(slotsPanel(ctx, 'load'))),
    b(S('journal.title'), () => ctx.host.push(journalPanel(ctx))),
    b(S('menu.settings'), () => ctx.host.push(settingsPanel(ctx))),
    b(S('menu.controls'), () => ctx.host.push(controlsPanel(ctx))),
    b(S('menu.quit'), () => ctx.actions.quitToTitle()),
  );
  return createMenuScreen({ menu, subtitle: 'Journey paused', version: GAME_VERSION, variant: 'pause' });
}

export function slotsPanel(ctx: PanelCtx, mode: 'save' | 'load'): HTMLElement {
  const rows = SLOT_IDS.filter((s) => mode === 'load' || (s !== 'auto' && s !== 'quick')).map((slot) => {
    const res = ctx.saves.load(slot);
    const l = slotLabel(res, slot);
    return h(
      'div',
      { class: 'slot' },
      h('div', {}, h('div', {}, l.title), h('div', { class: 'meta' }, l.meta)),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', disabled: mode === 'load' && !l.ok, 'data-nav': true, 'data-focus-key': `${mode}-${slot}`, onClick: () => (mode === 'save' ? ctx.actions.save(slot) : l.ok ? ctx.actions.load(slot) : null) }, mode === 'save' ? S('menu.save') : S('menu.load')),
        // Deleting is only offered for a damaged slot, and asks first (a healthy save is overwritten from Save instead).
        !res.ok && res.kind === 'corrupt'
          ? (() => {
              const b = h('button', { class: 'btn danger', 'data-nav': true, 'data-focus-key': `delete-${slot}` }, S('menu.delete'));
              let armed = false;
              b.addEventListener('click', () => {
                if (!armed) {
                  armed = true;
                  b.textContent = S('menu.deleteconfirm');
                  return;
                }
                ctx.saves.delete(slot);
                ctx.host.replaceTop(slotsPanel(ctx, mode));
              });
              return b;
            })()
          : null,
      ),
    );
  });
  return h('div', {}, h('h1', {}, mode === 'save' ? S('menu.save') : S('menu.load')), h('div', { class: 'list' }, rows), h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx, S('menu.back'))));
}

export function aboutPanel(ctx: PanelCtx): HTMLElement {
  return h('div', {}, h('h1', {}, S('menu.about')), h('p', {}, S('about.body', { version: GAME_VERSION })),
    h('p', {}, h('a', { href: `${import.meta.env.BASE_URL}model-licenses.html`, target: '_blank', rel: 'noopener noreferrer' }, S('about.modelLicenses'))),
    h('p', {}, h('a', { href: `${import.meta.env.BASE_URL}world-audio-licenses.html`, target: '_blank', rel: 'noopener noreferrer' }, S('about.audioLicenses'))),
    h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx, S('menu.back'))));
}

export function controlsPanel(ctx: PanelCtx): HTMLElement {
  const rows = ACTIONS.map((a) => h('div', { class: 'row split' }, h('span', {}, S(`action.${a}`)), h('span', { class: 'muted' }, ctx.settings.bindings[a].map(codeLabel).join(' / ') || S('set.unbound'))));
  return h('div', {}, h('h1', {}, S('controls.title')), h('div', { class: 'list' }, rows), h('p', { class: 'hint-line' }, S('controls.pad')), h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx, S('menu.back'))));
}

/* ---------------------------------------------------------------- settings */

export function settingsPanel(ctx: PanelCtx): HTMLElement {
  const st = ctx.settings;
  const commit = (reload = false) => {
    saveSettings(st);
    ctx.actions.applySettings(reload);
  };
  const toggle = (label: string, key: keyof Settings, desc?: string) =>
    h(
      'div',
      { class: 'setting setting-toggle' },
      h('input', { id: `s-${String(key)}`, type: 'checkbox', 'data-nav': true, 'data-focus-key': `setting-${String(key)}`, checked: st[key] === true ? true : null, onChange: (e: Event) => {
        (st[key] as boolean) = (e.target as HTMLInputElement).checked;
        commit();
      } }),
      h('label', { for: `s-${String(key)}` }, label),
      desc ? h('div', { class: 'desc' }, desc) : null,
    );
  const range = (label: string, get: () => number, set: (v: number) => void, min: number, max: number, step: number, fmt: (v: number) => string) => {
    const out = h('span', { class: 'muted' }, fmt(get()));
    const input = h('input', { type: 'range', min, max, step, value: get(), 'data-nav': true, 'data-focus-key': `setting-${label}`, 'aria-label': label });
    input.addEventListener('input', () => {
      set(Number(input.value));
      out.textContent = fmt(get());
      commit();
    });
    return h('div', { class: 'setting' }, h('label', {}, label), h('div', { class: 'row' }, input, out));
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const bindings = ACTIONS.map((a) => bindRow(ctx, a, commit));
  const quality = h(
    'select',
    { 'data-nav': true, 'data-focus-key': 'setting-quality', 'aria-label': S('set.quality'), onChange: (e: Event) => {
      st.quality = (e.target as HTMLSelectElement).value as Settings['quality'];
      commit(true);
    } },
    (['low', 'medium', 'high'] as const).map((q) => h('option', { value: q, selected: st.quality === q ? true : null }, S(`set.quality.${q}`))),
  );

  return h(
    'div',
    {},
    h('h1', {}, S('set.title')),
    h('h2', {}, S('set.display')),
    range(S('set.text'), () => st.textScale, (v) => (st.textScale = v), 0.8, 1.8, 0.05, pct),
    toggle(S('set.reduced'), 'reducedMotion', S('set.reduced.desc')),
    toggle(S('set.contrast'), 'highContrast', S('set.contrast.desc')),
    toggle(S('set.effects'), 'reduceEffects', S('set.effects.desc')),
    range(S('set.brightness'), () => st.brightness, (v) => (st.brightness = v), 0.6, 1.6, 0.05, pct),
    h('div', { class: 'setting' }, h('label', {}, S('set.quality')), quality, h('div', { class: 'desc' }, S('set.quality.note'))),
    toggle(S('set.guidance'), 'guidance'),
    toggle(S('set.barks'), 'barks'),
    toggle(S('set.captions'), 'captions'),
    toggle(S('set.fps'), 'showFps'),
    h('h2', {}, S('set.controls')),
    range(S('set.sensitivity'), () => st.mouseSensitivity, (v) => (st.mouseSensitivity = v), 0.2, 3, 0.05, (v) => v.toFixed(2)),
    toggle(S('set.invert'), 'invertY'),
    toggle(S('set.toggleSprint'), 'toggleSprint'),
    toggle(S('set.toggleBlock'), 'toggleBlock'),
    h('h2', {}, S('set.audio')),
    range(S('set.vol.master'), () => st.volumes.master, (v) => (st.volumes.master = v), 0, 1, 0.05, pct),
    range(S('set.vol.music'), () => st.volumes.music, (v) => (st.volumes.music = v), 0, 1, 0.05, pct),
    range(S('set.vol.effects'), () => st.volumes.effects, (v) => (st.volumes.effects = v), 0, 1, 0.05, pct),
    range(S('set.vol.ambience'), () => st.volumes.ambience, (v) => (st.volumes.ambience = v), 0, 1, 0.05, pct),
    range(S('set.vol.dialogue'), () => st.volumes.dialogue, (v) => (st.volumes.dialogue = v), 0, 1, 0.05, pct),
    h('h2', {}, S('set.bindings')),
    h('p', { class: 'hint-line' }, S('set.bindings.hint')),
    h('div', { class: 'list' }, bindings),
    h(
      'div',
      { class: 'row', style: { marginTop: '14px' } },
      h('button', { class: 'btn', 'data-nav': true, 'data-focus-key': 'settings-reset', onClick: () => {
        Object.assign(st, defaultSettings());
        commit(true);
        ctx.host.replaceTop(settingsPanel(ctx));
      } }, S('set.reset')),
      closeBtn(ctx, S('menu.back')),
    ),
  );
}

function bindRow(ctx: PanelCtx, action: Action, commit: () => void): HTMLElement {
  const st = ctx.settings;
  const label = (idx: number) => (st.bindings[action][idx] ? codeLabel(st.bindings[action][idx]!) : S('set.unbound'));
  const note = h('span', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const slotBtn = (idx: number) => {
    const btn = h('button', { class: 'btn', 'data-nav': true, 'data-focus-key': `binding-${action}-${idx}`, 'aria-label': `${S(`action.${action}`)} ${idx + 1}` }, label(idx));
    const restore = () => {
      btn.textContent = label(idx);
    };
    const assign = (code: string, displaced: Action | null) => {
      if (displaced) {
        // A true swap: the other action takes the key this slot held (or is left unbound and we say so).
        const old = st.bindings[action][idx];
        st.bindings[displaced] = st.bindings[displaced].filter((c) => c !== code);
        if (old) st.bindings[displaced].push(old);
        note.textContent = old
          ? S('set.swapped', { other: S(`action.${displaced}`), key: codeLabel(old) })
          : S('set.unbound_other', { other: S(`action.${displaced}`) });
      } else note.textContent = '';
      st.bindings[action][idx] = code;
      st.bindings[action] = st.bindings[action].filter(Boolean);
      commit();
      ctx.toast(S('toast.bound', { action: S(`action.${action}`), key: codeLabel(code) }), 'good');
      ctx.host.replaceTop(settingsPanel(ctx));
    };
    btn.addEventListener('click', () => {
      btn.textContent = S('set.press');
      note.textContent = S('set.cancelhint');
      ctx.input.captureCancel = () => {
        restore();
        note.textContent = '';
      };
      ctx.input.captureNext = (code) => {
        if (code === 'Escape') {
          restore();
          note.textContent = '';
          return;
        }
        const conflict = findConflict(st.bindings, action, code);
        if (!conflict) {
          assign(code, null);
          return;
        }
        // First press reports the conflict; pressing the same key again swaps the two.
        note.textContent = S('toast.bindconflict', { key: codeLabel(code), action: S(`action.${conflict}`) });
        ctx.toast(note.textContent, 'bad');
        ctx.input.captureNext = (code2) => {
          if (code2 === code) assign(code, conflict);
          else {
            restore();
            note.textContent = '';
          }
        };
      };
    });
    return btn;
  };
  return h('div', { class: 'bind' }, h('span', {}, S(`action.${action}`)), slotBtn(0), slotBtn(1), note);
}

void DEFAULT_BINDINGS;
void EVIDENCE_IDS;
void TRAINING_COST;
void formatClock;
