# Reference ledger

Foundation date: 29 September 2026. This ledger separates the owner's direction, creative references, and inspected source evidence. References inform original work; they do not become Tervain canon or imported assets.

## Primary project direction

The owner selected **Tervain** and requested a detailed repository seed. The owner described a serious original high-fantasy single-player Steam project with Gothic 3 as its experiential target, Hyperion as a principal narrative-structure inspiration, a Templar-inspired order away from Warpkeep's eventual Hegemony–Core–Ousters main conflict, diverse faction interactions, no initial keep-management focus, little warping, and shared suitable assets/technology. On 30 September the owner explicitly clarified that **the Templars are part of the Hegemony** (A21), and selected an original native 3D desert-market menu with the approved Hegemony emblem and gentle cloth wind (A22). Distance from the war is not separation from that affiliation. Later that day the owner asked for the menu to be reworked much closer to Gothic 3, rough and human, in the Hyperion-inspired world with heavy Templar influence (A26); the local Gothic 3 menu files were studied for measurement only (see the [look reference](art/gothic3-reference.md#the-title-menu)).

The [decision register](decisions.md) is the concise record. The detailed original lore in this seed was proposed during preparation and has not been separately adopted as final canon.

## Creative reference roles

| Reference | Study for | Create independently |
| --- | --- | --- |
| Dan Simmons, Hyperion Cantos | Conflicting viewpoints, institutions with mixed motives, ecology and religion, local lives amid distant powers. | Names/identities, histories, sacred teachings, plot, dialogue, characters and imagery. |
| Gothic 3 | Regional freedom, inhabited landscapes, local reputation, dangerous travel, trainers, faction encounters, everyday work. | Geography, quests, named groups, characters, assets, music and combat implementation. |
| WoW tree studies from the prior asset work | Canopy mass, silhouette hierarchy, connected geometry, efficient foliage presentation. | Runtime meshes, textures, animation and setting-specific designs. |
| Owner's Warpkeep 0.4 art discussions | Calm native 3D menu, lush environment, readable light, coherent materials and purposeful ambient animation. | Original UI hierarchy, scene geometry, score, resident identity, and close-view composition; reuse the specifically approved Hegemony emblem under its recorded source boundary. |
| [Three.js Water Pro live demo](https://www.threejswaterpro.com/) and [primary documentation](https://docs.threejswaterpro.com/) | Layered waves, Fresnel response, clear shallows, depth color, reflections, and shore foam; owner-selected water reference (A23). | Original WebGL shaders and geometry suited to Tervain's coast and quest channels. No vendor code, assets, package, or purchased product is included; its FFT/WebGPU implementation is not adopted. |

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

### September 30 lore and menu-source recheck

Both sibling `AGENTS.md` files, their sharing/provenance rules, faction records, asset catalog, emblem source manifest, release manifest, and license ledger were read before this import. Fresh read-only fetches of main resolved to the same Warpkeep `786c0b2` and Assets `1e5c49e` snapshots above. No Templar record was found in those main source/docs or the inspected local sibling docs, so the affiliation is an accepted owner correction rather than a claim that those repositories already document it.

The sibling records do establish Hegemony civic/religious imagery: the Grand Covenant Cathedral, Basilica Warden church-order role, Shellback Shrine Tender, and Ward Peacekeeper appear in the [asset catalog](https://github.com/ael-dev3/Warpkeep-Assets/blob/1e5c49e9819ea50cf4e03675bb05868f90f06fdc/docs/archive/2026-09-08-asset-catalog.md#hegemony-keep-citizens) and game asset records. Those are useful identity context, not proof of a final Templar doctrine, hierarchy, or history. No such details are imported by this menu change.

The approved September 27 emblem is recorded on Assets' [inspected branch revision `5394111`](https://github.com/ael-dev3/Warpkeep-Assets/tree/5394111926a8f728ef91a9436bc8d7266296869e), not the fetched main snapshot. Its [provenance](https://github.com/ael-dev3/Warpkeep-Assets/blob/5394111926a8f728ef91a9436bc8d7266296869e/provenance/hegemony-emblem-2026-09-27.md) and [source manifest](https://github.com/ael-dev3/Warpkeep-Assets/blob/5394111926a8f728ef91a9436bc8d7266296869e/manifests/hegemony-emblem-2026-09-27.source.json) identify the exact transparent gold-and-violet master and published archive release. The [Tervain inventory](engineering/asset-inventory.md#approved-hegemony-menu-emblem-30-september-2026) records its verified 1,486,312 bytes, SHA-256, runtime path, and current owner-specific use authorization. No general open-content or trademark grant is inferred.

## Technical sources

- [Three.js documentation](https://threejs.org/docs/): renderer/import API reference to consult at implementation time.
- [Three.js Reflector](https://threejs.org/docs/pages/Reflector.html): the existing dependency's WebGL planar-reflection addon is used for the optional coastal capture; its [source](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/objects/Reflector.js) and [MIT license](https://github.com/mrdoob/three.js/blob/r186/LICENSE) were checked against the installed Three.js `0.186.1` package. No additional rendering dependency was added. Tervain's wave, foam, transmission, and composite orchestration code is original.
- [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security): candidate shell boundaries; Electron is not yet selected.
- [Steam Input](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs): optional platform input integration reference.
- [Steam Cloud](https://partner.steamgames.com/doc/features/cloud): optional save synchronization reference.

The platform entries record outline research; the water reference and Reflector entries were added during the 30 September implementation follow-up. Recheck platform requirements before packaging. No runtime, desktop package, Steam integration, or hardware benchmark was executed as part of the documentation seed; subsequent implementation and local review are recorded in the [prototype notes](engineering/prototype.md#water-presentation-follow-up-30-september-2026).
