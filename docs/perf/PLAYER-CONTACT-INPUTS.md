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

## Published-world movement and turn sample

```sh
node tools/measure-live-player-contacts.mjs --url https://ael-dev3.github.io/Tervain/ --expect before --out published.json
node tools/measure-live-player-contacts.mjs --url <candidate-build-url> --expect after --out candidate.json
```

Native complete fixed steps, real movement keys and follow-camera turns run at two `live16` lead positions with rendering frozen. Each stage advances 90 synthetic 60 Hz steps; these are position samples, not exact replays or frame-time recordings of the GPU gate.

| Stage | Contact reads | Array identities before / after | Actor-record identities before / after |
| --- | ---: | ---: | ---: |
| Fence (−2, 37), walk/turn | 180 / 180 | 180 / 1 | 540 / 3 |
| Run-round (−12.3, 44.8), run/turn | 180 / 180 | 180 / 1 | 540 / 3 |

Both versions read 540 actor records per stage; these three active actor IDs reuse their records in the candidate. The visible/available population in this fresh-world sample is smaller than the stress fixture above. Counts describe object identities, not heap bytes; they exclude wildlife record creation and diagnostic wrappers. Final player coordinates match exactly in both stages.

[Published 421d34b receipt](proofs/player-contact-inputs/published.json) · [compiled fca718428 receipt](proofs/player-contact-inputs/candidate.json). Hardware frame-time and play-gate verification remain outstanding.
