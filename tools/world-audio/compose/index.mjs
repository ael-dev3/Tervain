/**
 * The crafted half of Tervain's world sound, as the preparation tool sees it: what to render and how each render is
 * used. Nothing here comes from a recording or a generator; the code and its seeds are the source.
 *
 *   node tools/world-audio/compose/index.mjs <id> [out.wav]   renders one item for listening (float WAV)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR } from './dsp.mjs';
import * as P from './pieces.mjs';

const REGIONS = {
  coast: 'The Grey Strand',
  wood: 'Into the Deepwood',
  vale: 'The Vale Opens',
  stone: 'Cut Stone',
  sacred: 'Holy Water',
  light: 'Lantern Point',
};

const CRAFTED_LEVEL = { 'bell.town': -19, 'bell.peal': -20, chime: -24, cricket: -22, bubble: -24, heart: -20, 'rite.bowl': -20 };

export const COMPOSED = [
  { id: 'theme_vale', title: 'Rillford at Work', render: P.themeVale, use: { type: 'piece', mood: 'vale' } },
  { id: 'theme_wild', title: 'The Deepwood', render: P.themeWild, use: { type: 'piece', mood: 'wild' } },
  { id: 'theme_night', title: 'Embers', render: P.themeNight, use: { type: 'piece', mood: 'night' } },
  { id: 'theme_sacred', title: 'The Spring', render: P.themeSacred, use: { type: 'piece', mood: 'sacred' } },
  { id: 'danger_watch', title: 'Something Watches', render: P.dangerLoop, use: { type: 'loop', mood: 'danger' } },
  { id: 'battle_ford', title: 'Steel at the Ford', render: P.battleLoop, use: { type: 'loop', mood: 'combat' } },
  { id: 'sting_victory_theme', title: 'A Fight Won', render: P.stingVictory, use: { type: 'sting', mood: 'sting' } },
  { id: 'sting_fall_theme', title: 'The Fall', render: P.stingFall, use: { type: 'sting', mood: 'sting' } },
  { id: 'sting_quest_theme', title: 'A Step of the Story', render: P.stingQuest, use: { type: 'sting', mood: 'sting' } },
  ...Object.entries(REGIONS).map(([region, title]) => ({ id: `place_${region}`, title, render: () => P.placeMotif(region), use: { type: 'sting', mood: 'place' } })),
  { id: 'wanderers_air', title: "The Wanderer's Air", render: P.wanderersAir, use: { type: 'song' } },
  { id: 'hearthsmoke', title: 'Hearthsmoke', render: P.hearthsmoke, use: { type: 'song' } },
  { id: 'salt_and_rope', title: 'Salt and Rope', render: P.saltAndRope, use: { type: 'song' } },
  ...Object.entries(P.CRAFTED_SOUNDS).map(([name, render]) => ({ id: `crafted_${name}`, title: name, render, use: { type: 'variants', bank: 'crafted', name, targetDb: CRAFTED_LEVEL[name] } })),
];

export { LOOP_XFADE } from './pieces.mjs';

/** Float WAV, for listening to a single render outside the game. */
export function writeWav(file, chans) {
  const ch = chans.length, n = chans[0].length;
  const buf = Buffer.alloc(44 + n * ch * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * ch * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(ch, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * ch * 4, 28); buf.writeUInt16LE(ch * 4, 32); buf.writeUInt16LE(32, 34); buf.write('data', 36);
  buf.writeUInt32LE(n * ch * 4, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { buf.writeFloatLE(chans[c][i], o); o += 4; }
  fs.writeFileSync(file, buf);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const id = process.argv[2];
  const item = COMPOSED.find((c) => c.id === id);
  if (!item) {
    console.log(`items: ${COMPOSED.map((c) => c.id).join(', ')}`);
    process.exit(id ? 1 : 0);
  }
  const out = item.render();
  const chans = item.use.type === 'variants' ? [out.reduce((all, v) => [...all, ...v, ...new Float32Array(SR / 4)], [])].map((a) => Float32Array.from(a)) : out;
  const file = process.argv[3] ?? `${id}.wav`;
  writeWav(file, chans);
  console.log(`${file}: ${(chans[0].length / SR).toFixed(1)} s, ${chans.length} channel(s)`);
}
