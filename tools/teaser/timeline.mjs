/**
 * The "presentable" teaser, as one timeline shared by the film, the captions, the score and the edit: the shots (where
 * the camera goes and what happens), the narration placed over them, and what is shown on top. Shot lengths are whole
 * beats of the menu score's measured tempo, so every cut lands on the music.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES, takes } from './voice.mjs';

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const RHYTHM = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/presentation/menu/menuScoreRhythmData.ts'), 'utf8');
const measured = (key) => Number(new RegExp(`"${key}":\\s*([\\d.]+)`).exec(RHYTHM)[1]);
export const BEAT = measured('period');
const SONG_FIRST_BEAT = measured('first');
/** The menu score's time at its beat k. */
export const songBeat = (k) => SONG_FIRST_BEAT + k * BEAT;

/** Where the player waits when a shot should not show him (he is also hidden). */
const OFFSTAGE = { x: -60, z: 60, yaw: 0, hidden: true };

/**
 * World shots run in the game proper (a new game in shot mode); menu shots on the title screen. Camera keys give a
 * position and a point looked at, each as [x, metres above the ground, z], at a time in seconds within the shot;
 * `ease` slows the move into and out of its ends. `preroll` seconds of the world run before the first frame; actions
 * happen at their time within the shot (negative times fall in the preroll; the hero walks where the camera's yaw,
 * set from his, points). `beast` places the thornback and sets its mind; `dress` puts it in its formal wear
 * (tools/teaser/costume.mjs).
 */
export const SHOTS = [
  {
    // The grass and the trees in the wind at the golden hour: the hero wades through the meadow by the ford, against
    // the low sun, the grass parting where he walks.
    id: 'golden', beats: 10, scene: 'world', hour: 17.2, player: { x: 35.2, z: 43.4, yaw: 2.4 }, preroll: 0.6,
    camera: { ease: true, keys: [
      { t: 0, p: [42.4, 0.8, 41.8], l: [37.0, 1.2, 40.2], fov: 46 },
      { t: 5.6, p: [42.25, 0.82, 40.6], l: [41.2, 1.2, 36.8], fov: 42 },
    ] },
    actions: [{ t: -0.6, hold: 'KeyW' }],
  },
  {
    // Lantern Point at sunset, where the first trailer began: the first ten seconds in question.
    id: 'vista', beats: 12, scene: 'world', hour: 18.6, player: OFFSTAGE,
    camera: { ease: true, keys: [
      { t: 0, p: [-268, 6, 70], l: [-324, 13, 104], fov: 42 },
      { t: 6.7, p: [-283, 10.5, 81], l: [-324, 14.5, 104], fov: 40 },
    ] },
  },
  {
    // The hero, alone at the sea's edge at sunset.
    id: 'proud', beats: 7, scene: 'world', hour: 18.5, player: { x: -266, z: 30, yaw: 4.6 },
    camera: { ease: true, keys: [
      { t: 0, p: [-262.8, 1.0, 31.5], l: [-268.5, 1.9, 29.6], fov: 38 },
      { t: 3.9, p: [-263.2, 1.05, 31.2], l: [-268.5, 1.9, 29.6], fov: 34 },
    ] },
  },
  {
    // Since then: the hero walks at the camera through the long grass at midday, the trees moving behind him.
    id: 'grass', beats: 4, scene: 'world', hour: 11.5, player: { x: 34.2, z: 44.5, yaw: 2.4 }, preroll: 2.0,
    camera: { ease: true, keys: [
      { t: 0, p: [41.0, 2.2, 37.8], l: [36.2, 0.7, 42.6], fov: 44 },
      { t: 2.24, p: [41.5, 2.25, 37.3], l: [37.0, 0.75, 41.8], fov: 42 },
    ] },
    actions: [{ t: -2.0, hold: 'KeyW' }],
  },
  {
    // Out of his depth off the Grey Strand, swimming, his body seen through the water.
    id: 'swim', beats: 3, scene: 'world', hour: 11.5, player: { x: -296, z: 40, yaw: 0.5 }, preroll: 1.6,
    camera: { ease: true, keys: [
      { t: 0, p: [-287.8, 1.4, 43.4], l: [-294.7, 0.2, 41.9], fov: 34 },
      { t: 1.68, p: [-287.4, 1.4, 44.6], l: [-293.1, 0.2, 43.9], fov: 33 },
    ] },
    actions: [{ t: -1.6, hold: 'KeyW' }],
  },
  {
    // Sel writing in the ledger on the ford camp's bench, the ford running behind, in the evening.
    id: 'bench', beats: 9, scene: 'world', hour: 17.2, player: OFFSTAGE,
    camera: { ease: true, keys: [
      { t: 0, p: [46.6, 1.35, 35.6], l: [44.0, 0.95, 32.6], fov: 40 },
      { t: 5.0, p: [46.1, 1.3, 35.0], l: [44.0, 0.95, 32.6], fov: 37 },
    ] },
  },
  {
    // The thornback as it was, standing where the reveal will find it, framed the same way: the "before".
    id: 'lurk', beats: 12, scene: 'world', hour: 16.4, player: { x: 105.57, z: -51.57, yaw: 0, hidden: true },
    beast: { x: 108.4, z: -54.4, yaw: -0.785, state: 'alert', t: 999 },
    camera: { ease: true, keys: [
      { t: 0, p: [107.02, 0.8, -50.06], l: [107.59, 1.02, -53.59], fov: 35 },
      { t: 6.0, p: [107.0, 0.8, -50.24], l: [107.59, 1.02, -53.59], fov: 34 },
    ] },
  },
  {
    // The reveal: the same creature, dressed, three-quarters on from the monocle's side. A slow push into a portrait.
    id: 'reveal', beats: 8, scene: 'world', hour: 16.4, dress: 1,
    player: { x: 105.57, z: -51.57, yaw: 0, hidden: true },
    beast: { x: 108.4, z: -54.4, yaw: -0.785, state: 'alert', t: 999 },
    camera: { ease: true, keys: [
      { t: 0, p: [107.0, 0.8, -50.24], l: [107.59, 1.02, -53.59], fov: 34 },
      { t: 4.5, p: [107.15, 0.82, -51.12], l: [107.59, 1.05, -53.59], fov: 31 },
    ] },
    // It notices the camera: the hidden player it watches steps to where the camera stands.
    actions: [{ t: 2.55, player: [107.09, -50.8] }],
  },
  {
    // It is still the thornback. Seen from the monocle's side of the charge, rising and pushing in to the blow, which
    // lands four frames before the cut.
    id: 'payoff', beats: 5, scene: 'world', hour: 16.4, dress: 1, equip: 'rusted_sword', preroll: 0.1,
    player: { x: 104.8, z: -50.4, yaw: 2.36 },
    beast: { x: 108.6, z: -54.2, yaw: -0.785, state: 'alert', t: 1.06 },
    camera: { ease: true, keys: [
      { t: 0, p: [111.37, 1.45, -47.63], l: [106.7, 0.95, -52.3], fov: 40 },
      { t: 2.78, p: [110.2, 2.0, -49.6], l: [105.4, 0.9, -51.0], fov: 30 },
    ] },
    actions: [{ t: 1.62, press: 'KeyJ' }],
    aim: 'cut_creature',
  },
  { id: 'freeze', beats: 3, scene: 'hold', of: 'payoff' },
  { id: 'title', beats: 7, scene: 'menu', song: songBeat(128), ui: 'title' },
];

/** When the monocle catches the light, in seconds within the reveal: on the third beat of its first bar. */
export const GLINT = 2 * BEAT;

/** Where each shot starts, in beats and seconds, and its frames in the finished teaser. */
let beat = 0;
for (const s of SHOTS) {
  s.beat = beat;
  s.start = beat * BEAT;
  s.seconds = s.beats * BEAT;
  s.firstFrame = Math.round(s.start * FPS);
  beat += s.beats;
  s.frames = Math.round(beat * BEAT * FPS) - s.firstFrame;
}
export const START = Object.fromEntries(SHOTS.map((s) => [s.id, s.start]));
export const BEATS = beat;
export const LENGTH = beat * BEAT;
export const FRAMES = Math.round(LENGTH * FPS);
export const shot = (id) => SHOTS.find((s) => s.id === id);

/**
 * The narration (tools/teaser/voice.mjs): each line's take starts `t` seconds into its shot. `words` carries the
 * take's transcribed words at their times in the teaser.
 */
export const VOICE = [
  { line: 'intro', shot: 'golden', t: 0.2 },
  { line: 'comment1', shot: 'vista', t: 0.15 },
  { line: 'mission', shot: 'proud', t: 0.35 },
  { line: 'polish', shot: 'grass', t: 0.1 },
  { line: 'swim', shot: 'swim', t: 0.1 },
  { line: 'bench', shot: 'bench', t: 0.05 },
  { line: 'comment2', shot: 'lurk', t: 0.3 },
  // A sigh, then the word, with a breath before the jump cut.
  { line: 'fair', shot: 'lurk', t: 4.9 },
  // Once it has turned to the lens.
  { line: 'better', shot: 'reveal', t: 3.25 },
  { line: 'presentable', shot: 'freeze', t: 0.35 },
  { line: 'outro', shot: 'title', t: 0.25 },
].map((v) => {
  const take = takes().lines[v.line];
  const at = START[v.shot] + v.t;
  return { ...v, at, seconds: take?.seconds ?? 0, words: (take?.words ?? []).map((w) => ({ ...w, start: at + w.start, end: at + w.end })) };
});

const bare = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/**
 * Subtitles for the narration, from its words: each of a line's cues starts on its first word and holds until the
 * next cue, or a little after the last word (never past its shot).
 */
export const SUBTITLES = VOICE.flatMap((v) => {
  const line = LINES.find((l) => l.id === v.line);
  if (!v.words.length) return [];
  const starts = [v.words[0].start];
  let from = 0;
  for (const key of line.at ?? []) {
    const i = v.words.findIndex((w, k) => k > from && bare(w.text) === key);
    starts.push(v.words[i].start);
    from = i;
  }
  const s = shot(v.shot);
  const last = Math.min(v.words.at(-1).end + 0.45, s.start + s.seconds - 0.03);
  return line.shown.map((text, k) => ({ text, from: starts[k] - 0.05, to: k + 1 < starts.length ? starts[k + 1] - 0.06 : last }));
});

/** The comments, as screenshots of the thread, from their shot's moment `t` to its end. */
export const SCREENSHOTS = [
  { shot: 'vista', t: 0.2, image: 'comment-gothic.png' },
  { shot: 'lurk', t: 0.3, image: 'comment-presentable.png' },
].map((c) => ({ ...c, from: START[c.shot] + c.t, to: START[c.shot] + shot(c.shot).seconds - 0.1 }));
