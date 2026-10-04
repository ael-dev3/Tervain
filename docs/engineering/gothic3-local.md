# Gothic 3 from your own install (`/gothic3-local/`)

A study viewer for comparing Tervain with Gothic 3: Ardea and its coast, drawn in the browser from the visitor's own
installed copy of the game. Hosted at <https://ael-dev3.github.io/Tervain/gothic3-local/>.

It is separate from the [`/gothic3/` reconstruction](gothic3-browser-port.md), which it does not change or use.

## How it works

The page asks for the Gothic 3 folder (or its `Data` folder). It reads the `.pak` archives and their `.p00`/`.p01`
patches **in the tab**, decompresses entries with the browser's own zlib, and builds the scene with original
TypeScript and Three.js. Nothing is uploaded, and this route hosts **no Gothic 3 data**: without an installation the page
shows only its introduction.

- Chrome and Edge use the File System Access API and can remember the folder (IndexedDB, this browser only). Other
  browsers fall back to a folder input.
- Required archives: `_compiledImage`, `_compiledMaterial`, `_compiledMesh`, `Projects_compiled`; `Speedtrees` adds
  trees.
- **Development:** start Vite with the data folder to skip the picker:

  ```bash
  G3_DATA="C:/Program Files (x86)/Steam/steamapps/common/Gothic 3/Data" npm run dev
  ```

  In PowerShell:

  ```powershell
  $env:G3_DATA = 'C:\Program Files (x86)\Steam\steamapps\common\Gothic 3\Data'
  npm run dev
  ```

  Then open `/gothic3-local/?autostart`. The `/__g3data/` route (`tools/gothic3LocalData.ts`) serves only the
  archives directly in that folder, with byte ranges, only in `vite` serve mode and only to this machine. It is not in
  the production build.
- URL parameters for checks: `x`, `z` (Gothic 3 centimetres), `up` (metres above the ground), `yaw`, `pitch`, `hour`,
  `cells` (radius of loaded 100 m cells, default 2), `walk=1`, `horizon=0`, `overbright`, `fog`, `shot` (keeps the
  drawing buffer and sets the title to `READY` once loaded).
- Controls: WASD, Shift, mouse look (click; Esc releases), F fly/walk, Space/C up/down or jump, an hour slider.

## Boundaries

- The visitor needs an installed, legally owned copy (Steam, GOG or disc). The page reads it at run time, as an
  installed game reads its own files.
- For this viewer, never commit, host or ship anything from an installation: no archives, extracted or converted files, images,
  captures or tables derived from them. Test fixtures are synthetic.
- The code is original TypeScript. PR #21's author worked out its file formats by examining installed files with
  throwaway scripts, without using decompiled code or this repository's preparation tools. Integration subsequently
  checked bounded colour-selector and alpha-reference facts against the separate authorized offline study;
  no native program code is copied, executed or bundled. Inferred rendering choices are marked below and in module headers.
- Gothic 3 is © THQ Nordic GmbH, developed by Piranha Bytes; the page says the viewer is not affiliated with them.

## What is implemented

Code: `gothic3-local/index.html`, `src/gothic3local/`, `tools/gothic3LocalData.ts`; tests in `tests/gothic3local/`.

| Area | Module | Notes |
| --- | --- | --- |
| Archives (`G3V0`) | `archive.ts`, `source.ts` | Directory tree, stored and zlib entries, patches override by path. |
| Resources (`GENOMFLE`) | `genome.ts`, `binary.ts` | String table; property objects with their revision-dependent identity; typed properties. |
| Images (`.ximg`) | `image.ts`, `textures.ts` | DXT1/3/5 uploaded as S3TC (software decode otherwise), A8R8G8B8. **Mip levels are stored smallest first**; reading them largest first had shifted every texture by a third, which tiling textures had hidden. DXT5 normal maps keep X in alpha and Y in green. |
| Meshes (`.xcmsh`, `.xlmsh`) | `mesh.ts`, `geometry.ts` | Elements and vertex streams; the block after each element is skipped by finding the next sound header. LOD lists resolve to the nearest level only. |
| Materials (`.xshmat`) | `material.ts`, `shading.ts` | The shader node graph is compiled to GLSL inside Three's Blinn-Phong material: samplers, constants, combiners, blends, vertex colour, texture-coordinate scale/scroll/oscillate and bump offset. Slot order and combiner meanings are **inferred** from the installed materials. |
| World | `world.ts`, `scene.ts` | Entities in the compiled 100 m cells around the start and Ardea's sector layers; static meshes instanced per mesh element; the whole world's low-poly terrain and water as the horizon, sunk where full detail is loaded. |
| Ground vegetation | `vegetation.ts`, `undergrowth.ts` | Each cell's `eCVegetation_PS`: its meshes, a grid of 10 m nodes and instances (position, rotation, two scales, tint). Drawn within the set's view range (50 m), fading from 25 m by a rising alpha test over the noise the plant images keep in their alpha (the game's own masks use 100/255 near the camera). Wind sway is this viewer's. |
| Trees (`.spt`) | `speedtree.ts`, `trees.ts`, `leafatlas.ts` | SpeedTree definitions hold growth parameters, not geometry, and SpeedTree's algorithm is not public: trunks, branches and crowns are **this viewer's own generator**, with camera-facing leaf cards like SpeedTree's. The installed game has only six shared composite images for leaves and billboards, and the definitions do not say which part a tree's leaves use (the game supplies that at run time), so leaf clusters are **chosen by analysing the image** (needle trees take the finest cluster). The region a definition does give frames billboards. |
| Water | `water.ts` | Ocean/river materials keep their fresnel constant, reflection colour and depth half-lives; waves, sky reflection and sun glint are this viewer's. |
| Sky and light | `sky.ts`, `main.ts` | Hand-made daylight palette (not game data); two drifting cloud layers from the game's own cloud maps; haze that meets the horizon. The viewer shades colours as stored, with an adjustable brightening factor (`overbright`, default 1.8). Native sampler/output sRGB state and lighting equivalence are unverified. |

## Verification

The installation/parser and performance observations below are reported by the
author of [PR #21](https://github.com/ael-dev3/Tervain/pull/21) for its component
revision. They do not establish native-game equivalence or a completed game.

- `npm test` includes the viewer's tests with synthetic fixtures: archives and patches, folder selection, property
  objects and revisions, image levels and DXT/ARGB decoding, mesh elements, world records, vegetation, the SpeedTree
  tokenizer (including payload sizes the first version missed), grown trees, leaf-cluster selection and near-camera
  vegetation culling.
- Against one Steam installation (with its `.p00`/`.p01` patches), by local scripts that were not committed: all 5,392
  compiled meshes and all 1,143 materials parse; all 98 SpeedTree definitions tokenize to the end; the 25 cells
  around Ardea hold 40,356 vegetation instances.
- Headless Chrome 154 (ANGLE Direct3D 11, NVIDIA GeForce RTX 3080 Ti), 1600×900 at device pixel ratio 1, development
  server, `cells=2`, 4 October 2026: loads in 12–25 s; 60 fps (the display rate) at the views checked, 700–1,150 draw
  calls and 4.6–7.3 million triangles; about 17 ms per frame with `gl.finish()` at the heaviest forest view. This is
  one fast machine; slower hardware is untested.
- Captures were reviewed locally and are not in the repository.

## Known limits and next steps

Toward the owner's goal of playing all of Gothic 3 in the browser, in rough order:

1. Streaming cells in and out as the player moves (today the start area is loaded once), and level of detail for
   static meshes (always the nearest level now) and distant trees (the definitions' billboards).
2. Collision beyond ground rays in walk mode; interiors; lightmaps (`Lightmaps.pak`) and point lights.
3. People and creatures: skinned actors (`.xact`) and animations (`.xmot`) from `_compiledAnimation`, placed from the
   world's spawn data.
4. Sound and music from the installation.
5. Gameplay: templates, quests, dialogue and strings are data the page can read; the rules that run them live in the
   game's executables and would have to be designed anew from observed behaviour, not decompiled.

Smaller issues seen in review: thatched roofs can look too shiny; the horizon mesh is coarse close to the full-detail
edge; trees are approximations (shape, density and leaf choice).

The combined integration corrects shader callbacks on mirrored mesh placements,
maps Wrap/Clamp/Mirror independently for U and V, uses selectors
0 whole / 1 RGB / 2 R / 3 G / 4 B / 5 A, and preserves strict
`alpha > MaskReference/255`, including reference zero. Colour selectors were
checked at Engine.dll `eCColorSrcBase::GetSwizzle` (`0x3000ed40`); alpha reference
and comparison at `eCShaderBase::ExecuteZPass` (`0x300050f1`) and its render-state
setup. Those bounded corrections do not establish whole-renderer equivalence.
Entity-specific `MaterialSwitch` selections are not implemented in this viewer;
the separate Ardea export's 63 recorded static selections are all zero, which
does not establish support for nonzero selections elsewhere.
Texture-coordinate rotation is unsupported. Blend modes 3–8 use an additive
approximation. These gaps prevent native-equivalent material claims.
