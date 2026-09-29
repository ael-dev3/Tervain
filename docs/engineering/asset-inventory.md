# Shared asset inventory (Warpkeep → Tervain)

Status: **imported and in use in the browser prototype (0.0.x)**; not yet checked in a desktop package. Follows the inventory convention in [shared-assets.md](shared-assets.md).

Tervain and Warpkeep are set in the same world and are meant to share technology and assets ([A10](../decisions.md)). On 29 September 2026 the project owner instructed that Tervain use the same assets and technology as [Warpkeep](https://github.com/ael-dev3/Warpkeep) and [Warpkeep-Assets](https://github.com/ael-dev3/Warpkeep-Assets). This document records exactly what was taken and on what terms.

## Status of the archive (0.0.2)

The GLBs described below live in `assets/warpkeep/` (outside `public/`, so they are not built into the site). The 0.0.2 scene does not use them and does not publish them; the owner's direction of 29 September 2026 (decisions A12–A14) asks for a rugged, Gothic 3-style look that the shared models' bright, chunky forms do not give, so the scene is generated in code instead. They stay archived, with provenance and terms, as candidates for retexturing or for a later decision. Publishing them remains an owner decision under the terms recorded here.

## What was imported

`tools/import-warpkeep-assets.mjs` copies an explicit selection of Warpkeep's **runtime GLBs** (`public/models/hegemony/…`) byte for byte into `assets/warpkeep/` and writes `assets/warpkeep/manifest.json`, which the game loads as its catalog. The manifest pins, for every file, the source path, size, SHA-256, triangle count, bounding size, skinning and animation names, and, once, the source repository and commit.

| Field | Value |
| --- | --- |
| Source repository | `ael-dev3/Warpkeep` |
| Source revision | `786c0b2be6f2d2e7eb2de02ef3b6826c8907fc32` (main, inspected 29 September 2026) |
| Files | 209 GLBs, 23.7 MB, 76 catalog assets |
| Transformation | None. Files are unmodified; recolouring and scaling happen at load time in code, on cloned materials |

| Catalog group | Assets | Files | Notes |
| --- | --- | --- | --- |
| `tree.*` | 25 | 75 | 22 environment species (oak, maple, birch, willow, spruce, pine, fir, cypress and the "regular" family) with High/Balanced/Compact LODs, plus three Inner Keep ornamental trees |
| `building.*` | 4 | 11 | City mill, stoneworks, lumber camp, barracks |
| `node.*` | 3 | 8 | Stone quarry, logging camp, wheat farm |
| `stone.*`, `palisade.*` | 4 + 6 | 12 + 18 | Ruins, keep well, palisade kit |
| `prop.*` | 18 | 54 | Notice board, signpost, bench, post lamp, trough, fences, curbs, plaza and road tiles, boulders, hedges, brazier |
| `citizen.*` | 8 | 16 | Rigged Balanced (Greet, Idle, Walk, Work) and static Compact |
| `unit.*` | 6 | 12 | Infantry and ranged units, rigged (Attack, Idle, Walk, Special) |
| `wildlife.*` | 2 | 3 | Rabbit |

Not imported: the castles, the Grand Covenant Cathedral, cavalry and mounted units, gold-mine assets, the Warpkeep title letters and emblem, all audio and music (including the menu score), video, and every image. The Hegemony emblem and crest textures embedded in some unit models are replaced at load time; Tervain does not use the Hegemony's identity ([A06](../decisions.md)).

## Terms

Warpkeep's own [asset ledger](https://github.com/ael-dev3/Warpkeep/blob/main/ASSETS-LICENSE.md) records these runtime files as **use-authorised** (`LicenseRef-Warpkeep-Provenance-Required`), not as open content: presence in a repository does not establish ownership, an open licence, or general redistribution rights, and each source set keeps its dated provenance record in Warpkeep-Assets. Some sets were produced with generation tools (see the creation disclosure in Warpkeep-Assets' README).

For Tervain the project owner (the rights-holder in both repositories) instructed their use and, when asked, chose to make this repository public and to serve the game from GitHub Pages. That publishes these files. It is the owner's decision under the terms above; it does not turn the files into open content, and nothing in this repository grants anyone else rights to them. If the owner later wants the assets withheld from the public site, run the import tool with an empty selection and rebuild; the game falls back to procedural art.

## Technology reused

Warpkeep's software is Apache-2.0 ([LICENSING.md](https://github.com/ael-dev3/Warpkeep/blob/main/LICENSING.md)). Where Tervain ports a technique from Warpkeep source (wind and gust fields, grass and wildflower layers, terrain and environment materials, procedural audio ideas), the new file carries an "Adapted from ael-dev3/Warpkeep …" header naming the source path and revision, and the repository [NOTICE](../../NOTICE) records the attribution. Ports are rewritten for this codebase, not copied as a package.

## Inventory record (per shared-assets.md)

| Field | Record |
| --- | --- |
| Identity | Catalog ids in `assets/warpkeep/manifest.json` (for example `tree.oak-spring-broad`) |
| Source | Repository, commit and per-file source path in the manifest |
| Integrity | Per-file SHA-256 in the manifest; filenames also carry the source hash prefix |
| Authorship and terms | As above; per-set provenance lives in Warpkeep-Assets |
| Geometry | Metres, Y up; bounding size, minimum Y and triangle counts per LOD in the manifest |
| Textures | Vertex-coloured models with no external images, except the embedded crest and a few embedded atlases on some units and props |
| Motion | Skeleton and clip names per file in the manifest |
| World use | Placement and collision are defined in Tervain code from `src/world/layout.ts`, never from the models |
| Verification | Loaded and rendered in the browser prototype; no desktop package, no per-asset review of every close view |
| State | Usable under recorded (owner-authorised) terms → adapted at load → tested in the browser build |

## Not yet done

- No independent review of each asset's rights beyond Warpkeep's own ledger.
- No desktop or Steam packaging test; download size (about 24 MB of models) has not been reviewed against a delivery budget.
- The rest of Warpkeep-Assets (the 152-asset library, animated castles, the lush biome tree releases) is available but not imported; the tree v3 candidates are an open pull request in that repository and are not used.
