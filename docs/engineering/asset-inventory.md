# Shared asset inventory (Warpkeep → Tervain)

Status, 30 September 2026: **209 historical runtime GLBs remain archived outside the published build; the exact approved Hegemony emblem is integrated into the locally validated native 3D menu revision.** Source-byte verification and combined `0.0.5` production-browser review pass; source is published in the repository and public Pages hosting is unavailable (404), as recorded in the [combined handoff](../production/releases/0.0.5.md). Browser HTTP-failure simulation and desktop-package checks remain unverified. Follows the inventory convention in [shared-assets.md](shared-assets.md).

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

The owner explicitly requested the approved Hegemony identity for Tervain's native 3D menu (first the desert market, since 0.0.5 the Templar vigil under A26, where it is the single weathered standard of A24). This particular reuse is authorized by that instruction (A21–A22), not by a general open-content license or mere repository presence. The other scene geometry is originally authored for Tervain; Gothic 3 is inspiration only.

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
| Scene use | Renderer prints a weathered runtime copy of the master onto the single vigil standard on a grounded, guyed timber post (A24, A26). Pilgrims' rags and other cloth remain unmarked. The bundled master stays unchanged; no invented seal or freestanding emblem plaque |
| Verification/state | Local byte equality, size, SHA-256, and PNG header checked on 30 September. Production-preview browser rendered the approved emblem on native fabric without stretched aspect. CPU-only scene tests cover fallback guards and disposal; browser HTTP-failure simulation and desktop-package validation remain unverified. Integrated and locally validated in the combined `0.0.5` revision; source published in the repository, public Pages hosting unavailable (404). See the [combined handoff](../production/releases/0.0.5.md) |

[Machine-readable menu asset record](menu-assets.json) preserves these coordinates and authorization separately from the historical GLB manifest. The July pixel-art emblem and retired unresolved logo candidates remain separate historical records; neither is imported as a substitute.

## Original procedural menu vessels, 30 September 2026

Menu sea traffic under A29 is original procedural geometry in [menuShips.ts](../../src/presentation/menu/menuShips.ts), not an imported GLB. Three native connected hull/rig/sail silhouettes (two on Low) and shared wakes use vertex colors and the existing dusk shader colors without additional image files. Seeded voyages are generated at each menu opening; nested forms and graphics rebuilds retain the phase. No extra faction emblem, third-party model, ship faction or naval gameplay is introduced. See the [0.0.5 handoff](../production/releases/0.0.5.md#living-sea-traffic).

The A30 hermitage awakening, reworked under A32 for `0.0.7`, is original procedural geometry and shading: the spirits in [menuWisps.ts](../../src/presentation/menu/menuWisps.ts), their simulation in [menuGrove.ts](../../src/presentation/menu/menuGrove.ts) and the carved hollow in [menuHollow.ts](../../src/presentation/menu/menuHollow.ts). Its rhythm data in [menuScoreRhythmData.ts](../../src/presentation/menu/menuScoreRhythmData.ts) is measured from the approved score and holds no audio. The `0.0.5` description follows: the awakening is original procedural geometry in [menuWisps.ts](../../src/presentation/menu/menuWisps.ts), with a hinged leaf and real carved cavity in the existing native tree. The 30 / 24 / 16 spirits on High / Medium / Low use three texture-free instanced draws and 1,020 / 816 / 544 triangles. No imported forest-spirit model, image or individual point light is used. The generated [score feature module](../../src/presentation/menu/menuScoreFeatures.ts) measures the already approved runtime song: 4,285 five-channel samples, 21,425 quantized bytes, with source/runtime/payload hashes. Ael / Lyrics is credited for its studied media-clock and analysis workflow; no case-study media or code is imported. Source information, license boundaries and reproduction are in [menu-grove-score.md](menu-grove-score.md) and the [analysis guide](../../tools/README-menu-score-analysis.md).

## Owner-supplied menu score, 30 September 2026

The owner supplied **The Sovereign's Oath.m4a** directly for the Tervain menu and requested its main-game integration as part of `0.0.5`, plus a video spanning the complete song ([A28](../decisions.md)). This is separate from the Warpkeep import: no music from the shared archive is selected.

The unchanged source is archived at [assets/audio/source/the-sovereigns-oath-original.m4a](../../assets/audio/source/the-sovereigns-oath-original.m4a). It contains 214.200 seconds of stereo, 48 kHz Opus audio in an MP4 container, plus an unused timed-text stream. The runtime primary [Ogg/Opus](../../public/assets/audio/the-sovereigns-oath.ogg) is an audio-only stream copy; the [AAC/M4A fallback](../../public/assets/audio/the-sovereigns-oath.m4a) is encoded for compatibility. Both are locally served media; the menu's Master/Music controls retain mix headroom. The song is not an in-world soundtrack or a new sound-effects library.

The [human-readable source record](menu-score.md) and [machine-readable audio inventory](menu-audio-assets.json) pin sizes, hashes, media properties, preparation, and source disclosure. Embedded metadata says the source was made with Suno; authorship, model/version and service/account terms were not independently verified. The owner instruction records this particular Tervain use, repository delivery and requested video. No separate open-content grant or independent ownership finding is asserted. Final integration, browser, video and publication evidence belongs to the [0.0.5 handoff](../production/releases/0.0.5.md).

## Generated world sound, 5 October 2026

A50 adds 99 sound-effects generations made for Tervain with the owner's ElevenLabs account from original prompts:

- footsteps, combat, items, the world's moving parts, residents' work and voices, wildlife;
- sixteen place beds;
- the in-world score.

The unchanged MP3 generations are archived in [assets/audio/source/world/](../../assets/audio/source/world/). Runtime sprites, loops and pieces in [public/assets/audio/world/](../../public/assets/audio/world/) are rebuilt by [tools/world-audio/prepare.mjs](../../tools/world-audio/prepare.mjs) as Ogg Opus with AAC fallbacks. Every prompt and hash is in [world-audio-assets.json](world-audio-assets.json). Credit to ElevenLabs (elevenlabs.io) is required under the free-plan sound-effects terms and is given in the About text and NOTICE; no independent rights review is asserted. Nothing from Gothic, Warpkeep or another game is used. A51 adds crafted music and sounds rendered by original code in [tools/world-audio/compose/](../../tools/world-audio/compose/): no recordings or generators, each render recorded by hash under `composed`. See [world-audio.md](world-audio.md).

## Teaser for X, 5 October 2026

A52's [teaser](../media/teaser/tervain-teaser-0.0.10.mp4) is filmed from Tervain's own prototype. Its sound comes from A50's generations and A51's crafted sounds, and its score is composed in code; the owner-supplied menu score is not used. Two typefaces are drawn into its captions: Cinzel (Natanael Gama) and Inter (Rasmus Andersson), both under the SIL Open Font License 1.1. They are fetched from Google Fonts while rendering, and no font files are in the repository. See the [teaser record](../production/teaser-x.md).

## Replacement people sheets (0.0.8)

Since `0.0.8` ([A36](../decisions.md)) every person's texture is a sheet the game paints in code at load; painted sheets are not files and need no record. An image saved as `src/assets/people/<id>.png` (or `.jpg`, `.jpeg`, `.webp`) replaces one person's painted sheet, and Vite bundles it into the build. The [retexture guide](../art/people-retexture.md) describes the layout, the export and the rules.

**No replacement sheet is installed.** Before one is committed, check it with `npm run people:check` and record it here; leave nothing in the folder without a row:

| Id | File | Size and SHA-256 | Made (date, by whom, how: tool or model and version when known, prompt, starting files) | Terms | Owner approval |
| --- | --- | --- | --- | --- | --- |
| — | none installed | — | — | — | — |

A sheet made with an image-generation service carries that service's terms; record them as they are rather than asserting a rights review. Inputs must be original or the project's own exports: no Gothic 3 or Gothic Remake files, screenshots or concept art ([A14](../decisions.md)), and no real person's likeness. No emblem or lettering appears on clothing without an owner decision ([A24](../decisions.md)).

## Approved playable Weathered Wanderer, 2 October 2026

A37 selects the owner-approved 49,500-triangle model for the main character only. The runtime file is [public/models/hero/weathered-wanderer-hero-50k.glb](../../public/models/hero/weathered-wanderer-hero-50k.glb): 28,184,920 bytes, SHA-256 `4d4c16e56ce8696b195828bb41ca2d1fb015c3ef855a9cd2472eaa4a1c7d6691`, with 30 joints and five source clips. Lossless WebP preparation preserves every decoded texture pixel and every non-image payload. The owner-supplied Meshy source, approved reduction/material refinement/rigging, specific project-use authority and preparation audit are recorded in [main-hero.md](main-hero.md) and [main-hero-assets.json](main-hero-assets.json). This is separate from the archived Warpkeep GLBs and the A36 procedural people sheets. NPCs and the menu warden keep that existing pipeline. Running-game verification is recorded in the [integration handoff](../production/main-hero-integration.md).

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

## Solitary Pine woodland (A38)

The owner-supplied Meshy pine replaces all ordinary dark conifers, including the distant treeline, in the combined `0.0.9` release. Three hosted GLBs contain the 9,706-triangle near tree and matching middle/far geometry. [Provenance and render contract](solitary-pine.md) and [runtime inventory](solitary-pine-assets.json) record authority, hashes, counts and source-matching collision footprints. A39's larger woodland layout and final combined population/checks are recorded separately in the [0.0.9 release](../production/releases/0.0.9.md); dated component results remain historical. Source/master files remain in the workshop, separate from the earlier Warpkeep catalog above.

## Not yet done

- No independent review of each asset's rights beyond Warpkeep's own ledger.
- No desktop or Steam packaging test; download size (about 24 MB of models) has not been reviewed against a delivery budget.
- The rest of Warpkeep-Assets (the 152-asset library, animated castles, the lush biome tree releases) is available but not imported; the tree v3 candidates are an open pull request in that repository and are not used.

## Current animated Wanderer (A45, 0.0.10)

The owner-supplied All Animations GLB supersedes A37's runtime selection. The [current embedded model](../../public/models/hero/weathered-wanderer-animated-hero.glb) uses an under-100k reduction, 66-joint Mixamo skin and all six source clips. Original JPEG PBR payloads and authored curves are retained through a uniform 1.899 m normalization; no texture generation is part of this import. See [provenance](main-hero-animations-assets.json), [current hero record](main-hero.md) and [stride/integration evidence](main-hero-animations-0.0.10.md). The earlier 49,500-triangle binary/record remain historical audit assets and are not loaded by gameplay.

## Original coastal follow-up in 0.0.10

A46 revises original procedural [sea waves](../../src/presentation/sea.ts), [water optics](../../src/presentation/waterOptics.ts), generated stone textures and the shared seeded [rock geometry](../../src/presentation/rockGeometry.ts). Source triangles supply finite player/cargo contacts. No new third-party model, bitmap, dependency or separate Gothic 3 content is copied. Existing shader/source attribution remains in place. See [coastal water and rocks](coastal-water-rocks-0.0.10.md).
