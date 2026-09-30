# Tervain

**A serious single-player high-fantasy RPG about finding your place among old orders, independent peoples, and a land with obligations older than its rulers.**

Tervain is being developed toward a Steam release. Its creative starting point is the freedom, regional character, dangerous travel, and faction encounters of *Gothic 3*, together with the layered perspectives, religious tensions, and complicated loyalties of *Hyperion*. The world, characters, faiths, visual identity, and stories will be original.

An original order currently called the **Templars** anchors the setting. **The Templars are part of the Hegemony**, as clarified by the owner on 30 September. Their local story sits away from the future Hegemony–Core–Ousters conflict envisioned for Warpkeep. Local people still have their own arguments about land, water, work, authority, belief, and survival. Their lives provide the substance of this game.

## Repository status

**Foundation / pre-production — seeded 29 September 2026; first playable prototype added the same day.**

This repository contains a design and production outline and a browser-playable exploration prototype. It does not contain a desktop package, a shipped asset pack, or Steam integration. Version **0.0.5** gives the opening a sparse amnesiac landing, a dense woodland journey, and settlements farther inland. Conversation windows are removed for this pass; the earlier Dry Bell simulation and dialogue data remain for future work, rather than a claim of a complete negotiation UI. Claude’s menu PR #3 is integrated into the same revision. The latest terrain, route-sign, and audio follow-ups and their final combined validation are in progress; publication remains pending. See the [0.0.5 handoff](docs/production/releases/0.0.5.md). The build guard enforces the 0.0.x line until the quality gate is met and the owner approves 0.1. See the [versioning policy](docs/production/versioning.md) and [what is real and what is representation](docs/engineering/prototype.md).

**Menu, 0.0.5 (A26):** a Templar warden keeps a dusk vigil on a headland above the sea: an ancient tree with a hermit’s door in its roots and pilgrims’ rags on its boughs, a campfire, standing stones, one weathered Hegemony standard, and Lantern Point’s lighthouse against the sunset. The name is cast in pitted bronze with a sword for the I; choices use dark leather inside a notched bronze panel, forms use torn parchment, and dust and scratches weather the picture. This replaces the desert market and its title treatment while retaining the name Tervain, original lettering, and the single approved emblem. The [menu vigil notes](docs/production/releases/0.0.5-menu-vigil.md) preserve PR #3’s separate implementation and headless review; they do not validate the combined forest, terrain, or audio revision.

Layered coastal waves, depth-based transmission, world reflections, and the Low/Reduced Effects fallback remain from `0.0.4`. Gameplay tree and leaf sway stays paused. The [0.0.4 notes](docs/production/releases/0.0.4.md) preserve earlier menu, water, and construction checks as historical evidence.

## Play the prototype

**[▶ Play — The Grey Strand to Bellwether Vale](https://ael-dev3.github.io/Tervain/)** (a desktop browser with WebGL; keyboard and mouse or a controller)

The `0.0.5` opening leaves you on the grey strand with no remembered name. Follow an old trail under overlapping crowns, past moss, ferns, carved waystones, and roofless roadside remains, before reaching an inland waystation and Rillford. Inspect environmental clues, observe people without opening conversations, and read your journal. The forest takes strong visual inspiration from [Boring Forest](https://boring-forest.vercel.app/), with original code-authored geometry and materials. Saves stay in your browser; format-1 `0.0.4` saves remain compatible. The public link may still serve an earlier revision until the new build is published. The [prototype notes](docs/engineering/prototype.md) distinguish current controls from retained simulation systems and record the remaining checks. No performance result is claimed.

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
- A Templar-inspired original order within the Hegemony and diverse regional faction interactions.
- Narrative inspiration from *Hyperion* and experiential inspiration from *Gothic 3*.
- Distance from Warpkeep's eventual main faction war; minimal science-fiction presentation.
- No keep-management focus and little warping in the initial game.
- Share suitable technology and assets with Warpkeep while giving Tervain its own identity.
- A sparse amnesiac beach arrival, dense Templar-associated woodland, inland settlements, and no dialogue windows for `0.0.5`.
- A native 3D Templar dusk-vigil menu with one approved Hegemony standard; the latest follow-up adds hilly terrain, clear first-town road/sign guidance, and smoother audio without clipping.

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
| [Gothic 3 look reference](docs/art/gothic3-reference.md) | Measurements and design rules from the owner's local Gothic 3 install (inspiration only). |
| [Architecture](docs/engineering/architecture.md) | Candidate stack, simulation boundaries, saves, desktop packaging, performance, and engine evaluation. |
| [Prototype](docs/engineering/prototype.md) | The playable build: controls, options, what is real versus placeholder, testing, save recovery, and known limitations. |
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
