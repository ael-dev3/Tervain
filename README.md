# Tervain

**A serious single-player high-fantasy RPG about finding your place among old orders, independent peoples, and a land with obligations older than its rulers.**

Tervain is being developed for PC toward a Steam release. Its creative starting point is the freedom, regional character, dangerous travel, and faction encounters of *Gothic 3*, together with the layered perspectives, religious tensions, and complicated loyalties of *Hyperion*. The world, characters, faiths, visual identity, and stories will be original.

An original order currently called the **Templars** anchors the setting. **The Templars are part of the Hegemony**, as clarified by the owner on 30 September. Their local story sits away from the future Hegemony–Core–Ousters conflict envisioned for Warpkeep. Local people still have their own arguments about land, water, work, authority, belief, and survival. Their lives provide the substance of this game.

## Source-code license and material rights

The root [LICENSE](LICENSE) contains the complete, unmodified PolyForm Noncommercial 1.0.0 text. It applies only to independently owned original Tervain software code that the rights holder is authorized to offer; it is not a repository-wide or content license. Read the [full scope and exceptions](LICENSE-SCOPE.md), including the separate Gothic 3 boundaries and existing Apache-2.0, MIT, and GPL-3.0-only terms. A concise [web-readable disclosure page](public/source-license/index.html) and license copy are staged for a future build at `/Tervain/source-license/`; this PR does not publish or deploy the site.

Gothic 3 references, extracted or reconstructed data, and the separate Gothic routes remain intact and outside this license. Assets, original art, music, story, branding, and contributor-owned code remain separately governed. Existing provenance questions for Suno, Meshy, and Mixamo-related material are unchanged. Commercial permission is not granted; a separate permission request may be sent to [ael.dev@proton.me](mailto:ael.dev@proton.me).

## Play in your browser

**[Launch Tervain](https://ael-dev3.github.io/Tervain/)**

The hosted browser prototype is published from `main` through GitHub Pages; the title screen shows its version. Use a desktop WebGL browser with keyboard/mouse or a controller. Progress is saved in your browser.

## Repository status

### Separate Gothic 3 reconstruction

The owner also requested a TypeScript Gothic 3 browser port as a second URL.
[Ardea — first exploration milestone](https://ael-dev3.github.io/Tervain/gothic3/)
has its own entry, assets and saves. It is an incomplete reconstruction using
selected local game data; it does not replace Tervain's original world.
See [current scope, controls and port plan](docs/engineering/gothic3-browser-port.md).
The [rebuilding process](docs/engineering/gothic3-rebuilding-process.md) explains
the native study, asset conversion, TypeScript runtime and remaining gameplay work.

[Gothic 3 from your own install](https://ael-dev3.github.io/Tervain/gothic3-local/)
is a separate study viewer: point it at your installed copy of Gothic 3 and it
draws Ardea in the browser with its own renderer, reading the game files in
your tab. No game files are hosted for it. See its
[record, controls and limits](docs/engineering/gothic3-local.md).

**Foundation / pre-production — seeded 29 September 2026; first playable prototype added the same day.**

This repository contains a design and production outline and a browser-playable exploration prototype. The owner-authorized **0.0.10** source builds on published **0.0.9** with complete source trees on High, detailed bark/terrain/grass, nine movable supplies, more physical steep-ground movement, the supplied Wanderer walk/run rig, and [deeper coastal water with natural grounded rocks and finite rock contacts](docs/engineering/coastal-water-rocks-0.0.10.md). The [0.0.10 release record](docs/production/releases/0.0.10.md) records passing baseline checks and native review; that baseline was published through PR #18. Follow-up acceptance requires checking the deployed source revision and its assets, as well as the version. The [0.0.9 record](docs/production/releases/0.0.9.md) preserves the prior approved hero/pine/woodland integration. Its exploration content builds on **0.0.5**, with a sparse amnesiac landing, dense woodland, and settlements farther inland. The music-reactive hermitage, menu score, procedural ships, and Claude's Templar vigil remain integrated. Conversation windows remain removed; retained Dry Bell simulation and dialogue data do not establish a complete current negotiation UI. This is a browser prototype without a desktop package or Steam integration. The build guard enforces the **0.0.x** line until the quality gate is met and the owner approves 0.1. See the [versioning policy](docs/production/versioning.md) and [prototype boundaries](docs/engineering/prototype.md).

The published **0.0.8** release combined the desktop and people development branches. It adds desktop interface and camera polish, swept movement, finite camera obstruction, height-aware save restoration on the lighthouse stairs/gallery, connected and grounded lighthouse/wagon geometry, and bronze/parchment records. A fresh game has ten empty `1–0` item slots; inventory supports real drag/drop and keyboard binding, equip/unequip, and food/remedy consumption. The map supports zoom, pan, and a saved personal pin; 32 original one-time provisions/plants/salvage pickups join four existing pickups. Claude's [PR #10](https://github.com/ael-dev3/Tervain/pull/10) supplies the people rework described below. Tervain's PC direction requires no mobile layout or touch-support work.

The [0.0.8 world-polish handoff](docs/production/releases/0.0.8-world-polish.md), [people notes](docs/production/releases/0.0.8.md), and [combined release record](docs/production/releases/0.0.8-integration.md) preserve that release's source, local checks, native review and deployment. The hero, pine and woodland PR records likewise retain their original source and measurements. Those component results and the dated [0.0.9 release](docs/production/releases/0.0.9.md) do not validate the final `0.0.10` source; its combined evidence belongs to the [current release record](docs/production/releases/0.0.10.md).

**Menu, 0.0.5 (A26):** a Templar warden keeps a dusk vigil on a headland above the sea: an ancient tree with a hermit’s door in its roots and pilgrims’ rags on its boughs, a campfire, standing stones, one weathered Hegemony standard, and Lantern Point’s lighthouse against the sunset. The name is cast in pitted bronze with a sword for the I; choices use dark leather inside a notched bronze panel, forms use torn parchment, and dust and scratches weather the picture. This replaces the desert market and its title treatment while retaining the name Tervain, original lettering, and the single approved emblem. The [menu vigil notes](docs/production/releases/0.0.5-menu-vigil.md) preserve PR #3’s separate implementation and headless review; they do not validate the combined forest, terrain, or audio revision.

Layered coastal waves, depth-based transmission, world reflections, and the Low/Reduced Effects fallback remain from `0.0.4`. Attached gameplay tree and leaf sway stays paused; separately falling detached leaves remain enabled. The [0.0.4 notes](docs/production/releases/0.0.4.md) preserve earlier menu, water, and construction checks as historical evidence.

**Menu music (A28):** the owner-supplied **The Sovereign's Oath** accompanies the title and pause menus under the existing Master and Music controls. Its 3:34.2 source, audio-only browser derivatives, specific project-use authority, and creation disclosure are recorded in the [menu score inventory](docs/engineering/menu-score.md). Gameplay ambience remains procedural; this adds no in-world score, dialogue recordings, or contact effects. The full-song `0.0.7` menu video is completed. The owner cancelled further video work and returned to `0.0.8`; see the [video follow-up](docs/production/releases/0.0.7.md#full-song-video-follow-up).

**Living menu (A29–A30, reworked for 0.0.7 under A32):** distant sailing ships receive fresh modest voyages on each title/pause visit. At 0:30 of the actual score, the heavy tree door swings open on its hinge onto a hollow carved into the heartwood. Its heart beats with the low notes. Spirits like small flames come out one by one on the beat and dance round the tree to the music: a climbing helix, tiered rings, a maypole weave and fireflies, a new figure each phrase, on a beat grid measured from the recording. They bounce on the beat, scatter on the accents and colour the tree from root to crown by the band each one hears. They fly round the bark and boughs rather than through them, light the wood as they pass, and come home before the song loops. Both effects freeze under Reduced Motion and retain their pose through nested forms and quality changes. The [grove record](docs/engineering/menu-grove-score.md) documents the original geometry, the measurements and the credited Ael / Lyrics workflow; the [0.0.7 notes](docs/production/releases/0.0.7.md) record the checks.

**People, 0.0.5 (A31):** the player and every resident are rebuilt the way Gothic 3 builds its people, after a study of its local actor files: a skeleton each with skinned bodies and layered clothes, sculpted and painted faces, eyes behind heavy lids, hair and beards, big working hands, and a costume for every resident. The wanderer now arrives with no weapon and no shield and finds a rusted sword in the storm-wreck on the arrival strand. The owner approved integration through [PR #7](https://github.com/ael-dev3/Tervain/pull/7), with the living menu preserved and 366 local tests passing. See the [people notes](docs/production/releases/0.0.5-people.md) for the updated build and validation.

**People, 0.0.8 (A36):** a massive rework for repainting, after a read-only study of the local Gothic 1 Remake files and the owner's notes. Each person is now one skinned mesh wearing one painted texture laid out as a character model sheet: the whole figure from the front, the sides and the back, and the face and head large. `npm run people:sheets` exports every sheet with a template, parts map, masks and a prompt for Codex or an image model, `npm run people:check` tests a repainted sheet against the person's shape, and a repainted image in `src/assets/people/` replaces the paint. Eyes and faces are reworked, new costume pieces (fur collars, neck and face cloths, a shoulder guard, a headband, a tabard, gloves) mark roles, and residents standing idle fold their arms, look about or scratch their heads. See the [retexture guide](docs/art/people-retexture.md) and the [0.0.8 notes](docs/production/releases/0.0.8.md).

**Main character (A37/A45):** the Weathered Wanderer now uses the owner's six-clip animation source through an under-100k, 66-joint derivative. Walking/running use authored curves calibrated to **1.65 / 5.85 m/s**, with controller-owned movement, source PBR maps and an unarmed start. NPCs retain their repaintable sheets. This remains **0.0.10**; see [current hero provenance](docs/engineering/main-hero.md) and [animation integration](docs/engineering/main-hero-animations-0.0.10.md).

**Solitary Pine woodland (A38):** the owner’s optimized pine replaces every dark conifer, including the distant treeline. The close tree has **9,706 triangles**, connected textured needle cards and matching lighter distance models. Grounding and uniform scaling preserve source proportions, while trunk collision footprints match the imported wood. Attached gameplay leaf motion stays paused. High now retains the complete near/source tree at every visible distance; Medium/Low keep the lighter models. See the [forest asset record](docs/engineering/solitary-pine.md).

**Larger woodland stands (A39):** [forest PR #12](https://github.com/ael-dev3/Tervain/pull/12) and its stacked [follow-on PR #13](https://github.com/ael-dev3/Tervain/pull/13) supply deterministic tree-family clusters, a regional approximate 75/20/5 stem target, and broad natural clearings. The `0.0.9` integration applies the imported pine's real geometry and collision footprints to this layout. The [stand record](docs/art/forest-stands-2026-10-03.md) and [original Gothic 3 study](docs/art/gothic3-vegetation-study.md) distinguish the component source, measurements and design target from final combined evidence.

The [0.0.9 world-contact follow-up](docs/production/releases/0.0.9-world-contact.md) improves the lighthouse walking approach and entry, whole-root tree grounding, human-scale props and regular third-person camera controls. Its source and runtime acceptance are recorded separately from the original release baseline.

The [0.0.9 visibility follow-up](docs/production/releases/0.0.9-draw-continuity.md) improves tree detail transitions, grass and forest-floor reach, streaming and screen-edge bounds, and removes abrupt lighting/reflection cutoffs while keeping the approved tree shapes.

The [woodland air follow-up](docs/production/releases/0.0.9-falling-leaves.md) rounds the formerly rectangular pollen particles and adds sparse, gently drifting detached leaves beneath real broadleaf crowns. Trunks, branches and attached foliage remain still; Reduced Motion freezes the detached leaves.

**0.0.10 world interaction:** approach a reachable loose barrel or crate, press **F to lift/drop** and **R to throw**. E keeps existing item pickup/inspection and Space jumps. Nine supplies use 60 Hz Rapier contacts, including the source trees' wood; player/navigation static footprints stay canonical. Saves retain object positions/rotations, not velocities or held state. High is the fresh/reset default and deliberately costs more in geometry and texture memory; saved Medium/Low settings remain. See [visual detail and limits](docs/engineering/visual-detail-0.0.10.md) and [physics scope](docs/engineering/physics-0.0.10.md).

## Run the prototype locally

Use the local commands below for development. To play without installing anything, open the [hosted preview](https://ael-dev3.github.io/Tervain/). The earlier hosting outage is preserved in the dated [0.0.5 publication record](docs/production/releases/0.0.5.md#publication).

The `0.0.5` opening leaves you on the grey strand with no remembered name. Follow an old trail under overlapping crowns, past moss, ferns, carved waystones, and roofless roadside remains, before reaching an inland waystation and Rillford. Inspect environmental clues, observe people without opening conversations, and read your journal. The forest takes strong visual inspiration from [Boring Forest](https://boring-forest.vercel.app/), with original code-authored broadleaf/floor geometry and the owner-supplied Solitary Pine conifers. Saves stay in your browser; format-1 `0.0.4` saves remain compatible. The source is published in the repository, and the browser build is served at the hosted link above. The [prototype notes](docs/engineering/prototype.md) distinguish current controls from retained simulation systems and record the remaining checks. The [combined handoff](docs/production/releases/0.0.5.md) records local browser validation and its dated benchmark; reference-device acceptance remains unverified.

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
| [0.0.10 combined release](docs/production/releases/0.0.10.md) | Source-detail woodland, ground and movable supplies; current validation/publication gates. |
| [0.0.10 visual detail](docs/engineering/visual-detail-0.0.10.md) | Source forms, bark, terrain/grass, presets, memory/workload and verification limits. |
| [0.0.10 hero animations](docs/engineering/main-hero-animations-0.0.10.md) | Supplied Mixamo rig, authored walk/run/death and measured stride calibration. |
| [0.0.10 world physics](docs/engineering/physics-0.0.10.md) | F/R supply interactions, contact authority, slopes/jumps, 60 Hz stepping and compatible pose saves. |
| [0.0.9 combined release](docs/production/releases/0.0.9.md) | Approved hero, source-faithful pine, larger woodland stands, combined validation and live publication evidence. |
| [0.0.9 world contact](docs/production/releases/0.0.9-world-contact.md) | Graded lighthouse access and real interiors, whole-root planting, supported props and regular camera controls. |
| [0.0.9 visibility continuity](docs/production/releases/0.0.9-draw-continuity.md) | Gradual tree/detail transitions, wider vegetation reach and continuous streaming, lighting and reflections. |
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

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and [LICENSE-SCOPE.md](LICENSE-SCOPE.md) before extending the foundation. The root license is limited to eligible software code; each reused dependency, Gothic 3 study/reconstruction item, or asset retains its actual terms and provenance. A file's presence in this repository or a sibling repository is not a new license grant.
