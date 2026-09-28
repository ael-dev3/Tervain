# Reference ledger

Foundation date: 29 September 2026. This ledger separates the owner's direction, creative references, and inspected source evidence. References inform original work; they do not become Tervain canon or imported assets.

## Primary project direction

The owner selected **Tervain** and requested a detailed repository seed. The owner described a serious original high-fantasy single-player Steam project with Gothic 3 as its experiential target, Hyperion as a principal narrative-structure inspiration, a Templar-inspired order outside Warpkeep's eventual Hegemony–Core–Ousters main conflict, diverse faction interactions, no initial keep-management focus, little warping, and shared suitable assets/technology.

The [decision register](decisions.md) is the concise record. The detailed original lore in this seed was proposed during preparation and has not been separately adopted as final canon.

## Creative reference roles

| Reference | Study for | Create independently |
| --- | --- | --- |
| Dan Simmons, Hyperion Cantos | Conflicting viewpoints, institutions with mixed motives, ecology and religion, local lives amid distant powers. | Names/identities, histories, sacred teachings, plot, dialogue, characters and imagery. |
| Gothic 3 | Regional freedom, inhabited landscapes, local reputation, dangerous travel, trainers, faction encounters, everyday work. | Geography, quests, named groups, characters, assets, music and combat implementation. |
| WoW tree studies from the prior asset work | Canopy mass, silhouette hierarchy, connected geometry, efficient foliage presentation. | Runtime meshes, textures, animation and setting-specific designs. |
| Owner's Warpkeep 0.4 art discussions | Calm native 3D menu, lush environment, readable light, coherent materials and purposeful ambient animation. | Tervain's final crest, UI hierarchy, score, resident identity, and close-view composition. |

[Gothic 3 official manual](https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/39500/manuals/G3_Manual_UK.pdf) provides a primary reference for its regional/faction presentation. [Dan Simmons' interview](https://www.writerswrite.com/journal/dan-simmons-9012) discusses his fictional religions. These are creative context, not technical requirements or a license to adapt the works.

## Inspected repository evidence

- [Warpkeep main at 786c0b2](https://github.com/ael-dev3/Warpkeep/tree/786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32): repository metadata, package dependencies, and rendering/terrain/water paths checked through GitHub. This was not a new full gameplay audit or a live deployment check.
- [Warpkeep package](https://github.com/ael-dev3/Warpkeep/blob/786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32/package.json): TypeScript/Three.js/React/Vite stack and online integrations observed; package version was 0.3.43.
- [Warpkeep-Assets main at 1e5c49e](https://github.com/ael-dev3/Warpkeep-Assets/tree/1e5c49e9819ea50cf4e03675bb05868f90f06fdc): archive tree, license ledger, release metadata inspected.
- [Per-set asset terms](https://github.com/ael-dev3/Warpkeep-Assets/blob/1e5c49e9819ea50cf4e03675bb05868f90f06fdc/ASSET-LICENSES.md): grants vary by set; repository-wide software terms are not blanket asset terms.
- [Lush trees v3 PR #41](https://github.com/ael-dev3/Warpkeep-Assets/pull/41): open at inspection; head `bc3d7ace4058ea840d886bf16bbcd5b1a67b2ac9`; prepared v3 attachment explicitly unpublished. Validation counts in this seed are attributed upstream, not rerun here.
- [Procedural Tree reference PR #40](https://github.com/ael-dev3/Warpkeep-Assets/pull/40): reference archive work, distinct from original runtime tree designs.
- [Emblem/castle/music PR #37](https://github.com/ael-dev3/Warpkeep-Assets/pull/37): candidate art/audio archive context, not automatic Tervain selection.

An older local Warpkeep checkout was also consulted for product direction and candidate geography. Its proposed Greater Realm atlas is not treated as Tervain's map or as current shipped geography. The game's proposed Alder Basin / Rimeward / Saltward layout is original working design in this repository.

## Technical sources

- [Three.js documentation](https://threejs.org/docs/): renderer/import API reference to consult at implementation time.
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security): candidate shell boundaries; Electron is not yet selected.
- [Steam Input](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs): optional platform input integration reference.
- [Steam Cloud](https://partner.steamgames.com/doc/features/cloud): optional save synchronization reference.

These sources were checked during outline preparation. Pin implementation dependencies and recheck platform requirements when development begins. No runtime, desktop package, Steam integration, or hardware benchmark was executed as part of the documentation seed.
