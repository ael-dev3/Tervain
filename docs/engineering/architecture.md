# Technical architecture and engine decision

Status: **proposed architecture, with a first browser prototype that follows its module boundaries** (see [prototype notes](prototype.md)). The selected language, renderer, desktop shell, physics library, and platform set remain decisions to validate. See [P01–P04 and O04–O06](../decisions.md). Nothing here has been measured on a reference device.

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

### Presentation modules in 0.0.4

`src/world` is renderer-free and owns the geography: `layout.ts` (data), `coast.ts` (shoreline, beach, cliffs; a pure function of position), `terrain.ts` (height field, walkability, sea depth), `colliders.ts`, `nav.ts`. `src/presentation` reads it and never writes back:

| Module | Responsibility |
| --- | --- |
| `terrainTextures.ts`, `terrainMaterial.ts`, `groundSplat.ts`, `terrainMesh.ts` | Eight generated ground layers, a height-blended PBR shader, and the per-vertex layer weights derived from height, slope, water, shore and roads. |
| `sea.ts`, `waterMesh.ts` | The sea (depth from the terrain, foam, sky reflection) and the stream ribbons. |
| `sky.ts`, `skyState.ts`, `environment.ts`, `grade.ts` | Day/night keyframes, exponential fog, image-based light generated from the sky, and the final grade pass. |
| `floraPopulation.ts`, `flora.ts`, `treeGen.ts`, `treeTextures.ts`, `treeMaterials.ts`, `ground/` | Canonical blocking trees across presets; three rendering levels of detail with hand culling, leaf and needle cards, bark, streamed grass. Tree sway remains paused. |
| `scatterPopulation.ts`, `scatter.ts` | Canonical blocking rocks with preset-dependent decorative thinning; pebbles, driftwood, wrack and reeds in 96 m merged chunks. |
| `settlement.ts`, `buildings.ts`, `structures.ts`, `props.ts`, `roofs.ts`, `buildKit.ts`, `regions.ts`, `buildingTextures.ts` | Buildings and props authored as merged, textured geometry per region; the handles the world animates (doors, wheel, bell, gate, lighthouse beam). |
| `characters.ts`, `human/`, `npcStyle.ts`, `humanGeo.ts` | People and creatures. A person is one skeleton with skinned meshes per material (body, clothes, face, eyes, hair) built by `human/`: `frame.ts` (bind skeleton, body surface, skin weights), `dress.ts` and `outfits.ts` (layered clothes, costumes), `headShape.ts`, `head.ts` and `humanTex.ts` (sculpted head, eyes, hair and beards, painted face). `characters.ts` assembles rigs, weapons and code-driven poses; `npcStyle.ts` holds each resident's stable identity; the Thornback is a rigid rig from `humanGeo.ts`. |
| `riteResponse.ts`, `disposeScene.ts`, `platform/frameTiming.ts` | Grounded rite presentation, scene resource ownership, and visible-frame timing with a fresh baseline after backgrounding. |

`WorldScene.create` is asynchronous only so the ground textures can be generated in slices while the loading text repaints; everything else is built synchronously in the constructor. The scene modules share one contract (`context.ts`): they build from a `BuildContext` and update from a `FrameContext`, and never touch game state.

## Simulation and animation

Proposed default: fixed-step gameplay with interpolated visual transforms. Tune the step rate in the movement prototype. Avoid allocating transient objects in heavily repeated update paths; measure before complicated optimization. Clamp recovery from stalls and handle pause explicitly so backgrounding cannot advance a combat encounter unexpectedly.

Character root motion versus code-driven movement is an open spike. Whichever is chosen, velocity, facing, foot contact, collision, and attack timing must agree. Store gameplay attack windows in authored definitions and reconcile them with animation events; a missed animation event must not leave a character invulnerable forever.

The first character controller needs reliable walking, running, grounded steps, slope handling, attack, defense, hit response, interaction, and recoverable falls. A cinematic traversal system is not required. Camera obstruction should preserve the player's view without clipping through walls or fighting the input.

NPC schedules choose goals such as work, rest, shelter, or a specific quest location. Navigation carries them there. Quest changes can replace a goal; offscreen residents need only a bounded schedule/state update. Persistent simulation of every animal or falling leaf is outside the slice.

## Quest and dialogue architecture

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
