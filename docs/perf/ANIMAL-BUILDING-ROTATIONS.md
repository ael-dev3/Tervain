# Wildlife building footprint rotation cache

Wildlife habitat validation measures distance to every building footprint. It recalculated sine/cosine for static building yaw on every query, including repeated placement and local path validation. Cache those rotations once while retaining the original footprint-distance arithmetic.

`node tools/repro-animal-building-rotations.mjs --out animal-building-proof.json` compares actual baseline/current validators across all 19 authored animal definitions, a world grid and building-distance boundaries.

| Result | Before | After |
| --- | ---: | ---: |
| Sine/cosine calls during 35,758 queries | 2,011,284 | 723,996 |
| Unequal habitat results | 0 | 0 |
| Successful controlled placement results | 19 | 19 |
| Unequal placement results | 0 | 0 |

**1,287,288 repeated calls removed (64.0%)**. Remaining trig belongs to other validation work. Counts exclude one-time module initialization, which computes two values per building. The placement control invokes actual placement code with flat terrain and no scenery; it does not establish full-world visual placement quality.

[Before/after receipt](animal-building-proof/report.json). Build/typecheck and 24 wildlife/navigation/construction tests pass. Geometry, rendering and animation remain unchanged. This measures work counts, not hardware frame timing; no historical spike or heat improvement is claimed. Hardware play-gate receipt remains outstanding.
