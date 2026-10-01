/**
 * The people's sheets as files for repainting: for every person, the painted sheet, a template (flat-colour block-in with
 * outlines, guide lines and labels), a parts map, masks for image editors, and a manifest with the layout, the legend
 * and a description. Loaded by tools/export-people-sheets.mjs through Vite (so it shares the game's code); not part of
 * the build. See docs/art/people-retexture.md.
 */
import { NPC_LIST } from '../src/content/npcs';
import { S } from '../src/content/strings';
import { AMBIENT_PEOPLE } from '../src/presentation/ambient';
import { createAmbientRig, createBanditRig, createNpcRig, createPlayerRig, personBuildOptions, type PersonSpec, type Rig } from '../src/presentation/characters';
import type { Outfit } from '../src/presentation/human/dress';
import { greyed } from '../src/presentation/human/head';
import { describeFit } from '../src/presentation/human/overrides';
import { prepareSheetImage, sheetMisfit } from '../src/presentation/human/raster';
import { runSheetJob } from '../src/presentation/human/sheetJob';
import { sheetPoolOptions } from '../src/presentation/human/sheetPool';
import { VIEW_AXES } from '../src/presentation/human/sheet';
import { sheetTemplates } from '../src/presentation/human/template';

export interface CastMember {
  id: string;
  name: string;
  role: string;
  make: () => Rig;
}

/** Everyone the game builds, with the id their replacement sheet is filed under. */
export function cast(): CastMember[] {
  return [
    { id: 'player', name: 'The wanderer', role: 'the player character, a castaway who wakes on the strand with nothing', make: createPlayerRig },
    ...NPC_LIST.map((d) => ({ id: d.id, name: d.name, role: S(d.titleKey), make: () => createNpcRig(d) })),
    { id: 'bandit_a', name: 'Toll-jumper', role: 'a hostile toll-jumper at the ford, armed with a rusty sword', make: () => createBanditRig(0) },
    { id: 'bandit_b', name: 'Toll-jumper', role: 'a hostile toll-jumper at the ford, armed with a nailed club', make: () => createBanditRig(1) },
    ...AMBIENT_PEOPLE.map((p) => ({ id: p.style.id, name: p.style.id, role: 'a resident of the coastal hamlet', make: () => createAmbientRig(p.look, p.style) })),
  ];
}

/** A rough name for a linear RGB colour. */
export function colourName(c: [number, number, number]): string {
  const s = c.map((v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)) as [number, number, number];
  const max = Math.max(...s);
  const min = Math.min(...s);
  const l = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (max !== min) {
    if (max === s[0]) hue = 60 * (((s[1] - s[2]) / (max - min) + 6) % 6);
    else if (max === s[1]) hue = 60 * ((s[2] - s[0]) / (max - min) + 2);
    else hue = 60 * ((s[0] - s[1]) / (max - min) + 4);
  }
  const shade = l < 0.18 ? 'very dark ' : l < 0.32 ? 'dark ' : l > 0.72 ? 'pale ' : '';
  if (sat < 0.12) return `${shade}${l < 0.3 ? 'charcoal grey' : l > 0.7 ? 'off-white' : 'grey'}`;
  const name = hue < 15 || hue >= 345 ? 'red' : hue < 40 ? (l < 0.45 ? 'brown' : 'tan') : hue < 65 ? (l < 0.45 ? 'olive brown' : 'ochre') : hue < 160 ? 'green' : hue < 200 ? 'teal' : hue < 260 ? 'blue' : hue < 300 ? 'purple' : 'wine red';
  return `${shade}${sat < 0.3 ? 'faded ' : ''}${name}`;
}

/** What someone wears, in words. */
export function describeOutfit(o: Outfit): string[] {
  const out: string[] = [];
  if (o.shirt) out.push(`a ${colourName(o.shirt.color)} ${o.shirt.cloth} shirt (${o.shirt.sleeve} sleeves, ${o.shirt.neck} neck)`);
  if (o.outer) out.push(`a ${colourName(o.outer.color)} ${o.outer.cloth} ${o.outer.kind}${o.outer.trim ? ` trimmed in ${colourName(o.outer.trim)}` : ''}${o.outer.open ? ', worn open' : ''}`);
  out.push(`${colourName(o.legs.color)} ${o.legs.cloth} trousers`);
  out.push(o.feet.kind === 'boots' ? `${colourName(o.feet.color)} leather boots${o.feet.cuff ? ' with turned-down tops' : ''}` : `${colourName(o.feet.color)} leather shoes${o.feet.wraps ? ' with linen leg wraps bound by cords' : ''}`);
  if (o.mail) out.push('a mail shirt under the outer layer');
  if (o.tabard) out.push(`a sleeveless ${colourName(o.tabard.color)} tabard${o.tabard.trim ? ` edged in ${colourName(o.tabard.trim)}` : ''} over the outer layer`);
  if (o.belt) out.push(o.belt.rope ? 'a rope belt' : `a ${colourName(o.belt.color)} leather belt${o.belt.pouch ? ' with a pouch' : ''}${o.belt.knife ? ' and a knife at the back' : ''}`);
  if (o.bracers) out.push('leather bracers');
  if (o.gloves) out.push(`${colourName(o.gloves)} leather gloves`);
  if (o.pauldrons) out.push('riveted leather shoulder guards');
  if (o.shoulderGuard) out.push(`a riveted ${colourName(o.shoulderGuard)} leather guard on the left shoulder, strapped across the chest`);
  if (o.furCollar) out.push(`a thick ${colourName(o.furCollar)} fur collar round the shoulders`);
  if (o.neckScarf) out.push(`a ${colourName(o.neckScarf.color)} cloth wound round the neck${o.neckScarf.mask ? ' and pulled up over the mouth and nose' : ''}`);
  if (o.headband) out.push(`a ${colourName(o.headband)} cloth band round the brow, knotted at the back`);
  if (o.apron) out.push(`a ${colourName(o.apron.color)} ${o.apron.bib ? 'bib ' : ''}apron`);
  if (o.shawl) out.push(`a ${colourName(o.shawl)} wool shawl crossed over the breast`);
  if (o.scapular) out.push(`a ${colourName(o.scapular)} scapular`);
  if (o.cloak) out.push(`a ${colourName(o.cloak.color)} cloak`);
  if (o.hood) out.push(`a ${colourName(o.hood)} hood`);
  if (o.cowl) out.push(`a ${colourName(o.cowl)} cowl`);
  if (o.hat) out.push(`a ${colourName(o.hat)} felt hat`);
  if (o.helmet) out.push('an iron kettle hat');
  if (o.scarf) out.push(`a ${colourName(o.scarf)} headscarf`);
  if (o.pack) out.push('a leather pack with a bedroll');
  if (o.satchel) out.push('a leather satchel on a crossbody strap');
  if (o.ledger) out.push('a ledger hanging at the belt');
  return out;
}

export function describePerson(spec: PersonSpec): string {
  const age = spec.age < 0.35 ? 'A young' : spec.age < 0.6 ? 'A middle-aged' : 'An old';
  const who = spec.build === 'woman' ? 'woman' : spec.build === 'man' ? 'man' : 'person';
  // The colours the head is painted with: hair and beard grey with age.
  const hair = spec.cut === 'bald' ? 'bald' : `${colourName(greyed(spec.hair, spec.age))} hair (${spec.cut})`;
  const growth = { none: '', short: 'short beard', full: 'full beard', goatee: 'goatee', moustache: 'moustache' }[spec.beard];
  const beard = growth ? `, a ${colourName(greyed(spec.hair, Math.min(1, spec.age + 0.1)))} ${growth}` : '';
  return `${age} ${who} with weathered skin, ${hair}${beard}. Wears ${describeOutfit(spec.outfit).join(', ')}.`;
}

export interface ExportedPerson {
  id: string;
  size: number;
  sheet: Uint8Array;
  template: Uint8Array;
  parts: Uint8Array;
  mask: Uint8Array;
  editMask: Uint8Array;
  manifest: Record<string, unknown>;
}

/** Build one person inline at a sheet size and gather everything a repainter needs. */
export function exportPerson(m: CastMember, size: number): ExportedPerson {
  personBuildOptions.keepSheetData = true;
  personBuildOptions.ignoreOverrides = true;
  personBuildOptions.sheetSize = size;
  sheetPoolOptions.inline = true;
  const rig = m.make();
  const p = rig.person!;
  const r = p.sheetData.result!;
  const job = p.sheetData.job!;
  const layout = r.layout;
  const t = sheetTemplates({
    layout,
    tri: r.target!.tri,
    b1: r.target!.b1,
    b2: r.target!.b2,
    index: job.index,
    part: job.part,
    col: job.col,
    parts: p.parts,
    bodyLines: p.guides.body,
    headLines: p.guides.head,
  });
  const description = describePerson(p.spec);
  const manifest = {
    id: m.id,
    name: m.name,
    role: m.role,
    description,
    sheet: { width: layout.width, height: layout.height, file: `${m.id}.png` },
    install: `src/assets/people/${m.id}.png`,
    regions: layout.regions.map((g) => ({
      name: g.name,
      shows: g.set === 'body' ? 'the whole figure' : 'the head',
      view: g.view,
      rect: { x: g.x, y: g.y, w: g.w, h: g.h },
      pixelsPerMetre: +g.scale.toFixed(2),
      imageRight: VIEW_AXES[g.view].u,
      imageUp: VIEW_AXES[g.view].v,
    })),
    pose: 'A-pose: arms lowered 60 degrees from horizontal, palms toward the thighs; the person faces the viewer in the front panels.',
    guides: { body: p.guides.body.map((g) => g.label), head: p.guides.head.map((g) => g.label) },
    parts: t.legend,
    backgroundSrgb: [92, 88, 82],
    prompt: [
      'Repaint this game character texture sheet as a hand-painted, weathered, Gothic-style medieval fantasy costume and face,',
      'painted albedo with flat even lighting (no cast shadows, no strong highlights).',
      'Keep the exact layout: the top row shows the whole figure from the front, the right side, the back and the left side,',
      'in an A-pose; the bottom left is the face from the front, large; the bottom right shows the head from the right, the back,',
      'the left and from above. Paint only inside the silhouettes and keep the background flat grey #5c5852.',
      `The character: ${m.name}, ${m.role}. ${description}`,
    ].join(' '),
  };
  return { id: m.id, size: layout.width, sheet: r.image!, template: t.template, parts: t.parts, mask: t.mask, editMask: t.editMask, manifest };
}

/** Check a replacement image (RGBA rows top to bottom, square) against the person's current shape, as the game would. */
export function checkSheet(m: CastMember, rgba: Uint8Array, size: number): { fits: boolean; report: string } {
  personBuildOptions.keepSheetData = true;
  personBuildOptions.ignoreOverrides = true;
  personBuildOptions.sheetSize = size;
  sheetPoolOptions.inline = true;
  const job = m.make().person!.sheetData.job!;
  const r = runSheetJob({ ...job, size, skipPaint: true, keep: false });
  const fit = prepareSheetImage(rgba.slice(), r.covered, size, size);
  return { fits: !sheetMisfit(fit), report: describeFit(fit) };
}
