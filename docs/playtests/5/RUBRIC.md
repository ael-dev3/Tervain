# Playtest 5 visual rubric

Each item on the pinned playtest issue is scored 0–10 from the visual gate's clips and stills of the live build
(`tools/visual-gate.mjs`), looked at frame by frame next to the Gothic 3 interior and village references described in
[playtest 4](../4/README.md#references). An item is ticked only when its automated checks pass **and** it scores 9 or more.
Every run posts its clips, stills, metrics and scores on the issue.

Scale: **10** indistinguishable in quality from the reference style; **9** a player would not notice a flaw in play;
**7–8** clearly improved but a flaw is still visible at normal play distance; **4–6** the complaint still stands;
**0–3** broken.

## Foliage and trees
- **Crowns** (giant tree, grove clips): dense rounded leaf masses with only small sky gaps from below and the side;
  no single leaf card or sheet readable as a flat cut-out at 2–10 m; soft edges without stair-steps; lit outside,
  darker inside but never black; no shimmer or crawl between frames as the camera moves.
- **Trunks and bark**: textured bark with visible relief under daylight; trunk silhouettes not blobby or faceted at
  2–5 m; no broken, stretched or flat-black branch pieces.
- **Grounding**: every root flare meets the terrain, also on slopes (placement audit: no root candidate within the
  spots; no gap visible in stills); nothing pokes out of the ground unnaturally.

## Grass
- **Sparkle**: in the meadow run clip no pixel-scale flicker reads as glitter; shimmer metric (sparkle share of the
  grass beside the hero) at or below the previous run.
- **Field**: no hard ring where grass appears; clumps do not move in lockstep; no smear during the camera's turns.

## Fences
- **Vault**: all real-key approaches cross (gate check); the clip shows a believable vault, no snapping or clipping.

## Bow
- **Carried**: on the back, from shoulder to about the hip, flat to the back; string on the bow; no part inside the
  body (gate check: no bow sample inside the torso while walking and running).
- **Use**: grip, draw and release read clearly; the aim camera, crosshair, release recoil and hit feedback feel
  weighty.

## Interiors
- **Room**: timber structure (beams, rafters, posts), crowded shelves and walls, rugs, grime, furniture grouped by
  purpose, a distinct layout per house, warm low firelight with deep shadow.
- **Hearth**: against a wall, an open hearth with a mantel, a fire whose light flickers on the room, a pot or cauldron.
- **Scale**: jars, pots and props at believable size next to the hero.

## Props
- **Supports**: signs hang from brackets by chains or hangers; nothing floats (placement audit: no prop candidate in
  the spots that a still confirms as floating).
