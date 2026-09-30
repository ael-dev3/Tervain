# Shared asset inventory (Warpkeep → Tervain)

Status, 30 September 2026: **209 historical runtime GLBs remain archived outside the published build; the exact approved Hegemony emblem is integrated into the locally reviewed native 3D menu revision.** Source-byte verification and local browser rendering pass; revision publication, browser HTTP-failure simulation, and desktop-package checks remain pending or unverified. Follows the inventory convention in [shared-assets.md](shared-assets.md).

Tervain and Warpkeep are set in the same world and are meant to share technology and assets ([A10](../decisions.md)). On 29 September 2026 the project owner instructed that Tervain use the same assets and technology as [Warpkeep](https://github.com/ael-dev3/Warpkeep) and [Warpkeep-Assets](https://github.com/ael-dev3/Warpkeep-Assets). This document records exactly what was taken and on what terms.

## Status of the archive (0.0.2)

The GLBs described below live in `assets/warpkeep/` (outside `public/`, so they are not built into the site). The 0.0.2 scene does not use them and does not publish them; the owner's direction of 29 September 2026 (decisions A12–A14) asks for a rugged, Gothic 3-style look that the shared models' bright, chunky forms do not give, so the scene is generated in code instead. They stay archived, with provenance and terms, as candidates for retexturing or for a later decision. Publishing them remains an owner decision under the terms recorded here.

## What was imported

`tools/import-warpkeep-assets.mjs` copied an explicit selection of Warpkeep's **runtime GLBs** (`public/models/hegemony/…`) byte for byte into `assets/warpkeep/` and wrote `assets/warpkeep/manifest.json` for the first import's catalog. The manifest pins, for every file, the source path, size, SHA-256, triangle count, bounding size, skinning and animation names, and, once, the source repository and commit. The current scene does not load those archived models.

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

Not imported in the original GLB selection: the castles, the Grand Covenant Cathedral, cavalry and mounted units, gold-mine assets, the Warpkeep title letters and emblem, all audio and music (including the menu score), video, and every image. The earlier decision to replace embedded crest textures is historical. Owner clarification A21 now confirms Templars within the Hegemony, and A22 authorizes the exact emblem import below; the archived GLBs are still outside the runtime build.

## Approved Hegemony menu emblem, 30 September 2026

The owner explicitly requested the approved Hegemony identity for Tervain's native 3D desert-market menu. This particular reuse is authorized by that instruction (A21–A22), not by a general open-content license or mere repository presence. The other scene geometry is originally authored for Tervain; Gothic 3 is inspiration only.

| Field | Record |
| --- | --- |
| Identity | `warpkeep.hegemony.emblem.2026-09-27` — current approved gold sword, sweeping wings, two stars, and violet circular center |
| Source repository/revision | `ael-dev3/Warpkeep-Assets` at `5394111926a8f728ef91a9436bc8d7266296869e` on its September 27 emblem branch; this is distinct from fetched main `1e5c49e9819ea50cf4e03675bb05868f90f06fdc` |
| Exact source | `previews/hegemony-emblem-2026-09-27/hegemony-emblem-master-1254.png` ([pinned file](https://github.com/ael-dev3/Warpkeep-Assets/blob/5394111926a8f728ef91a9436bc8d7266296869e/previews/hegemony-emblem-2026-09-27/hegemony-emblem-master-1254.png)) |
| Published archive | Release `hegemony-emblem-2026-09-27`, attachment `warpkeep-hegemony-emblem-2026-09-27-master.png` ([source record](https://github.com/ael-dev3/Warpkeep-Assets/blob/5394111926a8f728ef91a9436bc8d7266296869e/provenance/hegemony-emblem-2026-09-27.md)) |
| Runtime path | [public/assets/menu/hegemony-emblem.png](../../public/assets/menu/hegemony-emblem.png); resolve through the configured base URL |
| Integrity | 1,486,312 bytes; SHA-256 `26e8664b1db0acf3e6db443caf46ef13e45fe9de794749e431b7c2e3d6fb8774` |
| Image | 1254×1254, 8-bit RGBA PNG, transparency retained |
| Preparation | Byte-exact copy: no crop, repaint, background removal, metadata stripping, or new generation; existing `caBX` chunk retained |
| Creation disclosure | Ael supplied `ChatGPT Image Sep 27, 2026, 04_44_09 PM.png`; the specific generation model/service version was not independently verified |
| Terms and credit | Supplied by Ael for the Warpkeep project; exact archive permits recorded public deposit/release distribution but asserts no separate open license. Current owner instruction specifically authorizes this Tervain menu use; no general third-party, trademark, endorsement, or unrelated-asset grant is asserted |
| Scene use | Renderer prints the master onto originally authored cloth CanvasTextures, with full-color side standards and a quieter central print behind controls. The bundled master stays unchanged; no invented seal or freestanding emblem plaque |
| Verification/state | Local byte equality, size, SHA-256, and PNG header checked on 30 September. Production-preview browser rendered the approved emblem on native fabric without stretched aspect. CPU-only scene tests cover fallback guards and disposal; browser HTTP-failure simulation and desktop-package validation remain unverified. Revision locally reviewed, publication pending |

[Machine-readable menu asset record](menu-assets.json) preserves these coordinates and authorization separately from the historical GLB manifest. The July pixel-art emblem and retired unresolved logo candidates remain separate historical records; neither is imported as a substitute.

## Terms

Warpkeep's own [asset ledger](https://github.com/ael-dev3/Warpkeep/blob/main/ASSETS-LICENSE.md) records these runtime files as **use-authorised** (`LicenseRef-Warpkeep-Provenance-Required`), not as open content: presence in a repository does not establish ownership, an open licence, or general redistribution rights, and each source set keeps its dated provenance record in Warpkeep-Assets. Some sets were produced with generation tools (see the creation disclosure in Warpkeep-Assets' README).

For the historical first import, the project owner instructed their use and chose to make this repository public and serve the game from GitHub Pages. That records the project's specific-use authority; it is not an independent ownership review, an open-content grant, or a new right for other users. The current build keeps these GLBs outside `public/` and uses procedural scene geometry. The menu emblem's current specific authorization and source boundary are recorded separately above.

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
