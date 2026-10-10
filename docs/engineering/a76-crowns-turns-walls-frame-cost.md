# Tree crowns, turns, the wall hairline and frame cost (A76, 0.0.13)

Continues [A75](a75-hands-and-backlog.md). Every change was checked in the production build served locally (`vite
preview`) in headless Chromium with software rendering (SwiftShader, no GPU) in a cloud container: the captures show what
the game draws, not how fast a GPU draws it.

## The hairline at window height inside the rooms

Found by turning one thing off at a time in the served build. Lights, fog, water, the plaster's maps, vertex colours, AO
and shadow receiving had already been ruled out (A75), as had the wall's grid. Turning off the timber's slope-scaled depth
offset alone removed it.

Every surface laid on another (stone, timber, panes, ironwork) was drawn with `polygonOffsetFactor = -rank`, a depth pull
that grows with the surface's slope to the eye. The timber frame's rails stand on the outside of the 24 cm wall; from
inside a room their top and bottom faces are seen exactly edge-on, so the offset pulled them through the wall: a dark
hairline at rail height across the wall, and short dashes beside each window. Timber and iron now keep only the constant
offset (`polygonOffsetUnits`), which is all a piece standing on a face needs (`regions.ts`). Before and after, house_a's
back wall and its side wall: the line and the dashes are gone. Outside, the timber still draws over the plaster with no
z-fighting (three views of house_a, before and after, unchanged).

## Tree crowns

No Meshy credits were spent and no triangles were added; the change is in the leaf shader (`foliage/foliageMaterial.ts`).

- **Cards seen edge-on fade out.** A card nearly edge-on to the eye smeared its texture into long streaks, which is most
  of what read as noisy cut-out cards. Each card's facing is measured per pixel (from the screen-space derivative of the
  surface) and its coverage fades from 55% to 20% facing; the cards behind fill in.
- **Leaf masses.** A noise field in metres, offset by where each tree stands, divides every crown into masses about a
  metre across: the spaces between masses fall into shade, and on the outer shell the cards thin out there, so the
  outline breaks into clumps with sky between them rather than following card edges. The cards' straight cut is
  roughened at leaf scale, fading once a pixel covers several leaves so it never shimmers. No two trees clump alike.
- **Muted toward Gothic 3.** Saturation 0.95 → 0.7, light through the leaves 0.9 → 0.55 and less yellow (no more lime
  highlights), the crown shades more as one mass (crown normal 0.8 → 0.85).

Before and after, near (under the crown), looking up into it against the sun, and at 35 m across the pond.

Not done, and why:

- **Repainting the leaf textures' alpha.** The masses above are computed per pixel in the crown's own space, so they
  follow the crown rather than the texture atlas and need no new images or download.
- **Moving triangles from trunks and hidden inner cards to the outer crown.** The near crowns already use 19,800 of their
  20,000 triangles and A72 simplified the near wood to make room; the inner layer now fills the gaps the edge-on fade
  opens, so it is no longer hidden.
- **An impostor far level.** Medium and Low already draw each tree's own lighter `mid` and `far` models with distance
  (crossed cards for the Pine). High draws the full near model at every distance by decision (0.0.10, A62); see the frame
  cost below.

## Turning

Turning on the spot with planted feet already stepped from each figure's own walk (A71, `turnSteps.ts`). What was
missing is the upper body leading the turn. Now, whenever a figure turns, standing or walking, the chest, neck and head
turn ahead into it: about 0.3 s of the turn, at most 0.6 rad in all, shared up the spine (hero: chest 20%, neck 35%,
head 45%; residents: Spine01 15%, Spine 25%, neck 25%, Head 35%). Hips and feet follow with the turn clip as before. The
lead is eased twice, so it sets off and stops without a jolt however suddenly a turn starts or ends. Seated or working
residents do not lead. Joints that no clip sets again are put back before the next frame, so the lead never accumulates.

Checked in the served build: the hero turning a quarter turn on the spot (ten frames, 0.1 s apart) and the caravan master
turning 108° at their own standing pace (lead measured 0.31 → 0.59 rad mid-turn, back to 0 after). Tests: the head leads
by 0.25–0.8 rad either way and returns within 0.03 rad; the resident and hero turn tests still find no pop at 30, 60 and
120 Hz.

## Frame cost: overlay, benchmark route, what to run on real hardware

**On screen.** Settings → Show FPS (or `?fps=1` with `?shot=1`) adds a second line: frame time, CPU time per frame, GPU
time per frame, draw calls and triangles, medians over the last second. The GPU time comes from
`EXT_disjoint_timer_query_webgl2` where the browser offers it (Chrome and Edge on Windows do; Safari and Firefox do not,
and there the line says `gpu n/a`). Draw calls and triangles now count every pass of the frame (the grass, the window
views and the grade), not only the last.

**Benchmark route.** The F3 panel's *Run benchmark route* (or `?shot=1&bench=1`) flies the fixed 72 s route from the
landing through the woodland into Rillford. The report, in the panel and logged to the console as
`TERVAIN_BENCH {json}` (also `window.tervainBench`), gives frame time (median, p95, p99, worst), CPU and GPU time,
draw calls and triangles for the whole route and for each of its 12 segments, with the GPU, browser and viewport.
`tools/bench.mjs` runs it unattended and writes the JSON.

**What Ael needs to run** (any PC with the GPU to be measured, Chrome or Edge):

```
npm ci
npx vite build
npx vite preview --port 4173            (leave running)
node tools/bench.mjs --headed --quality high   --runs 3 --out bench-high.json
node tools/bench.mjs --headed --quality medium --runs 3 --out bench-medium.json
node tools/bench.mjs --headed --quality low    --runs 3 --out bench-low.json
```

`--headed` matters: it opens a visible window so the GPU draws (headless Chromium uses software rendering). Keep the
window in front and the PC on mains power, with nothing else heavy running. The first run of each includes shader
compiles; the second and third are the figures. Send back the three JSON files. A 60 Hz display caps frame time at 16.7
ms, so the CPU and GPU columns are the ones that say how much headroom there is.

**What the CPU-side numbers show.** Measured here (software rendering, 960×600; counts are what is submitted, which does
not depend on the GPU):

- Medium, quick route (`--quick`, half a second a segment): 64 draw calls and 0.44 M triangles a frame in the median,
  CPU 3.5 ms. Nothing wasteful stands out.
- High, standing in Rillford looking across the town: 1,349 draw calls and 11.6 M triangles in one frame. Almost all of
  it is trees: High draws every tree's full near model (19,800 triangles) at every distance, by decision (0.0.10, A62:
  no simplified trunk or crossed far card may change a silhouette while moving). Medium's distance bands (full model to
  120–180 m, the middle model to 480–620 m) would cut this by an order of magnitude. This is Ael's call, not changed here;
  the benchmark on a real GPU will show whether High needs it.

Meshy credits: none spent. Totals stay as recorded: trees and fingers 30 of 100, hero 35 of 200.
