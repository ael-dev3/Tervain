# Technical architecture and engine decision

Status: **proposed architecture, with a first browser prototype that follows its module boundaries** (see [prototype notes](prototype.md)). The selected language, renderer, desktop shell, physics library, and platform set remain decisions to validate. See [P01–P04 and O04–O06](../decisions.md). Nothing here has been measured on a reference device.

The owner's latest platform direction is **PC only** ([A34](../decisions.md)); mobile/touch work is not a requirement. The current `0.0.9` release source integrates the approved imported hero and pine with larger coherent woodland stands; combined checks and live publication acceptance are recorded in its [release record](../production/releases/0.0.9.md). It retains `0.0.8` player/world collision, finite camera obstruction, supported-height persistence, desktop interface, and connected construction, plus A35's command-owned equipment/consumption and quick-slot bindings, one-time world pickups, and map interaction/pin state. Saves carry binding/equipment/marker/taken-item data; map pan/zoom are presentation state retained across panel reopen, not currently serialized across page reload. Earlier component checks remain in the [0.0.8 handoff](../production/releases/0.0.8-world-polish.md). This work does not decide the desktop shell, final OS support list, or minimum hardware.

## Objective

Support a responsive third-person character, a convincing outdoor scene, a handful of active NPCs, authored encounters, branching local quests, and reliable persistent state in a packaged single-player application. Keep the cost of creating the next good location manageable.

The first technical question is whether our existing TypeScript knowledge and Warpkeep renderer work can deliver that experience economically. It is not whether a browser can display an attractive tree. Movement, animation, combat, content authoring, saving, desktop behavior, and debugging all count.

## Verified starting point

The inspected Warpkeep main revision `786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32` declares TypeScript, Three.js, React, Vite, and Vitest dependencies. It also contains online identity and SpacetimeDB integrations specific to that product. The package still reports version `0.3.43`; this is source metadata, not a statement about the current live patch or completion of 0.4.

Tervain can evaluate the renderer and asset pipeline without inheriting Warpkeep's application or backend. Sources and exact inspection scope are listed in the [reference ledger](../references.md). No library version is selected for Tervain by that observation.

## Candidate to evaluate first

| Area | Proposed initial candidate | What must be proved |
| --- | --- | --- |
| Gameplay/content | TypeScript with strict type checking. | Explicit persistent state, tractable iteration, useful profiling, authored content validation. |
| Rendering | Three.js, with a broadly compatible rendering path first. | Terrain/foliage, skinned animation, shadows, transparency, camera collision, device limits. |
| UI | A small UI layer; React only where it helps menus/dialogue. | No per-frame world simulation through component state; full controller focus and readable text. |
| Development | Vite or similarly small local development setup. | Reproducible packaged assets, correct paths, stable local preview and diagnostics. |
| Desktop shell | Evaluate Electron early. | Memory footprint, native save access, focus/resume, fullscreen, input, packaging and Steam integration feasibility. |
| Physics/navigation | Narrow collision and navigation solution chosen by a spike. | Slopes/steps, grounding, actor separation, nav changes after quest events, no persistent stuck actors. |
| Assets | glTF/GLB runtime models, editable source retained separately. | Stable import, scale/orientation, animation naming, validated collision proxies, repeatable build transforms. |

This is a candidate stack, not a commitment to implement an entire engine. A general-purpose engine such as Godot or Unity remains an alternative if it meaningfully reduces editor, animation, navigation, or platform work. Compare those alternatives with the same slice tasks rather than abstract feature lists.

The engine decision record should include a packaged capture, source revision, machine specifications, settings, frame-time/memory logs, authoring time, missing tooling, and the cost of resolving the gaps. A renderer with excellent screenshots but slow quest/location authoring can still be the wrong choice.

## Proposed module boundaries

```text
Authored content: locations / NPCs / dialogue / quests / items / encounters
                         |
                 validated definitions
                         |
Input actions -> simulation -> persistent world state -> save adapter
                         |
                 presentation events
                         |
          renderer / animation / audio / interface

Platform adapter: local files / window lifecycle / optional Steam services
Asset catalog: exact revisions / hashes / transforms / runtime variants
```

The renderer displays state. A UI click, animation callback, or loading event should not independently grant an item or resolve a quest. Simulation commands own meaningful effects and create presentation events. This makes saving and automated scenario checks possible without a renderer.

The prototype uses part of this layout: `src/game` and `src/content` (free of renderer code, so scenarios run in Node), `src/world`, `src/presentation`, `src/platform` and `tests/scenarios`. `src/game` is the simulation and `src/content` the authored data; the `tools/assets`, streaming and desktop-adapter entries below are still proposals, and the layout is otherwise a loose fit:

```text
src/game/          world state, commands, progression, quests
src/content/       versioned definitions and validation
src/world/         location assembly, collision, navigation, streaming
src/presentation/  scene, character animation, audio, UI, camera
src/platform/      desktop/browser adapters and local saves
tools/assets/      reproducible conversion and inventory tools
tests/scenarios/   meaningful gameplay/persistence scenarios
```

Do not create placeholder packages for all possible systems. Start with the few modules the prototype actually uses; extract common code only after the boundary is understood.

### Presentation modules in 0.0.5

`src/world` is renderer-free and owns the geography: `layout.ts` (data), `coast.ts` (shoreline, beach, cliffs), `forest.ts` (shared habitat mask), `terrain.ts` (height field, walkability, sea depth), `colliders.ts`, `nav.ts`. `src/presentation` reads it and never writes back:

| Module | Responsibility |
| --- | --- |
| `terrainTextures.ts`, `terrainMaterial.ts`, `groundSplat.ts`, `terrainMesh.ts` | Eight generated ground layers, a height-blended PBR shader, and the per-vertex layer weights derived from height, slope, water, shore and roads. |
| `sea.ts`, `waterMesh.ts` | The sea (depth from the terrain, foam, sky reflection) and the stream ribbons. |
| `sky.ts`, `skyState.ts`, `environment.ts`, `grade.ts` | Day/night keyframes, exponential fog, image-based light generated from the sky, and the final grade pass. |
| `floraPopulation.ts`, `flora.ts`, `solitaryPine.ts`, `world/forest.ts`, `world/forestStands.ts`, `treeGen.ts`, `treeTextures.ts`, `treeMaterials.ts`, `ground/` | Stable keyed canonical tree placement and coherent family fields with broad natural clearings. Imported pine wood radii govern acceptance and collision; conservative canopy envelopes keep cores open, independently verified against actual near/middle/far GLB vertices. Every preset retains canonical blockers. Three render LODs use hand culling, cards, bark and streamed grass; each world owns its imported resources. Static views skip unchanged flora/floor instance uploads; turns, height and projection changes refresh immediately. Tree sway remains paused. |
| `forestFloor.ts`, `forestLandmarks.ts`, `woodlandAir.ts` | Original grounded woodland detail, carved waymarkers and roofless remains, and local cool depth haze/motes within the shared Deepwood footprint. No imported reference asset or WebGPU renderer. |
| `scatterPopulation.ts`, `scatter.ts` | Canonical blocking rocks with preset-dependent decorative thinning; pebbles, driftwood, wrack and reeds in 96 m merged chunks. |
| `settlement.ts`, `buildings.ts`, `structures.ts`, `props.ts`, `roofs.ts`, `buildKit.ts`, `regions.ts`, `buildingTextures.ts` | Buildings and props authored as merged, textured geometry per region; the handles the world animates (doors, wheel, bell, gate, lighthouse beam). |
| `characters.ts`, `human/`, `npcStyle.ts`, `humanGeo.ts` | People and creatures. Since `0.0.8` (A36) a person is one skeleton and **one skinned mesh with one texture**, a model sheet of the person, built by `human/`. Geometry: `frame.ts` (bind skeleton, body surface, skin weights), `dress.ts` and `outfits.ts` (layered clothes, costumes), `headShape.ts` and `head.ts` (sculpted head, eyes, hair and beards), and `person.ts`, which merges them with paint attributes from `skin.ts`. The sheet: `sheet.ts` and `raster.ts` (layout, unwrap pose, projection and view weights), `paint.ts` and `facePaint.ts` (painters by surface, the face), and `sheetMaterial.ts` (sheet blend, detail layer, roughness and metalness by surface). Painting off the main thread: `sheetJob.ts`, `sheetWorker.ts` and `sheetPool.ts`. Repainting: `overrides.ts` (replacement sheets in `src/assets/people/`) and `template.ts` (the export's templates and masks). `characters.ts` assembles rigs, weapons, code-driven poses and residents' idle routine; `npcStyle.ts` holds each resident's stable identity; the Thornback is a rigid rig from `humanGeo.ts`. |
| `riteResponse.ts`, `disposeScene.ts`, `platform/frameTiming.ts` | Grounded rite presentation, scene resource ownership, and visible-frame timing with a fresh baseline after backgrounding. |
| `menuScene.ts`, `menu/`, `ui/menuArtwork.ts`, `ui/menuMaterials.ts` | Separate native 3D Templar vigil, original cast wordmark and material forms, one approved Hegemony standard, still menu camera, and a cosmetic clock that freezes in Reduced Motion. No gameplay-state ownership. |
| `menu/menuGrove.ts`, `menu/menuWisps.ts`, `menu/menuWispLight.ts`, `menu/menuHollow.ts`, `menu/menuScoreRhythm.ts` | The hermitage awakening (0.0.7, A32): a deterministic fixed-step simulation of the door hinge and the spirits on the score's own clock (spring motion, collisions against the tree's measured shape), its additive rendering and light on the wood, the carved hollow, and the measured beat grid, accents and spectrum it dances to. Pure data apart from rendering; a graphics rebuild hands the simulation over. |

`WorldScene.create` is asynchronous only so the ground textures can be generated in slices while the loading text repaints; everything else is built synchronously in the constructor. People's sheets are painted on worker threads, started before the world build so the two overlap; the app waits for every sheet (`sheetsSettled`) before showing the world, and a person stays hidden until their sheet arrives. The scene modules share one contract (`context.ts`): they build from a `BuildContext` and update from a `FrameContext`, and never touch game state.

## Simulation and animation

Proposed default: fixed-step gameplay with interpolated visual transforms. Tune the step rate in the movement prototype. Avoid allocating transient objects in heavily repeated update paths; measure before complicated optimization. Clamp recovery from stalls and handle pause explicitly so backgrounding cannot advance a combat encounter unexpectedly.

Character root motion versus code-driven movement is an open spike. Whichever is chosen, velocity, facing, foot contact, collision, and attack timing must agree. Store gameplay attack windows in authored definitions and reconcile them with animation events; a missed animation event must not leave a character invulnerable forever.

The first character controller needs reliable walking, running, grounded steps, slope handling, attack, defense, hit response, interaction, and recoverable falls. A cinematic traversal system is not required. Camera obstruction should preserve the player's view without clipping through walls or fighting the input.

NPC schedules choose goals such as work, rest, shelter, or a specific quest location. Navigation carries them there. Quest changes can replace a goal; offscreen residents need only a bounded schedule/state update. Persistent simulation of every animal or falling leaf is outside the slice.

## Quest and dialogue architecture

The current `0.0.5` presentation exposes NPC observation rather than conversation windows. `App` no longer mounts `DialogueView`; `Game.observeNpc` returns an authored notice without changing meeting/trust state or applying dialogue effects. Environmental inspection and the ledger provide nonblocking text with persistent evidence. The pure dialogue graph and quest commands below are retained for future interface work and tests; their existence is not proof that all conversation-dependent resolutions remain player-accessible. New-game amnesia is a fact, while format-1 legacy saves keep their own progress without receiving that opening fact. See the [prototype scope](prototype.md#forest-arrival-pass-30-september-2026).

Use stable content identifiers with display text separated for localization. Author conditions, effects, and links as validated data where useful; reserve scripts for behavior that genuinely needs them. Definitions should identify who knows a fact, how it was learned, and what local institution can act on it.

Persist facts, one-time rewards, dispositions, and selected outcomes. Re-entering a dialogue node or reloading a scene must not repeat an economic grant. Apply a resolution's persistent changes together or leave it unresolved; presentation can recover from saved state after interruption.

Provide a small debug view to inspect facts and jump to authored test conditions. Keep those helpers out of ordinary player interfaces. See [quests and consequences](../design/quests-and-consequences.md) for the Dry Bell state model and required recovery cases.

## Saves and progression continuity

Local saves are a proposed core feature. Browser storage can support an early harness, but desktop save files should use a narrow platform adapter. Do not bind game state to one UI framework, an active server, or a Steam session.

Suggested save envelope:

| Field | Purpose |
| --- | --- |
| `saveFormatVersion` | Controlled migration path; not the same thing as the game version. |
| `gameBuild` / `contentRevision` | Identify which logic and definitions wrote the save. |
| `slotId` / timestamps / play time | Player-facing slot identity and recovery context. |
| `player` | Transform, inventory, skills, vitals, relevant input-independent state. |
| `worldFacts` / `quests` | Chosen outcomes, observed evidence, actor availability, one-time rewards. |
| `npcStates` / `locationChanges` | Necessary persistent differences from the content baseline. |
| `randomState` where needed | Reproducibility of gameplay systems, not every decorative animation. |

Write to a temporary file, validate it, then replace the selected save while retaining a recoverable previous version. Validate reads, bound sizes, distinguish incompatible/corrupt saves, and give a useful recovery message. Decide safe saving behavior during combat and multi-step quest effects before exposing manual save everywhere.

Test persistence at dialogue transitions, rewards, travel boundaries, actor death/unavailability, resolution, and quit/restart. An autosave icon should correspond to a completed write. Cloud saves are an optional later transport for compatible local saves; define conflict and migration behavior before enabling synchronization. [Steam Cloud documentation](https://partner.steamgames.com/doc/features/cloud).

## Desktop and Steam boundaries

Bundle the local content required by the supported offline experience. A packaged game should not need a developer server, GitHub asset download, social login, wallet, or running Warpkeep backend to enter the valley.

If Electron is selected, expose a narrow typed bridge for saves and platform operations. Keep Node access out of the renderer, enable isolation and sandboxing, restrict navigation, and validate messages to the main process. These are engineering tasks for the prototype, not completed safeguards. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

Represent controls as game actions, with keyboard/mouse and controller bindings. Menus, dialogue, inventory, save selection, and pause all need controller navigation and visible focus. Test hotplugging and switching devices. Steam Input can be evaluated after the game's own action model works. [Steam Input developer guide](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs).

Do not promise Steam Deck verification from a controller demo. Actual device resolution, frame pacing, text, suspend/resume, video playback if any, and startup behavior require their own test record. Windows, Linux, and macOS packages are separate support commitments.

## Terrain and content authoring

Begin with an authored valley. Terrain-generation research can produce a useful starting shape; designer edits establish encounter visibility, safe routes, landmarks, and plausible water levels. Rendering, collision, and navigation should derive from the same approved location source so a pretty riverbank is not an invisible wall.

Use chunks and explicit asset lifetime ownership when the prototype needs them. A full world-streaming service is not a prerequisite for one valley. Loading a new location should release obsolete geometry, materials, textures, audio, and navigation state predictably.

The first authoring workflow must let us move a path, place an NPC, adjust a quest condition, and rebuild the package without editing many unrelated systems. Record the time this takes; tooling debt is a production risk as real as GPU cost.

## Provisional performance experiment

Targets are planning hypotheses, not minimum specifications or measured outcomes. Before benchmarking, record a real development/reference PC and its CPU, GPU, RAM, OS, runtime, and driver. Do not select a marketing minimum spec from these numbers.

- Desktop hypothesis: 1080p at a stable 60 FPS on an agreed mid-range reference machine; approximately 16.7 ms/frame.
- Initial budget exercise: roughly 6 ms main-thread simulation/presentation work and 10 ms GPU work, measured separately because they overlap; do not add the two as a valid frame-time model.
- Report median, 95th/99th percentile frame times, worst transition hitches, process memory, GPU estimates, and a repeatable route through the densest view.
- Instrument draw calls, triangles, materials, texture residency, skinned characters, active navigation, shadow casters, and foliage overdraw. A low triangle count does not establish fast rendering.
- Test the packaged build with twelve named NPCs scheduled, up to six close actors actively updating at full fidelity, and the slice's heaviest foliage/water view. Increase any limit only after measuring it.
- Test a lower quality preset, reduced motion, different camera angles, foreground/background cycles, and repeated save/load/location resets. Check memory returns to a stable range.

If the target is missed, first identify the bottleneck. Adjust vegetation layers, shadow range, alpha coverage, material count, update frequency, or world scope according to evidence. Do not silently replace lush art with empty terrain and call the original target achieved.

## Meaningful verification

Tests should exercise invariants: one-time rewards, valid state transitions, save migration, local reputation propagation, interrupted writes, controller focus, and actor availability recovery. Manual play should cover movement feel, encounter readability, dialogue understanding, and world reactions. Asset checks should verify the exact shipped bytes and their geometry/material/animation properties.

The engine decision is ready when the same small package proves movement, a fight, a conversation, a persistent visible consequence, and an understandable authoring loop. Only then choose production dependencies and expand the [roadmap](../production/roadmap.md).
