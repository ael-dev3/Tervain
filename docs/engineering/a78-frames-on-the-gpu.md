# Frames on a real GPU (A78, 0.0.13)

A76 and A77 measured in a cloud container with software rendering; their frame and CPU times said nothing about a GPU.
This round ran the same benchmark on an RTX 3080 Ti, found where the frames went, and made them lighter with no visible
change.

**Set-up.** Production builds (`npx vite build`) served locally (`vite preview`); `tools/bench.mjs --headed --runs 3`,
Chrome 154 (ANGLE, Direct3D 11), 1920×1080 at pixel ratio 1, on a 60 Hz display; Intel i7-12700F. Figures are the
median of laps 2 and 3 (lap 1 compiles shaders). "Before" is `main` after #218 (A77); "after" is this branch.

**How to read it.** Frame time is capped by the display at 16.7 ms, so the CPU and GPU columns show the headroom.
CPU time is the frame's JavaScript (simulation and draw submission). GPU time comes from timer queries; with vsync the
GPU clocks down, so it overstates the load. On this PC the CPU figures vary ±1.5–2 ms between sessions of the same
build: it is a hybrid-core processor with other programs running. Where a change is smaller than that, the exact
counts (draw calls, triangles, program lookups) are the evidence, and the CPU effect is shown only where an A/B
measurement clears the noise.

## The route on the RTX 3080 Ti

| Preset | | Frame p99 | CPU median / p95 | GPU median / p95 | Draw calls, median (most) | Triangles, median (most) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| High | before | 33.5 ms | 11.5 / 21.0 ms | 10.0 / 16.5 ms | 395 (1,418) | 4.15 M (16.1 M) |
| High | after | 33.5 ms | 12.4 / 21.4 ms | 9.9 / 15.7 ms | 340 (749) | 4.16 M (10.9 M) |
| High, lighter distant trees | before | 17.2 ms | 10.1 / 16.1 ms | 9.7 / 14.4 ms | 418 (1,498) | 4.28 M (18.3 M) |
| High, lighter distant trees | after | 17.4 ms | 9.5 / 16.2 ms | 8.8 / 14.0 ms | 360 (796) | 4.28 M (10.3 M) |
| Medium | before | 17.3 ms | 12.2 / 17.4 ms | 10.3 / 14.1 ms | 404 (1,431) | 3.65 M (14.4 M) |
| Medium | after | 17.2 ms* | 11.6 / 18.1 ms | 9.5 / 14.1 ms | 347 (750) | 3.65 M (9.3 M) |
| Low | before | 17.2 ms | 8.1 / 12.2 ms | 7.2 / 10.4 ms | 197 (471) | 1.15 M (2.9 M) |
| Low | after | 17.2 ms | 6.6 / 10.1 ms | 6.8 / 9.6 ms | 196 (395) | 1.14 M (2.9 M) |

\* Medium "after": lap 2. Lap 3 ran 1–4 ms slower in every segment (background load on the PC) and read 32.9 ms;
the other columns are the median of both laps, as for every row. The "before" rows for Medium, Low and the lighter
trees come from the first session of the day, run while other tabs of the game were open in a hidden window.

Every preset holds 60 frames a second in the median. The heaviest single frames halved (1,418–1,498 → 749–796 draw
calls; 14–18 M → 9–11 M triangles): they were the window views (below). High still misses a frame about one time in a
hundred, almost all on the shore at the landing. There the CPU needs about 15 ms and the GPU about 14–15 ms:

| Shore view (High, camera held), one thing left out | GPU median |
| --- | ---: |
| Nothing (as drawn) | 14.1 ms |
| The trees (all of them) | 8.2 ms |
| The water's planar reflection | 11.0 ms |
| The water (with its reflection) | 10.5 ms |
| Residents and animals | 13.1 ms |
| Grass; terrain; the sun's shadow refresh | 14.0–14.4 ms (within noise) |

On the GPU, the trees' leaf cards cost most. Within the noise, they split as foliage 3–4 ms, wood 1–2 ms, the trees'
shadow casters 1–2 ms and the forest floor about 1 ms. High draws the full trees at every distance by the owner's
decision (A62), and "Lighter distant trees" stays the opt-in for a weaker GPU.

## Where the CPU went, and what changed

A CPU profile of the route (an unminified build, 30 s, after a warm lap) split a frame into about 55–60% drawing and
35–40% simulation. In drawing, four things stood out.

| Found | Change | Measured |
| --- | --- | ---: |
| The water's last pass draws layer 1 only, and the lights were on layer 0. That pass saw no lights, so three.js took it as a change of lighting and re-resolved the shader program of every lit material (trees, animals, residents, props) on the next pass, each frame | Every light is also put on layer 1 (`waterRenderPass.ts` `gather`). Lights light exactly what they did; only the lighting state stays the same | Program lookups 131 → 12 a frame (counted by each material's cache-key calls). Camera held at the busiest town point: frame JavaScript 22.5 / 17.9 ms → 16.3 / 14.3 ms (two sessions each) |
| On entering a room, the window view drew all six cube faces in one frame. On the route, where the camera passes through doorways, that was 1,171–1,279 draw calls, 12–16 M triangles and 19–39 ms of drawing in one frame | The first capture in a room is spread one face a frame, like A77's refreshes. The panes keep their view, or their flat daylight before the very first capture, until the six faces are done (0.1 s) | The route's heaviest frames: 1,418 → 749 draw calls, 16.1 M → 10.9 M triangles (High) |
| The water's reflection drew every small prop up the shore (doors, tools, barrels, stones), each a draw call, a speck in a rippled 512 px image | Single meshes smaller than 1.5 px of radius in the reflection, as seen from the mirrored eye, are left out of it; so are meshes wholly below the water plane (`hideTinyDetail`) | Reflection at the landing: 342 → 258 draw calls, about 4.7 → 3.5 ms of drawing |
| The hunter's camp and the caravan rest are dozens of small parts (planks, legs, pins, ties, belts, buckles), each drawn in colour and again in the sun's shadow | Fixed props drawn as one mesh per material (`staticMerge.ts` `mergeStaticParts`). The parts stay in the group as built (names, places, picking) but are no longer drawn | At the landing: 602 → 470 draw calls a frame (the sun's shadow 149 → 92) |

Route draw calls (High, median): 395 → 340. At the landing segment: 1,013 → 724.

## Checked in the served build

- **The camp and the caravan rest.** The same views, before and after: no difference beyond a deer and a resident
  that had moved (mean pixel change 0.06 of 255).
- **The reflection.** Read back from its own render target in the same frame, with the cull off and on, at the shore,
  across the bay and in town. At the shore and across the bay the difference was below the image's frame-to-frame
  change. In town, at most 41 of its 262,144 pixels changed (single specks, the reflection's small props). Raising the
  limit to 2.5 or 4 px saved another 20–40 draw calls but changed more pixels, so 1.5 px stays. Full frames at four
  water views differed from each other only as much as two captures of the same build did (waves and clouds move).
- **The window view in house_a** (`?place=rillford`, standing in the room facing its back windows, 420 frames, all
  passes counted; the screenshots show the same outside through both windows):

| | Triangles a frame, median | Most in one frame | Most draw calls | Frames over 5 M |
| --- | ---: | ---: | ---: | ---: |
| Before A77 (`e1934402`) | 3.33 M | 17.5 M | 1,307 | 3 |
| A77 (`main`) | 3.40 M | 6.02 M | 661 | 10 |
| A78 | 3.33 M | 4.98 M | 458 | 0 |

This replaces the A77 record's pending window row.

## Found, not yet changed

- **Residents taking their models after entry.** Each of the 15 residents who arrive after the world opens sets up
  their rig in one go: 50–260 ms (the reeve 260 ms), two of them a frame at most. In the first minute that is a run of
  visible hitches. Each setup is per model (skin priors, covered layers, finger plan, clips retargeted with their seats
  measured, hand shapes), and every resident has their own model, so caching does not help. Splitting the setup over
  frames is the next round.
- **The first lap's 0.6–0.75 s freeze** at the start of the route (shader programs compiled on first use, and the
  arrivals above).
- **Matrix updates.** three.js recomputes the scene graph's matrices on each of the frame's two or three scene passes.
  One pass costs 0.2 ms; most of it is the animals' and residents' skeletons. Freezing the static groups would save
  about 0.1 ms, too little to risk a prop that stops following.
- Two materials still re-resolve their program four times a frame: shared by meshes whose vertex colours have different
  layouts. About 0.1 ms.

## Tools

The measurements above are repeatable with the benchmark (`tools/bench.mjs --headed`). The probes behind the
breakdowns are described here: per-pass draw calls (wrapping `renderer.renderBufferDirect`), program lookups (each
material's `customProgramCacheKey`), GPU time with one thing hidden (the frame cost overlay's timer queries), and CPU
profiles (DevTools `Profiler` over `tools/cdp.mjs`).

No Meshy credits spent.
