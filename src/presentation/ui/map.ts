import { S } from '../../content/strings';
import { PLACE_ORDER } from '../../game/journal';
import { hasFact } from '../../game/state';
import type { PlaceId, WorldState } from '../../game/types';
import { worldView } from '../../game/worldView';
import { PLACES, ROADS, STREAMS, WORLD } from '../../world/layout';
import type { Terrain } from '../../world/terrain';
import { h } from './dom';

const X0 = -330;
const X1 = 168;
const Z0 = -128;
const Z1 = 152;
const PX = 2.2; // canvas pixels per metre
export const MAP_W = (X1 - X0) * PX;
export const MAP_H = (Z1 - Z0) * PX;

const CLAIMED: Partial<Record<PlaceId, string>> = {
  spring_shrine: 'told_shrine',
  sluice: 'told_sluice',
  quarry: 'told_quarry',
  the_cut: 'told_cut',
  rillford: 'told_rillford',
  ford: 'told_ford_path',
  archive: 'told_archive_door',
};

const px = (x: number) => (x - X0) * PX;
const pz = (z: number) => (z - Z0) * PX;

/** A hand-drawn-style regional map built from what the player has seen and been told. */
export class MapView {
  private bg: HTMLCanvasElement | null = null;

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
        // Parchment green below, rock brown above; hachure-like shading from the slope.
        const t = Math.max(0, Math.min(1, h0 / 30));
        let r = 214 - t * 60;
        let g = 208 - t * 40;
        let b = 168 - t * 40;
        const edge = Math.max(0, Math.min(1, (inside - 0.9) / 0.15));
        r -= edge * 70;
        g -= edge * 70;
        b -= edge * 60;
        // The sea: a cool grey-green wash, deeper further out.
        if (x < -170 && h0 < 0) {
          const d = Math.min(1, -h0 / 10);
          r = 128 - d * 46;
          g = 158 - d * 44;
          b = 158 - d * 30;
        }
        const k = 1 + shade;
        const idx = (j * w + i) * 4;
        img.data[idx] = Math.max(0, Math.min(255, r * k));
        img.data[idx + 1] = Math.max(0, Math.min(255, g * k));
        img.data[idx + 2] = Math.max(0, Math.min(255, b * k));
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.bg = c;
  }

  render(canvas: HTMLCanvasElement, opts: { state: WorldState; terrain: Terrain; player: { x: number; z: number; yaw: number }; hintPlace: PlaceId | null; guidance: boolean; time: number }) {
    if (!this.bg) this.buildBackground(opts.terrain);
    canvas.width = MAP_W;
    canvas.height = MAP_H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
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
    ctx.textAlign = 'center';
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
        ctx.fillStyle = '#2a1e12';
        ctx.fillText(S(`place.${id}`), x, y - 12);
      } else {
        ctx.strokeStyle = 'rgba(58, 44, 28, 0.85)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(26, p.r * PX * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(42, 30, 18, 0.8)';
        ctx.fillText(`${S(`place.${id}`)} (${S('map.approx')})`, x, y - Math.max(30, p.r * PX * 0.9) - 6);
      }
    }

    // Suggested next stop
    if (opts.guidance && opts.hintPlace) {
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

    // Player marker (an arrow, not just colour)
    const ax = px(opts.player.x);
    const az = pz(opts.player.z);
    ctx.save();
    ctx.translate(ax, az);
    ctx.rotate(-opts.player.yaw + Math.PI);
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

    // Compass and frame
    ctx.strokeStyle = 'rgba(58, 44, 28, 0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, MAP_W - 8, MAP_H - 8);
    ctx.fillStyle = '#3a2c1c';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('N', MAP_W - 36, 40);
    ctx.beginPath();
    ctx.moveTo(MAP_W - 36, 48);
    ctx.lineTo(MAP_W - 36, 78);
    ctx.stroke();
    ctx.font = 'italic 18px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(S('map.note'), 16, MAP_H - 14);
    void WORLD;
  }

  element(): { wrap: HTMLElement; canvas: HTMLCanvasElement } {
    const canvas = h('canvas', { role: 'img', 'aria-label': S('map.title') });
    return { wrap: h('div', { class: 'map-wrap' }, canvas), canvas };
  }
}
