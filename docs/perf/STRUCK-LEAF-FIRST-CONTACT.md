# Land struck leaves when their edges reach terrain

Target: [published 0.0.18](https://ael-dev3.github.io/Tervain/), revision `421d34b`, native oak `tree:wild:40:42`.

The landed-pose correction in #592 left a separate gap: during flight, a lower edge could enter terrain before the centre reached its landing height. The slope regression reproduces a 7.9 mm penetration with #592 applied.

Check support from the current transformed vertices during each falling step and start landing when the first supported vertex reaches terrain. Keep the existing centre-height minimum and vertex clearance. Once landed, retain #592's cached support for unchanged poses. Free-flight integration stays unchanged until contact; earlier contact can stop drift and finish the lifetime earlier.

## Reproduce

```sh
node tools/repro-live-struck-leaf-early-contact.mjs --out struck-leaf-first-contact-proof
node tools/repro-live-struck-leaf-early-contact.mjs --candidate-ref 299245e20 --images 0 --out struck-leaf-first-contact-control
```

The candidate must pass and the unchanged-parent control must fail. The script records a release from the native strike API and compares three pools: published original, #592, and candidate. The original replay must match the live pool matrix-for-matrix. Candidate and parent matrices must match while both remain in free flight. Measure actual geometry vertices during flight and after landing, and record first-contact frame differences and terrain-query counts.

The native-terrain images isolate the worst pre-landing intersection with surrounding forest/grass hidden equally. They use native post rendering and a diagnostic close camera. Fixed steps are accelerated; these are contact checks, not a player route or hardware frame-time measurement.

## Evidence

[Passing receipt](proofs/struck-leaf-first-contact/report.json) · [unchanged-parent control: FAIL](proofs/struck-leaf-first-contact/control.json).

| Measure | #592 parent | Candidate |
| --- | ---: | ---: |
| Airborne vertex observations | 31,400 | 31,345 |
| Pre-landing penetrating observations | 7 | 0 |
| Minimum airborne gap | -12.2 mm | 12.5 mm |
| Landed penetrating observations | 0 | 0 |
| Minimum landed gap | 12.0 mm | 12.0 mm (within float precision) |
| Terrain queries | 8,836 | 40,195 |
| Queries during 120 held-pose updates | 0 | 0 |

All **6,269 common uncontacted-flight matrices** match. Six leaves contact 0–3 frames earlier (0–50 ms at the replay's 60 Hz step); both pools finish empty. Contact state is separate from elapsed settling age so holding immediately after first contact cannot advance its pose.

Cost is **31,359 extra terrain-height interpolation queries across 24.6 simulated seconds**. This is a correctness change, not a performance reduction. Cached held/settled poses still avoid repeat sampling. The source geometry hash is unchanged.

[Before contact inspection](proofs/struck-leaf-first-contact/before.png) · [after](proofs/struck-leaf-first-contact/after.png). The pair differs in 7,742 channels. Both retain 126 draws / 827,415 triangles.

49 affected foliage, bark, pine-integration and forest-floor tests and production build pass. The regression checks terrain clearance throughout falling and verifies that held updates preserve matrices without extra queries. The earlier #592 proof's invariant applies to its own head; this replay permits the corrected earlier end to free flight.

## Limits

This checks vertex contact at simulation steps, not swept triangles or contact with props. Extra falling-pose terrain samples are a correctness cost and are reported explicitly. Held/settled poses retain cached support. Hardware/play-gate verification remains pending; geometry, materials and wind settings are unchanged.
