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
  private active = false;
  private choices: DlgChoice[] = [];
  private buttons: HTMLElement[] = [];
  onChoose: ((index: number) => void) | null = null;
  onExit: (() => void) | null = null;

  constructor() {
    this.nameEl = h('div', { class: 'dlg-name' });
    this.titleEl = h('div', { class: 'dlg-title' });
    this.textEl = h('div', { class: 'dlg-text', 'aria-live': 'polite' });
    this.choicesEl = h('div', { class: 'dlg-choices', role: 'list', 'aria-label': S('dlg.choose') });
    this.el = h('div', { class: 'dialogue surface-timber', role: 'dialog', 'aria-label': 'Conversation' }, this.nameEl, this.titleEl, this.textEl, this.choicesEl);
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
    this.choices = d.choices;
    this.textEl.textContent = d.text;
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

  private pick(i: number) {
    const c = this.choices[i];
    if (!c) return;
    if (c.locked) return;
    this.onChoose?.(c.index);
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
  };

  /** Controller/button-based confirm on the focused choice. */
  confirmFocused() {
    const i = this.buttons.indexOf(document.activeElement as HTMLElement);
    if (i >= 0) this.pick(i);
  }

  navigate(dy: number) {
    const n = this.buttons.length;
    if (n === 0) return;
    const cur = this.buttons.indexOf(document.activeElement as HTMLElement);
    this.buttons[(cur + dy + n) % n]?.focus();
  }
}
