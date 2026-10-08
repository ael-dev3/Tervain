import { S } from '../../content/strings';
import { clear, h } from './dom';
import { LOADING_PHASES, LoadingProgress } from './loadingProgress';
import type { LoadingPhase, LoadingUpdate } from './loadingProgress';

export type LoadingMode = 'initial' | 'rebuild';
export type LoadingTip = 'explore' | 'hunt' | 'supplies';

export interface LoadingStart {
  mode: LoadingMode;
  phase?: LoadingPhase;
  tip?: LoadingTip;
}

export interface LoadingFailure {
  title?: string;
  message?: string;
  /** What actually went wrong, in small print under the message, so a report names the cause. */
  detail?: string;
  retry?: () => void | Promise<void>;
  retryLabel?: string;
  back?: () => void;
  backLabel?: string;
}

let screenId = 0;

/** Original parchment/sepia chart and bronze work bar, informed by the repository's Gothic 3 interface study. */
export class LoadingScreen {
  readonly el: HTMLElement;
  readonly progress: LoadingProgress;
  private readonly id = `loading-${++screenId}`;
  private mode: LoadingMode = 'initial';
  private focusBefore: HTMLElement | null = null;
  private status!: HTMLElement;
  private detail!: HTMLElement;
  private count!: HTMLElement;
  private bar!: HTMLElement;
  private segments: HTMLElement[] = [];
  private failed = false;
  private retry: HTMLButtonElement | null = null;
  private controls: HTMLButtonElement[] = [];
  private errorCard: HTMLElement | null = null;

  get retryButton(): HTMLButtonElement | null { return this.retry; }

  constructor(el: HTMLElement = h('div', { class: 'loading', style: { zIndex: '6' } }), phases = LOADING_PHASES as readonly LoadingPhase[]) {
    this.el = el;
    this.el.classList.add('loading');
    this.progress = new LoadingProgress(phases);
  }

  start(options: LoadingStart) {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !this.el.contains(active)) this.focusBefore = active;
    this.mode = options.mode;
    this.failed = false;
    this.retry = null;
    this.controls = [];
    this.errorCard = null;
    this.progress.reset(options.phase);
    this.el.classList.remove('off', 'loading-failed');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-modal');
    this.el.removeAttribute('aria-describedby');
    this.el.removeAttribute('aria-labelledby');
    this.el.setAttribute('aria-label', S(`loading.title.${this.mode}`));
    this.el.setAttribute('aria-busy', 'true');
    clear(this.el);
    const title = h('h1', { class: 'loading-title', id: `${this.id}-title` }, S('game.title'));
    this.status = h('p', { class: 'loading-status', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this.detail = h('p', { class: 'loading-detail' });
    this.count = h('span', { class: 'loading-count', 'aria-hidden': 'true' });
    this.bar = h('div', { class: 'loading-bar', role: 'progressbar' });
    this.segments = this.progress.phases.map(() => h('span', { class: 'loading-segment', 'aria-hidden': 'true' }, h('span', { class: 'loading-fill' })));
    this.bar.append(...this.segments);
    this.el.append(h('section', { class: 'loading-page', 'aria-labelledby': `${this.id}-title` },
      h('header', { class: 'loading-heading' }, h('p', { class: 'loading-kicker' }, S(`loading.title.${this.mode}`)), title),
      createJourneyChart(),
      h('div', { class: 'loading-work' }, h('div', { class: 'loading-status-line' }, this.status, this.count), this.bar, this.detail),
      h('aside', { class: 'loading-tip' }, h('p', { class: 'loading-tip-label' }, S('loading.tip.label')),
        h('p', {}, S(`loading.tip.${options.tip ?? 'explore'}`)))));
    this.render();
  }

  update(update: LoadingUpdate) {
    if (this.failed || !this.status) return;
    this.progress.update(update);
    this.render();
  }

  /** Returns Retry for the app's existing controller navigation and held-confirmation guard. */
  fail(options: LoadingFailure): HTMLButtonElement | null {
    this.failed = true;
    this.el.classList.remove('off');
    this.el.classList.add('loading-failed');
    this.el.setAttribute('role', 'alertdialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-busy', 'false');
    this.el.setAttribute('aria-labelledby', `${this.id}-failure-title`);
    this.el.setAttribute('aria-describedby', `${this.id}-failure-message`);
    this.el.removeAttribute('aria-label');
    clear(this.el);
    const retry = options.retry ? h('button', { class: 'btn primary', 'data-nav': '', onClick: async () => {
      if (!retry || retry.disabled) return;
      retry.disabled = true;
      try { await options.retry!(); }
      finally {
        retry.disabled = false;
        if (retry.isConnected && this.failed) retry.focus();
      }
    } }, options.retryLabel ?? S('loading.retry')) : null;
    const back = options.back ? h('button', { class: 'btn', 'data-nav': '', onClick: options.back }, options.backLabel ?? S('menu.back')) : null;
    this.retry = retry;
    this.controls = [retry, back].filter((button): button is HTMLButtonElement => !!button);
    const card = h('section', { class: 'loading-error', tabindex: '-1' },
      h('p', { class: 'loading-kicker' }, S('game.title')),
      h('h1', { id: `${this.id}-failure-title` }, options.title ?? S(`loading.failure.${this.mode}.title`)),
      h('p', { id: `${this.id}-failure-message` }, options.message ?? S(`loading.failure.${this.mode}.message`)),
      options.detail ? h('p', { class: 'loading-error-detail' }, options.detail) : null,
      h('div', { class: 'loading-error-actions' }, retry, back));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      this.navigate(event.shiftKey ? -1 : 1, 0);
    });
    this.errorCard = card;
    this.el.append(card);
    (retry ?? back ?? card).focus();
    return retry;
  }

  /** Recovery owns controller navigation; the paused title and world never receive these presses. */
  navigate(dx: number, dy: number) {
    if (!this.failed || (dx === 0 && dy === 0)) return;
    const controls = this.controls.filter((button) => !button.disabled && button.isConnected);
    if (!controls.length) { this.errorCard?.focus(); return; }
    const index = controls.indexOf(document.activeElement as HTMLButtonElement);
    const step = Math.sign(dy || dx);
    controls[index < 0 ? 0 : (index + step + controls.length) % controls.length]?.focus();
  }

  confirm() {
    if (!this.failed) return;
    const controls = this.controls.filter((button) => !button.disabled && button.isConnected);
    const focused = document.activeElement as HTMLButtonElement;
    (controls.includes(focused) ? focused : controls[0])?.click();
  }

  finish(restoreFocus = true) {
    this.el.classList.add('off');
    this.el.setAttribute('aria-busy', 'false');
    this.el.removeAttribute('role');
    this.el.removeAttribute('aria-modal');
    this.el.removeAttribute('aria-label');
    this.el.removeAttribute('aria-labelledby');
    this.el.removeAttribute('aria-describedby');
    this.retry = null;
    this.controls = [];
    this.errorCard = null;
    if (restoreFocus && this.focusBefore?.isConnected && !this.focusBefore.closest('[inert], [hidden]')) this.focusBefore.focus();
    this.focusBefore = null;
  }

  private render() {
    const snapshot = this.progress.snapshot;
    const label = S(`loading.phase.${snapshot.phase}`);
    this.status.textContent = label;
    this.detail.textContent = snapshot.detail ?? (this.mode === 'rebuild' ? S('loading.rebuild.paused') : '');
    const count = snapshot.completed !== null && snapshot.total !== null
      ? S('loading.count', { completed: snapshot.completed, total: snapshot.total }) : '';
    this.count.textContent = count;
    this.bar.setAttribute('aria-label', label);
    this.bar.setAttribute('aria-valuetext', count ? `${label}: ${count}` : label);
    if (snapshot.completed !== null && snapshot.total !== null) {
      this.bar.setAttribute('aria-valuemin', '0');
      this.bar.setAttribute('aria-valuemax', String(snapshot.total));
      this.bar.setAttribute('aria-valuenow', String(snapshot.completed));
    } else {
      this.bar.removeAttribute('aria-valuemin');
      this.bar.removeAttribute('aria-valuemax');
      this.bar.removeAttribute('aria-valuenow');
    }
    this.segments.forEach((segment, index) => {
      segment.classList.toggle('complete', index < snapshot.index);
      segment.classList.toggle('active', index === snapshot.index);
      segment.classList.toggle('indeterminate', index === snapshot.index && snapshot.fraction === null);
      const fraction = index < snapshot.index ? 1 : index === snapshot.index ? snapshot.fraction ?? 0 : 0;
      segment.style.setProperty('--loading-fill', String(fraction));
    });
  }
}

function createJourneyChart(): HTMLElement {
  // An original illustrative chart, deliberately approximate rather than revealing unvisited map locations.
  const chart = h('div', { class: 'loading-chart', 'aria-hidden': 'true', html: `<svg viewBox="0 0 760 275" xmlns="http://www.w3.org/2000/svg" fill="none">
    <g stroke="currentColor" stroke-width="1.4" opacity=".3">
      <path d="M36 247C65 191 63 146 112 117S184 105 224 58 274 12 327 24M47 266C82 206 77 159 126 133S199 114 238 67 285 29 332 36M27 204C41 159 48 126 80 98S138 92 179 47 217 9 247 8"/>
      <path d="M373 24C386 67 367 93 406 127S465 153 488 196 522 222 552 252M397 20C414 67 391 87 428 116S491 143 512 189 548 218 575 253M426 20C440 53 426 85 450 101S515 131 537 173 570 209 610 251"/>
      <path d="M475 29C528 49 561 21 605 56S647 102 698 109M489 13C541 33 574 9 621 42S659 88 723 94"/>
    </g>
    <g stroke="currentColor" stroke-width="2" opacity=".65">
      <path d="M151 236C193 204 172 154 223 142S302 135 320 95 350 74 386 83 421 67 455 71 509 89 541 103 563 117 590 118" stroke-dasharray="5 7"/>
      <path d="M584 122l17-17 17 17v31h-34zM580 125l21-23 21 23M595 153v-15h12v15M641 134l14-14 14 14v24h-28zM637 136l18-19 18 19M634 179l50 8M576 170l44 7"/>
      <path d="M92 214l20-11 21 8-1 8-32 1zM109 203l-2-25 14 16-12 2M80 239l61 1M72 247l73 2M86 256l44 1"/>
      <path d="M328 91l-12 24h7l-14 24h36l-13-24h8zM328 139v11M367 116l-11 23h7l-14 25h35l-12-25h7zM367 164v9M398 104l-12 24h7l-13 23h33l-11-23h7zM398 151v11M295 143l-10 19h6l-12 22h32l-12-22h6zM295 184v8"/>
      <path d="M698 45v42M678 65h40M689 56l18 18M706 56l-17 18M698 41l-4 11h8z"/>
    </g>
    <g fill="currentColor" opacity=".42"><circle cx="222" cy="143" r="3"/><circle cx="455" cy="71" r="3"/></g>
  </svg>` });
  return chart;
}
