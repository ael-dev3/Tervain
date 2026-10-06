import { S } from '../../content/strings';
import { h, clear } from './dom';
import { icon } from './icons';
import { resourceFraction } from './uiModel';
import type { ItemId } from '../../game/types';
import { QuickSlotBar } from './hotbar';

export interface HudData {
  health: number;
  maxHealth: number;
  stamina: number;
  exhausted: boolean;
  coin: number;
  quickSlots: readonly (ItemId | null)[];
  inventory: Partial<Record<ItemId, number>>;
  equippedWeapon: ItemId | null;
  timeText: string;
  objective: string | null;
  fps: string | null;
  blocking: boolean;
  /** View heading in world radians: zero looks toward positive Z (south on the map). */
  heading?: number;
  accessKeys?: Partial<Record<'inventory' | 'journal' | 'map', string>>;
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface Tag {
  id: string;
  x: number;
  y: number;
  text: string;
  frac?: number;
}

export interface HuntingHudData {
  bowEquipped: boolean;
  aiming: boolean;
  drawing: boolean;
  drawFraction: number;
  arrows: number;
  aimKey?: string;
  drawKey?: string;
  skinKey?: string;
  carcassName?: string | null;
  canSkin?: boolean;
  skinUnavailable?: string | null;
  /** Present only during the timed skinning action. The same button then cancels it. */
  skinProgress?: number | null;
}

export class Hud {
  readonly el: HTMLElement;
  private healthFill: HTMLElement;
  private healthBar: HTMLElement;
  private healthValue: HTMLElement;
  private staminaBar: HTMLElement;
  private staminaFill: HTMLElement;
  private staminaValue: HTMLElement;
  private compassNeedle: HTMLElement;
  private guard: HTMLElement;
  private hotbar: QuickSlotBar;
  private accessHints: HTMLElement;
  onQuickSlotActivate: ((slot: number) => void) | null = null;
  onAssignQuickSlot: ((slot: number, item: ItemId | null) => void) | null = null;
  onSwapQuickSlots: ((from: number, to: number) => void) | null = null;
  onSkin: (() => void) | null = null;
  private coinEl: HTMLElement;
  private timeEl: HTMLElement;
  private objWrap: HTMLElement;
  private objText: HTMLElement;
  private fpsEl: HTMLElement;
  private promptEl: HTMLElement;
  private channelEl: HTMLElement;
  private channelLabel: HTMLElement;
  private channelFill: HTMLElement;
  private bowReticle: HTMLElement;
  private bowReadout: HTMLElement;
  private bowDrawFill: HTMLElement;
  private bowDrawBar: HTMLElement;
  private bowHint: HTMLElement;
  private skinPanel: HTMLElement;
  private skinName: HTMLElement;
  private skinButton: HTMLButtonElement;
  private skinHint: HTMLElement;
  private skinBar: HTMLElement;
  private skinFill: HTMLElement;
  private toasts: HTMLElement;
  private captions: HTMLElement;
  private bubbles: HTMLElement;
  private threat: HTMLElement;
  private vignette: HTMLElement;
  readonly fade: HTMLElement;
  private bubbleEls = new Map<string, HTMLElement>();
  private tagEls = new Map<string, HTMLElement>();
  private lastPrompt = '';
  private lastToast = '';
  private lastToastAt = 0;

  constructor() {
    this.healthFill = h('i');
    this.staminaFill = h('i');
    this.healthValue = h('span', { class: 'meter-value' });
    this.staminaValue = h('span', { class: 'meter-value' });
    this.healthBar = h('div', { class: 'bar health', role: 'progressbar', 'aria-label': S('hud.health'), 'aria-valuemin': 0 }, this.healthFill, h('span', { class: 'meter-label' }, S('hud.health')), this.healthValue);
    this.staminaBar = h('div', { class: 'bar stamina', role: 'progressbar', 'aria-label': S('hud.stamina'), 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.staminaFill, h('span', { class: 'meter-label' }, S('hud.stamina')), this.staminaValue);
    this.guard = h('div', { class: 'guard-state', 'aria-live': 'polite' }, S('action.block'));
    const bars = h('div', { class: 'hud-bars' }, this.guard, this.healthBar, this.staminaBar);
    this.objText = h('div', { class: 'obj-text' });
    this.objWrap = h('div', { class: 'hud-top-left surface-soot' }, h('div', { class: 'obj-title' }, S('hud.objective')), this.objText);
    this.coinEl = h('div', { class: 'coin' });
    this.timeEl = h('div', {});
    const topRight = h('div', { class: 'hud-top-right' }, this.timeEl, this.coinEl);
    this.compassNeedle = h('div', { class: 'compass-needle', 'aria-hidden': 'true' }, h('i'));
    const compass = h('div', { class: 'hud-compass', role: 'img', 'aria-label': 'Compass · north' }, icon('compass'), this.compassNeedle, h('b', { class: 'compass-n' }, 'N'), h('b', { class: 'compass-s' }, 'S'), h('b', { class: 'compass-e' }, 'E'), h('b', { class: 'compass-w' }, 'W'));
    this.hotbar = new QuickSlotBar({ mode: 'activate', onActivate: (slot) => this.onQuickSlotActivate?.(slot), onAssign: (slot, item) => this.onAssignQuickSlot?.(slot, item), onSwap: (from, to) => this.onSwapQuickSlots?.(from, to) });
    this.hotbar.el.classList.add('hud-hotbar');
    this.accessHints = h('div', { class: 'hud-access-hints' });
    topRight.append(this.accessHints);
    this.fpsEl = h('div', { class: 'hud-fps surface-soot' });
    // Keep optional diagnostics in the time/purse column rather than across a wrapped objective.
    topRight.append(this.fpsEl);
    this.promptEl = h('div', { class: 'prompt surface-soot', role: 'status' });
    this.channelLabel = h('div');
    this.channelFill = h('i');
    this.channelEl = h('div', { class: 'channel surface-soot' }, this.channelLabel, h('div', { class: 'bar' }, this.channelFill));
    this.bowDrawFill = h('i');
    this.bowDrawBar = h('div', { class: 'bow-draw-bar', role: 'progressbar', 'aria-label': S('hunting.draw'), 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.bowDrawFill);
    this.bowReadout = h('div', { class: 'bow-readout' });
    this.bowReticle = h('div', { class: 'bow-reticle', hidden: true }, h('div', { class: 'bow-crosshair', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')), this.bowDrawBar, this.bowReadout);
    this.bowHint = h('div', { class: 'hunting-bow-hint surface-soot', hidden: true });
    this.skinName = h('strong', { id: 'hunting-skin-name' });
    this.skinHint = h('div', { class: 'skin-hint', id: 'hunting-skin-hint' });
    this.skinButton = h('button', {
      class: 'btn skin-button', type: 'button', 'data-nav': true, 'data-focus-key': 'skin-carcass',
      'aria-describedby': 'hunting-skin-name hunting-skin-hint', onClick: () => this.onSkin?.(),
    });
    this.skinFill = h('i');
    this.skinBar = h('div', { class: 'skin-progress bar', role: 'progressbar', hidden: true, 'aria-label': S('hunting.skinning'), 'aria-valuemin': 0, 'aria-valuemax': 100 }, this.skinFill);
    this.skinPanel = h('div', { class: 'hunting-skin surface-soot', hidden: true }, this.skinName, this.skinButton, this.skinBar, this.skinHint);
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
    this.captions = h('div', { class: 'captions', 'aria-live': 'polite' });
    this.bubbles = h('div', { class: 'bubbles' });
    this.threat = h('div', { class: 'threat' });
    this.vignette = h('div', { class: 'vignette' });
    this.fade = h('div', { class: 'fade' });
    // One flow keeps a long remapped key hint, a held action and captions from occupying the same screen position.
    const messages = h('div', { class: 'hud-messages' }, this.channelEl, this.skinPanel, this.promptEl, this.bowHint, this.captions);
    this.el = h('div', { id: 'hud', class: 'hud' }, this.vignette, this.bubbles, bars, compass, this.hotbar.el, this.objWrap, topRight, this.bowReticle, messages, this.toasts, this.threat, this.fade);
    this.el.style.display = 'none';
  }

  show(on: boolean) {
    this.el.style.display = on ? '' : 'none';
  }

  update(d: HudData) {
    const health = resourceFraction(d.health, d.maxHealth);
    const stamina = resourceFraction(d.stamina, 100);
    const maximum = Number.isFinite(d.maxHealth) ? Math.max(0, d.maxHealth) : 0;
    this.healthFill.style.width = `${health * 100}%`;
    this.staminaFill.style.width = `${stamina * 100}%`;
    this.healthValue.textContent = `${Math.round(health * maximum)} / ${Math.round(maximum)}`;
    this.staminaValue.textContent = String(Math.round(stamina * 100));
    this.healthBar.setAttribute('aria-valuemax', String(maximum));
    this.healthBar.setAttribute('aria-valuenow', String(Math.round(health * maximum)));
    this.staminaBar.setAttribute('aria-valuenow', String(Math.round(stamina * 100)));
    this.healthBar.classList.toggle('low', health <= 0.25);
    this.staminaBar.classList.toggle('exhausted', d.exhausted);
    (this.staminaBar.querySelector('.meter-label') as HTMLElement).textContent = d.exhausted ? S('hud.exhausted') : S('hud.stamina');
    this.coinEl.textContent = `${S('hud.coin')}: ${d.coin}`;
    this.guard.classList.toggle('on', d.blocking);
    if (d.heading !== undefined && Number.isFinite(d.heading)) this.compassNeedle.style.transform = `rotate(${(Math.PI - d.heading) * 180 / Math.PI}deg)`;
    this.hotbar.update(d);
    const access = `${d.accessKeys?.inventory ?? 'I'} Inventory · ${d.accessKeys?.journal ?? 'Tab'} Journal · ${d.accessKeys?.map ?? 'M'} Map`;
    if (this.accessHints.textContent !== access) this.accessHints.textContent = access;
    this.timeEl.textContent = d.timeText;
    if (d.objective) {
      this.objWrap.style.display = '';
      if (this.objText.textContent !== d.objective) this.objText.textContent = d.objective;
    } else this.objWrap.style.display = 'none';
    if (d.fps) {
      this.fpsEl.style.display = '';
      this.fpsEl.textContent = d.fps;
    } else this.fpsEl.style.display = 'none';
  }

  setPrompt(keyLabel: string | null, text?: string) {
    if (!keyLabel || !text) {
      if (this.lastPrompt) {
        this.promptEl.classList.remove('on');
        this.lastPrompt = '';
      }
      return;
    }
    const sig = `${keyLabel}|${text}`;
    if (sig === this.lastPrompt) return;
    this.lastPrompt = sig;
    clear(this.promptEl);
    this.promptEl.append(h('kbd', {}, keyLabel), text);
    this.promptEl.classList.add('on');
  }

  setChannel(label: string | null, frac = 0) {
    if (label === null) {
      this.channelEl.classList.remove('on');
      return;
    }
    this.channelEl.classList.add('on');
    this.channelLabel.textContent = label;
    this.channelFill.style.width = `${resourceFraction(frac, 1) * 100}%`;
  }

  /** Render hunting state without rebuilding the focused Skin button each frame. */
  setHunting(data: HuntingHudData | null) {
    if (!data) {
      this.bowReticle.hidden = this.bowHint.hidden = this.skinPanel.hidden = true;
      this.skinButton.disabled = true;
      return;
    }
    const arrows = Number.isFinite(data.arrows) ? Math.max(0, Math.floor(data.arrows)) : 0;
    const draw = resourceFraction(data.drawFraction, 1);
    const skinning = data.skinProgress !== undefined && data.skinProgress !== null;
    this.bowReticle.hidden = !data.bowEquipped || (!data.aiming && !data.drawing) || skinning;
    this.bowReticle.classList.toggle('drawing', data.drawing);
    this.bowReticle.classList.toggle('drawn', data.drawing && draw >= 1 && arrows > 0);
    this.bowReticle.classList.toggle('empty', arrows === 0);
    this.bowDrawBar.hidden = !data.drawing;
    this.bowDrawBar.setAttribute('aria-valuenow', String(Math.round(draw * 100)));
    this.bowDrawFill.style.width = `${draw * 100}%`;
    this.bowReadout.textContent = arrows > 0 ? S(data.drawing && draw >= 1 ? 'hunting.release' : 'hunting.ammo', { arrows }) : S('hunting.no_arrows');
    this.bowHint.hidden = !data.bowEquipped || skinning || !!data.carcassName;
    this.bowHint.textContent = S('hunting.bow_hint', { aim: data.aimKey ?? 'Right click', draw: data.drawKey ?? 'Left click', arrows });
    this.skinPanel.hidden = !data.carcassName && !skinning;
    this.skinName.textContent = skinning ? S('hunting.skinning_name', { name: data.carcassName ?? S('hunting.animal') }) : data.carcassName ?? '';
    this.skinButton.disabled = !skinning && !data.canSkin;
    const buttonLabel = S(skinning ? 'hunting.cancel_skin' : 'action.skin');
    const key = data.skinKey ?? 'V';
    const buttonText = `${key} · ${buttonLabel}`;
    if (this.skinButton.textContent !== buttonText) this.skinButton.textContent = buttonText;
    this.skinButton.setAttribute('aria-label', `${buttonLabel}${data.carcassName ? ` ${data.carcassName}` : ''} · ${key}`);
    this.skinHint.textContent = skinning ? S('hunting.skin_cancel_hint') : data.skinUnavailable ?? S('hunting.skin_hint');
    this.skinBar.hidden = !skinning;
    const progress = resourceFraction(data.skinProgress ?? 0, 1);
    this.skinBar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    this.skinFill.style.width = `${progress * 100}%`;
  }

  toast(text: string, kind: '' | 'evidence' | 'good' | 'bad' = '') {
    const now = performance.now();
    if (text === this.lastToast && now - this.lastToastAt < 1500) return;
    this.lastToast = text;
    this.lastToastAt = now;
    const el = h('div', { class: `toast surface-soot ${kind}` }, text);
    this.toasts.append(el);
    while (this.toasts.children.length > 4) this.toasts.firstElementChild?.remove();
    setTimeout(() => el.remove(), 4200 + text.length * 25);
  }

  caption(text: string) {
    const el = h('div', { class: 'caption' }, text);
    this.captions.append(el);
    while (this.captions.children.length > 3) this.captions.firstElementChild?.remove();
    setTimeout(() => el.remove(), 3200);
  }

  /** A spoken line's words, with who says them, for as long as they are heard. */
  speech(name: string, text: string, seconds: number) {
    const el = h('div', { class: 'caption speech' }, h('b', {}, name), ` ${text}`);
    this.captions.append(el);
    while (this.captions.children.length > 3) this.captions.firstElementChild?.remove();
    setTimeout(() => el.remove(), Math.max(1500, seconds * 1000 + 600));
  }

  setThreat(text: string | null) {
    this.threat.classList.toggle('on', !!text);
    if (text) this.threat.textContent = text;
  }

  setVignette(a: number) {
    this.vignette.style.opacity = String(Math.max(0, Math.min(1, a)));
  }

  /** Screen-space speech bubbles for ambient remarks. */
  setBubbles(items: Bubble[]) {
    const seen = new Set<string>();
    for (const b of items) {
      seen.add(b.id);
      let el = this.bubbleEls.get(b.id);
      if (!el) {
        el = h('div', { class: 'bubble surface-soot' }, b.text);
        this.bubbles.append(el);
        this.bubbleEls.set(b.id, el);
      }
      if (el.textContent !== b.text) el.textContent = b.text;
      el.style.left = `${b.x}px`;
      el.style.top = `${b.y}px`;
    }
    for (const [id, el] of this.bubbleEls) {
      if (!seen.has(id)) {
        el.remove();
        this.bubbleEls.delete(id);
      }
    }
  }

  setTags(items: Tag[]) {
    const seen = new Set<string>();
    for (const t of items) {
      seen.add(t.id);
      let el = this.tagEls.get(t.id);
      if (!el) {
        el = h('div', { class: 'tag' }, h('span', { class: 'tname' }, t.text), h('span', { class: 'ebar', style: { display: t.frac === undefined ? 'none' : '' } }, h('i')));
        this.bubbles.append(el);
        this.tagEls.set(t.id, el);
      }
      (el.querySelector('.tname') as HTMLElement).textContent = t.text;
      const bar = el.querySelector('.ebar i') as HTMLElement | null;
      const barWrap = el.querySelector<HTMLElement>('.ebar');
      if (barWrap) barWrap.style.display = t.frac === undefined ? 'none' : '';
      if (bar && t.frac !== undefined) bar.style.width = `${resourceFraction(t.frac, 1) * 100}%`;
      el.style.left = `${t.x}px`;
      el.style.top = `${t.y}px`;
    }
    for (const [id, el] of this.tagEls) {
      if (!seen.has(id)) {
        el.remove();
        this.tagEls.delete(id);
      }
    }
  }

  showFade(on: boolean, title?: string, body?: string) {
    clear(this.fade);
    if (title) this.fade.append(h('div', {}, h('h2', {}, title), body ? h('div', { class: 'muted' }, body) : null));
    this.fade.classList.toggle('on', on);
  }
}
