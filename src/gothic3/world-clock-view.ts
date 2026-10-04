import { loadOriginalWorldClock, monotonicClockMilliseconds } from './world-clock';
import type { NativeClockConsumer, NativeWorldClock } from './world-clock';

/** An isolated instance: source inspection never resumes the game session. */
export async function showOriginalWorldClock(parent: HTMLElement, lifetime: AbortSignal): Promise<void> {
  const view = document.createElement('section');
  parent.append(view);
  const stopped = (): boolean => lifetime.aborted || !view.isConnected;
  view.textContent = 'Reading original clock…';
  try {
    let clock: NativeWorldClock = await loadOriginalWorldClock(
      monotonicClockMilliseconds(() => performance.now()), 24);
    if (stopped()) return;
    view.replaceChildren();
    const description = document.createElement('p');
    description.textContent = 'Run an isolated copy of the original world clock. It starts paused at noon, with 12 game seconds per real second. NPCs, quests, weather and audio are not advanced by this view.';
    const calendar = document.createElement('p');
    calendar.setAttribute('aria-label', 'Original clock calendar');
    const status = document.createElement('p');
    const consumers = document.createElement('p');
    const warning = document.createElement('p');
    warning.className = 'warnings';
    const controls = document.createElement('div');
    controls.className = 'landscape-choices';
    const run = document.createElement('button'); run.textContent = 'Run clock';
    const pause = document.createElement('button'); pause.textContent = 'Pause clock';
    const step = document.createElement('button'); step.textContent = 'Read next clock frame';
    const reset = document.createElement('button'); reset.textContent = 'Reset clock';
    controls.append(run, pause, step, reset);
    const precision = document.createElement('p');
    precision.textContent = 'This instance selects the native FPUAdmin default of 24-bit arithmetic and the browser’s monotonic millisecond counter. The running native game’s FPU control word was not captured. Its calendar values feed quest timestamps only after a complete session is integrated.';
    view.append(description, calendar, status, consumers, warning, controls, precision);
    let pending: NativeClockConsumer[] = [];
    let resetting = false;
    let timer: number | null = null;
    function stop(): void {
      clock.pause();
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      lifetime.removeEventListener('abort', stop);
      run.disabled = pause.disabled = step.disabled = reset.disabled = true;
    }
    function draw(): void {
      const snapshot = clock.snapshot(), date = snapshot.calendar;
      const time = [date.hour, date.minute, date.second].map(v => String(v).padStart(2, '0')).join(':');
      calendar.textContent = 'Year ' + date.year + ' · Day ' + date.day + ' · ' + time;
      status.textContent = (snapshot.paused ? 'Paused' : 'Running') + ' · factor ' + snapshot.adjustment.factor +
        ' · seconds within day ' + snapshot.timeAndDate.seconds;
      consumers.textContent = pending.length ? 'Unapplied clock notifications: ' + pending.map(v => v.kind).join(' → ') :
        'Clock notifications have not been executed.';
      run.disabled = resetting || !snapshot.paused;
      pause.disabled = resetting || snapshot.paused;
      step.disabled = resetting;
      reset.disabled = resetting;
    }
    function process(): void {
      if (stopped()) { stop(); return; }
      const result = clock.process();
      if (result.kind !== 'applied') {
        warning.textContent = 'Clock stopped: ' + result.reason;
        clock.pause();
      } else {
        pending = result.value.consumers;
        warning.textContent = '';
      }
      draw();
    }
    run.onclick = () => {
      if (stopped()) return;
      const result = clock.resume();
      if (result.kind !== 'applied') warning.textContent = result.reason;
      else process();
      draw();
    };
    pause.onclick = () => {
      if (stopped()) return;
      const result = clock.pause();
      if (result.kind !== 'applied') warning.textContent = result.reason;
      draw();
    };
    step.onclick = () => process();
    reset.onclick = () => {
      if (stopped()) return;
      resetting = true;
      clock.pause();
      draw();
      void loadOriginalWorldClock(monotonicClockMilliseconds(() => performance.now()), 24).then(value => {
        if (stopped()) return;
        clock = value;
        pending = [];
        warning.textContent = '';
      }).catch(error => {
        if (!stopped()) warning.textContent = 'Clock reset could not load: ' + String(error);
      }).finally(() => {
        resetting = false;
        if (!stopped()) draw();
      });
    };
    lifetime.addEventListener('abort', stop, { once: true });
    timer = window.setInterval(() => {
      if (stopped()) { stop(); return; }
      if (!resetting && !clock.isPaused()) process();
    }, 250);
    draw();
  } catch (error) {
    if (!stopped()) view.textContent = 'Original clock could not load: ' + String(error);
  }
}
