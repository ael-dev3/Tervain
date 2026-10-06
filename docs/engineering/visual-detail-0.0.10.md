# 0.0.10 — tree and ground visual detail

The owner's 0.0.10 goal prioritizes the forest's appearance over reducing hardware load. The reported faults were changing tree forms at a distance and blurred close bark, alongside sparse, angular grass and overly regular cracked ground. This document records implementation controls and their costs; it does not establish a minimum specification or a measured frame-rate target. The [Solitary Pine source contract](solitary-pine.md), [asset fingerprints](solitary-pine-assets.json), authored roads, root grounding and canonical woodland placements remain.

## Complete source forms at a distance

The 0.0.9 High preset blended its 9,706-triangle pine into a 3,610-triangle remesh at 36–48 m, then into 48-triangle crossed silhouettes at 116–148 m. Complementary coverage prevented a hard visibility switch, but the different woody surfaces and silhouettes could still change the tree's apparent form or leave a stippled transition. Moving those switches alone would postpone the problem.

High now submits the complete near geometry for every visible tree, including the source-derived pine trunk, roots, branches and bowed foliage cards. It does not submit remeshed middle wood or crossed far silhouettes during ordinary rendering. The source-derived culling envelope, same-frame camera refresh, shadow-frustum retention and resident distance range remain. Trees have full coverage through 900 m and fade into haze by 1,020 m. The clear daytime fog is now 0.0024; theoretical FogExp2 transmittance at 900 m is about 0.94%, rather than a claim that the last fade is invisible on every display or weather condition.

| Control | High | Medium | Low |
| --- | --- | --- | --- |
| Ordinary near/middle transition | Complete near geometry at every visible distance | 120–180 m | No near geometry |
| Ordinary middle/far transition | None | 480–620 m | 64–96 m |
| Selected tree/shrub placements | 612 | 547 | 482 |
| Selected Solitary Pine conifers | 281 | 271 | 259 |
| Canonical tree obstacles | 376 | 376 | 376 |
| Canonical conifer obstacles | 233 | 233 | 233 |

Medium retains complementary opaque coverage between adjacent levels. Low retains its existing middle-detail trunks locally and far approximation beyond its transition. Those two presets still make geometry approximations; only High promises complete source geometry throughout the visible realm. The developer `?lod=0|1|2` inspection override intentionally remains able to force the delivered levels and is outside ordinary preset selection.

New settings default to High. Loading an existing saved Medium or Low preference preserves it; this release does not silently replace an explicit preference. Resetting defaults selects High. A comparison must record the actual preset, since upgrading the code alone does not change a saved graphics choice.

No source GLB, UV, authored normal, tree-family scale, root shape or canonical placement is rebaked or reshaped by this revision. The only geometry transforms remain flattening source node transforms, uniform scale/yaw and translation to embed the whole root footprint. Attached canopy, branches and trunks remain static. The approved separate falling-leaf streams remain animated and freeze in Reduced Motion.

## Close bark with original surface detail

The source close wood retains its 2,048 px baked albedo atlas, but increasing that image's dimensions would not add missing detail. Runtime bark now overlays original procedural 1,024 px plate, crack and grain fields with a separate linear relief/roughness surface map. The higher-resolution field contains new grain frequencies, rather than an interpolation of the old 256 px bark texture. Pine plates use weathered silver-brown colour; oak, birch and dead wood retain their distinct bark families.

A triplanar shader samples the tile in physical world space: each repeat covers 0.86 m horizontally and 1.40 m vertically. That gives approximately 1,191 and 731 source texels per metre before filtering, independent of a tree's uniform enlargement. Smooth normal-based projection weights avoid an atlas-border seam on root flares and branch joins. Mipmaps and up to 16× anisotropy retain oblique detail, subject to the renderer's supported anisotropy limit.

The source atlas still provides broad value variation. Close albedo blends up to 86% original detailed bark with that variation, then smoothly returns to the source atlas between 45 and 100 m. Dry plates and recessed cracks supply varying roughness. A surface-gradient shader uses the actual detail relief with a maximum 0.022 m height scale to perturb lighting normals. This is shading relief: it does not displace vertices, add root polygons or change collision geometry. World-oriented grain does not replace a custom branch-oriented unwrap or a sculpted high-resolution tree.

Per-world pine materials retain owned texture clones, including the new detail uniforms. Shared CPU templates and pixels survive disposal/rebuild, while each forest releases its GPU objects once. Original material hooks compose with the existing coverage and shadow masks. Broadleaf/dead-tree materials apply the same metre-scale treatment without changing their mesh generation.

## Ground, grass and daylight

> The folded grass described below was replaced in 0.0.13 by the [grass engine](grass-0.0.13.md) (A61).

The eight original tileable terrain layers remain grass, heath, earth, gravel, sand, wet sand, rock and path. The world now generates 1,024 px layers on High, 768 px on Medium and 256 px on Low; the previous High/Medium size was 512 px. Generation yields between layers to keep the loading display responsive.

The art changes are targeted. Grass and heath have richer green value groups. Earth has softer, shallower fractures instead of a strong polygon grid. Gravel contains separate rounded shingle embedded in soil rather than filling each Voronoi cell. Rock keeps weathered strata and occasional restrained fissures. Original leaf-litter marks with veins and matching relief are stamped into grass, heath, earth and path, wrapping at texture edges. These are surface marks, distinct from the animated detached leaves. Sand and wet sand retain their prior designs at the preset's new resolution.

The terrain render grid subdivides each authored 2 m cell into four 1 m cells, resampling the same triangle-plane height function. The map's rendered terrain becomes 394,400 triangles and 198,121 vertices, from 98,600 triangles and 49,761 vertices. Extra vertices refine material/wetness boundaries and normal interpolation; they do not introduce different topography or a second physics height surface. Tests sample triangle interiors as well as vertices against the original terrain.

Near terrain shading gives the primary detail sample greater weight instead of mixing it heavily with a rotated coarse sample. Steep rock uses the actual side-projection derivatives for mip selection. Relief perturbs normals along the real surface tangents, and a modest relief-dependent ambient term darkens crevices. These changes remain material shading rather than geometric displacement.

Grass blades are genuinely folded around a centre ridge, with six triangles per blade instead of three. The shared patch material moves from Lambert to rough Standard PBR, adds a restrained midrib/fibre treatment and worn tips, and uses greener meadow/shade colours. Root/tip value treatment and canopy habitat density are adjusted without filling authored route exclusions.

Each blade vertex carries its own base point. After instance yaw, width and distance compensation, the grass vertex shader samples the existing terrain height grid at that actual root location, using the same four samples and diagonal triangle interpolation as `Terrain.heightAt`. Roots sit 0.04 m below that surface while blade height is retained above them. This replaces one flat tuft anchor on sloping ground. Hard-obstacle exclusion uses the actual tuft silhouette radius, instance width and maximum distance scale, plus 0.12 m clearance, instead of the previous fixed 0.35 m padding. Stream bounds include the separately fitted roots at both distance-scale endpoints, rather than assuming the central anchor covers their vertical range. A single-channel float texture references the existing terrain height array and is released with the grass material.

| Grass control | High | Medium | Low |
| --- | --- | --- | --- |
| Blades per tuft | 13 | 10 | 6 |
| Triangles per tuft | 78 | 60 | 36 |
| Maximum candidate tufts per square metre | 4.6 | 3.0 | 1.4 |
| Distance fade | 12–96 m | 10–80 m | 8–64 m |
| Receives shadows | Yes | Yes | No |

Candidate density is not an observed count of visible tufts: habitat acceptance, exclusions, deterministic rank thinning, streaming and camera culling reduce submission. Low retains its old population controls, but also receives the new folded blade geometry and material. Grass does not cast its own shadows. Its existing wind/pusher deformation remains separate from the paused attached tree sway.

Daytime directional sun intensity increases at the 09:00/13:00/17:00 keys to 2.15/2.40/2.05. Sun shadow normal bias decreases from 0.60 m to 0.075 m, with depth bias −0.00018, to reduce visibly detached root/foot shadows. Clear daytime haze decreases while the existing night density remains 0.0040. The approved separate title/pause composition retains its own presentation.

## Water visibility and source wood contacts

Water capture eligibility now uses cached bounds clipped from the actual source triangles, with the shader's maximum wave amplitudes, shore damping and land-mask threshold. Near wet pieces are grouped in 32 m cells; long horizon triangles remain separate. The existing crest margin is retained. This prevents the huge bounding box of dry geometry discarded by the water shader from triggering forest reflections and composition while looking inland. Turning back toward visible sea restores the existing reflection targets and quality. Original sea geometry, wave behavior, shoreline damping and reflection frequency/quality are unchanged. This is a visibility correctness fix, not a reference-hardware performance claim.

Canonical blocking trees also export their exact near wood positions/indices, original grounded translation, yaw and uniform scale through a renderer-free interface. Buffers are shared per variant, and leaves are excluded. Cargo uses that wood as fixed triangle contacts; player/NPC/navigation retain canonical root-footprint sweeps. Source GLBs remain unchanged. See the [physics handoff](physics-0.0.10.md).

## Workload, memory and limits

Complete source geometry is deliberately more expensive. The 281 High conifers alone represent 2,727,386 near triangles before camera/shadow-volume selection, excluding other tree families and repeat render passes. That is an asset/population calculation, not the renderer's observed per-frame total. More complete woody geometry also costs more in sun shadows. High avoids geometry transition overlap, but is not a performance optimization.

The two eight-layer RGBA8 terrain arrays hold 64 MiB of base pixel data on High, 36 MiB on Medium and 4 MiB on Low. Their GPU storage with complete mip chains is approximately 85.3/48.0/5.3 MiB before driver overhead; the former 512 px High/Medium base arrays held 16 MiB. These are dimension/format calculations, not measured total memory. CPU pixel arrays, temporary generation fields, other assets, framebuffers and shadows add costs. Each 1,024 px RGBA bark detail map is another 4 MiB of base pixels; colour and relief/roughness are two uploaded maps per bark family, with an additional generated normal map retained in the CPU bark cache. Pine texture clones share pixel arrays rather than making another copy of those pixels.

Folded grass doubles per-blade triangles on all presets. High/Medium also increase blades per tuft and candidate density. The richer materials add texture taps and shading work, including four terrain-height fetches per grass vertex. The root-height texture holds 49,761 float samples, about 0.19 MiB before driver overhead; it references the existing CPU height array rather than copying those heights. Existing bounded streaming and conservative displacement-aware bounds remain, but no new reference-device qualification, minimum specification or Steam performance claim has been made.

## Verification state

Tree component checks pass 28 tests in five files: actual source geometry/material loading, source-instance transforms and roots, canonical population/obstacles, disposal, Medium coverage and High source retention, and new bark pixel/shader integration. A final tree bark/distance subset passes seven tests in two files. Ground component checks pass 13 tests across `terrainVisuals.test.ts` and `groundVisibility.test.ts`, covering source-plane preservation, deterministic layer data/colour spaces, normalized normals, actual blade folds, shader-hook assembly, authoritative height-grid bindings and the diagonal root-height formula, owned root-height texture disposal and conservative streaming bounds. Shader-hook tests assemble the installed Three shader strings; they are not a substitute for compiling and looking at the rendered game.

Late component checks pass 13 pine integration tests, including exact shared source-wood buffers/transforms across presets, and 44 sea/sea-geometry/water-pass tests. The water regressions reproduce the inland High forest view and restore the existing 512 px reflection when turned toward the sea. These overlap prior coverage and are not an additive full-suite count.

Recorded validation shows passing final combined typecheck, **881 tests in 84 files (43.61 s)** and the production build. Native in-app browser review shows High source tree forms, close bark/terrain/grass, detached leaves without the square artifact, camp lift/throw, pause menu v0.0.10 and west-facing coastal water; no runtime errors were observed in those reviewed views. Captures and logs are retained in the local validation archive. This review used prior baseline `5760aa8` plus the integrated local modifications, before publication. Native save/load round-trip and physical controller coverage were not newly tested. Final hosted acceptance uses the successful final-source Pages run and served-version gates in the [release record](../production/releases/0.0.10.md). Earlier component screenshots and tests remain distinct; no matched performance benchmark or reference-machine qualification is asserted.

## Coastal follow-up (A46)

The subsequent owner-requested [coastal water and rock revision](coastal-water-rocks-0.0.10.md) supersedes the earlier unchanged-wave/material statement: resolved swells and metre-based depth absorption, elevation-limited wet stone, world-axis triplanar cliff detail, and source-exact grounded rock contacts are now integrated. Sea mesh topology and the original terrain planes remain unchanged. Earlier component validation above stays attached to its original source; combined follow-up evidence belongs to the release record.
