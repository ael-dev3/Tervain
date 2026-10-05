# Meshy NPC cast

## Current 0.0.12 character repair

The owner's character-polish request (A55) rebuilds all **17 supplied NPC derivatives** from the unchanged Meshy originals. The repaired files are installed locally under `public/models/npcs/`; every manifest entry records `surfaceBake: "geometry-only-v1"`. This supersedes the original **0.0.11** geometry/material preparation below while retaining the 17 role assignments, faces and costumes, eleven-joint procedural rig, private per-world resources and complete **50,000-triangle actor cap**. The approved Weathered Wanderer retains its geometry, source PBR maps, six authored clips and calibrated movement. No new image generation, lore, cloth simulation or version promotion is introduced.

The original reduction could fold frontal chin/cheek geometry away, exposing rear surfaces. That is repaired in the source-derived mesh, rather than covering the defect with skin-colored paint. [Character-polish evidence](../art/character-polish-2026-10-05.md), the [current manifest](../../public/models/npcs/manifest.json) and [asset provenance](meshy-npc-assets.json) separate the final derivatives from rejected surface/pigment prototypes and from the historical pack.

### Current preparation and runtime shading

The offline [rebuild tool](../../tools/rebake-meshy-npc-surfaces.py) uniformly scales the supplied original in its original pose, reconnects positional seams within **20 μm**, and uses **inverted Blender Decimate preservation weights** for source head/hand detail. The old non-inverted group preferentially collapsed the protected regions. The working target remains 46k, leaving room for the existing equipment within the complete 50k cap. Degenerate/invalid authoring elements and any float32-collinear export triangles are checked separately. No extra geometric smoothing or invented sculpt detail is applied.

Original source UV data remains attached to surviving source-derived corners as **`TEXCOORD_1`**. An efficiently packed new active atlas is exported as **`TEXCOORD_0`**; both export mappings are checked against authoring loop values. The initial prototype's excessive island spacing used only about 2% of its atlas and was rejected. The final tool uses `.0001` island spacing and records each actual atlas occupancy/triangle texel area, rather than claiming that a successful bake alone establishes coverage.

The frozen original-pose arm fields determine anatomical membership **before** relaxed-rest normalization. That membership is carried into both skin weights and cloth/hand masks, so relaxed arms and long skirt sides are not newly classified from overlapping final positions. Frozen receipt pivots/angles and the established eleven-joint identity-axis skin remain the rig contract; the supplied ZIP's authored Walking/Running clips remain unshipped.

Healthy original sculpt corner normals are spatially transferred onto the repaired low surface. The original high material's **normal-texture input is disconnected** for the new **1024² tangent normal bake**, avoiding inheritance of its backward normal-map samples. The low tangent basis is built for the new atlas; serialized tangent XYZ is orthogonally projected/normalized while preserving Blender's handedness W. Undefined source-normal/tangent corners use actual adjacent source face/edge directions, and untouched normal texels start neutral `(0.5, 0.5, 1)`. This is a geometry/source-surface transfer, not reuse of the old collapsed mesh's stale normals.

The **1536² sRGB albedo** transfers original high paint with the existing mild **0.085 role-palette / 0.055 linen** recipe, with face/neck/hand masks retained and the neck/head adaptation fade lowered to 1.31–1.43 m. The previously approved generated linen input is reused unchanged; no new texture image is generated for this repair. Source originals, frozen before-files, workshop/receipt/fabric inputs and the identity-skin helper have recorded hashes.

Runtime retains the authored basis for `geometry-only-v1` files. The NPC-only material hook applies **0.38 sculpt-normal strength** and a **forward tangent-normal Z floor of 0.65** before XY scaling, preserving composed shader hooks and private material ownership. A zero XY scale alone cannot disable a pathological negative Z; the inspector's true Off comparison removes the normal map. This hook does not alter the approved hero's materials. The gallery's shadow frustum/bias was also corrected after shadow acne falsely resembled facial contour terraces; that inspection-stage fix does not change the game's sun settings.

### Current installed cast

The following values combine the **actual installed manifest files** with the final runtime audit's production role equipment. Bytes refer to each GLB; attached equipment is counted in complete actor triangles.

| Assignment | Source ID | GLB triangles | Complete actor triangles | GLB bytes |
| --- | --- | ---: | ---: | ---: |
| `named:caravan_master` | `1004193211` | 45,996 | 45,996 | 8,397,452 |
| `named:rillford_reeve` | `1003230113` | 45,957 | 45,957 | 11,512,824 |
| `named:spring_steward` | `1004193219` | 10,328 | 10,328 | 4,204,576 |
| `named:quarry_foreman` | `1004193202` | 46,000 | 46,000 | 8,520,012 |
| `named:maintenance_worker` | `1004193246` | 45,994 | 45,994 | 7,999,928 |
| `named:estate_steward` | `1004193030` | 46,000 | 46,000 | 8,090,820 |
| `named:ash_recorder` | `1003211131` | 34,220 | 34,220 | 5,938,408 |
| `named:shrine_warden` | `1004193332` | 46,000 | 46,980 | 8,497,100 |
| `named:mill_hand` | `1004193219` | 10,328 | 10,328 | 4,156,620 |
| `named:quarry_hand` | `1003230046` | 45,965 | 45,965 | 11,608,676 |
| `named:village_baker` | `1004193100` | 45,998 | 45,998 | 8,034,236 |
| `ambient:fisher` | `1004193042` | 46,000 | 46,000 | 9,396,060 |
| `ambient:fireside` | `1003230113` | 45,957 | 45,957 | 11,500,624 |
| `ambient:keeper` | `1004193053` | 9,365 | 9,365 | 4,759,632 |
| `enemy:ford_bandit_a` | `1003194934` | 45,963 | 46,943 | 11,767,292 |
| `enemy:ford_bandit_b` | `1004193146` | 45,999 | 46,433 | 8,374,680 |
| `menu:warden` | `1004193023` | 45,998 | 45,998 | 7,671,612 |

The 17 GLBs total **662,068 model triangles** and **140,430,552 bytes**. Complete role actors, including the existing sword/scabbard/hilt and club attachments, total **664,462 triangles**, with a maximum of **46,980**. Model counts range from **9,365 to 46,000**. These sums include the menu warden; they are file/catalog totals, not simultaneous scene draws, texture residency or a framerate measurement.

The final actual-runtime audit loads every final file through `GLTFLoader`, creates the production equipment at real role scales, checks nine settled poser modes and eight walking phases, and confirms finite posed vertices and private resources/template stability before and after disposal. Cached sole samples now range **33–44** (64 maximum), with the existing bounded visual clearance rather than foot IK or changes to the collision root. Its image decoding is synthetic: this CPU audit cannot certify paint pixels, native lighting, every animation frame, cloth penetration or physical world contacts. Local evidence is `outputs/tervain-character-polish/final-npc-runtime-audit.json` outside the repository; its source/manifest hashes identify the exact audit inputs.

### Reproduce the final repair and inspect

Use the **original frozen workshop and receipt**, the matching **original before-GLB** and unchanged supplied source. The receipt/hash gates intentionally reject substituting an already repaired public GLB as the before-state. The rebuild writes an offline candidate directory and never installs/publishes it or overwrites originals. For Mara, from the repository root:

```bash
blender --background --factory-startup --offline-mode --disable-autoexec \
  --python tools/rebake-meshy-npc-surfaces.py -- \
  --workshop /path/to/original-workshop/rillford-reeve.blend \
  --receipt /path/to/original-workshop/rillford-reeve-receipt.json \
  --source /path/to/supplied-models/Meshy_AI_Medieval_Woman_1003230113_texture.glb \
  --runtime /path/to/frozen-before/rillford-reeve.glb \
  --output /path/to/offline-candidates/rillford-reeve
```

Repeat this stage for the 17 IDs/source assignments in [the source catalog](../../tools/meshy-npc-sources.json), keeping the same frozen tool/helper. The final rebuild script SHA-256 is `28c8e29f4fbe603e3cd93813f9fa384f850a530ec92af7df10812b5a78615fb3`; the reused identity-skin helper's SHA-256 is `9fadb2e86ede67fe1f0714ab0b48a91a88bc8cf9f49bee556308d511c81decae`. Each receipt includes actual candidate bytes/hash/counts, retained UV proof, atlas statistics, input hashes and source-normal transfer/basis diagnostics. Curate accepted candidates into the manifest/provenance only after the separate actual-file and native gates, then validate those installed final files:

```bash
node tools/check-meshy-npcs.mjs --json /path/to/final-npc-file-audit.json
node --test tools/check-meshy-npcs.test.mjs
```

The independent checker reads actual GLB buffers rather than trusting a bake label. It now also requires complete finite source UV1 and a unit orthogonal N/T basis for repaired files. **Twelve independent synthetic regressions** cover instance counts, malformed weights/joints/binds, actual image dimensions, external/truncated resources and invalid/missing basis/secondary-UV or unknown surface contracts.

After `npm run dev`, `/tools/meshy-npcs.html` provides front/side/rear and closer upper-body views, runtime/source/moderate/Off sculpt comparisons, lighting-free albedo inspection, paused surface picking and the real NPC poser. These controls aid local review; they are not live deployment or full-game acceptance evidence. Bounded native Mara front/side/rear inspection accepted intact face paint/shape. A longer Walk review exposed knee imprinting in the continuous skirt. The final private Mara/fireside fit preserves original hip/thigh/knee totals and smoothly broadens left/right cloth sharing while retaining boot tips/upper body. A hip-heavy prototype was rejected for seated deformation; the corrected field preserves the original settled-sit pose, and a connected-shell regression reduces worst hem-edge stretch by over 45% across eight walk phases. Geometry clone metadata is detached so the fit cannot mark cached templates. This is not simulated cloth; final native moving-garment evidence is in the character record. Independent all-cast source/head-depth and actual-binary audits provide additional bounded evidence. Full cloth behavior, every animation/collision combination, all seams, hardware performance and CI/Pages/served-revision acceptance remain distinct gates in [the current release record](../production/releases/0.0.12.md). No live release is claimed here.

## Historical 0.0.11 preparation and evidence

The remainder records the original selected pack, its original counts and its then-current verification. It is retained for provenance and before/after comparison; its reduction/bake description, table, sole range and test totals do **not** describe the installed repaired 0.0.12 binaries.

A49 records the owner's supplied Meshy models and request to slightly remix/retexture all in-game humanoid NPCs, with **50,000 triangles per NPC** and **20,000 per natural asset**. The request was supplied on 4 October UTC / 5 October 2026 in Belgrade. This selection supersedes the procedural NPC appearance and generic model-sheet texture form within this scope. Legacy `people:sheets` / `people:check` tooling remains available for its original procedural assets; those sheets do not describe these new source UV layouts.

The approved Weathered Wanderer remains the main character, with its separate 65k/100k authority, native animation rig, source PBR maps and stride-calibrated controller. Thornback remains the existing procedural nonhumanoid creature. Faction identities, NPC records, quests, collision/navigation authority, player equipment and save format are unchanged by this asset selection.

### Sources and selection

The [machine-readable provenance](meshy-npc-assets.json) links each of the [17 role assignments](../../tools/meshy-npc-sources.json) to its supplied source hash, preparation receipt and independently measured shipped GLB. Eleven named residents, three ambient roles, two bandits and the menu warden receive private copies of their assigned skinned models. Selected palettes distinguish reused sources while retaining their faces and costumes.

Thirty original GLBs and the two GLBs in the villager animation ZIP were inspected locally. Originals remain read-only in the owner's source location; they are not copied wholesale into this repository. The prepared runtime pack uses 15 distinct originals. The other 15 originals remain explicitly unassigned to this NPC pack, with their geometry, texture/rig readiness and pose cautions recorded. The supplied Rock Pile and Ancient Guardian have separate [rock](rock-pile-assets.json) and [broadleaf tree](broadleaf-assets.json) records under the 20k natural-asset cap; final tree asset and native acceptance belong to that separate preparation and release evidence.

Filename classification alone is unreliable: **Ancient Guardian is a tree**, with 1,890,128 source triangles, and **SHERWOOD LOVE contains two people in one mesh**. Neither is assigned to an ordinary biped. Other unassigned figures hold staffs, a book, a bow or baskets, or wear robes/capes that require explicit prop and cloth treatment before automatic pose normalization. Their source filenames do not establish Tervain characters or lore.

Specific owner-authorized Tervain use is recorded; no general open-content license or independent rights review is asserted. No Gothic or Warcraft game asset was copied into this pack. The local ZIP study produced two safe ordinary unencrypted GLBs, each with 4,021 triangles and 23 joints, containing Walking and Running respectively. Those models and clips remain local references and are **not** shipped or imported into these NPCs.

### Original geometry, UV materials and motion

The original preparation uniformly fitted each selected source to metre-scale height and retained/interpolated its original UV islands during collapse. Its head/hand/hem group was intended to protect detail; the 0.0.12 repair above corrects its Decimate direction and the resulting source-face loss. The working reduction target is 46k; the actual file cap is 50k. Already small sources retain their geometry apart from degenerate-triangle cleanup. Rest-arm normalization uses the source pose and, for T poses, fitted sleeve centrelines. Close-arm sources retain their original rest form. This is a new adaptation, not a claim that every original was a clean T pose.

A **1024² tangent-space normal bake** transfers detail from the original sculpt to the reduced mesh. A **1536² sRGB albedo bake** applies restrained role palette/weathering and a mild textile overlay through every original UV island, including sides, backs and undersides. Cloth masks limit the adaptation around faces/hands and reduce it on armor. The neutral rough material avoids emissive painted lighting. The pass works in UV space rather than projecting a final screenshot; overlapping source UVs, hidden seams and animated garment deformation still need three-dimensional review.

The [generated textile input](../../tools/assets/tervain-weathered-linen.png) is **1254×1254**, 3,492,125 bytes, SHA-256 `bffc8611c05ca792ff69119aa33a8f034a0eef620a194d6309a220a1846871b6`. OpenAI's builtin `image_gen` generated it as grayscale linen/wool grain; the exact prompt, requested 1024² dimensions and actual dimensions are recorded in the provenance. It is tiled as Non-Color detail before baking, not shipped as a separate runtime texture or used as a replacement figure image. Seamless repeat was requested; the binary audit does not certify repeat quality.

Each runtime GLB receives an original **11-joint Tervain identity-axis biped**: hips, torso, head, two upper arms/elbows and two upper legs/knees. Anatomical rest pivots and matching inverse binds keep the neutral skin unchanged. Smooth anatomical weights drive the existing Tervain walk, work, sit, talk and combat poser. **No authored clips are embedded, invented or retargeted from the supplied ZIP.** Motion quality requires actual pose review; normalized weights and a neutral bind alone do not prove realistic gait, cloth behavior or freedom from clipping.

The existing bandit sword and club, and the shrine warden's sheathed sword, remain attached equipment. Their sockets are fitted to the actual source forearm/hand geometry. The **50k cap applies to the complete actor, including hidden weapon, scabbard and hilt meshes**: sword equipment adds 980 triangles and the club adds 434. These attachments reuse Tervain's original equipment rather than introducing new faction or combat semantics.

Named residents retain **1.55 m/s** route speed. Their measured walk poser uses **0.78** amplitude/speed and a **1.48 m** gait cycle at 1.8 m stature, scaled by actual rig height. Only resolved controller travel advances that cycle, so a blocked resident stops walking. A cached **33–48 sole samples per prepared actor** (64 maximum) apply at most **0.10 m** of visual body clearance after posing, resetting each frame. This does not move the collision root, alter terrain support or perform foot IK; dead/dodge poses are excluded. The approved player controller and native clips remain unchanged.

### Original prepared cast

| Assignment | Source ID | GLB triangles | Complete actor triangles |
| --- | --- | ---: | ---: |
| `named:caravan_master` | `1004193211` | 45,997 | 45,997 |
| `named:rillford_reeve` | `1003230113` | 45,919 | 45,919 |
| `named:spring_steward` | `1004193219` | 10,328 | 10,328 |
| `named:quarry_foreman` | `1004193202` | 46,000 | 46,000 |
| `named:maintenance_worker` | `1004193246` | 45,992 | 45,992 |
| `named:estate_steward` | `1004193030` | 46,000 | 46,000 |
| `named:ash_recorder` | `1003211131` | 34,220 | 34,220 |
| `named:shrine_warden` | `1004193332` | 45,999 | 46,979 |
| `named:mill_hand` | `1004193219` | 10,328 | 10,328 |
| `named:quarry_hand` | `1003230046` | 45,959 | 45,959 |
| `named:village_baker` | `1004193100` | 45,998 | 45,998 |
| `ambient:fisher` | `1004193042` | 45,999 | 45,999 |
| `ambient:fireside` | `1003230113` | 45,919 | 45,919 |
| `ambient:keeper` | `1004193053` | 9,365 | 9,365 |
| `enemy:ford_bandit_a` | `1003194934` | 45,963 | 46,943 |
| `enemy:ford_bandit_b` | `1004193146` | 46,000 | 46,434 |
| `menu:warden` | `1004193023` | 45,998 | 45,998 |

The 17 prepared GLBs total **661,984 submitted triangles** and **126,413,612 bytes**. These are per-model file sums, not the game's simultaneous drawn triangles or a performance result. Those original assets ranged from **9,365 to 46,000 triangles**. All selected source GLBs were unrigged; their original geometry can exceed three million triangles. The original archives and workshop `.blend`/bake files remain outside the runtime repository.

With all attached equipment included, the 17 role instances total **664,378 triangles**, with a maximum complete actor of **46,979**. That aggregate includes the menu actor and is not a simultaneous scene workload or framerate measurement.

### Historical preparation command and inspection

This command reproduces the old staging preparation, not the repaired installed pack. Use an explicit separate output to keep its before-files/workshop receipts frozen for the current rebuild stage above. It does not overwrite supplied originals:

```bash
blender --background --factory-startup --offline-mode --disable-autoexec \
  --python tools/prepare-meshy-npcs.py -- \
  --downloads /path/to/supplied-models --workshop /path/to/workshop \
  --cloth tools/assets/tervain-weathered-linen.png \
  --output /path/to/original-before-staging
```

After `npm run dev`, open the [local rotatable gallery](../../tools/meshy-npcs.html) at `/tools/meshy-npcs.html` to inspect the actual selected GLBs with their Tervain poser. This development route is not a claim of a published gallery, Steam package or final native acceptance.

The independent checker imports neither the preparation script nor game runtime helpers. It parses the shipped GLB buffers, counts every default-scene mesh node and GPU instance including skinned primitives, also caps stored triangles, checks attribute/index ranges and finite values, verifies all 11 bone names/hierarchy/identity axes and neutral inverse-bind transforms, and measures actual weight sums. It reads embedded PNG/JPEG dimensions and verifies the runtime/source receipt hashes against provenance. Unknown GLBs, external images/buffers, oversized textures, authored clips or stale provenance fail the check.

### Original evidence and limits

All **17 actual files** pass the 50k geometry and 2048px texture caps, have embedded 1024² normal / 1536² albedo maps and no authored clips. Maximum weight-sum error is **4.47e−8**; maximum neutral-bind matrix error is **5.72e−8**. The two Generic Peasant Woman derivatives each had one collinear triangle removed after float32 serialization; the final actual-file audit reports no zero/near-zero-area triangles across the pack. Eight focused synthetic regressions verify repeated mesh/GPU instances, malformed weights/joint indices/inverse binds, oversized images, external dependencies and truncated accessor bounds.

The recorded runtime CPU audit loads all 17 actual geometries/skins through `GLTFLoader`, creates the production role equipment and samples nine settled poser modes. It confirms the equipment-inclusive counts and finite posed geometry; cached sole samples range from 33 to 48. Image pixels are stubbed for this CPU check, so it does not validate their native rendering. The 60 Hz gait sweep estimates stance travel from source sole movement; it is a calibration aid rather than proof of planted feet or every animation frame. Measured summaries and source hashes are in the machine-readable provenance.

These checks establish file integrity, counts and the stated rig contract. They do not establish full-turn seam quality, every animated pose, native loading/lighting, total texture residency, framerate, collision correctness or successful deployment. The earlier 1,020-test full-suite result predates the final gait/equipment source; final local strict TypeScript, **1,027 tests in 97 files**, production build and bounded native game/gallery review are complete in the [0.0.11 release record](../production/releases/0.0.11.md). Required CI/Pages and served-revision gates remain blocked, with the current user approval policy and conservative Actions run-history/budget preflight intact; no live release is claimed.
