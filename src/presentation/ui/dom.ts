export type Child = Node | string | number | null | undefined | false;

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
    .filter((element) => element.tabIndex >= 0 && element.offsetParent !== null && !element.closest('[inert]'));
}

/** Move focus among `[data-nav]` elements inside root (for keyboard and controller menus). */
export function moveFocus(root: HTMLElement, dx: number, dy: number) {
  const items = [...root.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')].filter((e) => e.offsetParent !== null);
  if (items.length === 0) return;
  const cur = document.activeElement as HTMLElement | null;
  let i = cur ? items.indexOf(cur) : -1;
  if (i < 0) {
    items[0]!.focus();
    return;
  }
  const step = dy !== 0 ? dy : dx;
  i = (i + step + items.length) % items.length;
  items[i]!.focus();
  items[i]!.scrollIntoView({ block: 'nearest' });
}

export function focusFirst(root: HTMLElement) {
  const first = root.querySelector<HTMLElement>('[data-nav]:not([disabled])');
  first?.focus();
}
