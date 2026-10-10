# Lighter frames without visible loss (A77, 0.0.13)

Owner decision, 10 October 2026: make Tervain noticeably less demanding (triangles, draw calls, shadows, textures,
distant detail, culling) with no visible popping, holes, stretched geometry or loss up close; measure before and after
with the benchmark and check each change in the served build. High's tree detail default may change if it saves cost
with no visible loss.

Measured in a cloud container: production build served locally, headless Chromium, software rendering (SwiftShader, no
GPU). Draw calls and triangles are what the game submits, the same on any machine; frame and CPU times here are
SwiftShader's and say nothing about a GPU (see [A76](a76-crowns-turns-walls-frame-cost.md) for running the same
benchmark on real hardware).

## Where a High frame went

One frame on High in Rillford, broken down by pass and by object (`renderBufferDirect` counted per render target):

- The main view: about 260 draw calls and 2.2 M triangles, the sun's 4096 px shadow map among them (trees' wood and
  leaves cast about 0.4 M; the hero's 150 k-triangle body casts in full).
- The water's planar reflection (512 px), redrawn every frame the camera moves so the reflected shore never jumps: in
  views across the pond 312 draw calls and 3.2 M triangles, a whole second scene, its grass and full-detail trees
  included.
- Indoors, the window view: a 320 px cube capture of the outside, all six faces in one frame every three seconds, up to
  846 draw calls and 7.8 M triangles in that frame. This was the route's worst frame (18–19 M triangles).
- Grass about 0.5 M (near 0.34 M), terrain 0.1 M, sea 0.1 M, buildings small.

## Changes

| Change | Saving | Visual check (served build, before/after) |
| --- | --- | --- |
| The reflection leaves out the grass and the forest floor's plants, a third of what it drew, lost in a 512 px image of a rippled surface | 0.5 M triangles a frame near water | Two views across the pond: no visible difference (mean pixel change 0.35 of 255) |
| The reflection draws the full-detail trees with their middle models: the same instances and coverage, the middle model's vertex buffers, shared, never copied | Up to 2 M triangles a frame near water | As above |
| Tree shadows switch to the middle model at 16 m instead of 25 m: the middle model's shadow is the same outline (the same leaf cards) | About 0.1–0.3 M triangles in the sun's pass among trees | The oak by the pond, its shadow on the grass, full against middle model: the same outline |
| The window view's capture draws the trees' middle models, and after the first capture in a room each refresh redraws one face a frame instead of all six at once | The 7.8 M-triangle frame every 3 s indoors becomes six frames of about a sixth each, and lighter | Unit test: the first capture in a room draws all six faces, each refresh then one face a frame. The in-room before/after count and screenshots did not finish under software rendering before the handover; they are step 1 of [the handover](../HANDOVER.md) |

**Route, High, `tools/bench.mjs --quick`** (median of the route's frames; the landing's shore segment and the town's
segments where the pond is in view gain most):

| | Before (#217) | After |
| --- | ---: | ---: |
| Triangles a frame, median | 4.01 M | 3.88 M |
| Draw calls a frame, median | 418 | 397 |
| Landing (shore) segment, triangles | 10.78 M | 7.94 M |
| Segments 5–8 (town with water in view), triangles | 3.03–5.06 M | 2.48–3.85 M |

## Tried and not kept

- **High's trees at a distance.** The owner allowed High's default to change if it saved cost with no visible loss.
  Giving High its own bands (full model to 180–240 m, the middle model to 700–850 m) added 3–6% triangles from the
  paths and the ridge: in the crossfade band both models are drawn, each to its share of pixels, and nearly every tree in
  view is within 180 m. It was reverted; High stays as decided in 0.0.10, and the A76 opt-in (Medium's bands) remains.
- **Drawing the sun's shadow map every other frame.** Swaying crowns and walking figures change it every frame; at a run
  the hero's shadow would trail his feet by 10 cm on alternate frames. Not done.
- **Thinner grass.** The near grass is dense by the owner's fix for broad ribbons (A75); not touched.
- **A smaller shadow map on High.** 4096 px over 140 m is 3.4 cm a texel; 3072 would soften every contact shadow. Not
  done without a GPU to weigh its fill cost against that.

## Still open

- **Staged loading of the near tree files** (27 MiB of the 57.7 MiB before entry). The middle and far tree files borrow
  the near file's images (A71), and the near file also gives each tree its scale, collisions and leaf sites. Deferring
  it means exporting the middle files with their own smaller images and a small manifest of each tree's scale, bounds
  and leaf sites, so the world can open on middle models and take the near ones as they arrive. That is an asset
  re-export, left for its own change.
- **GPU-side costs** (shadow map fill, overdraw of leaf cards, post-processing): need a GPU; the benchmark is ready
  (A76).
