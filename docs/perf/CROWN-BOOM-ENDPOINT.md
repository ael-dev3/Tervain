# Check the follow camera's actual crown endpoint

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/); related to foliage/camera contact in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

`crownBoom` checks the camera boom every 20 cm. The final camera position is not necessarily one of those samples. Even the default 6.2 m boom is missed: repeated additions produce a value just greater than 6.2, so the loop ends at its previous sample. A lens entering the crown core in that last interval remains there after the camera has completely settled.

The fix retains the regular samples and also probes the actual endpoint. It retains the 30 cm retreat margin, minimum boom, core dimensions, floor, pivot-inside exemption and follow-camera easing. No crown geometry, textures, wind, lighting or camera framing settings change.

## Native proof

The replay loads all 341 native forest crowns, then searches grounded pivots at legal camera pitches with the default 6.2 m boom. It stops after eight confirmed failing poses at one crown; this is not an audit of all trees. Each candidate is checked against the actual published `CameraRig`, native terrain, native colliders and world crown callback for 180 follow updates. The extracted original camera source must reproduce the native settled position exactly before the candidate helper is tested.

| Check | Before | After |
| --- | ---: | ---: |
| Settled lens poses inside the tested crown core | 8/8 | 0/8 |
| Original replay vs actual published camera position | 0 m difference | — |
| Empty / below-floor / pivot-inside controls | 6.2 m | 6.2 m |

The search examined 378 configurations and checked 11 against the full native camera before collecting the eight fixtures. The unchanged-source control retains all eight overlaps and returns `pass: false`. Inspection draw counts are 77 → 75 and triangles 487,493 → 473,163 because the camera changes position; those are view counts, not a performance claim.

The first fixture's player ground point is approximately **(-291.917, 12.021, -75.835)**, camera yaw **0**, pitch **0.75 radians**, boom **6.2 m**. Exact pivots, crown dimensions and camera positions are in the receipt. The screenshots use that grounded player and the settled camera, through the native post pipeline.

[Before](../../proofs/crown-boom-endpoint/before.png) · [after](../../proofs/crown-boom-endpoint/after.png) · [receipt](../../proofs/crown-boom-endpoint/report.json) · [unchanged-source control](../../proofs/crown-boom-endpoint/unchanged-source-control.json)

These are controlled static reproductions using native scene data, not a recorded walking route or hardware timing. The crown core is the existing camera exclusion ellipsoid, not a claim that each lens position intersects an opaque leaf or branch. This fixes the endpoint omission; it does not replace the sampled boom with a continuous sweep, change the minimum-boom policy, or promise zero transient overlap during the existing easing.

## Reproduce

```sh
node tools/repro-live-crown-endpoint.mjs --out crown-endpoint-proof
node tools/repro-live-crown-endpoint.mjs --candidate-ref 421d34b --images 0 --out crown-endpoint-control
```

The first command must pass; the unchanged-source control must fail. Defaults are live Pages and software WebGL. Each imported `CameraRig` uses the original published source; only its crown helper module changes. Its other imports are served from the checkout, and matching the native before pose guards against behavior differences.

Validation: endpoint regression fails before the fix; 29 camera tests and production build pass. Hardware play-gate receipt remains outstanding. Stacked on #583.
