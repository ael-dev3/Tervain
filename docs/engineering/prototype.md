# Prototype: Bellwether Vale in the browser

Status: **first playable prototype, built 29 September 2026.** It is a test of the [architecture](architecture.md) and the [vertical-slice brief](../production/vertical-slice.md), not a finished slice, a desktop package, or a decision to ship on this stack ([P04](../decisions.md) stays a proposal). Everything below separates what is implemented from what is only representation and from what has not been verified.

Play it: <https://ael-dev3.github.io/Tervain/> · Source revision shown on the title screen and in the debug panel.

## What you can do

One connected valley, one main quest, two supporting encounters, and the persistent consequence the slice brief asks for.

- Arrive at the overlook, walk down to **Rillford**, and hear the drought bell. Meet the reeve, the waterkeeper, the quarry foreman and a stranded maintenance worker.
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

Keyboard and mouse bindings can be remapped in Settings, with conflict feedback and a swap on a repeated press. Controller layout is fixed. Menus, dialogue and panels work from the keyboard (arrows, Enter, number keys) and from the controller (D-pad or left stick, A, B). Sprint and block can be toggles.

## Accessibility and comfort options

Text size (80–180%), reduced motion (steadier camera, no shake, calmer foliage, still title view), high-contrast interface, reduced effects (removes translucency and blur), a brightness setting for night and shade, optional guidance, captions for important sounds (the bell, the gate, the creature), independent master/music/effects/ambience/dialogue volumes, look sensitivity and invert, and hold/toggle choices. Choices in dialogue are labelled with their intent, and a locked choice stays visible with the requirement you have not met. There is no timed input and no real-time drought clock; reading, pausing or changing settings never harms the valley.

## Real, representation, and missing

| Area | Implemented for real | Representation or placeholder | Not implemented |
| --- | --- | --- | --- |
| World | One authored valley from a single layout that drives rendering, collision, navigation, NPC anchors and interaction points. | Terrain, houses and small props are generated in code at load; trees, larger buildings, people and props are the shared Warpkeep models. Terrain is a height field with hand-placed hills, not a sculpted authored level. | A second region, a level editor, streaming. |
| People | Eleven named residents with schedules, grid A\* navigation, doorway hiding at night, ambient remarks, and durable absence for any principal (via the debug panel and scenario tests). | Bodies are one shared primitive rig with costume variations; four principals are told apart by silhouette and colour only. No facial animation. | Voice acting, killing residents in play (see [O12](../decisions.md)), a modular character pipeline. |
| Story state | A renderer-free simulation: facts, evidence with provenance, phases, atomic one-time grants, `observed_by` versus `known_to`, delayed reports, saved pending reports, three allocations, forced-gate recovery. | Dialogue is authored data with generated string keys, in English only. | Localization, a dialogue authoring tool. |
| Combat | Light and heavy attacks, block with a short perfect-block window, evasive step with invulnerability frames, stamina with a no-lock guard, telegraphed hostile attacks, a stagger rule, persistent defeated encounters. | One humanoid archetype and one creature, hand-tuned. | Weapon variety, ranged threats, bosses. |
| Camera and movement | Third-person orbit camera with obstruction handling, slopes, step limits, shallow water, a footbridge deck, a ford. | Jump and dodge are simple kinematics. Foot placement is not solved. | Root motion, foot IK, swimming. |
| Presentation | Day and night, lantern lights, wind on foliage, animated water that reflects the flow state, mill wheel, bell, quarry dust, translucent interface. | Trees, grass and props are hand-built low-poly primitives. Canopies attach to branches; there is no LOD system. | Final art, foliage LODs, texture atlases, a bespoke menu scene beyond the live valley. |
| Audio | Procedural ambience, effects, a sparse generative score, spatialised bell. | Every sound is synthesized; none is designed audio. | Recorded audio, occlusion, mixing for real hardware. |
| Saves | Versioned envelope, checksum, temporary-write-then-verify, previous-save recovery, corrupt versus incompatible messages, size bound, forward-compatible merge. | Backed by browser local storage. | Desktop file access, cloud sync, a migration test corpus. |
| Packaging | A static web build with no service dependency; works offline once loaded. | — | An Electron or other desktop package, Steam integration, controller verification on real devices, Steam Deck testing. |

The prototype uses runtime models imported byte for byte from Warpkeep (trees, buildings, props, people, a rabbit), recorded in the [asset inventory](asset-inventory.md), plus procedural geometry, textures and audio generated in code. No music or audio file from Warpkeep is used; the `Mesure Avancée` track is not used.

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
- **Persistence:** round trip, recovery from a truncated write, tampering, oversize, forward-compatible merge.
- **World:** every schedule anchor and interaction point is standable, every scheduled transition and every quest route has a walkable path, the archive is closed until its door or shutter opens.

**Performance is not measured here.** The [architecture](architecture.md) sets 1080p at 60 FPS on an agreed reference machine as a hypothesis. This prototype records no reference machine and reports no result. The debug panel (Backquote) shows median, 95th and 99th percentile frame times, draw calls, triangles and memory counters, and can run a fixed camera route (about a minute) and print a report with the device, browser and quality preset. Frame times are display-paced intervals, so they cannot exceed the display's refresh rate. Run it on a real device before quoting any number, and attach the report.

## Known limitations

- Placeholder art throughout; faces and hands are boxes and spheres.
- Only a desktop browser has been exercised, mostly through scripted runs with synthesized keyboard events plus a few real clicks. A physical controller, touch input and other browsers were not tested.
- Browser pointer capture needs a click; pressing Esc while captured pauses through the pointer-lock change rather than a key event.
- The valley boundary is the mountain slope, with a message when you push against it. There are no invisible walls across plausible openings.
- Navigation is a 2 m grid, deliberately conservative near thin walls, so residents do not use the archive door.
- Only the shrine warden and the waterkeeper can witness a forced entry, and only by line of sight in a short window each day; other residents are not modelled as witnesses.
- Ambient remarks are single lines, and returning to a conversation after the decision works only through authored aftermath nodes.
- The world builds synchronously at load and takes a moment on slower machines.

## Decision this build supports

The slice brief ends by asking whether the experience is enjoyable, comprehensible, technically viable and economical to author. The story loop is authored as data over a renderer-free simulation, which is what let the scenario tests above run without a browser. That is a structural result, not a measured authoring cost: no authoring time was recorded. The build gives no evidence on frame time, packaged desktop behaviour, or how a new player fares. Those need a dated measurement and a playtest.
