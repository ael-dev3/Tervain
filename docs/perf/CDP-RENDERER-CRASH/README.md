# Renderer-crash capture failure receipt

Source head: `f86a4805fb5afc218f059a395990f0db3416b60b`.
Published reproduction: https://ael-dev3.github.io/Tervain/ — 0.0.33, b317734.

The capture driver enabled Runtime and Page notifications, but did not subscribe to Inspector crash notifications. Chromium can keep its DevTools socket open after its renderer dies; a pending awaited evaluation then has no response until its request timeout.

The correction subscribes to Inspector and handles `Inspector.targetCrashed` as a terminal failure. All outstanding calls reject and their timers clear. New calls reject with the original cause. This does not retry a crash, turn a failed capture into a PASS, or reduce normal capture timeouts. Callers still own browser cleanup. A caller that intentionally swallows errors in a polling loop is outside this fix.

## Actual browser reproduction

Both runs use software Chrome and the same published High world, waiting for gameplay and the READY title. A scoped startup raster shim skips discarded loading draws; the test concerns protocol failure, not visual rendering or performance. An awaited promise is started and the renderer is deliberately crashed with `Page.crash`. This is not an organic game crash.

| Measurement | Original driver | Corrected driver |
| --- | ---: | ---: |
| Configured request timeout | 600,000 ms | 600,000 ms |
| Outcome within observation window | Still pending after 1,201.9 ms | Rejected in 98.2 ms |
| Failure cause | Unavailable until a later timeout/disconnect | `CDP renderer target crashed` |
| Game-source edits | 0 | 0 |

The original was cleaned up after the bounded observation; **a ten-minute wait was not measured**. Cleanup happens after the observation and cannot explain the corrected rejection. Raw reports: [original](live-before.json), [corrected](live-after.json).

Reusable script: `tools/repro-cdp-renderer-crash.mjs` on the source branch. It defaults to a minimal page; `--live 1` waits for the published world, `--url BUILD_URL` selects a preview. For the original driver supply `--driver BASELINE_DRIVER --expect pending`. For a corrected driver use the default `--expect rejected`. `--out REPORT.json` retains the report. The original's expected-pending reproduction success is not a successful gameplay/capture gate.

The new unit regression fails on unchanged code. Eight focused tests pass with the correction: multiple pending calls, timer cleanup, future calls, late replies, ordinary navigation events, protocol responses/errors, disconnects and input validation. Production build passes. See [validation](validation.json). The exact-head stock budget receipt is posted in [the PR body](https://github.com/ael-dev3/Tervain/pull/712); it uses no startup raster shim. No PASS is claimed until that run completes.

## Cost scope

No application source, shader, texture, geometry, camera, material or render-submission changes. No per-frame game work is added. Browser setup adds one Inspector subscription; incoming protocol messages get one additional event-name check. This is capture reliability, not a gameplay FPS/heat improvement. No visual change or pixel-identity measurement is claimed from the crash injection.

## Separate foliage investigation

[Full population results](forest-population.json) are read-only native geometry measurements on the same published High build. Each LOD includes 451 selected placements. Audit options: `alpha:false`, gap 0.75 world metres, woodReach 1.5 world metres, maxOperations 300,000,000.

| LOD | Whole-chunk candidates | Beyond-wood-reach card subsets | Subset groups |
| --- | ---: | ---: | ---: |
| Near | 0 | 8,895 | 671 |
| Middle | 0 | 24,477 | 396 |
| Far | 0 | 14,972 | 522 |

These are sampled triangle/component metrics, not counts of visually proven disconnected masses. Unmasked box links can bridge empty space; zero whole-chunk candidates does not clear the visual report. No geometry repair is proposed from these counts. A stricter sample-only contact trial on clones of all 60 retained geometry/LOD pairs produced no extra island moves. The trial was dropped. Existing capture-wind mismatch has its own fix in #711; static detached crowns remain open.
