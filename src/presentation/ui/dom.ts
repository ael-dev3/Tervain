export type Child = Node | string | number | null | undefined | false;
import { directionalCell } from './uiModel';

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v as object);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  const add = (c: Child | Child[]) => {
    if (Array.isArray(c)) c.forEach(add);
    else if (c === null || c === undefined || c === false) return;
    else el.append(typeof c === 'number' ? String(c) : c);
  };
  children.forEach(add);
  return el;
}

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Native controls inside the visible modal, in browser Tab order. Decorations never enter this list. */
export function focusableElements(root: HTMLElement): HTMLElement[] {
  const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]';
  return [...root.querySelectorAll<HTMLElement>(selector)]
    .filter((element) => element.tabIndex >= 0 && visibleControl(element));
}

export function visibleControl(element: HTMLElement): boolean {
  return element.offsetParent !== null && !element.closest('[inert], [hidden]') && getComputedStyle(element).visibility !== 'hidden';
}

/** Move focus among `[data-nav]` elements inside root (for keyboard and controller menus). */
export function moveFocus(root: HTMLElement, dx: number, dy: number) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')].filter(visibleControl);
  if (items.length === 0) return;
  const cur = document.activeElement as HTMLElement | null;
  let i = cur ? items.indexOf(cur) : -1;
  if (i < 0) {
    items[0]!.focus();
    return;
  }
  const tablist = cur?.closest<HTMLElement>('[role="tablist"]');
  if (tablist && dx !== 0 && dy === 0) {
    const tabs = items.filter((item) => tablist.contains(item));
    const index = tabs.indexOf(cur!);
    tabs[(index + Math.sign(dx) + tabs.length) % tabs.length]?.focus();
    return;
  }
  const grid = cur?.closest<HTMLElement>('[data-nav-grid]');
  if (grid && root.contains(grid)) {
    const cells = items.filter((item) => grid.contains(item));
    const next = directionalCell(cells.map((cell) => cell.getBoundingClientRect()), cells.indexOf(cur!), dx, dy);
    if (next !== null) {
      cells[next]!.focus(); cells[next]!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    // A horizontal edge stays put; vertical traversal can still reach the filter or use/close button.
    if (dx !== 0 && dy === 0) return;
    const first = items.indexOf(cells[0]!);
    const last = items.indexOf(cells[cells.length - 1]!);
    const outside = dy < 0 ? items[first - 1] : items[last + 1];
    if (outside) { outside.focus(); outside.scrollIntoView({ block: 'nearest' }); return; }
    return;
  }
  const step = dy !== 0 ? dy : dx;
  i = (i + step + items.length) % items.length;
  items[i]!.focus();
  items[i]!.scrollIntoView({ block: 'nearest' });
}

export function focusFirst(root: HTMLElement) {
  const first = focusableElements(root)[0];
  (first ?? root).focus();
}
