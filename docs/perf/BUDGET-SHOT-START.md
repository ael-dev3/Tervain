# Budget probe startup mismatch

Live query `?shot=1&quality=high&settle=1&hud=0` independently reports **mode:play, ready:true, titlePredicate:false**. The menu button remains in the DOM, but shot mode has already started the world. [Raw startup state](proofs/budget-shot-start/live-start.json). This startup-only repro suppressed raster work and makes no GPU assertion.

The old budget probe waits up to 1,200 × 250 ms for title mode, waits another 2.5 s, then dispatches New Game mouse events before its existing ready-world wait. With an already-started shot world that adds **at least 300 s per probe / 900 s across two live probes and one candidate**, plus 7.5 s of extra fixed delay. Busy rendering can stretch it further. Those menu events are unnecessary during gameplay.

The fix waits directly for the existing play/world/loading-ready predicate and explicitly rejects readiness timeout before sampling. It leaves two live probes, four samples per probe, settle delays, max aggregation, draw/triangle limits, console-error rejection and candidate revision matching unchanged.

| Controlled CLI check, three probes | Original | Fixed |
| --- | ---: | ---: |
| Unnecessary title polls | 3,600 | 0 |
| Hidden-menu mouse events | 6 | 0 |
| Extra scheduled title wait, ms | 900,000 | 0 |
| Extra pre-click fixed wait, ms | 7,500 | 0 |
| Existing settle/sample delay, ms | 81,000 | 81,000 |
| Budget samples | 12 | 12 |

These wait counts are deterministic mocked-CLI measurements, not claimed browser wall-clock timings. The positive startup test and never-ready test fail on the original tool; four budget-rejection cases pass on both. All six pass with the correction. The separate launch-failure regression also passes (seven tests total), and Node syntax checking passes.

`tests/tooling/playGateShotStart.test.ts` runs the actual CLI with a controlled CDP peer representing the observed live startup state. It verifies that increased draws, increased triangles, console errors and mismatched revisions still fail without a receipt. No application or menu code changes.
