import { S } from '../../content/strings';
import { h, clear } from './dom';

export interface HudData {
  health: number;
  maxHealth: number;
  stamina: number;
  exhausted: boolean;
  coin: number;
  poultice: number;
  timeText: string;
  objective: string | null;
  fps: string | null;
  blocking: boolean;
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

export class Hud {
  readonly el: HTMLElement;
  private healthFill: HTMLElement;
  private staminaBar: HTMLElement;
  private staminaFill: HTMLElement;
  private coinEl: HTMLElement;
  private timeEl: HTMLElement;
  private objWrap: HTMLElement;
  private objText: HTMLElement;
  private fpsEl: HTMLElement;
  private promptEl: HTMLElement;
  private channelEl: HTMLElement;
  private channelLabel: HTMLElement;
  private channelFill: HTMLElement;
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
    this.staminaBar = h('div', { class: 'bar stamina' }, this.staminaFill, h('span', {}, S('hud.stamina')));
    const bars = h('div', { class: 'hud-bars surface-soot' }, h('div', { class: 'bar health' }, this.healthFill, h('span', {}, S('hud.health'))), this.staminaBar);
    this.objText = h('div', { class: 'obj-text' });
    this.objWrap = h('div', { class: 'hud-top-left surface-soot' }, h('div', { class: 'obj-title' }, S('hud.objective')), this.objText);
    this.coinEl = h('div', { class: 'coin' });
    this.timeEl = h('div', {});
    const topRight = h('div', { class: 'hud-top-right surface-soot' }, this.timeEl, this.coinEl);
    this.fpsEl = h('div', { class: 'hud-fps surface-soot' });
    this.promptEl = h('div', { class: 'prompt surface-soot' });
    this.channelLabel = h('div');
    this.channelFill = h('i');
    this.channelEl = h('div', { class: 'channel surface-soot' }, this.channelLabel, h('div', { class: 'bar' }, this.channelFill));
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
    this.captions = h('div', { class: 'captions', 'aria-live': 'polite' });
    this.bubbles = h('div', { class: 'bubbles' });
    this.threat = h('div', { class: 'threat' });
    this.vignette = h('div', { class: 'vignette' });
    this.fade = h('div', { class: 'fade' });
    this.el = h('div', { id: 'hud', class: 'hud' }, this.vignette, this.bubbles, bars, this.objWrap, topRight, this.fpsEl, this.promptEl, this.channelEl, this.toasts, this.captions, this.threat, this.fade);
    this.el.style.display = 'none';
  }

  show(on: boolean) {
    this.el.style.display = on ? '' : 'none';
  }

  update(d: HudData) {
    this.healthFill.style.width = `${Math.max(0, Math.min(1, d.health / d.maxHealth)) * 100}%`;
    this.staminaFill.style.width = `${Math.max(0, Math.min(1, d.stamina / 100)) * 100}%`;
    this.staminaBar.classList.toggle('exhausted', d.exhausted);
    (this.staminaBar.querySelector('span') as HTMLElement).textContent = d.exhausted ? S('hud.exhausted') : S('hud.stamina');
    this.coinEl.textContent = `${S('hud.coin')}: ${d.coin}${d.poultice > 0 ? `  ·  ✚ ${d.poultice}` : ''}`;
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
    this.channelFill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
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
      if (bar && t.frac !== undefined) bar.style.width = `${Math.max(0, Math.min(1, t.frac)) * 100}%`;
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
