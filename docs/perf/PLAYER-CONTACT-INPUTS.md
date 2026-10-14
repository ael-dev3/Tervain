# Player contact input storage

Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). This removes repeated per-query work for the open movement/frame-pacing item in [#326](https://github.com/ael-dev3/Tervain/issues/326), without attributing the older `live16` missed refreshes to it.

The player rebuilt a contact array and every visible resident/live enemy circle on each settling or movement query. These private callers consume the values synchronously without retaining them through another query. Reuse a player-owned borrowed array and weakly keyed per-actor records. Refresh positions, radii and vertical bounds on every read; preserve wildlife references, input order and exclusion rules. Different players and replacement actor objects keep distinct records.

```sh
node tools/repro-player-contact-inputs.mjs --baseline 421d34b --out player-contact-input-proof
npx vitest run tests/presentation/playerMotion.test.ts tests/presentation/worldPickups.test.ts
npm run build
```

The native production-method fixture makes 120 moving-body queries with 30 resident inputs, 12 enemy inputs and 19 existing wildlife contacts. This is a controlled stress population, not a claim about a measured live crowd.

- Returned array identities: **120 → 1**.
- Resident/enemy contact identities: **5,040 → 42** (including initial construction).
- All input snapshot and collision-result hashes match; all 120 queries resolve contact, with the same zero signed body gap at separation.
- Native sealed hero at the resolved position plus diagnostic body marker through Grade/4×MSAA: **0 changed RGB channels**, zero WebGL errors. Both versions submit 6 draws / 149,978 triangles; texture count 8, source upload bytes 57,060,084 and nominal texture payload 68,667,232 bytes are unchanged.

All 157 player-motion/pickup tests and the production build pass. Regression coverage includes updated positions/radii/heights, hidden/unavailable residents, dead enemies, replacement objects, independent players and an empty subsequent query. The pickup test now uses the production lightweight stand-in constructor rather than bypassing Player initialization.

[Receipt](proofs/player-contact-inputs/report.json) · [before](proofs/player-contact-inputs/before.png) · [after](proofs/player-contact-inputs/after.png).

Counts cover only this private input storage, excluding wildlife record construction, diagnostic allocations and total heap bytes. The array/records are borrowed until the next contact query; future asynchronous consumers must snapshot what they retain. No hardware frame-time improvement or play-gate PASS is claimed.
