# Compiled player contact regressions

The script executes the served build's actual Player, Game and Colliders classes with the actual imported hero rig. Terrain and external I/O are deterministic fixtures. Ordinary simulation/drawing in the diagnostic browser is frozen, then logical 1/60-second input updates advance each case. Screenshots use the native hero with schematic collision volumes. These are controller regressions, not a real-world route walkthrough, animation-quality assessment or GPU timing run.

For airborne mounting:

```sh
node tools/repro-player-contact.mjs --url <baseline-build-url> --case mount --expect before --out before
node tools/repro-player-contact.mjs --url <patched-build-url> --case mount --expect after --out after
```

Both native jump and fence-vault cases must be airborne at the request. Before: mounting accepts both. After: it rejects both. Separate controls advance 90 logical ticks to landing and require mounting to remain available. Each run records heights, states, acceptance and a native software-rendered player capture.

Mount [before assertions](mount-proof/before/report.json) and [capture](mount-proof/before/native-player.png), compared with [after assertions](mount-proof/after/report.json) and [capture](mount-proof/after/native-player.png): both airborne requests are rejected after the fix, while both landed controls still accept mounting. The script also checks the compiled UI revision against the served artifact stamp to reject a build changing during the repro.
