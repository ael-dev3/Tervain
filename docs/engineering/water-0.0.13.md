# Water — 0.0.13

Every body of water in the realm was rebuilt as one physical system ([A60](../decisions.md)): the sea, the main stream,
the mill and quarry races, the spring with its short fall, and the spring's pool. The requirement was water with real
depth, reflection, foam, volume and physics, and new water sounds. Nothing comes from Gothic, Warpkeep or another
game; there is no purchased water shader or FFT ocean.

## One model of the water

[src/world/water/](../../src/world/water/) holds a renderer-free model, [WaterWorld](../../src/world/water/waterWorld.ts).
It answers one question for any point: is there water here, how high does it stand, how deep is it, and which way does
it move? The meshes, floating cargo, the swimmer, arrows and the water sounds all ask it. What is seen, what floats and
what is heard therefore agree.

**The sea** ([waves.ts](../../src/world/water/waves.ts), [bathymetry.ts](../../src/world/water/bathymetry.ts)):

- One long-crested swell (period 7.4 s, 0.5 m offshore) arrives from the open sea in sets.
- Its phase over the bed is solved once at load by fast marching. The local wave number comes from the linear
  dispersion relation (Fenton and McKee's form), so the crests slow and turn to meet the shore (refraction).
- Height follows energy flux (shoaling) and is capped at 0.72 of the depth, where the wave breaks.
- The headland shelters the water in its lee, and every wave runs up the sand as swash and drains back.
- Six Gerstner wind waves ride on top and die away in the shallows.
- The bed is the terrain inside the world and the distant coast west of it. Beyond the solved grid the coast runs on
  as it leaves the grid.

**Streams and races** ([channels.ts](../../src/world/water/channels.ts)):

- Each course is resampled every metre.
- The surface never rises downstream. It stays below the banks, except where the water downstream already stands
  higher: a low place in a bank is where a stream spills, as at the mill race's intake.
- A race fed from the stream cannot stand above its source, and the quarry race backs up from the stream it joins.
- Speed follows Manning's formula; steep or shallow fast water turns white.
- Water spreads across a course only until a bank stands above it. Ground that falls away below the channel is not
  part of it. Nowhere across a stream is the water deeper than over its middle, so down a cross-slope or a cascade it
  runs as a film over the ground.

**The spring** ([spring.ts](../../src/world/water/spring.ts)): a bowl is cut into the hillside below the source. The
spring falls a few metres into a pool whose level follows the spring's flow.

**Terrain** ([terrain.ts](../../src/world/terrain.ts)): the mill race's bed is cut down through a low rise so that it
falls gently all the way from its intake. The mill wheel moved half a metre over the race's flat bed, so its paddles
turn in the race's water rather than above the cut's sloping side.

Quest flows ease the channels toward their new levels and re-solve them as they move. The water's own clock (waves,
surf, drift) stops under Reduced Motion.

## The sea as drawn

[ocean.ts](../../src/presentation/water/ocean.ts) lays one grid of vertices across the screen each frame. Its rows run
from the bottom of the view to the horizon, dropped onto the sea plane: centimetres apart near the camera, tens of
metres out at the horizon. Each vertex reads the solved bed and swell from float textures and moves with the swell and
the wind waves.

Each pixel combines:

- **Reflection:** Fresnel with water's 2 % head-on reflectance. The coast comes from the planar capture and the sky
  (clouds included) from a captured cube. Reflections smear along the line of sight as the sea roughens with distance.
- **Sun:** a GGX highlight whose width follows the waves the pixel cannot resolve.
- **Light through the water:** the refracted bed, absorbed over the actual path (red first, blue-green last) and
  filled by the water's own scattered light. Caustics play on the submerged ground, and sunlight glows through the
  back of a crest.
- **Foam:**
  - a breaking crest's bore only where the swell has actually reached its limit, with a wandering break point;
  - a fading carpet behind each bore;
  - the swash's bubbly sheet and thin rim;
  - whitecaps and spray-white water against rock;
  - lips around anything standing in the water;
  - the wakes of the interactive ripples.

From below, the sky shows through Snell's window and the rest of the surface mirrors the water. The water pass skips
the sea when none is in view, using tiles of sea and coast-following tiles of open ocean.

## Inland water as drawn

[rivers.ts](../../src/presentation/water/rivers.ts) draws each course as a ribbon, one row per metre, level across at
the solved surface. The banks draw the shoreline. Calm water reflects banks and trees by a screen-space march.
Ripples and foam drift with the water's own speed. Falls tear into white streaks over clear water, and cascades and the
spring's trickle lie as a film over the stone. Thin water over its own bed reads as clear water; only something
standing in the stream gets a lip of foam. The pool is a level disc in the spring's basin.

## Things that meet the water

- **Ripples:** a wave-equation height field near the player, on the GPU: 512² over 44 m on High, 256² over 36 m on
  Medium, none on Low. Steps, strokes, splashes, arrows and fish drop impulses into it, and every water surface reads
  it.
- **Spray:** a pool of 480 droplets.
- **Floating cargo** ([physics.ts](../../src/world/physics.ts)):
  - Buoyancy acts as eight point forces per barrel or crate. A barrel floats about two fifths under and a crate about
    half.
  - The water's drag pulls each body toward the water's own motion, so cargo bobs on the swell, drifts with a stream
    and washes about in the surf.
  - A body dropping in throws spray, and a floating barrel knocks hollow against rock.
- **Wading and swimming** ([player.ts](../../src/presentation/player.ts)):
  - Wading slows the hero with depth, to half pace at the waist, and the current pulls at his legs.
  - In water deeper than 1.35 m he swims, with his feet 1.25 m below the surface. He stands again below 1.15 m.
  - He swims at 1.45 m/s, or 2.3 m/s at a hard crawl that spends stamina. The current carries him.
  - There is no fighting, guard, bow, jumping, dodging or work in deep water.
  - Getting in, strokes, wading steps and climbing out are each seen and heard.
  - The hero leans into a breaststroke about his chest, so his head stays above the waterline. Standing still, he
    treads water upright.
- **The camera** never sits in the waterline. A swimmer's camera may look up from under the surface. There the view
  is absorbed and scattered over the real distance to every pixel, ended by the surface overhead. It has a slow
  refractive wobble and caustics on the bed, with muffled sound and an underwater bed.
- **Arrows** splash as they break the surface and lose their speed within a few tenths of a second. They lodge in a
  shallow bed, or float up and drift for half a minute.
- **Fish** rise now and then in calm water near the player.

Residents and wildlife keep to the ground; they do not wade into deep water or swim.

## Sound

Seventeen new water sounds were generated with the ElevenLabs Sound Effects API (`eleven_text_to_sound_v2`) from
original descriptions:

- **Six beds:** close surf on sand, surf on rock, the open sea far off, still water lapping, rapids and a weir, and
  the sea heard from under the surface.
- **Eleven sources for one-shots:** a wave breaking, a wave bursting on rock, a heavy splash, small splashes,
  breaststrokes, knee-deep wading, getting into deep water, climbing out, a floating barrel knocking, bubbles, and a
  fish jumping.

[waterSound.ts](../../src/presentation/water/waterSound.ts) finds the water around the listener from the model. Every
0.35 s it scans 200 points around the listener for:

- the nearest breaker line on sand;
- the nearest surf on rock;
- white inland water;
- calm water.

The surf, rock, rapids and lapping beds are placed there. Each crest's crash is heard as that crest breaks at the
listener's stretch of shore. The open sea's roar carries up the cliffs and fades a few hundred metres inland. Under
the surface the world's beds close down to a muffle and the underwater bed takes over. Splashes, strokes, wading
steps, getting in and out, knocks and fish come as events from whatever disturbed the water.

- The prompts are in [plan.json](../../tools/world-audio/plan.json).
- Processing, durations and source and derivative hashes are in
  [world-audio-assets.json](world-audio-assets.json).
- They are rebuilt by [prepare.mjs](../../tools/world-audio/prepare.mjs) into the `water` sprite bank and six loops.
- Generation-time subscription evidence was not recorded with these seventeen. Their commercial clearance is not
  established, as with the six hunting recordings. They are ElevenLabs service outputs outside the software licence.

## Presets

| | Low | Medium | High |
| --- | --- | --- | --- |
| Sea grid | 96 × 96 | 160 × 150 | 224 × 210 |
| Refraction, screen-space reflection, caustics | off | on | on |
| Ripple field | none | 256² / 36 m | 512² / 44 m |
| Sky capture | 64² | 64² | 128² |

Reduce Effects turns off the capture-based optics on any preset. Reduced Motion stops the water's clock, the spray,
the ripples and the fish.

## Verification

- **Model:** dispersion, shoaling, breaking and swash; refraction up the bed's slope; shelter and rock; channel
  surfaces that never rise downstream at any quest flow; the spring's bowl; one sample for every body; no deep phantom
  water below the spring; flows easing and the water clock under Reduced Motion.
- **Mill wheel:** its lowest paddles reach the race's solved water at turning flows without touching the bed.
- **Physics:**
  - barrels and crates float at their water lines and sink without water;
  - they drift with a current and bob with a moving surface;
  - one splash per drop;
  - buoyancy is released when the water is taken away.
  - restoring formerly floating cargo on dry ground clears its standing forces and torques, so gravity resumes.
- **Swimming:** the hero walks out of his depth into a swim and floats at the surface at swimming pace. He cannot
  fight, guard, jump or dodge there. A current carries him, he finds his feet in the shallows and drips on climbing
  out. Without the water model, deep water still simply blocks.
  Dry bridges and elevated supports retain ordinary walking pace even above a deep bed; shallow submerged supports
  let the swimmer regain footing and wade out.
- **Hero pose:** the breaststroke keeps his head above the waterline with one stroke a cycle; treading is upright, and
  he stands straight on leaving the water.
- **Sound:** surf on the strand's breaker line and on the headland's rock; calm water at the ford and the pool, white
  water at the spring's fall. Each crest is heard once. The listener knows when it is under water, and the beds follow.
- **Drawing:**
  - finite bed and swell textures;
  - sea bounds that show the sea offshore and nothing inland;
  - no inland water sheet floating above its ground;
  - the pool at the model's level;
  - spray and ripple guards;
  - arrows that splash once, slow, float and drift;
  - a remembered camera side with separate water-entry and exit clearances prevents waves from repeatedly snapping
    a stationary swimming view across the surface;
  - underwater lens adjustments preserve the boom's bed and rock clearance, falling back above water at shallow banks;
  - the sea grid projects against the wave surface at the lens, keeping foreground coverage above troughs and overhead
    coverage below crests even when the eye crosses mean sea level;
  - Reduced Motion freezes underwater refraction and caustics while preserving unrelated presentation timing.
- **Browser review:** headless captures were checked on the strand at noon, low and at sunset, on Lantern Rocks, in
  the bay, at the ford, on the main stream, the village race, the spring and its fall, swimming (still and moving) and
  under water.

Not established: a listening review, frame rates on reference hardware, or physical-controller play.

## Limits

- The terrain's 2 m grid limits how finely small channels and the spring's fall can be cut.
- The inland water is too shallow to swim; only the sea is deep enough.
- There is no diving control, no tide and no breaking-wave geometry beyond the displaced surface.
- Residents and animals keep away from deep water.
