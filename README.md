# Tervain

**A serious single-player high-fantasy RPG about finding your place among old orders, independent peoples, and a land with obligations older than its rulers.**

Tervain is being developed for PC toward a Steam release. Its creative starting point is the freedom, regional character, dangerous travel, and faction encounters of *Gothic 3*, together with the layered perspectives, religious tensions, and complicated loyalties of *Hyperion*. The world, characters, faiths, visual identity, and stories will be original.

An original order currently called the **Templars** anchors the setting. **The Templars are part of the Hegemony**, as clarified by the owner on 30 September. Their local story sits away from the future Hegemony–Core–Ousters conflict envisioned for Warpkeep. Local people still have their own arguments about land, water, work, authority, belief, and survival. Their lives provide the substance of this game.

## Play in your browser

**[Launch Tervain](https://ael-dev3.github.io/Tervain/)**

The hosted browser prototype is published from `main` through GitHub Pages; the title screen shows its version. Use a desktop WebGL browser with keyboard/mouse or a controller. Progress is saved in your browser.

## Repository status

**Foundation / pre-production — seeded 29 September 2026; first playable prototype added the same day.**

This repository contains a design and production outline and a browser-playable exploration prototype. It does not contain a desktop package, a shipped asset pack, or Steam integration. The current release is **0.0.8**, combining desktop world systems with the people rework through [PR #10](https://github.com/ael-dev3/Tervain/pull/10); its exploration content builds on **0.0.5**, with a sparse amnesiac landing, dense woodland, and settlements farther inland. The music-reactive hermitage, menu score, procedural ships, and Claude's Templar vigil are integrated. Conversation windows remain removed; retained Dry Bell simulation and dialogue data do not establish a complete current negotiation UI. The former Pages outage is historical. The build guard enforces the **0.0.x** line until the quality gate is met and the owner approves 0.1. See the [versioning policy](docs/production/versioning.md) and [prototype boundaries](docs/engineering/prototype.md).

The owner-authorized **0.0.8** release combines both development branches. It adds desktop interface and camera polish, swept movement, finite camera obstruction, height-aware save restoration on the lighthouse stairs/gallery, connected and grounded lighthouse/wagon geometry, and bronze/parchment records. A fresh game has ten empty `1–0` item slots; inventory supports real drag/drop and keyboard binding, equip/unequip, and food/remedy consumption. The map supports zoom, pan, and a saved personal pin; 32 original one-time provisions/plants/salvage pickups join four existing pickups. Claude's [PR #10](https://github.com/ael-dev3/Tervain/pull/10) supplies the people rework described below. Tervain's PC direction requires no mobile layout or touch-support work.

The [world-polish handoff](docs/production/releases/0.0.8-world-polish.md) preserves the earlier standalone checkpoint `00aa07f`: typecheck, **632 tests**, build, native desktop interaction review, and a recorded Apple M5 / Chromium route benchmark (16.70 ms median and 17.30 ms p95 frame intervals). The [people notes](docs/production/releases/0.0.8.md) separately preserve PR #10's source and checks. Those component results do not validate the merged source. Combined typecheck, **652 tests in 60 files**, and the production build pass. The merged code checkpoint is `36b88da`; its native review covers loading, carried items, equipment, saved map pins, and quality rebuilds. The [combined release record](docs/production/releases/0.0.8-integration.md) separates this evidence from earlier component measurements and links the publication workflow. Confirm the served version on the title screen.

**Menu, 0.0.5 (A26):** a Templar warden keeps a dusk vigil on a headland above the sea: an ancient tree with a hermit’s door in its roots and pilgrims’ rags on its boughs, a campfire, standing stones, one weathered Hegemony standard, and Lantern Point’s lighthouse against the sunset. The name is cast in pitted bronze with a sword for the I; choices use dark leather inside a notched bronze panel, forms use torn parchment, and dust and scratches weather the picture. This replaces the desert market and its title treatment while retaining the name Tervain, original lettering, and the single approved emblem. The [menu vigil notes](docs/production/releases/0.0.5-menu-vigil.md) preserve PR #3’s separate implementation and headless review; they do not validate the combined forest, terrain, or audio revision.

Layered coastal waves, depth-based transmission, world reflections, and the Low/Reduced Effects fallback remain from `0.0.4`. Gameplay tree and leaf sway stays paused. The [0.0.4 notes](docs/production/releases/0.0.4.md) preserve earlier menu, water, and construction checks as historical evidence.

**Menu music (A28):** the owner-supplied **The Sovereign's Oath** accompanies the title and pause menus under the existing Master and Music controls. Its 3:34.2 source, audio-only browser derivatives, specific project-use authority, and creation disclosure are recorded in the [menu score inventory](docs/engineering/menu-score.md). Gameplay ambience remains procedural; this adds no in-world score, dialogue recordings, or contact effects. The full-song `0.0.7` menu video is completed. The owner cancelled further video work and returned to `0.0.8`; see the [video follow-up](docs/production/releases/0.0.7.md#full-song-video-follow-up).

**Living menu (A29–A30, reworked for 0.0.7 under A32):** distant sailing ships receive fresh modest voyages on each title/pause visit. At 0:30 of the actual score, the heavy tree door swings open on its hinge onto a hollow carved into the heartwood. Its heart beats with the low notes. Spirits like small flames come out one by one on the beat and dance round the tree to the music: a climbing helix, tiered rings, a maypole weave and fireflies, a new figure each phrase, on a beat grid measured from the recording. They bounce on the beat, scatter on the accents and colour the tree from root to crown by the band each one hears. They fly round the bark and boughs rather than through them, light the wood as they pass, and come home before the song loops. Both effects freeze under Reduced Motion and retain their pose through nested forms and quality changes. The [grove record](docs/engineering/menu-grove-score.md) documents the original geometry, the measurements and the credited Ael / Lyrics workflow; the [0.0.7 notes](docs/production/releases/0.0.7.md) record the checks.

**People, 0.0.5 (A31):** the player and every resident are rebuilt the way Gothic 3 builds its people, after a study of its local actor files: a skeleton each with skinned bodies and layered clothes, sculpted and painted faces, eyes behind heavy lids, hair and beards, big working hands, and a costume for every resident. The wanderer now arrives with no weapon and no shield and finds a rusted sword in the storm-wreck on the arrival strand. The owner approved integration through [PR #7](https://github.com/ael-dev3/Tervain/pull/7), with the living menu preserved and 366 local tests passing. See the [people notes](docs/production/releases/0.0.5-people.md) for the updated build and validation.

**People, 0.0.8 (A36):** a massive rework for repainting, after a read-only study of the local Gothic 1 Remake files and the owner's notes. Each person is now one skinned mesh wearing one painted texture laid out as a character model sheet: the whole figure from the front, the sides and the back, and the face and head large. `npm run people:sheets` exports every sheet with a template, parts map, masks and a prompt for Codex or an image model, `npm run people:check` tests a repainted sheet against the person's shape, and a repainted image in `src/assets/people/` replaces the paint. Eyes and faces are reworked, new costume pieces (fur collars, neck and face cloths, a shoulder guard, a headband, a tabard, gloves) mark roles, and residents standing idle fold their arms, look about or scratch their heads. See the [retexture guide](docs/art/people-retexture.md) and the [0.0.8 notes](docs/production/releases/0.0.8.md).

## Run the prototype locally

Use the local commands below for development. To play without installing anything, open the [hosted preview](https://ael-dev3.github.io/Tervain/). The earlier hosting outage is preserved in the dated [0.0.5 publication record](docs/production/releases/0.0.5.md#publication).

The `0.0.5` opening leaves you on the grey strand with no remembered name. Follow an old trail under overlapping crowns, past moss, ferns, carved waystones, and roofless roadside remains, before reaching an inland waystation and Rillford. Inspect environmental clues, observe people without opening conversations, and read your journal. The forest takes strong visual inspiration from [Boring Forest](https://boring-forest.vercel.app/), with original code-authored geometry and materials. Saves stay in your browser; format-1 `0.0.4` saves remain compatible. The source is published in the repository, and the browser build is served at the hosted link above. The [prototype notes](docs/engineering/prototype.md) distinguish current controls from retained simulation systems and record the remaining checks. The [combined handoff](docs/production/releases/0.0.5.md) records local browser validation and its dated benchmark; reference-device acceptance remains unverified.

```bash
npm install
npm run dev        # local server
npm run typecheck  # TypeScript 7, strict
npm test           # quest, persistence and world scenario tests
npm run build      # static build in dist/
```

### Direction established by the owner

- Name: **Tervain**.
- Serious, polished, single-player high fantasy aimed at Steam.
- PC only; desktop framing and keyboard/mouse/controller interaction take priority. No mobile support work is required.
- A Templar-inspired original order within the Hegemony and diverse regional faction interactions.
- Narrative inspiration from *Hyperion* and experiential inspiration from *Gothic 3*.
- Distance from Warpkeep's eventual main faction war; minimal science-fiction presentation.
- No keep-management focus and little warping in the initial game.
- Share suitable technology and assets with Warpkeep while giving Tervain its own identity.
- A sparse amnesiac beach arrival, dense Templar-associated woodland, inland settlements, and no dialogue windows for `0.0.5`.
- A native 3D Templar dusk-vigil menu with one approved Hegemony standard, hilly inland terrain, clear first-town road/sign guidance, and audio work to reduce clipping and scheduling load.

### Proposed foundation to test

- Third-person exploration and action combat, with consequential dialogue and practical progression.
- Offline local play, keyboard/mouse and controller, Windows as the first packaging target.
- A locally significant outsider protagonist with freedom to earn several factions' trust.
- A central struggle over emergency rule and town freedoms, with divided Templars and independent northern and desert powers.
- A compact authored region before committing to a large continent.
- TypeScript and Three.js as the first technical candidate. A browser prototype now exists; validation in a packaged desktop prototype is still needed before an engine decision.
- **Bellwether Vale / “The Dry Bell”** as a 30–45 minute vertical slice about a damaged waterway and three competing needs.

The [decision register](docs/decisions.md) distinguishes these categories and records unresolved choices.

## Read the foundation

| Document | Purpose |
| --- | --- |
| [Vision and product boundaries](docs/vision.md) | Player promise, pillars, tone, relationship to Warpkeep, and what makes the game worth making. |
| [Setting](docs/world/setting.md) | Proposed geography, ordinary life, history, ecology, and the limits of the local story. |
| [Factions](docs/world/factions.md) | Original Templars, other regional powers, relationships, internal disagreements, and player opportunities. |
| [Narrative](docs/world/narrative.md) | Proposed campaign structure, viewpoints, mysteries, and endings. |
| [Gameplay](docs/design/gameplay.md) | Exploration, combat, progression, NPCs, economy, navigation, and accessibility. |
| [Quests and consequences](docs/design/quests-and-consequences.md) | Concrete first quest, evidence, decisions, persistent consequences, and authoring rules. |
| [Art, audio, and interface](docs/art/art-audio-ui.md) | Gothic 3-style rugged 3D world, material and silhouette language, motion, sound, and readable presentation. |
| [Gothic 3 look reference](docs/art/gothic3-reference.md) | Measurements and design rules from the owner's local Gothic 3 install, and the Gothic 1 Remake people study (inspiration only). |
| [Retexturing people](docs/art/people-retexture.md) | Each person's model-sheet texture, its export and templates, and how to repaint and install it with Codex, an image model or by hand. |
| [Architecture](docs/engineering/architecture.md) | Candidate stack, simulation boundaries, saves, desktop packaging, performance, and engine evaluation. |
| [Prototype](docs/engineering/prototype.md) | The playable build: controls, options, what is real versus placeholder, testing, save recovery, and known limitations. |
| [0.0.8 world-polish handoff](docs/production/releases/0.0.8-world-polish.md) | Desktop movement, collision, construction, item controls and map; standalone evidence and combined verification/publication status. |
| [0.0.8 people rework](docs/production/releases/0.0.8.md) | Claude PR #10's repaintable skinned people, costume shapes, idle routine, component evidence, and remaining limits. |
| [Versioning and quality gate](docs/production/versioning.md) | The enforced 0.0.x hold and proposed evidence required before 0.1.0. |
| [Shared technology and assets](docs/engineering/shared-assets.md) | Verified upstream references, reuse candidates, adaptation work, and source records. |
| [Vertical slice](docs/production/vertical-slice.md) | A bounded first playable with dependencies and observable acceptance criteria. |
| [Roadmap and risks](docs/production/roadmap.md) | Milestones, stop/continue criteria, delivery risks, and expansion decisions. |
| [Decisions and open questions](docs/decisions.md) | What is agreed, proposed, deferred, or still unknown. |
| [Reference ledger](docs/references.md) | Source snapshots, inspiration boundaries, and technical documentation. |

For navigation by role, see the [documentation index](docs/README.md).

## First development objective

Build a small, packaged scene in which one character can walk through a convincing landscape, fight a readable encounter, talk to a resident, change a local condition, save, close the game, and return to the changed world. Measure this before building more regions. The earlier browser prototype exercised the simulation loop. The current `0.0.5` pass focuses on exploration and omits conversation windows, so the full negotiation loop needs a future player interface. It has not been packaged or measured on a reference device.

The first complete slice should make a player care about Rillford's water dispute and understand the cost of their chosen resolution. Forest beauty, combat feel, and narrative consequence must work together in the same build.

## Relationship to Warpkeep

[Warpkeep](https://github.com/ael-dev3/Warpkeep) remains the online, social, mobile-friendly persistent strategy project. [Warpkeep-Assets](https://github.com/ael-dev3/Warpkeep-Assets) is a source library and archive from which suitable assets can be evaluated.

Tervain can share original vegetation, modular environment art, asset tooling, terrain research, and selected renderer utilities. Accounts, FIDs, live economies, server authority, keep construction timers, and online admission are not required by the proposed single-player runtime. A shared fictional connection does not require shared save data or services.

## Contributing and rights

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md) before extending the foundation. No project-wide open-source or open-content license is selected by this initial seed. Each reused dependency or asset retains its actual terms and attribution; a file's presence in a sibling repository is not a new license grant.
