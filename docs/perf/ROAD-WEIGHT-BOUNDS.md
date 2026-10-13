# Road influence bounds

`roadWeight` previously evaluated every road polyline at every queried coordinate, including roads whose entire soft influence lay elsewhere. Habitat and terrain generation call this function repeatedly. Conservative bounds now skip those zero-weight roads; the original distance and blending calculation remains unchanged for retained roads.

## Verification

Run `node tools/repro-road-weight-bounds.mjs --out road-bounds.json`. It compares the production function with an unpruned oracle across 10,032 coordinates, including road endpoints, soft influence boundaries and non-finite inputs. Diagnostic counters are injected only in the test loader.

Full polyline evaluations: **140,448 → 3,011 (97.9% fewer)**. All returned values are exactly equal. The before receipt intentionally fails the optimization assertion while passing value comparisons.

Run `node tools/repro-road-bounds-pixels.mjs --out road-bounds-pixels` for the native software-WebGL comparison. Each side starts a separate server and browser; the baseline substitutes the original terrain module from commit `0b45a36` for every importer. High grass uses real terrain and stock exclusions. All **712 instance buffers (15,409,216 bytes)** match, with identical RGB images and submitted **21 draw calls / 620,193 triangles**. This standalone fixture excludes postprocessing and registered crown assets; it is not a motion or hardware performance gate.

[Before](road-bounds-proof/before.png) · [After](road-bounds-proof/after.png) · [Operation receipts](road-bounds-proof/after.json) · [Rendering receipt](road-bounds-proof/pixels.json)

Build, typecheck and 20 focused road/terrain/habitat/contact tests pass. These deterministic savings do not establish Mac frame times, resolve the historical bow/inside-window spikes, or provide a hardware play-gate PASS.
