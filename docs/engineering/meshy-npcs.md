# Meshy NPC cast for 0.0.11

A49 records the owner's supplied Meshy models and request to slightly remix/retexture all in-game humanoid NPCs, with **50,000 triangles per NPC** and **20,000 per natural asset**. The request was supplied on 4 October UTC / 5 October 2026 in Belgrade. This selection supersedes the procedural NPC appearance and generic model-sheet texture form within this scope. Legacy `people:sheets` / `people:check` tooling remains available for its original procedural assets; those sheets do not describe these new source UV layouts.

The approved Weathered Wanderer remains the main character, with its separate 65k/100k authority, native animation rig, source PBR maps and stride-calibrated controller. Thornback remains the existing procedural nonhumanoid creature. Faction identities, NPC records, quests, collision/navigation authority, player equipment and save format are unchanged by this asset selection.

## Sources and selection

The [machine-readable provenance](meshy-npc-assets.json) links each of the [17 role assignments](../../tools/meshy-npc-sources.json) to its supplied source hash, preparation receipt and independently measured shipped GLB. Eleven named residents, three ambient roles, two bandits and the menu warden receive private copies of their assigned skinned models. Selected palettes distinguish reused sources while retaining their faces and costumes.

Thirty original GLBs and the two GLBs in the villager animation ZIP were inspected locally. Originals remain read-only in the owner's source location; they are not copied wholesale into this repository. The prepared runtime pack uses 15 distinct originals. The other 15 originals remain explicitly unassigned to this NPC pack, with their geometry, texture/rig readiness and pose cautions recorded. The supplied Rock Pile and Ancient Guardian have separate [rock](rock-pile-assets.json) and [broadleaf tree](broadleaf-assets.json) records under the 20k natural-asset cap; final tree asset and native acceptance belong to that separate preparation and release evidence.

Filename classification alone is unreliable: **Ancient Guardian is a tree**, with 1,890,128 source triangles, and **SHERWOOD LOVE contains two people in one mesh**. Neither is assigned to an ordinary biped. Other unassigned figures hold staffs, a book, a bow or baskets, or wear robes/capes that require explicit prop and cloth treatment before automatic pose normalization. Their source filenames do not establish Tervain characters or lore.

Specific owner-authorized Tervain use is recorded; no general open-content license or independent rights review is asserted. No Gothic or Warcraft game asset was copied into this pack. The local ZIP study produced two safe ordinary unencrypted GLBs, each with 4,021 triangles and 23 joints, containing Walking and Running respectively. Those models and clips remain local references and are **not** shipped or imported into these NPCs.

## Geometry, UV materials and motion

Preparation uniformly fits each selected source to metre-scale height, retains/interpolates its original UV islands during collapse and protects the head, hands and lower hems. The working reduction target is 46k; the actual file cap is 50k. Already small sources retain their geometry apart from degenerate-triangle cleanup. Rest-arm normalization uses the source pose and, for T poses, fitted sleeve centrelines. Close-arm sources retain their original rest form. This is a new adaptation, not a claim that every original was a clean T pose.

A **1024² tangent-space normal bake** transfers detail from the original sculpt to the reduced mesh. A **1536² sRGB albedo bake** applies restrained role palette/weathering and a mild textile overlay through every original UV island, including sides, backs and undersides. Cloth masks limit the adaptation around faces/hands and reduce it on armor. The neutral rough material avoids emissive painted lighting. The pass works in UV space rather than projecting a final screenshot; overlapping source UVs, hidden seams and animated garment deformation still need three-dimensional review.

The [generated textile input](../../tools/assets/tervain-weathered-linen.png) is **1254×1254**, 3,492,125 bytes, SHA-256 `bffc8611c05ca792ff69119aa33a8f034a0eef620a194d6309a220a1846871b6`. OpenAI's builtin `image_gen` generated it as grayscale linen/wool grain; the exact prompt, requested 1024² dimensions and actual dimensions are recorded in the provenance. It is tiled as Non-Color detail before baking, not shipped as a separate runtime texture or used as a replacement figure image. Seamless repeat was requested; the binary audit does not certify repeat quality.

Each runtime GLB receives an original **11-joint Tervain identity-axis biped**: hips, torso, head, two upper arms/elbows and two upper legs/knees. Anatomical rest pivots and matching inverse binds keep the neutral skin unchanged. Smooth anatomical weights drive the existing Tervain walk, work, sit, talk and combat poser. **No authored clips are embedded, invented or retargeted from the supplied ZIP.** Motion quality requires actual pose review; normalized weights and a neutral bind alone do not prove realistic gait, cloth behavior or freedom from clipping.

The existing bandit sword and club, and the shrine warden's sheathed sword, remain attached equipment. Their sockets are fitted to the actual source forearm/hand geometry. The **50k cap applies to the complete actor, including hidden weapon, scabbard and hilt meshes**: sword equipment adds 980 triangles and the club adds 434. These attachments reuse Tervain's original equipment rather than introducing new faction or combat semantics.

Named residents retain **1.55 m/s** route speed. Their measured walk poser uses **0.78** amplitude/speed and a **1.48 m** gait cycle at 1.8 m stature, scaled by actual rig height. Only resolved controller travel advances that cycle, so a blocked resident stops walking. A cached **33–48 sole samples per prepared actor** (64 maximum) apply at most **0.10 m** of visual body clearance after posing, resetting each frame. This does not move the collision root, alter terrain support or perform foot IK; dead/dodge poses are excluded. The approved player controller and native clips remain unchanged.

## Prepared cast

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

The 17 prepared GLBs total **661,984 submitted triangles** and **126,413,612 bytes**. These are per-model file sums, not the game's simultaneous drawn triangles or a performance result. Current assets range from **9,365 to 46,000 triangles**. All selected source GLBs were unrigged; their original geometry can exceed three million triangles. The original archives and workshop `.blend`/bake files remain outside the runtime repository.

With all attached equipment included, the 17 role instances total **664,378 triangles**, with a maximum complete actor of **46,979**. That aggregate includes the menu actor and is not a simultaneous scene workload or framerate measurement.

## Reproduce and inspect

Use the owner-supplied files and tracked fabric input with the installed Blender preparation script. It does not overwrite the supplied originals:

```bash
blender --background --factory-startup --offline-mode --disable-autoexec \
  --python tools/prepare-meshy-npcs.py -- \
  --downloads /path/to/supplied-models --workshop /path/to/workshop \
  --cloth tools/assets/tervain-weathered-linen.png
node tools/check-meshy-npcs.mjs --json /path/to/npc-runtime-audit.json
node --test tools/check-meshy-npcs.test.mjs
```

After `npm run dev`, open the [local rotatable gallery](../../tools/meshy-npcs.html) at `/tools/meshy-npcs.html` to inspect the actual selected GLBs with their Tervain poser. This development route is not a claim of a published gallery, Steam package or final native acceptance.

The independent checker imports neither the preparation script nor game runtime helpers. It parses the shipped GLB buffers, counts every default-scene mesh node and GPU instance including skinned primitives, also caps stored triangles, checks attribute/index ranges and finite values, verifies all 11 bone names/hierarchy/identity axes and neutral inverse-bind transforms, and measures actual weight sums. It reads embedded PNG/JPEG dimensions and verifies the runtime/source receipt hashes against provenance. Unknown GLBs, external images/buffers, oversized textures, authored clips or stale provenance fail the check.

## Evidence and limits

All **17 actual files** pass the 50k geometry and 2048px texture caps, have embedded 1024² normal / 1536² albedo maps and no authored clips. Maximum weight-sum error is **4.47e−8**; maximum neutral-bind matrix error is **5.72e−8**. The two Generic Peasant Woman derivatives each had one collinear triangle removed after float32 serialization; the final actual-file audit reports no zero/near-zero-area triangles across the pack. Eight focused synthetic regressions verify repeated mesh/GPU instances, malformed weights/joint indices/inverse binds, oversized images, external dependencies and truncated accessor bounds.

The recorded runtime CPU audit loads all 17 actual geometries/skins through `GLTFLoader`, creates the production role equipment and samples nine settled poser modes. It confirms the equipment-inclusive counts and finite posed geometry; cached sole samples range from 33 to 48. Image pixels are stubbed for this CPU check, so it does not validate their native rendering. The 60 Hz gait sweep estimates stance travel from source sole movement; it is a calibration aid rather than proof of planted feet or every animation frame. Measured summaries and source hashes are in the machine-readable provenance.

These checks establish file integrity, counts and the stated rig contract. They do not establish full-turn seam quality, every animated pose, native loading/lighting, total texture residency, framerate, collision correctness or successful deployment. The earlier 1,020-test full-suite result predates the final gait/equipment source; final local strict TypeScript, **1,027 tests in 97 files**, production build and bounded native game/gallery review are complete in the [0.0.11 release record](../production/releases/0.0.11.md). Required CI/Pages and served-revision gates remain blocked, with the current user approval policy and conservative Actions run-history/budget preflight intact; no live release is claimed.
