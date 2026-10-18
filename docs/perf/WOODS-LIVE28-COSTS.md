# Live 0.0.28 woods work inventory

Published **0.0.28 · 30d1f0d**, High, normal motion and active wildlife. This is a **software ANGLE/SwiftShader investigation**, not an Apple GPU frame-time or thermal measurement. The only published hardware run remains `live16`, an older build. A current Mac 60 fps/heat verdict is unavailable here.

## Rendering work

A fixed westward woods path starts at (-55, 70), continues to (-255, 70), and ends in a clearing. Three native main-picture post/MSAA4 checkpoints sample its first 80 m. GPU queries use a compact **492×320, DPR 1** viewport to keep software raster work bounded; High geometry and shadow quality remain enabled. These timings must not be extrapolated into Retina/M5 milliseconds.

| Metres | Calls, all passes | Triangles, all passes | Shadow calls / triangles | Grass calls / triangles |
| --- | ---: | ---: | ---: | ---: |
| 0 | 364 | 5,848,988 | 119 / 1,270,107 | 20 / 872,730 |
| 40 | 316 | 4,914,246 | 113 / 1,429,991 | 18 / 775,677 |
| 80 | 271 | 3,396,477 | 103 / 1,217,997 | 18 / 619,608 |

Per-pass elapsed queries, with nested shadow intervals removed from the main-scene interval:

| Metres | Main scene | Shadows | Secondary passes | Bloom + final post |
| --- | ---: | ---: | ---: | ---: |
| 0 | 8,760 ms | 1,903 ms | 189 ms | 9.6 ms |
| 40 | 6,308 ms | 2,697 ms | 178 ms | 9.3 ms |
| 80 | 4,335 ms | 1,821 ms | 207 ms | 15.3 ms |

**These are software elapsed times, not playable frame rates.** Each is one warmed checkpoint, not a statistical GPU benchmark. Query intervals may include command-submission gaps. The main picture dominates; shadows remain substantial. Post is small in this compact fixture.

A separate held-pose probe at metre 0 places a timer around each actual GL draw (364 queries, exactly matching renderer calls). It follows 120 wildlife updates and has a different wind phase from the earlier pass probe. It is not an A/B comparison; draw intervals exclude clears and framebuffer resolves.

| Group | Share of summed draw-query elapsed | Calls |
| --- | ---: | ---: |
| Foliage colour | 24.3% | 19 |
| Foliage depth prepass | 14.2% | 19 |
| Shadows | 16.9% | 119 |
| Wood colour | 13.4% | 35 |
| Terrain | 9.3% | 27 |
| Grass | 4.6% | 20 |
| Post | 0.2% | 4 |
| Other objects / water / props | 17.2% | 121 |

Foliage colour+depth account for **38.5%** of this software draw time. The largest individual colour draws are the hero-oak variants and hero pine. This identifies work to investigate; it does not establish the same ranking on an Apple tile-based GPU or justify changing foliage appearance.

## World update and JS submission

The same 200 m path has **4,600 updates at 1/60 s**, approximately 2.61 m/s. Its timed CPU phase uses **1470×956, DPR 2**, native capped buffer **2205×1434**. Four GL draw entry points and `clear` are suppressed **only in this CPU phase**, after native render samples. Timings are `performance.now()` main-thread elapsed slices with observer overhead, not thread-CPU clocks or complete App-frame times. No pixel or GPU result comes from the suppressed phase.

| Slice / subsystem | Average | p95 |
| --- | ---: | ---: |
| World update | 0.763 ms | 1.300 ms |
| Render submission model | 2.667 ms | 4.400 ms |
| Combined, paired by sample | 3.430 ms | 5.600 ms |
| Wildlife update (within world) | 0.356 ms | 0.600 ms |
| Forest update (within world) | 0.163 ms | 0.300 ms |
| Groundcover update (within world) | 0.126 ms | 0.200 ms |

One **cold first sample**, after repositioning from the last GPU checkpoint back to the route start, totals 27.5 ms (13.3 update + 14.2 submission). The remaining 4,599 samples have no combined interval above 16.67 ms; maximum 15.4 ms. This is **not a 60 fps PASS**: physics, App/NPC simulation, presentation and native GPU/driver work are not fully represented. No new 0.0.28 Mac missed-refresh stall is claimed reproduced by this model.

## Reproduction and evidence

- `node tools/profile-woods-work.mjs BUILD_URL OUTPUT EXPECTED_REVISION`
- `node tools/profile-woods-draws.mjs BUILD_URL OUTPUT EXPECTED_REVISION`
- [Native passes and counters](proofs/woods-live28/passes.json)
- [Full CPU samples, gzip JSON](proofs/woods-live28/cpu.json.gz)
- [Per-draw queries and sole-sample witness, gzip JSON](proofs/woods-live28/draw-queries.json.gz)
- Native checkpoint images: [0 m](proofs/woods-live28/metre-0.png), [40 m](proofs/woods-live28/metre-40.png), [80 m](proofs/woods-live28/metre-80.png)

No console errors were captured in either native profiling run. No foliage geometry, materials, colours or art were edited for these measurements.
