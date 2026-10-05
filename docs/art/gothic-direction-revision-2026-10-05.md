# Gothic-inspired presentation revision — 5 October 2026

Status: same-version `0.0.12` art follow-up in preparation. The owner asked for
the main Tervain game to look substantially closer to Gothic 3 after studying
the separate browser reconstruction and available reference files. This extends
the existing rugged, exaggerated fantasy direction; it does not replace
Tervain's original world with the separate port or promote the version. See
[A52](../decisions.md) and the [release record](../production/releases/0.0.12.md).
The checked tree/menu implementation at `5876ea3`, with documentation at
`30e9692`, is the before-source. Its previous tests validate that source, not
this new presentation candidate.

## What was studied

The study reads selected source inventories, conversion receipts and actual
decoded texture pixels. It is bounded evidence rather than a native-game
playthrough, an exhaustive review of every serialized property or proof of
renderer equivalence. The task-local audit is retained at
`outputs/tervain-gothic-look-study-2026-10-05/reference-audit.json`, outside the
repository's shipped game content.

| Material | Actual inspected scope |
| --- | --- |
| Existing reference and vegetation research | [Gothic art reference](gothic3-reference.md), [vegetation study](gothic3-vegetation-study.md), [browser reconstruction](../engineering/gothic3-browser-port.md), [rebuilding process](../engineering/gothic3-rebuilding-process.md), [local-install viewer](../engineering/gothic3-local.md), and [tools/readers](../../tools/gothic3/README.md). |
| Provenance and selected scene | [Notice](../../assets/gothic3/NOTICE.md), [content provenance](../../assets/gothic3/content-provenance.json), [scene](../../public/gothic3/scene.json) and source manifest. The selected scene records 202 world instances, 67 NPC records, 130 unique model resources and 139 textures. Unique selected assets total 634,836 triangles; this is not a submitted-frame count. |
| Full-world inventory | World index, source and mesh-resource manifests: 290 sectors, 2,529 world files, 2,424 geometry contexts and 5,392 mesh resources. Stored enabled flags and membership do not establish that all resources are active or visible. |
| Terrain | [Manifest](../../public/gothic3/terrain/manifest.json), material graphs, [conversion receipt](../../assets/gothic3/terrain/conversion-receipt.json), [conversion audit](../../assets/gothic3/terrain/conversion-audit.json) and [native shader evidence](../../assets/gothic3/terrain/native-shader-evidence.json). All 782 converted landscape cells represent 2,082,155 triangles, 1,931,561 vertices, 65 native material graphs and 88 unique decoded PNGs. Source lightmap/collision receipts remain distinct from applied browser features. |
| People and motion | The animated manifest/audit and hero rig metadata: one selected 10,692-triangle hero, 73 cleaned joints and eleven source motions. The static actor exhibits, painted costume materials and meter-scale body/environment relationships are references. Neither those joints nor native motion curves are imported into Tervain. |
| Gameplay and world dressing | Bounded gameplay manifest and index counts, including 641 quest definitions, 4,381 info records and 17,001 command lines; 2,519/2,529 world sources and 6,081/6,082 template sources decode. This helps distinguish authored activity clusters from even random prop scattering. The catalog is not ordinary functioning gameplay and its quest/dialogue text is not used in Tervain. |
| Actual image and geometry data | All 139 static texture headers and 88 terrain PNG headers; decoded pixels of eight selected original albedos; selected house, storage, hut, small-house, stool and stone OBJ bounds/counts. No reference image is supplied to image generation. |
| Current Tervain | Baseline terrain, architecture textures, grass, environment/grade, camera, people styling and HUD; production `5876ea3` forest, town, sparse coast and menu before captures. |

The public reference tree contains 13,132 files /502,069,309 bytes: 783 GLBs,
130 OBJ/MTL pairs, 227 JPEG/PNG images, JSON catalogs and gzip data chunks. This
inventory makes the selected hosted data's scale explicit; it does not imply
that every file was rendered, every byte inspected or the full original game
reconstructed.

## What the references actually show

The selected albedos use broad, directional structure beneath small texture
detail. Thatch is irregular fiber bundles with darker creases; timber has long
grain, weather stains and varied cracks; broken masonry groups large rough
pieces and chipped mortar. Ground is a subdued grey-olive field with brown soil
and plant debris. Painted peasant fabric carries coarse weave, folds, seams and
dirty hems rather than a smooth uniformly tinted surface.

Decoded mean sRGB byte values demonstrate the comparatively dark source paint:
grass approximately `(40,41,28)`, earth `(37,32,26)`, worn path `(70,57,43)`,
wood `(37,35,27)`, broken masonry `(40,40,37)` and thatch `(57,44,29)`. These are
whole-image measurements, not linear reflectance, target final-frame brightness
or a recipe for multiplying Tervain's colors. The completed original image also
depends on native lighting, overbright response, atmosphere and post effects.
Blanket darkening, desaturation or a sepia filter would discard its theatrical
warm/cool groups and selective saturated accents.

Measured source buildings emphasize complete roof and framing masses: the
selected two-storey house is about 15.59 ×12.20 ×19.79 m with 6,995 triangles;
the storage building is 18.52 ×17.58 ×22.94 m with 7,818. A small house is about
8.66 ×10.51 ×13.65 m with 3,099 triangles, and a stool about
0.53 ×0.66 ×0.56 m. Dimensions are X/Y/Z, with Y as height. These are useful
proportion and silhouette comparisons, not permission to copy a facade,
topology, furniture shape or placement.

Historical vegetation cohorts differ strongly by location. Dense inland stands
have a dominant upper-canopy family, subordinate shorter plants and irregular
openings; the coast is sparse. Stored Gothic transforms are not a runtime plant
census. Tervain's approved dense woodland approach, localized diverse habitats,
readable roads and regional mix therefore remain authoritative; the incomplete
port's absent vegetation is not a direction to empty the main world.

The saved Tervain before views show that its tree canopy already has coherent
large forms. More noticeable differences are bright flat foreground grass,
repetitive roof rows, uniform panel wear and insufficient separation between
sunlit ground, deep openings and distant land. The menu already has strong
warm/cool theater, readable original serif choices and colorful spirits; its
distinct vigil composition should survive the world-art revision. The sparse
coast's pale untextured log cylinders are another concrete material mismatch;
their existing supported geometry can gain bark without repopulating the strand.

## Native Gothic 3 versus browser reconstruction

The coordinator's local `/gothic3/` inspection reaches Ardea and confirms rough
roof masses, long dark boards and deep openings. Vegetation and some ground
rendering remain incomplete. The public hosted URL returned 404 during this
task; local inspection must not be described as successful live-route review.
The audit agent could not access the hosted route independently; actual local
data, decoded pixels and the coordinator's bounded local observation remain
the study basis.

The separate reconstruction uses authored Three.js lighting and exposure,
Phong preview materials and a 65° camera, with known missing native lighting,
lightmaps, vegetation, actor equipment and behavior. Its inspection toolbar is
new browser UI, not the original Gothic 3 interface. The local-install viewer
also has original code, authored daylight and approximated tree crowns; it is
not a native SpeedTree or renderer implementation. Neither route establishes
native visual parity. Historical Gothic settings around 60° FOV support a
restrained camera adjustment from Tervain's baseline 58°, rather than blindly
copying the port's preview camera or exposure.

## Presentation choices and preserved contracts

The candidate reworks original procedural materials and lighting relationships:
rough directional timber/thatch, broader wear and damp patches, less uniformly
green ground, calmer folded grass, warmer selective direct sun, cooler distant
haze and reduced ambient fill. A modest grade retains day/night detail; original
serif HUD refinements should reduce its visual weight without changing controls.

The terrain component uses original hand-coded pressed-root/straw,
interwoven-herb and leaf-humus paint, lower relief, rough gravel/coastal stone
and a continuous warm road center with frayed visual shoulders. The actual road
center retains at least 0.91 path share; physical terrain support does not move.
Its mixed-width grass/herbs keep six triangles per blade, deterministic random
placements and root-fit streaming logic. Buried fern stem roots and flatter
moss retain the existing floor-instance and route/contact layout. Menu terrain
and lower menu grass follow the same material grammar without replacing its
separate vigil composition.

Original procedural leaf-tissue RGBA paint gives forest-floor leaves rounded
lanceolate cutouts, veins, mottle, freckles and worn edges. It does not derive
from a Gothic source image. Color, depth and distance passes share the same
0.35 alpha cutout; one owned texture is disposed with the floor module. Ferns
remain 504 triangles and shrubs below 400 per authored variant. The leaf forms
are original low-plant geometry; supplied tree canopies remain unchanged GLB
derivatives, with visible large card planes still a limitation in isolated views.

The frozen terrain component comprises `terrainTextures.ts`,
`terrainMaterial.ts`, `groundSplat.ts`, `ground/grass.ts`,
`ground/patchMaterial.ts`, `forestFloor.ts`, `treeMaterials.ts` and
`menu/menuLand.ts`; its updated checks are `terrainVisuals.test.ts` and
`treeBarkDetail.test.ts`. Its component typecheck and 52 focused tests pass,
with 24 affected tests rerun after the last shape correction. The original
authored material sheet and actual 512px measurements are retained in local
`outputs/tervain-gothic3-direction-ground/`. They compare the original authored
before/after maps, not native-rendered frames or GPU performance. Final combined
source and native acceptance remain separate.

The architecture component replaces all-over cellular wear with split-face
horizontal rubble and sparse peeled/rain-stained limewash. It gives roof ends
coarser irregularity over their unchanged closed backing and deeper attached
fascias/bargeboards, then adds original plank/batten/braced shutters, forged
door fasteners/rings, crate battens and vertically oriented barrel-stave UVs.
An original hollow cast-bronze bell carries a rolled lip, crown and internal
clapper within the existing tower placement/contact envelope. These details
must fit the existing aggregate model budgets; increased detail is not an
exception to the under-20k natural-model checks.

Its frozen component files are `buildingTextures.ts`, `regions.ts`, `roofs.ts`,
`structures.ts` and `settlement.ts`, with
`tests/presentation/architectureArt.test.ts`. Focused geometry/contact/cargo
coverage passed 55 tests in six files (15.99 s); after the final shingle UV
orientation correction, sixteen architecture/roof checks pass (3.68 s).
The actual complete lighthouse assembly is 19,998 triangles under its existing
strict 20k cap. These component results do not replace the final combined suite,
build or native review. New checks cover outward closed hollow bell geometry,
the retained bell envelope, decoration RNG use, vertical barrel grain and
actual-face roof UV direction, rather than only mirroring color constants.

Weathered shoreline logs gain owned original bark maps on their existing UVs
and support geometry, with explicit texture disposal and no new placement or
triangle span. Runtime close bark detail is restrained so it interferes less
with the supplied tree's source paint: the close albedo overlay becomes 45%
rather than 86%, and its normal-height multiplier falls from 0.022 to 0.012
without displacing the geometry. Source GLB hashes remain a separate
preservation check; runtime lighting/material appearance intentionally changes.

No mesh, texture, animation, dialog, gameplay data, font, shader or code from the
reference routes is imported into the main game. Reference files remain
separate and unchanged; no reference images are ingested by image generation.
Tervain retains its original lore, its approved Hegemony standard, supplied
source-painted people and source-fitting trees.

The protected Pine and supplied GLB hashes, complete under-20k tree/menu and
under-50k NPC budgets, whole-root grounding, canonical contacts, clear authored
routes, static attached gameplay foliage, compatible saves and graphics-rebuild
pose must survive. The approved Wanderer rig/curves, calibrated walk/run cadence,
two-minute running endurance, empty starting ten-slot item hotbar and pickup/map
behavior remain. The menu retains the actual score, doorway cue, attached custom
sprigs, spirits, single faction standard, modest ships and Reduced Motion state.
Material/camera art changes must not silently alter these gameplay contracts.

## Verification and remaining limits

Final-source validation is pending. Required acceptance is:

- Inspect the main/reference diff boundary and protected source hashes; audit
  actual complete asset budgets and finite material/uniform values.
- Run strict TypeScript and proportionate terrain, architecture, presentation,
  camera/contact, tree/menu lifecycle and save/quality regressions, followed by
  the combined suite and committed-source production build.
- Compare main before/after views with source, hour, pose, camera, resolution and
  quality recorded. Inspect woodland, town, sparse strand/lighthouse, people
  and title/pause; check daylight and night legibility and avoid crushed shadows.
- Check native High/Medium/Low rebuilds, retained contacts/player pose, actual
  score-led opening and Reduced Motion continuity; capture warnings/errors.
- Measure any performance claim on a warmed matched route separately. Texture
  means, unique geometry counts and a successful build are not renderer parity,
  a frame-time improvement or minimum-PC qualification.

The previous `5876ea3` tree verification remains historical for that source.
This document makes no current candidate pass, 10/10 quality, native parity,
live deployment or new minimum-PC claim. The preserved required-CI billing and
hosting gates remain in the [release publication record](../production/releases/0.0.12.md#publication).
The coordinator owns publication. Any push, PR change, merge, dispatch, rerun or
trigger change requires a fresh read-only review of all current UTC-day
workflows, branches, actors, states and attempts, including reruns of older
runs, and an estimate of resulting runs/minutes under the current owner policy.
Unknown monthly usage remains unknown; required checks, service behavior and
stricter pauses are not bypassed to publish an art revision.
