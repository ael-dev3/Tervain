# A141: the tree lab

Phase 0 of the tree overhaul: a fixed rig for looking at one tree, so every later change is judged on the same pictures and numbers.

## Run it

```
node tools/tree-lab.mjs --url <build url> --asset <id> --out <dir> [--hours 11,19.8,22.5]
```

- `--asset` is a `MESHY_TREE_IDS` entry (`oak-elder`, `fir-spire`, `verdant-sentinel`, `tree-1521` ...), a species (`oak`, `fir`, `pine`, `birch`: the game's own pick, variant 0) or `solitary-pine`. The species of the known ids is built in; pass `--species` for a new id (a hero tree added later).
- `--parts stills,orbit,wind,metrics` runs only some parts; `--spot x,z` overrides the meadow; `--scale` scales the tree; `--quality`, `--size`, `--clip-hour`, `--wind-fps` and `--wind-seconds` do what they say.
- Serve a build with `vite preview` (or the dev server) on a free port. Chrome or Edge and `ffmpeg` must be installed.

## How it works

- The page loads with `?treelab=<species>[:<assetId>][@x,z][*scale]`. The forest module (`src/presentation/treeLab.ts`, hooked in `flora.ts`) then keeps exactly one tree, on the flattest dry ground it finds with no collider within 60 m. The parameter is off unless present, so play is unchanged. `window.__treelab` reports the spot.
- The script replaces the loop's `step` and `render`, so time moves only when it calls `world.update`; the player is hidden at the camera and the hour is passed to each frame.
- Distances are metres from the trunk surface (the measured wood radius is added).

## Output

| File | What |
| --- | --- |
| `stills/h<hour>_<view>.jpg` | `d001`, `d003`, `d010`, `d030`, `d100` (eye height 1.7 m, looking at mid-height), `base` (3.2 m, roots), `canopy` (from under the crown) |
| `sheets/h<hour>.jpg` | the five distance stills side by side |
| `orbit.mp4` | 6 s, 360 degrees at 8 m |
| `wind.mp4` | static camera at 12 m, 10 s at 60 fps, gust time advanced each frame |
| `metrics.json` | tree size, spot, triangles and draws the tree adds, alpha edges, wind, repetition |

## Metrics

- **Triangles and draws:** `renderer.info` for the 10 m frame with and without the tree meshes; the difference is the tree.
- **Alpha edges:** the tree alone against black, then white, gives alpha per pixel; a hard step is a covered pixel (alpha above 0.9) beside an empty one (below 0.1). `hardShare` is hard steps over hard plus soft edge pixels; lower reads softer.
- **Wind:** block luma series over the crown from the wind clip. `meanPairwiseCorr` and `pc1Share` near 1 mean the whole crown moves in phase; near 0 means independent per-branch motion.
- **Repetition:** the highest normalised autocorrelation of a 256 px crop (canopy still for leaves, base still for bark) at lags of 10 px or more. Near 0 reads non-repeating.

Scoring follows the tree plan's rubric (trunk, roots, branches, leaf edges, silhouette, wind, LOD, translucency; 0 to 3). Record the still or clip next to each score, and do not claim a pass without the clip.
