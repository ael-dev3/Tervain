import { S } from '../../content/strings';
import { h, clear } from './dom';

export interface DlgChoice {
  index: number;
  label: string;
  intent?: string;
  locked: boolean;
  reasons: string[];
}

export interface DlgData {
  name: string;
  title: string;
  text: string;
  choices: DlgChoice[];
}

/** Text-first conversation panel: labelled intents, visible requirements, keyboard/controller/mouse. */
export class DialogueView {
  readonly el: HTMLElement;
  private nameEl: HTMLElement;
  private titleEl: HTMLElement;
  private textEl: HTMLElement;
  private choicesEl: HTMLElement;
  private full = '';
  private shown = 0;
  private timer = 0;
  private active = false;
  private choices: DlgChoice[] = [];
  private buttons: HTMLElement[] = [];
  onChoose: ((index: number) => void) | null = null;
  onExit: (() => void) | null = null;
  onBlip: (() => void) | null = null;
  reducedMotion = false;

  constructor() {
    this.nameEl = h('div', { class: 'dlg-name' });
    this.titleEl = h('div', { class: 'dlg-title' });
    this.textEl = h('div', { class: 'dlg-text', 'aria-live': 'polite' });
    this.choicesEl = h('div', { class: 'dlg-choices', role: 'list', 'aria-label': S('dlg.choose') });
    this.el = h('div', { class: 'dialogue glass', role: 'dialog', 'aria-label': 'Conversation' }, this.nameEl, this.titleEl, this.textEl, this.choicesEl);
    this.el.addEventListener('click', (e) => {
      if (this.shown < this.full.length && !(e.target as HTMLElement).closest('.choice')) this.completeText();
    });
    document.addEventListener('keydown', this.onKey, true);
  }

  get open() {
    return this.active;
  }

  show(d: DlgData) {
    this.active = true;
    this.el.classList.add('on');
    this.nameEl.textContent = d.name;
    this.titleEl.textContent = d.title;
    this.full = d.text;
    this.choices = d.choices;
    this.shown = this.reducedMotion ? this.full.length : 0;
    this.textEl.textContent = this.full.slice(0, this.shown);
    this.renderChoices();
    const first = this.buttons.find((b) => !b.classList.contains('locked'));
    first?.focus();
  }

  hide() {
    this.active = false;
    this.el.classList.remove('on');
    clear(this.choicesEl);
    this.buttons = [];
  }

  private renderChoices() {
    clear(this.choicesEl);
    this.buttons = [];
    this.choices.forEach((c, i) => {
      const b = h(
        'button',
        {
          class: `choice${c.locked ? ' locked' : ''}`,
          'data-nav': true,
          'aria-disabled': c.locked ? 'true' : null,
          role: 'listitem',
        },
        h('span', { class: 'n' }, i + 1),
        h(
          'span',
          {},
          c.intent ? h('span', { class: 'intent' }, S(`dlg.intent.${c.intent}`)) : null,
          c.label,
          c.locked && c.reasons.length > 0 ? h('span', { class: 'req' }, `${S('hud.requires')} ${c.reasons.join(' · ')}`) : null,
        ),
      );
      b.addEventListener('click', () => this.pick(i));
      this.choicesEl.append(b);
      this.buttons.push(b);
    });
  }

  private completeText() {
    this.shown = this.full.length;
    this.textEl.textContent = this.full;
  }

  private pick(i: number) {
    const c = this.choices[i];
    if (!c) return;
    if (this.shown < this.full.length) this.completeText();
    if (c.locked) return;
    this.onChoose?.(c.index);
  }

  update(dt: number) {
    if (!this.active || this.shown >= this.full.length) return;
    this.timer += dt;
    const step = Math.floor(this.timer * 70);
    if (step > 0) {
      this.timer -= step / 70;
      const prev = this.shown;
      this.shown = Math.min(this.full.length, this.shown + step);
      this.textEl.textContent = this.full.slice(0, this.shown);
      if (Math.floor(prev / 5) !== Math.floor(this.shown / 5)) this.onBlip?.();
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.active) return;
    if (e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.onExit?.();
      return;
    }
    if (/^Digit[1-9]$/.test(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      this.pick(Number(e.code.slice(5)) - 1);
      return;
    }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'KeyS' || e.code === 'KeyW') {
      e.preventDefault();
      e.stopPropagation();
      const dir = e.code === 'ArrowDown' || e.code === 'KeyS' ? 1 : -1;
      const cur = this.buttons.indexOf(document.activeElement as HTMLElement);
      const n = this.buttons.length;
      if (n === 0) return;
      this.buttons[(cur + dir + n) % n]?.focus();
      return;
    }
    if (e.code === 'Space' && this.shown < this.full.length) {
      e.preventDefault();
      e.stopPropagation();
      this.completeText();
    }
  };

  /** Controller/button-based confirm on the focused choice. */
  confirmFocused() {
    const i = this.buttons.indexOf(document.activeElement as HTMLElement);
    if (i >= 0) this.pick(i);
    else if (this.shown < this.full.length) this.completeText();
  }

  navigate(dy: number) {
    const n = this.buttons.length;
    if (n === 0) return;
    const cur = this.buttons.indexOf(document.activeElement as HTMLElement);
    this.buttons[(cur + dy + n) % n]?.focus();
  }
}
