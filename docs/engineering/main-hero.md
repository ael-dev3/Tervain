# The Weathered Wanderer: approved main character

On 2 October 2026 the owner approved the finished **49,500-triangle Weathered Wanderer** and requested that he become Tervain’s main playable character. This is a selected replacement for the player model in the existing `0.0.8` game; it does not change the NPC art pipeline or establish a new release number. The protagonist still begins without equipment and uses the existing inventory, hotbar and world pickup systems.

The exact asset, authority, source hashes, transformation and rig contract are recorded in [main-hero-assets.json](main-hero-assets.json). Its source is the owner’s supplied `Meshy_AI_The_Weathered_Wandere_1002192705_texture.glb`, followed by the approved UV-preserving 50k reduction, material refinement and rigging. The finished source GLB and editable Blender scene remain in the owner’s asset workshop. This import makes no general open-content license claim and ships no extracted Gothic or Warcraft content.

## Runtime delivery

The game asset is `public/models/hero/weathered-wanderer-hero-50k.glb`. Construct its URL from `import.meta.env.BASE_URL` plus `models/hero/weathered-wanderer-hero-50k.glb`; an absolute `/models/…` URL would break the repository’s GitHub Pages subpath. The GLB embeds all of its data and has no external image, skeleton or animation requests.

The runtime derivative changes **download encoding only**. Its three PNG textures are encoded as lossless WebP with the native Sharp/libwebp preparation tool, then decoded and compared byte for byte with the original RGB pixels. The 4K albedo, 4K tangent normal and 2K metallic/roughness maps retain their exact dimensions and decoded values. Every non-image buffer view—including positions, indices, normals, UVs, skin weights, inverse bind matrices and animation samples—is copied byte for byte. Scene, mesh, skin, animation and material semantics are checked after repacking.

The existing Three.js GLTFLoader supports the required `EXT_texture_webp` extension, and desktop browsers decode WebP directly. Sharp is an offline preparation tool and is **not added to the game dependencies**. This avoids a second CDN or decoder download. Lossless image compression reduces transfer size; it does not reduce GPU texture residency or prove a frame rate. Three RGBA8 maps with full mip chains have an estimated 192 MiB texture footprint. Texture quality/residency controls or a later separately reviewed compressed-GPU derivative can address that budget if measured desktop behavior requires it.

## Geometry and motion contract

| Property | Delivered contract |
| --- | --- |
| Geometry | One mesh, one primitive and one material; **49,500 triangles** below the strict 50,000 limit |
| Vertices | 30,494 exported attribute-split vertices; 24,718 welded authoring vertices |
| Units and axes | Metres; +Y up; +Z forward |
| Rest bounds | Height 1.898654 m; ground-centred with minimum Y 0.000267 m |
| Skin | One 30-joint skeleton, maximum four normalized influences per vertex |
| Hand sockets | `hand.L` and `hand.R`; held item orientation/offset must be fitted to the actual integrated skeleton |
| In-place clips | `Idle` 4 s, `Breathing` 5 s, `LookAround` 6 s, `Walk` 1.2 s |
| Authoring motion | `WalkRootMotion` 1.2 s; 0.516129 m forward translation |
| Maps | Albedo sRGB; tangent normal and packed G-roughness/B-metallic linear data |

Keep the gameplay controller authoritative for movement and collision. Use the in-place `Walk` clip for controller-driven locomotion. Do not layer `WalkRootMotion` translation over controller movement or loop its forward displacement without handling resets. The authored walk is leisurely, approximately 0.430108 m/s at source scale; treating it as a ready-made run by applying a large playback multiplier needs visual review. The source has no authored sprint, jump or attack clip. Any runtime adaptation of those actions must be documented as such rather than presented as additional source animation.

## Reproduce or audit the asset

The source SHA-256 is pinned by the preparation script. An import requires the approved final GLB and an existing native Sharp installation:

```sh
node tools/import-main-hero.mjs --source /path/to/weathered-wanderer-hero-50k.glb --sharp /path/to/node_modules/sharp
node tools/import-main-hero.mjs --check
```

The first command refuses an unapproved source, a decoded-pixel mismatch, a changed non-image payload, altered scene semantics or an out-of-contract model. It writes the runtime GLB and machine-readable record. The second command requires only Node and verifies the shipped file against that record, including its hash, byte size, triangle count, skin and five-clip contract. It does not re-encode or repaint anything.

The workshop’s original checks covered geometry/UV preservation, normalized skinning, animation loop endpoints, no degenerate triangles, finite accessors, texture coverage and normal direction. The import adds exact pixel and payload preservation checks. Running-game framing, controller gait, slopes, held item contact, saves, lighting and deployment require the integrated game’s own checks; asset preparation does not establish them. The coordinating release record should identify the game build and the observations actually completed.
