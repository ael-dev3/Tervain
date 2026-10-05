/**
 * The X teaser, as one timeline shared by the film, the captions, the score and the edit: the shots (where the camera
 * goes and what happens), the captions (an epic trailer voice, undercut by an honest one), and the beat they keep.
 *
 * Every number here is a choice of the edit. Shot lengths are whole beats, so every cut lands on the music.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FPS = 60;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * The teaser keeps the measured tempo of the menu score (docs/engineering/menu-grove-score.md). The grove's spirits
 * dance on that grid, so when the teaser's own music shares it, they dance to the teaser.
 */
const RHYTHM = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/presentation/menu/menuScoreRhythmData.ts'), 'utf8');
const measured = (key) => Number(new RegExp(`"${key}":\\s*([\\d.]+)`).exec(RHYTHM)[1]);
export const BEAT = measured('period');
const SONG_FIRST_BEAT = measured('first');
/** The menu score's time at its beat k (k a multiple of 4 is a downbeat). */
export const songBeat = (k) => SONG_FIRST_BEAT + k * BEAT;

/** Where the player waits when a shot should not show him (he is also hidden). */
const OFFSTAGE = { x: -60, z: 60, yaw: 0, hidden: true };

/**
 * World shots run in the game proper (a new game in shot mode); menu shots in the title screen. Camera keys give a
 * position and a point looked at, each as [x, metres above the ground, z], at a time in seconds within the shot;
 * `ease` slows the move into and out of its ends. A `follow` camera rides behind the player instead. `preroll`
 * seconds of the world run before the first frame; actions happen at their time within the shot (negative times fall
 * in the preroll).
 */
export const SHOTS = [
  {
    id: 'lighthouse', beats: 8, scene: 'world', hour: 18.6, player: OFFSTAGE,
    camera: { ease: true, keys: [
      { t: 0, p: [-268, 6, 70], l: [-324, 13, 104], fov: 42 },
      { t: 4.5, p: [-283, 10.5, 81], l: [-324, 14.5, 104], fov: 40 },
    ] },
  },
  {
    id: 'beach', beats: 9, scene: 'world', hour: 8.2, player: { x: -266, z: 28, yaw: 2.2 },
    camera: { ease: true, keys: [
      { t: 0, p: [-260.6, 1.4, 25.6], l: [-266.4, 1.35, 28], fov: 40 },
      { t: 5, p: [-262.3, 1.55, 23.5], l: [-266.6, 1.75, 28], fov: 37 },
    ] },
  },
  {
    id: 'trail', beats: 9, scene: 'world', hour: 10.2, player: { x: -238, z: 27, yaw: 1.3 }, preroll: 1,
    camera: { follow: { back: 5.2, side: 1.4, up: 2.1, ahead: 7, lookUp: 1.4, fov: 48 } },
    actions: [{ t: -1, hold: 'KeyW' }],
    steer: [[-230, 25], [-208, 12], [-182, 10]],
  },
  {
    id: 'rillford', beats: 9, scene: 'world', hour: 10.6, player: OFFSTAGE,
    camera: { ease: true, keys: [
      { t: 0, p: [19.6, 4.3, 29.6], l: [8.5, 1.7, 16], fov: 46 },
      { t: 5, p: [16.8, 2.9, 31.2], l: [9.8, 1.75, 17.4], fov: 40 },
    ] },
  },
  {
    id: 'barrel', beats: 8, scene: 'world', hour: 15.6, player: { x: -138.9, z: 29.9, yaw: 0.68 },
    camera: { ease: true, keys: [
      { t: 0, p: [-132.6, 1.5, 34.3], l: [-138.2, 1.15, 30.6], fov: 46 },
      { t: 4.5, p: [-132.9, 1.6, 35.2], l: [-137.4, 1.0, 31.4], fov: 48 },
    ] },
    actions: [{ t: 0.5, grab: 'loose_barrel_2' }, { t: 2.0, throw: [0.68, -0.25] }],
  },
  {
    id: 'combat', beats: 9, scene: 'world', hour: 15, player: { x: 103.2, z: -50.6, yaw: 2.4 }, equip: 'rusted_sword', provoke: 'cut_creature', preroll: 0.1,
    camera: { ease: true, keys: [
      { t: 0, p: [99.5, 2.6, -60.5], l: [106.5, 1.2, -52.8], fov: 44 },
      { t: 5, p: [100.8, 2.9, -58.4], l: [105.4, 1.0, -52.0], fov: 38 },
    ] },
    // A swing at nothing, a heavy blow that staggers it, a cut; then it answers. The shot ends four frames into the
    // hero's hurt, which becomes the freeze frame.
    actions: [{ t: 0.8, press: 'KeyJ' }, { t: 2.2, press: 'KeyK' }, { t: 3.8, press: 'KeyJ' }],
    aim: 'cut_creature',
  },
  { id: 'freeze', beats: 4, scene: 'hold', of: 'combat' },
  {
    // Dusk reads as a murk on a phone: the edit lifts its shadows and mids.
    id: 'night', beats: 9, scene: 'world', hour: 20.4, player: OFFSTAGE, grade: "curves=all='0/0 0.06/0.085 0.2/0.29 0.4/0.56 1/1'",
    camera: { ease: true, keys: [
      { t: 0, p: [16, 2.3, 23], l: [-4, 2.3, 30], fov: 46 },
      { t: 5, p: [9.5, 2.0, 25.5], l: [-4, 2.5, 30], fov: 44 },
    ] },
  },
  { id: 'grove', beats: 8, scene: 'menu', song: songBeat(104), ui: 'none' },
  { id: 'title', beats: 12, scene: 'menu', song: songBeat(128), ui: 'title' },
];

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
 * Captions. `epic` is the trailer voice (Roman capitals); `aside` the honest one (plain lowercase). Times are seconds
 * within the shot; each caption fades in and out.
 */
export const CAPTIONS = [
  { shot: 'lighthouse', t: 0.3, until: 4.3, epic: 'In a world…' },
  { shot: 'lighthouse', t: 2.0, until: 4.3, aside: '(a fairly small one)' },
  { shot: 'beach', t: 0.3, until: 4.85, epic: 'One man wakes with no memory' },
  { shot: 'beach', t: 2.1, until: 4.85, aside: 'our AI developers can relate' },
  { shot: 'trail', t: 0.3, until: 4.85, epic: 'An ancient forest' },
  { shot: 'trail', t: 1.5, until: 4.85, aside: '7 of our 27 pull requests are about trees.\nplease look at the trees.' },
  { shot: 'rillford', t: 0.3, until: 4.85, epic: 'A living, breathing village' },
  { shot: 'rillford', t: 1.8, until: 4.85, aside: 'everyone has a job. the job is mostly standing.' },
  { shot: 'barrel', t: 0.2, until: 4.3, epic: 'Next-generation physics' },
  { shot: 'barrel', t: 3.1, until: 4.3, aside: '(one barrel)' },
  { shot: 'combat', t: 0.3, until: 4.9, epic: 'Brutal, tactical combat' },
  { shot: 'combat', t: 2.2, until: 4.9, aside: 'the thornback is undefeated.\nwe cannot beat it either.' },
  { shot: 'freeze', t: 0.05, until: 2.2, aside: '*record scratch*  yep, that’s our hero.', style: 'freeze' },
  { shot: 'night', t: 0.3, until: 4.9, epic: 'An unforgettable score' },
  { shot: 'night', t: 1.8, until: 4.9, aside: 'composed in code by an AI that can’t hear.\nit checked the music with spectrograms.' },
  { shot: 'grove', t: 0.3, until: 4.3, epic: 'A breathtaking main menu' },
  { shot: 'grove', t: 1.9, until: 4.3, aside: 'honestly our most finished feature' },
  { shot: 'title', t: 1.4, until: 6.6, aside: 'still v0.0.10. not 0.1. we asked. the answer was no.', style: 'title-version' },
  { shot: 'title', t: 3.0, until: 6.6, aside: 'release date: when the trees are done', style: 'title-date' },
  { shot: 'title', t: 4.3, until: 6.6, aside: 'made by one human, a few AIs and 27 pull requests · sound partly by ElevenLabs', style: 'title-credit' },
].map((c) => ({ ...c, from: START[c.shot] + c.t, to: START[c.shot] + c.until }));
