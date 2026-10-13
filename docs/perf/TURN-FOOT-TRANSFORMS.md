# Turn-step foot transform reads

Each turn-step measurement refreshed a foot's world matrix explicitly, then queried its world position and rotation. Both native getters repeat that ancestor walk. The candidate refreshes once and decomposes the same world matrix into the existing position/rotation outputs, with one persistent scratch scale vector. Step timing, planted targets, interpolation and authored poses remain unchanged.

## Native build evidence

[Receipt](turn-foot-transform-proof/report.json): the actual compiled hero's turn-step controller compared with the previous getter sequence, including the real bone hierarchy. Both feet are measured for `flat` and `home`, first in their current pose and then beneath a translated, rotated, nonuniformly scaled actor root.

All four cases return exactly identical serialized positions and quaternions. Each measurement falls from 60 to 20 native `updateWorldMatrix` calls, including ancestors. Two measurements per active step therefore fall from 120 to 40 calls. These are operation counts, not a claim about hardware frame time or the cause of a particular recorded hitch.

The candidate was compiled on base 0b45a36a0; the receipt records its source commit separately from the build's base metadata. Native counters are self-verified through software WebGL. Type checking, production build and all 10 existing turn-step tests pass, including hero/resident planted-foot and pose continuity checks at 30/60/120 Hz.

## Reproduce

Build and serve the candidate, then:

```sh
node tools/repro-turn-foot-transform-read.mjs --url "$TERVAIN_URL" --out turn-foot-transform-proof
```

The check fails unless all native foot positions/rotations match exactly and candidate matrix-update counts are one third of the previous sequence. It restores transformed roots and instrumentation. Live hardware verification remains separate: https://ael-dev3.github.io/Tervain/ and [LATEST.md](LATEST.md).
