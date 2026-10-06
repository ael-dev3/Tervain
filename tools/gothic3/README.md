# Native Gothic 3 asset preparation

These standalone Python tools prepare the separate `/gothic3/` browser study.
They do not run Gothic 3 or alter its installation or the completed desktop study.
They are not part of the Tervain game runtime.

For the complete data-to-TypeScript-to-browser workflow, see the
[rebuilding overview](../../docs/engineering/gothic3-rebuild-overview.md).

```powershell
python tools/gothic3/prepare_ardea.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --rimy "C:\path\to\Rimy3D.exe" --scratch "C:\outside-the-study\ardea-preparation"
```

Python 3.10+, Pillow with DDS support, and Rimy3D are required. The study must contain
the physically extracted `02_Unpacked_Data/Archives` files and its verified
`_metadata/effective_layers.json` index. Rimy3D is an asset converter; the game
executable is never called. The generated asset folder is `public/gothic3/`.
Only this folder and the explicitly supplied scratch folder are written.

## Source and license

The preparation scripts have the GPL-3.0-only SPDX identifier. Their binary format
references are [g3dit](https://github.com/georgeto/g3dit) at commit
`30113b8254d3e6d0395d8e3c78618a99fbc0a6ca` and
[Baltram's rmtools](https://github.com/Baltram/rmtools) at commit
`5525421bf4b22636259bdc0d250ee96a5abcae66`, both GPL-3.0. The accompanying
`LICENSE-GPL-3.0.txt` covers these tools. The separately authored browser runtime
does not import or bundle them.

Game meshes, texture pixels, names, and recorded placements originate from the
local Gothic 3 installation. They have no asserted open license; the preparation
tool's license does not license the game's assets. `source-manifest.json` records
the input archive, corrected archive path, source SHA-256, generated SHA-256,
bytes, selected world layers, and current omissions. It contains portable asset
and source references, not machine-specific desktop paths.

## Coordinates and resource choices

- Source coordinates are centimetres, with Y up. Browser coordinates are metres:
  `[(X-92000)/100, (Y-5200)/100, -(Z+12000)/100]`.
- Static mesh positions, normals, faces, and UVs are decoded directly from native
  `.xcmsh` streams. Z reflection reverses face winding. Entity matrices are
  reflected on both sides and decomposed into position, quaternion, and scale.
- Native static entities near Ardea are read from
  `G3_World_Lowpoly_01_Levelmesh_01_Spat.node`. Their full-detail family resources
  are selected when present. Every entry records `sourceResource` and
  `selectedResource`; these are a stated resource choice at a recorded family
  placement, not a newly invented village layout.
- Furniture and props use the patch-winning Ardea city/outdoor `.node` records.
- Terrain is six original Myrtana landscape LOD cells, retaining their original
  world-space vertex positions. Legacy landscape `.node` references to generated
  GUID-named full-detail terrain resources do not resolve to independent files
  in the installed archive index. No replacement terrain is procedurally drawn.
- Each NPC uses the body and head slots from its exact Ardea `.lrentdat` entity,
  with the recorded material switch. Child body/head entity records are not
  duplicated as additional NPCs. Both original NPC layers are included as source
  exhibits; original quest-controlled activation is not reproduced.
- Diego, Milten, Gorn, Lester, Jack, Hamlar and Jack's coastal bandits
  `Ardea_OutNovice_01`, `Ardea_OutNovice_02` and `Ardea_OutNovice_03` use their exact body/head
  slots and recorded world transforms from the patch-winning `SysDyn` layer.
  They are source exhibits; the original quest-controlled activation is unknown
  in this browser runtime. Matching GUIDs are included only once.
- The arrival position is the `PC_Hero` entity in that same winning `SysDyn`
  layer. Its source GUID, matrix, byte offset and file SHA-256 are recorded in
  `spawnSource`. The initial browser view follows the reflected entity's local
  -Z axis toward Ardea. This is an explicit camera choice, not a recovery of the
  original game camera controller.
- The Nameless Hero body/head is an inspector-only exhibit. Its `[0,0,0]` exhibit
  position does not assert a native world placement.

## Current fidelity limits

The static `prepare_ardea.py` path produces native geometry and source placements.
Combat, NPC AI, quests, physics, save games, music, speech, face animation,
SpeedTree wind, and native shaders require their corresponding runtime systems.
The separate animated Hero export below supplies native skin and motion data.
The static NPC geometry remains the original bind pose. Hair, beards, and equipment attachments
need the original skeleton/bone attachment transforms and are currently omitted.
The converter selects the FXA payload containing the most source triangles;
this avoids Rimy3D's default first-payload choice for actors with several LODs.

Textures use native DXT pixels. Opaque textures become JPEG quality 92 with no
resizing; textures with alpha become PNG. Native XIMG mip levels are stored
smallest first; the full-resolution level is read at `imagePayloadEnd -
fullMipBytes`. The native reader offsets and dimensions are recorded in
`textureSelections`. Only one diffuse sampler per material
is rendered by this first static OBJ path. Multiple samplers, terrain blends, original lighting, normal maps,
and specular graphs need further runtime work and are recorded in the manifest.
Sampler `SwitchRepeat` is decoded from each native material; zero-based actor
switches select from contiguous `S1..Sn` images using its Repeat, Clamp or PingPong
mode. `materialSelections` records the source sampler, mode, available range and
selected image. A material's exact shader graph is still not evaluated.
Each model/world entry also records native `BlendMode` and the raw byte
`MaskReference` for its named materials. A texture's alpha channel alone does not
establish that the original material used masking or transparency.

The later `export_terrain.py` path preserves and evaluates landscape graphs in
the separate terrain runtime. It does not change these static actor/prop limits.
Legacy material entries use a uint16 byte length followed by inline bytes;
`00 00` is an empty string. GENOMFLE material entries instead use a uint16 string
table index. The parser keeps these cases distinct and rejects decoding failures
in recognized shader/sampler classes, so an empty fallback material cannot silently
remove a shader's cutout metadata.
Rimy3D changes material-name spaces and tabs to underscores when writing OBJ/MTL.
When an exact native filename is absent, material lookup accepts only a unique
name generated by this documented conversion rule. The original native name is
retained in `materialSelections`.

## Native Hero skin and motion export

The animated path requires Python 3.10+ and its standard library. It reads the
same verified study and reuses the existing Hero diffuse images and native
material metadata. It does not require Rimy3D or Pillow and writes only
`public/gothic3/animated/`.

```powershell
python tools/gothic3/export_animated.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/audit_animated.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/research_native_motion.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

- `read_xact_skin.py` decodes the original `GENOMFLE` actor/motion envelopes and
  exact FXA/LMA chunk boundaries. It preserves node names and parents, local
  position/quaternion/scale-orientation/scale/shear, original vertex mapping,
  every skin influence, materials, pose defaults, timed PRS keys and frame effects.
- `native_animation_math.py` converts native centimetres to metres and reflects
  Z. The quaternion is `normalize([-x,-y,z,w])`. Native row-matrix transposition
  cancels rmtools' raw-quaternion conjugation; inverting it again is incorrect.
- The original `eCWrapper_emfx2Actor::CleanUpHierachy` routine removes child helper
  names containing `_ROOT` or `_END` with at least three underscore-separated
  words. The export composes the removed helper into each promoted child.
  `Hero_ROOT` has two words and remains. Engine actor loading calls this cleanup;
  source entries and SHA-256 references appear in the manifest.
- Body and head share 73 cleaned named nodes, after checking their common parent
  and bind transforms. Each part keeps its own inverse bind matrices. The maximum
  resulting weighted rest-pose difference is below 0.42 micrometres. Native
  scales within `1e-5` of one are canonicalized to unit; the original scales,
  scale orientations and zero shear remain in the raw JSON. General non-unit
  scale or shear currently produces an explicit export error.
- `hero.glb` contains the original body (6,082 triangles) and head (4,610), 6,630
  UV-split vertices, native normals and UVs, plus 11 exact source clips: three
  idle loops, walk, run, fist attack raise/hit/recover, and power attack
  raise/hit/recover. Their original filenames identify the animations. Attack
  phases are distinct clips; no replacement or merged animation is generated.
- Body vertices have up to 17 influences and head vertices up to five. The GLB
  retains all of them in five and two `JOINTS_n`/`WEIGHTS_n` sets respectively.
  Three's default four-weight shader is insufficient. `_G3_WEIGHTS_0` is a
  separate-buffer copy because GLTFLoader normalizes the first weight set alone.
  The runtime must restore that untouched copy and use every declared set.
- Native UVs are preserved. Both Direct3D and [glTF 2.0 texture data](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#images)
  address the image's upper left; GLTFLoader uses `texture.flipY = false`.
- The original `SkeletalMotionInstance` uses a part's native pose when a P, R
  or S channel has no keys. The export preserves that fallback. These XMOT
  files' serialized bind-pose fields contain non-unit near-zero/pointer-like
  values and are retained for evidence, never used for skin inverse binds.
- Native quaternion tracks use component-linear interpolation of compressed
  values. Standard glTF `LINEAR` quaternion playback uses slerp. This difference
  is recorded explicitly for portable GLB playback. The separately authored
  `src/gothic3/native-motion.ts` reads `hero-native.json` and reproduces the
  original signed-short packing, shortest-sign component interpolation and
  final motion-layer normalization. Native key endpoints and fallback poses
  are preserved. Unmatched authoring or other-actor motion
  parts are recorded and retained, without creating nonexistent Hero bones.

`manifest.json` lists portable asset URLs, per-part counts and skin attribute
sets, exact clip roles/phases/durations, original input hashes, reused static
dependency hashes, coordinate conventions, primary format references and local
Engine.dll evidence. `hero-native.json` keeps the full original actor hierarchy,
skin rows, source offsets, cleaned rig and motion parts/tracks. `audit.json` is
an independent receipt binding those files to the manifest SHA. It re-decodes
the actual original files and checks every GLB vertex, native skin influence,
triangle, matched motion key/default, distinct backup view and external image
receipt. It also compares all 5,519 original model vertices with the existing
independent Rimy3D static OBJ conversion. It does not run a game or fixture suite.

`research_native_motion.py` also writes `native-motion-evidence.json`: the exact
original Engine.dll SHA, PE-section offsets and bytes for the `32767` packing
and reciprocal constants, relevant analyzed instruction ranges, source-file
hashes, adapter hash, and the compressed-key digest derived from the real motion
files. The native constructor installs the quaternion-specific interpolator;
its negative-dot rule matters for four key intervals in these attack clips.
The final layer blend explicitly normalizes the sampled quaternion before
writing the node matrix. Pose fallback quaternions may be slightly non-unit;
the same normalization applies to them. The TypeScript player implements one
full-weight clip and inspector repetition. It rounds documented stored steps
to float32; it does not emulate x87 instructions bit for bit or reproduce the
original layer masks, additive blends, fades, root repositioning and effect
dispatch. Those systems remain separate reconstruction work.

This export supplies the initial native animated Hero asset path. The source-
checked Diego conversion below reuses its audited clips; other actor rigs,
attachment binding, expression/face motion, native animation selection and
blending, combat timing and world gameplay remain separate reconstruction work.

## Diego source actor with mapped Hero motions

The Diego exporter uses the patch-winning body XACT and animated head XACT from
the local installation. It checks both file hashes and sizes against
`public/gothic3/source-manifest.json`, then checks the source Hero motion JSON
against its receipt and independent `audit.json` before reusing those clips.
The selected XACT files must be extracted locally; no installed files are
modified. Supply their paths explicitly:

```powershell
python tools/gothic3/export_diego_animated.py `
  --body-xact "<extracted G3_Hero_Body_RebBanditMed.xact>" `
  --head-xact "<extracted G3_Head_Hero_Diego_Animated_01.xact>"
```

The result is written to `public/gothic3/animated/diego.glb` and
`diego-native.json`, with output hashes and source identities in the animated
manifest. Only motion parts whose names exist in both the Diego model and the
audited Hero rig are mapped to runtime bones. Diego's output receipt is labeled
`source-checked-conversion`; it is not an independent Diego audit. The browser
uses these compatible Hero clips for Diego's idle and model inspection. Native
NPC schedule-driven clip selection, attachments, face motion and combat remain
unimplemented. See [checkpoint 59](../../docs/engineering/gothic3-rebuilding-process.md#59-convert-and-connect-diegos-source-skinned-actor).

## Gameplay catalogs, properties and initialization

The gameplay compiler verifies the winning archive bytes and recovers all
641 quest definitions, 4,381 info records, 35,114 localization keys in five
languages, native command registrations, world entities and template properties.
It requires the completed study's decompiled code/assembly as well as the archive
index. Compilation does not execute these commands or make quests playable.

```powershell
python tools/gothic3/export_gameplay.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --raw-output "C:\outside-the-repository\gothic3-gameplay-raw"
python tools/gothic3/assemble_initial_player.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --raw "C:\outside-the-repository\gothic3-gameplay-raw"
python tools/gothic3/repack_gameplay.py --refresh-receipts-only
```

The full decoded audits occupy several gigabytes and must remain outside the
repository. The hosted representation keeps decoded values, source identifiers
and explicit unknown-property markers, using lazy gzip chunks capped at 4 MiB
decoded. World entity chunks contain at most 256 entities; lookup indices are
also chunked. Receipts cover both compressed and decoded bytes. The source audit
and native behavior evidence are under `assets/gothic3/gameplay/`.

`assemble_initial_player.py` combines the serialized Hero and uniquely resolved
templates with the verified native startup setters and ordered inventory calls.
It writes `initial/initialized-player.json` and `initial/world-clock.json`.
Unsupported callbacks, unresolved creation defaults and community enum labels
remain explicit. These records do not mean the browser executes a native new game.

`repack_gameplay.py` can repair specifically supported failed sources and repack
a previous raw export. `bound_gameplay_chunks.py` supplies the chunk layout used
by the compiler. Use `--refresh-receipts-only` after separately generating initial
records; this refreshes the manifest without rerunning the full extraction.

Ten world inputs are empty or unfinished native files, and one old tree template
format remains unsupported. Unknown properties/tails include quest manager,
inventory, movement and item data. `world/errors.json`, `templates/errors.json`
and `assets/gothic3/gameplay/runtime-property-audit.json` identify these limits;
no failed source is silently promoted to a valid empty world.

## World and terrain inventory

```powershell
python tools/gothic3/export_world_index.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

This separate index follows world registries and sector membership, retaining
enabled flags, exact missing references and source geometry bounds. It records
2,421 `.node` files, 108 `.lrentdat` files and 782 landscape Cell meshes. Bounds
are absolute reflected metres; apply a chosen floating origin once. This command
does not export every visual resource, activate sectors, or implement streaming.
The rendered Ardea scene continues to use six selected landscape LOD cells.

## Scheduled bandit death evidence and SVM data

```powershell
python tools/gothic3/read_npc_death_native_evidence.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/prepare_bandit_death_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
python tools/gothic3/prepare_svm_data.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04" --ini "C:\Program Files (x86)\Steam\steamapps\common\Gothic 3\Ini\ge3.ini"
```

The first command compares the examined death-state, cleanup and speech
instructions against the installed PE bytes without executing native code.
The second audits the selected bandits against their full serialized entity
class lists, preserving Party and movement fields and collision-shape source
facts. The third decodes the effective `Strings.p00/SVMAdmin.dat` and records the
selected local audio language. It preserves the declared voice/category maps
and isolates trailing bytes from indexed strings. Its prepared data supplies
the bounded browser death speech prerequisite; it does not implement native
audio playback, manager heap layout or shutdown lifetime. The connected
bandit death prefix and its explicit stopping point are described in
[checkpoint 72](../../docs/engineering/gothic3-rebuilding-process.md#72-schedule-the-bandit-death-state-and-preserve-its-applied-prefix).

## Selected original NPC entity records

```powershell
python tools/gothic3/prepare_npc_entity_source.py --study "C:\path\to\Gothic3_Decompiled_Study_2026-10-04"
```

This standard-library Python producer reads the verified original SysDyn
resource and native evidence without executing or modifying the game. It
exports Jack's three coastal bandits as complete 6,544-byte records, including
their 48 property packets, indexed strings and source graph relationships.
The study must contain `00_Original_Runtime/`, `01_Decompiled_Code/` and
`02_Unpacked_Data/Archives/`. The producer also checks the pinned native
receipts already committed to this repository. Outputs are
`assets/gothic3/npc-entity/bandit-records.json`, `manifest.json`,
`native-evidence.json` and
`public/gothic3/gameplay/npc-entity/bandit-records.json.gz`.
The manifest pins input and output hashes. The browser verifies available
compressed bytes and every decoded byte before admission; when Fetch removes
HTTP gzip encoding, the exact decoded receipt is checked.

The package supplies source records and graph metadata. It does not create
the other graph entities or activate the selected NPCs. The current original
entity read stops at the Navigation default creator's unowned ErrorAdmin
singleton, before serialized property reading or attachment. See
[checkpoint 73](../../docs/engineering/gothic3-rebuilding-process.md#73-construct-retained-npc-owners-and-reach-the-first-property-factory)
for the exact applied prefix and remaining prerequisites.
