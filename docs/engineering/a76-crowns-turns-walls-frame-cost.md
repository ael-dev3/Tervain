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

## Close up: materials, grade and props (Gothic 3's grounded, muted look)

Each checked close up in the served build, before and after (house_a's door and wall, its plinth, the street, the town,
house_a's and the inn's rooms).

| Item | What was wrong close up | Change |
| --- | --- | --- |
| Plaster | Mid-scale trowel unevenness carried into the colour read as camouflage blotches | The unevenness stays in the relief and only faintly in the colour; a fine lime-sand grain added (rebaked `plaster`, fallback matched) |
| Timber frame | Near-black: the frame's tint (`woodDark`) times a dark texture | Warmer oak browns with more spread between early and late wood (rebaked `timber`, level 0.22 → 0.27) and its own tint (`TINT.frame`); dark smoked oak with readable grain |
| Iron (straps, hinges, rings, brackets) | Flat light grey, smooth: read as plastic | Forged-iron tint (0x77726a → 0x57514a) and hammered relief from the bronze fittings' normal map |
| Stone | Hearth and plinth already rough, with dirty mortar | Unchanged. The warm lines low on the hearth stack are the fire light catching the mortar's edges, not glowing mortar |
| Cloth, ground | Already muted and textured at close range (A67, A75) | Unchanged |
| Grade | A little bright and clean against Gothic 3's earthy contrast | Saturation 0.92 → 0.88, contrast 1.10 → 1.13 (tried live at 0.86 and 1.14 first) |
| Props in homes | Furniture with nothing on it: rooms read as bare | Bowls, jugs, cups, a loaf, candles and pots on tables, counters, desks, workbenches and chests (`clutter.ts`): code-built, 40–200 triangles each, one instanced mesh per kind, shown with their room. Each stands on its piece's own surface, found by a ray down onto the model at load. A quarter of the spots are left empty and each thing is turned its own way, by where the piece stands |
| Props in the village | Only the door side of a house was used | A rain butt and a crate at the back corners of each house; two casks by the inn's door |

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

**What Ael needs to run** (the PC whose GPU is to be measured, with Node 22 and Chrome or Edge installed). In a first
terminal, from the repository:

```
git pull
npm ci
npx vite build
npx vite preview --port 4173
```

Leave that running. In a second terminal, from the repository:

```
node tools/bench.mjs --headed --quality high --runs 3 --out bench-high.json
node tools/bench.mjs --headed --quality high --treelod --runs 3 --out bench-high-treelod.json
node tools/bench.mjs --headed --quality medium --runs 3 --out bench-medium.json
node tools/bench.mjs --headed --quality low --runs 3 --out bench-low.json
```

Each takes about four minutes (three laps of the 72 s route, after loading). The tool finds Chrome or Edge in their usual
places on Windows, macOS and Linux; if it says it cannot, set `CHROME` to the browser's path first (PowerShell:
`$env:CHROME = "C:\Program Files\Google\Chrome\Application\chrome.exe"`). `--headed` matters: it opens a visible
window so the GPU draws (headless Chromium uses software rendering). Keep that window in front and the PC on mains power,
with nothing else heavy running. The first lap of each includes shader compiles; the second and third are the figures.
Each run prints a one-line summary; send back the four JSON files. A 60 Hz display caps frame time at 16.7 ms, so the CPU
and GPU columns are the ones that say how much headroom there is.

**What the CPU-side numbers show.** Measured here (software rendering, 960×600; counts are what is submitted, which does
not depend on the GPU):

- Medium, quick route (`--quick`, half a second a segment): 64 draw calls and 0.44 M triangles a frame in the median,
  CPU 3.5 ms. Nothing wasteful stands out.
- High, one frame in Rillford looking across the town: 331 draw calls and 3.27 M triangles. Where they go: the grass
  0.55 M, the trees about 1.5 M with their shadow casters, then terrain, sea and buildings; no single thing stands out.
  (A first version of this record said 1,349 draw calls and 11.6 M triangles: that was four frames added together by a
  capture script that did not reset the counters between views. It was wrong.)

**High's trees at a distance (opt-in).** High draws every tree's full near model at every distance, by decision (0.0.10,
A62), and that stays the default. Settings → *Lighter distant trees (High)* (`treeDetailByDistance`, off by default;
`?treelod=1` with `?shot=1`; `tools/bench.mjs --treelod`) gives High Medium's bands instead: the full model to 120–180 m,
the middle model to 480–620 m, the far model beyond. With it off, High's output is unchanged. Measured one frame at a time
(High, 960×600):

| View | Off: draws, triangles | On: draws, triangles |
| --- | ---: | ---: |
| Rillford, across the town | 331, 3.27 M | 345, 3.50 M |
| Under the oak by the pond | 235, 1.89 M | 237, 1.92 M |
| From the ridge, across the valley | 376, 3.97 M | 398, 3.86 M |

It saves little: from the paths and the town nearly every tree in view is within 120 m, and in the 120–180 m band both
models are drawn (each to its share of pixels), which costs more than it saves. It matters only on the longest views, and
there by 3%. So the decision to keep full trees on High costs little; the opt-in is there for a weak GPU.

BENCH_TABLE

Meshy credits: none spent. Totals stay as recorded: trees and fingers 30 of 100, hero 35 of 200.
