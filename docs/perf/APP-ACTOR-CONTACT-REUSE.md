# Actor contact producer reuse

The game loop requested new collision records before actor updates, again after each resolved update, and when constructing the other actor group's context. Each call allocated a fresh circle even for the same actor. Reuse private weakly keyed records, refreshing every mutable position, height, radius and activation field on every request. Weak keys distinguish replacement actor objects even if their identifier is reused.

`node tools/repro-app-contact-reuse.mjs --out app-contact-proof.json` imports the actual baseline/current App methods without constructing a renderer or UI. A controlled population of 20 resident and 12 enemy samples changes position, height, radius and activation three times per simulated frame over 600 frames:

| Result | Before | After |
| --- | ---: | ---: |
| Distinct returned contact records | 57,600 | 32 |
| Unequal field snapshots | 0 | 0 |

This is a controlled population, not a measured live cast count. The counter measures returned-record identities, not all allocations, GC time or hardware frame times. Existing array creation is outside this change.

[Before/after receipt](app-contact-proof/report.json). Build/typecheck and 82 focused contact/movement/save/transition tests pass. A regression exercises the actual `updateActors` method: a later resident sees an earlier resident's resolved position, height and activation immediately, preserving the original update ordering. Additional controls cover radius/height/alive changes and replacement actor objects. No rendering or animation changes; hardware play-gate receipt remains outstanding.
