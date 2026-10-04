# Native Ardea asset preparation

These standalone Python tools prepare the separate `/gothic3/` browser study.
They do not run Gothic 3 or alter its installation or the completed desktop study.
They are not part of the Tervain game runtime.

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
- Diego, Milten, Gorn, Lester, Jack and Hamlar also use their exact body/head
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

This is a static native-asset exploration slice, not a complete engine port.
It does not reproduce Gothic 3 combat, NPC AI, quests, physics, save games, music,
speech, skeletal motion, face animation, SpeedTree wind, or native shaders.
NPC geometry is the original bind pose. Hair, beards, and equipment attachments
need the original skeleton/bone attachment transforms and are currently omitted.
The converter selects the FXA payload containing the most source triangles;
this avoids Rimy3D's default first-payload choice for actors with several LODs.

Textures use native DXT pixels. Opaque textures become JPEG quality 92 with no
resizing; textures with alpha become PNG. Native XIMG mip levels are stored
smallest first; the full-resolution level is read at `imagePayloadEnd -
fullMipBytes`. The native reader offsets and dimensions are recorded in
`textureSelections`. Only one diffuse sampler per material
is rendered. Multiple samplers, terrain blends, original lighting, normal maps,
and specular graphs need further runtime work and are recorded in the manifest.
Sampler `SwitchRepeat` is decoded from each native material; zero-based actor
switches select from contiguous `S1..Sn` images using its Repeat, Clamp or PingPong
mode. `materialSelections` records the source sampler, mode, available range and
selected image. A material's exact shader graph is still not evaluated.
Each model/world entry also records native `BlendMode` and the raw byte
`MaskReference` for its named materials. A texture's alpha channel alone does not
establish that the original material used masking or transparency.
Legacy material entries use a uint16 byte length followed by inline bytes;
`00 00` is an empty string. GENOMFLE material entries instead use a uint16 string
table index. The parser keeps these cases distinct and rejects decoding failures
in recognized shader/sampler classes, so an empty fallback material cannot silently
remove a shader's cutout metadata.
Rimy3D changes material-name spaces and tabs to underscores when writing OBJ/MTL.
When an exact native filename is absent, material lookup accepts only a unique
name generated by this documented conversion rule. The original native name is
retained in `materialSelections`.
