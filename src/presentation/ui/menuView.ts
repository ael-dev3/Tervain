import { h } from './dom';
import { createMenuWordmark } from './menuArtwork';
import { installMenuMaterials } from './menuMaterials';

/**
 * Title and pause screens over the vigil scene. The layout keeps the reference's order of things (a small line of text,
 * the cast name, the choices in a dark sunken panel, the build in small print) without copying its proportions: the
 * panel is dark oiled leather in a notched bronze frame, the choices are plain worn lettering, and a film of dust and
 * scratches lies over the whole screen. The controls are ordinary buttons, so focus, keyboard, controller and text size
 * keep working as before.
 */
export function createMenuScreen(options: {
  menu: HTMLElement;
  musicControl?: HTMLElement;
  subtitle: string;
  version: string;
  variant: 'title' | 'pause';
}): HTMLElement {
  installMenuMaterials();
  options.menu.classList.add('menu-choices');
  options.menu.setAttribute('aria-label', options.variant === 'title' ? 'Main menu' : 'Pause menu');
  const art = createMenuWordmark();
  return h('div', { class: `menu-screen menu-${options.variant}` },
    h('div', { class: 'menu-grime', 'aria-hidden': 'true' }),
    h('div', { class: 'menu-column' },
      h('header', { class: 'menu-heading' },
        h('p', { class: 'menu-kicker' }, h('span', {}, options.subtitle)),
        h('h1', { class: 'menu-mark' }, h('span', { class: art ? 'visually-hidden' : 'menu-mark-fallback' }, 'Tervain'), art)),
      h('div', { class: 'menu-well' }, options.menu),
      h('footer', { class: 'menu-build' }, h('span', {}, `v${options.version} · pre-alpha`), options.musicControl)));
}
