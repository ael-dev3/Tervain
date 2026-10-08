# Resident rigs and motion — 0.0.13

The residents were re-rigged and re-animated ([A65](../decisions.md)). The requirement was motion and quality that look
smooth rather than mechanical. Each of the seventeen supplied resident models now has a rig of its own, made with
Meshy's automatic rigging and kept in a file beside the model. The residents move with authored clips: Meshy's
animation library for walking, standing, talking, sitting and fighting, and Meshy's text to motion for each trade. All
the clips were made on one reference rig and are retargeted onto every resident's rig as it loads, and a small
controller plays them for the game's poses. The wanderer's swimming uses two of them.

The supplied models' files, hashes, geometry, UVs and textures are unchanged. On each actor's private copy the rig
replaces the eleven-joint skeleton of A49 and A55; A63's surfaces, covered layers and dual-quaternion skinning carry
over to it. The runtime code is in [presentation/npc/](../../src/presentation/npc/) (`residentRig.ts`,
`residentMotion.ts`, `residentProps.ts`) and [hero/swim.ts](../../src/presentation/hero/swim.ts); the preparation tools
are in [tools/meshy-rig/](../../tools/meshy-rig/).

## Why a new rig

The eleven joints have one bone for the whole torso and none for the neck, shoulders or feet, and the poser moved them
by formula. A63 fitted those poses to each body, but a body that can only swing its limbs about fixed pivots still
moves stiffly: no spine to bend, no shoulder to lift, no heel to roll. The new rig has 24 joints: the hips, three spine
joints, neck and head, then shoulder, arm, forearm and hand, and thigh, shin, foot and toes on each side. Meshy's rig
has no finger joints.

## Rigs

Meshy rigs each prepared model at its own height. Its copy comes back in centimetres, centred on its footprint and
scaled to exactly that height, and it welds vertices that share or nearly share a place (UV seams) or drops a few loose
fragments. [extract-rig.mjs](../../tools/meshy-rig/extract-rig.mjs) moves the copy back onto the prepared model and
gives each prepared vertex the weights of the rigged vertex at the same place, of a welded neighbour within 3 mm, or of
the nearest rigged surface within 3 cm.

Meshy weighs by nearness. Where a hand hangs beside a thigh some fingers would follow the leg, the inside of a sleeve
could catch the ribs, and an apron would swing with the arms. So each vertex keeps the body part that the repaired
eleven-joint skin gives it (A55, A63) and takes Meshy's weights only among the joints that part may use: an upper arm's
among the chest, shoulder, arm and forearm; a forearm's among the arm, forearm and hand; a thigh's among the hips and
that leg. A vertex shared between parts takes each part's share, bent as Meshy bends that part. A vertex left without a
usable weight borrows from its neighbours within 8 cm, or as a last resort takes the part's two nearest joints by
distance. Cloth that joins the legs (skirts, long coats, tabards) shares them in the repaired skin's proportions. Two
garments that hang between the arms and the body are released to the body beyond a measured distance from the arm's
line, out to the fingertips: Joss Merrin's cape (6.5 cm) and Hesper Lowe's apron (10 cm).

| Model | Vertices | Same place | Welded | Nearest surface (worst) | Corrected / borrowed / fallback | Shared by the legs | Released to the body |
| --- | ---: | ---: | ---: | --- | --- | ---: | ---: |
| caravan-master | 44,607 | 44,538 | 69 | 0 | 20,892 / 6,707 / 9,532 | 602 | 6,361 |
| rillford-reeve | 65,659 | 64,844 | 812 | 3 (4.0 mm) | 23,904 / 1,849 / 317 | 11,060 | — |
| spring-steward | 14,001 | 14,001 | 0 | 0 | 7,474 / 600 / 55 | 2,116 | — |
| quarry-foreman | 35,936 | 35,927 | 9 | 0 | 12,462 / 2,025 / 819 | 150 | — |
| maintenance-worker | 42,137 | 41,718 | 413 | 6 (14.8 mm) | 9,542 / 2,611 / 1,673 | 1,762 | — |
| estate-steward | 39,484 | 39,476 | 8 | 0 | 6,480 / 2,052 / 1,209 | 219 | — |
| ash-recorder | 35,677 | 35,677 | 0 | 0 | 12,009 / 524 / 153 | 649 | — |
| shrine-warden | 37,313 | 37,313 | 0 | 0 | 11,847 / 130 / 208 | 91 | — |
| mill-hand | 14,001 | 14,001 | 0 | 0 | 7,881 / 741 / 85 | 2,116 | — |
| quarry-hand | 69,044 | 68,023 | 1,021 | 0 | 10,087 / 1,253 / 430 | 5,314 | — |
| village-baker | 39,935 | 39,894 | 41 | 0 | 9,669 / 4,066 / 6,448 | 759 | 3,168 |
| fisher | 41,761 | 41,757 | 4 | 0 | 30,743 / 4,109 / 1,008 | 147 | — |
| fireside | 65,659 | 64,844 | 812 | 3 (4.0 mm) | 28,862 / 1,954 / 314 | 11,060 | — |
| keeper | 11,387 | 11,367 | 20 | 0 | 3,481 / 146 / 157 | 235 | — |
| ford-bandit-a | 65,711 | 65,374 | 320 | 17 (13.6 mm) | 26,356 / 8,097 / 1,666 | 3,836 | — |
| ford-bandit-b | 41,033 | 41,025 | 8 | 0 | 4,780 / 2,005 / 576 | 271 | — |
| menu-warden | 39,356 | 39,339 | 17 | 0 | 9,339 / 2,795 / 1,028 | 167 | — |

"Corrected" counts vertices to which Meshy had given more than 5% from a joint outside their parts, now dropped;
"borrowed" and "fallback" count the two repairs above.

Each rig file (`public/models/npcs/rigs/<id>.json`) holds the joints with their parents and bind transforms, four
joints and weights per vertex (weights in 255ths that sum to 255), the hash of the model it was made for, Meshy's task,
and the transfer statistics above. The resident manifest lists each file with its size and hash. The game checks the
size, hash, joints and coverage, and that the rig was made for the model's hash, before using it. A resident whose rig
is missing or fails a check keeps the procedural poser.

## Motion library

[residents.glb](../../public/models/npcs/motion/residents.glb) (1.6 MB) holds the reference skeleton and 40 clips:
32 from Meshy's animation library and 8 made with Meshy's text to motion. All were generated on one rig, the auto-rig
of the estate steward's model. [build-motion.mjs](../../tools/meshy-rig/build-motion.mjs) keeps only the bones: the
rotations of the 22 joints that move the skin as normalized 16-bit quaternions, and the hips' translation in metres.
[clips.json](../../public/models/npcs/motion/clips.json) records each clip's source (the library action and its
title, or the prompt), the Meshy tasks and the date.

| The game asks for | Clips |
| --- | --- |
| Walking | Quick Walk; Walking Woman for women |
| Running (the bandits) | Run 2 |
| Standing | Idle 3, 4, 6, 7 and 12, one per resident; now and then looking about (two lengths), hands clasped or a stretch |
| Talking | Stand and Chat, Talk with Hands Open, Talk with Right Hand Open, Talk with Left Hand on Hip, Agree Gesture, Listening Gesture |
| Sitting | Chair Sit Idle (male and female) and Sitting Answering Questions, with Stand to Sit and Sit to Stand between |
| Work | One text-to-motion clip per trade: writing, ledger, measuring, stonework, mending, provisioning (the counter), baking and guard; Collect Object for other work |
| Fights | Attack, Charged Slash, Sword Parry, Stand Dodge, Hit Reaction and Dead |
| The wanderer in deep water | Swim Forward and Swim Idle |

## Retargeting

Each clip is baked once per model, at 30 frames a second, when the model's first actor is built
([residentMotion.ts](../../src/presentation/npc/residentMotion.ts)), and shared by every actor of that model.

- The spine, neck, head, shoulders, legs and feet keep the resident's own rest and take the clip's movement from it. A
  hood or a stoop places each head's joints differently, and a long skirt is shaped around its own stance; matching
  the reference's directions there would tip heads back and spread skirts.
- The arms point as the reference's do, so the hands land where a gesture or a tool puts them, whatever the resident's
  resting arms.
- The hips' movement is scaled by hip height. Walks and runs lose their forward drift, since the game moves the
  actor. The pace a walk implies is measured from that drift or, for a clip made in place, from how fast the planted
  foot slides back, and its phase then advances by the metres the resident actually covers.
- A seated clip sits on a chair of its own. Its seat on each model is measured by skinning the hips and thighs on the
  CPU at three moments, and the body is moved so that seat rests on the actual one: the village benches at 0.55 m, the
  title screen warden's split log at 0.42 m.

## Playing the clips

`ResidentMotion` answers the game's poses with crossfades (0.35 s; 0.12 s in fights). The game still moves and turns
the actor; the controller only animates the body under it.

- **Walking** advances only by the metres actually travelled: a blocked resident stands rather than walking in place.
- **Standing**: each resident has an idle of their own, and about every nine seconds may look about, clasp their hands
  or stretch.
- **Talking** moves between conversation gestures every six seconds.
- **Sitting**: residents sit down from standing, idle or talk seated, and get up again.
- **Work**: each trade plays its clip, and its tools show only while working, now held in the hands
  ([residentProps.ts](../../src/presentation/npc/residentProps.ts)): ledger and quill for Sel Anrit (seated) and the
  ledger keepers Joss Merrin, Darin Kest and Oren Halvek; chisel and hammer for Pell Dunmore; a measuring rod for Mara
  Venn, Sister Edda Sorn and Bess Corran; Rowan Vale's arrow. Every complete actor stays within its 50,000-triangle
  budget with its tools.
- **Fights**: a bandit's wind-up plays the attack up to the weapon's highest point, and the strike carries it through
  the blow, so the impact falls when the game deals the damage. Parries, dodges and hits play their clips, and a dead
  bandit falls with the clip instead of tipping over whole.
- **Garments**: Joss Merrin's cape hangs between his arms and his body, so his arms stay 60% nearer their rest and his
  gestures and idle accents are the calmer ones.
- Weapons ride the right palm; a scabbard rides the hips.

## The wanderer's swim

The wanderer's skeleton matches the reference rig joint for joint under Mixamo names, with fingers and a few auxiliary
joints besides, which keep their own pose. Once the residents' library has loaded, Swim Forward (a breaststroke) and
Swim Idle (treading water) are retargeted onto it ([hero/swim.ts](../../src/presentation/hero/swim.ts)) and replace the
procedural stroke. They blend by speed. The clips carry the body's lean, and the chest stays at the waterline, so the
head rides above the surface and the legs trail behind. He lifts his chin as he swims to keep his face out of the
water. Each stroke's pull still brings its splash; he strokes about 0.7 times a second at full pace and sculls about
0.34 times a second treading water. Without the library the procedural stroke remains. His other motion is unchanged
(A45).

## Cost

- Downloads: 7.3 MB of rig files and the 1.6 MB library, beside 134 MiB of resident models.
- Building: on the development machine, the first actor of each model takes 35–165 ms on the CPU with its rig, clips
  and seats (1.4 s for all seventeen), and later actors 1–22 ms.
- Per frame: posing every resident in the valley took about 0.16 ms of CPU per world step. Skinning blends 24 joints as
  dual quaternions instead of 11. No per-frame GPU timing was taken.

## Provenance

The rigs, library clips and text-to-motion clips were generated through the Meshy API on 8 October 2026 on the owner's
account. Each rig file records its rigging task, and clips.json records each clip's tasks. The responses do not record
the account plan at generation time. The library is recorded in the [model ledger](model-licenses.md) with its license
evidence pending classification, and commercial clearance is not established.

## Reproduce

Requests spend Meshy credits, and text to motion gives a different take on every run. With `MESHY_API_KEY` set, a
working folder outside the repository and `npm run dev` running:

```sh
node tools/meshy-rig/meshy.mjs rig <dir>
node tools/meshy-rig/export-parts.mjs <dir>
node tools/meshy-rig/extract-rig.mjs <id> <dir>/rigs/<id>.glb <dir>/rigs/<id>.json <dir>/parts/<id>.json   # each resident
node tools/meshy-rig/meshy.mjs library <dir>
node tools/meshy-rig/meshy.mjs motion <dir> <name>   # each motion in tools/meshy-rig/motion-plan.json
node tools/meshy-rig/meshy.mjs sources <dir>
node tools/meshy-rig/build-motion.mjs <dir>/sources.json
node tools/meshy-rig/record.mjs
```

From the same Meshy results, `export-parts.mjs` and `extract-rig.mjs` reproduce the shipped files byte for byte.
`record.mjs` writes the files' sizes and hashes into the resident manifest and the model ledger.

## Review lab

`/tools/npc-lab.html` loads each resident on its own rig; `lab.load(role, { authoredMotion: false })` shows the
procedural poser instead. `lab.pose({ mode, travel, clock, … })` returns the leading clip, and `lab.parts()` exports the
repaired eleven-joint skin that `export-parts.mjs` reads.

## Verification

New tests cover the shipped rig files and library against the manifest (every clip the residents and the wanderer ask
for, and nothing else), rejection of rig files that do not fit a model, an exact bind on three delivered models,
retargeting of the reference rest (body and legs onto the resident's own rest, arms along the reference's), a walk that
advances only by the metres travelled, a seated clip resting on a 0.55 m bench, tools shown only while working, and the
procedural poser kept without a rig. For the wanderer, the authored breaststroke keeps the chest at the waterline
within a millimetre with the head above it and the legs trailing, at three to six strokes in six seconds, and he treads
water upright and walks out standing straight. [check-meshy-npcs.mjs](../../tools/check-meshy-npcs.mjs) also verifies
each rig file and the library against the manifest, and the runtime audit passes for all seventeen models.

Captures were reviewed in the lab (hands, walks, seats, tools, fights, the cape) and in the game: every named resident
plays authored clips, as do the hamlet's three residents, the ford bandits through a whole fight (alarm, wind-up,
strike, hit and fall), the title screen's warden on his log and the swimming wanderer.

## Limits

- The rig has no fingers: hands keep their sculpted shape, and tools ride the palm.
- No foot IK: on slopes a foot can sink into or hover above the ground a little.
- Joss Merrin's cape still stretches a little where it meets the arm; his arm movement is reduced, not simulated.
- The trade clips mime the work: hands do not touch a page, a rod's tip or the dough exactly, and the fisher mends
  without a net in his hands.
- During the breaststroke's kick the wanderer's heels can break the surface.
- Without its rig file or the library a resident keeps A63's procedural poses, and the wanderer the procedural stroke.
