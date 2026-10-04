# Sharing technology and assets with Warpkeep

> **Update, 30 September 2026.** Shared *technology* (wind, sky light, grass tiles) is in use; the imported Warpkeep *models* are archived in `assets/warpkeep/` and are not used or published in 0.0.x because they conflict with the Gothic 3 direction (decisions A10, A12). A21 confirms Templars within the Hegemony, and A22 specifically authorizes the exact September 27 Hegemony emblem for the native 3D menu. Its [source, terms, hash, and current verification](asset-inventory.md#approved-hegemony-menu-emblem-30-september-2026) are separate from the historical model import. The requirements below still govern other reuse.

Status: **reuse plan and dated inventory of candidates. A first import and the approved menu emblem are recorded in [asset-inventory.md](asset-inventory.md)** (209 runtime GLBs from Warpkeep at `786c0b2`, historically used under owner authorization, now archive-only; exact emblem copied on 30 September). The rest of this document remains the plan for further reuse. Earlier source snapshots below were checked on 29 September; the menu source was rechecked on 30 September.

**Current selections, 4 October 2026.** A37 uses the owner's approved [Weathered Wanderer](main-hero.md) as the playable hero, and A38 uses the owner-supplied [Solitary Pine](solitary-pine.md) for the ordinary world's dark conifers. A39 supplies the original larger woodland layout. The owner approved their combined `0.0.9` publication under A40; validation and deployment belong to the [release record](../production/releases/0.0.9.md). Recorded game-use authority and runtime derivatives remain separate from the archived Warpkeep model catalog and establish no general open-content license. NPCs, broadleaf trees and the separate menu grove retain their current pipelines. Dated source snapshots below remain historical.

## Purpose

Share the expensive foundations that serve both games: original vegetation, modular scenery, texture/source workflows, rigging conventions, model inspection, terrain knowledge, and small reusable renderer utilities. Let each game select its own runtime content, platform requirements, fiction, and composition.

The benefit should be visible: a better original tree may improve both a mobile diorama and a close-view forest, while each receives a different density/LOD/material treatment. Sharing does not require identical scenes or a dependency on the other game's release schedule.

## Verified source snapshot

| Source | Observed revision / record | What the observation proves |
| --- | --- | --- |
| Warpkeep main | `786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32` | Repository declares TypeScript/Three.js and contains terrain, water, model-loading, and asset-verification work. No direct portability benchmark performed. |
| Warpkeep-Assets main | `1e5c49e9819ea50cf4e03675bb05868f90f06fdc` | Existing archive, per-set terms, release records, and Warplet's Watch deposit are discoverable. |
| Lush biome trees v3 | [Assets PR #41](https://github.com/ael-dev3/Warpkeep-Assets/pull/41), head `bc3d7ace4058ea840d886bf16bbcd5b1a67b2ac9` | Open PR records prepared v3 content and validation; its body explicitly says the v3 release attachment is not published. |
| Earlier lush trees | [Published release](https://github.com/ael-dev3/Warpkeep-Assets/releases/tag/greater-realm-lush-biome-trees-2026-09-28) | Published attachment is named `greater-realm-lush-biome-trees-2026-09-28-v1.zip`; it must not be mistaken for the v3 archive. |
| Procedural Tree reference | [Assets PR #40](https://github.com/ael-dev3/Warpkeep-Assets/pull/40) and [reference release](https://github.com/ael-dev3/Warpkeep-Assets/releases/tag/blendswap-procedural-tree-reference-2026-09-28) | Credited reference archive exists; inspect its actual terms and source before any use. |
| Emblem/castle/menu score | [Assets PR #37](https://github.com/ael-dev3/Warpkeep-Assets/pull/37) with dated published releases | Art/audio archive candidates exist. Archive status is distinct from suitability and permission for a new game's distribution. |

PR states and release availability can change. Recheck at import time and pin the source actually consumed. None of these references authorizes this task to merge sibling PRs or publish pending attachments.

For the September 30 menu revision, fresh read-only fetches still resolved main to the recorded Warpkeep `786c0b2` and Assets `1e5c49e`. The approved September 27 emblem exists on Assets' inspected branch revision `5394111926a8f728ef91a9436bc8d7266296869e` and in its published archive release. Main snapshots and that asset branch are not interchangeable. No Templar record was found in the inspected main source/docs; Hegemony affiliation is confirmed by the owner's current instruction, rather than inferred from absent repository lore.

The v3 PR reports 40 GLBs, 60 painted atlases, 20 tree-bearing biome designs, near variants of 311–1,098 triangles and mobile variants of 80–277. Those are upstream reported model counts, not measurements of Tervain's renderer. The prepared ZIP is reported as 7,180,652 bytes, SHA-256 `039d2fb736b4a58857b84ba11c321208e1a9e8ca54eb1922d6684237144f547e`. Verify the downloaded archive and its member manifest before treating it as the expected source.

## Candidate assessment

| Candidate | Potential reuse | Required Tervain adaptation |
| --- | --- | --- |
| Original lush v3 trees | Strong first vegetation candidates; distinct biome silhouettes, preserved source workflow. | Obtain the correct v3 archive, check terms, inspect foliage/branch connections at player eye level, choose LODs, wind, collision, materials, and forest composition. |
| Original terrain/water utilities | Height sampling, dressing ideas, water presentation, color and surface semantics. | Separate pure utilities from hex-map, atlas, UI, and server assumptions; build collision/navigation for free movement. |
| Modular stone/timber/building parts | Village, shrine, quarry, walls, bridges, and work structures. | Inspect accessible interiors, door sizes, ground contacts, close-view materials, collision, and cultural identity. |
| Citizen/animal models and rigs | Starting rig study, ambient movement, possible selected residents or wildlife. | Confirm forward axis and units; inspect loops, feet/hands, retargeting, proportions, and combat/emote needs. |
| Castle and rooftop guardian | Reference for authored 3D composition, animation, and source organization. | Tervain's setting does not require the guardian or a castle-centered menu. Character/source rights and narrative fit require separate treatment. |
| Approved September 27 Hegemony emblem | Selected for the menu under explicit owner authority (A21–A22); since 0.0.5 it is painted, weathered, into the single standard of the Templar vigil (A24, A26). | Preserve exact bytes and source boundary, load through the base URL, integrate on native cloth, and verify rendering/fallback; no invented replacement seal. |
| Music and sounds | Production reference or possible selected licensed material. | Confirm actual reuse scope, loops/stems, regional tone, loudness, interruptions, attribution, and fatigue in extended play. |
| Model viewers and validators | Inspect variants, geometry, materials, animation, and release manifests. | Adapt as offline development tools; avoid bundling unnecessary viewer code in the game. |

Reuse the original authors' work through explicit records, not by recognizing a filename. Some historic names do not accurately describe the geometry inside a file; inspect the model.

## Software extraction principles

Select a small demonstrably useful component at a pinned revision. Read its imports and license before copying or packaging it. Identify environmental assumptions, supply a minimal adapter, preserve notices, and validate it in Tervain. Keep upstream fixes traceable.

Good early candidates are bounded math/geometry utilities, asset loaders after decoupling, LOD conventions, validation scripts, and authoring/export tools. Poor candidates are the entire Warpkeep application shell, generated online bindings, account identity, social clients, keep timers, rollout scripts, private atlas exports, or production configuration.

Extract a shared package only after both games use a stable interface and both have an owner for maintenance. A shared package introduced too early can make an experimental RPG depend on the MMO's deployment cadence. Pinned vendoring with a clear source record can be an acceptable early experiment; unexplained copy-paste is not a maintenance strategy.

## Asset inventory convention

Before a runtime import, add a machine-readable catalog entry and a human-readable credit record. The exact schema is to be implemented with the pipeline; this is the required information model:

| Field | Required information |
| --- | --- |
| Identity | Stable asset ID, display label, category, version. |
| Source | Repository/release URL, immutable revision or attachment ID, source and runtime paths. |
| Integrity | Archive and file SHA-256 values; deterministic transform/tool versions where applicable. |
| Authorship/terms | Author, creation/source history, actual permission or license, attribution text, restrictions, unresolved items. |
| Geometry | Units, up/forward axes, origin, bounds, triangle/vertex counts by LOD, material and draw-call expectations. |
| Textures | Color-space intent, dimensions, channels, transparency mode, compression/residency estimates. |
| Motion | Skeleton contract, clip names, loop behavior, root motion policy, sockets. |
| World use | Collision/nav proxy, placement rules, biome/culture, expected camera distance. |
| Verification | Tool report, visual review, target-package test, reviewer/date, known defects. |
| State | Candidate → inspected → usable under recorded terms → adapted → tested in package → shipped. |

Example planning entry: `vegetation.alder_basin.broadleaf_01` may point to one exact v3 species, its preserved source and adapted runtime LODs. Do not invent its source hash, permission, or performance result before inspection.

Editable Blender and texture sources belong in the source archive; runtime builds should contain the selected optimized derivatives. Preserve a path back to the editable original. Use releases or a deliberately chosen large-file system for large binaries, instead of accumulating caches, duplicate exports, and reference downloads in Git.

## Source and creative boundaries

Warpkeep's software license does not automatically cover every model, image, or audio file. The [per-set asset ledger](https://github.com/ael-dev3/Warpkeep-Assets/blob/1e5c49e9819ea50cf4e03675bb05868f90f06fdc/ASSET-LICENSES.md) distinguishes open-content grants, archive-only authority, and unresolved/external terms. The owner intends cross-project reuse; record the authority for the particular imported material without claiming that third-party rights changed.

The earlier WoW tree inspections and Gothic references can inform silhouette, canopy density, material economy, and level composition. Extracted game files, their textures, animations, and recognizable designs are not Tervain's asset library. Build original assets or use assets under actual compatible terms. The BlendSwap example has its own source record and must be treated individually.

Boring Forest is a visual and public-source study for the `0.0.5` woodland, not an asset or code import. Its initial composition and client implementation were observed; pointer-lock entry failed, so no walked reference route or performance comparison was completed. No affirmative custom-asset license was established. That dated pass used original code-authored trees, floor detail, waymarkers and haze. The current broadleaf/dead trees, shrubs, floor detail, waymarkers and haze retain that pipeline; A38 conifers instead use the owner's optimized [Solitary Pine](solitary-pine.md), using A39's selected canonical layout and obstacle identities with source-matching trunk footprints. See the [study record](../references.md#boring-forest-study-30-september-2026).

Likewise, the original Warplet references, previous emblems, music attachment, and generated concept media carry their recorded source boundaries. A historical upload or publication approval is not a blanket relicensing statement for everything in the archive. The current Hegemony menu emblem is a specifically owner-authorized selection, not a general grant over the rest of the archive.

## First reuse experiment

1. Select one verified original broadleaf tree, one conifer, a rock, and a modular wall/ground set; use proxies if an archive is unavailable.
2. Assemble a small eye-level scene with a path, undergrowth, water, and a moving character.
3. Compare three foliage densities and LOD transitions on the target package.
4. Check branch-to-leaf connection, ground contact, transparency from both sides, navigation, shadow cost, and camera obstruction.
5. Record what the original assets save, what needs rework, and whether the source pipeline supports those edits.
6. Return any generally useful fixes to the shared source deliberately, without changing Warpkeep runtime integration in the same task by assumption.

This is the first technical/art proof for shared assets. A gallery render, a small archive, or a triangle-count comparison alone does not complete it.
