# Character surface and motion repair, 5 October 2026

Owner request: improve the choppy characters shown beside Mara Venn. This is a
same-version `0.0.12` follow-up. Before-source is runtime `88cf6678` and its
documentation checkpoint `7ca12747`. The screenshot is visual evidence, not
an instruction to change the hero identity, triangle budgets or world lore.

## Diagnosis and acceptance boundary

The prepared NPCs retained source sculpt normals after very aggressive mesh
reduction. On Mara, the old low mesh had 45,919 triangles; the supplied original
had 1,010,718. Independent sampling measured backward tangent-normal Z on
13.22% of prepared surface area. The hero's approved normal maps had no backward
Z samples in the bounded audit; its geometry, textures and six clips are retained.

Lighting-free native inspection proved that the visible dark triangles were not
solely a lighting problem. A smooth-normal-only pass and two pigment-recovery
prototypes failed the close-up gate. The same-UV prototype removed all 195
previously counted recoverable center misses while the actual chin still looked
broken: those numerical coverage counts were insufficient visual acceptance.

Actual paused native surface picking identified chin triangle 20253 at bind
position (-0.023131, 1.555099, -0.036030). Independent rest-pose rays at
(0, 1.56) hit original front skin at z=0.126211 and prepared rear geometry at
z=-0.036288: 162.5 mm of lost front coverage. There was no simple open boundary
loop to fill. This called for source-derived reduction repair, not filling an
arbitrary hole or painting the rear-facing patch skin-colored.

Empirical source-connected reduction probes isolated the actual protection error:
Blender Decimate was applying the old face/hand preservation group in reverse.
The corrected inverted group moved the center-chin depth error from 159.7 mm
to 0.384 mm at the same approximate 46k target; the sampled cheek/chin points
improved to roughly 0.3 mm. These initial probes identified the reduction error; final-source coverage and native checks are recorded below.

The approved implementation scope permits rebuilding the supplied NPC
derivatives from untouched originals, retaining source UVs as a secondary set
if a clean active atlas is needed. The complete actor cap still includes hidden
equipment and remains 50,000 triangles. No Gothic/Warcraft asset or reference
image is imported. The originals, approved hero and protected Pine stay unchanged.

## Motion

Humanoid enemies now advance gait from collision-resolved metres instead of
rescaling a lifetime clock when switching between chase and return. Blocked
feet stop while idle breathing/head motion continue on the idle clock. Turning
uses a time-based equivalent of the established 60 Hz response. Combat timing,
reach/damage and the nonhumanoid Thornback poser are retained. Named residents
and the hero already use resolved-distance cadence; their calibrated speeds
are preserved.

## Final source-derived assets

All 17 derivatives are rebuilt from the 15 unchanged assigned originals. Source
seams are reconnected within 20 μm and face/hand protection uses the corrected
inverted reduction group. Original-pose arm membership is carried through rest
normalization into skin and fabric masks. No extra geometric smoothing is used.

Source UVs survive as `TEXCOORD_1`; the new active atlas is `TEXCOORD_0`.
An early `.008` packing margin starved Mara's atlas to about 2% occupancy and
was rejected. Final `.0001` spacing gives Mara 53.16% occupied area. The 1536²
albedo transfers source paint with the retained mild role/linen adaptation,
excluding facial skin. The previously generated linen input is unchanged;
there is no new image-generation step.

Original source corner normals are transferred to the repaired low mesh. Source
normal-texture input is disconnected for the 1024² geometry-only normal bake.
The exported N/T basis is normalized and orthogonalized with Blender's original
W handedness retained. `surfaceBake: geometry-only-v1` preserves that authored
basis on private runtime clones. Legacy unflagged templates use the separate
angle-weighted repair path, which retains positions/indices/UVs/weights.

Raw final Mara normal pixels still include about 10.05% area-weighted backward
Z samples, so NPC shading retains a forward tangent-Z floor of 0.65 before
0.38 XY strength. This is a safety condition, not a claim of flawless source
normal maps. Shader hooks/cache keys compose; hero materials are unaffected.

The gallery itself had shadow acne from a 500 m/default depth frustum and
zero bias, falsely suggesting facial terraces. A person-sized 0.1–16 m shadow
range, -0.0001 bias and 0.015 normal bias repair the inspection stage. Game sun
settings are unchanged. That issue is distinct from the genuine collapsed chin.

## Independent final checks

The 17 installed files are byte-identical to independently audited candidates.
All 15 unique originals match hashes captured before rebuilding. Actual binary
checks cover counts, embedded maps, UV0/UV1, eleven-joint hierarchy/neutral bind,
normalized weights, finite positions and a unit orthogonal tangent basis. The
new bake flag cannot substitute for valid serialized attributes or provenance.
Twelve synthetic checker regressions pass.

Current model totals are **662,068 triangles /140,430,552 bytes**. Complete
actors including hidden equipment total **664,462 triangles**, with a maximum
of **46,980**, within the complete 50k cap. Model counts are 9,365–46,000.
These are file/catalog totals, not simultaneous scene submission or residency.

The independent final Mara 256px four-view central-head comparison measures
front loss 0.110%, right 0.126%, back 0.017%, left 0.071%; the previous central
chin component is gone. All 17 also have 128px four-view crops. They exclude
outer hair/helmets, full bodies and animation. Fisher is a numerical outlier
(right 1.545%, rear 0.771%, left 1.516%); its side/rear and full-side Walk were
reviewed natively. Neither these crops nor five picked depth probes certify
an entire cast's surface, every pose or all texture seams.

Actual GLTF geometry/skin and production equipment/poser pass the all-cast CPU
audit: 289 poses /11,978,166 posed vertices, finite positions, 33–44 cached
sole samples, unchanged physical roots, private resources and template/disposal
ownership. Neutral one-pixel image decoding is used only for this numerical
audit; it cannot certify paint, shaders, lighting, cloth penetration or world
contacts. Asset/manifest/runtime fingerprints were stable during the check.

Local durable evidence under the workspace:

- `outputs/tervain-character-polish/rebake/final-cast/batch-progress.json`
- `outputs/tervain-character-polish/final-npc-file-audit.json`
- `outputs/tervain-character-polish/final-npc-runtime-audit.json`
- `outputs/character-surface-review/final-cast-independent-binary-audit.json`
- `outputs/character-surface-review/installed-final-cast-consistency.json`
- `outputs/character-surface-review/final-cast-independent-head-crops.json`

Rebuild inputs/receipts and current counts are tracked in
[the asset provenance](../engineering/meshy-npc-assets.json); commands and
historical pack counts are in [the NPC engineering record](../engineering/meshy-npcs.md).

## Native and combined acceptance

The final assets passed bounded desktop-gallery review: Mara front/side/rear
face paint and shape, Fisher side/rear/forearm and walking, armored shrine
warden, caravan master and low-poly keeper working. A longer Mara walking
review exposed pointed long-skirt deformation at the widest stride. A hip-heavy
prototype improved gait but regressed sitting and was rejected. The accepted
private Mara/fireside fit preserves each vertex's original hip/thigh/knee totals
and smoothly broadens paired left/right cloth influence; soles/boot tips and
upper body stay unchanged. A focused connected-shell regression measures over
45% lower worst hem-edge stretch across eight walk phases and exact settled-sit
agreement within 1 μm, with unchanged neutral bind/position/UVs/basis and gait
joints. The independent actual Mara mesh check measures 0.048 μm maximum seated
pose difference and preserves all 274 vertices at y ≤0.095 m exactly. Some upper
boot cuffs receive paired sharing and were included in the native side review.
It also caught and repaired Three's shared geometry `userData` clone metadata.
Both Mara/fireside fit 11,785 private vertices each; full-cast ownership snapshots
now include geometry metadata. This is a skin-weight fit, not cloth simulation
or every-frame proof.

Strict TypeScript and the first combined final-asset suite passed **1,155 tests
in 117 files (71.48 s)** at source 8096396e. The later garment-source default
parallel suite had 1,160 passing tests and one unchanged forest integration test
time out at 5 seconds under simultaneous native previews. The isolated 13-test
forest file passes (8.03 s). Final `npm test -- --maxWorkers=4` passes **1,161 tests /117 files (53.67 s)**
with unchanged assertions and timeout. Final strict TypeScript passes. Runtime
**67788fa1** is locally committed; its production build passes **4.98 s**, with
the existing large-chunk advisory. The native game F3 verifies 0.0.12 /67788fa1
at High, 1422×800 CSS, DPR 1.8 and ordinary FOV 60°. Both the approved hero and
repaired Mara load together in Rillford under actual gameplay lighting, with
intact face/costume and the real talking pose. Final Mara side/rear Walk and
Sitting and fireside Walk are reviewed in the native gallery; the paired fit
removes the large knee imprint while preserving the seated pose and ordinary
boot/cuff motion. The source costume remains rough/stylized. Neither the
gallery nor the bounded High scene certifies every pose, all seams, clip-free
cloth, a framerate gain or minimum-PC performance.

Fresh captured final-game warning/error logs are empty. Final-source diff
retains hero files, Pine/tree files, gameplay/world support/save modules, version
metadata and Actions configuration. Required CI/hosting remain separate
preserved publication gates; no remote mutation is initiated.

Final native evidence includes `final-game-stamp.txt`, `final-game-stamp.jpg`,
`final-game-character-portrait.jpg`, `final-mara-front.jpg`,
`final-mara-paired-skirt-walk-side.jpg`, `final-mara-paired-skirt-walk-rear.jpg`,
`final-mara-paired-skirt-sit.jpg` and `final-fireside-paired-skirt-walk.jpg`
under `outputs/tervain-character-polish/`. Earlier hip-heavy/skirt snapshots
and unstamped prototypes are history, not the accepted garment source. All
preview results are local; required CI and approved hosting are still blocked
as preserved in the [release record](../production/releases/0.0.12.md#publication).
