# Prototype: the Grey Strand and Bellwether Vale in the browser

Status: **playable prototype, version 0.0.4, presentation revised on 30 September 2026 against the rugged Gothic 3 brief (decisions A12–A18).** The first playable from 29 September is the basis of the simulation and content. The current pass opens the beach horizon, lifts shadow detail, removes development copy from the title screen, gives named people stable face traits and varied work gestures, and removes synthesized event tones while retaining their captions. Tree and leaf sway remains paused. It is a test of the [architecture](architecture.md) and the [vertical-slice brief](../production/vertical-slice.md), not a finished slice, a desktop package, or a decision to ship on this stack ([P04](../decisions.md) stays a proposal). Everything below separates what is implemented from what is only representation and from what has not been verified.

Play it: <https://ael-dev3.github.io/Tervain/> · Package version is shown on the title screen; source revision is available in the debug panel. See the [0.0.4 changes and release handoff](../production/releases/0.0.4.md) for the current construction, archive, vegetation, rite, and lifecycle revisions and their validation status. A21 confirms the Templars as part of Hegemony. A22 supersedes the [historical static red-cloth menu](../production/releases/0.0.4.md#menu-presentation-follow-up) with a separate original native 3D desert-market scene for title, pause, and nested pause forms. This revision is implemented and locally reviewed in unmerged PR #2; publication remains pending. The [current menu handoff](../production/releases/0.0.4.md#native-3d-desert-market-menu-follow-up) records scene counts, browser checks, CPU-only regression coverage, and unverified device/failure cases separately from earlier checks and the published prototype. Playable coast and gameplay tree sway remain unchanged.

## What you can do

One connected valley, one main quest, two supporting encounters, and the persistent consequence the slice brief asks for.

- Arrive by wagon on the **Grey Strand** (a beach under **Lantern Point** and its lighthouse), walk inland along the shore track through the gate of a palisaded fishing camp and over open heath to the **overlook**, look down into the vale, walk down to **Rillford**, and see the drought bell swing with its event caption. Meet the reeve, the waterkeeper, the quarry foreman and a stranded maintenance worker.
- Investigate by observation or by testimony: the dry household channel, silt at the spring intake, the village side channel, the quarry seep, the cracked sluice support, the inspection log, an optional rotation ledger in a small locked archive, and a Saltward measuring kit. No single clue is mandatory.
- Rescue the worker (**Stranded at the Cut**) by fighting the creature that blocks her ledge, or by pulling the old maintenance lever so she walks out on her own.
- Reach the archive (**The Kept Record**) with the waterkeeper's permission, a key the shrine warden will lend on your word, or by forcing the back shutter. A witnessed forced entry reaches the waterkeeper only after a delay; an unobserved one leaves no trace.
- Take the spare brace and wrench from the quarry yard, optionally learn the **spring rite** from the waterkeeper, and **brace the sluice**. Force the gate first and it jams: a recoverable repair, with worse rationing meanwhile.
- **Decide how the reduced flow is shared:** prioritize Rillford, prioritize the quarry, or set a witnessed rotation that needs the reeve's, foreman's and waterkeeper's consent. Each shows its gain, its cost and its legal weight before you commit.
- See the result: a channel that fills or stays dry, a mill wheel that turns or stands still, quarry dust and a contract guard, a posted schedule with mill by day and quarry by night, and a noticeboard that records the decision — including a misleading account if you chose to hide what you found.
- Train one guarding skill with the shrine warden, fight a handful of readable encounters, save, quit and return to the same outcome.

## Controls

| Action | Keyboard and mouse | Controller |
| --- | --- | --- |
| Move / look | WASD / mouse (click the view to capture the pointer); Z and C turn the camera | Left stick / right stick |
| Sprint · jump | Shift · Space | RT · LB |
| Interact · talk | E | A |
| Attack · heavy attack | Left click or J · K | X · Y |
| Block · evasive step | Right click or L · Q | LT · B |
| Use poultice | H | RB |
| Journal · map · inventory | Tab · M · I | D-pad up · Back · D-pad down |
| Pause / back | Esc | Start / B |
| Quicksave · quickload | F5 · F9 | — |
| Debug and benchmark panel | Backquote or F3 | — |

Keyboard and mouse bindings can be remapped in Settings (a left click cancels a rebind, so it cannot be bound). Pressing a key that another action uses reports the conflict; pressing it again swaps the two actions' keys, and the screen says which action changed. Controller layout is fixed. Menus and panels work from the keyboard (arrows or Tab to move, Enter or Space to press, Esc to go back), dialogue from number keys, arrows and Enter, and everything from the controller (D-pad or left stick to move, left/right to change a slider or select, A to press, B to go back). Sprint and block can be toggles.

## Accessibility and comfort options

Text size (80–180%), reduced motion (steadier camera, no shake, calmer ground cover, still title view and rite geometry), high-contrast interface, reduced effects (solid surfaces and fewer soft interface highlights), a brightness setting for night and shade, optional guidance, captions for important sounds (the bell, the gate, the creature), independent master/music/effects/ambience/dialogue volumes, look sensitivity and invert, and hold/toggle choices. Choices in dialogue are labelled with their intent, and a locked choice stays visible with the requirement you have not met. There is no timed dialogue or timed button prompt and no drought deadline: pausing, reading a panel, talking or changing settings stops the game clock and never harms the valley. While you are free to move, the day and night clock, the spring rite's calm window, a witness's report and combat all run in real time. Hidden tabs suspend simulation and audio without catching up their elapsed time on return.

## Real, representation, and missing

| Area | Implemented for real | Representation or placeholder | Not implemented |
| --- | --- | --- | --- |
| World | One authored coast-and-valley from a single layout that drives rendering, collision, navigation, NPC anchors and interaction points. The coastline, beach, cliffs and headland are a pure function of position (`world/coast.ts`). | Everything is generated in code at load: terrain shape from noise and authored pads, ground textures, buildings, props, trees and rocks. Terrain is a height field with authored hills, not a sculpted level. Only the west coast, the palisade and the walk to the overlook follow the Gothic 3 reference; the vale is the earlier layout re-dressed. | A second region, a level editor, streaming. |
| People | Eleven named residents with schedules, grid A\* navigation, doorway hiding at night, ambient remarks, and durable absence for any principal (via the debug panel and scenario tests). | Bodies are one shared rig with sculpted heads, tapered limbs, bending knees and elbows and layered worn clothing; residents differ by build, face, hair, costume and colour, and some by silhouette only. No facial animation, no skinning, no cloth simulation. | Voice acting, killing residents in play (see [O12](../decisions.md)), a modular character pipeline. |
| Story state | A renderer-free simulation: facts, evidence with provenance, phases, atomic one-time grants, `observed_by` versus `known_to`, delayed reports, saved pending reports, three allocations, forced-gate recovery. | Dialogue is authored data with generated string keys, in English only. | Localization, a dialogue authoring tool. |
| Combat | Light and heavy attacks, block with a short perfect-block window, evasive step with invulnerability frames, stamina with a no-lock guard, telegraphed hostile attacks, a stagger rule, persistent defeated encounters. | One humanoid archetype and one creature, hand-tuned. | Weapon variety, ranged threats, bosses. |
| Camera and movement | Third-person orbit camera with obstruction handling, slopes, step limits, shallow water, a footbridge deck, a ford. | Jump and dodge are simple kinematics. Foot placement is not solved. | Root motion, foot IK, swimming. |
| Presentation | Day and night, lantern lights, a lighthouse lamp and turning beam after dusk, ground-cover wind, a sea with foam and depth, animated stream water that reflects the flow state, mill wheel, quarry dust, a restrained grade pass, and a paper/timber/soot interface. Tree and leaf sway is paused for A16. | Ground and building textures are generated, not authored; trees are procedural skeletons with leaf-card foliage at three levels of detail; buildings are assembled from boxes, lathes and courses of roof pieces; rocks are noise-displaced and plane-cut spheres. Every model is a stand-in for authored art. | Final authored art, depth of field, impostor trees, texture atlases, bespoke animation polish. |
| Audio | Filtered procedural wind, channel-water and sea beds, plus captions for key events. Synthetic event tones and the synthesized story bell are disabled. | The ambience is placeholder synthesis; no reviewed recording or final score is included. | Recorded and mixed ambience, authored effects, score, occlusion, and mixing for real hardware. |
| Saves | Versioned envelope, checksum, temporary-write-then-verify, previous-save recovery, corrupt versus incompatible messages, size bound, forward-compatible merge. | Backed by browser local storage. | Desktop file access, cloud sync, a migration test corpus. |
| Packaging | A static web build with no service dependency; works offline once loaded. | — | An Electron or other desktop package, Steam integration, controller verification on real devices, Steam Deck testing. |

**Assets and technology.** The scene loads no model, texture or sound files: geometry, textures and placeholder ambience are generated at start-up; the visual scene uses fixed seeds. Warpkeep's runtime GLBs are imported and archived under `assets/warpkeep/` (see the [asset inventory](asset-inventory.md)) but are not used or published: their bright, chunky look conflicts with decision A12. Shared **technology** is used with attribution headers: the rooted-sway wind model and gust field (trees remain paused), the generated sky image-based light, and the streamed grass tiles, all from Warpkeep at revision 786c0b2 (Apache-2.0). Gothic 3 supplied *measurements and observations only*; nothing from it is extracted or shipped (see the [look reference](../art/gothic3-reference.md)). No music or audio file from Warpkeep is used.

**What the picture is made of.** One terrain mesh (2 m grid) with an eight-layer height-blended shader; one sea mesh; merged chunks of buildings and props; instanced trees at three levels of detail chosen and culled by hand every few frames; streamed grass tiles; a grade pass into a half-float target (multisampled above the low preset). An earlier prototype snapshot, before the 0.0.4 construction and flora changes, recorded headless-browser counts for the Rillford view at high quality with `tools/cdp.mjs` (software-assisted Chrome, not a phone or a reference machine): about 330 draw calls and 650 thousand triangles per frame counting the shadow pass, of which roughly half were the shadow pass. **These historical counts are not a current build measurement or a frame rate, and no performance result is claimed.**

## How to run it

```bash
npm install
npm run dev        # local development server
npm run typecheck  # TypeScript 7 strict check
npm test           # scenario tests (Vitest)
npm run build      # typecheck, then a static build in dist/
```

Node 24 or newer is recommended. The published site is built and deployed from `main` by [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml).

## Save recovery

Saves live in browser local storage under `tervain:save:<slot>:cur`, with `:prev` (the previous successful write) and `:tmp` (the in-flight write). If the current save fails its checksum the game restores `prev`, then `tmp`, and says so. A save from a newer build is reported as incompatible rather than loaded. Clearing site data removes saves. A damaged slot can be deleted from Load.

## Testing and measurement

Automated checks cover invariants, not the wording of documents or the look of the game:

- **Quest and consequence scenarios:** entry from any trigger; evidence added once with its first provenance; derived evidence; contradictions as questions; gate stabilisation with and without the rite or the worker's procedure; forced gate then repair; each allocation reachable and settling once; rotation needing evidence and consent, with a coin route and a ledger route; humiliation and mediation; hidden evidence and a misleading public account; one-time rewards; atomic effects; unavailable principals and caretaker witnesses; witnessed versus unobserved trespass and report delay; save and reload before and after commitment and reward.
- **Persistence:** round trip, recovery from a truncated current save, a truncated write never replacing the previous good copy, corrupt versus incompatible saves, oversize, accidental corruption caught by a checksum (which is not tamper-proof), forward-compatible merge, and a reload while committed and after settling.
- **World:** the strand and headland (dry sand at the spawn, deep open sea, no flooded hollows inland, a walkable route to the lighthouse door, a walkable jetty), every schedule anchor, pickup, observation point, the sluice control, the maintenance lever, the result-check points and the archive shutter has somewhere to stand, every scheduled transition and quest route has a walkable path, and the archive is closed until its door or shutter opens.

**Visual checks are by eye.** `tools/shot.mjs` takes a headless screenshot of the running dev server (`node tools/shot.mjs out.png place=shore hour=15 hud=0`; extra parameters `x`, `z`, `face`, `yaw`, `pitch`, `dist`, `cam=x,y,z,tx,ty,tz`, `fov`, `hide=forest,scatter,groundcover,scenery,sea,water,actors`, `lineup=x,z` and `lod=0|1|2` for the tree lineup). `tools/cdp.mjs` drives the page over the Chrome DevTools Protocol for scripted smoke runs (boot, new game, visit every place, read draw and triangle counts, collect console errors). Both need Chrome or Edge and `npm run dev`. No automated test judges how the game looks.

**Reference-hardware performance is unverified.** The [architecture](architecture.md) sets 1080p at 60 FPS on an agreed reference machine as a hypothesis. One local 0.0.4 production-preview run is recorded with its limits in the [release notes](../production/releases/0.0.4.md); it is not a matched before/after comparison or reference-machine acceptance. The debug panel (Backquote) shows median, 95th and 99th percentile frame times, draw calls, triangles and memory counters, and can run a fixed camera route (about a minute) and print a report with the device, browser and quality preset. Frame times are the intervals between animation frames, recorded uncapped (only the simulation step is clamped to 50 ms), so they are limited by the display's refresh rate and reflect a real, running game with its clock, characters and time of day, not a frozen scene. The report prints the game hour and quest phase but does not pin them, so compare runs started from the same state. Run it on a real device before quoting any number, and attach the report.

## Known limitations

- Stand-in art throughout: generated textures and assembled geometry, not authored assets. Faces are sculpted but small and unanimated; at typical camera distance they read as a jaw, brow and nose, not expressions.
- Ordinary closed houses have complete backed exterior shells, not authored playable interiors. The archive has the enterable room, supported floor, and entry thresholds described in the [0.0.4 notes](../production/releases/0.0.4.md).
- The Gothic 3 likeness is atmospheric and structural (a coast, a headland with a lighthouse, an empty heath, distant forest, dark worn materials); it is not a reproduction of Ardea's own buildings, whose placement was not read from the game data. The lighthouse has no counterpart in the game data and follows the owner's brief.
- The shoreline pads, the beach and the sea are tuned by eye in screenshots; a wading player slows in shallow water but there is no swimming and no tide.
- Only a desktop browser has been exercised, mostly through scripted runs with synthesized keyboard events plus a few real clicks. A physical controller, touch input and other browsers were not tested.
- Browser pointer capture needs a click; pressing Esc while captured pauses through the pointer-lock change rather than a key event.
- The land ends at a low, rough-heath boundary and at the sea (open water deeper than about 0.9 m blocks walking), with a message at the boundary. There are no invisible walls across plausible openings.
- Navigation is a 2 m grid, deliberately conservative near thin walls, so residents do not use the archive door.
- Only the shrine warden can witness a forced entry in play, and only by line of sight during his short patrol behind the archive each day; other residents are not modelled as witnesses. (The waterkeeper receives the report, but her routine never passes the shutter.) A sealed archive stays open until the player steps out, so nobody is locked in.
- Emergency allocations are described as lapsing unless reviewed, and the bridge callback is stored as a flag, but neither a review nor an expiry is simulated; they are narrated only.
- Ambient remarks are single lines, and returning to a conversation after the decision works only through authored aftermath nodes.
- The world builds synchronously at load (ground textures are generated in slices so the loading text repaints). It takes noticeably longer than the earlier prototype because textures, trees and geometry are generated rather than loaded; the time has not been measured on a range of machines.
- The lighthouse beam and the sky are the most expensive additions on integrated graphics in principle; neither has been profiled.

## Decision this build supports

The slice brief ends by asking whether the experience is enjoyable, comprehensible, technically viable and economical to author. The story loop is authored as data over a renderer-free simulation, which is what let the scenario tests above run without a browser. That is a structural result, not a measured authoring cost: no authoring time was recorded. The local frame-time report does not validate an agreed target device, packaged desktop behaviour, or how a new player fares. Those still need reference-device measurements and a playtest.
