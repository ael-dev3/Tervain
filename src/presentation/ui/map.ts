import { S } from '../../content/strings';
import { PLACE_ORDER } from '../../game/journal';
import { hasFact } from '../../game/state';
import type { MapMarker, PlaceId, WorldState } from '../../game/types';
import { worldView } from '../../game/worldView';
import { PLACES, ROADS, STREAMS } from '../../world/layout';
import type { Terrain } from '../../world/terrain';
import { h } from './dom';
import { validMapMarker } from '../../game/map';
import { BIOME_IDS } from '../../world/biomes';
import { MAP_HABITATS, mapTerrainColor } from './mapTerrain';

import { MAP_BOUNDS, MAP_H, MAP_W, MAP_PIXELS_PER_METRE as PX, mapHeading, mapX as px, mapZ as pz, placeMapLabel, clampMapView, fullMapView, mapCanvasPoint, mapWorldAt, panMap, zoomMapAt, type MapViewport, type MapLabel } from './mapProjection';
export { MAP_W, MAP_H } from './mapProjection';
const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = MAP_BOUNDS;

const CLAIMED: Partial<Record<PlaceId, string>> = {
  spring_shrine: 'told_shrine',
  sluice: 'told_sluice',
  quarry: 'told_quarry',
  the_cut: 'told_cut',
  rillford: 'told_rillford',
  ford: 'told_ford_path',
  archive: 'told_archive_door',
};


type MapOptions = { state: WorldState; terrain: Terrain; player: { x: number; z: number; yaw: number }; hintPlace: PlaceId | null; guidance: boolean; time: number; reducedMotion?: boolean };

/** A hand-drawn-style regional map built from what the player has seen and been told. */
export class MapView {
  private bg: HTMLCanvasElement | null = null;
  private terrain: Terrain | null = null;
  onMarker: ((marker: MapMarker | null) => void) | null = null;
  private view: MapViewport = fullMapView();
  private target: MapViewport = fullMapView();
  private lastTime = 0;
  private opts: MapOptions | null = null;
  private status: HTMLElement | null = null;
  private places: HTMLSelectElement | null = null;
  private clearPin: HTMLButtonElement | null = null;
  private placeSignature = 'uninitialised';
  private knownPlaceIds: PlaceId[] = [];

  private knownPlaces(state: WorldState) {
    return PLACE_ORDER.filter((id) => state.discovered[id] || (CLAIMED[id] !== undefined && hasFact(state, CLAIMED[id]!)));
  }
  private centre(x: number, z: number) {
    this.target = clampMapView({ x: px(x), y: pz(z), zoom: Math.max(2, this.target.zoom) });
  }
  private syncControls(opts: MapOptions) {
    const known = this.knownPlaces(opts.state);
    const signature = known.map((id) => `${id}:${!!opts.state.discovered[id]}`).join('|');
    if (this.places && signature !== this.placeSignature) {
      const previous = this.places.value;
      this.placeSignature = signature; this.knownPlaceIds = known;
      this.places.replaceChildren(h('option', { value: '' }, 'Known places…'), ...known.map((id) => h('option', { value: id }, `${S(`place.${id}`)}${opts.state.discovered[id] ? '' : ' · approximate'}`)));
      this.places.value = known.includes(previous as PlaceId) ? previous : '';
    }
    const marker = opts.state.mapMarker;
    if (this.clearPin) this.clearPin.disabled = marker === null;
    const pinText = marker ? ` · Pin ${Math.round(marker.x)}, ${Math.round(marker.z)} · ${Math.round(Math.hypot(marker.x - opts.player.x, marker.z - opts.player.z))} m away` : ' · No waypoint';
    const text = `${Math.round(this.target.zoom * 100)}%${pinText}`;
    if (this.status && this.status.textContent !== text) this.status.textContent = text;
  }

  private buildBackground(terrain: Terrain) {
    const w = Math.round(MAP_W / 2);
    const hgt = Math.round(MAP_H / 2);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = hgt;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, hgt);
    for (let j = 0; j < hgt; j++) {
      for (let i = 0; i < w; i++) {
        const x = X0 + (i / w) * (X1 - X0);
        const z = Z0 + (j / hgt) * (Z1 - Z0);
        const h0 = terrain.heightAt(x, z);
        const hx = terrain.heightAt(x + 2, z) - terrain.heightAt(x - 2, z);
        const hz = terrain.heightAt(x, z + 2) - terrain.heightAt(x, z - 2);
        const shade = Math.max(-0.35, Math.min(0.35, (-hx - hz) * 0.06));
        const inside = terrain.valleyRadius(x, z);
        // Regional ink follows the same overlapping habitats as the supplied tree selection,
        // while real hill shading, sea elevation and place knowledge retain their authority.
        let [r, g, b] = mapTerrainColor(x, z, h0);
        const edge = Math.max(0, Math.min(1, (inside - 0.9) / 0.15));
        if (!(x < -170 && h0 < 0)) {
          r -= edge * 70;
          g -= edge * 70;
          b -= edge * 60;
        }
        const grain = (Math.sin(i * 72.3 + j * 27.9) * 0.5 + Math.sin(i * 0.021 + j * 0.015) * 0.5) * 0.016;
        const contour = h0 > 2 && Math.abs(h0 / 6 - Math.round(h0 / 6)) < 0.024 ? -0.08 : 0;
        const k = 1 + shade * 0.6 + grain + contour;
        const idx = (j * w + i) * 4;
        img.data[idx] = Math.max(0, Math.min(255, r * k));
        img.data[idx + 1] = Math.max(0, Math.min(255, g * k));
        img.data[idx + 2] = Math.max(0, Math.min(255, b * k));
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.bg = c;
    this.terrain = terrain;
  }

  render(canvas: HTMLCanvasElement, opts: MapOptions) {
    this.opts = opts;
    const now = performance.now();
    const dt = this.lastTime ? Math.min(.05, (now - this.lastTime) / 1000) : .05;
    this.lastTime = now;
    const blend = opts.reducedMotion ? 1 : 1 - Math.exp(-dt * 18);
    this.view = clampMapView({ x: this.view.x + (this.target.x - this.view.x) * blend, y: this.view.y + (this.target.y - this.view.y) * blend, zoom: this.view.zoom + (this.target.zoom - this.view.zoom) * blend });
    this.syncControls(opts);
    if (!this.bg || this.terrain !== opts.terrain) this.buildBackground(opts.terrain);
    if (canvas.width !== MAP_W) canvas.width = MAP_W;
    if (canvas.height !== MAP_H) canvas.height = MAP_H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    ctx.translate(MAP_W / 2, MAP_H / 2);
    ctx.scale(this.view.zoom, this.view.zoom);
    ctx.translate(-this.view.x, -this.view.y);
    ctx.drawImage(this.bg!, 0, 0, MAP_W, MAP_H);
    const view = worldView(opts.state);

    // Roads
    ctx.strokeStyle = 'rgba(120, 88, 50, 0.85)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of ROADS) {
      ctx.lineWidth = Math.max(2, r.width * 0.9);
      ctx.setLineDash(r.width > 3 ? [] : [10, 7]);
      ctx.beginPath();
      r.points.forEach((p, i) => (i === 0 ? ctx.moveTo(px(p.x), pz(p.z)) : ctx.lineTo(px(p.x), pz(p.z))));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Water: running channels are blue; dry ones are drawn as a dashed mud line.
    for (const s of STREAMS) {
      const flow = s.id === 'main' ? view.flow.main : s.id === 'village' ? view.flow.village : view.flow.quarry;
      const running = flow > 0.18;
      ctx.strokeStyle = running ? 'rgba(52, 118, 150, 0.95)' : 'rgba(120, 96, 66, 0.9)';
      ctx.lineWidth = s.id === 'main' ? 6 : 4;
      ctx.setLineDash(running ? [] : [4, 6]);
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(px(p.x), pz(p.z)) : ctx.lineTo(px(p.x), pz(p.z))));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Places
    ctx.font = 'italic 20px Georgia, serif';
    ctx.textAlign = 'left';
    const occupied: MapLabel[] = [];
    for (const id of PLACE_ORDER) {
      const p = PLACES[id];
      const discovered = opts.state.discovered[id] === true;
      const claimedKey = CLAIMED[id];
      const claimed = !discovered && claimedKey !== undefined && hasFact(opts.state, claimedKey);
      if (!discovered && !claimed) continue;
      const x = px(p.x);
      const y = pz(p.z);
      if (discovered) {
        ctx.fillStyle = '#3a2c1c';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        const text = S(`place.${id}`);
        const label = placeMapLabel(x, y, ctx.measureText(text).width, occupied);
        occupied.push(label);
        ctx.fillStyle = '#2a1e12';
        ctx.fillText(text, label.x, label.y + 19);
      } else {
        ctx.strokeStyle = 'rgba(58, 44, 28, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(26, p.r * PX * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        const text = `${S(`place.${id}`)} (${S('map.approx')})`;
        const label = placeMapLabel(x, y - p.r * PX * 0.7, ctx.measureText(text).width, occupied);
        occupied.push(label);
        ctx.fillStyle = 'rgba(42, 30, 18, 0.9)';
        ctx.fillText(text, label.x, label.y + 19);
      }
    }

    // Suggested next stop
    if (opts.guidance && opts.hintPlace && this.knownPlaces(opts.state).includes(opts.hintPlace)) {
      const p = PLACES[opts.hintPlace];
      // A fixed map annotation reads like a route note and stays legible with motion reduced.
      ctx.strokeStyle = '#6f3428';
      ctx.fillStyle = 'rgba(111, 52, 40, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px(p.x), pz(p.z), 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // A personal pin is a note, not discovery or a navigable route guarantee.
    const marker = opts.state.mapMarker;
    if (marker) {
      ctx.save(); ctx.translate(px(marker.x), pz(marker.z));
      ctx.strokeStyle = '#682d20'; ctx.fillStyle = '#fff1c8'; ctx.lineWidth = 2 / this.view.zoom;
      ctx.beginPath(); ctx.arc(0, -8 / this.view.zoom, 6 / this.view.zoom, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -2 / this.view.zoom); ctx.lineTo(0, 9 / this.view.zoom); ctx.stroke();
      ctx.restore();
    }

    // Player marker (an arrow, not just colour)
    const ax = px(opts.player.x);
    const az = pz(opts.player.z);
    ctx.save();
    ctx.translate(ax, az);
    ctx.rotate(mapHeading(opts.player.yaw));
    ctx.fillStyle = '#b02a20';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(9, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Compass and frame
    ctx.strokeStyle = 'rgba(58, 44, 28, 0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, MAP_W - 8, MAP_H - 8);
    ctx.fillStyle = '#3a2c1c';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('N', MAP_W - 36, 40);
    ctx.beginPath();
    ctx.moveTo(MAP_W - 36, 48);
    ctx.lineTo(MAP_W - 36, 78);
    ctx.stroke();
    ctx.font = 'italic 18px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(S('map.note'), 16, MAP_H - 14);
    canvas.setAttribute('aria-label', `${S('map.title')}. ${S('map.you')}: ${Math.round(opts.player.x)}, ${Math.round(opts.player.z)}. ${this.knownPlaces(opts.state).map((id) => S(`place.${id}`)).join(', ')}. ${Math.round(this.target.zoom * 100)} percent zoom. ${marker ? `Waypoint ${Math.round(marker.x)}, ${Math.round(marker.z)}.` : 'No waypoint.'}`);
  }

  element(): { wrap: HTMLElement; canvas: HTMLCanvasElement } {
    this.placeSignature = 'uninitialised'; this.lastTime = 0;
    const canvas = h('canvas', { role: 'img', tabindex: 0, 'aria-label': S('map.title'), 'aria-describedby': 'regional-map-controls' });
    const point = (event: PointerEvent | WheelEvent) => {
      return mapCanvasPoint(event.clientX, event.clientY, canvas.getBoundingClientRect());
    };
    let drag: { id: number; x: number; y: number; moved: boolean } | null = null;
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault(); event.stopPropagation();
      const p = point(event);
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1);
      this.target = zoomMapAt(this.target, this.target.zoom * Math.exp(-Math.max(-160, Math.min(160, delta)) * .0035), p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault(); canvas.focus();
      // Capture may be refused after focus/window changes. Local chart clicks and subsequent controls remain usable.
      try { canvas.setPointerCapture(event.pointerId); } catch { /* continue within the canvas without global capture */ }
      this.target = { ...this.view };
      const p = point(event); drag = { id: event.pointerId, ...p, moved: false };
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if ((event.buttons & 1) === 0) {
        const pointer = drag.id; drag = null;
        if (canvas.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
        return;
      }
      const p = point(event), dx = p.x - drag.x, dy = p.y - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) <= 6) return;
      drag.moved = true;
      this.target = panMap(this.target, dx, dy); this.view = { ...this.target };
      drag.x = p.x; drag.y = p.y;
    });
    canvas.addEventListener('pointerup', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.moved) {
        const p = point(event), marker = mapWorldAt(this.view, p.x, p.y);
        if (validMapMarker(marker)) this.onMarker?.(marker);
      }
      drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointercancel', () => { drag = null; });
    canvas.addEventListener('lostpointercapture', () => { drag = null; });
    canvas.addEventListener('keydown', (event) => {
      const delta = 70;
      const arrows: Record<string, [number, number]> = { ArrowLeft: [delta, 0], ArrowRight: [-delta, 0], ArrowUp: [0, delta], ArrowDown: [0, -delta] };
      const movement = arrows[event.code];
      if (movement) this.target = panMap(this.target, ...movement);
      else if (event.code === 'Equal' || event.code === 'NumpadAdd') this.target = zoomMapAt(this.target, this.target.zoom * 1.35);
      else if (event.code === 'Minus' || event.code === 'NumpadSubtract') this.target = zoomMapAt(this.target, this.target.zoom / 1.35);
      else if (event.code === 'Home') this.target = fullMapView();
      else if (event.code === 'Enter' || event.code === 'Space') { const marker = mapWorldAt(this.view, MAP_W / 2, MAP_H / 2); if (validMapMarker(marker)) this.onMarker?.(marker); }
      else if (event.code === 'Delete') this.onMarker?.(null);
      else return;
      event.preventDefault(); event.stopPropagation();
    });
    const button = (label: string, action: () => void, accessible = label) => h('button', { class: 'btn', type: 'button', 'data-nav': true, 'aria-label': accessible, onClick: action }, label);
    this.clearPin = button('Clear pin', () => this.onMarker?.(null));
    this.places = h('select', { 'aria-label': 'Known places', 'data-nav': true });
    const selectedPlace = () => this.knownPlaceIds.find((id) => id === this.places?.value);
    this.status = h('span', { class: 'map-status', role: 'status', 'aria-live': 'polite' });
    const controls = h('div', { class: 'map-controls' },
      button('−', () => { this.target = zoomMapAt(this.target, this.target.zoom / 1.35); }, 'Zoom out'),
      button('+', () => { this.target = zoomMapAt(this.target, this.target.zoom * 1.35); }, 'Zoom in'),
      button('Fit', () => { this.target = fullMapView(); }, 'Show full map'),
      button('You', () => { if (this.opts) this.centre(this.opts.player.x, this.opts.player.z); }, 'Centre map on you'),
      this.clearPin, this.places,
      button('Show place', () => { const id = selectedPlace(); if (id) this.centre(PLACES[id].x, PLACES[id].z); }),
      button('Pin place', () => { const id = selectedPlace(); if (id) this.onMarker?.({ x: PLACES[id].x, z: PLACES[id].z }); }));
    return { wrap: h('div', { class: 'map-record' }, controls,
      h('div', { class: 'map-wrap' }, canvas),
      h('div', { class: 'map-legend' }, h('span', { class: 'legend-player' }, `▲ ${S('map.you')}`), h('span', {}, `● ${S('journal.place.verified')}`), h('span', {}, `◌ ${S('journal.place.claimed')}`), h('span', { class: 'legend-route' }, `○ ${S('map.suggested')}`), this.status),
      h('div', { class: 'map-legend', 'aria-label': 'Habitat washes', style: { paddingTop: '4px', fontSize: '.73rem' } }, BIOME_IDS.map(id => {
        const habitat = MAP_HABITATS[id];
        return h('span', {}, h('span', { 'aria-hidden': true, style: {
          display: 'inline-block', width: '.8em', height: '.8em', marginRight: '.35em',
          backgroundColor: `rgb(${habitat.color.join(',')})`, border: '1px solid #5b4a33',
        } }), habitat.label);
      })),
      h('p', { class: 'map-caption', id: 'regional-map-controls' }, 'Scroll to zoom · drag to pan · click to pin. Keyboard: arrows to pan, +/− to zoom, Enter to pin the centre, Home to fit.')),
      canvas };
  }
}
