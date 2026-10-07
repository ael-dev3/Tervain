> Repository study edition: historical 5 October 2026 material. See [the study index](README.md) for the current evidence boundary, later changes and omitted private files. Embedded proposals are not project instructions.

# Current Tervain source levers for the Gothic 3 video audit

Prepared 5 October 2026, Europe/Belgrade. Read-only investigation. No game edits, new release, remote CI, or publication were performed. These are proposals, not implemented changes or newly approved lore.

## Evidence boundary and main finding

The source inspected is `Tervain repository (local checkout path withheld)`, documentation HEAD `9e7c6fbd`; latest accepted runtime source is `67788fa1`, character repair within 0.0.12. Landscape evidence from the preceding `88cf6678` revision remains relevant because the subsequent character repair does not modify the world/terrain/tree/hero sources. Use the latest character portrait for people, and label the older landscape captures with their genuine revision. Do not call either candidate live.

I visually inspected these supplied-video study frames: frame-sheet files `000689.jpg` (11:28 sign/road), `000748.jpg` (12:27 forest), `000837.jpg` (13:56 settlement hall), `000870.jpg` (14:29 table/steps), `000964.jpg` (16:03 lighthouse approach), `001088.jpg` (18:07 parapet), plus the native-size selected `second-half-native/12-33.jpg` coastal view. These are selections from the parent's broader frame analysis, not a claim that this sub-audit personally inspected every decoded frame.

The dominant gap is not insufficient total triangle count. Gothic 3's recorded look combines dense fine plant texture, believable material scale, irregular assembled structures, rolling spatial layers, and an inhabited arrangement of props. In current Tervain, a few oversized crown plates, discrete folded grass ribbons, dark repeated masonry joints, smooth broad ground, and generic rectangular structures are more visually legible than those finer ecological and human relationships. Increasing every model's polygon count would retain that mismatch and increase cost.

The current renderer already has useful machinery: eight height-blended terrain layers, triplanar stone, source-derived accepted crown masks, whole-root tree grounding, material batching, resident terrain tiles, analytic water relief/depth/reflections, calibrated authored hero locomotion, eleven-joint private NPC rigs, and a stable camera. Extend those systems surgically; do not replace the engine to obtain this look.

## 1. Tree crowns: repair the represented scale of leaves

**Observed contrast.** At 12:27, the reference's trunks are tall, relatively narrow vertical accents and its crowns read as collections of small leaves with numerous gaps. In current `final-eastern-oaks-high.jpg`, large olive-green plate-like leaves and broad opaque crown patches remain visible at ordinary gameplay distance. In `final-trail-high.jpg`, the hanging silhouette at the top edge contains prominent jagged sheets. Atmospheric treatment cannot make an obviously giant leaf cluster behave visually like fine foliage.

**Exact current source.** `src/presentation/meshyTrees.ts:117` maps family and explicit source IDs; line 122 sets family base heights to oak 18 m, birch 16 m, fir 24 m, shorepine 10 m, palm 14 m, orchard 7 m, shrub 1.5 m, dead 13 m. `createMeshyForest` applies the source transform, one uniform family scale, and root translation. Its private material clone uses roughness at least 0.88 for wood / 0.82 for leaves, environment intensity 0.35, zero metalness/emission, double-sided leaf rendering, and alpha-to-coverage when a cutout threshold exists. This is already a sensible material boundary; there is no universal missing alpha-switch fix to assume.

**Proposed remedy.** Inspect each prepared source's retained solid crown versus added leaf-card contribution separately. Reject crown surfaces that dominate the screen as sealed horizontal shelves or single giant leaves. Reauthor prepared crown geometry into smaller connected branch clusters, with original atlas cutouts depicting many leaflets per cluster, varied orientation, sparse perforations, and spatially coherent light/dark clusters. Keep actual branch attachment evidence. Preserve the custom 9,706-triangle pine untouched. Remixes belong in the asset preparation tool (`tools/build-meshy-trees.py`) and the prepared binaries, with current provenance and counts; never squeeze axes or bend trees based on the camera.

**Do not misdiagnose scale.** Base height is not an automatic failure: a tall tree is valid. The mismatch is the ratio of trunk diameter, crown mass, visual leaflet size, and surrounding buildings. Measure these in native captures before choosing another family-height table. A generic 20% scale reduction can improve a screenshot while breaking root contacts, clearings, and the accepted source silhouette.

**Acceptance.** Each new complete natural asset remains strictly below 20,000 triangles, counting wood, retained crown, attached custom foliage and hidden pieces. Capture each family front/side/back/upward at near, middle and far range, plus a continuous turn. Validate cutout coverage and texture mips. Recompute conservative rendered envelopes and canonical contacts if the prepared wood changes. Screenshots must show fine crown texture without sealed plates; motion review must show no alpha shimmer or visible distance substitution. Static attached gameplay foliage remains paused; detached falling leaves retain their existing bounded behavior.

## 2. Grass: replace the lawn made of ribbons with a coherent textured sward

**Observed contrast.** The reference sign at 11:28 stands in a continuous, fine meadow with taller localized grasses along the road shoulder; the 12:27 hillside also carries a coherent carpet punctuated by flowers/ferns. Current Tervain's foreground exposes individual low-poly folded blades and gaps of smooth dirt. This is primarily a representation and ground-integration issue, not a demand to cover the entire world with more instances.

**Exact current source.** `src/presentation/ground/grass.ts:59` builds a tuft from individual tapered folded blades, six triangles per blade, without a grass image atlas. High uses 13 blades per tuft, 4.6 candidate patches/m² before habitat acceptance/thinning, 16 m streaming tiles, 12–96 m distance fade; Medium 10/3.0/10–80 m, Low 6/1.4/8–64 m. Base normal bias is 0.26. `grassHabitatProfile` and `ground/habitat.ts` coordinate moisture, canopy, exposure, slope, roads and clearing masks. `ground/patchMaterial.ts` uses a standard rough material plus analytic rib/color variation, common hemisphere-oriented normals, root-to-tip shade, rank fade and pushers. The visually effective density is not 4.6 × 13 everywhere; habitat rejection, rank thinning, frustum and tile state all intervene.

**Proposed remedy.** Make a small original grass/herb atlas with dense internal tuft texture and irregular alpha edges; add two or three interleaved clump-card orientations and a minority of geometry blades where the outline requires thickness. Each instance should carry many fine strands in the image, not merely a wider solid ribbon. Use shared roughness, subdued yellow-green/olive colour families, darker roots and selected sun-facing tips. Retain per-root terrain grounding and stable tile seeds. Tie the underlying grass/heath ground albedo to the same colony field, so distant or thinned grass dissolves into a similar ground value instead of unveiling tan blank soil.

**Placement changes.** Build three readable grass populations: short trampled village/road grass, patchy coastal exposed grass, and meadow/woodland-edge tall tufts. Dense plants may grow near rocks and banks but must leave actual road width and interaction zones readable. Crown shade should exchange grass for litter/moss/ferns, rather than turn every canopy into an almost empty black oval. The sparse arrival remains sparse; compare ecological continuity rather than equal grass density everywhere.

**Acceptance.** Walk a repeatable path with Low/Medium/High saved settings, inspect side-on and shallow angles, and turn while running. Require gradual rank changes, stable ground value at the fade edge, no rectangular cards, no buried/torn roots or colliding UI, and readable pickup silhouettes. Measure alpha overdraw and shadow cost before increasing candidate density. New atlas preparation is a proposal, not authorization to feed reference-game frames to image generation.

## 3. Forest floor: connect texture, understory and tree bases

`src/presentation/forestFloor.ts` already authors deterministic fern/shrub/moss/litter/log/fungi colonies. It samples actual transformed source crowns when available, uses terrain tangent checks for flat carpet pieces, and excludes roads, physical tree wood, steep terrain and palm-inappropriate moisture. `src/presentation/plantedCrowns.ts`, `floraPopulation.ts`, `world/forestStands.ts` and `ground/habitat.ts` make the accepted trees authoritative for cover.

The reference does not distribute every plant family equally: fern islands gather around stones and hollows, flowers are accents against fine grass, trees frame gaps. Preserve that existing architecture but change the visual balance: use less empty dark earth, more low continuous litter/ground detail beneath crowns, clumped ferns next to existing stone/wood, and occasional open sunlit breaks. Do not convert clearings into uniform concentric exclusion rings. Author mulch transitions around bases from actual accepted canopy/root extent, and localize large shrubs to places that serve composition rather than a repeated cell lattice.

Use a close reference pair to distinguish texture detail from real physical clutter. A dead branch may be a tiny decorative mesh, but a log tall enough to affect a route must share finite support/contact data. Props can be sparse near the starting strand while still being ecologically convincing.

## 4. Terrain: create spatial rhythm with a few deliberate forms

**Observed contrast.** Reference 12:27 has overlapping slopes: near rock/fern bank, descending trees, a middle trough, then an ascending distant wooded hill. The coast at 12:33 layers near vegetation, a lower hut/fence shelf, ochre sand, blue sea, lighthouse wall, distant promontory. The layers remain intelligible despite recording blur. Current Tervain now has a bay/headland and hills, but broad smooth slopes and simple material bands can still expose a procedural surface.

**Exact current source.** `src/world/layout.ts` holds the authored coast, shelves, forest hills/swale, arrival and lighthouse polylines/grades, building footprints and world anchors. World bounds are x −380..200 m, z −170..170 m, canonical height grid cell 2 m. `world/coast.ts` shapes the coast and lighthouse cap. `world/terrain.ts` composes authored forest relief, low boundary rise, local bumps, road/stream cuts, terrace support and natural rock surfaces. `presentation/terrainMesh.ts` uses render subdivision 2: material samples refine to 1 m while sampling the same authored physical planes; 64 rendered-cell resident tiles allow ordinary frustum culling without terrain unloading or distance LOD. Tile normals are copied from the globally computed surface to avoid seams.

**Proposed remedy.** Compose the existing coast/forest with a small number of authored banks, shallow gullies, broken shelf rims and variable-width road shoulders. Prioritize silhouettes visible from ordinary playable paths: one left-side foreground bank, a clear bend toward a landmark, a contrasting middle depression and a low distant closure. Use offset, irregular forms instead of repeating radial bumps. The lighthouse approach can widen near its entrance, narrow past a bank, and reveal the roof before the full tower. Do not add an alpine mountain wall over the sparse coast merely because an earlier reference contains distant mountains.

Terrain, visibility and navigation must read the same forms. Any edited height requires tree base re-grounding, finite rock/support checks, canonical obstacle review and saved-position compatibility. Extra render subdivisions only create extra triangles if they continue sampling the old plane; they cannot add real terrain shape and may worsen cost. Physical local relief must be authored in the shared height/support source, not cosmetic shader displacement under the player's feet.

**Acceptance.** Use fixed views of arrival, trail fork, forest trough, eastern grove, bay, lighthouse approach, village and archive threshold. Inspect slopes at player height rather than fly-only beauty viewpoints. Require a clear walkable route, easy ordinary rock landings, no levitating whole bases, no road ending at an ornamental obstruction, and no changed obstacle IDs caused solely by preset choice.

## 5. Ground materials: improve scale and relationship before extra microdetail

`src/presentation/terrainMaterial.ts` already height-blends eight texture layers: grass, heath, earth, gravel, sand, wet sand, rock, compacted path. Repeats cover respectively 2.4, 2.8, 2.2, 1.8, 3.2, 3.2, 3.6 and 2.0 m. Dry roughness is 0.95–0.99; wet sand is 0.4. Rock is world-axis triplanar, texture gradients are explicit and detail fades with range. This is a better starting point than introducing another terrain material framework.

The reference ground succeeds because it is legible as tiny plants, pale stones, compact dirt and moss gathering in physical depressions. Current noisy/smeared broad colour can read as low-frequency camouflage. Reauthor original layer content to recognizable, consistently scaled features; reserve fine noise for detail, medium patches for growth/traffic and broad fields for the ecosystem. Calibrate gravel pebble sizes against boots, and compare exposed stone with wall stone. Blend route edges in broad irregular islands; avoid crisp ribbons and avoid muddying the central travelled strip so much that it vanishes.

Bake broad material occlusion/contact into the original albedo only when it is associated with the material (mortar, moss/stone pores); do not bake a sun direction into universal tileable terrain. Keep day/night lighting functional. Do not add sharpen/grain to simulate missing ground geometry or bitmap content.

## 6. Architecture: use bespoke assemblies on top of the efficient build kit

**Observed contrast.** At 13:56, the reference hall's large warm roof is the dominant form. Its uneven eave, timber boards, diagonal framing, tall dark wall, nearby palisade and irregular steps feel built and repaired. At 14:29, shallow stepped stone terraces, a plank platform, roof supports, clutter and a loaded table describe a working settlement. The lighthouse at 16:03 and parapet at 18:07 have linked wooden circulation and stone structure. Native Tervain's current character portrait shows a materially flatter façade with prominent dark schematic stone joints and a generic roof/noticeboard combination.

**Exact current source.** `src/presentation/buildings.ts:buildStandard` assembles one of timber/plaster/stone wall forms, dark backing core, roof, windows, chimney and sparse use-clutter. `structures.ts` supplies slabs, quoins, frames, foundations, steps and doors. `roofs.ts` already builds real closed decking/underside/eaves, individual courses, chip/fray, pitched overlaps and broad correlated weathering: tile course 0.24 m, piece width 0.3333 m; slate .27/.31; thatch .36/.66; shingle .38/.26. Its functional complete-shell work should be retained. `settlement.ts` is explicitly all procedural primitives and does not currently request external structure models. `buildKit.ts` and `regions.ts` merge geometry by material and region rather than one draw per stone.

**Proposed remedy.** Create 3–5 original hero building assemblies: keeper/lighthouse compound, inn or trading hall, ordinary timber cottage, stone archive and a work shed. Share beams, posts, stone steps, roofing and materials, but author structural proportions and history per building. More asymmetry is meaningful if it follows use: a replaced section of planks, an older stone retaining wall under a newer timber wing, one leaning porch support, a partially mismatched repair row. Independent per-vertex jitter everywhere produces noise, not craftsmanship.

Increase roof silhouette variation through broken but closed eaves, visible beam ends and grouped roof wear; avoid a perfect ridge and repeated horizontal black stripes. Give each timber wall a large readable board grain and occasional broad discoloration, with actual open/slit window depth and door casing. The dark wall core is valid as gap backing but must not make open traversable interiors or doorways appear artificially sealed. Scale bench heights, stair risers and railings against the accepted 1.8 m character.

Retain fully completed roof/wall/foundation geometry. Do not manufacture the reference's appearance by creating missing backs or gap-ridden shells. `world/buildingEntries.ts` and `world/lighthouse.ts` are the shared thresholds/support authority; presentation edits must preserve the measured entrance and walkable surfaces or deliberately update both sides with tests.

## 7. Masonry: stop dark joints from reading like a drawn grid

`buildingTextures.ts:134` produces coursed rubble from seven horizontal courses and four/five columns per 2 m stone repeat, warped slightly with periodic noise. Mortar is strongly darkened toward RGB .075/.070/.052, and the generated height recess is then converted into normals. `regions.ts` applies stone normal scale .8 and roughness .98; albedo is multiplied by vertex colour. Thus making the material matte has already been done. The remaining black block-outline look is not fixed by another roughness increase.

Propose a new original rubble material with more irregular stone silhouettes, broken courses and thin warm grey mortar rather than universally near-black creases. Build variation at the stone face and whole-wall scale: mottled light/dark weathering, selected moss at the damp base, pale worn outer corners, localized repaired patches. Check vertex-colour × albedo energy before painting a second dark tint. Keep quoins/support stones visibly larger than infill; current universal stone repeat on every area makes structural parts equally patterned.

Reserve modeled protruding blocks for the skyline, doorway, parapet top and near corners. Ordinary wall interiors can remain textures. At 18:07, broad rough rocks forming the parapet silhouette carry the impression; tiny repetitive joints alone do not. Material realism is an artistic relationship, not more scalar roughness.

## 8. Settlement props: organize evidence of use

The reference table at 14:29 contains several distinct sizes, heights and objects against a continuous worn surface. Barrels, buckets, crates, firewood and stairs gather by an entrance, not at equally spaced coordinates across an open square. The comparison should imitate that human organizing logic without copying the exact table, bodies, quests or layout.

`settlement.ts`, `props.ts`, `structures.ts`, `physicalProps.ts`, `worldPickups.ts` and `world/layout.ts` are the concrete levers. Existing movable supplies and one-time provisions are systems to build on. Author a carpenter's clustered bench, keeper's fuel corner, modest store unloading patch, or inn doorstep repair—original environmental narratives that identify a resident's role. Give each vignette a focal large object, two/three medium supporting props and small accents, with clear walking clearance and no giant logo decals. Cloth/banners should use current original lore and approved insignia; the menu keeps exactly one Hegemony banner.

Do not make decorative items secretly collectible or grant quest state by proximity. Keep observation nonblocking and no dialogue window in this exploration pass. Props intended for lifting or support must retain consistent render/physics transforms and bounded meshes. Avoid importing reference names such as Cape Dun or Gothic quests into Tervain canon.

## 9. Light and colour: calibrate the whole scene, not one screenshot

The source video has bright sky, substantial distant violet/blue haze, warm roof/sand, dark wood, green grounds and fairly directional sun. The recording also contains blur/compression and changing camera framing, so its colour should not be treated as a lossless engine LUT or measured physical exposure. Its regional value grouping is the valid inspiration.

Current `app.ts` sets ACES filmic tone mapping and PCF shadow mapping. `sky.ts` has explicit daylight keyframes, sun/hemi/moon, and FogExp2 density .0031 at construction; `SkyRig.update()` replaces that with .0019 + .0019 × nightness (.0019 in daylight, .0038 at full night). Its sun shadow frustum is 140 m wide, normalBias .075 and bias −.00018. World quality shadow sizes are High 4096, Medium 2048, Low 1024. `environment.ts` generates a low-resolution original sky IBL every 1.8 seconds, intensity .78 on High/Medium, .73 on Low, plus slowly eased exposure. `grade.ts` adds display-space saturation .94, contrast 1.06, vignette 0.1 and grain 0.004; quarter-resolution bloom starts at threshold .85 with strength 0.24. Chromatic separation is already off in the shipped natural image.

Propose a fixed neutral daylight comparison first. Tune background horizon, fog and environment colour together so hills have decreasing contrast and cooler distance while near ground retains a warm/cool material distinction. Avoid globally reducing saturation until all foliage becomes khaki, or globally lowering fill until the woodland is black. The brighter native reference forest retains low-detail dark trunks while having a lively ground carpet. Set leaf transmission and source albedo before raising hemisphere fill, which can flatten people and all walls.

Do not assert native Gothic 3 uses the same IBL, ACES, shadow settings or post pipeline; these are Tervain controls with analogous visible purposes. No SSAO pass is currently evidenced in `grade.ts`; a restrained ambient/contact solution is an optional experiment, not a prerequisite. Test fake contact darkening or a low-cost effect in one location first, rejecting black halos, grass speckle and double darkening of authored albedo. Never mask invalid support with an AO blob.

Validate noon, overcast-like daylight and night separately. Preserve existing night route/cloth readability and lantern headroom. Global changes must not destroy the score-led dusk menu's material identity; grade exposes get/set restoration precisely for separate menu/game looks.

## 10. Sea and coast: quieter palette, stable reflection and stronger land layers

Current Tervain already has metre-based sea waves of wavelengths 34/18/10 m and amplitudes .35/.21/.08 m plus a .12 harmonic, shore damping, depth absorption, filtered highlight/ripple math and planar reflection. `seaGeometry.ts` supplies sufficient geometry sampling. `waterRenderPass.ts` refreshes a moving camera's reflection every visible pose rather than throttling it; stationary capture uses bounded cadence. High reflection target is 512², Medium 384²; Low skips the higher optics path. These stability fixes must survive art tuning.

Reference 12:33 has a large comparatively quiet blue/violet sea field, a warm sandy band and very distinct foreground/intermediate/distant layers. Propose calmer colour/normal/highlight balance for the same daylight conditions, with deeper sea value offshore and pale shallows confined to measured depth. Adjust authored coastal shelf silhouette and far promontory grouping first. Do not solve shallow-looking water by making the whole shore opaque blue or causing wave displacement to penetrate land.

The distant original silhouette in `coastalBackdrop.ts` / `world/distantCoast.ts` should continue being resident scenery. A more legible layered headland can be authored without importing a reference terrain heightmap. Keep physical wetness elevation-aware on outcrops and preserved easy rock landings.

Acceptance is a shoreline run-and-turn sequence, not one still. Check reflection movement, glints, far-normal filtering, bounds at screen edges, shore mask, wetness on raised rocks, fog horizon and repeated noon/night. The source video's blur is not evidence that Tervain should deliberately render unstable reflections or smear the whole picture.

## 11. People: preserve the latest repair, then integrate cast into scene scale

Use `final-game-character-portrait.jpg` from runtime 67788fa1. The preceding request already repaired17 NPC surfaces and reduced long-skirt distortion; their completed maximum is46,980 triangles including equipment. Do not compare the older collapsed-face screenshot as though it is the current implementation.

`meshynpcs.ts` owns per-world private rig/geometry/material resources; `npcSurface.ts` conditions normals for the reduced Meshy cast at strength 0.38 with forward floor .65. Current rebaked assets preserve source-derived custom basis and original UVs as secondary data. `actors.ts` resident/enemy gait advances with actual collision-resolved metres, preventing blocked walking-in-place. The hero remains the distinct approved 65k derivative, native PBR and all six authored clips with calibrated Walking 1.65 m/s  / Running 5.85 m/s; do not impose the NPC 50k cap on it accidentally.

Reference inhabitants are comparatively bulky, clothed silhouettes with purposeful gestures, often staged against props so their jobs are visible. The next improvement should be cast staging, distinct posture/task selection, believable eye/hand direction and environmental framing, not another universal high-poly character rebuild. Tune a specific work loop near an actual bench only if its hand/task placement is checked in motion; avoid constant broad synchronized idles. Retain controller-authoritative support, unarmed start and inventory-equipped weapons. Eleven-joint procedural NPC movement is not an imported authored animation collection or cloth simulation.

For any future surface/rig change, require native front/side/rear/close face plus a full walk, widest stride, sitting and work modes; a neutral bind or final screenshot is insufficient. Preserve the existing independent actual-GLB validation and source identity/provenance.

## 12. Camera: preserve stable control; compose like a third-person world

`cameraRig.ts` has PerspectiveCamera60°, near .1 m, far1400 m; default follow distance5.4 m, player control range2.6–9 m, pitch−.65..1.25, target offset1.55 m. Horizontal target lag was deliberately removed because it pulled the view through corners; vertical easing is frame-time-based, obstruction shortens the boom promptly and expands it gradually. Contact is checked against canonical nearby obstacles and piecewise planar terrain, with reset on load/teleport.

The recorded reference often keeps the hero low in the frame while the road, forest or architecture occupies the center and upper area. This is worth studying by apparent hero screen height and horizon position, not copying a guessed FOV. Establish a fixed Tervain camera shot with measured viewport and actual standing height; vary camera distance/pitch/target slightly for proposals, keep user manual look responsive and preserve obstruction clearance. A closer camera can enlarge characters but will not fix giant crown plates or missing material structure.

Do not introduce handheld shaking, excessive spring lag, automatic zoom pumping or exaggerated locomotion bob. Those were previous owner complaints. A screenshot-only cinematic camera is not proof the default playable camera is appropriate.

## 13. HUD and interactions: retain actual systems, reduce visual competition

The reference footage frequently lets the world and small object label dominate. Current Tervain has a large persistent objective panel upper left, purse/time/access hints upper right, a gold compass, a central ten-slot hotbar and lower-right health/stamina. The latest native portrait also contains a very prominent noticeboard text plate. That is a presentation difference, not necessarily an invalid system.

`presentation/ui/hud.ts`, `hotbar.ts`, `uiModel.ts`, `src/style.css:1473–1578` are the local controls. Hotbar slots are real item/weapon actions and bindings; they must remain 1–0 and empty on a fresh game. Do not substitute inventory/journal/map icon shortcuts in the center. Inventory drag/drop, keyboard assignment/swap/clear, consumption/equipment, saved bindings and map behavior remain functional.

Propose smaller calmer framing, thinner weathered edges, lower decorative gold contrast and fewer persistent access reminders after the player learns them. Keep text accessible and controller/keyboard focus obvious. A compact optional objective presentation should still convey navigation and objectives; any hide/auto-fade preference is a proposal. Object interaction can use a short restrained world-space name plus a contextual input cue, rather than a huge screen plate, while still avoiding occlusion and unreadable distance labels.

Do not use the reference's recorded absence of a HUD as proof that its native interface is always hidden. Keep the current no-dialogue exploration policy. The gold/Hegemony/Templar vocabulary belongs in original Tervain design; do not redraw the exact Gothic HUD.

## 14. Performance: triangles are necessary accounting, not the image-quality diagnosis

This source inspection did not run a benchmark; no frame rate, minimum specification or GPU capacity claim is made. The recording is not a benchmark of either game, and its motion/compression does not reveal native draw calls, geometry count, shader cost, texture residency, CPU time or shadow passes.

Natural asset20k /NPC 50k limits remain strict, but total frame cost also includes instance population, shaded area, cutout overdraw, shadow pass, reflected scene, skinning, terrain/material samples, MSAA/render pixel count and post passes. High currently renders at device pixel ratio up to2, Medium1.5, Low1; a high-DPI screen can therefore shade4× the CSS pixel count before water/post overhead. Quality policies deliberately retain source-faithful High trees and full resident terrain. Do not silently restore popping/unloading to improve a reported number.

Profile representative gameplay scenes individually: coast water, deepwood crown/ground overlap, village NPC group, lighthouse compound and score menu. Record build/revision, viewport, DPR, preset, device/browser, warmup, route, frame-time median/p95/p99, draw/triangle numbers across all passes and memory/asset loading. Use CPU/GPU timing where supported, state availability instead of inventing values. Split cold loading from warmed movement. Close other expensive game or gallery views during capture so the measurement reflects one active Tervain scene.

Potential efficient improvements include retaining region/material batching for buildings; atlas/texture sharing with correct private lifetimes; tighter conservative bounds; omitting reflected objects genuinely outside reflection frustum; coherent texture-based vegetation detail instead of expensive tiny modeled leaves; and stable ranked ground detail transitions. Any changed visibility must retain silhouettes and continuous appearance while moving/turning. Alpha cards can save geometry and increase fill cost; measure both before making them a universal policy.

## 15. Proposed implementation sequence and measurable gates

### Pass A — one reference-matched playable corridor

Choose the existing shore→sign→woodland bend, keeping location IDs, saves and readable route. Repair one representative broadleaf crown and one grass/herb material; connect floor albedo, understory colonies and plant density; author two/three banks that form foreground/middle/background. Capture the same fixed playable views before/after and one continuous walk/turn. Accept only if it reads like fine inhabited vegetation without silhouette distortion, new contacts or pop.

### Pass B — one original working settlement vignette

Use the existing village/waystation, not a wholesale geographical clone of the reference town. Improve one hall/cottage roof and façade, remove the outlined masonry look, add a coherent entrance/stair/worktable assembly with original props, and place two existing NPCs doing relevant tasks. Preserve complete geometry/support and correct equipment. Review day/night, every side of the building and entry/climb routes. Reuse this kit for later structures once its look is proven.

### Pass C — lighthouse/bay composition

Retain graded route, stable water optics and the shared lighthouse construction measurements. Add original weathering/roof/railing silhouette variation, improve coastal shelf/headland layering and quieter sea palette. Validate the source's 16:03 approach/18:07 elevated viewpoint relationship as inspiration while composing Tervain's own shape. Inspect all steps, deck support, rock landings and saved-player positions.

### Pass D — scene calibration, interface and bounded scaling

After materials/geometry are credible, tune daylight/fog/IBL/grade with fixed captures. Simplify HUD competition without changing item functions. Scale proven kits across coherent habitats and buildings, preserving source budgets / wood authority and paused foliage. Run strict TypeScript, appropriate regression/full suite and production build; verify actual files and warmed native motion. Keep each acceptance category distinct: tests, binary audits, native appearance, hardware cost and live publication.

The key completion test is that a regular walk across the current world carries the same material scale, connected plants, spatial layers and human construction quality—not merely that one staged picture looks vaguely green and medieval.

## 16. Existing boundaries that implementation must preserve

- 0.0.12 and the owner-held 0.0.x stage; no automatic 0.0.13 / 0.1 promotion.
- Original serious PC single-player high fantasy with Hegemony-affiliated Templar traces; no imported Gothic map/characters/UI/lore or Hyperion canon.
- All supplied originals read-only; original custom pine untouched; every other complete tree / stone <20k and NPC ≤50k including hidden equipment.
- Hero native maps, identity, all six clips, calibrated distance-driven movement and resolved collision/support, plus at least two minutes fresh-meter running endurance.
- Static attached gameplay foliage; detached falling leaves and separately authorized menu motions keep existing Reduced Motion behavior.
- Sparse arrival, clear road/sign, graded lighthouse entry, whole-base tree/stone grounding, canonical contacts independent of graphics preset, physical saved positions and gradual visibility continuity.
- Real ten-slot empty-at-start item hotbar, inventory/equipment/pickups, journal/map/save systems; no dialogue window or observation-based quest/trust grant.
- Score-led tree door/wisps and exactly one approved Hegemony banner in the menu; no new song video requested.
- Study-only local reference evidence. The video frames are private analysis pictures, not assets for the shipped game or image-generation input.

## 17. Remote publication is a separate gate

The latest local work remains durable. Required checks were unavailable at the historical checkpoint. Hosting was separately unverified in that snapshot. Do not bypass required checks or alter service triggers to obtain a green release.

Before any push, PR creation/update, merge, dispatch/rerun or trigger edit that can start Actions, the coordinating assistant must inspect the current UTC day's full repository run history across every workflow, actor and branch, including queued/in-progress/completed runs and rerun attempts of older runs. Estimate duplicate push/PR events, downstream workflow_run chains, scheduled/GitHub-generated services and likely runner minutes. Unknown monthly usage stays unknown; do not acquire extra billing access merely to resolve it. Coordinate agents against that snapshot and handle exceptions under current owner approval policy. This audit itself requires no remote mutation.

## Source index for the coordinating report

| Visual domain | Current source | What to change first | What to preserve |
|---|---|---|---|
| Prepared foliage | `tools/build-meshy-trees.py`, `presentation/meshyTrees.ts` | crown-scale/cluster representation, original cutout maps | protected pine, full 20k counts, uniform scale, wood contacts |
| Forest ecology | `world/forestStands.ts`, `presentation/floraPopulation.ts`, `plantedCrowns.ts` | coherent crown/ground/understory relationships | independent seeds, roads, native source silhouettes |
| Grass | `presentation/ground/grass.ts`, `patchMaterial.ts`, `habitat.ts`, `tileStream.ts` | fine textured tufts + continuous matching ground value | rooted geometry, rank fades, bounded streaming |
| Understory | `presentation/forestFloor.ts` | connected fern/litter/moss colonies | actual crown masks and tangent/support checks |
| Topography | `world/layout.ts`, `terrain.ts`, `coast.ts`, `distantCoast.ts` | deliberately composed shelves/banks/troughs | graded paths and canonical support/nav |
| Ground look | `presentation/terrainTextures.ts`, `terrainMaterial.ts`, `groundSplat.ts` | recognizable scaled material content | height blend, rock triplanar, wetness |
| Terrain submission | `presentation/terrainMesh.ts` | existing full-detail resident tile organization | shared normals and no distance unloading |
| Architecture | `presentation/buildings.ts`, `structures.ts`, `roofs.ts`, `buildKit.ts`, `regions.ts` | bespoke assemblies and grouped wear | closed shells, batching, measured entrances |
| Wall textures | `presentation/buildingTextures.ts`, `regions.ts` | irregular rubble/thinner warm mortar | matte light response, correctly scaled maps |
| Use-clutter | `presentation/settlement.ts`, `props.ts`, `physicalProps.ts`, `worldPickups.ts` | original coherent work/doorway vignettes | real interactions/contact/pickup state |
| Sea/coastal depth | `sea.ts`, `seaGeometry.ts`, `waterOptics.ts`, `waterRenderPass.ts`, `coastalBackdrop.ts` | calmer palette and coherent land layers | wave/depth stability, moving reflection cadence |
| Atmosphere | `sky.ts`, `skyState.ts`, `environment.ts`, `grade.ts`, `app.ts` | fixed-scene value/colour calibration | readable nights, separate menu look, stable pipeline |
| People | `meshynpcs.ts`, `npcSurface.ts`, `actors.ts`, `mainHero.ts`, `hero/` | purposeful staging/task direction | latest surface repair, private resources, authored hero clips |
| Camera | `cameraRig.ts`, `cameraObstruction.ts` | measured framing experiments | responsive regular look and stable obstruction |
| UI | `ui/hud.ts`, `ui/hotbar.ts`, `ui/uiModel.ts`, `src/style.css` | quieter visual weight | accessible genuine ten-slot item actions |
