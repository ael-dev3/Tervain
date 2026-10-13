# Idle water-spray CPU work

Idle spray uploads were already skipped, but every update still scanned all 480 dead slots and rewrote five attribute values per slot. Once initialized and empty, return until an emission actually writes a drop. A final expiry update still runs and clears its attributes; the next idle update can skip. The ring cursor, random stream, simulation and upload behavior stay unchanged.

Run `node tools/repro-idle-spray-cpu.mjs report.json`. It loads baseline `0b45a36` and the actual changed spray class with slot-visit counters. Across 640 updates, all position/size/fade buffers, attribute upload versions and active counts match. Controls cover cold idle, small emission, full-pool overwrite, expiry, zero delta, disabled emission and later reactivation.

[Receipt](idle-spray-cpu-proof/report.json): each 120-frame idle interval falls from 57,600 slot visits to zero. The mixed 300-update emission/expiry sequence falls from 144,000 visits to 86,880.

Run `node tools/repro-idle-spray-cpu.mjs timings.json --timings` for uninstrumented, warmed alternating batches. [Timing receipt](idle-spray-cpu-proof/timings.json): median 10,000 idle updates 22.009 ms → 0.054 ms. The original cost is roughly 0.0022 ms per update in this component benchmark, so this is a small saving and does not explain historical 32 ms bow or village frames. No real-play or Mac frame-time improvement is claimed.

This change does not alter draw ranges, shaders, materials or rendered values. It is independent of the separate spray draw-range optimization. Validation: 36 existing spray-upload/water-render-pass tests, production build and deterministic before/after comparison. Software-WebGL CI and hardware play gate are reported separately.
