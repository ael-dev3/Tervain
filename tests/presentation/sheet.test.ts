import { describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { AMBIENT_PEOPLE } from '../../src/presentation/ambient';
import { createAmbientRig, createBanditRig, createNpcRig, createPlayerRig, personBuildOptions, type Rig } from '../../src/presentation/characters';
import { overrideIds, overrideUrl, setOverrides } from '../../src/presentation/human/overrides';
import { DETAIL_LAYERS, SURFACE_MATERIAL } from '../../src/presentation/human/paint';
import { fillNearest, prepareSheetImage, SHEET_BACKGROUND, sheetMisfit } from '../../src/presentation/human/raster';
import { layoutSheet, unwrapPositions, VIEW_AXES, VIEW_COUNT, VIEWS, type SheetRegion } from '../../src/presentation/human/sheet';
import { runSheetJob } from '../../src/presentation/human/sheetJob';
import { partColor, sheetTemplates } from '../../src/presentation/human/template';
import { BI, BONES, PA } from '../../src/presentation/human/skin';
import { detailPixels } from '../../src/presentation/human/humanTex';
// These tests check people's geometry, projection and paint logic, not texture resolution: paint small sheets inline.
personBuildOptions.sheetSize = 256;


/** Build with the sheet's buffers kept (inline: tests have no workers). */
function kept<T>(make: () => T): T {
  personBuildOptions.keepSheetData = true;
  try {
    return make();
  } finally {
    personBuildOptions.keepSheetData = false;
  }
}

const inside = (r: SheetRegion, px: number, py: number) => px >= r.x - 0.5 && px <= r.x + r.w + 0.5 && py >= r.y - 0.5 && py <= r.y + r.h + 0.5;

describe('the sheet: a model sheet of the person', () => {
  it('lays out four full-figure views on top and the head large and small below, inside the sheet and apart', () => {
    const layout = layoutSheet(1024, { min: [-0.7, 0, -0.3], max: [0.7, 1.85, 0.32] }, { min: [-0.1, 1.55, -0.12], max: [0.1, 1.86, 0.13] });
    expect(layout.regions.map((r) => r.name)).toEqual(['body-front', 'body-right', 'body-back', 'body-left', 'face', 'head-right', 'head-back', 'head-left', 'head-top']);
    for (const r of layout.regions) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1024);
      expect(r.y + r.h).toBeLessThanOrEqual(1024);
    }
    for (const a of layout.regions) {
      for (const b of layout.regions) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.name} / ${b.name}`).toBe(true);
      }
    }
    const body = layout.regions.filter((r) => r.set === 'body');
    // One scale and one ground line for the figure, so a turnaround drawn at one size fits.
    expect(new Set(body.map((r) => r.scale.toFixed(6))).size).toBe(1);
    expect(new Set(body.map((r) => r.y + r.h)).size).toBe(1);
    expect(body.every((r) => r.y + r.h <= 512)).toBe(true);
    const face = layout.regions.find((r) => r.name === 'face')!;
    const small = layout.regions.filter((r) => r.set === 'head' && r.name !== 'face');
    expect(face.y).toBeGreaterThanOrEqual(512);
    for (const r of small) expect(face.scale).toBeGreaterThan(r.scale * 1.9);
  });

  it('views are right-handed pictures: image right and up, with the viewer in front', () => {
    for (const v of VIEWS) {
      const { u, v: up, toward } = VIEW_AXES[v];
      // u x v = toward (a camera looking along -toward sees u to its right and v up).
      const c = [u[1] * up[2] - u[2] * up[1], u[2] * up[0] - u[0] * up[2], u[0] * up[1] - u[1] * up[0]];
      expect(c[0]).toBeCloseTo(toward[0]);
      expect(c[1]).toBeCloseTo(toward[1]);
      expect(c[2]).toBeCloseTo(toward[2]);
    }
  });

  it('unwraps with the arms lifted out to the sides and everything else at rest', () => {
    const joints = Object.fromEntries(BONES.map((b) => [b, [0, 0, 0]])) as unknown as Parameters<typeof unwrapPositions>[3];
    joints.armL = [0.2, 1.45, 0];
    joints.armR = [-0.2, 1.45, 0];
    // A hand below the left shoulder, a hand below the right, and a knee.
    const pos = new Float32Array([0.2, 0.9, 0.02, -0.2, 0.9, 0.02, 0.1, 0.5, 0]);
    const si = new Uint16Array([BI.elbowL, 0, 0, 0, BI.elbowR, 0, 0, 0, BI.kneeL, 0, 0, 0]);
    const sw = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    const u = unwrapPositions(pos, si, sw, joints, BONES, (30 * Math.PI) / 180);
    expect(u[0]).toBeGreaterThan(0.45);
    expect(u[1]).toBeGreaterThan(0.95);
    expect(u[3]).toBeLessThan(-0.45);
    expect(u[2]).toBeCloseTo(0.02);
    expect([u[6], u[7], u[8]]).toEqual([pos[6], pos[7], pos[8]]);
  });

  it('gives every vertex finite views of its own part of the sheet, weighted to one', () => {
    const rig = kept(() => createNpcRig(NPC_LIST.find((d) => d.id === 'caravan_master')!));
    const r = rig.person!.sheetData.result!;
    const job = rig.person!.sheetData.job!;
    const n = job.pos.length / 3;
    let headUsesBody = 0;
    let bodyUsesHead = 0;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let v = 0; v < VIEW_COUNT; v++) {
        const w = r.weight[i * VIEW_COUNT + v]!;
        expect(Number.isFinite(w)).toBe(true);
        expect(w).toBeGreaterThanOrEqual(0);
        sum += w;
        if (w < 0.01) continue;
        const px = r.uv[(i * VIEW_COUNT + v) * 2]! * r.layout.width;
        const py = (1 - r.uv[(i * VIEW_COUNT + v) * 2 + 1]!) * r.layout.height;
        const set = job.set[i] === 1 ? 'head' : 'body';
        const region = r.layout.regions.find((g) => g.set === set && g.view === VIEWS[v])!;
        expect(region, `${set} ${VIEWS[v]}`).toBeDefined();
        expect(inside(region, px, py)).toBe(true);
        if (set === 'head' && r.layout.regions.some((g) => g.set === 'body' && inside(g, px, py))) headUsesBody++;
        if (set === 'body' && r.layout.regions.some((g) => g.set === 'head' && inside(g, px, py))) bodyUsesHead++;
      }
      expect(sum).toBeCloseTo(1, 4);
    }
    expect(headUsesBody).toBe(0);
    expect(bodyUsesHead).toBe(0);
  });

  it('paints a face from the front and the back of the head from behind', () => {
    const rig = kept(() => createPlayerRig());
    const r = rig.person!.sheetData.result!;
    const job = rig.person!.sheetData.job!;
    const parts = rig.person!.parts;
    let front = 0;
    let back = 0;
    let eyes = 0;
    let eyeFront = 0;
    for (let i = 0; i < job.pos.length / 3; i++) {
      const surface = parts[job.part[i]!]!.surface;
      // The front of each eyeball (its local forward direction is attribute 8).
      if (surface === 'eye' && job.pa[i * PA + 8]! > 0.6) {
        eyes++;
        eyeFront += r.weight[i * VIEW_COUNT]!;
      }
      if (surface !== 'face') continue;
      const z = job.pos[i * 3 + 2]!;
      if (z > 0.06) front += r.weight[i * VIEW_COUNT]!;
      if (z < -0.06) back += r.weight[i * VIEW_COUNT + 2]!;
    }
    expect(front).toBeGreaterThan(30);
    expect(back).toBeGreaterThan(30);
    // The eyes are seen through the lids, from the front.
    expect(eyes).toBeGreaterThan(10);
    expect(eyeFront / eyes).toBeGreaterThan(0.6);
  });

  it('paints the same sheet every time, covers every region and leaves no transparent texel', () => {
    const rig = kept(() => createBanditRig(0));
    const a = rig.person!.sheetData.result!;
    const job = rig.person!.sheetData.job!;
    const b = runSheetJob({ ...job, keep: true });
    expect(b.image!.length).toBe(a.image!.length);
    expect(Buffer.from(b.image!).equals(Buffer.from(a.image!))).toBe(true);
    const W = a.layout.width;
    for (const g of a.layout.regions) {
      let covered = 0;
      for (let y = g.y; y < g.y + g.h; y++) for (let x = g.x; x < g.x + g.w; x++) covered += a.covered[y * W + x]!;
      expect(covered, g.name).toBeGreaterThan(g.w * g.h * 0.08);
    }
    for (let o = 3; o < a.image!.length; o += 4) if (a.image![o] !== 255) throw new Error(`transparent texel at ${(o - 3) / 4}`);
  });

  it('gives every part a known surface, a material and a detail layer, and every vertex a part', () => {
    const people: Rig[] = kept(() => [createPlayerRig(), ...NPC_LIST.map((d) => createNpcRig(d)), createBanditRig(0), createBanditRig(1), ...AMBIENT_PEOPLE.map((p) => createAmbientRig(p.look, p.style))]);
    const ids = new Set<string>();
    for (const rig of people) {
      const p = rig.person!;
      ids.add(p.id);
      for (const spec of p.parts) {
        const [rough, metal, layer] = SURFACE_MATERIAL[spec.surface];
        expect(rough).toBeGreaterThan(0);
        expect(metal).toBeGreaterThanOrEqual(0);
        expect(DETAIL_LAYERS).toContain(layer);
      }
      const job = p.sheetData.job!;
      for (let i = 0; i < job.part.length; i++) expect(job.part[i]!).toBeLessThan(p.parts.length);
      for (let i = 0; i < job.pa.length; i++) if (!Number.isFinite(job.pa[i]!)) throw new Error(`${p.id}: paint attribute ${i} is not finite`);
      // Inside the provisional character budget (docs/art/art-audio-ui.md).
      expect(p.sheetData.triangles, p.id).toBeLessThanOrEqual(20000);
    }
    // Every person has their own id for a replacement sheet.
    expect(ids.size).toBe(people.length);
  });

  it('puts the new costume pieces on the people meant to wear them', () => {
    const pieces = (rig: Rig) => new Set(rig.person!.parts.map((s) => s.piece));
    expect(pieces(createNpcRig(NPC_LIST.find((d) => d.id === 'quarry_foreman')!)).has('fur collar')).toBe(true);
    const warden = pieces(createNpcRig(NPC_LIST.find((d) => d.id === 'shrine_warden')!));
    expect(warden.has('tabard')).toBe(true);
    expect(warden.has('glove')).toBe(true);
    const masked = pieces(createBanditRig(0));
    expect(masked.has('face scarf')).toBe(true);
    expect(masked.has('shoulder guard')).toBe(true);
    expect(pieces(createNpcRig(NPC_LIST.find((d) => d.id === 'quarry_hand')!)).has('headband')).toBe(true);
    // The wanderer starts plain.
    const player = pieces(createPlayerRig());
    for (const p of ['fur collar', 'tabard', 'face scarf', 'shoulder guard', 'glove']) expect(player.has(p)).toBe(false);
  });
});

describe('gutters, replacement images and guides', () => {
  it('fills empty texels from the nearest paint near a silhouette and with the background further out', () => {
    const W = 40;
    const rgba = new Uint8Array(W * W * 4);
    const covered = new Uint8Array(W * W);
    for (let y = 10; y < 20; y++) {
      for (let x = 10; x < 20; x++) {
        covered[y * W + x] = 1;
        rgba.set([200, 20, 20, 255], (y * W + x) * 4);
      }
    }
    fillNearest(rgba, covered, W, W, 6);
    expect(Array.from(rgba.slice((15 * W + 21) * 4, (15 * W + 21) * 4 + 3))).toEqual([200, 20, 20]);
    expect(Array.from(rgba.slice((39 * W + 39) * 4, (39 * W + 39) * 4 + 3))).toEqual([...SHEET_BACKGROUND]);
    for (let o = 3; o < rgba.length; o += 4) expect(rgba[o]).toBe(255);
  });

  it('repairs a replacement image whose figure is a little thinner than the person, from the paint beside the gap', () => {
    const W = 64;
    const rgba = new Uint8Array(W * W * 4);
    const covered = new Uint8Array(W * W);
    const bg = [92, 88, 82];
    for (let o = 0; o < W * W; o++) rgba.set([...bg, 255], o * 4);
    for (let y = 16; y < 48; y++) {
      for (let x = 16; x < 48; x++) {
        covered[y * W + x] = 1;
        // The image's figure is two pixels thinner than the person's silhouette.
        if (x >= 18 && x < 46 && y >= 18 && y < 46) rgba.set([40, 90, 160, 255], (y * W + x) * 4);
      }
    }
    // A hole of background deep inside the figure, a stray patch of paint far from the person, and a one-pixel guide line
    // left from a template.
    for (let y = 28; y < 34; y++) for (let x = 28; x < 34; x++) rgba.set([...bg, 255], (y * W + x) * 4);
    for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) rgba.set([180, 40, 30, 255], (y * W + x) * 4);
    for (let x = 0; x < W; x++) rgba.set([96, 196, 214, 255], (60 * W + x) * 4);
    const fit = prepareSheetImage(rgba, covered, W, W, 4, 8);
    const at = (x: number, y: number) => Array.from(rgba.slice((y * W + x) * 4, (y * W + x) * 4 + 3));
    expect(at(16, 30)).toEqual([40, 90, 160]);
    expect(at(30, 47)).toEqual([40, 90, 160]);
    expect(at(30, 30)).toEqual([40, 90, 160]);
    // The ring and the hole are repaired and reported, and only the solid part of the stray patch counts as spill.
    expect(fit).toEqual({ gaps: 32 * 32 - 28 * 28 + 36, holes: 36, spill: 9, covered: 32 * 32 });
    expect(sheetMisfit(fit)).toBe(true);
    // The repaired ring alone is not a misfit.
    expect(sheetMisfit({ gaps: 240, holes: 0, spill: 0, covered: 1024 })).toBe(false);

    // A transparent background is not read as black: dark paint stays, transparent gaps are filled.
    const clear = new Uint8Array(W * W * 4);
    for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) if (x >= 17 && x < 47) clear.set([8, 6, 5, 255], (y * W + x) * 4);
    const dark = prepareSheetImage(clear, covered, W, W, 4, 8);
    expect(dark).toEqual({ gaps: 2 * 32, holes: 0, spill: 0, covered: 32 * 32 });
    expect(Array.from(clear.slice((30 * W + 30) * 4, (30 * W + 30) * 4 + 4))).toEqual([8, 6, 5, 255]);
    expect(Array.from(clear.slice((30 * W + 16) * 4, (30 * W + 16) * 4 + 4))).toEqual([8, 6, 5, 255]);
  });

  it('draws a template, a parts map and masks from the projection, with a legend of the pieces', () => {
    const rig = kept(() => createNpcRig(NPC_LIST.find((d) => d.id === 'rillford_reeve')!));
    const p = rig.person!;
    const r = p.sheetData.result!;
    const job = p.sheetData.job!;
    const t = sheetTemplates({ layout: r.layout, tri: r.target!.tri, b1: r.target!.b1, b2: r.target!.b2, index: job.index, part: job.part, col: job.col, parts: p.parts, bodyLines: p.guides.body, headLines: p.guides.head });
    const N = r.layout.width * r.layout.height;
    let white = 0;
    let editable = 0;
    for (let o = 0; o < N; o++) {
      if (t.mask[o * 4] === 255) white++;
      if (t.editMask[o * 4 + 3] === 0) editable++;
      expect(t.mask[o * 4] === 255).toBe(r.covered[o] === 1);
    }
    expect(white).toBeGreaterThan(N * 0.1);
    expect(editable).toBe(white);
    expect(new Set(t.legend.map((l) => l.piece)).size).toBe(t.legend.length);
    expect(t.legend.map((l) => l.piece)).toEqual(expect.arrayContaining(['face', 'dress', 'shawl', 'shoe']));
    // The same piece always has the same colour in every person's parts map.
    expect(partColor('boot')).toEqual(partColor('boot'));
    expect(partColor('boot')).not.toEqual(partColor('belt'));
    // Guide lines are labelled where the joints are.
    expect(p.guides.body.map((g) => g.label)).toEqual(['ankle', 'knee', 'hip', 'belt', 'shoulder', 'chin', 'eyes']);
    const ys = p.guides.body.map((g) => g.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('finds replacement sheets by id, and none ships with the repository', () => {
    expect(overrideIds()).toEqual([]);
    expect(overrideUrl('player')).toBeNull();
    setOverrides({ player: '/x/player.png' });
    expect(overrideUrl('player')).toBe('/x/player.png');
    setOverrides({});
    expect(overrideUrl('player')).toBeNull();
  });

  it('makes fine detail layers that keep the sheet near its colour', () => {
    for (const layer of DETAIL_LAYERS) {
      const d = detailPixels(layer, 32);
      let sum = 0;
      for (let i = 0; i < d.length; i++) sum += d[i]!;
      const mean = sum / d.length / 127.5;
      expect(mean, layer).toBeGreaterThan(0.93);
      expect(mean, layer).toBeLessThan(1.07);
    }
  });
});
