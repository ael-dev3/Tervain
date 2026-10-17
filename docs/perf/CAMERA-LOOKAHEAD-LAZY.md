# Calculate doorway anticipation only when it can be used

Published repro: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), forest pan around world (-121, 95), with fence/village controls; related to turning cost in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

Every follow-camera step calculates a future boom for doorway trim: yaw-difference sine/cosine/atan2, another sine/cosine pair, and a future endpoint record. Those values are consumed only when the broad-phase query contains a `:doorframe` collider. The forest query contains none, so this work is discarded each step.

Keep the previous-yaw history on every step, but calculate the lookahead lazily at the first doorway-frame candidate. Multiple trim colliders share the same calculation as before. The boom, camera settings, sweep, easing and framing remain unchanged. No geometry, shaders or art change.

## Native proof

Actual original/candidate `CameraRig` modules replay four paths of 120 follow updates against the published terrain, colliders and crown callback. Module-local wrappers count camera-owned `Math.sin`, `Math.cos` and `Math.atan2` calls, without counting math performed inside imported terrain/collision helpers. These are source-level call counts, not CPU instructions, heap allocations, GC measurements or frame times.

Position, orientation and FOV trace hashes must match. The original module's positions must also match the actual published camera. Both imported modules use the original crown helper to isolate this change. A separate unit test checks that turn history survives an initially empty trim query, using a control that performed lookahead throughout and a newly relevant trim that actually shortens the future boom.

| Forest pan, 120 follow updates | Before | After |
| --- | ---: | ---: |
| Camera-module sine calls | 479 | 240 |
| Camera-module cosine calls | 479 | 240 |
| Camera-module atan2 calls | 119 | 0 |
| Tracked trig calls total | 1,077 | 480 |

All four complete pose-trace hashes match, and the original traces have zero positional disagreement with the native camera. All four endpoint images have zero changed channels. The forest anchor is checked against the native collision resolver, and the normal hero fade is applied before the captures. The unchanged-source control retains 1,077 forest calls and returns `pass: false`.

The tested fence, village and village-grass queries still contain doorway trim, including conservative broad-phase candidates: this change saves no calls there. That limitation is recorded rather than attributing a fence-walk frame-time gain to it.

The matched endpoint images use the native scene and post renderer. World preparation is shared, and auxiliary window/water captures remain at their common warmed state, isolating the camera change from capture/streaming progress. These are controlled stills and deterministic follow replays, not a recorded player route or hardware play gate.

[Forest before](../../proofs/camera-lookahead-lazy/forest-pan-before.png) · [after](../../proofs/camera-lookahead-lazy/forest-pan-after.png) · [village before](../../proofs/camera-lookahead-lazy/village-turn-before.png) · [after](../../proofs/camera-lookahead-lazy/village-turn-after.png) · [receipt](../../proofs/camera-lookahead-lazy/report.json) · [unchanged-source control](../../proofs/camera-lookahead-lazy/unchanged-source-control.json)

## Reproduce

```sh
node tools/repro-live-camera-lookahead.mjs --out camera-lookahead-proof
node tools/repro-live-camera-lookahead.mjs --candidate-ref 421d34b --images 0 --out camera-lookahead-control
```

The first command must pass; the unchanged-source control must fail because it still calculates the unused forest lookahead. Defaults are live Pages and software WebGL.

Validation: native counter regression fails before the fix; 30 camera tests and production build pass. This removes verified unused work; it does not establish a cause or resolution for the recorded >25 ms frames. Hardware play-gate receipt remains outstanding. Stacked on #586.
