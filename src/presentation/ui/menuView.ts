import { h } from './dom';
import { createMenuWordmark } from './menuArtwork';

/** Native controls float over the shared 3D silk courtyard; the cloth belongs to MenuScene. */
export function createMenuScreen(options: {
  menu: HTMLElement;
  subtitle: string;
  version: string;
  variant: 'title' | 'pause';
}): HTMLElement {
  options.menu.classList.add('menu-choices');
  options.menu.setAttribute('aria-label', options.variant === 'title' ? 'Main menu' : 'Pause menu');
  return h('div', { class: `menu-screen menu-${options.variant}` },
    h('div', { class: 'menu-banner' },
      h('div', { class: 'menu-banner-content' },
        h('header', { class: 'menu-heading' },
          h('h1', {}, h('span', { class: 'visually-hidden' }, 'Tervain'), createMenuWordmark()),
          h('p', { class: 'menu-subtitle' }, options.subtitle)),
        options.menu,
        h('footer', { class: 'menu-build' }, `v${options.version} · Pre-alpha`))));
}
