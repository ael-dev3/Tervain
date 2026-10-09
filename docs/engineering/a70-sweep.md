# Bug sweep, audit fixes and the living valley (A70, 0.0.13)

This record covers the fixes for the [8 October audit](audits/2026-10-08/README.md), a sweep of reviewer findings, and
the backlog that followed: lighter downloads, residents who live indoors, a hunting range that refills, riding, feet on
uneven ground and close-up work. Each item says what changed and what is still open.

## Audit findings

- **TV-B01, indoor light and sound ignored height.** Rooms now have floor and ceiling bounds (`RoomLocator.within`); a
  camera over a roof is outdoors. Light, furniture culling and the sound bed use the same test.
- **TV-B02, building surfaces could not recover.** Downloads that fail are retried in a bounded number of later passes,
  only the missing files are fetched again, and an incomplete set is never cached as complete.
- **TV-B03, controller hints.** Vertical right-stick look counts as controller use.

`audits/2026-10-08/reproduce.mjs` now verifies the fixes and fails if a defect returns.

## Sweep findings

- A sprint jump onto low furniture could carry the hero through a wall: a step never moves him further than asked, a
  contact push-out is bounded, and furniture tops are landed on where the body fits above them.
- Pushing a barrel moved it alike at 30, 60 and 144 Hz (the character controller uses the frame's own step).
- A swimmer is saved and rebuilt in the water; the respawn point never moves next to a living enemy; an arrow never turns
  back from a hit behind the bow; the dead cannot use items.
- Splash spray is drawn after the water; point sprites follow the renderer's pixel ratio; half-float targets are used
  only where the GPU can draw into them; unused exposure code is gone.
- Slow frames are simulated in bounded steps that end at the presented time, so the world keeps its own pace down to
  about 7 frames a second; loose props are drawn between their fixed physics steps.

## Downloads

`tools/optimise-models.mjs` re-encodes only the images embedded in each GLB: colour maps to WebP, normal and roughness
maps to JPEG, with size caps per family (hero 2048, residents keep their 1536 sheets, animals 1024, trees and scenery 2048
colour / 1024 data). Geometry, skins, animations and buffer layout are byte-identical, so every geometry pin still holds.

| | Before | After |
|---|---|---|
| All models | 549 MiB | 232 MiB |
| Fetched before entering the world | about 497 MiB | about 214 MiB |

Hashes in the model table, the ledger and the asset receipts are regenerated. Staged loading is not done: wildlife and
furniture take part in building the world, and deferring them needs that build restructured.

## Animation

- The hero's actions are upper-body overlays with their own fade in and out over the gait; guarding or aiming, the legs
  follow the way he moves and back off with the gait reversed; standing, his feet stay planted as he turns and step round
  once the twist grows. Residents step round when they turn.
- Feet meet the ground under them: each ankle is lifted to the ground, at most 0.28 m, the pelvis lowered to the lower
  foot, and each leg solved as a two-bone reach with the sole kept level.
- Work clips touch their surfaces: the supplier's palms rest 0.2–0.4 cm above the counter, the chisel meets the quarry
  face within 1.6 cm and the hammer meets the chisel at the clip's blow, and the measuring rod stands on the ground.
- Open: authored turn clips (both the hero and residents turn with stepping derived from their gaits); resident fingers
  (the resident rigs have no finger joints); the rod leaves the ground for about half a second at its clip's loop.

## Residents indoors

Each resident has a place to sleep (`src/world/homes.ts`). At night they walk in through their door on a fine route
inside the room, sit on the edge of the bed and lie down; they get up and walk out in the morning. Spoken to in bed, they
sit up to talk and lie down again. Loading at night puts them in bed, since their positions follow the clock. Four
residents work indoors in the morning: the baker at the oven, the mill hand at the bench, the estate steward and the
reeve at their tables. Nobody vanishes at a door any more. Open: an alarm that wakes sleepers, since residents have no
alarm system yet.

## Hunting and riding

- Taken animals return after hours that suit their kind (deer 20, boar 26, stag 30, wolves 36, bears and big cats 72),
  never within 70 m of the hunter; wounds heal after 6 hours and unskinned carcasses clear after 30.
- The hunter rises through Tracker (3), Hunter (8) and Master (15) kills: Rowan pays more for game, trades more arrows per
  hide, and skinning quickens. The tally is saved; older saves read as a novice.
- Predators hold their ground and watch, now and then warning the hunter off, until he comes close; deer, boar and wolves
  carry an alarm to their own kind, so a shot scatters a group; a returning animal settles somewhere new in its range.
- The saddled deer at the caravan rest can be ridden: walk, run with sprint, and dismount beside it. Deep water, a fall
  or death puts the rider down, and a mount left far from its rest is led home out of sight.

## Close up

- Window panes seen from inside show the land and sky outside, captured from the room's middle past its own walls, on
  medium and high quality.
- Near broadleaf crowns carry a second layer of their leaf cards, turned and drawn toward the heart, up to the tree's
  triangle budget (up to about twice the leaf triangles), so close crowns show less sky through them.
- The sea and rivers are rougher and less sun-glazed.
- Open: hearth shadows. A shadow-casting hearth light pushed every lit material past the texture-unit limit on high
  quality, so it stays off. Fuller crown art itself needs a new export of the trees.

## Performance evidence

Measured on the production build served locally, high quality, in headless Chromium on Direct3D 11 at 1280×720 on one
development machine; frames are capped by vsync at 60 Hz, so these show headroom at that cap, not reference-hardware cost.

- **Loading:** 158 requests, 225.6 MB, of which 214.0 MB models, ready to play in about 43 s from a local server.
- **Sustained frames:** six places at 11:00 and 22:00, eight seconds each: mean 16.6–16.7 ms, p99 at most 17.2 ms, with
  0.46–4.5 million triangles and 71–419 draw calls a frame.
- **Long session:** ten minutes moving between places and hours: mean 16.7 ms throughout, JS heap 975–1,000 MiB with no
  growth, GPU geometries 766 rising to 837 as new places were first seen and then steady, textures steady at 226.
- Building surfaces at high quality occupy about 112 MiB of GPU memory, as before; this pass does not change them.

## Model ledger

Every GLB has a ledger entry with its source and terms as recorded, including the 17 generated resident rigs. No file
claims commercial clearance. Open: which Meshy plan each generated model, rig, motion and furniture piece was made under
is not recorded, so their licence branch remains pending.
