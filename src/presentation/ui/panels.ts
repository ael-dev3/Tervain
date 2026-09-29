import { ITEMS, ITEM_ORDER } from '../../content/items';
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
import { clear, focusFirst, h, moveFocus } from './dom';
import { EVIDENCE_IDS } from '../../game/types';

export interface PanelActions {
  resume(): void;
  save(slot: SlotId): void;
  load(slot: SlotId): void;
  newGame(): void;
  quitToTitle(): void;
  useItem(item: ItemId): void;
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
    this.stack.push({ content, narrow: !!opts.narrow, onClose: opts.onClose, refresh: opts.refresh });
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
    const top = this.stack.pop();
    top?.onClose?.();
    this.onChange?.();
    if (this.stack.length === 0) {
      this.el.classList.remove('on');
      clear(this.el);
      this.onEmpty?.();
    } else this.render();
  }

  closeAll() {
    while (this.stack.length > 0) {
      const top = this.stack.pop();
      top?.onClose?.();
    }
    this.el.classList.remove('on');
    clear(this.el);
    this.onChange?.();
    this.onEmpty?.();
  }

  private render(focus = true) {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    clear(this.el);
    const panel = h('div', { class: `panel glass${top.narrow ? ' narrow' : ''}`, role: 'dialog' }, top.content);
    this.el.append(panel);
    this.el.classList.add('on');
    if (focus) focusFirst(panel);
  }

  navigate(dx: number, dy: number) {
    moveFocus(this.el, dx, dy);
  }

  activateFocused() {
    (document.activeElement as HTMLElement | null)?.click();
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

const closeBtn = (ctx: PanelCtx, label = S('menu.close')) => h('button', { class: 'btn', 'data-nav': true, onClick: () => ctx.host.back() }, label);

/* ---------------------------------------------------------------- journal */

export function journalPanel(ctx: PanelCtx): HTMLElement {
  const s = ctx.game.state;
  const j = buildJournal(s);
  const col = (title: string, items: { key: string; params?: Record<string, string | number> }[], cls = '') =>
    h(
      'div',
      { class: 'jcol' },
      h('h2', {}, title),
      items.length === 0 ? h('div', { class: 'muted' }, S('journal.empty')) : items.map((e) => h('p', { class: `jitem ${cls}` }, S(e.key, e.params))),
    );
  const places = j.places.map((p) => h('div', { class: 'row split' }, h('span', {}, S(`place.${p.id}`)), h('span', { class: 'muted' }, S(`journal.place.${p.status}`))));
  const people = j.people
    .filter((p) => p.met || !p.available)
    .map((p) => {
      const def = NPCS[p.npc];
      return h('div', { class: 'jitem' }, h('div', {}, `${def.name} — ${S(def.titleKey)}`), h('div', { class: 'muted' }, p.available ? S(def.sleepsKey) : S('journal.person.absent')));
    });
  return h(
    'div',
    {},
    h('h1', {}, S('journal.title')),
    h('p', { class: 'sub' }, S(j.statusKey)),
    j.leadKey ? h('p', { class: 'jitem' }, S(j.leadKey)) : null,
    h('div', { class: 'cols3' }, col(S('journal.observed'), j.observed), col(S('journal.reported'), j.reported), col(S('journal.concluded'), j.concluded)),
    j.questions.length > 0 ? h('div', { class: 'jcol', style: { marginTop: '14px' } }, h('h2', {}, S('journal.questions')), j.questions.map((q) => h('p', { class: 'jitem q' }, S(q.key)))) : null,
    h('div', { class: 'cols3', style: { marginTop: '14px' } }, h('div', { class: 'jcol' }, h('h2', {}, S('journal.places')), places), h('div', { class: 'jcol', style: { gridColumn: 'span 2' } }, h('h2', {}, S('journal.people')), people.length ? people : h('div', { class: 'muted' }, S('journal.empty')))),
    h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx)),
  );
}

/* -------------------------------------------------------------- inventory */

export function inventoryPanel(ctx: PanelCtx): HTMLElement {
  const s = ctx.game.state;
  const rows = ITEM_ORDER.filter((id) => (s.inventory[id] ?? 0) > 0).map((id) => {
    const def = ITEMS[id];
    const n = s.inventory[id] ?? 0;
    return h(
      'div',
      { class: 'inv-item' },
      h('div', {}, h('strong', {}, S(def.nameKey)), h('div', { class: 'muted' }, S(def.descKey))),
      h('span', { class: 'badge' }, `×${n}`),
      id === 'poultice' ? h('button', { class: 'btn', 'data-nav': true, onClick: () => ctx.actions.useItem('poultice') }, S('inv.use')) : h('span'),
    );
  });
  const skills = s.skills.map((k) => h('div', { class: 'jitem' }, h('strong', {}, S(`skill.${k}`)), h('div', { class: 'muted' }, S(`skill.${k}.desc`))));
  return h(
    'div',
    {},
    h('h1', {}, S('inv.title')),
    rows.length ? rows : h('p', { class: 'muted' }, S('inv.empty')),
    h('h2', {}, S('inv.skills')),
    skills.length ? skills : h('p', { class: 'muted' }, S('inv.noskills')),
    h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx)),
  );
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
          h('div', { class: 'row', style: { marginTop: '6px' } }, h('button', { class: `btn primary${disabled ? ' disabled' : ''}`, 'data-nav': true, onClick: () => (disabled || committedAlready ? null : showCommitConfirm(ctx, a)) }, S(`sluice.alloc.${a}`))),
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
  return h(
    'div',
    {},
    h('h1', {}, S('game.title')),
    h(
      'div',
      { class: 'menu-list' },
      b(S('menu.resume'), () => ctx.actions.resume(), true),
      b(S('menu.save'), () => ctx.host.push(slotsPanel(ctx, 'save'))),
      b(S('menu.load'), () => ctx.host.push(slotsPanel(ctx, 'load'))),
      b(S('journal.title'), () => ctx.host.push(journalPanel(ctx))),
      b(S('menu.settings'), () => ctx.host.push(settingsPanel(ctx))),
      b(S('menu.controls'), () => ctx.host.push(controlsPanel(ctx))),
      b(S('menu.quit'), () => ctx.actions.quitToTitle()),
    ),
  );
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
        h('button', { class: `btn${mode === 'load' && !l.ok ? ' disabled' : ''}`, 'data-nav': true, onClick: () => (mode === 'save' ? ctx.actions.save(slot) : l.ok ? ctx.actions.load(slot) : null) }, mode === 'save' ? S('menu.save') : S('menu.load')),
        // Deleting is only offered for a damaged slot, and asks first (a healthy save is overwritten from Save instead).
        !res.ok && res.kind === 'corrupt'
          ? (() => {
              const b = h('button', { class: 'btn danger', 'data-nav': true }, S('menu.delete'));
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
  return h('div', {}, h('h1', {}, S('menu.about')), h('p', {}, S('about.body')), h('div', { class: 'row', style: { marginTop: '14px' } }, closeBtn(ctx, S('menu.back'))));
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
      { class: 'setting' },
      h('label', { for: `s-${String(key)}` }, label),
      h('input', { id: `s-${String(key)}`, type: 'checkbox', 'data-nav': true, checked: st[key] === true ? true : null, onChange: (e: Event) => {
        (st[key] as boolean) = (e.target as HTMLInputElement).checked;
        commit();
      } }),
      desc ? h('div', { class: 'desc' }, desc) : null,
    );
  const range = (label: string, get: () => number, set: (v: number) => void, min: number, max: number, step: number, fmt: (v: number) => string) => {
    const out = h('span', { class: 'muted' }, fmt(get()));
    const input = h('input', { type: 'range', min, max, step, value: get(), 'data-nav': true, 'aria-label': label });
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
    { 'data-nav': true, 'aria-label': S('set.quality'), onChange: (e: Event) => {
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
      h('button', { class: 'btn', 'data-nav': true, onClick: () => {
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
    const btn = h('button', { class: 'btn', 'data-nav': true, 'aria-label': `${S(`action.${action}`)} ${idx + 1}` }, label(idx));
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
