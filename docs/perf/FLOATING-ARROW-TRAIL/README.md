# Cull zero-length trails on floating arrows

Candidate `637b8b3b4bd7f419bf6aa9107273c9427a6d5bb4`, baseline/source of live 0.0.37 `8a1746de59a18843bd7ff42bfb80e9b28af9a33a`. The floating lifecycle retained the initially uncullable zero-length trail for 30 seconds; the lodged-arrow fix #738 covers a different loop. After the initial 0.45-second warm interval, use ordinary conservative per-camera frustum culling. No hiding of on-screen trails; geometry/materials, currents/heading, water entry, lifetime and active flight stay unchanged.

The source-paired host scene was captured at the 8a1746d baseline. Arrow runtime source before the fix is unchanged on published 635d63d; the candidate runtime is byte-identical after rebasing onto that grass-lighting commit. No cross-session whole-scene pixel identity is claimed.

## Published-build repro

Actual published `T.hunting.arrows`, **0.0.37 · 635d63d**, scripted visual-manager launches with actual sea sampling and actual world-physics sweeps, not inventory/input play. All 24 shots slow through real sea drag into floating state, with zero terrain/actor contacts and no invented surface-entry splash. Their trails remain uncullable after settling. [Raw report](live/report.json), [original](live/live.png), [normal-culling diagnostic control](live/normal-culling-control.png). Both images are RGB-identical by independent Pillow decode. This is a 24-floating-arrow cap stress case, not typical gameplay or Mac/heat evidence.

## Source-paired native proof

One frozen native High world, actual original/candidate arrow manager implementations in the same host scene. Real sea water/physics sweeps, 640×360 DPR1, native post/MSAA. All water sites/depths, contacts, splash counts, floating positions/quaternions/trail scales match exactly. The initial warm trail is asserted uncullable and actually submitted by both sources before the grace interval ends. Two repeats/mode/pose: **20 PNGs RGB-identical by pose**, independently Sharp/Pillow decoded. [Raw report](report.json), [RGB hashes](independent-pixels.json).

| Pose | Draws original → candidate | Triangles original → candidate | Trail callbacks | Changed RGB pixels |
| --- | ---: | ---: | ---: | ---: |
| fence | 695 → 647 | 7,470,097 → 7,469,521 | 48 → 0 | 0 |
| birch | 484 → 436 | 5,641,608 → 5,641,032 | 48 → 0 | 0 |
| bow | 675 → 627 | 7,744,219 → 7,743,643 | 48 → 0 | 0 |
| sea-unused | 137 → 137 | 778,895 → 778,895 | 0 → 0 | 0 |
| on-screen-control | 636 → 636 | 1,067,675 → 1,067,675 | 48 → 48 | 0 |

Three off-camera cases remove exactly **48 draws / 576 triangles**. The on-screen control retains all 48 trail draws; zero-arrow sea is unchanged. At least 96 matrix-uniform calls /6,144 matrix-payload bytes disappear in each off-camera case; small additional differences arise from renderer cache ordering. These are matrix-uniform payloads, not total buffer/texture upload bytes. Zero new shader links in kept native frames.

The original source fails both new quiver/Reduced-Motion regressions; candidate passes 76 hunting tests and build. Tests retain warm flags, then check ordinary culling, visibility/zero-length scale, current drift, zero splash, lifetime expiry and disposal. No application visuals or art are changed.

## CPU submission scope

After all native images, three warm rounds then nine rotating rounds ×12 frames/mode. Actual floating update/current sampling, matrix sync and complete world render submission. GL draw entrypoints are intercepted only during this separate timing phase and restored afterward. Diagnostic counters are present in both sources; this is CPU/driver submission, **not GPU frame timing or hardware pacing**. [Raw timings](report.json), [summary](cpu-summary.json).

| Mode | Average ms | p95 ms (nearest rank) | Samples |
| --- | ---: | ---: | ---: |
| before | 1.781 | 2.200 | 108 |
| after | 1.707 | 2.000 | 108 |
| control | 1.776 | 2.100 | 108 |

The deterministic removed submissions are the firm result; this does not establish resolution of the historical 33 ms frames or Mac heat. Shader code/texture taps are unchanged; initial warm-up is retained. Compiled exact-head stock budget is posted separately on #741.

Repros from the checkout with dependencies/headless Chrome configured: `node tools/repro-floating-arrow-trail.mjs [output-dir]`; `node tools/repro-live-floating-arrow-trail.mjs [build-url] [output-dir]`. The source-paired tool imports baseline from Git and candidate from the checkout. The read-only hosted repro uses a manual normal-culling control; it does not claim the fix is already deployed.
