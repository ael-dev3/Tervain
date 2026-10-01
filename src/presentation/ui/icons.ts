import type { ItemId } from '../../game/types';

/** Original ink-and-metal silhouettes, drawn for Tervain. No reference-game pixels or assets. */
export type IconName = ItemId | 'inventory' | 'journal' | 'map' | 'compass' | 'health' | 'stamina';
const SHAPES: Record<IconName, string> = {
  coin: '<ellipse cx="29" cy="39" rx="17" ry="6"/><path d="M12 33v6m34-6v6M12 27v6m34-6v6"/><ellipse cx="29" cy="27" rx="17" ry="6"/><ellipse cx="35" cy="17" rx="17" ry="6"/><path d="M18 17v5m34-5v5"/>',
  rusted_sword: '<path d="m40 7 9-1-1 9-25 27-6-6z"/><path d="m11 31 22 20M21 41 9 53m-3-3 6 6M43 12 23 34"/>',
  sluice_brace: '<path d="M13 7h9v48h-9zm29 0h9v48h-9zM22 18h20v9H22zm0 20h20v9H22z"/>',
  gate_wrench: '<path d="m44 9 8 1-10 11 1 7 7 1L60 18l-1 11-12 12-11-2-18 18-8-8 18-18-2-11z"/>',
  archive_key: '<circle cx="22" cy="18" r="11"/><circle cx="22" cy="18" r="4"/><path d="m28 27 23 24-6 6-4-4 3-3-7-7-3 3-5-5 3-3-9-9"/>',
  votive_reed: '<path d="M29 56V19m0 20C13 37 9 24 8 17c14 0 20 8 21 15m0 13c15-3 21-13 24-23-15 3-22 9-24 16"/><path d="M26 6h6v16h-6z"/>',
  poultice: '<path d="m20 23 5-9h15l5 9 7 23c2 7-5 11-20 11s-22-4-20-11zM23 14h19M25 7l7 7 7-7M13 40h38"/><path d="M31 31v20m-9-10h19"/>',
  shore_apple: '<path d="M32 20c-19-15-35 9-22 28 7 11 13 11 22 7 9 4 15 4 22-7 13-19-3-43-22-28zM32 20l3-13m-1 7c8-10 15-8 19-6-3 7-10 11-19 6M16 29c-4 6-3 12 1 16"/>',
  bread: '<path d="M8 47c-5-13 7-29 23-35 13-5 25 0 27 12 2 13-10 29-25 33-11 3-21 0-25-10zM16 24l8 10m3-20 9 13m3-15 7 10M11 46c14 8 33-2 43-17"/>',
  healing_herb: '<path d="M31 58V15m0 24C8 38 6 28 7 18c17 0 24 10 24 21m0 9c21-1 28-12 27-23-20 2-27 10-27 23M27 5h8v14h-8zM19 52l23 0m-20 4h16"/>',
  field_mushroom: '<path d="M6 31C8 5 52 3 58 31c-14 8-36 9-52 0zM26 35l-6 20c6 6 20 6 26 0l-7-20M7 31c17-7 33-7 50 0M17 22l2-4m25 4-2-5"/>',
  iron_scrap: '<path d="m8 19 17-8 15 5 16-4-4 25-17 18-21-6zM8 19l18 9 14-12M26 28l9 27m-21-6 12-21m14-12 12 21M12 23l-1 12m25 6 10-12"/>',
  league_sash: '<path d="m11 13 12-6 30 40-12 10z"/><path d="m16 14 30 40M20 11l30 40M37 42l9-6"/>',
  contract_band: '<path d="M8 17c16-7 32-7 48 0v31c-16 7-32 7-48 0z"/><path d="M9 22c16-5 31-5 46 0M9 43c16 5 31 5 46 0M26 22h13v22H26z"/>',
  witness_cord: '<path d="M17 9c-14 34 44 14 27 43M43 9c14 34-44 14-27 43M16 52l-4 8m32-8 4 8"/><circle cx="32" cy="32" r="7"/>',
  inventory: '<path d="M10 23h44v32H10zM10 23l5-10h34l5 10-22 13zM23 13V8h18v5"/><path d="M28 29h8v14h-8zM15 45v5h34v-5"/>',
  journal: '<path d="M15 8h37v47H15c-6 0-6-10 0-10h37M15 8c-6 0-6 6-6 11v29M20 8v37m7-24h18m-18 8h15M39 8v16l-5-4-5 4V8"/>',
  map: '<path d="m6 14 17-6 19 8 16-7v41l-16 6-19-8-17 6zM23 8v40m19-32v40"/><path d="m13 36 9-11 9 9 16-11M44 20l7 0-1 7"/>',
  compass: '<circle cx="32" cy="32" r="25"/><circle cx="32" cy="32" r="4"/><path d="m32 6 5 20 17-11-16 17 16 17-17-11-5 20-5-20-17 11 16-17-16-17 17 11z"/>',
  health: '<path d="M32 55 8 30C-7 8 23 0 32 19 41 0 71 8 56 30z"/>',
  stamina: '<path d="m36 4-22 31h17l-3 25 23-34H34z"/>',
};

export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('class', `ui-icon icon-${name}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = `<g fill="currentColor" fill-opacity=".19" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">${SHAPES[name]}</g>`;
  return svg;
}
