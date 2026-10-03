# Solitary Pine woodland replacement

The owner's 3 October 2026 goal replaces all dark green world trees with the optimized owner-supplied Solitary Pine. The dark conifer families are `pine`, `fir` and `shorepine`: **490** trees, including **397** fixed trunk obstacles. Low/Medium/High retain **436 / 458 / 490** candidates and every obstacle. Warmer olive broadleaf trees, dead wood, shrubs and floor detail retain their treatment. The separate menu grove retains its hollow, door and wisp geometry. Version stays **0.0.8** and gameplay tree/leaf animation remains paused.

## Provenance

Source: owner-supplied `Meshy_AI_Solitary_Pine_1002211944_texture.glb`, SHA-256 `c8319b1c996a5af3add735d1519aacc469375d03cf2efa3e55d74ba1ce31acca`. Its 276,680 triangles become **9,706 total triangles**, including structural wood, connected twig supports and 666 bowed needle cards. The source branch layout and bark artwork are retained; close structural wood is closed and receives a fresh source-albedo bake, while needle artwork is original.

Owner supply and the game-use request authorize this specific integration. No general open-content licence or independent Meshy account rights review is asserted. No extracted Gothic, Warcraft or proprietary SpeedTree files are bundled. These are SpeedTree-style static cards in ordinary GLB, not an `.srt` or SpeedTreeRT runtime integration.

Editable Blender scenes, texture masters, scripts, attachment records and import/render audits remain in the `solitary-pine-cards` workshop. The game bundles three GLBs with embedded standard PNG/JPEG maps. [solitary-pine-assets.json](solitary-pine-assets.json) records hashes/counts/bytes; run `node tools/check-solitary-pine.mjs` to verify them.

## Runtime contract

`WorldScene.create` awaits required models before construction. Loading uses `BASE_URL`, rejects missing/HTML/incomplete data or missing masked canopy, and releases failures for Retry. Successful CPU templates are cached. Every world owns geometry/material/texture clones, so disposal cannot invalidate a quality rebuild. Near/middle share the needle atlas within a world; remeshed middle wood uses its own baked bark atlas. No procedural conifer fallback is used.

The substitution is inside `flora.ts`. Canonical placement, yaw, instance scale, obstacle IDs and exclusions stay unchanged. Native height is about 1.92m. Source transforms are flattened, the root is grounded, and one uniform scale sets each species/seed height. Every vertex, UV and authored normal retains its source relationship. No radial trunk squeezing, nonlinear fir profile or gameplay wind deformation remains.

Collision follows the source, rather than deforming its mesh to the old obstacle. For each blocking conifer, the wood surfaces of both close LODs are clipped against the 2.6m player-clearance slab, including the 6cm buried root origin. Their greatest radial extent, plus 3cm padding, supplies the ground-plane circle. Registration happens before graphics selection, so all 397 conifer obstacles have the same IDs, positions and footprints on Low/Medium/High. Other families keep their original radii. Authored roads and NPC routes must remain clear.

The lower crown has extra bowed underside sprays; middle distance retains all six spray directions per cluster. This volume is authored in the asset, with connected twig roots, rather than bending the game mesh. Cached species/seed variants share geometry within a world; separate worlds retain their own disposable resources.

Existing instancing, distance selection, culling, shadows and actual triangle statistics are preserved. Near/middle have real branches. Far uses four crossed source-derived silhouette planes with six vertical segments each, baked from the source proportions; it is a distant approximation, not a camera-facing billboard. Foliage retains alpha cutoff `.42`, double-sided PBR and embedded textures.

## Verification

Binary tests decode actual geometry and check budgets, grounding, collider clearance, every conifer family/preset, submitted LOD statistics and disposal/rebuild. Loader tests cover HTTP/HTML/truncation, partial success, retry and timeout. Existing population/navigation tests cover routes and obstacle identities. Native desktop review checks the production forest, graphics rebuild and browser errors. The complete suite passed 722 tests in 67 files. After the final far export, all 15 asset/loading/collision/route tests passed against the delivered binaries. Typecheck, production build and binary integrity checks pass; all three GLBs have zero Khronos errors/warnings. Native Low/Medium/High rebuilds reached READY with 436/458/490 conifers and 1,033 total trunk obstacles, preserving the corrected geometry without loading/render errors. Final observations are recorded with the inventory; no reference-device or Steam performance result is implied.
