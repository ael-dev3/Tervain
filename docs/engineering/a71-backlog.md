# Lighter entry, turning in place, riding, steadier shadows (A71, 0.0.13)

This record continues the [A70 sweep](a70-sweep.md): what changed, how it was measured, and what remains open.

## Downloads

- **Geometry compression.** `tools/optimise-models.mjs` now also compresses every model's geometry with
  `EXT_meshopt_compression`, losslessly: no quantisation and no filters, and each compressed buffer is decoded again and
  compared byte for byte before it is kept. Every model loader carries three's meshopt decoder (`assets/gltfLoader.ts`).
- **Furniture after entry.** As the animals do since A70, the rooms' furniture arrives after the world opens; the room
  colliders never depended on its models.

| | A70 | Now |
|---|---|---|
| All models | 232.3 MiB | 179.6 MiB |
| Models fetched before entering the world | 157.6 MiB | 115.5 MiB |
| Models fetched after entering (animals, furniture) | 48.1 MiB | 42.0 MiB |

Open: the near tree models are still fetched before entry (they drive tree collisions, grounding and crown sizes), and
each tree's textures are carried by all three of its detail files. Residents far from the start are not deferred.

## Animation

- **Turning in place.** `turn.left` and `turn.right` are built at load from each figure's own walk: each leg's swing is
  eased in and out of the standing pose, lead foot first, and the planted foot is held by a leg reach while the hips turn
  over it. They fade in and out over 0.1 s. In a 90° turn at 30, 60 and 120 Hz the hero's planted foot slides 0.2–1 cm
  (about 20 cm before); a resident's 0.3 cm or less.
- **Stopping.** The hero takes a settling step instead of sliding a planted foot into his stance: under 1 cm (14–24 cm
  before).
- **Hands.** The hero's hands fade between relaxed, sword, fist, bow, string, knife and hide grips over 0.2 s; the
  fastest finger joint on an attack fell from 26–34 to under 12 rad/s.
- **Hard limit:** the residents' rigs have 24 joints ending at the wrists, with no finger joints, so their fingers do not
  move. A test records it.

## Riding

The hero walks to the clear side of the saddled deer and swings up in 0.8 s, and steps down in 0.6 s. The deer turns at
most 2.4 rad/s standing and 1.15 at a gallop, builds speed toward its walk (2.1 m/s) and gallop (6.2 m/s), and backs up
slowly. Its nose, middle and rump are kept out of scenery (at a full gallop into a wall the head stops within 0.2 m), it
cannot enter a doorway, and the camera draws back and up while riding. Hooves sound with its stride; galloping spends the
deer's own stamina, shown on the stamina bar. A save made in the saddle loads with the hero back in it. Open: backing up
plays the forward walk.

## Flicker and heat

- **Flicker.** Measured with motion reduced and the camera still, the share of the image changing between frames: the
  spring shrine's wall changed 5% of the image every frame as the sun's shadow crept across it. The shadow now follows
  the sun in steps of a sixth of a degree: 0.002%. Dense woodland fell from 0.21% to 0.05% on average, with an occasional
  single-frame step of up to 2% when the shadow moves on.
- **Heat.** Drawing is capped at 60 frames a second by default ("Limit to 60 frames a second" in Settings), on a schedule
  that holds 60 on 120, 144 and 240 Hz displays.
- **Interior shadows.** Furniture casts a feathered floor shadow leaning from the hearth, without a shadow map. A
  shadow-casting hearth light is a hard limit of the current materials: it needs one more texture unit than the richest
  lit materials have free, and on high quality the world drew white.

## Fixed steps and interpolated drawing (A72)

The world now advances in fixed steps of 1/60 s ([`frameTiming.ts`](../../src/platform/frameTiming.ts)): each frame
adds its interval to an accumulator and runs as many whole steps as it holds, carrying the remainder. A frame longer than
0.15 s still advances the world by 0.15 s only (at most 9 steps), and hidden or loading time is never replayed. Each
frame is drawn once, after its steps: the hero, the camera, residents, bandits, animals (the ridden deer too) and arrows
are placed between their last two stepped transforms by the carried remainder, then put back, so gameplay only sees its
own stepped state; skinned rigs keep their latest pose while their roots move between. On a 144 Hz display a hero
moving at constant speed is drawn the same distance further each frame (a test holds it to 1e-6 m). Presses and mouse
movement count in a frame's first step; on a fast display, frames between steps keep them for the next step. Physics
props keep their own interpolation between Rapier steps.

## Performance evidence

The production build served locally, high quality, headless Chromium on Direct3D 11 at 1280×720 on one development
machine, with the frame cap off so vsync (60 Hz) is the only limit; not reference-hardware cost.

- **Loading:** ready to play in about 36 s (about 43 s at A70) from a local server; 158 requests, 175 MB in all
  including the animals and furniture that arrive after entry.
- **Sustained frames:** six places at 11:00 and 22:00: mean 16.6–16.7 ms, p99 at most 17.3 ms, with 0.46–4.6 million
  triangles and 71–420 draw calls a frame.
- **Long session:** ten minutes across places and hours: mean 16.7 ms throughout, JS heap 931–958 MiB with no growth,
  GPU geometries 766 rising to 837 as new places were first seen and then steady, textures steady at 226.
