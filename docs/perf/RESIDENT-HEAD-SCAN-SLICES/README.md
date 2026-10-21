# Resident head-scan scheduling and joint lookup reuse

Candidate `4fa37572b1ed33c27227a3519d948b16b2364f4e`, stacked on #756 (`24ca7047f`), released source baseline 0.0.39 `3596f1e8b`. This small follow-up chunks head repair into 512 vertices and hoists immutable joint-index lookups out of `headShare`'s per-vertex path. Existing synchronous callers keep a wrapper. Only completed results enter the per-rig cache; interrupted iterators do not mutate input, and overlapping completions share one canonical result. No material/shader/geometry/art changes. The compiled candidate also includes #756's separate initial hand-surface batching.

## Root cause and frame-step evidence

The published-page trace previously found 15.3/18.9 ms preparation resumes. Fresh read-only **source-world** stage instrumentation pins the same initial resume: at hero (-2, 38.859), quarry-foreman takes **16.2 ms in one resume**, including **4.7 ms head repair and 5.6 ms hand-surface construction**, with no overlapping GC. The surrounding CPU frame-step is **21.9 ms wall / 19.679 ms same-thread CPU**. The unassigned remainder includes initial copying and other caller work; it is not all assigned to head repair. Maintenance-worker has **9.3 ms of head repair** in a 14.3 ms resume. Source: `meshynpcs.ts` enters head repair and initial `residentFingerPlanSteps` before a yield; `residentArrivals.ts` cannot check its 3 ms budget until `next()` returns. The head scan calls `headShare` for every vertex, which used two linear fixed-joint searches every time. The separate #756 chunks initial copying/welding/adjacency; this follow-up bounds and reduces head work.

A single paired 696-step replay per mode uses the same walk/run/two-shot input path, highest preset and fixed simulation cadence, same-thread trace deltas, profiler interval 100 µs. Both verify two arrows released (6→4), stable source identifier and zero console errors. Stage/frame markers and wrapper overhead are included. Source versions are explicit; instrumentation middleware supplies their source identifier, not a claim that these source worlds are the deployed page. The earlier direct published-page trace remains [on #326](https://github.com/ael-dev3/Tervain/issues/326#issuecomment-6309470216). Presentation is frozen and software load raster suppressed, while texture uploads still occur. **These are CPU frame-step costs, not display intervals, real Mac/GPU timings, or proof of 60 fps.** Quantiles below are one diagnostic pair and advisory, not an A/A noise-controlled hardware gate. The combined result includes #756, and is not attributed solely to this head follow-up.

| Route | Mean ms, before / after | p95 ms, before / after | Max ms, before / after |
| --- | ---: | ---: | ---: |
| walk-fence | 5.986 / 5.420 | 10.300 / 9.000 | 23.100 / 12.500 |
| run-round | 5.599 / 5.364 | 8.700 / 9.000 | 19.900 / 12.300 |
| bow0-draw | 5.607 / 5.297 | 9.100 / 7.100 | 10.700 / 9.700 |
| bow0-release | 4.973 / 4.929 | 7.400 / 6.800 | 8.800 / 7.800 |
| bow1-draw | 4.562 / 4.761 | 6.400 / 6.400 | 9.500 / 7.400 |
| bow1-release | 5.081 / 5.400 | 9.700 / 7.700 | 19.700 / 8.200 |

Largest observed head-repair slice **9.3→1.5 ms**; both largest candidate slices overlap MinorGC (1.32/1.38 ms in their surrounding frame). No additive subtraction of overlapping GC is made. Other preparation and GC work remains; historical live16 ~33 ms hardware stalls are not declared closed. Raw process/thread/session traces stay private; relative step summaries are linked here.

## Deterministic regression and helper CPU

Old synchronous repair reads all **35,936 / 42,137 vertices** in one caller resume; new regression bounds each at **512**. Old `headShare` performs **200 fixed-joint lookups per 100 sampled vertices**, new **0** after module initialization. The old regression fixture adapts the old synchronous caller as one resume; it does not pretend the old source exposed the new generator API. Complete repaired joint/weight SHA256s match the original on both shipped fixtures. Tests also cover cancellation, unchanged input and canonical identity for overlapping repairs. **28 relevant tests and build pass.**

Three fresh V8 processes, three warmups and 24 rotating original/candidate preparations per model each (72 per mode/model). Each call uses a fresh rig identity to avoid a cache-hit timing. Every result hash is compared. Iterator/clock overhead included; not frame timings. Helper mean/p95 improve despite yielding.

| Model / mode | Total mean ms | Total p95 ms | Largest-resume p95 ms |
| --- | ---: | ---: | ---: |
| quarry-foreman / before | 4.460 | 6.182 | 6.182 |
| quarry-foreman / after | 3.523 | 4.953 | 0.414 |
| maintenance-worker / before | 5.619 | 5.794 | 5.794 |
| maintenance-worker / after | 4.797 | 5.073 | 0.331 |

## Native output and budget

18 actual native head-repair invocations (including cached reuse) compare original/candidate complete joints/weights element-for-element plus bones/identity metadata before installation. Queue drained, no fallback warnings/console errors. Candidate head buffers installed into one shared High world give 20 RGB-identical repeated same-pose images, normal post/MSAA, frozen time/wind, rebuilt shadow/reflection state. This proves output equality; it does not prove independent-world adoption timing. Since the head arrays already match, swapping their identical content for the two image modes intentionally does not change state.

| Pose | Draws each | Triangles each | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| forest | 872 | 12992441 | 0 |
| fence | 683 | 8353879 | 0 |
| run-round | 267 | 2701511 | 0 |
| bow | 316 | 3210504 | 0 |
| village | 623 | 6666786 | 0 |

[Stock compiled gate receipt](budget.txt) is on the exact head with no threshold allowances, init hook or sampler edits. Browser is software WebGL; no hardware pacing claim. It uses a different fixed Retina-size placement from native 640×360 DPR1 images, so absolute counts are not mixed. Shader code/taps/final buffers are unchanged.  

Reproduce from feature/proof checkout with dependencies and configured software Chrome: `node tools/repro-resident-head-native.mjs [output-directory]`, `node tools/repro-resident-head-cpu.mjs [output-directory]`, `node tools/repro-resident-stage-trace.mjs before [output-directory]` and `after`. Fetch the pinned baseline in shallow checkouts. Stage tool stores raw trace/profile privately in the chosen output directory; publish only sanitized relative summaries. Native dual algorithm work is proof-only and supplies no timing numbers.
