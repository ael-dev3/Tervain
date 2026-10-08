# Tervain bug audit and Gothic 3 improvement proposals

Audited source: [`cd3c76025cf471980e9ba117c935102148213b1d`][revision],
8 October 2026. This includes the merged resident rigs, rooms, weathered surfaces,
download policy and subsequent resident corrections.

This PR records findings and proposals. It does not fix the bugs or change
runtime code, assets, settings, dependencies or the automated test suite.
The included diagnostic script runs isolated fixtures against the existing
development modules; it is not part of `npm test`.

## Confirmed findings

Priority means P2 = a normal fix backlog item with a bounded impact;
P3 = minor usability polish. These are not crash or save-corruption findings.

| ID | Priority | Bug | Evidence |
| --- | --- | --- | --- |
| TV-B01 | P2 | An outdoor camera above a room is classified as indoors | Same lighting factor inside and 20 m above the room's wall top |
| TV-B02 | P2 | Exhausted surface-download failures remain cached after recovery | Zero textures on both retries; no new JPEG attempts despite a successful direct fetch |
| TV-B03 | P3 | Vertical-only gamepad look leaves keyboard control hints active | Connected controller and active vertical axis, but `device` remains `keyboard` |

### TV-B01: indoor effects ignore the room's vertical bounds

**Trigger.** The camera's X/Z projection enters a building footprint while its
height is above the roof, for example an elevated outdoor view across a house.
An indoor view should receive the interior treatment; an above-roof view should
retain outdoor lighting and sound.

**Reproduction.** Using the real `reeve_house` room and a flat ground fixture,
create three independent `InteriorLight` instances. Call `update(1, camera, 0, 1)`
with a camera inside, one at the same X/Z but Y = 23.6, and one horizontally
outside at that same height. The room's wall top is 3.6.

**Observed.** Indoor factor is `0.950212931632136` both inside and above the
room; outside it is zero. These are direct module observations in native
Chromium. Ordinary rooftop traversal was not exercised.

**Where.** [InteriorLight.update][b01-light] passes only X/Z to the room locator.
[WorldScene.update][world-effects] consumes that factor to dim hemisphere,
environment and, on Low, sunlight. The source trace also shows
[WorldScene.underRoof][b01-roof] and [App.audioUpdate][b01-audio] using only X/Z:
the [sound pipeline][b01-sound] then selects a 1,100 Hz indoor cutoff rather
than the 20,000 Hz outdoor cutoff. The acoustic consequence is source-traced,
not a listening-test claim. [Furniture visibility][b01-furniture] has the same footprint-only
inside test; it can also prepare indoor instances for a camera above the roof.

**Future acceptance check.** Check floor/ceiling height as well as the footprint,
then exercise inside, below-floor, above-roof and doorway-edge cameras. Preserve
the existing gradual lighting transition. No such change is implemented here.

### TV-B02: failed optional surfaces cannot recover in the same session

**Trigger.** The surface manifest downloads successfully, but the JPEG requests
fail long enough to exhaust the downloader's existing retries. The connection
subsequently recovers. Generated textures are a useful fallback during the
outage; rebuilding or changing quality should be able to recover the baked art.

**Reproduction.** In a fresh browser profile, return HTTP 503 for the 24 building
JPEGs while allowing all other requests. Wait for all three attempts per file
to finish (72 attempts). Allow normal fetching again, verify that a direct
`bark-albedo.jpg` fetch succeeds, then call `loadBakedTextures('low')` and
`loadBakedTextures('high')` again.

**Observed.** First load returns zero textures. The restored direct fetch is
HTTP 200 with 92,082 bytes. Both subsequent loader calls still return zero;
the JPEG-attempt count remains 72. A quality switch does not recover the art.
This does not prevent play: generated surfaces remain in use.

**Where.** [download()][b02-download] catches each pair's rejection and fulfills
the shared `downloads` promise with an empty/partial map. Its outer rejection
handler therefore never clears that promise. [loadBakedTextures()][b02-retry]
deletes an empty decoded result to retry on the next build, but that new decode
consumes the already fulfilled empty download map. The
[shared downloader][download-policy] already retries transient failures three
times; the defect is recovery after those retries, not absence of initial retries.

**Future acceptance check.** After a transient outage, retry missing entries in
a bounded way without discarding successfully checked files or bypassing hashes.
Also cover partial failure, repeated failure and recovery without page reload.
No downloader or cache change is implemented here.

### TV-B03: vertical-only controller input does not switch device hints

**Trigger.** After keyboard use, connect a standard controller and move only the
right stick vertically. Do not press buttons or move another axis.

**Reproduction.** Poll `Input` with a connected standard-gamepad fixture whose
axes are `[0, 0, 0, 1]` and whose buttons are released. Compare it with the
horizontal-only control case `[0, 0, 1, 0]`.

**Observed.** The vertical case has `gamepadConnected = true` and normalized
`ry` approximately 1, yet `device = 'keyboard'` and the jump hint is `Space`.
The horizontal case selects `gamepad` and shows `LB`. This is a polling fixture,
not a physical-controller session.

**Where.** [Input.poll][b03-poll] includes `lx`, `ly` and `rx` in activity detection
but omits `ry`. [Input.look][b03-look] nevertheless uses `ry` for pitch, and
[Input.label][b03-label] chooses the displayed binding from `device`.

**Future acceptance check.** All four independent axes should select controller
hints when used beyond the activity threshold, without switching on neutral
noise or after an input-reset gate. No control change is implemented here.

## Reproduce the findings

Run a development server, then the script from the repository root:

```sh
npm run dev
```

In another terminal:

```sh
node docs/engineering/audits/2026-10-08/reproduce.mjs
```

The script uses the repository's `tools/cdp.mjs`, Node 22+ and Chrome/Chromium or
Edge (`CHROME` can select its executable). `TERVAIN_URL` selects another Vite
address; `AUDIT_OUT` selects the JSON output. By default, the report goes to the
ignored `outputs/bug-audit-2026-10-08.json`. A production server does not expose
the `/src/` modules used by these fixtures.

It opens a temporary browser profile, injects only the controlled surface outage
and a gamepad polling fixture, and closes the browser afterwards. It does not
modify game files or normal browser saves; it writes only the requested evidence
file. Assertions expect the recorded
defects to be present: a later fix should require updating this diagnostic.

The checked-in [evidence.json](evidence.json) records the successful run against
the pinned revision. All three findings reproduced; the twelve surface warnings
were expected from the injected outage, and no browser errors were recorded.
The final code was checked with `node --check`; documentation links and changed
paths were checked separately. No full gameplay traversal, hardware performance
benchmark or audio listening review is claimed.

## Improvement proposals grounded in the Gothic files

These are suggestions for Tervain, not recovered implementations of the full
Gothic engine. Its [animation rules][gothic-rules], [original evidence][gothic-evidence]
and [browser reconstruction limits][gothic-limits] explicitly leave full actor
layering, masks, motion extraction and frame effects unresolved. Native clips,
voices and quests are not copied into Tervain by this PR.

| Order | Proposal | Gothic reference | Tervain acceptance goal |
| --- | --- | --- | --- |
| 1 | Extend existing crossfades with explicit action phases and upper-body overlays | Raise/Hit/Recover, Begin/Loop/End, motion slots, fade descriptors | Attack, aim, hurt and skin transitions retain stable lower-body contact and current gameplay authority |
| 2 | Add direction-aware locomotion while keeping distance-driven gait | Forward/back/left/right selection and speed-based blend weights | Guarded side/back movement looks like side/back movement rather than a forward gait |
| 3 | Separate elapsed simulation time from rendered pose interpolation | An explicit motion clock and playback descriptor | Ordinary low frame rates do not slow the whole simulation; long stalls and hidden tabs remain bounded |
| 4 | Extend existing routines into furnished rooms using real destinations | Sleeping/Working/Relaxing point assignment | NPCs cross doors and arrive at their actual bed/work/seat rather than disappear at the entrance |
| 5 | Connect hunting outcomes to a small persistent local objective | Quest state transitions and ordered reward effects | Hunt, skin, delivery/reward and reload form one legible, repeat-safe gameplay loop |

### 1. Phase and overlay rules for animation transitions

The [Gothic animation rules][gothic-rules] separate action, phase, pose,
equipment and direction. They retain a standard fade near 0.2 seconds and a
wrapper fade-in near 0.3 seconds. [PlayAni's source-backed adapter][gothic-playani]
retains distinct motion slots and ordered start/completion behavior.

Tervain already has hero clip weights and resident crossfades; keep them.
Extend them with explicit interrupt rules and upper-body masks for aiming,
working and reactions so transitions do not need to replace the entire pose.
Use the recovered fade values as comparison candidates, not universal settings.
Combat hit windows, arrow impacts and skin rewards must still come from existing
gameplay controllers. Review idle-to-aim, moving-to-guard, hurt-to-recovery and
skin-start/cancel at 30/60/120 Hz, including a held input through the transition.

### 2. Direction and contact-aware movement

[selectNativeLocomotionAxis][gothic-locomotion] selects movement direction and
blends stand/walk/run/sprint using the selected motion's speed. The repository
retains the original [Game `20211230` listing][gothic-speed-source]. Its diagonal
combiner and phase synchronization remain separate dependencies.

Keep Tervain's actual-distance gait advancement and current seated foot fitting.
Add approved side/back clips or authored direction blends for the hero's guard
movement, then synchronize phase while changing direction. Treat terrain foot
planting as a separate bounded extension to the current seating work, rather
than assuming full locomotion IK already exists. Check that blocked movement
stops gait, a stationary turn does not slide the boots, and a camera turn cannot
reverse a planted foot. Do not substitute Gothic models or motions for the
approved Tervain actors.

### 3. Stable simulation and smooth rendered poses

The [original forward-motion clock][gothic-clock-source] and its
[bounded browser implementation][gothic-clock] expose duration, playback speed,
elapsed time and loop state separately. This is useful design evidence for
keeping clip time and game state explicit; it does not prove Gothic used a
particular browser fixed-step scheme.

Tervain's [FrameClock][tervain-clock] deliberately caps each simulation delta at
0.05 seconds. At a steady 10 Hz, a 0.1-second visible interval therefore advances
0.05 simulation seconds. This is a source-derived tradeoff, not a measured FPS
defect or a fourth bug claim. Evaluate a bounded accumulator with smaller physics
steps and interpolation between resolved actor poses. Cap catch-up work and keep
hidden/loading time discarded; do not advance through an arbitrarily long stall.
Compare movement, stamina, day clock, bow release and contact ordering over the
same ordinary elapsed time at 15/30/60/120 Hz before adopting the design.

### 4. A resident's routine should end at a visible activity

[Native navigation routine assignment][gothic-routine] maps a selected routine
to SleepingPoint, WorkingPoint and RelaxingPoint in a defined order. The
[scene placement reader][gothic-placement] preserves actual point identities and
explicitly does not implement native pathfinding or schedule execution.

Use that destination-based model to extend Tervain's existing schedules through
the new doorways into rooms. This is new scope: the room feature deliberately
keeps navigation footprints closed and nighttime residents currently disappear
at their door. Add indoor routes and measured activity anchors before animating
arrival, sitting and sleep. Preserve collision-checked approaches and existing
seating transitions. Review a whole day, an occupied doorway, interrupted travel,
shared sleeping quarters, and save/reload during entry. This existing limit is
not included in the confirmed-bug table.

### 5. A complete hunting loop with durable consequences

[Gothic quest state/reward handling][gothic-quests] makes state transitions and
the order of consequences explicit. Unsupported rewards remain gated rather
than being silently treated as success. That principle can help Tervain's own
content without importing Gothic quest wording or campaign assets.

Propose one small local objective that acknowledges a hunt, collected resources
and a delivery/trade outcome in the journal and an NPC response. Connect existing
food/trade systems where appropriate; establish the objective's content and
reward before adding it. Keep durable animal death/skinning authority, and
ensure an accepted delivery can grant its reward only once across save/reload.
Success should tell the player what changed and where to go next. This proposal
does not claim that Tervain's current prototype lacks all trade or quest systems.

[revision]: https://github.com/ael-dev3/Tervain/tree/cd3c76025cf471980e9ba117c935102148213b1d
[b01-light]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/interiorLight.ts#L38-L47
[world-effects]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/world.ts#L568-L590
[b01-roof]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/world.ts#L659-L662
[b01-audio]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/app.ts#L2046-L2052
[b01-sound]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/sound/soundWorld.ts#L859-L865
[b01-furniture]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/furniture.ts#L110-L120
[b02-download]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/bakedTextures.ts#L35-L56
[b02-retry]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/presentation/bakedTextures.ts#L89-L107
[download-policy]: ../../../../src/presentation/assets/download.ts
[b03-poll]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/platform/input.ts#L238-L253
[b03-look]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/platform/input.ts#L342-L354
[b03-label]: https://github.com/ael-dev3/Tervain/blob/cd3c76025cf471980e9ba117c935102148213b1d/src/platform/input.ts#L371-L378
[gothic-rules]: ../../../../public/gothic3/animation-state/rules.json
[gothic-evidence]: ../../../../assets/gothic3/animation-state/native-evidence.json
[gothic-limits]: ../../gothic3-browser-port.md
[gothic-playani]: ../../../../src/gothic3/animation-instruction.ts
[gothic-locomotion]: ../../../../src/gothic3/animation-state.ts
[gothic-speed-source]: ../../../../assets/gothic3/animation-state/sources/Game/20211230.asm.txt
[gothic-clock-source]: ../../../../assets/gothic3/animation-state/sources/Engine/3064c600.asm.txt
[gothic-clock]: ../../../../src/gothic3/animation-state.ts
[tervain-clock]: ../../../../src/platform/frameTiming.ts
[gothic-routine]: ../../../../src/gothic3/navigation-routine.ts
[gothic-placement]: ../../../../src/gothic3/scene-routine-position.ts
[gothic-quests]: ../../../../src/gothic3/quest-state.ts
